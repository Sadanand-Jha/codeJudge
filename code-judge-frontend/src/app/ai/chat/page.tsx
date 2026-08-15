"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  Settings,
  Send,
  Copy,
  Bookmark,
  Save,
  StickyNote,
  Download,
  Play,
  Clock,
  CheckCircle,
  Mic,
  PanelLeftOpen,
  GraduationCap,
  Trophy,
  Zap,
  Bug,
  CheckSquare,
  FileCode,
  Image as ImageIcon,
  Paperclip,
  Code,
  BarChart3,
  Square,
  Terminal,
  HardDrive,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { streamChat } from "@/services/ai";
import type { LiveUsage } from "@/services/ai";
import { toast } from "@/lib/toast";
import AIMessageRow from "@/components/ai/AIMessageRow";
import { useAuthStore } from "@/store/authStore";

const QUICK_ACTIONS = [
  { label: "Explain Code", icon: FileCode, prompt: "Explain this code step by step" },
  { label: "Optimize", icon: Zap, prompt: "Optimize this code for better performance" },
  { label: "Debug", icon: Bug, prompt: "Find and fix bugs in this code" },
  { label: "Dry Run", icon: Play, prompt: "Do a dry run with example input" },
  { label: "Complexity", icon: BarChart3, prompt: "Analyze time and space complexity" },
  { label: "Generate Tests", icon: CheckSquare, prompt: "Generate comprehensive test cases" },
  { label: "Interview Prep", icon: GraduationCap, prompt: "Prepare interview questions for this topic" },
  { label: "Competitive", icon: Trophy, prompt: "Solve this competitive programming problem" },
];

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  model?: string;
  codeBlocks?: CodeBlock[];
  executionResult?: ExecutionResult;
  thinking?: string;
  reasoningContent?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  usage?: LiveUsage;
  timeMs?: number;
}

interface CodeBlock {
  id: string;
  language: string;
  code: string;
}

interface ExecutionResult {
  status: string;
  stdout: string;
  stderr: string;
  time: string;
  memory: string;
  testCases: TestCase[];
}

interface TestCase {
  id: number;
  passed: boolean;
  input: string;
  expected: string;
  output: string;
}

