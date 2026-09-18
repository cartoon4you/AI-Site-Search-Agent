"use client";

import React, { useState } from "react";
import { SiteResult } from "@/lib/site/types";
import { ResultCard } from "@/components/search/ResultCard";
import { Globe, Bug } from "lucide-react";

interface SearchResultsProps {
  results: SiteResult[];
  isSearching: boolean;
  searchMeta?: { elapsedMs?: number; total?: number; strategyUsed?: string } | null;
}

export function SearchResults({ results, isSearching, searchMeta }: SearchResultsProps) {
  const [isDebugMode, setIsDebugMode] = useState(false);

  if (isSearching) {
    return (
      <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl animate-pulse flex flex-row items-start gap-4"
          >
            <div className="w-[72px] h-[72px] sm:w-24 sm:h-24 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded-md w-1/2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800/40 rounded-md w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto my-12 text-center p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs">
        <Globe className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
          No site results found / لم يتم العثور على نتائج
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
          Try adjusting your query, switching to &quot;Live crawl&quot; mode to index all domain pages, or verifying domain ownership.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-6 space-y-4">
      {/* Results Header Meta Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1 font-mono">
        <div>
          Found <strong>{results.length}</strong> results
          {searchMeta?.elapsedMs ? ` (${searchMeta.elapsedMs}ms)` : ""}
        </div>
        <button
          onClick={() => setIsDebugMode(!isDebugMode)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${
            isDebugMode
              ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800"
              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
          }`}
        >
          <Bug className="w-3 h-3" />
          <span>Debug Mode ({isDebugMode ? "ON" : "OFF"})</span>
        </button>
      </div>

      {/* Result Items */}
      <div className="space-y-3">
        {results.map((item) => (
          <ResultCard key={item.id || item.url} item={item} isDebugMode={isDebugMode} />
        ))}
      </div>
    </div>
  );
}
