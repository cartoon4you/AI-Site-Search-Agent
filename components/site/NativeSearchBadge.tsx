"use client";

import React from "react";
import { Search, Code2, Zap } from "lucide-react";

interface NativeSearchBadgeProps {
  provider: string;
  name?: string;
}

export function NativeSearchBadge({ provider, name }: NativeSearchBadgeProps) {
  let label = name || "Native Search";
  let colorClass = "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800";

  if (provider === "native-algolia") {
    label = name || "Native Search — Algolia";
    colorClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800";
  } else if (provider === "native-wp") {
    label = name || "Native Search — WordPress REST";
    colorClass = "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
  } else if (provider === "native-cse") {
    label = name || "Native Search — Google CSE";
    colorClass = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
  } else if (provider === "native-typesense") {
    label = name || "Native Search — Typesense";
    colorClass = "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}
      aria-label={`Native search provider badge: ${label}`}
    >
      <Zap className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}
