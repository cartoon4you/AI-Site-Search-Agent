"use client";

import React, { useState } from "react";
import { ResultProvider } from "@/lib/site/types";
import {
  FileText,
  Globe,
  Image as ImageIcon,
  Video,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  Cpu,
  Database,
  Zap,
  Search,
  Building2,
} from "lucide-react";

interface ResultThumbnailProps {
  thumbnailUrl?: string;
  url: string;
  title: string;
  type?: "page" | "file" | "image" | "video" | "site";
  provider: ResultProvider;
  mime?: string;
  className?: string;
}

export function ResultThumbnail({
  thumbnailUrl,
  url,
  title,
  type = "page",
  provider,
  mime,
  className = "",
}: ResultThumbnailProps) {
  // Extract domain for Google Favicon fallback
  let domain = "";
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = "";
  }

  const faviconUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : "";

  // Track failed image loads
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);

  // Derive active load state dynamically
  const loadState: "thumbnail" | "favicon" | "icon" =
    thumbnailUrl && !thumbnailFailed
      ? "thumbnail"
      : faviconUrl && !faviconFailed
      ? "favicon"
      : "icon";

  const handleImageError = () => {
    if (loadState === "thumbnail") {
      setThumbnailFailed(true);
    } else if (loadState === "favicon") {
      setFaviconFailed(true);
    }
  };

  // Type-specific icon fallback
  const renderTypeIcon = () => {
    if (type === "image") {
      return <ImageIcon className="w-7 h-7 sm:w-9 sm:h-9 text-blue-500/80 dark:text-blue-400/80" />;
    }
    if (type === "video") {
      return <Video className="w-7 h-7 sm:w-9 sm:h-9 text-purple-500/80 dark:text-purple-400/80" />;
    }
    if (type === "file") {
      const mimeLower = (mime || "").toLowerCase();
      if (mimeLower.includes("pdf")) return <FileText className="w-7 h-7 sm:w-9 sm:h-9 text-rose-500/80 dark:text-rose-400/80" />;
      if (mimeLower.includes("zip") || mimeLower.includes("tar") || mimeLower.includes("rar")) return <FileArchive className="w-7 h-7 sm:w-9 sm:h-9 text-amber-500/80 dark:text-amber-400/80" />;
      if (mimeLower.includes("sheet") || mimeLower.includes("excel") || mimeLower.includes("csv")) return <FileSpreadsheet className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-500/80 dark:text-emerald-400/80" />;
      return <FileCode className="w-7 h-7 sm:w-9 sm:h-9 text-gray-500/80 dark:text-gray-400/80" />;
    }
    if (type === "site") {
      return <Building2 className="w-7 h-7 sm:w-9 sm:h-9 text-indigo-500/80 dark:text-indigo-400/80" />;
    }
    return <Globe className="w-7 h-7 sm:w-9 sm:h-9 text-blue-500/80 dark:text-blue-400/80" />;
  };

  // Provider overlay badge
  const renderProviderBadge = () => {
    let icon = <Globe className="w-2.5 h-2.5 text-white" />;
    let bgClass = "bg-blue-600 dark:bg-blue-500";
    let label: string = provider;

    switch (provider) {
      case "google":
        label = "Google";
        icon = <Globe className="w-2.5 h-2.5 text-white" />;
        bgClass = "bg-blue-600 dark:bg-blue-500";
        break;
      case "yandex":
        label = "Yandex";
        icon = <Globe className="w-2.5 h-2.5 text-white" />;
        bgClass = "bg-amber-600 dark:bg-amber-500";
        break;
      case "crawl":
      case "sitemap":
        label = "Live Crawl";
        icon = <Cpu className="w-2.5 h-2.5 text-white" />;
        bgClass = "bg-emerald-600 dark:bg-emerald-500";
        break;
      case "local-index":
        label = "Local Index";
        icon = <Database className="w-2.5 h-2.5 text-white" />;
        bgClass = "bg-indigo-600 dark:bg-indigo-500";
        break;
      case "native-algolia":
        label = "Algolia";
        icon = <Zap className="w-2.5 h-2.5 text-white" />;
        bgClass = "bg-purple-600 dark:bg-purple-500";
        break;
      case "native-wp":
        label = "WordPress";
        icon = <Search className="w-2.5 h-2.5 text-white" />;
        bgClass = "bg-sky-600 dark:bg-sky-500";
        break;
      default:
        if (provider.startsWith("native")) {
          label = "Native Search";
          icon = <Zap className="w-2.5 h-2.5 text-white" />;
          bgClass = "bg-purple-600 dark:bg-purple-500";
        }
        break;
    }

    return (
      <div
        className={`absolute bottom-1 end-1 z-10 flex items-center justify-center p-1 rounded-full shadow-xs border border-white dark:border-gray-900 ${bgClass}`}
        title={`Provider: ${label}`}
        aria-label={`Provider: ${label}`}
      >
        {icon}
      </div>
    );
  };

  const altText = title ? `Thumbnail for ${title}` : "Result thumbnail";

  return (
    <div
      className={`relative shrink-0 w-[72px] h-[72px] sm:w-24 sm:h-24 rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-800 flex items-center justify-center select-none ${className}`}
    >
      {loadState === "thumbnail" && thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={altText}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
          className="w-full h-full object-cover rounded-lg sm:rounded-xl transition-opacity duration-200"
        />
      ) : loadState === "favicon" && faviconUrl ? (
        <div className="w-full h-full p-3 sm:p-4 flex items-center justify-center bg-gray-50/80 dark:bg-gray-800/80">
          <img
            src={faviconUrl}
            alt={altText}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-md"
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50/80 dark:bg-gray-800/60 p-2">
          {renderTypeIcon()}
        </div>
      )}

      {/* Provider badge overlay on the image */}
      {renderProviderBadge()}
    </div>
  );
}
