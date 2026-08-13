"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  PenLine,
  Settings,
  Send,
  Copy,
  RefreshCw,
  Bookmark,
  Save,
  StickyNote,
  Download,
  Play,
  Clock,
  CheckCircle,
  Mic,
  ChevronDown,
  PanelLeftOpen,
  Crown,
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
  HelpCircle,
  BookOpen,
  LayoutTemplate,
  Square,
  Terminal,
  HardDrive,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { streamChat } from "@/services/ai";
import type { LiveUsage } from "@/services/ai";
import { toast } from "@/lib/toast";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
import { fmt, formatUsage } from "@/components/ai/tokenUsage";
import { extractRenderedText } from "@/utils/clipboard";

const MODELS = [
  { id: "gpt-5", label: "GPT-5", icon: "🤖" },
  { id: "claude", label: "Claude", icon: "🟣" },
  { id: "gemini", label: "Gemini", icon: "✨" },
  { id: "deepseek", label: "DeepSeek", icon: "🔍" },
  { id: "llama", label: "Llama", icon: "🦙" },
] as const;

const AI_MODES = [
  { id: "tutor", mode: "general", label: "Tutor", icon: GraduationCap },
  { id: "competitive", mode: "coding_coach", label: "Competitive", icon: Trophy },
  { id: "debugger", mode: "code_debugger", label: "Debugger", icon: Bug },
  { id: "interviewer", mode: "general", label: "Interviewer", icon: HelpCircle },
  { id: "teacher", mode: "problem_explainer", label: "Teacher", icon: BookOpen },
  { id: "architect", mode: "code_reviewer", label: "System Designer", icon: LayoutTemplate },
] as const;

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

function LogoMark() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]">
      <Sparkles className="h-4 w-4 text-accent-foreground" />
    </div>
  );
}

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

interface Conversation {
  id: string;
  title: string;
  preview: string;
  time: number;
  messages: number;
  model: string;
  unread?: boolean;
}

type ConversationGroups = {
  today: Conversation[];
  yesterday: Conversation[];
  week: Conversation[];
  older: Conversation[];
};

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

