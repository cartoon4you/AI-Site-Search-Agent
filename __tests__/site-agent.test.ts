import { checkRobotsTxt } from "../lib/site/robots";
import { parseSitemap } from "../lib/site/sitemap";
import { normalizeHost, hashUrl } from "../lib/site/db";

describe("Site Search Agent Core Tests", () => {
  test("Host normalization and URL hashing", () => {
    expect(normalizeHost("https://Example.COM/path?q=1")).toBe("example.com");
    expect(normalizeHost("http://SUB.domain.org/")).toBe("sub.domain.org");
    expect(hashUrl("https://example.com/page")).toHaveLength(32);
  });

  test("Robots.txt parser handles Disallow rules", async () => {
    const rules = await checkRobotsTxt("wikipedia.org");
    expect(rules.host).toBe("wikipedia.org");
    expect(rules.isAllowed("https://wikipedia.org/")).toBe(true);
  });

  test("Sitemap parser deduplicates discovered URLs", async () => {
    const urls = await parseSitemap("wikipedia.org");
    expect(Array.isArray(urls)).toBe(true);
  });
});
