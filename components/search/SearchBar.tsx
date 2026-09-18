"use client";

import React from "react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { SiteField } from "@/components/site/SiteField";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  siteHost: string;
  onSiteHostChange: (host: string) => void;
  onSearch: () => void;
  isSearching?: boolean;
}

export function SearchBar({
  query,
  onQueryChange,
  siteHost,
  onSiteHostChange,
  onSearch,
  isSearching = false,
}: SearchBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 shadow-lg transition-all focus-within:ring-2 focus-within:ring-blue-500/40"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Site Host Field Badge/Input */}
        <div className="shrink-0">
          <SiteField value={siteHost} onChange={onSiteHostChange} />
        </div>

        {/* Main Query Input */}
        <div className="flex-1 flex items-center px-2">
          <Search className="w-5 h-5 text-gray-400 me-2 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={
              siteHost
                ? `Search inside ${siteHost} (or press Enter to view all indexed pages)...`
                : "Search across web, images, files, or enter site:domain..."
            }
            className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 py-1"
            aria-label="Main Search Input"
          />
        </div>

        {/* Submit Search Button */}
        <button
          type="submit"
          disabled={isSearching}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 shrink-0"
        >
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Search</span>
          <span className="text-xs opacity-75 font-normal ms-1">(بحث)</span>
        </button>
      </div>
    </form>
  );
}
