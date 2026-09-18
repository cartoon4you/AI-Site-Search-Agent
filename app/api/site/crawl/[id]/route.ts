import { NextRequest, NextResponse } from "next/server";
import { cancelCrawl } from "@/lib/site/crawl-strategy";
import { getDb } from "@/lib/site/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT * FROM crawls WHERE id = ?`,
      args: [id],
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Crawl job not found" }, { status: 404 });
    }

    const row = res.rows[0];
    const stats = row.stats_json ? JSON.parse(String(row.stats_json)) : null;

    return NextResponse.json({
      id: row.id,
      status: row.status,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch crawl status" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    cancelCrawl(id);
    return NextResponse.json({ success: true, message: `Crawl ${id} cancellation requested.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to cancel crawl" }, { status: 500 });
  }
}
