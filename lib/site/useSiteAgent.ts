"use client";

import { useState, useCallback, useRef } from "react";
import { SiteAnalysis, SiteResult, SearchStrategy, CrawlStats, VerificationResult } from "./types";

export interface SiteAgentState {
  host: string;
  isAnalyzing: boolean;
  isSearching: boolean;
  isCrawling: boolean;
  analysis: SiteAnalysis | null;
  selectedStrategy: SearchStrategy;
  crawlStats: CrawlStats | null;
  crawlLogs: string[];
  results: SiteResult[];
  activeTab: "site" | "pages" | "files" | "images" | "videos";
  error: string | null;
  searchMeta: { elapsedMs?: number; total?: number; strategyUsed?: string } | null;
}

export function useSiteAgent() {
  const [state, setState] = useState<SiteAgentState>({
    host: "",
    isAnalyzing: false,
    isSearching: false,
    isCrawling: false,
    analysis: null,
    selectedStrategy: "auto",
    crawlStats: null,
    crawlLogs: [],
    results: [],
    activeTab: "site",
    error: null,
    searchMeta: null,
  });

  const activeCrawlAbortRef = useRef<AbortController | null>(null);

  // 1. Analyze domain
  const analyze = useCallback(async (host: string) => {
    if (!host) return;
    setState((prev) => ({ ...prev, isAnalyzing: true, host, error: null }));

    try {
      const res = await fetch("/api/site/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host }),
      });

      if (!res.ok) throw new Error("Failed to analyze site");
      const data: SiteAnalysis = await res.json();

      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        analysis: data,
        selectedStrategy: "auto",
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: err.message || "Domain analysis failed",
      }));
    }
  }, []);

  // 2. Start SSE Crawl
  const startCrawl = useCallback(async (options?: any) => {
    if (!state.host) return;

    if (activeCrawlAbortRef.current) {
      activeCrawlAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeCrawlAbortRef.current = controller;

    setState((prev) => ({ ...prev, isCrawling: true, crawlLogs: [], error: null }));

    try {
      const res = await fetch("/api/site/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: state.host, options }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Crawl start failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "progress" || event.type === "stats") {
                setState((prev) => ({ ...prev, crawlStats: event.stats }));
              } else if (event.type === "log" && event.message) {
                setState((prev) => ({ ...prev, crawlLogs: [...prev.crawlLogs, event.message] }));
              } else if (event.type === "done") {
                setState((prev) => ({
                  ...prev,
                  isCrawling: false,
                  crawlStats: event.stats || prev.crawlStats,
                }));
              }
            } catch {
              // Ignore partial JSON parse
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setState((prev) => ({
          ...prev,
          isCrawling: false,
          error: err.message || "Crawl interrupted",
        }));
      }
    }
  }, [state.host]);

  // 3. Search Domain via SSE Stream
  const search = useCallback(
    async (query: string, strategyOverride?: SearchStrategy) => {
      if (!state.host) return;

      const activeStrat = strategyOverride || state.selectedStrategy;
      setState((prev) => ({ ...prev, isSearching: true, error: null, results: [] }));

      try {
        const res = await fetch("/api/site/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: state.host,
            query,
            strategy: activeStrat,
          }),
        });

        if (!res.ok) throw new Error("Search request failed");

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) return;

        let accumulatedResults: SiteResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === "batch" && Array.isArray(event.results)) {
                  accumulatedResults = [...accumulatedResults, ...event.results];
                  setState((prev) => ({ ...prev, results: accumulatedResults }));
                } else if (event.type === "done") {
                  setState((prev) => ({
                    ...prev,
                    isSearching: false,
                    results: event.finalRanked || accumulatedResults,
                    searchMeta: {
                      elapsedMs: event.elapsedMs,
                      total: event.total,
                      strategyUsed: event.strategyUsed,
                    },
                  }));
                }
              } catch {
                // Ignore chunk split errors
              }
            }
          }
        }
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isSearching: false,
          error: err.message || "Search failed",
        }));
      }
    },
    [state.host, state.selectedStrategy]
  );

  // 4. Cancel active crawl
  const cancel = useCallback(async () => {
    if (activeCrawlAbortRef.current) {
      activeCrawlAbortRef.current.abort();
    }
    if (state.crawlStats?.crawlId) {
      fetch(`/api/site/crawl/${state.crawlStats.crawlId}`, { method: "DELETE" }).catch(() => {});
    }
    setState((prev) => ({ ...prev, isCrawling: false }));
  }, [state.crawlStats]);

  // 5. Verify ownership
  const verify = useCallback(async (method: "dns" | "meta"): Promise<VerificationResult> => {
    if (!state.host) throw new Error("No host specified");

    const res = await fetch("/api/site/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: state.host, method }),
    });

    const data: VerificationResult = await res.json();
    if (data.verified) {
      setState((prev) => ({
        ...prev,
        analysis: prev.analysis ? { ...prev.analysis, isVerifiedOwner: true } : null,
      }));
    }
    return data;
  }, [state.host]);

  // 6. Export URLs / Sitemap
  const exportUrls = useCallback((format: "urls" | "csv" | "sitemap" = "urls") => {
    if (!state.host) return;
    const crawlId = state.crawlStats?.crawlId || "";
    window.open(`/api/site/export?host=${encodeURIComponent(state.host)}&crawlId=${crawlId}&format=${format}`, "_blank");
  }, [state.host, state.crawlStats]);

  const setStrategy = useCallback((strategy: SearchStrategy) => {
    setState((prev) => ({ ...prev, selectedStrategy: strategy }));
  }, []);

  const setTab = useCallback((tab: "site" | "pages" | "files" | "images" | "videos") => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  return {
    state,
    analyze,
    startCrawl,
    search,
    cancel,
    verify,
    exportUrls,
    setStrategy,
    setTab,
  };
}
