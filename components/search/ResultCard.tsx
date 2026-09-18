"use client";

import React from "react";
import { SiteResult } from "@/lib/site/types";
import { StrategyBadge } from "@/components/site/StrategyBadge";
import { ResultThumbnail } from "@/components/search/ResultThumbnail";
import { ExternalLink, FileText, Image as ImageIcon, Video, Sparkles, Building2 } from "lucide-react";

interface ResultCardProps {
  item: SiteResult;
  isDebugMode?: boolean;
}

export function ResultCard({ item, isDebugMode }: ResultCardProps) {
  const cardType = item.type || "page";

  return (
    <article
      className="p-3.5 sm:p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all shadow-2xs group flex flex-row items-start gap-3 sm:gap-4"
    >
      {/* Leading Edge Thumbnail Component */}
      <ResultThumbnail
        thumbnailUrl={item.thumbnailUrl}
        url={item.url}
        title={item.title}
        type={cardType}
        provider={item.provider}
        mime={item.mime}
      />

      {/* Main Result Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <StrategyBadge provider={item.provider} />

            {cardType === "file" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-semibold border border-rose-200 dark:border-rose-900">
                <FileText className="w-3 h-3" />
                <span>{item.mime || "FILE"}</span>
              </span>
            )}

            {cardType === "image" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-900">
                <ImageIcon className="w-3 h-3" />
                <span>IMAGE</span>
              </span>
            )}

            {cardType === "video" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[11px] font-semibold border border-purple-200 dark:border-purple-900">
                <Video className="w-3 h-3" />
                <span>VIDEO</span>
              </span>
            )}

            {cardType === "site" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-900">
                <Building2 className="w-3 h-3" />
                <span>SITE</span>
              </span>
            )}

            {item.score > 0 && (
              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
                Relevance {Math.round(item.score * 100)}%
              </span>
            )}
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={`Open ${item.title}`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <h4 className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-400 group-hover:underline line-clamp-1">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h4>

        <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 truncate my-1 dir-ltr">
          {item.url}
        </div>

        {item.snippet && (
          <p
            className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed my-1 line-clamp-2 sm:line-clamp-3 font-sans [&>mark]:bg-amber-200 dark:[&>mark]:bg-amber-800/80 dark:[&>mark]:text-amber-100 [&>mark]:px-0.5 [&>mark]:rounded-xs"
            dangerouslySetInnerHTML={{ __html: item.snippet }}
          />
        )}

        {isDebugMode && item.reasons && item.reasons.length > 0 && (
          <div className="mt-2.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] font-mono text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>AI Rerank Reason:</strong> {item.reasons.join(" | ")}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
