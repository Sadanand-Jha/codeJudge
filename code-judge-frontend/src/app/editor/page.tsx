"use client";

import { Code2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { CodeEditor } from "@/components/editor";

export default function EditorPage() {
  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        {/* Editor Header */}
        <div className="shrink-0 border-b border-border-hover bg-[#0B0C0F]">
          <div className="flex items-center gap-3 px-6 py-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#7C3AED]" />
              <h1 className="text-lg font-bold text-white">Code Editor</h1>
            </div>
            <span className="text-xs text-muted-foreground">Standalone Mode</span>
            <div className="ml-auto flex items-center">
              <ThemeToggle />
            </div>
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