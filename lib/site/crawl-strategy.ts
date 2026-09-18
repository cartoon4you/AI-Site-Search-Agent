import { checkRobotsTxt } from "./robots";
import { parseSitemap, DiscoveredUrl } from "./sitemap";
import { insertPage, insertFile, insertDiscoveredUrl, ensureDbInitialized, normalizeHost } from "./db";
import { CrawlProgressEvent, CrawlStats } from "./types";
import { parseHtml, isFileUrl as checkIsFileUrl } from "../crawler/parser";

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  delayMs?: number;
  forceUnrestrictedRobots?: boolean;
}

// Active crawl jobs in-memory for cancellation
const activeCrawls = new Map<string, { cancelled: boolean }>();

export function cancelCrawl(crawlId: string) {
  const crawl = activeCrawls.get(crawlId);
  if (crawl) {
    crawl.cancelled = true;
  }
}

export async function runLiveCrawl(
  crawlId: string,
  host: string,
  options: CrawlOptions,
  emitEvent: (event: CrawlProgressEvent) => void
) {
  if (process.env.ENABLE_CRAWL_STRATEGY === "false") {
    emitEvent({ type: "error", message: "Live crawl strategy is disabled via configuration." });
    return;
  }

  const cleanHost = normalizeHost(host);
  const maxPages = options.maxPages || Number(process.env.CRAWL_MAX_PAGES || 500);
  const maxDepth = options.maxDepth || Number(process.env.CRAWL_MAX_DEPTH || 4);
  const delayMs = options.delayMs || Number(process.env.CRAWL_DELAY_MS || 200);

  const jobState = { cancelled: false };
  activeCrawls.set(crawlId, jobState);

  const stats: CrawlStats = {
    crawlId,
    host: cleanHost,
    status: "running",
    pagesCrawled: 0,
    filesDiscovered: 0,
    queuedCount: 0,
    errorCount: 0,
    blockedCount: 0,
    progressPercent: 0,
    etaSeconds: 0,
    startedAt: new Date().toISOString(),
  };

  const db = await ensureDbInitialized();
  await db.execute({
    sql: `INSERT INTO crawls (id, site_id, started_at, status) VALUES (?, ?, CURRENT_TIMESTAMP, 'running')`,
    args: [crawlId, `site_${cleanHost}`],
  });

  emitEvent({ type: "progress", crawlId, stats, message: `Starting crawl for ${cleanHost}...` });

  // 1. Fetch robots.txt
  const robots = await checkRobotsTxt(cleanHost);
  if (!options.forceUnrestrictedRobots && robots.sitemaps.length > 0) {
    emitEvent({ type: "log", message: `Found ${robots.sitemaps.length} sitemaps in robots.txt` });
  }

  // 2. Discover seed URLs from sitemap
  const sitemapUrls = await parseSitemap(cleanHost);
  const queue: { url: string; depth: number; source: string }[] = [];
  const visited = new Set<string>();

  for (const sItem of sitemapUrls) {
    await insertDiscoveredUrl(crawlId, sItem.url, "sitemap", false, 0);
    queue.push({ url: sItem.url, depth: 0, source: "sitemap" });
  }

  // Seed homepage if queue is empty
  const homepageUrl = `https://${cleanHost}/`;
  if (queue.length === 0) {
    await insertDiscoveredUrl(crawlId, homepageUrl, "homepage", false, 0);
    queue.push({ url: homepageUrl, depth: 0, source: "homepage" });
  }

  stats.queuedCount = queue.length;
  emitEvent({ type: "stats", stats });

  const startTime = Date.now();

  while (queue.length > 0 && stats.pagesCrawled < maxPages) {
    if (jobState.cancelled) {
      stats.status = "cancelled";
      emitEvent({ type: "log", message: "Crawl cancelled by user." });
      break;
    }

    const current = queue.shift()!;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    // Honor robots.txt unless owner verified
    if (!options.forceUnrestrictedRobots && !robots.isAllowed(current.url)) {
      stats.blockedCount++;
      await insertDiscoveredUrl(crawlId, current.url, current.source, false, 403);
      continue;
    }

    // Delay between fetches for politeness
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Check if URL is a downloadable file
    const fileCheck = checkIsFileUrl(current.url);

    if (fileCheck.isFile) {
      stats.filesDiscovered++;
      const fileName = current.url.split("/").pop() || "file";
      const ext = fileCheck.extension || fileName.split(".").pop() || "bin";

      await insertFile({
        crawlId,
        host: cleanHost,
        url: current.url,
        name: fileName,
        ext,
        mime: `application/${ext}`,
        sizeBytes: 0,
      });

      await insertDiscoveredUrl(crawlId, current.url, current.source, true, 200);
    } else {
      // Fetch Page HTML
      try {
        const res = await fetch(current.url, {
          headers: {
            "User-Agent": process.env.CRAWL_USER_AGENT || "SiteAgent/1.0 (+https://ais.studio)",
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          stats.errorCount++;
          await insertDiscoveredUrl(crawlId, current.url, current.source, true, res.status);
          continue;
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("html") && !contentType.includes("text")) {
          // Non-HTML resource
          stats.filesDiscovered++;
          await insertDiscoveredUrl(crawlId, current.url, current.source, true, 200);
          continue;
        }

        const html = await res.text();
        stats.pagesCrawled++;

        // Detect SPA
        if (html.includes('id="root"') && html.length < 2000 && html.includes("<script")) {
          emitEvent({ type: "log", message: `SPA detected on ${current.url}` });
        }

        // Parse page using Cheerio parser
        const parsed = parseHtml(html, current.url, contentType);

        await insertPage({
          crawlId,
          host: cleanHost,
          url: current.url,
          title: parsed.title || current.url,
          description: parsed.description || parsed.text.slice(0, 160),
          text: parsed.text.slice(0, 5000), // First 5000 chars
        });

        await insertDiscoveredUrl(crawlId, current.url, current.source, true, 200);

        // Extract Links if within depth limit
        if (current.depth < maxDepth) {
          for (const link of parsed.links) {
            try {
              const absHost = new URL(link.url).hostname.toLowerCase();

              if (absHost === cleanHost && !visited.has(link.url)) {
                queue.push({ url: link.url, depth: current.depth + 1, source: "crawl" });
                await insertDiscoveredUrl(crawlId, link.url, "crawl", false, 0);
              }
            } catch {
              // Ignore invalid link
            }
          }
        }
      } catch (err) {
        stats.errorCount++;
        await insertDiscoveredUrl(crawlId, current.url, current.source, true, 500);
      }
    }

    // Update Progress
    stats.queuedCount = queue.length;
    stats.progressPercent = Math.min(100, Math.round((stats.pagesCrawled / maxPages) * 100));
    
    const elapsedSec = (Date.now() - startTime) / 1000;
    const speed = stats.pagesCrawled / (elapsedSec || 1);
    stats.etaSeconds = speed > 0 ? Math.round((maxPages - stats.pagesCrawled) / speed) : 0;

    if (stats.pagesCrawled % 5 === 0) {
      emitEvent({ type: "progress", crawlId, stats, url: current.url });
    }
  }

  if (stats.status === "running") {
    stats.status = "completed";
  }

  stats.finishedAt = new Date().toISOString();
  stats.progressPercent = 100;

  // Save crawl state in DB
  await db.execute({
    sql: `UPDATE crawls SET status = ?, finished_at = CURRENT_TIMESTAMP, stats_json = ? WHERE id = ?`,
    args: [stats.status, JSON.stringify(stats), crawlId],
  });

  activeCrawls.delete(crawlId);
  emitEvent({ type: "done", crawlId, stats, message: `Crawl completed! ${stats.pagesCrawled} pages indexed.` });
}
