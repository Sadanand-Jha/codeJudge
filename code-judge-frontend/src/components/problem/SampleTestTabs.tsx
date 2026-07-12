"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import type { SampleTest } from "@/types/problem";

interface SampleTestTabsProps {
  samples: SampleTest[];
}

export default function SampleTestTabs({ samples }: SampleTestTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (samples.length === 0) return null;

  return (
    <div className="card-premium">
      {/* Tab Navigation */}
      <div className="flex border-b border-[#E6E7EB]">
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
      <div className="p-10">
        <SampleTestContent sample={samples[activeTab]} index={activeTab} />
      </div>
    </div>
  );
}

interface SampleTestContentProps {
  sample: SampleTest;
  index: number;
}

function SampleTestContent({ sample, index }: SampleTestContentProps) {
  return (
    <div className="space-y-6">
      <CodeBlock label="Input" code={sample.input} />
      <CodeBlock label="Output" code={sample.output} />
      {sample.explanation && (
        <div>
          <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#6B7280]">
            Explanation
          </h4>
          <p className="text-base leading-relaxed text-[#6B7280]">{sample.explanation}</p>
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
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium uppercase tracking-wider text-[#6B7280]">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E6E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-all hover:border-[#D1D5E0] hover:text-[#111827]"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#16A34A]" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-[#333] bg-[#1A1A1A] p-6">
        <code className="font-mono text-sm text-[#E4E4E7]">{code}</code>
      </pre>
    </div>
  );
}