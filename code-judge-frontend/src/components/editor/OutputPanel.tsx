"use client";

import { memo } from "react";

interface OutputPanelProps {
  output: string;
}

function OutputPanel({ output }: OutputPanelProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none border-b border-[#272822]">
        <div className="flex h-[32px] min-w-[100px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
          <span>output</span>
        </div>
      </div>
      <div className="flex-1 bg-[#272822] p-3 text-[#F8F8F2] font-mono text-sm overflow-auto whitespace-pre-wrap">
        {output || "No output yet. Click Run to execute your code."}
      </div>
    </div>
  );
}

export default memo(OutputPanel);
