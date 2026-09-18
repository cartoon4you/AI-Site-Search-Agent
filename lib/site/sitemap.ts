import { XMLParser } from "fast-xml-parser";
import zlib from "zlib";
import { promisify } from "util";

const gunzip = promisify(zlib.gunzip);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  maxNestedTags: 20000,
});

export interface DiscoveredUrl {
  url: string;
  lastmod?: string;
  source: "sitemap";
  type: "page" | "file";
}

export async function parseSitemap(host: string): Promise<DiscoveredUrl[]> {
  const discovered: DiscoveredUrl[] = [];
  const visitedSitemaps = new Set<string>();

  const possibleSitemapUrls = [
    `https://${host}/sitemap.xml`,
    `https://${host}/sitemap_index.xml`,
    `https://${host}/sitemap-index.xml`,
    `https://${host}/sitemaps.xml`,
  ];

  for (const sitemapUrl of possibleSitemapUrls) {
    if (visitedSitemaps.has(sitemapUrl)) continue;
    try {
      const urls = await fetchAndParseSitemap(sitemapUrl, visitedSitemaps);
      if (urls.length > 0) {
        discovered.push(...urls);
      }
    } catch {
      // Ignore errors for non-existent sitemap candidates
    }
  }

  // Deduplicate discovered URLs
  const uniqueMap = new Map<string, DiscoveredUrl>();
  for (const item of discovered) {
    if (!uniqueMap.has(item.url)) {
      uniqueMap.set(item.url, item);
    }
  }

  return Array.from(uniqueMap.values());
}

export async function fetchAndParseSitemap(
  url: string,
  visited: Set<string> = new Set(),
  depth = 0
): Promise<DiscoveredUrl[]> {
  if (visited.has(url) || depth > 3) return [];
  visited.add(url);

  const results: DiscoveredUrl[] = [];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.CRAWL_USER_AGENT || "SiteAgent/1.0 (+https://ais.studio)",
        "Accept": "application/xml, text/xml, application/x-gzip, */*",
      },
    });

    if (!res.ok) return [];

    let xmlText = "";
    if (url.endsWith(".gz") || res.headers.get("content-type")?.includes("gzip")) {
      const buffer = await res.arrayBuffer();
      const decompressed = await gunzip(Buffer.from(buffer));
      xmlText = decompressed.toString("utf-8");
    } else {
      xmlText = await res.text();
    }

    const parsed = xmlParser.parse(xmlText);

    // 1. Check for <urlset><url>
    if (parsed.urlset && parsed.urlset.url) {
      const urlNodes = Array.isArray(parsed.urlset.url)
        ? parsed.urlset.url
        : [parsed.urlset.url];

      for (const node of urlNodes) {
        const loc = typeof node.loc === "string" ? node.loc.trim() : typeof node === "string" ? node.trim() : "";
        if (loc && loc.startsWith("http")) {
          const isFile = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|gz|mp3|mp4|png|jpg|jpeg|gif|svg|csv)$/i.test(loc);
          results.push({
            url: loc,
            lastmod: node.lastmod ? String(node.lastmod) : undefined,
            source: "sitemap",
            type: isFile ? "file" : "page",
          });
        }
      }
    }

    // 2. Check for <sitemapindex><sitemap> (Recursive index)
    if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
      const sitemapNodes = Array.isArray(parsed.sitemapindex.sitemap)
        ? parsed.sitemapindex.sitemap
        : [parsed.sitemapindex.sitemap];

      for (const node of sitemapNodes) {
        const subLoc = typeof node.loc === "string" ? node.loc.trim() : "";
        if (subLoc && subLoc.startsWith("http")) {
          const childUrls = await fetchAndParseSitemap(subLoc, visited, depth + 1);
          results.push(...childUrls);
        }
      }
    }
  } catch (err: any) {
    console.info(`[Sitemap] Skipped or parse notice for ${url}:`, err?.message || String(err));
  }

  return results;
}
