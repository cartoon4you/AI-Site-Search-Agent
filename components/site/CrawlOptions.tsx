"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck } from "lucide-react";

interface CrawlOptionsProps {
  isVerifiedOwner?: boolean;
  onStartCrawl: (options: {
    maxPages: number;
    maxDepth: number;
    forceUnrestrictedRobots?: boolean;
  }) => void;
  onOpenVerifyModal: () => void;
}

export function CrawlOptions({
  isVerifiedOwner = false,
  onStartCrawl,
  onOpenVerifyModal,
}: CrawlOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [maxPages, setMaxPages] = useState(500);
  const [maxDepth, setMaxDepth] = useState(4);
  const [forceUnrestricted, setForceUnrestricted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartCrawl({
      maxPages,
      maxDepth,
      forceUnrestrictedRobots: isVerifiedOwner ? forceUnrestricted : false,
    });
    setIsOpen(false);
  };

  return (
    <div className="my-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{isOpen ? "Hide Crawl Budget Options" : "Configure Crawl Budget & Depth"}</span>
        </button>

        {!isVerifiedOwner && (
          <button
            type="button"
            onClick={onOpenVerifyModal}
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Domain Ownership</span>
          </button>
        )}
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Pages Budget (Max 2000)
              </label>
              <input
                type="number"
                min="10"
                max="2000"
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                Crawl Depth Limit (1-10)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxDepth}
                onChange={(e) => setMaxDepth(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {isVerifiedOwner && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="forceUnrestricted"
                checked={forceUnrestricted}
                onChange={(e) => setForceUnrestricted(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="forceUnrestricted" className="text-gray-700 dark:text-gray-300 font-medium">
                Ignore robots.txt Disallow rules (Domain Ownership Verified)
              </label>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Start Live Crawl
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
