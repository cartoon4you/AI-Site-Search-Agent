import { SiteResult } from "./types";
import { searchLocalIndex, normalizeHost, getSiteMeta } from "./db";

export async function getSiteMetadata(host: string) {
  const meta = await getSiteMeta(host);
  return {
    indexedCount: meta.totalCount,
    lastCrawledAt: meta.lastAnalyzedAt,
    pageCount: meta.pageCount,
    fileCount: meta.fileCount,
    isVerified: meta.isVerified,
  };
}

export async function runLocalIndexStrategy(host: string, query: string): Promise<SiteResult[]> {
  if (process.env.ENABLE_INDEX_STRATEGY === "false") return [];

  const cleanHost = normalizeHost(host);

  // Check if Meilisearch is enabled
  if (process.env.MEILI_ENABLED === "true" && process.env.MEILI_HOST) {
    try {
      const meiliResults = await searchMeilisearch(cleanHost, query);
      if (meiliResults.length > 0) return meiliResults;
    } catch {
      // Silent fallback to SQLite FTS5 index when Meilisearch instance is unreachable
    }
  }

  // SQLite FTS5 / LIKE Index search
  return searchLocalIndex(cleanHost, query);
}

async function searchMeilisearch(host: string, query: string): Promise<SiteResult[]> {
  const meiliHost = process.env.MEILI_HOST;
  const meiliKey = process.env.MEILI_KEY;
  const indexName = `site-${host.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  const res = await fetch(`${meiliHost}/indexes/${indexName}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(meiliKey ? { Authorization: `Bearer ${meiliKey}` } : {}),
    },
    body: JSON.stringify({
      q: query,
      limit: 50,
      attributesToHighlight: ["title", "description", "text"],
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const hits = data.hits || [];

  return hits.map((hit: any) => ({
    id: hit.id || hit.url,
    url: hit.url,
    title: hit._formatted?.title || hit.title || hit.url,
    snippet: hit._formatted?.description || hit._formatted?.text || hit.snippet || "",
    type: hit.type || "page",
    provider: "local-index",
    score: hit._rankingScore || 0.85,
  }));
}
