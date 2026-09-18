import { NextRequest } from "next/server";
import { runLiveCrawl } from "@/lib/site/crawl-strategy";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { host, options } = await req.json();

    if (!host) {
      return new Response(JSON.stringify({ error: "Host is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const crawlId = `crawl_${crypto.randomUUID().slice(0, 8)}`;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const emitEvent = (data: any) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // Stream closed
          }
        };

        try {
          await runLiveCrawl(crawlId, host, options || {}, emitEvent);
        } catch (err: any) {
          emitEvent({ type: "error", message: err.message || "Crawl failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
