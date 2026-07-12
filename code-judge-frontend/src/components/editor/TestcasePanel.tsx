"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#272822]" />,
});

interface TestcasePanelProps {
  input: string;
  onChange: (value: string) => void;
}

function TestcasePanel({ input, onChange }: TestcasePanelProps) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleMount = useCallback((editorInstance: any) => {
    editorRef.current = editorInstance;
  }, []);

  // ResizeObserver to replace automaticLayout polling - layout() only called on actual resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let previousWidth = 0;
    let previousHeight = 0;
    let pendingLayout = false;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect for broader browser support
        const { width, height } = entry.contentRect;
        
        // Only proceed if dimensions actually changed
        if (width === previousWidth && height === previousHeight) return;
        previousWidth = width;
        previousHeight = height;

        if (!pendingLayout) {
          pendingLayout = true;
          // Use RAF to coalesce rapid resize events
          rafRef.current = requestAnimationFrame(() => {
            if (editorRef.current) {
              editorRef.current.layout(undefined, false);
            }
            pendingLayout = false;
            rafRef.current = null;
          });
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        // Dispose the editor model to prevent memory leaks
        const model = editor.getModel();
        if (model) {
          model.dispose();
        }
        editor.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none border-b border-[#272822]">
        <div className="flex h-[32px] min-w-[100px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
          <span>input.in</span>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 bg-[#272822]">
        <MonacoEditor
          language="plaintext"
          value={input}
          options={{
            automaticLayout: false,
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
          onMount={handleMount}
        />
      </div>
    </div>
  );
}

export default memo(TestcasePanel);