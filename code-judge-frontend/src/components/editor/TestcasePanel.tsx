"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#272822]" />,
});

interface TestcasePanelProps {
  input: string;
  onChange: (value: string) => void;
}

export default function TestcasePanel({ input, onChange }: TestcasePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none border-b border-[#272822]">
        <div className="flex h-[32px] min-w-[100px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
          <span>input.in</span>
        </div>
      </div>
      <div className="flex-1 bg-[#272822]">
        <MonacoEditor
          language="plaintext"
          value={input}
          options={{
            automaticLayout: true,
            fontFamily: '"Consolas", "Courier New", monospace',
            fontSize: 14,
            lineHeight: 21,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            renderLineHighlight: "all",
            minimap: { enabled: false },
          }}
          onChange={(v) => onChange(v ?? "")}
        />
      </div>
    </div>
  );
}