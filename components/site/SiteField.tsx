"use client";

import React, { useState, useEffect } from "react";
import { Globe, X } from "lucide-react";

interface SiteFieldProps {
  value: string;
  onChange: (host: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export function SiteField({ value, onChange, onClear, placeholder = "site.com" }: SiteFieldProps) {
  const [inputVal, setInputVal] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setInputVal(value);
  }

  const handleBlur = () => {
    let clean = inputVal.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    setInputVal(clean);
    if (clean !== value) {
      onChange(clean);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  const handleClear = () => {
    setInputVal("");
    onChange("");
    if (onClear) onClear();
  };

  return (
    <div className="relative flex items-center bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition-colors focus-within:border-blue-500 dark:focus-within:border-blue-400">
      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0 me-2" aria-hidden="true" />
      <span className="text-xs font-semibold text-gray-400 me-1 hidden sm:inline select-none">site:</span>
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="bg-transparent border-none outline-none focus:ring-0 text-xs sm:text-sm text-gray-900 dark:text-gray-100 w-28 sm:w-36 dir-ltr placeholder:text-gray-400"
        aria-label="Target domain site search"
      />
      {inputVal && (
        <button
          type="button"
          onClick={handleClear}
          className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Clear site domain filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
