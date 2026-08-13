"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Check,
  Clock,
  Database,
  Sparkles,
  FileText,
  Code2,
  Scale,
  Lightbulb,
  BookOpen,
  CheckCheck,
  MessageSquare,
  History,
  Bookmark,
  BookmarkCheck,
  Settings2,
  Maximize2,
  Minimize2,
  Terminal,
  Hash,
  Cpu,
  ArrowDownToLine,
  ArrowUpFromLine,
  StickyNote,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import { getRatingHex } from "@/lib/helpers";
import type { Problem, SampleTest } from "@/types/problem";
import MathRenderer from "@/components/problem/MathRenderer";
import MonacoEditorWrapper from "@/components/editor/MonacoEditor";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";
import { useProblemData } from "@/mocks/useProblemData";
import { TabSkeleton, SubmissionRowSkeleton, DiscussionCardSkeleton } from "@/components/problem/ProblemSkeleton";
import { useAuthStore } from "@/store/authStore";
import CodeAssistantPanel from "@/components/editor/CodeAssistantPanel";
import { useAIEditorStore } from "@/store/aiEditorStore";
import { useTheme } from "@/context/ThemeContext";
import { STORAGE_KEYS } from "@/utils/storageKeys";

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

const STORAGE_KEY_LEFT = STORAGE_KEYS.SPLIT_PANE_LEFT_WIDTH;
const STORAGE_KEY_CONSOLE = STORAGE_KEYS.SPLIT_PANE_CONSOLE_HEIGHT;

const CONSOLE_TABS = [
  "Test Results",
  "Console",
  "Custom Input",
  "Accepted Runs",
  "Runtime",
  "Memory",
  "Submissions",
  "AI Feedback",
  "Discussion",
] as const;

