"use client";

import React, { useState, useEffect } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { ModePicker } from "@/components/site/ModePicker";
import { CrawlProgress } from "@/components/site/CrawlProgress";
import { CrawlOptions } from "@/components/site/CrawlOptions";
import { NativeSearchBadge } from "@/components/site/NativeSearchBadge";
import { VerifyOwnershipModal } from "@/components/site/VerifyOwnershipModal";
import { ExportMenu } from "@/components/site/ExportMenu";
import { useSiteAgent } from "@/lib/site/useSiteAgent";
import { Globe, Image as ImageIcon, Video, FileText, Search, Moon, Sun, Languages } from "lucide-react";

export default function SearchEnginePage() {
  const [query, setQuery] = useState("");
  const [siteHost, setSiteHost] = useState("wikipedia.org");
  const [activeTab, setActiveTab] = useState<"web" | "images" | "videos" | "files" | "site">("site");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRtl, setIsRtl] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const {
    state,
    analyze,
    startCrawl,
    search,
    cancel,
    verify,
    exportUrls,
    setStrategy,
  } = useSiteAgent();

  // Trigger site analysis when host changes or initial load
  useEffect(() => {
    if (siteHost) {
      analyze(siteHost);
    }
  }, [siteHost, analyze]);

  // Initial search on mount
  useEffect(() => {
    if (siteHost) {
      search("", "auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    if (activeTab === "site" && siteHost) {
      search(query, state.selectedStrategy);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleLanguage = () => {
    setIsRtl(!isRtl);
  };

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors ${
        isRtl ? "dir-rtl" : "dir-ltr"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top Navigation Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white font-black text-lg tracking-tight">
              SA
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Site Search Agent</h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Multi-Strategy AI Domain Search Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors text-xs font-semibold flex items-center gap-1"
              aria-label="Toggle language direction"
            >
              <Languages className="w-4 h-4" />
              <span>{isRtl ? "English" : "العربية"}</span>
            </button>

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          siteHost={siteHost}
          onSiteHostChange={setSiteHost}
          onSearch={handleSearch}
          isSearching={state.isSearching}
        />

        {/* 5 Search Tabs */}
        <nav className="flex items-center justify-center gap-1 sm:gap-2 my-6 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
          {[
            { id: "site", labelEn: "Site", labelAr: "الموقع", icon: <Globe className="w-4 h-4 text-blue-500" /> },
            { id: "web", labelEn: "Web Pages", labelAr: "صفحات الويب", icon: <Search className="w-4 h-4 text-emerald-500" /> },
            { id: "files", labelEn: "Files & Documents", labelAr: "الملفات والمستندات", icon: <FileText className="w-4 h-4 text-amber-500" /> },
            { id: "images", labelEn: "Images", labelAr: "الصور", icon: <ImageIcon className="w-4 h-4 text-purple-500" /> },
            { id: "videos", labelEn: "Videos", labelAr: "الفيديوهات", icon: <Video className="w-4 h-4 text-rose-500" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {tab.icon}
                <span>{tab.labelEn}</span>
                <span className="text-[10px] opacity-75">({tab.labelAr})</span>
              </button>
            );
          })}
        </nav>

        {/* Active Tab: Site Search Controls */}
        {activeTab === "site" && siteHost && (
          <div className="space-y-4">
            {/* Header info & Export Menu */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Target: <span className="font-mono text-blue-600 dark:text-blue-400">{siteHost}</span>
                </span>

                {state.analysis?.nativeSearch && (
                  <NativeSearchBadge
                    provider={state.analysis.nativeSearch.provider}
                    name={state.analysis.nativeSearch.name}
                  />
                )}

                {state.analysis?.isVerifiedOwner && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-semibold border border-emerald-300 dark:border-emerald-800">
                    ✓ Verified Owner
                  </span>
                )}
              </div>

              <ExportMenu onExport={exportUrls} />
            </div>

            {/* Strategy Mode Picker */}
            <ModePicker
              host={siteHost}
              selected={state.selectedStrategy}
              recommended={state.analysis?.recommendedStrategy || "operator"}
              onChange={(strat) => {
                setStrategy(strat);
                search(query, strat);
              }}
              nativeSearchName={state.analysis?.nativeSearch?.name}
              indexedPageCount={state.analysis?.indexedCount || 0}
            />

            {/* Crawl Options Panel */}
            <CrawlOptions
              isVerifiedOwner={state.analysis?.isVerifiedOwner}
              onStartCrawl={(opts) => startCrawl(opts)}
              onOpenVerifyModal={() => setIsVerifyModalOpen(true)}
            />

            {/* Live Crawl Progress Panel */}
            <CrawlProgress
              host={siteHost}
              isCrawling={state.isCrawling}
              stats={state.crawlStats}
              indexedPages={state.analysis?.indexedCount || 0}
              indexedFiles={0}
              lastUpdatedText={state.analysis?.lastCrawledAt || "recently"}
              onCancel={cancel}
              onRefreshIndex={() => startCrawl()}
              onExport={exportUrls}
            />
          </div>
        )}

        {/* Search Results Display */}
        <SearchResults
          results={state.results}
          isSearching={state.isSearching}
          searchMeta={state.searchMeta}
        />
      </main>

      {/* Verify Ownership Modal */}
      <VerifyOwnershipModal
        host={siteHost}
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onVerify={verify}
      />
    </div>
  );
}
