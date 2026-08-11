"use client";

import { memo } from "react";

interface TestcasePanelProps {
  input: string;
  onChange: (value: string) => void;
}

/**
 * Custom input panel. Uses a lightweight monospace <textarea> instead of a
 * second Monaco instance. This guarantees the user can always click in and
 * type — a second Monaco editor can render with a collapsed editable surface
 * (and shares focus semantics with the main code editor), which made the
 * input section unusable.
 */
function TestcasePanel({ input, onChange }: TestcasePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none border-b border-[#272822]">
        <div className="flex h-[32px] min-w-[100px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
          <span>input.in</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 bg-[#272822]">
        <textarea
          value={input}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Enter input for your program here..."
          className="h-full w-full resize-none bg-[#272822] p-3 font-mono text-[14px] leading-[21px] text-[#F8F8F2] placeholder-[#75715E] outline-none"
        />
      </div>
    </div>
  );
}

export default memo(TestcasePanel);
