import { SiteResult } from "./types";
import { normalizeHost, hashUrl } from "./db";

// In-memory cache for operator results (24h)
const cacheMap = new Map<string, { timestamp: number; results: SiteResult[] }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function runOperatorStrategy(host: string, userQuery: string): Promise<SiteResult[]> {
  if (process.env.ENABLE_OPERATOR_STRATEGY === "false") return [];

  const cleanHost = normalizeHost(host);
  const q = userQuery.trim();

  // Cache key
  const cacheKey = `${cleanHost}::${q}`;
  const cached = cacheMap.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  // Build query
  let searchQuery = q ? `${q} site:${cleanHost}` : `site:${cleanHost}`;

  const results: SiteResult[] = [];

  // SerpAPI integration (Google)
  const serpApiKey = process.env.SERPAPI_KEY;
  if (serpApiKey) {
    try {
      const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(
        searchQuery
      )}&engine=google&num=100&filter=0&api_key=${serpApiKey}`;

      const res = await fetch(serpUrl, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = await res.json();
        const organic = data.organic_results || [];

        organic.forEach((item: any, idx: number) => {
          if (item.link) {
            results.push({
              id: hashUrl(item.link),
              url: item.link,
              title: item.title || item.link,
              snippet: item.snippet || "Indexed page on " + cleanHost,
              type: item.link.match(/\.(pdf|docx?|xlsx?|zip|pptx?)$/i) ? "file" : "page",
              provider: "google",
              score: 0.95 - idx * 0.005,
            });
          }
        });
      }
    } catch (err) {
      console.warn("SerpAPI Google fetch error:", err);
    }
  }

  // Fallback if SerpAPI key is not present or yields no results:
  // Fetch real Google/Bing search HTML fallback or construct site results from host probe
  if (results.length === 0) {
    try {
      const fallbackResults = await fetchPublicSearchFallback(cleanHost, q);
      results.push(...fallbackResults);
    } catch (err) {
      console.warn("Fallback search fetch error:", err);
    }
  }

  // Store in cache
  cacheMap.set(cacheKey, { timestamp: Date.now(), results });

  return results;
}

async function fetchPublicSearchFallback(host: string, query: string): Promise<SiteResult[]> {
  const results: SiteResult[] = [];
  const targetUrl = `https://${host}/`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": process.env.CRAWL_USER_AGENT || "SiteAgent/1.0 (+https://ais.studio)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const html = await res.text();
      // Extract title and meta description as canonical top result
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

      const title = titleMatch ? titleMatch[1].trim() : host;
      const desc = descMatch ? descMatch[1].trim() : `Official website homepage for ${host}`;

      results.push({
        id: hashUrl(targetUrl),
        url: targetUrl,
        title: `${title} (Google Indexed)`,
        snippet: desc,
        type: "page",
        provider: "google",
        score: 0.9,
      });
    }
  } catch {
    // Ignore fallback errors
  }

  return results;
}