/* ─── CLAUDE-STYLE ASSISTANT MARK ─── */
function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 2.5v19M4.1 5.75l15.8 12.5M19.9 5.75L4.1 18.25" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ─── THINKING PANEL ─── */
function ThinkingPanel({ reasoning, isThinking, usage }: {
  reasoning: string;
  isThinking: boolean;
  usage?: LiveUsage;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  // Auto-expand while thinking; collapsed by default once reasoning completes.
  const open = manualOpen ?? isThinking;
  if (!reasoning && !isThinking) return null;

  // Live token estimate from real usage when the backend reports it, otherwise
  // a rough character-based estimate while reasoning streams.
  const tokens = usage?.totalTokens ?? Math.max(0, Math.round(reasoning.length / 4));

  return (
    <div>
      <button
        onClick={() => setManualOpen(!open)}
        aria-expanded={open}
        className="group flex w-full items-baseline gap-1.5 text-left"
      >
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-ai-text">
          <Sparkles className={`h-3 w-3 text-ai-accent ${isThinking ? "animate-pulse" : ""}`} />
          {isThinking ? "Thinking..." : "Thinking"}
        </span>
        <span className="text-[11px] text-ai-text-mut">
          · {fmt(tokens)} tokens
        </span>
        <span className="ml-auto">
          <ChevronDown className={`h-3 w-3 text-ai-text-mut transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="mt-1 pl-[18px]">
          {reasoning ? (
            <div className="max-h-[320px] overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-ai-text-sec">
              {reasoning}
            </div>
          ) : (
            <div className="text-[12px] text-ai-text-mut">Analyzing your request...</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── MESSAGE BUBBLE ─── */
function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const copyMessage = () => {
    const rendered = extractRenderedText(contentRef.current);
    navigator.clipboard.writeText(rendered || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const meta = formatUsage(message.usage, message.timeMs, message.isStreaming);
  const hasThinking = !!(message.reasoningContent || message.isReasoning);
  const done = !message.isStreaming && !message.isReasoning;
  const hasResponse = !!(message.content || message.codeBlocks?.length || message.executionResult);

  if (isUser) {
    return (
      <div className="group flex justify-end gap-2">
        <div className="max-w-[85%]">
          <div className="rounded-lg rounded-br-md border border-ai-accent/15 bg-ai-user-bubble px-3.5 py-2 text-[13px] text-ai-text">
            <p className="leading-relaxed">{message.content}</p>
          </div>
          <div className="mt-0.5 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={copyMessage} title={copied ? "Copied" : "Copy"} className="rounded-md p-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
              {copied ? <CheckCircle className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ai-accent-soft text-[9px] font-bold text-ai-accent">
          U
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2.5">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ai-accent-soft text-ai-accent">
        <ClaudeMark className="h-3 w-3" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="space-y-1">
          {hasThinking && (
            <ThinkingPanel
              reasoning={message.reasoningContent || ""}
              isThinking={!!message.isReasoning}
              usage={message.usage}
            />
          )}

          {message.isStreaming && !message.content && (
            <div className="text-[12px] text-ai-text-mut">
              {hasThinking ? "Generating response..." : "Generating..."}
            </div>
          )}

          {hasResponse && (
            <div className={hasThinking ? "mt-2" : ""}>
              {message.content && <MarkdownRenderer ref={contentRef} content={message.content} />}
              {message.codeBlocks?.map((block) => <CodeBlock key={block.id} block={block} />)}
              {message.executionResult && <ExecutionCard result={message.executionResult} />}
            </div>
          )}

          {meta && !(message.isStreaming && !message.content) && (
            <p className="flex items-center gap-1.5 text-[10px] text-ai-text-mut">
              {message.isStreaming && <span className="h-1 w-1 animate-pulse rounded-full bg-ai-accent" />}
              {meta}
            </p>
          )}

          {done && (
            <div className="flex items-center gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={copyMessage} title={copied ? "Copied" : "Copy"} className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
                {copied ? <CheckCircle className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </button>
              <button onClick={onRegenerate} title="Regenerate" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
                <RefreshCw className="h-3 w-3" />
              </button>
              <span className="mx-1 h-3 w-px bg-ai-border" />
              <button title="Bookmark" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
                <Bookmark className="h-3 w-3" />
              </button>
              <button title="Save" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
                <Save className="h-3 w-3" />
              </button>
              <button title="Notes" className="rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text">
                <StickyNote className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
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
const GROUP_LABELS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "Previous 7 Days" },
  { key: "older", label: "Older" },
] as const;

interface SidebarProps {
  groups: ConversationGroups;
  selectedId: string | null;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

function ConversationSidebar({ groups, selectedId, searchQuery, onSearch, onSelect, onNewChat }: SidebarProps) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    const match = (c: Conversation) =>
      c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q);
    return {
      today: groups.today.filter(match),
      yesterday: groups.yesterday.filter(match),
      week: groups.week.filter(match),
      older: groups.older.filter(match),
    };
  }, [groups, searchQuery]);

  return (
    <aside className="flex w-[272px] shrink-0 flex-col border-r border-ai-border bg-ai-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-4">
        <LogoMark />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-bold tracking-tight text-ai-text">AI Chat</span>
            <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-ai-accent/25 bg-ai-accent-soft px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-ai-accent">
              <Crown className="h-2.5 w-2.5" />
              Premium
            </span>
          </div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pt-1">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ai-accent/25 bg-ai-accent-soft px-3 py-1.5 text-[12px] font-medium text-ai-accent transition-colors hover:bg-ai-accent/15"
        >
          <Plus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="relative px-3 pb-2 pt-2.5">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-3 w-3 -translate-y-1/2 text-ai-text-mut" />
        <input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-lg border border-ai-border bg-ai-composer py-1.5 pl-8 pr-2 text-[12px] text-ai-text outline-none placeholder:text-ai-text-mut transition-colors focus:border-ai-accent/50"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {GROUP_LABELS.map((group) => {
          const items = filtered[group.key];
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-2.5">
              <div className="px-2 pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-wider text-ai-text-mut">
                {group.label}
              </div>
              {items.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                    selectedId === conv.id ? "bg-ai-accent-soft" : "hover:bg-ai-hover"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`truncate text-[12px] ${selectedId === conv.id ? "font-medium text-ai-accent" : "text-ai-text"}`}>
                        {conv.title}
                      </div>
                      {conv.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ai-accent" />}
                    </div>
                    <div className="truncate text-[10px] text-ai-text-mut">{conv.preview}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="rounded p-1 text-ai-text-mut hover:text-ai-text transition-colors"><PenLine className="h-3 w-3" /></button>
                    <button className="rounded p-1 text-ai-text-mut hover:text-danger transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* User / plan */}
      <div className="border-t border-ai-border px-3 py-2.5">
        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-ai-hover transition-colors cursor-pointer">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-[10px] font-bold text-accent-foreground">
            JD
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-ai-text">John Doe</div>
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
// Mock conversation timestamps — resolved once at module load so render stays pure.
const MOCK_NOW = Date.now();

export default function AIChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>("gpt-5");
  const [modelOpen, setModelOpen] = useState(false);
  const [aiMode, setAiMode] = useState<string>("tutor");
  const [modeOpen, setModeOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const conversationGroups = useMemo(() => {
    const makeConvs = (count: number, offsetMinutes: number): Conversation[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `conv-${offsetMinutes}-${i}`,
        title: `Conversation ${offsetMinutes}-${i + 1}`,
        preview: "Recent discussion about algorithms and data structures...",
        time: MOCK_NOW - offsetMinutes * 60 * 1000 - i * 60000,
        messages: ((i * 7) % 20) + 1,
        model: MODELS[(offsetMinutes + i) % MODELS.length].id,
        unread: i === 0 && offsetMinutes < 60,
      }));

    return {
      today: makeConvs(3, 30),
      yesterday: makeConvs(2, 24 * 60),
      week: makeConvs(3, 3 * 24 * 60),
      older: makeConvs(3, 10 * 24 * 60),
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
    setSelectedChat(null);
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
      model: model.toUpperCase(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const selectedMode = AI_MODES.find((m) => m.id === aiMode)?.mode ?? "general";
      await streamChat(
        {
          message: userMsg.content,
          mode: selectedMode,
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
  }, [input, isLoading, model, aiMode, finalizeMessage, ensureConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const activeTitle = useMemo(() => {
    if (!selectedChat) return "New Conversation";
    const all = [
      ...conversationGroups.today,
      ...conversationGroups.yesterday,
      ...conversationGroups.week,
      ...conversationGroups.older,
    ];
    return all.find((c) => c.id === selectedChat)?.title ?? "New Conversation";
  }, [selectedChat, conversationGroups]);

  const isEmptyWorkspace = messages.length === 0 && !isLoading;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-ai-bg">
        {sidebarOpen && (
          <ConversationSidebar
            groups={conversationGroups}
            selectedId={selectedChat}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
            onSelect={setSelectedChat}
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

            <div className="ml-auto flex items-center gap-2">
              {/* Model */}
              <div className="relative">
                <button
                  onClick={() => { setModelOpen(!modelOpen); setModeOpen(false); }}
                  className="flex items-center gap-1.5 rounded-md border border-ai-border bg-ai-composer px-2.5 py-1.5 text-[11px] font-medium text-ai-text transition-colors hover:border-ai-border"
                >
                  {MODELS.find((m) => m.id === model)?.label}
                  <ChevronDown className="h-3 w-3 text-ai-text-mut" />
                </button>
                {modelOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-ai-border bg-ai-composer py-1 shadow-lg">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(m.id); setModelOpen(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors ${
                          model === m.id ? "bg-ai-accent-soft text-ai-accent" : "text-ai-text hover:bg-ai-hover"
                        }`}
                      >
                        <span>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode */}
              <div className="relative">
                <button
                  onClick={() => { setModeOpen(!modeOpen); setModelOpen(false); }}
                  className="flex items-center gap-1.5 rounded-md border border-ai-border bg-ai-composer px-2.5 py-1.5 text-[11px] font-medium text-ai-text transition-colors hover:border-ai-border"
                >
                  {AI_MODES.find((m) => m.id === aiMode)?.label}
                  <ChevronDown className="h-3 w-3 text-ai-text-mut" />
                </button>
                {modeOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-ai-border bg-ai-composer py-1 shadow-lg">
                    {AI_MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setAiMode(m.id); setModeOpen(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors ${
                          aiMode === m.id ? "bg-ai-accent-soft text-ai-accent" : "text-ai-text hover:bg-ai-hover"
                        }`}
                      >
                        <m.icon className="h-3.5 w-3.5" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                      className="max-h-[160px] flex-1 resize-none bg-transparent py-1 text-[13px] leading-relaxed text-ai-text outline-none placeholder:text-ai-text-mut"
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
                <p className="mt-1.5 text-center text-[10px] text-ai-text-mut">
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