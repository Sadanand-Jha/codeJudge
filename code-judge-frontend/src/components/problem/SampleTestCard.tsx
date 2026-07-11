"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import type { SampleTest } from "@/types/problem";

interface SampleTestCardProps {
  sample: SampleTest;
  index: number;
}

export default function SampleTestCard({ sample, index }: SampleTestCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-5 py-3">
        <h4 className="text-sm font-medium text-zinc-300">
          Sample {index + 1}
        </h4>
      </div>
      <div className="divide-y divide-zinc-800/80">
        <CodeBlock label="Input" code={sample.input} />
        <CodeBlock label="Output" code={sample.output} />
      </div>
      {sample.explanation && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Explanation
          </p>
          <p className="text-sm leading-relaxed text-zinc-300">
            {sample.explanation}
          </p>
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
    <div className="px-5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-300"
          aria-label={copied ? "Copied" : "Copy to clipboard"}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed text-zinc-200">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}