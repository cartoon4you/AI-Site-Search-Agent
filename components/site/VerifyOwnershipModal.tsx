"use client";

import React, { useState } from "react";
import { VerificationResult } from "@/lib/site/types";
import { ShieldCheck, X, Copy, Check, AlertCircle } from "lucide-react";

interface VerifyOwnershipModalProps {
  host: string;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (method: "dns" | "meta") => Promise<VerificationResult>;
}

export function VerifyOwnershipModal({
  host,
  isOpen,
  onClose,
  onVerify,
}: VerifyOwnershipModalProps) {
  const [method, setMethod] = useState<"dns" | "meta">("meta");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  if (!isOpen) return null;

  const handleFetchToken = async () => {
    setIsVerifying(true);
    setResult(null);
    try {
      const res = await onVerify(method);
      setResult(res);
      if (res.token) setToken(res.token);
    } catch {
      setResult({
        verified: false,
        instructions: "Error initiating domain verification process.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatedMetaTag = `<meta name="site-agent-verify" content="${token || "site-agent-verify-token"}">`;
  const generatedTxtRecord = token || "site-agent-verify-token";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative transition-all">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close verification modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Verify Domain Ownership
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {host}
            </p>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 mb-4 dir-auto leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">تنبيه قانوني / Legal Notice:</p>
              <p className="dir-rtl text-right">
                أنت مسؤول عن الامتثال لشروط استخدام الموقع الذي تزحفه. الأدوات لا تتجاوز المصادقة ولا تجلب صفحات خاصة.
              </p>
              <p className="mt-1 dir-ltr text-left opacity-90">
                You are responsible for adhering to the terms of use of the website you crawl. Tools do not bypass authentication or retrieve private pages.
              </p>
            </div>
          </div>
        </div>

        {/* Method selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Verification Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("meta")}
              className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                method === "meta"
                  ? "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              HTML Meta Tag
            </button>
            <button
              type="button"
              onClick={() => setMethod("dns")}
              className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                method === "dns"
                  ? "bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              DNS TXT Record
            </button>
          </div>
        </div>

        {/* Step snippet */}
        <div className="mb-4 p-3 bg-gray-900 rounded-xl text-gray-100 font-mono text-xs">
          <div className="flex items-center justify-between mb-1.5 text-gray-400 text-[11px]">
            <span>{method === "meta" ? "Add to <head> HTML:" : "DNS TXT Record:"}</span>
            <button
              onClick={() => copyToClipboard(method === "meta" ? generatedMetaTag : generatedTxtRecord)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <code className="break-all text-emerald-400 selection:bg-blue-800">
            {method === "meta" ? generatedMetaTag : generatedTxtRecord}
          </code>
        </div>

        {result && (
          <div
            className={`p-3 rounded-xl text-xs font-medium mb-4 ${
              result.verified
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {result.instructions}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFetchToken}
            disabled={isVerifying}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            {isVerifying ? "Verifying..." : "Verify Ownership"}
          </button>
        </div>
      </div>
    </div>
  );
}
