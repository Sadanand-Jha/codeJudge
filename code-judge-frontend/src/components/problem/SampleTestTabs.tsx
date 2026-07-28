"use client";

import { useState, useCallback, useMemo } from "react";
import { Check, Copy } from "lucide-react";
import type { SampleTest } from "@/types/problem";

interface SampleTestTabsProps {
  samples: SampleTest[];
}

/** Strips HTML tags, extracts just the text content line-by-line */
function stripHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const lines = doc.querySelectorAll(".test-example-line");
  if (lines.length > 0) {
    return Array.from(lines)
      .map((el) => el.textContent || "")
      .join("\n");
  }
  return doc.body.textContent || html;
}

export default function SampleTestTabs({ samples }: SampleTestTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (samples.length === 0) return null;

  const cleaned = useMemo(
    () =>
      samples.map((s) => ({
        input: stripHtml(s.input),
        output: stripHtml(s.output),
        explanation: s.explanation,
      })),
    [samples],
  );

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex border-b border-[#ccc]">
        {samples.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`relative px-6 py-3 text-sm font-medium transition-all ${
              activeTab === index
                ? "text-[#2563EB]"
                : "text-[#6B7280] hover:text-[#111827]"
            }`}
          >
            Sample {index + 1}
            {activeTab === index && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        <SampleTestContent sample={cleaned[activeTab]} />
      </div>
    </div>
  );
}

interface CleanSample {
  input: string;
  output: string;
  explanation?: string | null;
}

interface SampleTestContentProps {
  sample: CleanSample;
}

function SampleTestContent({ sample }: SampleTestContentProps) {
  return (
    <div className="space-y-5">
      <CFExampleBox label="Input" code={sample.input} />
      <CFExampleBox label="Output" code={sample.output} />
      {sample.explanation && (
        <div>
          <h4 className="mb-2 text-base font-semibold text-[#333]">Note</h4>
          <p className="text-sm leading-relaxed text-[#555]">{sample.explanation}</p>
        </div>
      )}
    </div>
  );
}

interface CFExampleBoxProps {
  label: string;
  code: string;
}

/**
 * Codeforces-style I/O example box:
 * - Thin light gray border around the whole container
 * - Header bar: light gray background, "input"/"output" on left, "Copy" on right
 * - Content area: preformatted text with zebra-striping (alternating white/light gray lines)
 */
function CFExampleBox({ label, code }: CFExampleBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [code]);

  const lines = code.split("\n");

  return (
    <div className="border border-[#E6E7EB] rounded-sm overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-[#E6E7EB] px-3 py-1.5">
        <span className="text-xs font-semibold text-[#333] uppercase">{label}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Content Area with Zebra Striping */}
      <div className="font-mono text-sm leading-6">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`px-3 py-0 ${
              idx % 2 === 0 ? "bg-white" : "bg-[#F8F9FA]"
            }`}
          >
            {line || "\u00A0"}
          </div>
        ))}
      </div>
    </div>
  );
}