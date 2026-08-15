"use client";

import { Code2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import NavbarRightActions from "@/components/layout/NavbarRightActions";
import { CodeEditor } from "@/components/editor";

export default function EditorPage() {
  return (
    <AppLayout>
      <div className="h-screen flex flex-col">
        {/* Editor Header */}
        <div className="shrink-0 border-b border-border-hover bg-[#0B0C0F]">
          <div className="flex w-full min-w-0 items-center gap-3 px-6 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Code2 className="w-5 h-5 shrink-0 text-[#7C3AED]" />
              <h1 className="truncate text-lg font-bold text-white">Code Editor</h1>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">Standalone Mode</span>
            <div className="min-w-0 flex-1" />
            <div className="flex shrink-0 items-center">
              <NavbarRightActions />
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