/* ─── CODE BLOCK ─── */
function CodeBlock({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langColors: Record<string, string> = {
    python: "#3776AB",
    cpp: "#00599C",
    java: "#ED8B00",
    javascript: "#F7DF1E",
    typescript: "#3178C6",
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-ai-border bg-ai-sidebar">
      <div className="flex items-center justify-between border-b border-ai-border bg-ai-composer px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: langColors[block.language] || "#6B7280" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ai-text-mut">{block.language}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowOutput(!showOutput)} className="rounded p-1 text-ai-text-mut hover:bg-ai-hover hover:text-ai-text transition-colors" title="Run"><Play className="h-3 w-3" /></button>
          <button className="rounded p-1 text-ai-text-mut hover:bg-ai-hover hover:text-ai-text transition-colors" title="Download"><Download className="h-3 w-3" /></button>
          <button onClick={copy} className="rounded p-1 text-ai-text-mut hover:bg-ai-hover hover:text-ai-text transition-colors" title="Copy">
            {copied ? <CheckCircle className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-3">
        <pre className="text-[12px] leading-relaxed">
          <code className="font-mono text-ai-text">{block.code}</code>
        </pre>
      </div>
      {showOutput && (
        <div className="border-t border-ai-border bg-ai-composer">
          <div className="flex items-center gap-2 border-b border-ai-border bg-ai-sidebar px-3 py-1.5">
            <Terminal className="h-3 w-3 text-ai-text-mut" />
            <span className="text-[10px] font-medium text-ai-text-mut">Output</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-4 text-[10px] text-ai-text-mut">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 0.012s</span>
              <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> 2.4 MB</span>
              <span className="flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" /> Accepted</span>
            </div>
            <pre className="mt-2 rounded bg-ai-sidebar p-2 text-[12px] font-mono text-ai-text-mut">{`// Output will appear here...`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MESSAGE BUBBLE (shared /ai/chat design) ─── */
function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
  const isUser = message.role === "user";
  return (
    <AIMessageRow
      message={{
        role: message.role,
        content: message.content,
        reasoningContent: message.reasoningContent,
        isReasoning: message.isReasoning,
        isStreaming: message.isStreaming,
        usage: message.usage,
        timeMs: message.timeMs,
      }}
      onRegenerate={onRegenerate}
      extraActions={
        isUser ? undefined : (
          <>
            <button title="Bookmark" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
              <Bookmark className="h-3 w-3" />
            </button>
            <button title="Save" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
              <Save className="h-3 w-3" />
            </button>
            <button title="Notes" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
              <StickyNote className="h-3 w-3" />
            </button>
          </>
        )
      }
    >
      {!isUser && (
        <>
          {message.codeBlocks?.map((block) => <CodeBlock key={block.id} block={block} />)}
          {message.executionResult && <ExecutionCard result={message.executionResult} />}
        </>
      )}
    </AIMessageRow>
  );
}

/* ─── EXECUTION CARD ─── */
function ExecutionCard({ result }: { result: ExecutionResult }) {
  const passed = result.testCases.filter((t) => t.passed).length;
  const total = result.testCases.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const statusColor = result.status === "Accepted" ? "text-success" : result.status.includes("Error") || result.status.includes("Wrong") ? "text-danger" : "text-warning";

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-ai-border bg-ai-sidebar">
      <div className="flex items-center justify-between bg-ai-composer px-3 py-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-success" />
          <span className={`text-[11px] font-semibold ${statusColor}`}>{result.status}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-ai-text-mut">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.time}</span>
          <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {result.memory}</span>
        </div>
      </div>
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-ai-text-mut">Test Cases: {passed}/{total}</span>
          <span className="text-[10px] text-ai-text-mut">{pct}%</span>
        </div>
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-ai-border">
          <div className="h-full rounded-full bg-gradient-to-r from-danger via-warning to-success transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ─── WELCOME STATE ─── */
function WelcomeState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-ai-border bg-ai-composer">
        <Sparkles className="h-5 w-5 text-ai-accent" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-ai-text">How can I help you today?</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ai-text-sec">
        Ask anything about algorithms, competitive programming, debugging or interviews.
      </p>
    </div>
  );
}

/* ─── CONVERSATION SIDEBAR ─── */

interface SidebarProps {
  onNewChat: () => void;
}

function ConversationSidebar({ onNewChat }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const username = user?.username || "Guest";
  const initials =
    username
      .split(/[\s._-]+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-ai-border bg-ai-sidebar">
      {/* New chat */}
      <div className="px-3 pt-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ai-accent/25 bg-ai-accent-soft px-3 py-1.5 text-[12px] font-medium text-ai-accent transition-colors hover:bg-ai-accent/15"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ai-accent-soft">
          <Sparkles className="h-5 w-5 text-ai-accent" />
        </div>
        <div className="text-[12px] font-medium text-ai-text">No conversations yet</div>
        <div className="text-[11px] leading-relaxed text-ai-text-mut">
          Start a new chat and your conversation will appear here.
        </div>
      </div>

      {/* User / plan */}
      <div className="border-t border-ai-border px-3 py-2.5">
        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-ai-hover transition-colors cursor-pointer">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-[10px] font-bold text-accent-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-ai-text">{username}</div>
            <div className="truncate text-[10px] text-ai-text-mut">Free plan · 12.4K tokens</div>
          </div>
          <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors"><Settings className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────── */

export default function AIChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const convoRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const makeConversationId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Client-generated conversation id — the backend persists history under it.
  // Created lazily on first send (not during render) so the render stays pure.
  const conversationIdRef = useRef<string | null>(null);
  const ensureConversationId = useCallback(() => {
    if (!conversationIdRef.current) {
      conversationIdRef.current = makeConversationId();
    }
    return conversationIdRef.current;
  }, []);

  // Abort any in-flight AI stream when the user leaves the page so the SSE
  // connection is torn down instead of streaming (and buffering) indefinitely.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Smart autoscroll: keep pinned to the bottom while streaming unless the user
// has scrolled up to read; never yank the viewport away mid-stream.
const handleConvoScroll = useCallback(() => {
    const el = convoRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  useEffect(() => {
    const el = convoRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const finalizeMessage = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isReasoning: false, isStreaming: false } : m
      )
    );
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const startNewChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setInput("");
    conversationIdRef.current = makeConversationId();
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: `msg-${Date.now()}`, role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const aiId = `msg-${Date.now()}-ai`;
    const aiMsg: Message = {
      id: aiId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      isReasoning: true,
      isStreaming: true,
      timestamp: Date.now(),
      model: "GPT-5",
    };
    setMessages((prev) => [...prev, aiMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChat(
        {
          message: userMsg.content,
          mode: "general",
          conversationId: ensureConversationId(),
        },
        {
          onReasoning: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? { ...m, reasoningContent: (m.reasoningContent || "") + chunk }
                  : m
              )
            );
          },
          onContent: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          onUsage: (meta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, usage: meta.usage, timeMs: meta.timeMs } : m
              )
            );
          },
          onDone: () => {
            finalizeMessage(aiId);
          },
        },
        controller.signal
      );
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        finalizeMessage(aiId);
      } else {
        finalizeMessage(aiId);
        toast.error("Failed to get AI response", {
          description: err.message || "Please try again.",
        });
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }, [input, isLoading, finalizeMessage, ensureConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const activeTitle = "New Conversation";

  const isEmptyWorkspace = messages.length === 0 && !isLoading;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-ai-bg">
        {sidebarOpen && (
          <ConversationSidebar
            onNewChat={startNewChat}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col bg-ai-bg">
          {/* ===== Top bar ===== */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-ai-border px-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-1.5 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text"
                title="Show sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <h2 className="truncate text-[13px] font-semibold text-ai-text">{activeTitle}</h2>
          </header>

          {/* ===== Workspace ===== */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" ref={convoRef} onScroll={handleConvoScroll}>
              {isEmptyWorkspace ? (
                <WelcomeState />
              ) : (
                <div className="mx-auto w-full max-w-[1000px] space-y-4 px-6 py-5">
                  {messages.map((msg) => <MessageBubble key={msg.id} message={msg} onRegenerate={() => {}} />)}
                </div>
              )}
            </div>

            {/* ===== Composer ===== */}
            <div className="shrink-0 border-t border-ai-border bg-ai-bg px-6 pb-4 pt-3">
              <div className="mx-auto w-full max-w-[1000px]">
                {isEmptyWorkspace && (
                  <div className="mb-2.5 flex flex-wrap items-center justify-center gap-1.5">
                    {QUICK_ACTIONS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.label}
                          onClick={() => handleSuggestion(a.prompt)}
                          className="flex items-center gap-1.5 rounded-md border border-ai-border/80 bg-ai-composer px-2 py-0.5 text-[10.5px] text-ai-text-sec transition-colors hover:border-ai-accent/30 hover:text-ai-text"
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-md border border-ai-border bg-ai-composer transition-colors focus-within:border-ai-accent/50">
                  {/* Attach toolbar */}
                  <div className="flex items-center gap-0.5 border-b border-ai-border/60 px-2 pt-1.5 pb-1">
                    <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors" title="Upload Image"><ImageIcon className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors" title="Attach File"><Paperclip className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors" title="Paste Code"><FileCode className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors" title="Import Editor"><Code className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors" title="Voice"><Mic className="h-3.5 w-3.5" /></button>
                  </div>
                  {/* Input row */}
                  <div className="flex items-end gap-2 px-2 py-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about algorithms, debugging or competitive programming…"
                      className="ai-composer-input max-h-[160px] flex-1 resize-none border-0 bg-transparent py-1 text-[13px] leading-relaxed text-ai-text outline-none placeholder:text-ai-text-sec"
                      rows={1}
                    />
                    <button
                      onClick={isLoading ? stopGeneration : sendMessage}
                      disabled={!isLoading && !input.trim()}
                      title={isLoading ? "Stop generating" : "Send"}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ai-accent text-accent-foreground transition-colors hover:bg-ai-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isLoading ? <Square className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-ai-text-sec">
                  Enter to send · Shift+Enter for a new line
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}