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
  // Each .test-example-line contains one line; collect them all
  const lines = doc.querySelectorAll(".test-example-line");
  if (lines.length > 0) {
    return Array.from(lines)
      .map((el) => el.textContent || "")
      .join("\n");
  }
  // Fallback: just get the text content
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
            className={`relative px-6 py-4 text-sm font-medium transition-all ${
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
    <div className="space-y-6">
      <CodeBlock label="Input" code={sample.input} />
      <CodeBlock label="Output" code={sample.output} />
      {sample.explanation && (
        <div>
          <h4 className="mb-2 text-base font-semibold text-[#333]">Explanation</h4>
          <p className="text-sm leading-relaxed text-[#555]">{sample.explanation}</p>
        </div>
      )}
    </div>
  );
}

interface CodeBlockProps {
  label: string;
  code: string;
}

function CodeBlock({ label, code }: CodeBlockProps) {
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

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#333]">{label}:</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded border border-[#ccc] px-2 py-0.5 text-xs text-[#555] hover:bg-[#f0f0f0] transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#16A34A]" />
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
      <pre className="overflow-x-auto border border-[#ddd] bg-[#f8f8f8] p-4 font-mono text-sm text-[#222]">
        <code>{code}</code>
      </pre>
    </div>
  );
}