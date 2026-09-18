"use client";

import React, { useState } from "react";
import { Download, FileText, FileCode, Table } from "lucide-react";

interface ExportMenuProps {
  onExport: (format: "urls" | "csv" | "sitemap") => void;
}

export function ExportMenu({ onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download className="w-3.5 h-3.5 text-blue-500" />
        <span>Export Options</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-50 py-1"
          role="menu"
        >
          <button
            onClick={() => {
              onExport("urls");
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            role="menuitem"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Export Discovered URLs (.txt)</span>
          </button>

          <button
            onClick={() => {
              onExport("csv");
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            role="menuitem"
          >
            <Table className="w-4 h-4 text-blue-500" />
            <span>Export Crawl Table (.csv)</span>
          </button>

          <button
            onClick={() => {
              onExport("sitemap");
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            role="menuitem"
          >
            <FileCode className="w-4 h-4 text-amber-500" />
            <span>Export Sitemap (.xml)</span>
          </button>
        </div>
      )}
    </div>
  );
}
