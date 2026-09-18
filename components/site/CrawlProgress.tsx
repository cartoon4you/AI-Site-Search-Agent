"use client";

import React from "react";
import { CrawlStats } from "@/lib/site/types";
import { Loader2, RefreshCw, Download, FileCode, Ban, AlertTriangle, CheckCircle2, X } from "lucide-react";

interface CrawlProgressProps {
  host: string;
  isCrawling: boolean;
  stats: CrawlStats | null;
  indexedPages?: number;
  indexedFiles?: number;
  lastUpdatedText?: string;
  onCancel: () => void;
  onRefreshIndex: () => void;
  onExport: (format: "urls" | "csv" | "sitemap") => void;
  onDismissReadyBadge?: () => void;
}

export function CrawlProgress({
  host,
  isCrawling,
  stats,
  indexedPages = 0,
  indexedFiles = 0,
  lastUpdatedText = "just now",
  onCancel,
  onRefreshIndex,
  onExport,
  onDismissReadyBadge,
}: CrawlProgressProps) {
  if (!host) return null;

  // Render "When ready" badge if not crawling and indexed items exist
  if (!isCrawling && (indexedPages > 0 || indexedFiles > 0) && !stats) {
    return (
      <div className="my-3 flex items-center justify-between px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Indexed: <strong className="font-mono">{host}</strong> — {indexedPages} pages, {indexedFiles} files (updated {lastUpdatedText})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshIndex}
            className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline font-semibold"
          >
            Refresh
          </button>
          {onDismissReadyBadge && (
            <button
              onClick={onDismissReadyBadge}
              className="p-1 text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100"
              aria-label="Dismiss ready notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isCrawling && !stats) return null;

  const percent = stats?.progressPercent || 0;
  const etaFormatted = stats?.etaSeconds
    ? `${Math.floor(stats.etaSeconds / 60)}:${String(stats.etaSeconds % 60).padStart(2, "0")}`
    : "00:00";

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gray-900 dark:bg-black text-gray-100 border border-gray-800 rounded-xl p-4 my-3 shadow-md transition-all font-sans"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Loader2 className={`w-4 h-4 text-blue-400 ${isCrawling ? "animate-spin" : ""}`} />
          <span>
            {isCrawling ? `Crawling ${host} ...` : `Crawl Finished for ${host}`}
          </span>
        </div>
        <span className="text-xs font-mono text-gray-400">ETA {etaFormatted}</span>
      </div>

      {/* Crawl Stats Counter Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-2 text-xs text-gray-300 bg-gray-800/60 p-2.5 rounded-lg font-mono">
        <div>
          <span className="text-gray-400">Pages:</span>{" "}
          <strong className="text-emerald-400">{stats?.pagesCrawled || 0}</strong>
        </div>
        <div>
          <span className="text-gray-400">Files:</span>{" "}
          <strong className="text-blue-400">{stats?.filesDiscovered || 0}</strong>
        </div>
        <div>
          <span className="text-gray-400">Queued:</span>{" "}
          <strong className="text-amber-400">{stats?.queuedCount || 0}</strong>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          <span className="text-gray-400">Errors:</span>{" "}
          <strong className="text-rose-400">{stats?.errorCount || 0}</strong>
        </div>
        <div className="flex items-center gap-1">
          <Ban className="w-3 h-3 text-orange-400" />
          <span className="text-gray-400">Blocked:</span>{" "}
          <strong className="text-orange-400">{stats?.blockedCount || 0}</strong>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3 my-3">
        <div className="flex-1 bg-gray-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-blue-400 font-bold w-12 text-right">
          {percent}%
        </span>
        {isCrawling && (
          <button
            onClick={onCancel}
            className="px-3 py-1 rounded-md bg-rose-900/40 border border-rose-700/60 hover:bg-rose-800/60 text-rose-200 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800 text-xs">
        <button
          onClick={onRefreshIndex}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
          <span>Refresh index</span>
        </button>

        <button
          onClick={() => onExport("urls")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export URLs</span>
        </button>

        <button
          onClick={() => onExport("sitemap")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
        >
          <FileCode className="w-3.5 h-3.5 text-amber-400" />
          <span>Export sitemap.xml</span>
        </button>
      </div>
    </div>
  );
}
