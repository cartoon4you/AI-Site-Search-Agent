import { NextRequest, NextResponse } from "next/server";
import { ensureDbInitialized, normalizeHost } from "@/lib/site/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const host = searchParams.get("host");
    const crawlId = searchParams.get("crawlId");
    const format = searchParams.get("format") || "urls";

    if (!host) {
      return NextResponse.json({ error: "Host param is required" }, { status: 400 });
    }

    const cleanHost = normalizeHost(host);
    const db = await ensureDbInitialized();

    let sql = `SELECT * FROM all_urls WHERE 1=1`;
    const args: any[] = [];

    if (crawlId) {
      sql += ` AND crawl_id = ?`;
      args.push(crawlId);
    } else {
      sql += ` AND url LIKE ?`;
      args.push(`%${cleanHost}%`);
    }

    const res = await db.execute({ sql, args });
    const rows = res.rows;

    if (format === "csv") {
      const csvHeader = "URL,Source,Fetched,Status\n";
      const csvBody = rows
        .map((r) => `"${r.url}","${r.source}",${r.fetched},${r.status}`)
        .join("\n");

      return new NextResponse(csvHeader + csvBody, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${cleanHost}-crawled-urls.csv"`,
        },
      });
    }

    if (format === "sitemap") {
      const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      const xmlBody = rows
        .map(
          (r) =>
            `  <url>\n    <loc>${r.url}</loc>\n  </url>`
        )
        .join("\n");
      const xmlFooter = `\n</urlset>`;

      return new NextResponse(xmlHeader + xmlBody + xmlFooter, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${cleanHost}-sitemap.xml"`,
        },
      });
    }

    // Default plain text list of URLs
    const urlList = rows.map((r) => r.url).join("\n");

    return new NextResponse(urlList, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${cleanHost}-urls.txt"`,
      },
    });
  } catch (err: any) {
    console.error("Export API error:", err);
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
