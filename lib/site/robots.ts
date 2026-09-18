export interface RobotsRules {
  host: string;
  allowed: boolean;
  disallowedPaths: string[];
  allowedPaths: string[];
  crawlDelayMs: number;
  sitemaps: string[];
  isAllowed: (url: string, userAgent?: string) => boolean;
}

export async function checkRobotsTxt(host: string, customUserAgent?: string): Promise<RobotsRules> {
  const cleanHost = host.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const robotsUrl = `https://${cleanHost}/robots.txt`;

  const ua = (customUserAgent || process.env.CRAWL_USER_AGENT || "SiteAgent").toLowerCase();

  const rules: RobotsRules = {
    host: cleanHost,
    allowed: true,
    disallowedPaths: [],
    allowedPaths: [],
    crawlDelayMs: Number(process.env.CRAWL_DELAY_MS || 200),
    sitemaps: [],
    isAllowed: (targetUrl: string) => true,
  };

  try {
    const res = await fetch(robotsUrl, {
      headers: {
        "User-Agent": process.env.CRAWL_USER_AGENT || "SiteAgent/1.0 (+https://ais.studio)",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      // 404 or missing robots.txt -> site allows crawling by default
      return rules;
    }

    const text = await res.text();
    const lines = text.split(/\r?\n/);

    let activeUserAgentMatches = false;
    let globalUserAgentMatches = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;

      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (key === "user-agent") {
        const agentName = value.toLowerCase();
        if (agentName === "*" || agentName === "siteagent") {
          globalUserAgentMatches = true;
          activeUserAgentMatches = true;
        } else if (ua.includes(agentName)) {
          activeUserAgentMatches = true;
        } else {
          activeUserAgentMatches = false;
        }
      } else if (key === "disallow" && (activeUserAgentMatches || globalUserAgentMatches)) {
        if (value) {
          rules.disallowedPaths.push(value);
        }
      } else if (key === "allow" && (activeUserAgentMatches || globalUserAgentMatches)) {
        if (value) {
          rules.allowedPaths.push(value);
        }
      } else if (key === "crawl-delay" && (activeUserAgentMatches || globalUserAgentMatches)) {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          rules.crawlDelayMs = Math.max(rules.crawlDelayMs, delay * 1000);
        }
      } else if (key === "sitemap") {
        if (value && value.startsWith("http")) {
          rules.sitemaps.push(value);
        }
      }
    }

    // Attach matcher function
    rules.isAllowed = (targetUrl: string): boolean => {
      let pathName = "/";
      try {
        const parsed = new URL(targetUrl);
        pathName = parsed.pathname;
      } catch {
        pathName = targetUrl;
      }

      // Explicit Allow overrides Disallow
      for (const allowPath of rules.allowedPaths) {
        if (pathName.startsWith(allowPath)) return true;
      }

      // Check Disallow
      for (const disallowPath of rules.disallowedPaths) {
        if (disallowPath === "/" && rules.allowedPaths.length === 0) {
          return false;
        }
        if (disallowPath !== "/" && pathName.startsWith(disallowPath)) {
          return false;
        }
      }

      return true;
    };
  } catch (err) {
    console.warn(`Could not fetch robots.txt for ${cleanHost}:`, err);
  }

  return rules;
}
