export type SearchStrategy = "auto" | "operator" | "crawl" | "index" | "native";

export type ResultProvider =
  | "google"
  | "yandex"
  | "crawl"
  | "sitemap"
  | "native-algolia"
  | "native-typesense"
  | "native-wp"
  | "native-cse"
  | "native-other"
  | "local-index";

export interface SiteResult {
  id: string;                 // hash(normalized url)
  url: string;
  title: string;
  snippet: string;            // with <mark> highlights
  type: "page" | "file" | "image" | "video" | "site";
  provider: ResultProvider;
  mime?: string;
  sizeBytes?: number;
  lastModified?: string;
  score: number;              // final blended 0-1
  reasons?: string[];         // short explanation for debug mode
  thumbnailUrl?: string;      // optional custom thumbnail URL
}

export interface NativeSearchInfo {
  provider: ResultProvider;
  name: string;
  endpoint?: string;
  appId?: string;
  apiKey?: string;
  indexName?: string;
}

export interface SiteAnalysis {
  host: string;
  strategiesAvailable: SearchStrategy[];
  recommendedStrategy: SearchStrategy;
  nativeSearch?: NativeSearchInfo;
  sitemapUrls: string[];
  robotsAllowed: boolean;
  estimatedSize?: "small" | "medium" | "large";
  indexedCount?: number;
  lastCrawledAt?: string;
  isVerifiedOwner?: boolean;
}

export interface CrawlStats {
  crawlId: string;
  host: string;
  status: "running" | "completed" | "cancelled" | "failed";
  pagesCrawled: number;
  filesDiscovered: number;
  queuedCount: number;
  errorCount: number;
  blockedCount: number;
  progressPercent: number;
  etaSeconds: number;
  startedAt: string;
  finishedAt?: string;
}

export interface CrawlProgressEvent {
  type: "progress" | "log" | "done" | "error" | "stats";
  crawlId?: string;
  stats?: CrawlStats;
  message?: string;
  url?: string;
}

export interface SearchStreamEvent {
  type: "meta" | "batch" | "done" | "error";
  host?: string;
  activeStrategies?: SearchStrategy[];
  provider?: ResultProvider;
  results?: SiteResult[];
  elapsedMs?: number;
  total?: number;
  strategyUsed?: string;
  message?: string;
}

export interface VerificationResult {
  verified: boolean;
  method?: "dns" | "meta";
  token?: string;
  instructions?: string;
  verifiedAt?: string;
}
