"use client";

import type { DragState } from "@/types/editor";
import TestcasePanel from "./TestcasePanel";
import OutputPanel from "./OutputPanel";

interface ConsolePanelProps {
  input: string;
  output: string;
  onInputChange: (value: string) => void;
  inputHeight: number;
  rightPanelWidth: number;
  dragStateRef: React.MutableRefObject<DragState>;
}

export default function ConsolePanel({
  input,
  output,
  onInputChange,
  inputHeight,
  rightPanelWidth,
  dragStateRef,
}: ConsolePanelProps) {
  return (
    <div className="flex min-h-0 flex-col bg-[#1e1e1e]" style={{ width: rightPanelWidth }}>
      {/* Top Right: Input */}
      <div className="flex flex-col" style={{ height: inputHeight }}>
        <TestcasePanel input={input} onChange={onInputChange} />
      </div>

      {/* Resizer Horizontal */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          dragStateRef.current = {
            kind: "input-output",
            startY: e.clientY,
            startInputHeight: inputHeight,
          };
          document.body.style.cursor = "row-resize";
          document.body.style.userSelect = "none";
        }}
        className="h-1.5 z-10 shrink-0 cursor-row-resize bg-[#1e1e1e] border-y border-[#111] hover:bg-[#49483E] transition-colors"
      />

      {/* Bottom Right: Output */}
      <OutputPanel output={output} />
    </div>
  );
}