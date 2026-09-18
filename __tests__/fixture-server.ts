import { createServer, Server } from "http";

export function createFixtureServer(port = 8999): Promise<Server> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = req.url || "/";

      if (url === "/robots.txt") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(
          `User-agent: *\nDisallow: /admin/\nDisallow: /private/\nAllow: /\nSitemap: http://localhost:${port}/sitemap.xml\n`
        );
        return;
      }

      if (url === "/sitemap.xml") {
        res.writeHead(200, { "Content-Type": "application/xml" });
        res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>http://localhost:${port}/</loc><lastmod>2026-09-01</lastmod></url>
  <url><loc>http://localhost:${port}/about</loc><lastmod>2026-09-02</lastmod></url>
  <url><loc>http://localhost:${port}/doc.pdf</loc><lastmod>2026-09-03</lastmod></url>
</urlset>`);
        return;
      }

      if (url === "/wp-json/wp/v2/search?search=test&per_page=1") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify([{ id: 101, title: { rendered: "Test Post" }, url: `http://localhost:${port}/test-post` }]));
        return;
      }

      if (url === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Fixture Local Test Site</title>
  <meta name="description" content="A mock local fixture site for site agent crawler verification">
  <link rel="https://api.w.org/" href="http://localhost:${port}/wp-json/" />
</head>
<body>
  <h1>Welcome to Fixture Site</h1>
  <p>Search test content page.</p>
  <a href="/about">About Us</a>
  <a href="/doc.pdf">Download PDF</a>
</body>
</html>`);
        return;
      }

      if (url === "/about") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>About Us - Fixture Site</title>
  <meta name="description" content="Learn about our local test site fixture">
</head>
<body>
  <h1>About Our Company</h1>
  <p>We build state of the art search agents.</p>
</body>
</html>`);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}