export default function ProblemClient({ problem }: { problem: Problem }) {
  const [activeTab, setActiveTab] = useState<TabType>("description");
  const [bookmarked, setBookmarked] = useState(false);
  const [language, setLanguage] = useState("javascript");
  const [consoleTab, setConsoleTab] = useState<(typeof CONSOLE_TABS)[number]>("Test Results");
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [code, setCode] = useState(`#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}`);

  const { theme: appTheme } = useTheme();
  const isLight = appTheme === "light";

  const { data, loading } = useProblemData(problem.problem_id);
  const currentUser = useAuthStore((s) => s.user);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const leftGroupId = useId();
  const bottomGroupId = useId();
  const leftPanelRef = usePanelRef();

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
    if (editorRef.current && typeof editorRef.current.layout === "function") {
      editorRef.current.layout();
    }
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handleEditorMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      layoutEditor();
    },
    [layoutEditor]
  );

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

  const toggleEditorFullscreen = useCallback(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (editorFullscreen) {
      panel.expand();
      setEditorFullscreen(false);
    } else {
      panel.collapse();
      setEditorFullscreen(true);
    }
  }, [editorFullscreen, leftPanelRef]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      layoutEditor();
    });
    return () => cancelAnimationFrame(raf);
  }, [layoutEditor]);

  return (
    <div className="problem-solve-page h-screen flex flex-col bg-background overflow-hidden">
      {/* Problem Header */}
      <div className="problem-solve-header shrink-0 border-b border-border bg-card relative z-20">
        <div className="px-5 py-4 md:px-6 md:py-5">
          {/* Row 1: Title + Primary Actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                onClick={() => setBookmarked((b) => !b)}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark problem"}
                aria-pressed={bookmarked}
                className={`problem-solve-bookmark mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  bookmarked ? "text-accent" : "text-text-muted"
                }`}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-[18px] w-[18px]" />
                ) : (
                  <Bookmark className="h-[18px] w-[18px]" />
                )}
              </button>
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-[28px] font-bold text-text-primary tracking-tight leading-tight break-words">
                  {displayTitle}
                </h1>
              </div>
            </div>

            {/* Right: Run Code + Submit */}
            <div className="flex shrink-0 items-center gap-3">
              <button className="problem-solve-btn flex h-[42px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-text-primary transition-all hover:border-border-hover hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-accent/40">
                <Play className="h-4 w-4" />
                Run Code
              </button>
              <button className="problem-solve-submit-btn flex h-[42px] items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-6 text-sm font-bold text-white transition-all focus-visible:ring-2 focus-visible:ring-success/40">
                Submit
              </button>
            </div>
          </div>

          {/* Row 2: Metadata pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] font-semibold"
              style={difficultyPillStyle}
            >
              {problem.rating ? `Rating ${problem.rating}` : "Unrated"}
            </span>
            <span className="problem-solve-meta-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-text-secondary">
              <Hash className="h-3.5 w-3.5" />
              {problem.contest_id || "Practice"}
            </span>
            <span className="problem-solve-meta-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-text-secondary">
              <Clock className="h-3.5 w-3.5" />
              {timeLimitStr}
            </span>
            <span className="problem-solve-meta-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-text-secondary">
              <Database className="h-3.5 w-3.5" />
              {memoryLimitStr}
            </span>
            {(problem as any).acceptance !== undefined && (
              <span className="problem-solve-meta-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-text-secondary">
                <Check className="h-3.5 w-3.5 text-success" />
                {((problem as any).acceptance)}%
              </span>
            )}
            {(problem as any).solved_count !== undefined && (
              <span className="problem-solve-meta-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-text-secondary">
                <Cpu className="h-3.5 w-3.5" />
                Solved {((problem as any).solved_count)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="problem-solve-tabs shrink-0 sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-6 md:px-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isAi = tab.isAi;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`problem-solve-tab group relative flex items-center gap-2 rounded-xl px-4 md:px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
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
      <div className="flex-1 min-h-0 relative">
        <Group id={leftGroupId} orientation="horizontal" onLayoutChange={(layout) => saveLayout(STORAGE_KEY_LEFT, layout.problem)}>
          <Panel
            id="problem"
            defaultSize={initialLeftWidth}
            minSize={30}
            collapsible
            collapsedSize={0}
            panelRef={leftPanelRef}
          >
            <div className="problem-solve-desc h-full overflow-y-auto overflow-x-hidden border-r border-border bg-background">
              <div className="px-4 py-4 md:px-5 md:py-5">
                <div className="mx-auto max-w-[820px]">
                  <div className="problem-solve-card rounded-2xl border border-border bg-card p-5 md:p-7">
                    {activeTab === "description" && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                      >
                        <ProblemSection title="Problem Statement" tone="purple" icon={FileText}>
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
                        className="space-y-8"
                      >
                        <ProblemSection title="Input" tone="yellow" icon={ArrowDownToLine}>
                          <MathRenderer html={problem.input_specification} />
                        </ProblemSection>

                        <ProblemSection title="Output" tone="green" icon={ArrowUpFromLine}>
                          <MathRenderer html={problem.output_specification} />
                        </ProblemSection>

                        {problem.constraints && (
                          <ProblemSection title="Constraints" tone="pink" icon={Scale}>
                            <MathRenderer html={problem.constraints} />
                          </ProblemSection>
                        )}

                        {problem.notes && (
                          <ProblemSection title="Note" tone="lavender" icon={StickyNote}>
                            <MathRenderer html={problem.notes} />
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
                              <div key={hint.id} className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
                                <p className="text-xs font-semibold text-accent mb-2">Hint {idx + 1}</p>
                                <p className="text-sm text-text-secondary leading-relaxed">{hint.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeTab === "editorial" && data?.editorial && (
                          <div className="space-y-6">
                            <ProblemSection title="Intuition" tone="purple" icon={Lightbulb}>
                              <p>{data.editorial.intuition}</p>
                            </ProblemSection>
                            <ProblemSection title="Observations" tone="lavender" icon={CheckCheck}>
                              <ul className="list-disc list-inside space-y-2">
                                {data.editorial.observations.map((obs, i) => (
                                  <li key={i}>{obs}</li>
                                ))}
                              </ul>
                            </ProblemSection>
                            <ProblemSection title="Proof" tone="purple" icon={FileText}>
                              <pre className="whitespace-pre-wrap text-sm">{data.editorial.proof}</pre>
                            </ProblemSection>
                            <ProblemSection title="Complexity" tone="pink" icon={Gauge}>
                              <p>{data.editorial.complexity}</p>
                            </ProblemSection>
                            <ProblemSection title="Edge Cases" tone="yellow" icon={AlertTriangle}>
                              <ul className="list-disc list-inside space-y-2">
                                {data.editorial.edgeCases.map((edge, i) => (
                                  <li key={i}>{edge}</li>
                                ))}
                              </ul>
                            </ProblemSection>
                            <ProblemSection title="Approach" tone="green" icon={Code2}>
                              <pre className="whitespace-pre-wrap text-sm">{data.editorial.approach}</pre>
                            </ProblemSection>
                          </div>
                        )}

                        {activeTab === "solutions" && (
                          <div className="space-y-4">
                            {data?.solutions.map((sol) => (
                              <div key={sol.id} className="problem-solve-panel-card rounded-xl border border-border bg-card overflow-hidden">
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
                              <div key={disc.id} className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
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
                              <div key={sub.id} className="problem-solve-panel-card flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card">
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
                              <div className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
                                <p className="text-xs text-text-secondary mb-1">Difficulty</p>
                                <p className="text-lg font-bold text-accent">{data.aiAnalysis.difficulty}</p>
                              </div>
                              <div className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
                                <p className="text-xs text-text-secondary mb-1">Acceptance</p>
                                <p className="text-lg font-bold text-text-primary">{data.statistics.acceptanceRate}</p>
                              </div>
                            </div>
                            <div className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
                              <p className="text-xs text-text-secondary mb-2">Required Concepts</p>
                              <div className="flex flex-wrap gap-2">
                                {data.aiAnalysis.requiredConcepts.map((concept) => (
                                  <span key={concept} className="px-2 py-1 rounded-full border border-accent/20 bg-accent/10 text-xs text-accent">{concept}</span>
                                ))}
                              </div>
                            </div>
                            <div className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
                              <p className="text-xs text-text-secondary mb-2">Common Mistakes</p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                                {data.aiAnalysis.commonMistakes.map((mistake, i) => (
                                  <li key={i}>{mistake}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
                              <p className="text-xs text-text-secondary mb-2">Recommended</p>
                              <div className="flex flex-wrap gap-2">
                                {data.aiAnalysis.recommendedDifficulty.map((rating) => (
                                  <span key={rating} className="px-2 py-1 rounded-full border border-border bg-card-hover text-xs text-text-primary">{rating}</span>
                                ))}
                              </div>
                            </div>
                            <div className="problem-solve-panel-card rounded-xl border border-border bg-card p-4">
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
            </div>
          </Panel>

          <Separator className="problem-solve-divider w-[6px] cursor-col-resize bg-transparent hover:bg-accent transition-colors relative group">
            <div className="absolute inset-0 group-hover:shadow-[0_0_12px_rgba(37,99,235,0.6)] transition-shadow" />
          </Separator>

          {/* Editor Panel */}
          <Panel id="editor" defaultSize={52} minSize={35}>
            <div className="problem-editor-shell h-full">
              <div className="problem-editor-card flex h-full min-h-0 flex-col overflow-hidden">
                <Group id={bottomGroupId} orientation="vertical" onLayoutChanged={(layout) => saveLayout(STORAGE_KEY_CONSOLE, layout.console)}>
                  <Panel id="editor" defaultSize={100 - initialConsoleHeight} minSize={50}>
                    <div className="h-full flex flex-col bg-[#0D1117]">
                      {/* Editor Toolbar */}
                      <div className="problem-editor-toolbar shrink-0 border-b border-border bg-[#0D1117] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="hidden sm:flex h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED]" />
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              className="problem-solve-lang-select h-8 w-auto min-w-[112px] pl-3 pr-8 text-[12px] font-semibold bg-[#161B22] border border-border rounded-lg text-white focus:outline-none focus:border-accent"
                            >
                              <option value="cpp">C++</option>
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                            </select>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              className="problem-editor-icon-btn flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                              title="Editor settings"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={toggleEditorFullscreen}
                              className="problem-editor-icon-btn flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                              title={editorFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            >
                              {editorFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => {
                                useAIEditorStore.getState().requestAsk({
                                  context: {
                                    type: "current_file",
                                    language,
                                    filename: "solution.cpp",
                                    content: code,
                                  },
                                });
                              }}
                              className="problem-ask-ai-btn flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 text-[11px] font-bold text-white transition-all active:scale-[0.98]"
                            >
                              <Sparkles className="h-3 w-3 shrink-0" />
                              Ask AI
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
                          onMount={handleEditorMount}
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
                            padding: isLight ? { top: 14, bottom: 22 } : undefined,
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
                    <div className="problem-solve-console h-full flex flex-col bg-[#0D1117] border-t border-border">
                      <div className="problem-solve-console-tabs flex items-center gap-0.5 px-3 border-b border-border shrink-0 overflow-x-auto scrollbar-hide">
                        {CONSOLE_TABS.map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setConsoleTab(tab)}
                            className={`relative px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                              consoleTab === tab
                                ? "text-accent"
                                : "text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            {tab}
                            {consoleTab === tab && (
                              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED]" />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="problem-solve-console-empty flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card-hover">
                          <Terminal className="h-6 w-6 text-accent" />
                          <span className="absolute -right-1 -top-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="h-1 w-24 rounded-full bg-[#7C3AED]/20" />
                          <div className="h-1 w-16 rounded-full bg-[#EC4899]/20" />
                          <div className="h-1 w-20 rounded-full bg-[#7C3AED]/10" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[13px] font-semibold text-text-primary">
                            Run your code to see test results here
                          </p>
                          <p className="text-[11px] text-text-muted">
                            Click the &quot;Run Code&quot; button to execute your solution
                          </p>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </Group>
              </div>
            </div>
          </Panel>
        </Group>
      </div>

      <CodeAssistantPanel editorRef={editorRef} monacoRef={monacoRef} />
    </div>
  );
}

type SectionTone = "purple" | "pink" | "yellow" | "green" | "lavender";

const TONE_STYLES: Record<
  SectionTone,
  { bar: string; chip: string; ring: string }
> = {
  purple: { bar: "bg-[#7C3AED]", chip: "bg-[#7C3AED]/10 text-[#7C3AED]", ring: "ring-[#7C3AED]/20" },
  pink: { bar: "bg-[#EC4899]", chip: "bg-[#EC4899]/10 text-[#EC4899]", ring: "ring-[#EC4899]/20" },
  yellow: { bar: "bg-[#F59E0B]", chip: "bg-[#F59E0B]/10 text-[#B45309]", ring: "ring-[#F59E0B]/20" },
  green: { bar: "bg-[#22C55E]", chip: "bg-[#22C55E]/10 text-[#16A34A]", ring: "ring-[#22C55E]/20" },
  lavender: { bar: "bg-[#8B5CF6]", chip: "bg-[#8B5CF6]/10 text-[#8B5CF6]", ring: "ring-[#8B5CF6]/20" },
};

function ProblemSection({
  title,
  children,
  tone = "purple",
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  tone?: SectionTone;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const s = TONE_STYLES[tone];
  return (
    <section className="problem-solve-section">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`h-5 w-1 shrink-0 rounded-full ${s.bar}`} />
        {Icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.chip} ring-1 ${s.ring}`}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <h2 className="text-[17px] font-bold tracking-tight text-text-primary">{title}</h2>
      </div>
      <div className="problem-solve-section-content text-[15px] text-text-secondary leading-[1.8]">
        {children}
      </div>
    </section>
  );
}

function ExamplesPanel({ samples }: { samples: SampleTest[] }) {
  const [activeSample, setActiveSample] = useState(0);

  return (
    <div className="problem-solve-examples space-y-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="h-5 w-1 shrink-0 rounded-full bg-[#8B5CF6]" />
        <h2 className="text-[17px] font-bold tracking-tight text-text-primary">Examples</h2>
      </div>

      {samples.length > 1 && (
        <div className="flex gap-1.5">
          {samples.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSample(idx)}
              className={`problem-solve-sample-tab px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                activeSample === idx
                  ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]"
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
          <button className="flex-1 px-3 py-1.5 rounded-md border border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-medium hover:bg-[#7C3AED]/20 transition-all flex items-center justify-center gap-1.5">
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