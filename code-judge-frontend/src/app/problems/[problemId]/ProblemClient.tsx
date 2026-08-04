"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Check,
  Clock,
  Database,
  Maximize2,
  Type,
  Sparkles,
  FileText,
  Code2,
  Scale,
  Lightbulb,
  BookOpen,
  CheckCheck,
  MessageSquare,
  History,
} from "lucide-react";
import { getRatingHex } from "@/lib/helpers";
import Link from "next/link";
import type { Problem, SampleTest } from "@/types/problem";
import MathRenderer from "@/components/problem/MathRenderer";
import MonacoEditorWrapper from "@/components/editor/MonacoEditor";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useProblemData } from "@/mocks/useProblemData";
import { TabSkeleton, SubmissionRowSkeleton, DiscussionCardSkeleton } from "@/components/problem/ProblemSkeleton";
import { useAuthStore } from "@/store/authStore";

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

  const { data, loading } = useProblemData(problem.problem_id);
  const currentUser = useAuthStore((s) => s.user);

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

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; isAi?: boolean }[] = [
    { id: "description", label: "Description", icon: FileText },
    { id: "examples", label: "Examples", icon: Code2 },
    { id: "constraints", label: "Constraints", icon: Scale },
    { id: "hints", label: "Hints", icon: Lightbulb, badge: 3 },
    { id: "editorial", label: "Editorial", icon: BookOpen },
    { id: "solutions", label: "Solutions", icon: CheckCheck },
    { id: "discussion", label: "Discussion", icon: MessageSquare, badge: 18 },
    { id: "submissions", label: "Submissions", icon: History },
    { id: "ai-analysis", label: "AI Analysis", icon: Sparkles, isAi: true },
  ];

  const ratingColor = getRatingHex(problem.rating);
  const difficultyPillStyle = {
    color: ratingColor,
    borderColor: `${ratingColor}30`,
    backgroundColor: `${ratingColor}10`,
  };

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Problem Header — clean, spacious, Codeforces + LeetCode inspired */}
      <div className="problem-solve-header shrink-0 border-b border-border bg-card">
        <div className="px-6 py-5">
          {/* Row 1: Title + Primary Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-text-primary tracking-tight leading-tight">
                {displayTitle}
              </h1>
            </div>

            {/* Right: Run Code + Submit */}
            <div className="flex shrink-0 items-center gap-3">
              <button className="problem-solve-btn flex h-[42px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-text-primary transition-all hover:border-border-hover hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent/40">
                <Play className="h-4 w-4" />
                Run Code
              </button>
              <button className="flex h-[42px] items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-6 text-sm font-bold text-success transition-all hover:bg-success/20 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] focus-visible:ring-2 focus-visible:ring-success/40">
                <Check className="h-4 w-4" />
                Submit
              </button>
            </div>
          </div>

          {/* Row 2: Metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
              style={difficultyPillStyle}
            >
              {problem.rating ? `Rating ${problem.rating}` : "Unrated"}
            </span>
            <span className="problem-solve-meta-chip inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-text-secondary">
              {problem.contest_id || "Practice"}
            </span>
            <span className="problem-solve-meta-chip inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              {timeLimitStr}
            </span>
            <span className="problem-solve-meta-chip inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <Database className="h-3.5 w-3.5" />
              {memoryLimitStr}
            </span>
            {(problem as any).acceptance !== undefined && (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <span className="h-1 w-1 rounded-full bg-text-secondary opacity-60" />
                Acceptance: {(problem as any).acceptance}%
              </span>
            )}
            {(problem as any).solved_count !== undefined && (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                <span className="h-1 w-1 rounded-full bg-text-secondary opacity-60" />
                Solved: {(problem as any).solved_count}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Tabs — premium glassmorphic navigation */}
      <div className="problem-solve-tabs shrink-0 sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isAi = tab.isAi;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`problem-solve-tab group relative flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "bg-accent/15 text-text-primary shadow-[0_0_20px_rgba(37,99,235,0.15)]"
                    : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                }`}
                style={{
                  transform: isActive ? "translateY(-1px)" : "none",
                }}
              >
                {/* Active underline */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-accent to-accent-secondary rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}

                {/* Icon */}
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive
                      ? isAi
                        ? "text-accent"
                        : "text-accent-secondary"
                      : "text-text-secondary group-hover:text-text-primary"
                  }`}
                />

                {/* Label */}
                <span
                  className={`transition-colors ${
                    isActive && isAi
                      ? "bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent"
                      : ""
                  }`}
                >
                  {tab.label}
                </span>

                {/* AI shimmer glow */}
                {isAi && isActive && (
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/20 to-accent-secondary/20 blur-xl -z-10" />
                )}

                {/* Badge */}
                {tab.badge !== undefined && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? "bg-accent-secondary/20 text-accent-secondary"
                        : "bg-white/[0.06] text-text-secondary"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Discussion unread dot */}
                {tab.id === "discussion" && (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 min-h-0">
        <Group id={leftGroupId} orientation="horizontal" onLayoutChange={(layout) => saveLayout(STORAGE_KEY_LEFT, layout.problem)}>
          <Panel id="problem" defaultSize={initialLeftWidth} minSize={30}>
            <div className="problem-solve-desc h-full overflow-y-auto overflow-x-hidden border-r border-border bg-background">
              <div className="px-4 py-4">
                <div className="max-w-[760px]">
                    {activeTab === "description" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                      >
                        <ProblemSection title="Description">
                          <MathRenderer html={problem.statement} />
                        </ProblemSection>

                        {/* Examples directly below the problem description */}
                        {problem.sample_tests.length > 0 && (
                          <div className="border-t border-border pt-6">
                            <ExamplesPanel samples={problem.sample_tests} />
                          </div>
                        )}
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

                  {loading && activeTab !== "description" && activeTab !== "examples" && activeTab !== "constraints" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <TabSkeleton />
                      <SubmissionRowSkeleton />
                      <SubmissionRowSkeleton />
                      <SubmissionRowSkeleton />
                    </motion.div>
                  )}

                  {!loading && activeTab !== "description" && activeTab !== "examples" && activeTab !== "constraints" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {activeTab === "hints" && (
                        <div className="space-y-4">
                          {data?.hints.map((hint, idx) => (
                            <div key={hint.id} className="rounded-xl border border-border bg-card p-4">
                              <p className="text-xs font-semibold text-accent mb-2">Hint {idx + 1}</p>
                              <p className="text-sm text-text-secondary leading-relaxed">{hint.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === "editorial" && data?.editorial && (
                        <div className="space-y-6">
                          <ProblemSection title="Intuition">
                            <p>{data.editorial.intuition}</p>
                          </ProblemSection>
                          <ProblemSection title="Observations">
                            <ul className="list-disc list-inside space-y-2">
                              {data.editorial.observations.map((obs, i) => (
                                <li key={i}>{obs}</li>
                              ))}
                            </ul>
                          </ProblemSection>
                          <ProblemSection title="Proof">
                            <pre className="whitespace-pre-wrap text-sm">{data.editorial.proof}</pre>
                          </ProblemSection>
                          <ProblemSection title="Complexity">
                            <p>{data.editorial.complexity}</p>
                          </ProblemSection>
                          <ProblemSection title="Edge Cases">
                            <ul className="list-disc list-inside space-y-2">
                              {data.editorial.edgeCases.map((edge, i) => (
                                <li key={i}>{edge}</li>
                              ))}
                            </ul>
                          </ProblemSection>
                          <ProblemSection title="Approach">
                            <pre className="whitespace-pre-wrap text-sm">{data.editorial.approach}</pre>
                          </ProblemSection>
                        </div>
                      )}

                      {activeTab === "solutions" && (
                        <div className="space-y-4">
                          {data?.solutions.map((sol) => (
                            <div key={sol.id} className="rounded-xl border border-border bg-card overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-text-primary">{sol.author}</span>
                                  <span className="text-xs text-text-secondary">Rating: {sol.rating}</span>
                                  <span className="text-xs text-text-secondary">Likes: {sol.likes}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-text-secondary">
                                  <span>Runtime: {sol.runtimeMs}ms</span>
                                  <span>Memory: {sol.memoryMB}MB</span>
                                  <span className="px-2 py-0.5 rounded-full border border-border bg-card-hover">{sol.language}</span>
                                </div>
                              </div>
                              <pre className="p-4 text-xs text-text-secondary font-mono overflow-x-auto">{sol.code}</pre>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === "discussion" && (
                        <div className="space-y-4">
                          {data?.discussions.map((disc) => (
                            <div key={disc.id} className="rounded-xl border border-border bg-card p-4">
                              <div className="flex items-start gap-3">
                                <img src={disc.user.avatar} alt={disc.user.username} className="h-10 w-10 rounded-full bg-card-hover" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-text-primary">{disc.user.username}</span>
                                    <span className="text-xs text-text-secondary">{disc.postedAt}</span>
                                  </div>
                                  <h4 className="text-sm font-medium text-text-primary mb-1">{disc.title}</h4>
                                  <p className="text-xs text-text-secondary mb-2">{disc.preview}</p>
                                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                                    <span>Likes: {disc.likes}</span>
                                    <span>Replies: {disc.replies.length}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === "submissions" && (
                        <div className="space-y-2">
                          {(data?.submissions.filter((sub) => sub.user.id === currentUser?.id) ?? []).map((sub) => (
                            <div key={sub.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card">
                              <img src={sub.user.avatar} alt={sub.user.username} className="h-10 w-10 rounded-full bg-card-hover" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-text-primary">{sub.user.username}</span>
                                  <span className="text-xs text-text-secondary">{sub.language}</span>
                                </div>
                                <div className="text-xs text-text-secondary">{sub.submittedAt}</div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                sub.verdict === "Accepted" ? "text-success border-success/20 bg-success/10" :
                                sub.verdict === "Wrong Answer" ? "text-danger border-danger/20 bg-danger/10" :
                                sub.verdict === "Time Limit Exceeded" ? "text-warning border-warning/20 bg-warning/10" :
                                sub.verdict === "Runtime Error" ? "text-[#F97316] border-[#F97316]/20 bg-[#F97316]/10" :
                                sub.verdict === "Compilation Error" ? "text-text-secondary border-text-secondary/20 bg-text-secondary/10" :
                                "text-danger border-danger/20 bg-danger/10"
                              }`}>{sub.verdict}</span>
                              <div className="text-xs text-text-secondary w-24 text-right">{sub.runtimeMs}ms / {sub.memoryMB}MB</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === "ai-analysis" && data?.aiAnalysis && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl border border-border bg-card p-4">
                              <p className="text-xs text-text-secondary mb-1">Difficulty</p>
                              <p className="text-lg font-bold text-accent">{data.aiAnalysis.difficulty}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-4">
                              <p className="text-xs text-text-secondary mb-1">Acceptance</p>
                              <p className="text-lg font-bold text-text-primary">{data.statistics.acceptanceRate}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-xs text-text-secondary mb-2">Required Concepts</p>
                            <div className="flex flex-wrap gap-2">
                              {data.aiAnalysis.requiredConcepts.map((concept) => (
                                <span key={concept} className="px-2 py-1 rounded-full border border-accent/20 bg-accent/10 text-xs text-accent">{concept}</span>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-xs text-text-secondary mb-2">Common Mistakes</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                              {data.aiAnalysis.commonMistakes.map((mistake, i) => (
                                <li key={i}>{mistake}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-xs text-text-secondary mb-2">Recommended</p>
                            <div className="flex flex-wrap gap-2">
                              {data.aiAnalysis.recommendedDifficulty.map((rating) => (
                                <span key={rating} className="px-2 py-1 rounded-full border border-border bg-card-hover text-xs text-text-primary">{rating}</span>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-4">
                            <p className="text-xs text-text-secondary mb-2">Learning Outcome</p>
                            <p className="text-sm text-text-secondary leading-relaxed">{data.aiAnalysis.learningOutcome}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Separator className="problem-solve-divider w-[6px] cursor-col-resize bg-transparent hover:bg-accent transition-colors relative group">
            <div className="absolute inset-0 group-hover:shadow-[0_0_12px_rgba(37,99,235,0.6)] transition-shadow" />
          </Separator>

          {/* Editor Panel */}
          <Panel id="editor" defaultSize={52} minSize={35}>
            <Group id={bottomGroupId} orientation="vertical" onLayoutChanged={(layout) => saveLayout(STORAGE_KEY_CONSOLE, layout.console)}>
              <Panel id="editor" defaultSize={100 - initialConsoleHeight} minSize={50}>
                <div className="h-full flex flex-col bg-[#0D1117]">
                  {/* Editor Toolbar */}
                  <div className="shrink-0 border-b border-border bg-[#0D1117] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="h-7 pl-2 pr-6 text-[11px] bg-[#161B22] border border-border rounded text-white focus:outline-none focus:border-accent"
                        >
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          className="h-7 pl-2 pr-6 text-[11px] bg-[#161B22] border border-border rounded text-white focus:outline-none focus:border-accent"
                        >
                          <option value="vs-dark">VS Dark</option>
                          <option value="monokai">Monokai</option>
                          <option value="github-dark">GitHub Dark</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <Type className="w-3.5 h-3.5 text-text-secondary" />
                          <select
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="h-7 pl-1 pr-5 text-[11px] bg-[#161B22] border border-border rounded text-white focus:outline-none focus:border-accent"
                          >
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="h-7 px-2.5 rounded-md border border-border bg-[#161B22] text-white text-[11px] font-medium hover:border-border-hover transition-colors">
                          Reset
                        </button>
                        <button className="h-7 px-2.5 rounded-md border border-border bg-[#161B22] text-white text-[11px] font-medium hover:border-border-hover transition-colors flex items-center gap-1">
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

              <Separator className="problem-solve-divider h-[6px] cursor-row-resize bg-transparent hover:bg-accent transition-colors relative group">
                <div className="absolute inset-0 group-hover:shadow-[0_0_12px_rgba(37,99,235,0.6)] transition-shadow" />
              </Separator>

              {/* Bottom Console */}
              <Panel id="console" defaultSize={initialConsoleHeight} minSize={12}>
                <div className="h-full flex flex-col bg-[#0D1117] border-t border-border">
                  <div className="flex items-center gap-0.5 px-3 border-b border-border shrink-0">
                    {["Test Results", "Console", "Custom Input", "Accepted Runs", "Runtime", "Memory", "Submissions", "AI Feedback", "Discussion"].map((tab) => (
                      <button key={tab} className="px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors">
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 p-3 text-center text-[11px] text-text-muted">
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
    <section className="problem-solve-section">
      <h2 className="text-[18px] font-semibold text-text-primary mb-3">{title}</h2>
      <div className="problem-solve-section-content text-[15px] text-text-secondary leading-[1.8]">{children}</div>
    </section>
  );
}

function ExamplesPanel({ samples }: { samples: SampleTest[] }) {
  const [activeSample, setActiveSample] = useState(0);

  return (
    <div className="problem-solve-examples max-w-[760px] space-y-4">
      <h2 className="text-[18px] font-semibold text-text-primary">Examples</h2>

        {samples.length > 1 && (
        <div className="flex gap-1.5">
          {samples.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSample(idx)}
              className={`problem-solve-sample-tab px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                activeSample === idx
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-card text-text-secondary hover:border-border-hover"
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
          <div className="p-3 rounded-lg bg-card border border-border">
            <h4 className="text-xs font-semibold text-text-primary mb-1">Explanation</h4>
            <p className="text-xs text-text-secondary leading-relaxed">{samples[activeSample].explanation}</p>
          </div>
        )}
        <div className="flex gap-2">
          <button className="flex-1 px-3 py-1.5 rounded-md border border-accent bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-all flex items-center justify-center gap-1.5">
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
    <div className="problem-solve-example rounded-lg bg-card border border-border overflow-hidden hover:border-border-hover transition-colors">
      <div className="problem-solve-example-head flex items-center justify-between px-3 py-1.5 bg-card-hover border-b border-border">
        <span className="text-[11px] font-semibold text-text-primary uppercase">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
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
      <pre className="p-3 text-xs text-text-secondary font-mono leading-relaxed overflow-x-auto">{content || "\u00A0"}</pre>
    </div>
  );
}