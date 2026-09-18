-- SQLite / libSQL database schema for Site Agent

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  host TEXT UNIQUE NOT NULL,
  verified_at TEXT,
  native_search_json TEXT,
  last_analyzed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crawls (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  stats_json TEXT,
  status TEXT DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS all_urls (
  id TEXT PRIMARY KEY,
  crawl_id TEXT REFERENCES crawls(id),
  url TEXT NOT NULL,
  source TEXT,
  fetched INTEGER DEFAULT 0,
  status INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  crawl_id TEXT REFERENCES crawls(id),
  host TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  text TEXT,
  lang TEXT DEFAULT 'en',
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  crawl_id TEXT REFERENCES crawls(id),
  host TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  name TEXT,
  ext TEXT,
  mime TEXT,
  size_bytes INTEGER DEFAULT 0,
  source_page TEXT
);

CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  host TEXT NOT NULL,
  method TEXT,
  token TEXT NOT NULL,
  verified_at TEXT
);
