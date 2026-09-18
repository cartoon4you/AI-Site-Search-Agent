import { createClient, Client } from "@libsql/client";
import { SiteResult } from "./types";
import crypto from "crypto";
import fs from "fs";
import path from "path";

let dbInstance: Client | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (dbInstance) return dbInstance;

  let dbUrl = process.env.CRAWL_DB_URL || "file:./data/site-agent.db";
  
  // Validate URL scheme for @libsql/client (supports libsql:, wss:, ws:, https:, http:, file:)
  const validSchemes = ["libsql:", "wss:", "ws:", "https:", "http:", "file:"];
  if (!validSchemes.some((scheme) => dbUrl.startsWith(scheme))) {
    console.warn(`[CRAWL_DB] Unsupported DB URL scheme "${dbUrl}". Falling back to file:./data/site-agent.db`);
    dbUrl = "file:./data/site-agent.db";
  }

  // Ensure local directory exists if using file storage
  if (dbUrl.startsWith("file:")) {
    const filePath = dbUrl.replace("file:", "");
    if (filePath && filePath !== ":memory:") {
      const dir = path.dirname(path.resolve(filePath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  dbInstance = createClient({
    url: dbUrl,
  });

  return dbInstance;
}

export async function ensureDbInitialized(): Promise<Client> {
  const db = getDb();
  if (!initPromise) {
    initPromise = initDbSchema(db).catch((err) => {
      initPromise = null;
      console.error("Failed to initialize database schema:", err);
      throw err;
    });
  }
  await initPromise;
  return db;
}

async function initDbSchema(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      host TEXT UNIQUE NOT NULL,
      verified_at TEXT,
      native_search_json TEXT,
      last_analyzed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS crawls (
      id TEXT PRIMARY KEY,
      site_id TEXT REFERENCES sites(id),
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      stats_json TEXT,
      status TEXT DEFAULT 'running'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS all_urls (
      id TEXT PRIMARY KEY,
      crawl_id TEXT,
      url TEXT NOT NULL,
      source TEXT,
      fetched INTEGER DEFAULT 0,
      status INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      crawl_id TEXT,
      host TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      description TEXT,
      text TEXT,
      lang TEXT DEFAULT 'en',
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      crawl_id TEXT,
      host TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      name TEXT,
      ext TEXT,
      mime TEXT,
      size_bytes INTEGER DEFAULT 0,
      source_page TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY,
      site_id TEXT,
      host TEXT NOT NULL,
      method TEXT,
      token TEXT NOT NULL,
      verified_at TEXT
    );
  `);
}

// Helper: Normalize host
export function normalizeHost(inputHost: string): string {
  let cleaned = inputHost.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return cleaned;
}

// Helper: Hash URL for ID
export function hashUrl(url: string): string {
  return crypto.createHash("md5").update(url.toLowerCase()).digest("hex");
}

// Save or Update Site Record
export async function upsertSite(host: string, nativeSearchJson?: any) {
  const db = await ensureDbInitialized();
  const cleanHost = normalizeHost(host);
  const id = hashUrl(cleanHost);

  await db.execute({
    sql: `INSERT INTO sites (id, host, native_search_json, last_analyzed_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(host) DO UPDATE SET
            native_search_json = excluded.native_search_json,
            last_analyzed_at = CURRENT_TIMESTAMP`,
    args: [id, cleanHost, nativeSearchJson ? JSON.stringify(nativeSearchJson) : null],
  });
}

// Get Site Metadata
export async function getSiteMeta(host: string) {
  const db = await ensureDbInitialized();
  const cleanHost = normalizeHost(host);
  
  const siteRes = await db.execute({
    sql: `SELECT * FROM sites WHERE host = ?`,
    args: [cleanHost],
  });

  const pageCountRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM pages WHERE host = ?`,
    args: [cleanHost],
  });

  const fileCountRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM files WHERE host = ?`,
    args: [cleanHost],
  });

  const verificationRes = await db.execute({
    sql: `SELECT * FROM verifications WHERE host = ? AND verified_at IS NOT NULL LIMIT 1`,
    args: [cleanHost],
  });

  const siteRow = siteRes.rows[0];
  const pageCount = Number(pageCountRes.rows[0]?.count || 0);
  const fileCount = Number(fileCountRes.rows[0]?.count || 0);
  const isVerified = verificationRes.rows.length > 0;

  return {
    host: cleanHost,
    nativeSearch: siteRow?.native_search_json ? JSON.parse(String(siteRow.native_search_json)) : null,
    lastAnalyzedAt: siteRow?.last_analyzed_at ? String(siteRow.last_analyzed_at) : null,
    pageCount,
    fileCount,
    totalCount: pageCount + fileCount,
    isVerified,
  };
}

// Insert Discovered Page
export async function insertPage(data: {
  crawlId: string;
  host: string;
  url: string;
  title: string;
  description: string;
  text: string;
  lang?: string;
}) {
  const db = await ensureDbInitialized();
  const cleanHost = normalizeHost(data.host);
  const id = hashUrl(data.url);

  await db.execute({
    sql: `INSERT INTO pages (id, crawl_id, host, url, title, description, text, lang)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(url) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            text = excluded.text,
            fetched_at = CURRENT_TIMESTAMP`,
    args: [
      id,
      data.crawlId,
      cleanHost,
      data.url,
      data.title || "",
      data.description || "",
      data.text || "",
      data.lang || "en",
    ],
  });
}

// Insert Discovered File
export async function insertFile(data: {
  crawlId: string;
  host: string;
  url: string;
  name: string;
  ext: string;
  mime: string;
  sizeBytes?: number;
  sourcePage?: string;
}) {
  const db = await ensureDbInitialized();
  const cleanHost = normalizeHost(data.host);
  const id = hashUrl(data.url);

  await db.execute({
    sql: `INSERT INTO files (id, crawl_id, host, url, name, ext, mime, size_bytes, source_page)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(url) DO UPDATE SET
            name = excluded.name,
            ext = excluded.ext,
            mime = excluded.mime,
            size_bytes = excluded.size_bytes`,
    args: [
      id,
      data.crawlId,
      cleanHost,
      data.url,
      data.name,
      data.ext,
      data.mime,
      data.sizeBytes || 0,
      data.sourcePage || "",
    ],
  });
}

// Insert URL into all_urls table
export async function insertDiscoveredUrl(crawlId: string, url: string, source: string, fetched = false, status = 0) {
  const db = await ensureDbInitialized();
  const id = hashUrl(`${crawlId}:${url}`);
  await db.execute({
    sql: `INSERT INTO all_urls (id, crawl_id, url, source, fetched, status)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET fetched = excluded.fetched, status = excluded.status`,
    args: [id, crawlId, url, source, fetched ? 1 : 0, status],
  });
}

// Local Search against SQLite index
export async function searchLocalIndex(host: string, query: string): Promise<SiteResult[]> {
  const db = await ensureDbInitialized();
  const cleanHost = normalizeHost(host);
  const q = query.trim().toLowerCase();

  const results: SiteResult[] = [];

  if (!q) {
    // Return latest indexed pages if query is empty
    const pagesRes = await db.execute({
      sql: `SELECT * FROM pages WHERE host = ? ORDER BY fetched_at DESC LIMIT 50`,
      args: [cleanHost],
    });

    for (const row of pagesRes.rows) {
      results.push({
        id: String(row.id),
        url: String(row.url),
        title: String(row.title || row.url),
        snippet: String(row.description || (String(row.text || "").slice(0, 160))),
        type: "page",
        provider: "local-index",
        score: 0.8,
      });
    }
    return results;
  }

  // Exact & LIKE match across pages
  const searchLike = `%${q}%`;
  const pagesRes = await db.execute({
    sql: `SELECT * FROM pages WHERE host = ? AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(text) LIKE ?) LIMIT 50`,
    args: [cleanHost, searchLike, searchLike, searchLike],
  });

  for (const row of pagesRes.rows) {
    const title = String(row.title || row.url);
    const text = String(row.text || "");
    const desc = String(row.description || "");

    let snippet = desc;
    if (!snippet && text) {
      const idx = text.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 80);
        snippet = text.slice(start, end);
      } else {
        snippet = text.slice(0, 160);
      }
    }

    // Wrap query term in <mark> for highlighting
    const highlightRegex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const highlightedSnippet = snippet.replace(highlightRegex, "<mark>$1</mark>");

    // Basic scoring
    let score = 0.5;
    if (title.toLowerCase().includes(q)) score += 0.3;
    if (desc.toLowerCase().includes(q)) score += 0.15;

    results.push({
      id: String(row.id),
      url: String(row.url),
      title,
      snippet: highlightedSnippet || snippet,
      type: "page",
      provider: "local-index",
      score,
    });
  }

  // Search files
  const filesRes = await db.execute({
    sql: `SELECT * FROM files WHERE host = ? AND (LOWER(name) LIKE ? OR LOWER(ext) LIKE ? OR LOWER(mime) LIKE ?) LIMIT 25`,
    args: [cleanHost, searchLike, searchLike, searchLike],
  });

  for (const row of filesRes.rows) {
    const name = String(row.name);
    const highlightedName = name.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");

    results.push({
      id: String(row.id),
      url: String(row.url),
      title: name,
      snippet: `File (${String(row.ext).toUpperCase()}) - ${highlightedName}`,
      type: "file",
      provider: "local-index",
      mime: String(row.mime),
      sizeBytes: Number(row.size_bytes),
      score: 0.6,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
