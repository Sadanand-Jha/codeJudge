"use client";

import { Code2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { CodeEditor } from "@/components/editor";

export default function EditorPage() {
  return (
    <AppLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Editor Header */}
        <div className="shrink-0 border-b border-white/[0.08] bg-[#0B0C0F]">
          <div className="flex items-center gap-3 px-6 py-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#7C3AED]" />
              <h1 className="text-lg font-bold text-white">Code Editor</h1>
            </div>
            <span className="text-xs text-[#9CA3AF]">Standalone Mode</span>
          </div>
        </div>

        {/* Full-featured editor with input/output panels */}
        <div className="flex-1 min-h-0">
          <CodeEditor />
        </div>
      </div>
    </AppLayout>
  );
}