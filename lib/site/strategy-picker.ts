import { detectNativeSearch } from "./native-strategy";
import { getSiteMetadata } from "./index-strategy";
import { checkRobotsTxt } from "./robots";
import { parseSitemap } from "./sitemap";
import { SearchStrategy, SiteAnalysis } from "./types";
import { normalizeHost, upsertSite } from "./db";

export async function analyzeSite(host: string): Promise<SiteAnalysis> {
  const cleanHost = normalizeHost(host);
  const strategiesAvailable: SearchStrategy[] = ["operator"]; // Operator is always available

  // 1. Probe for Native Search (Algolia, Typesense, WP, CSE, Static Indexes)
  const nativeSearch = await detectNativeSearch(cleanHost);
  if (nativeSearch) {
    strategiesAvailable.push("native");
  }

  // 2. Check Local Database Index
  const dbMeta = await getSiteMetadata(cleanHost);
  if (dbMeta.indexedCount > 0) {
    strategiesAvailable.push("index");
  }

  // 3. Check robots.txt & Crawl availability
  const robots = await checkRobotsTxt(cleanHost);
  strategiesAvailable.push("crawl");

  // 4. Quick sitemap sampling
  const sitemaps = await parseSitemap(cleanHost);
  const sitemapUrls = sitemaps.slice(0, 10).map((s) => s.url);

  // 5. Estimate Site Size
  let estimatedSize: "small" | "medium" | "large" = "small";
  if (sitemaps.length > 500) estimatedSize = "large";
  else if (sitemaps.length > 50) estimatedSize = "medium";

  // Upsert host into site DB
  await upsertSite(cleanHost, nativeSearch);

  // Auto-picker decision rules
  let recommendedStrategy: SearchStrategy = "operator";

  if (nativeSearch && process.env.ENABLE_NATIVE_STRATEGY !== "false") {
    // Native search is instant, native, and authoritative
    recommendedStrategy = "native";
  } else if (dbMeta.indexedCount > 0 && process.env.ENABLE_INDEX_STRATEGY !== "false") {
    // Local index exists and has pages
    recommendedStrategy = "index";
  } else if (estimatedSize === "small" && robots.isAllowed("/") && process.env.ENABLE_CRAWL_STRATEGY !== "false") {
    // Small site ready to crawl locally
    recommendedStrategy = "crawl";
  } else {
    // Large site or well-indexed site -> delegate to Google/Yandex site operator
    recommendedStrategy = "operator";
  }

  return {
    host: cleanHost,
    strategiesAvailable,
    recommendedStrategy,
    nativeSearch: nativeSearch || undefined,
    sitemapUrls,
    robotsAllowed: robots.isAllowed("/"),
    estimatedSize,
    indexedCount: dbMeta.indexedCount,
    lastCrawledAt: dbMeta.lastCrawledAt || undefined,
    isVerifiedOwner: dbMeta.isVerified,
  };
}
