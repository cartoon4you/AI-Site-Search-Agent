import { NextRequest } from "next/server";
import { runOperatorStrategy } from "@/lib/site/operator-strategy";
import { runNativeStrategy, detectNativeSearch } from "@/lib/site/native-strategy";
import { runLocalIndexStrategy } from "@/lib/site/index-strategy";
import { rerankResults } from "@/lib/site/rerank";
import { SearchStrategy, SiteResult } from "@/lib/site/types";

export async function POST(req: NextRequest) {
  try {
    const { host, query, strategy } = await req.json();

    if (!host) {
      return new Response(JSON.stringify({ error: "Host is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();
    const activeStrategy: SearchStrategy = strategy || "auto";

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

        const candidateMap = new Map<string, SiteResult>();

        // Emit metadata event
        emitEvent({
          type: "meta",
          host,
          activeStrategy,
        });

        // Determine which strategies to execute
        try {
          if (activeStrategy === "native" || activeStrategy === "auto") {
            const nativeInfo = await detectNativeSearch(host);
            if (nativeInfo) {
              const nativeRes = await runNativeStrategy(host, query || "", nativeInfo);
              if (nativeRes.length > 0) {
                nativeRes.forEach((r) => candidateMap.set(r.url, r));
                emitEvent({
                  type: "batch",
                  provider: nativeInfo.provider,
                  results: nativeRes,
                });
              }
            }
          }

          if (activeStrategy === "index" || activeStrategy === "auto") {
            const localRes = await runLocalIndexStrategy(host, query || "");
            if (localRes.length > 0) {
              localRes.forEach((r) => candidateMap.set(r.url, r));
              emitEvent({
                type: "batch",
                provider: "local-index",
                results: localRes,
              });
            }
          }

          if (activeStrategy === "operator" || activeStrategy === "auto" || candidateMap.size === 0) {
            const operatorRes = await runOperatorStrategy(host, query || "");
            if (operatorRes.length > 0) {
              operatorRes.forEach((r) => {
                if (!candidateMap.has(r.url)) {
                  candidateMap.set(r.url, r);
                }
              });
              emitEvent({
                type: "batch",
                provider: "google",
                results: operatorRes,
              });
            }
          }

          // AI Reranking across all candidates
          const candidates = Array.from(candidateMap.values());
          const finalRanked = await rerankResults(query || "", candidates);

          const elapsedMs = Date.now() - startTime;

          emitEvent({
            type: "done",
            total: finalRanked.length,
            elapsedMs,
            strategyUsed: activeStrategy,
            finalRanked,
          });
        } catch (err: any) {
          emitEvent({ type: "error", message: err.message || "Search failed" });
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
