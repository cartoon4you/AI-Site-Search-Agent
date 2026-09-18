"use client";

import React from "react";
import { ResultProvider } from "@/lib/site/types";
import { Globe, Database, Cpu, Zap, Search } from "lucide-react";

interface StrategyBadgeProps {
  provider: ResultProvider;
}

export function StrategyBadge({ provider }: StrategyBadgeProps) {
  let label: string = provider;
  let icon = <Globe className="w-3 h-3" />;
  let badgeStyle = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

  switch (provider) {
    case "google":
      label = "Google";
      icon = <Globe className="w-3 h-3 text-blue-500" />;
      badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      break;
    case "yandex":
      label = "Yandex";
      icon = <Globe className="w-3 h-3 text-amber-500" />;
      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      break;
    case "crawl":
    case "sitemap":
      label = "Live Crawl";
      icon = <Cpu className="w-3 h-3 text-emerald-500" />;
      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      break;
    case "local-index":
      label = "Local Index";
      icon = <Database className="w-3 h-3 text-indigo-500" />;
      badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900";
      break;
    case "native-algolia":
      label = "Algolia Native";
      icon = <Zap className="w-3 h-3 text-purple-500" />;
      badgeStyle = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
      break;
    case "native-wp":
      label = "WordPress REST";
      icon = <Search className="w-3 h-3 text-sky-500" />;
      badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900";
      break;
    default:
      if (provider.startsWith("native")) {
        label = "Native Search";
        icon = <Zap className="w-3 h-3 text-purple-500" />;
        badgeStyle = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
      }
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeStyle}`}
      aria-label={`Result source provider: ${label}`}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}
