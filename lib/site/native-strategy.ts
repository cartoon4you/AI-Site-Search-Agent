import { NativeSearchInfo, SiteResult } from "./types";
import { normalizeHost, hashUrl } from "./db";

export async function detectNativeSearch(host: string): Promise<NativeSearchInfo | null> {
  if (process.env.ENABLE_NATIVE_STRATEGY === "false") return null;

  const cleanHost = normalizeHost(host);
  const targetUrl = `https://${cleanHost}/`;

  try {
    // 1. Fetch homepage HTML
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": process.env.CRAWL_USER_AGENT || "SiteAgent/1.0 (+https://ais.studio)",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    const htmlLower = html.toLowerCase();

    // 2. Check for WordPress REST API
    if (html.includes("wp-json") || html.includes("wp-includes")) {
      try {
        const wpCheck = await fetch(`https://${cleanHost}/wp-json/wp/v2/search?search=test&per_page=1`, {
          signal: AbortSignal.timeout(4000),
        });
        if (wpCheck.ok) {
          return {
            provider: "native-wp",
            name: "WordPress REST API",
            endpoint: `https://${cleanHost}/wp-json/wp/v2/search`,
          };
        }
      } catch {
        // Fallback
      }
    }

    // 3. Check for Static Site Generator Search Indexes (Docusaurus / Hugo / Nextra / MkDocs)
    const staticIndexPaths = [
      { path: "/search-index.json", name: "Docusaurus / Search Index" },
      { path: "/search_index.json", name: "MkDocs / Search Index" },
      { path: "/index.json", name: "Hugo JSON Search" },
      { path: "/search/index.json", name: "Hugo Search Index" },
    ];

    for (const item of staticIndexPaths) {
      try {
        const idxRes = await fetch(`https://${cleanHost}${item.path}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(3000),
        });
        const contentType = idxRes.headers.get("content-type") || "";
        if (idxRes.ok && (contentType.includes("json") || contentType.includes("javascript"))) {
          return {
            provider: "native-other",
            name: item.name,
            endpoint: `https://${cleanHost}${item.path}`,
          };
        }
      } catch {
        // Continue check
      }
    }

    // 4. Check for Google Custom Search Engine (CSE)
    if (htmlLower.includes("cse.google.com") || htmlLower.includes("gcse") || htmlLower.includes("google.com/cse")) {
      return {
        provider: "native-cse",
        name: "Google Custom Search (CSE)",
      };
    }

    // 5. Check for Algolia Search
    if (htmlLower.includes("algolia") || htmlLower.includes("algoliasearch")) {
      const appIdMatch = html.match(/appId["']?\s*:\s*["']([A-Za-z0-9]+)["']/i);
      const apiKeyMatch = html.match(/(?:apiKey|searchKey)["']?\s*:\s*["']([A-Za-z0-9]+)["']/i);
      const indexNameMatch = html.match(/indexName["']?\s*:\s*["']([A-Za-z0-9_-]+)["']/i);

      if (appIdMatch && apiKeyMatch) {
        return {
          provider: "native-algolia",
          name: "Algolia Search",
          appId: appIdMatch[1],
          apiKey: apiKeyMatch[1],
          indexName: indexNameMatch ? indexNameMatch[1] : undefined,
        };
      }
      return {
        provider: "native-algolia",
        name: "Algolia Search Engine",
      };
    }

    // 6. Check for Typesense
    if (htmlLower.includes("typesense")) {
      const apiKeyMatch = html.match(/apiKey["']?\s*:\s*["']([A-Za-z0-9_-]+)["']/i);
      return {
        provider: "native-typesense",
        name: "Typesense Search",
        apiKey: apiKeyMatch ? apiKeyMatch[1] : undefined,
      };
    }

    // 7. Generic form / endpoint search detection
    if (htmlLower.includes('role="search"') || htmlLower.includes('type="search"') || htmlLower.includes('action="/search')) {
      return {
        provider: "native-other",
        name: "Native HTML Site Search",
        endpoint: `https://${cleanHost}/search`,
      };
    }
  } catch (err) {
    console.warn(`Native search detection error for ${cleanHost}:`, err);
  }

  return null;
}

export async function runNativeStrategy(
  host: string,
  query: string,
  nativeInfo: NativeSearchInfo
): Promise<SiteResult[]> {
  const cleanHost = normalizeHost(host);
  const q = query.trim();
  const results: SiteResult[] = [];

  if (!q) return [];

  // WordPress REST API Native Search
  if (nativeInfo.provider === "native-wp" && nativeInfo.endpoint) {
    try {
      const res = await fetch(`${nativeInfo.endpoint}?search=${encodeURIComponent(q)}&per_page=20`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok && res.headers.get("content-type")?.includes("json")) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // ignore
        }
        if (Array.isArray(data)) {
          data.forEach((item: any, idx: number) => {
            const url = item.url || item.link || `https://${cleanHost}/?p=${item.id}`;
            results.push({
              id: hashUrl(url),
              url,
              title: item.title?.rendered || item.title || "Untitled Post",
              snippet: (item.subtype || "WordPress Post") + " - " + (item.url || ""),
              type: "page",
              provider: "native-wp",
              score: 0.95 - idx * 0.02,
            });
          });
        }
      }
    } catch {
      // Ignore WP search error
    }
  }

  // Static Index JSON Search (Docusaurus / Hugo / Nextra)
  if (nativeInfo.provider === "native-other" && nativeInfo.endpoint?.endsWith(".json")) {
    try {
      const res = await fetch(nativeInfo.endpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("json") && !contentType.includes("javascript")) {
          return results;
        }

        const rawText = await res.text();
        const trimmed = rawText.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          return results;
        }

        const json = JSON.parse(trimmed);
        const items = Array.isArray(json) ? json : json.docs || json.items || [];
        const qLower = q.toLowerCase();

        items.forEach((item: any) => {
          const title = item.title || item.heading || item.name || "";
          const content = item.content || item.text || item.description || "";
          const relUrl = item.url || item.path || item.permalink || "";

          if (
            title.toLowerCase().includes(qLower) ||
            content.toLowerCase().includes(qLower)
          ) {
            const fullUrl = relUrl.startsWith("http")
              ? relUrl
              : `https://${cleanHost}${relUrl.startsWith("/") ? "" : "/"}${relUrl}`;

            results.push({
              id: hashUrl(fullUrl),
              url: fullUrl,
              title: title || fullUrl,
              snippet: content.slice(0, 180) || "Match found in site search index.",
              type: "page",
              provider: "native-other",
              score: 0.9,
            });
          }
        });
      }
    } catch {
      // Ignore static index search errors
    }
  }

  return results.slice(0, 50);
}
