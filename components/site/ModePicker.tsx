"use client";

import React from "react";
import { SearchStrategy } from "@/lib/site/types";
import { Sparkles, Globe, Cpu, Search, Database } from "lucide-react";

interface ModePickerProps {
  host: string;
  selected: SearchStrategy;
  recommended: SearchStrategy;
  onChange: (strategy: SearchStrategy) => void;
  nativeSearchName?: string;
  indexedPageCount?: number;
}

export function ModePicker({
  host,
  selected,
  recommended,
  onChange,
  nativeSearchName,
  indexedPageCount = 0,
}: ModePickerProps) {
  if (!host) return null;

  const strategies: { id: SearchStrategy; labelEn: string; labelAr: string; icon: React.ReactNode }[] = [
    { id: "auto", labelEn: "Auto", labelAr: "تلقائي", icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: "operator", labelEn: "Site operator (Google/Yandex)", labelAr: "مشغل الموقع (جوجل/ياندكس)", icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: "crawl", labelEn: "Live crawl", labelAr: "زحف مباشر", icon: <Cpu className="w-4 h-4 text-emerald-500" /> },
    { id: "native", labelEn: "Native search", labelAr: "بحث محلي بالموقع", icon: <Search className="w-4 h-4 text-purple-500" /> },
    { id: "index", labelEn: "Deep index", labelAr: "فهرس محلي عميق", icon: <Database className="w-4 h-4 text-indigo-500" /> },
  ];

  const activeAutoPickLabel =
    recommended === "operator"
      ? "Site operator (Google/Yandex)"
      : recommended === "native"
      ? `Native search (${nativeSearchName || "Detected"})`
      : recommended === "index"
      ? `Deep index (${indexedPageCount} pages cached)`
      : "Live crawl";

  const autoPickReason =
    recommended === "operator"
      ? "because the site is large and already well-indexed. Switch to 'Live crawl' to force a fresh enumeration of all pages and files."
      : recommended === "native"
      ? `because native search integration (${nativeSearchName || "API"}) was detected and provides instant authoritative results.`
      : recommended === "index"
      ? `because ${indexedPageCount} pages are already stored in local SQLite index.`
      : "because this domain is well-suited for a local Screaming Frog-style sitemap crawl.";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 my-3 shadow-xs transition-colors">
      <div className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center justify-between">
        <span>
          Search mode for <strong className="text-blue-600 dark:text-blue-400 font-mono">{host}</strong>:
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
          طريقة البحث لـ {host}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Site Search Mode Picker">
        {strategies.map((strat) => {
          const isChecked = selected === strat.id;
          return (
            <label
              key={strat.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                isChecked
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-2xs"
                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <input
                type="radio"
                name="siteSearchStrategy"
                value={strat.id}
                checked={isChecked}
                onChange={() => onChange(strat.id)}
                className="sr-only"
                aria-label={`${strat.labelEn} - ${strat.labelAr}`}
              />
              {strat.icon}
              <span>{strat.labelEn}</span>
              <span className="text-[10px] opacity-65 ms-0.5">({strat.labelAr})</span>
            </label>
          );
        })}
      </div>

      {selected === "auto" && (
        <div className="mt-3.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              ⓘ Auto picked: &quot;{activeAutoPickLabel}&quot;
            </p>
            <p className="text-blue-800 dark:text-blue-300 mt-0.5">
              {autoPickReason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
