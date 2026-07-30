"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Bookmark,
  Share2,
  Heart,
  Play,
  Check,
  Maximize2,
  Type,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Problem, SampleTest } from "@/types/problem";
import MathRenderer from "@/components/problem/MathRenderer";
import MonacoEditorWrapper from "@/components/editor/MonacoEditor";
import { Group, Panel, Separator } from "react-resizable-panels";

type TabType =
  | "description"
  | "examples"
  | "constraints"
  | "hints"
  | "editorial"
  | "solutions"
  | "discussion"
  | "submissions"
  | "ai-analysis";

const STORAGE_KEY_LEFT = "split-pane-left-width";
const STORAGE_KEY_CONSOLE = "split-pane-console-height";

export default function ProblemClient({ problem }: { problem: Problem }) {
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [code, setCode] = useState(`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}`);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<any>(null);
  const leftGroupId = useId();
  const bottomGroupId = useId();

  const timeLimitStr = problem.time_limit_ms >= 1000
    ? `${(problem.time_limit_ms / 1000).toFixed(1)}s`
    : `${problem.time_limit_ms}ms`;
  const memoryLimitStr = problem.memory_limit_mb >= 1024
    ? `${(problem.memory_limit_mb / 1024).toFixed(1)}GB`
    : `${problem.memory_limit_mb}MB`;

  const displayTitle =
    problem.contest_id && problem.problem_index
      ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
      : problem.title;

  const tabs: { id: TabType; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "examples", label: "Examples" },
    { id: "constraints", label: "Constraints" },
    { id: "hints", label: "Hints" },
    { id: "editorial", label: "Editorial" },
    { id: "solutions", label: "Solutions" },
    { id: "discussion", label: "Discussion" },
    { id: "submissions", label: "Submissions" },
    { id: "ai-analysis", label: "AI Analysis" },
  ];

  const difficultyColor =
    problem.rating && problem.rating >= 2000
      ? "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10"
      : problem.rating && problem.rating >= 1600
        ? "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10"
        : "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10";

  const layoutEditor = useCallback(() => {
    if (monacoEditorRef.current && typeof monacoEditorRef.current.layout === "function") {
      monacoEditorRef.current.layout();
    }
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const loadLayout = useCallback(
    (key: string, fallback: number) => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = parseFloat(saved);
          if (!Number.isNaN(parsed) && parsed > 0) return parsed;
        }
      } catch {
        // ignore
      }
      return fallback;
    },
    []
  );

  const saveLayout = useCallback((key: string, value: number) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // ignore
    }
  }, []);

  const initialLeftWidth = loadLayout(STORAGE_KEY_LEFT, 48);
  const initialConsoleHeight = loadLayout(STORAGE_KEY_CONSOLE, 22);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      layoutEditor();
    });
    return () => cancelAnimationFrame(raf);
  }, [layoutEditor]);

  return (
    <div className="h-screen flex flex-col bg-[#09090B] overflow-hidden">
      {/* Compact Problem Header */}
      <div className="shrink-0 border-b border-white/[0.08] bg-[#09090B]">
        <div className="px-4 py-2">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* LEFT: Title + Metadata */}
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight mb-1">
                {displayTitle}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${difficultyColor}`}>
                  {problem.rating ? `Rating ${problem.rating}` : "Unrated"}
                </span>
                <span className="text-[10px] text-[#9CA3AF] bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.06]">
                  {problem.contest_id || "Practice"}
                </span>
                {(problem as any).acceptance !== undefined && (
                  <span className="text-[10px] text-[#9CA3AF]">Acceptance: {(problem as any).acceptance}%</span>
                )}
                {(problem as any).solved_count !== undefined && (
                  <span className="text-[10px] text-[#9CA3AF]">Solved: {(problem as any).solved_count}</span>
                )}
                <span className="text-white/20">•</span>
                <span className="text-[10px] text-[#9CA3AF]">⏱ {timeLimitStr}</span>
                <span className="text-[10px] text-[#9CA3AF]">💾 {memoryLimitStr}</span>
              </div>
            </div>

            {/* CENTER: Primary Actions */}
            <div className="flex items-center justify-center gap-2">
              <button className="h-[38px] px-3 rounded-[10px] border border-white/10 bg-white/5 text-white text-xs font-semibold hover:bg-white/10 transition-all flex items-center justify-center">
                <Play className="w-4 h-4" fill="white" />
              </button>
              <button className="h-[38px] px-4 rounded-[10px] border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold hover:bg-[#22C55E]/20 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Submit
              </button>
            </div>

            {/* RIGHT: Utilities */}
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="p-2 rounded-md border border-white/[0.08] bg-[#111827] hover:border-white/[0.12] transition-all"
              >
                <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-[#7C3AED] text-[#7C3AED]" : "text-[#9CA3AF]"}`} />
              </button>
              <button className="p-2 rounded-md border border-white/[0.08] bg-[#111827] hover:border-white/[0.12] transition-all">
                <Share2 className="w-4 h-4 text-[#9CA3AF]" />
              </button>
              <button
                onClick={() => setLiked(!liked)}
                className="p-2 rounded-md border border-white/[0.08] bg-[#111827] hover:border-white/[0.12] transition-all"
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-[#EF4444] text-[#EF4444]" : "text-[#9CA3AF]"}`} />
              </button>
              <button className="p-2 rounded-md border border-white/[0.08] bg-[#111827] hover:border-white/[0.12] transition-all">
                <Maximize2 className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="shrink-0 border-b border-white/[0.08] bg-[#09090B] z-20">
        <div className="flex items-center gap-0.5 px-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative h-[36px] px-3 text-xs font-medium text-[#9CA3AF] hover:text-white transition-all whitespace-nowrap"
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1 right-1 h-[2px] bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded-full shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 min-h-0">
        <Group id={leftGroupId} orientation="horizontal" onLayoutChange={(layout) => saveLayout(STORAGE_KEY_LEFT, layout.problem)}>
          <Panel id="problem" defaultSize={initialLeftWidth} minSize={30}>
            <div className="h-full overflow-y-auto overflow-x-hidden border-r border-white/[0.08] bg-[#09090B]">
              <div className="px-4 py-4">
                <div className="max-w-[760px]">
                    {activeTab === "description" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        <ProblemSection title="Description">
                          <MathRenderer html={problem.statement} />
                        </ProblemSection>
                      </motion.div>
                    )}

                  {activeTab === "examples" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                      <ExamplesPanel samples={problem.sample_tests} />
                    </motion.div>
                  )}

                  {activeTab === "constraints" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <ProblemSection title="Input">
                        <MathRenderer html={problem.input_specification} />
                      </ProblemSection>

                      <ProblemSection title="Output">
                        <MathRenderer html={problem.output_specification} />
                      </ProblemSection>

                      {problem.constraints && (
                        <ProblemSection title="Constraints">
                          <MathRenderer html={problem.constraints} />
                        </ProblemSection>
                      )}
                    </motion.div>
                  )}

                  {activeTab !== "description" && activeTab !== "examples" && activeTab !== "constraints" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center justify-center h-64 text-center"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#111827] border border-white/[0.08] flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-[#7C3AED]" />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace("-", " ")}
                      </h3>
                      <p className="text-xs text-[#9CA3AF] max-w-sm">
                        This section is coming soon with detailed explanations, solutions, and community discussions.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Separator className="w-[6px] cursor-col-resize bg-transparent hover:bg-[#7C3AED] transition-colors relative group">
            <div className="absolute inset-0 group-hover:shadow-[0_0_12px_rgba(124,58,237,0.6)] transition-shadow" />
          </Separator>

          {/* Editor Panel */}
          <Panel id="editor" defaultSize={52} minSize={35}>
            <Group id={bottomGroupId} orientation="vertical" onLayoutChanged={(layout) => saveLayout(STORAGE_KEY_CONSOLE, layout.console)}>
              <Panel id="editor" defaultSize={100 - initialConsoleHeight} minSize={50}>
                <div className="h-full flex flex-col bg-[#0D1117]">
                  {/* Editor Toolbar */}
                  <div className="shrink-0 border-b border-white/[0.08] bg-[#0D1117] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="h-7 pl-2 pr-6 text-[11px] bg-[#161B22] border border-white/[0.08] rounded text-white focus:outline-none focus:border-[#7C3AED]"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          className="h-7 pl-2 pr-6 text-[11px] bg-[#161B22] border border-white/[0.08] rounded text-white focus:outline-none focus:border-[#7C3AED]"
                        >
                          <option value="vs-dark">VS Dark</option>
                          <option value="monokai">Monokai</option>
                          <option value="github-dark">GitHub Dark</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <Type className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          <select
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="h-7 pl-1 pr-5 text-[11px] bg-[#161B22] border border-white/[0.08] rounded text-white focus:outline-none focus:border-[#7C3AED]"
                          >
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="h-7 px-2.5 rounded-md border border-white/[0.08] bg-[#161B22] text-white text-[11px] font-medium hover:border-white/[0.12] transition-colors">
                          Reset
                        </button>
                        <button className="h-7 px-2.5 rounded-md border border-white/[0.08] bg-[#161B22] text-white text-[11px] font-medium hover:border-white/[0.12] transition-colors flex items-center gap-1">
                          <Maximize2 className="w-3 h-3" />
                          Fullscreen
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 min-h-0 relative bg-[#0D1117]">
                    <MonacoEditorWrapper
                      language="cpp"
                      value={code}
                      onChange={handleCodeChange}
                      options={{
                        automaticLayout: false,
                        fontFamily: '"Consolas", "Courier New", monospace',
                        fontSize: 14,
                        lineHeight: 21,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        renderLineHighlight: "all",
                        minimap: { enabled: true, renderCharacters: false, scale: 0.75 },
                        matchBrackets: "always",
                        bracketPairColorization: { enabled: true },
                        guides: { indentation: true },
                      }}
                    />
                  </div>
                </div>
              </Panel>

              <Separator className="h-[6px] cursor-row-resize bg-transparent hover:bg-[#7C3AED] transition-colors relative group">
                <div className="absolute inset-0 group-hover:shadow-[0_0_12px_rgba(124,58,237,0.6)] transition-shadow" />
              </Separator>

              {/* Bottom Console */}
              <Panel id="console" defaultSize={initialConsoleHeight} minSize={12}>
                <div className="h-full flex flex-col bg-[#0D1117] border-t border-white/[0.08]">
                  <div className="flex items-center gap-0.5 px-3 border-b border-white/[0.08] shrink-0">
                    {["Test Results", "Console", "Custom Input", "Accepted Runs", "Runtime", "Memory", "Submissions", "AI Feedback", "Discussion"].map((tab) => (
                      <button key={tab} className="px-2.5 py-1.5 text-[11px] font-medium text-[#9CA3AF] hover:text-white transition-colors">
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 p-3 text-center text-[11px] text-[#6B7280]">
                    Run your code to see test results here
                  </div>
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </div>
  );
}

function ProblemSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold text-white mb-3">{title}</h2>
      <div className="text-[15px] text-[#E5E7EB] leading-[1.8]">{children}</div>
    </section>
  );
}

function ExamplesPanel({ samples }: { samples: SampleTest[] }) {
  const [activeSample, setActiveSample] = useState(0);

  return (
    <div className="max-w-[760px] space-y-4">
      <h2 className="text-[18px] font-semibold text-white">Examples</h2>

      {samples.length > 1 && (
        <div className="flex gap-1.5">
          {samples.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSample(idx)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                activeSample === idx
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "border-white/[0.08] bg-[#111827] text-[#9CA3AF] hover:border-white/[0.12]"
              }`}
            >
              Example {idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <ExampleCard title="Input" content={samples[activeSample]?.input || ""} />
        <ExampleCard title="Output" content={samples[activeSample]?.output || ""} />
        {samples[activeSample]?.explanation && (
          <div className="p-3 rounded-lg bg-[#111827] border border-white/[0.08]">
            <h4 className="text-xs font-semibold text-white mb-1">Explanation</h4>
            <p className="text-xs text-[#E5E7EB] leading-relaxed">{samples[activeSample].explanation}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 rounded-md border border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-medium hover:bg-[#3B82F6]/20 transition-all flex items-center justify-center gap-1.5">
            <Check className="w-3 h-3" />
            Run Sample
          </button>
        </div>
      </div>
    </div>
  );
}

function ExampleCard({ title, content }: { title: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  return (
    <div className="rounded-lg bg-[#111827] border border-white/[0.08] overflow-hidden hover:border-white/[0.12] transition-colors">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.08]">
        <span className="text-[11px] font-semibold text-white uppercase">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            "Copy"
          )}
        </button>
      </div>
      <pre className="p-3 text-xs text-[#E5E7EB] font-mono leading-relaxed overflow-x-auto">{content || "\u00A0"}</pre>
    </div>
  );
}