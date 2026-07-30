"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  PenLine,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Send,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Download,
  Maximize2,
  Play,
  Clock,
  Cpu,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Upload,
  Mic,
  X,
  FileText,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Code,
  Terminal,
  BookOpen,
  BarChart3,
  Beaker,
  ArrowUp,
  ArrowDown,
  Trash2 as Trash,
  Paperclip,
} from "lucide-react";
import type { Message, AIModel, RightTab, FileItem, ExecutionHistoryItem, PromptSuggestion, CodeBlock, ExecutionResult } from "@/types/ai";

/* ─────────────────────────────────────────
   Codeforces-style Design Tokens
   ───────────────────────────────────────── */
const ACCENT = "#2563EB";
const ACCENT_LIGHT = "#F0F4FF";
const BG = "#FFFFFF";
const BORDER = "#E6E7EB";
const BORDER_HOVER = "#D1D5E0";
const CARD = "#FFFFFF";
const CARD_HOVER = "#FAFAFB";
const TABLE_STRIPE = "#FAFAFB";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const TEXT_MUTED = "#9CA3AF";

const MODELS: { id: AIModel; label: string; icon: string }[] = [
  { id: "gpt-5", label: "GPT-5", icon: "🤖" },
  { id: "gemini", label: "Gemini", icon: "✨" },
  { id: "claude", label: "Claude", icon: "🟣" },
  { id: "local", label: "Local Model", icon: "💻" },
];

const SUGGESTIONS: PromptSuggestion[] = [
  { label: "Explain this code", icon: "📖", prompt: "Explain this code step by step:" },
  { label: "Optimize", icon: "⚡", prompt: "Optimize this code for better performance:" },
  { label: "Debug", icon: "🐛", prompt: "Find and fix the bugs in this code:" },
  { label: "Find bug", icon: "🔍", prompt: "Identify potential bugs in this code:" },
  { label: "Convert to Java", icon: "🔄", prompt: "Convert this code to Java:" },
  { label: "Dry Run", icon: "📋", prompt: "Do a dry run of this code with example input:" },
  { label: "Complexity", icon: "📊", prompt: "Analyze the time and space complexity:" },
  { label: "Generate Tests", icon: "🧪", prompt: "Generate test cases for this code:" },
];

const EMPTY_SUGGESTIONS: { label: string; icon: string; prompt: string }[] = [
  { label: "Solve DSA Problem", icon: "💻", prompt: "Help me solve a DSA problem from LeetCode" },
  { label: "Debug Code", icon: "🐛", prompt: "Help me debug this piece of code:" },
  { label: "Explain Algorithm", icon: "📖", prompt: "Explain how this algorithm works:" },
  { label: "Optimize Solution", icon: "⚡", prompt: "Optimize my solution for better performance:" },
  { label: "Generate Test Cases", icon: "🧪", prompt: "Generate comprehensive test cases for:" },
  { label: "Review Pull Request", icon: "🔄", prompt: "Review this code change:" },
  { label: "Learn New Topic", icon: "🎓", prompt: "Teach me about" },
];

/* ─────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────── */

function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={ACCENT} />
      <path d="M8 10h16M8 16h12M8 22h8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6B7280]" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

function SkeletonMessage({ isUser }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 shrink-0 rounded-full ${isUser ? "bg-[#2563EB]/20" : "bg-[#E6E7EB]"}`} />
      <div className={`flex-1 space-y-2 ${isUser ? "items-end" : ""}`}>
        <div className={`h-4 w-3/4 animate-pulse rounded bg-[#E6E7EB] ${isUser ? "ml-auto" : ""}`} />
        <div className={`h-4 w-1/2 animate-pulse rounded bg-[#E6E7EB] ${isUser ? "ml-auto" : ""}`} />
      </div>
    </div>
  );
}

/* ─── Code Block Renderer ─── */
function CodeBlockRenderer({ block }: { block: CodeBlock }) {
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [block.code]);

  const langColors: Record<string, string> = {
    cpp: "#00599C",
    python: "#3776AB",
    java: "#ED8B00",
    javascript: "#F7DF1E",
    typescript: "#3178C6",
    go: "#00ADD8",
    rust: "#000000",
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-[#E6E7EB] bg-[#FAFAFB]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E6E7EB] bg-white px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: langColors[block.language] || "#6B7280" }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
            {block.language}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors"
            title="Run Code"
          >
            <Play className="h-3 w-3" />
          </button>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors"
            title="Fullscreen"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <button
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors"
            title="Download"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={copy}
            className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors"
            title="Copy"
          >
            {copied ? <CheckCircle className="h-3 w-3 text-[#16A34A]" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
      {/* Code */}
      <div className="overflow-x-auto p-3">
        <pre className="text-[12px] leading-relaxed">
          <code className="font-mono text-[#222222]">{block.code}</code>
        </pre>
      </div>
      {/* Execution Panel */}
      {showOutput && (
        <div className="border-t border-[#E6E7EB] bg-white">
          <div className="flex items-center gap-2 border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
            <Terminal className="h-3 w-3 text-[#6B7280]" />
            <span className="text-[10px] font-medium text-[#6B7280]">Execution Output</span>
          </div>
          <div className="p-3">
            <textarea
              className="mb-2 w-full rounded border border-[#E6E7EB] bg-[#FAFAFB] p-2 text-[12px] font-mono text-[#222222] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40 transition-colors"
              rows={2}
              placeholder="Input (optional)..."
            />
            <div className="mb-2 flex items-center gap-4 text-[10px] text-[#6B7280]">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 0.012s</span>
              <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> 2.4 MB</span>
              <span className="flex items-center gap-1 text-[#16A34A]"><CheckCircle className="h-3 w-3" /> Accepted</span>
            </div>
            <pre className="rounded bg-[#FAFAFB] p-2 text-[12px] font-mono text-[#6B7280]">// Output will appear here...</pre>
            <div className="mt-2 flex gap-2">
              <button className="rounded bg-[#2563EB] px-3 py-1 text-[11px] font-medium text-white hover:bg-[#1D4ED8] transition-colors">
                <Play className="mr-1 inline h-3 w-3" />
                Run Code
              </button>
              <button className="rounded border border-[#E6E7EB] bg-white px-3 py-1 text-[11px] font-medium text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Execution Result Card ─── */
function ExecutionResultCard({ result }: { result: ExecutionResult }) {
  const passed = result.testCases.filter((t) => t.passed).length;
  const total = result.testCases.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    Accepted: { color: "text-[#16A34A]", icon: <CheckCircle className="h-4 w-4 text-[#16A34A]" /> },
    "Wrong Answer": { color: "text-[#DC2626]", icon: <XCircle className="h-4 w-4 text-[#DC2626]" /> },
    "Compilation Error": { color: "text-[#F59E0B]", icon: <AlertTriangle className="h-4 w-4 text-[#F59E0B]" /> },
    "Runtime Error": { color: "text-[#DC2626]", icon: <XCircle className="h-4 w-4 text-[#DC2626]" /> },
    "Time Limit Exceeded": { color: "text-[#F59E0B]", icon: <Clock className="h-4 w-4 text-[#F59E0B]" /> },
    Pending: { color: "text-[#6B7280]", icon: <Spinner /> },
  };

  const cfg = statusConfig[result.status] || statusConfig.Pending;

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-[#E6E7EB] bg-white">
      {/* Status header */}
      <div className="flex items-center justify-between bg-[#FAFAFB] px-3 py-2">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <span className={`text-[12px] font-semibold ${cfg.color}`}>{result.status}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#6B7280]">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.time}</span>
          <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {result.memory}</span>
        </div>
      </div>
      {/* Test cases */}
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#111827]">Test Cases: {passed}/{total} passed</span>
          <span className="text-[10px] text-[#6B7280]">{pct}%</span>
        </div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[#E6E7EB]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#DC2626] via-[#F59E0B] to-[#16A34A] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {result.testCases.map((tc) => (
          <div key={tc.id} className="mb-1 overflow-hidden rounded border border-[#E6E7EB] bg-[#FAFAFB]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#111827]">
                {tc.passed ? (
                  <CheckCircle className="h-3 w-3 text-[#16A34A]" />
                ) : (
                  <XCircle className="h-3 w-3 text-[#DC2626]" />
                )}
                Test #{tc.id + 1}
              </span>
              <span className={`text-[10px] ${tc.passed ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {tc.passed ? "Passed" : "Failed"}
              </span>
            </div>
            {!tc.passed && (
              <div className="border-t border-[#E6E7EB] bg-white px-2 py-1.5">
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div><span className="text-[#6B7280]">Input: </span><code className="text-[#111827]">{tc.input}</code></div>
                  <div><span className="text-[#6B7280]">Expected: </span><code className="text-[#16A34A]">{tc.expected}</code></div>
                  <div><span className="text-[#6B7280]">Output: </span><code className="text-[#DC2626]">{tc.output}</code></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-6">
        <LogoMark size={44} />
      </div>
      <h1 className="mb-2 text-xl font-bold text-[#111827]">
        What would you like to build today?
      </h1>
      <p className="mb-8 text-sm text-[#6B7280]">
        Ask CodeJudge AI anything about coding, algorithms, or debugging
      </p>
      <div className="grid max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-4">
        {EMPTY_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestion(s.prompt)}
            className="group flex flex-col items-center gap-1.5 rounded-lg border border-[#E6E7EB] bg-white p-3.5 text-center hover:border-[#2563EB]/40 hover:bg-[#F0F4FF] hover:shadow-sm transition-all"
          >
            <span className="text-xl">{s.icon}</span>
            <span className="text-[10px] font-medium text-[#6B7280] group-hover:text-[#111827] transition-colors">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Simple Markdown Renderer ─── */
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="mb-1 mt-3 text-[14px] font-bold text-[#111827]">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="mb-1 mt-4 text-[16px] font-bold text-[#111827]">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="mb-2 mt-5 text-[18px] font-bold text-[#111827]">{line.slice(2)}</h1>;
        if (line.match(/^[-*] /)) return <li key={i} className="ml-4 list-disc text-[13px] text-[#222222]">{line.slice(2)}</li>;
        if (line.match(/^\d+\. /)) {
          const idx = line.indexOf(". ");
          return <li key={i} className="ml-4 list-decimal text-[13px] text-[#222222]">{line.slice(idx + 2)}</li>;
        }
        if (line.startsWith("> ")) return (
          <blockquote key={i} className="mb-1 border-l-2 border-[#2563EB] pl-3 text-[12px] italic text-[#6B7280]">{line.slice(2)}</blockquote>
        );
        if (line.includes("`")) {
          const parts = line.split(/(`[^`]+`)/g);
          return (
            <p key={i} className="mb-1 text-[13px] leading-relaxed text-[#222222]">
              {parts.map((part, j) =>
                part.startsWith("`") && part.endsWith("`") ? (
                  <code key={j} className="rounded bg-[#F0F4FF] px-1 py-0.5 text-[11px] font-mono text-[#111827]">
                    {part.slice(1, -1)}
                  </code>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1.5" />;
        return <p key={i} className="mb-1 text-[13px] leading-relaxed text-[#222222]">{line}</p>;
      })}
    </>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
  const isUser = message.role === "user";
  const [liked, setLiked] = useState<boolean | null>(null);

  return (
    <div className={`group flex w-full gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isUser
            ? "bg-[#2563EB] text-white"
            : "bg-[#2563EB] text-white"
        }`}
      >
        {isUser ? "U" : <Sparkles className="h-3.5 w-3.5" />}
      </div>

      <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? "items-end" : ""}`}>
        <div className={`flex items-center gap-1.5 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-[9px] text-[#9CA3AF]">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.model && (
            <span className="rounded bg-[#F0F4FF] px-1 py-0.5 text-[8px] font-medium text-[#2563EB]">
              {message.model}
            </span>
          )}
        </div>

        {isUser ? (
          <div className="rounded-lg rounded-tr-sm bg-[#2563EB] px-3 py-2 text-[13px] text-white">
            <p className="leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="rounded-lg rounded-tl-sm border border-[#E6E7EB] bg-white px-3 py-2 shadow-sm">
            {message.thinking && (
              <div className="mb-2 rounded border border-[#E6E7EB] bg-[#FAFAFB] p-2">
                <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-[#6B7280]">
                  <Spinner className="h-2.5 w-2.5" />
                  <span>Thinking...</span>
                </div>
                <p className="text-[11px] italic text-[#6B7280]">{message.thinking}</p>
              </div>
            )}
            <div className="max-w-none text-[13px] leading-relaxed text-[#222222]">
              <SimpleMarkdown content={message.content} />
            </div>
            {message.codeBlocks?.map((block) => (
              <CodeBlockRenderer key={block.id} block={block} />
            ))}
            {message.executionResult && <ExecutionResultCard result={message.executionResult} />}
          </div>
        )}

        {!isUser && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors" title="Copy">
              <Copy className="h-3 w-3" />
            </button>
            <button onClick={onRegenerate} className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors" title="Regenerate">
              <RefreshCw className="h-3 w-3" />
            </button>
            <button
              onClick={() => setLiked(true)}
              className={`rounded p-1 transition-colors ${liked === true ? "text-[#16A34A]" : "text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB]"}`}
              title="Like"
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => setLiked(false)}
              className={`rounded p-1 transition-colors ${liked === false ? "text-[#DC2626]" : "text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB]"}`}
              title="Dislike"
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors" title="Edit Prompt">
              <PenLine className="h-3 w-3" />
            </button>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#F0F4FF] hover:text-[#2563EB] transition-colors" title="Download Code">
              <Download className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Info Row ─── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-1.5 text-[#6B7280]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-[#111827]">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
   ───────────────────────────────────────── */
export default function AIChatPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<RightTab>("conversation");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<AIModel>("gpt-5");
  const [modelOpen, setModelOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [execHistory, setExecHistory] = useState<ExecutionHistoryItem[]>([]);
  const [thinkingTimer, setThinkingTimer] = useState(0);
  const [thinkingStage, setThinkingStage] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const thinkingStages = [
    "Analyzing your question...",
    "Fetching context...",
    "Running Judge...",
    "Generating explanation...",
  ];

  const [conversations] = useState<
    { id: string; title: string; time: number; messages: number }[]
  >(() => {
    const now = Date.now();
    return [
      { id: "1", title: "Dynamic Programming - Knapsack", time: now - 1000 * 60 * 30, messages: 12 },
      { id: "2", title: "Binary Search Optimization", time: now - 1000 * 60 * 120, messages: 8 },
      { id: "3", title: "Graph Theory - Dijkstra", time: now - 1000 * 60 * 300, messages: 5 },
      { id: "4", title: "Segment Tree Implementation", time: now - 1000 * 60 * 60 * 24 * 2, messages: 15 },
      { id: "5", title: "Python vs C++ Performance", time: now - 1000 * 60 * 60 * 24 * 5, messages: 3 },
    ];
  });

  useEffect(() => {
    if (!isLoading) {
      setThinkingTimer(0);
      setThinkingStage(0);
      return;
    }
    const timer = setInterval(() => setThinkingTimer((p) => p + 1), 1000);
    const stageTimer = setInterval(() => setThinkingStage((p) => (p < thinkingStages.length - 1 ? p + 1 : p)), 2000);
    return () => { clearInterval(timer); clearInterval(stageTimer); };
  }, [isLoading, thinkingStages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: `msg-${Date.now()}`, role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content:
          "Here's an analysis of your code. The **time complexity** is O(n log n) due to the sorting step, and the **space complexity** is O(n) for the auxiliary array.\n\n```python\ndef solve(arr):\n    arr.sort()\n    n = len(arr)\n    result = []\n    for i in range(n):\n        result.append(arr[i] * 2)\n    return result\n```\n\nThe main bottleneck is the sorting. Consider using counting sort for integer inputs to get O(n) performance.",
        timestamp: Date.now(),
        model: model.toUpperCase(),
        codeBlocks: [
          { id: "cb-1", language: "python", code: "def solve(arr):\n    arr.sort()\n    n = len(arr)\n    result = []\n    for i in range(n):\n        result.append(arr[i] * 2)\n    return result" },
          { id: "cb-2", language: "cpp", code: "#include <vector>\n#include <algorithm>\n\nstd::vector<int> solve(std::vector<int>& arr) {\n    std::sort(arr.begin(), arr.end());\n    std::vector<int> result;\n    result.reserve(arr.size());\n    for (int x : arr) {\n        result.push_back(x * 2);\n    }\n    return result;\n}" },
        ],
        executionResult: {
          status: "Accepted", stdout: "[2, 4, 6, 8, 10]", stderr: "", time: "0.012s", memory: "2.4 MB",
          testCases: [
            { id: 0, passed: true, input: "[1,2,3,4,5]", expected: "[2,4,6,8,10]", output: "[2,4,6,8,10]" },
            { id: 1, passed: true, input: "[]", expected: "[]", output: "[]" },
            { id: 2, passed: true, input: "[0,0,0]", expected: "[0,0,0]", output: "[0,0,0]" },
            { id: 3, passed: false, input: "[-1, 0, 1]", expected: "[-2, 0, 2]", output: "[-2, 0, 2]" },
          ],
        },
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 2500);
  }, [input, isLoading, model]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files || []);
    const newFiles: FileItem[] = uploaded.map((f) => ({
      id: `file-${Date.now()}-${f.name}`, name: f.name, size: f.size, type: f.name.split(".").pop() || "txt",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const groupedConversations = useCallback(() => {
    const now = Date.now();
    const groups: { label: string; items: typeof conversations }[] = [
      { label: "Today", items: [] }, { label: "Yesterday", items: [] }, { label: "Previous 7 Days", items: [] }, { label: "Older", items: [] },
    ];
    conversations.forEach((c) => {
      const diff = now - c.time;
      if (diff < 1000 * 60 * 60 * 24) groups[0].items.push(c);
      else if (diff < 1000 * 60 * 60 * 24 * 2) groups[1].items.push(c);
      else if (diff < 1000 * 60 * 60 * 24 * 7) groups[2].items.push(c);
      else groups[3].items.push(c);
    });
    return groups.filter((g) => g.items.length > 0);
  }, [conversations]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white text-[#222222]">
      {/* ─── LEFT SIDEBAR ─── */}
      <aside
        className={`flex flex-col border-r border-[#E6E7EB] bg-white transition-all duration-300 ${
          leftOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        {/* Logo + collapse */}
        <div className="flex items-center justify-between border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-2">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="text-[13px] font-bold text-[#111827]">CodeJudge</span>
            <span className="rounded bg-[#2563EB]/10 px-1.5 py-0.5 text-[8px] font-medium text-[#2563EB]">AI</span>
          </div>
          <button onClick={() => setLeftOpen(false)} className="rounded p-1 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#111827] transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* New Chat */}
        <div className="px-2 py-2">
          <button
            onClick={() => { setMessages([]); setSelectedChat(null); }}
            className="flex w-full items-center gap-2 rounded-md border border-[#E6E7EB] bg-white px-3 py-2 text-[12px] font-medium text-[#111827] hover:border-[#2563EB]/40 hover:bg-[#F0F4FF] transition-all"
          >
            <Plus className="h-3.5 w-3.5 text-[#2563EB]" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="relative px-2 pb-1.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded border border-[#E6E7EB] bg-white py-1.5 pl-7 pr-2 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40 transition-colors"
          />
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2">
          {groupedConversations().map((group) => (
            <div key={group.label} className="mb-3">
              <div className="mb-0.5 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                {group.label}
              </div>
              {group.items.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 transition-colors ${
                    selectedChat === chat.id ? "bg-[#F0F4FF]" : "hover:bg-[#FAFAFB]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-[#111827]">{chat.title}</div>
                    <div className="text-[9px] text-[#9CA3AF]">{chat.messages} messages</div>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="rounded p-0.5 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#111827] transition-colors" title="Rename">
                      <PenLine className="h-3 w-3" />
                    </button>
                    <button className="rounded p-0.5 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#DC2626] transition-colors" title="Delete">
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* User */}
        <div className="border-t border-[#E6E7EB] bg-[#FAFAFB] px-2 py-2">
          <div className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-[#F0F4FF] transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-[8px] font-bold text-white">JD</div>
              <div>
                <div className="text-[11px] font-medium text-[#111827]">John Doe</div>
                <div className="text-[8px] text-[#9CA3AF]">Free Plan</div>
              </div>
            </div>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#111827] transition-colors">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Toggle Left ─── */}
      {!leftOpen && (
        <button
          onClick={() => setLeftOpen(true)}
          className="absolute left-2 top-2 z-10 rounded border border-[#E6E7EB] bg-white p-1.5 text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors"
        >
          <PanelRightClose className="h-4 w-4 rotate-180" />
        </button>
      )}

      {/* ─── CENTER PANEL ─── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#E6E7EB] bg-white px-3 py-1.5">
          <div className="flex items-center gap-2">
            {leftOpen && (
              <button onClick={() => setLeftOpen(false)} className="rounded p-0.5 text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <h2 className="text-[12px] font-semibold text-[#111827] truncate max-w-[180px]">
              {selectedChat ? conversations.find((c) => c.id === selectedChat)?.title || "Chat" : "New Conversation"}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Model */}
            <div className="relative">
              <button
                onClick={() => setModelOpen(!modelOpen)}
                className="flex items-center gap-1.5 rounded border border-[#E6E7EB] bg-white px-2 py-1 text-[10px] font-medium text-[#6B7280] hover:border-[#2563EB]/40 hover:text-[#111827] transition-colors"
              >
                <Sparkles className="h-3 w-3 text-[#2563EB]" />
                {MODELS.find((m) => m.id === model)?.label}
                <ChevronRight className="h-2.5 w-2.5 text-[#9CA3AF]" />
              </button>
              {modelOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setModelOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-[#E6E7EB] bg-white shadow-lg">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(m.id); setModelOpen(false); }}
                        className={`flex w-full items-center gap-2 px-2.5 py-2 text-[11px] transition-colors ${
                          model === m.id ? "bg-[#F0F4FF] text-[#2563EB]" : "text-[#6B7280] hover:bg-[#FAFAFB]"
                        }`}
                      >
                        <span>{m.icon}</span>
                        {m.label}
                        {model === m.id && <CheckCircle className="ml-auto h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors" title="Temperature">
              <Beaker className="h-3.5 w-3.5" />
            </button>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors" title="Export">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors" title="Share">
              <ArrowUp className="h-3.5 w-3.5 rotate-45" />
            </button>
            <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors" title="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFB]">
          {messages.length === 0 && !isLoading ? (
            <EmptyState onSuggestion={handleSuggestion} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onRegenerate={() => {}} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-lg rounded-tl-sm border border-[#E6E7EB] bg-white px-3 py-2 shadow-sm">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Spinner className="h-3 w-3 text-[#2563EB]" />
                      <span className="text-[11px] text-[#6B7280]">{thinkingStages[thinkingStage]}</span>
                      <span className="text-[9px] text-[#9CA3AF]">{thinkingTimer}s</span>
                    </div>
                    <TypingDots />
                  </div>
                </div>
              )}
              {isLoading && messages.length === 0 && (
                <div className="space-y-5">
                  <SkeletonMessage /><SkeletonMessage isUser /><SkeletonMessage />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#E6E7EB] bg-white px-3 py-2.5">
          {messages.length === 0 && !isLoading && (
            <div className="mb-2 flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestion(s.prompt)}
                  className="flex items-center gap-1 rounded-full border border-[#E6E7EB] bg-white px-2.5 py-0.5 text-[10px] text-[#6B7280] hover:border-[#2563EB]/30 hover:bg-[#F0F4FF] hover:text-[#111827] transition-all"
                >
                  <span className="text-[8px]">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5 rounded border border-[#E6E7EB] bg-[#FAFAFB] px-2 py-1">
                  <FileText className="h-3 w-3 text-[#2563EB]" />
                  <span className="text-[10px] text-[#111827]">{f.name}</span>
                  <span className="text-[8px] text-[#9CA3AF]">{formatSize(f.size)}</span>
                  <button onClick={() => removeFile(f.id)} className="rounded p-0.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about code, algorithms, or debugging..."
                className="w-full resize-none rounded-lg border border-[#E6E7EB] bg-[#FAFAFB] px-3 py-2 pr-16 text-[13px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40 focus:bg-white transition-all"
                rows={1}
                style={{ minHeight: "38px", maxHeight: "180px" }}
              />
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5">
                <button onClick={() => fileInputRef.current?.click()} className="rounded p-1 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#111827] transition-colors" title="Attach File">
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button className="rounded p-1 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#111827] transition-colors" title="Voice Input">
                  <Mic className="h-3.5 w-3.5" />
                </button>
                <input ref={fileInputRef} type="file" multiple accept=".cpp,.java,.py,.txt,.pdf,.zip" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 text-center text-[8px] text-[#9CA3AF]">
            Shift+Enter new line · Enter to send
          </div>
        </div>
      </div>

      {/* ─── RIGHT SIDEBAR ─── */}
      <aside
        className={`flex flex-col border-l border-[#E6E7EB] bg-white transition-all duration-300 ${
          rightOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-2">
          <div className="flex items-center gap-0.5">
            {[
              { id: "conversation" as const, icon: MessageSquare },
              { id: "files" as const, icon: Paperclip },
              { id: "problems" as const, icon: Code },
              { id: "execution" as const, icon: Terminal },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`rounded p-1.5 transition-colors ${
                  rightTab === tab.id ? "bg-[#F0F4FF] text-[#2563EB]" : "text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#111827]"
                }`}
                title={tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}
              >
                <tab.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button onClick={() => setRightOpen(false)} className="rounded p-1 text-[#9CA3AF] hover:bg-[#E6E7EB] hover:text-[#111827] transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {rightTab === "conversation" && (
            <div className="space-y-3">
              <h3 className="text-[12px] font-semibold text-[#111827]">Conversation Stats</h3>
              <div className="space-y-2">
                <InfoRow icon={<MessageSquare className="h-3.5 w-3.5" />} label="Messages" value={`${messages.length}`} />
                <InfoRow icon={<Sparkles className="h-3.5 w-3.5" />} label="Tokens Used" value="1,234" />
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value="12m 34s" />
                <InfoRow icon={<Cpu className="h-3.5 w-3.5" />} label="Model" value={MODELS.find((m) => m.id === model)?.label || "GPT-5"} />
                <InfoRow icon={<BarChart3 className="h-3.5 w-3.5" />} label="Est. Cost" value="$0.012" />
              </div>
              <div className="mt-4 rounded-lg border border-[#E6E7EB] bg-[#FAFAFB] p-2.5">
                <h4 className="mb-1 text-[11px] font-medium text-[#111827]">Summary</h4>
                <p className="text-[10px] leading-relaxed text-[#6B7280]">
                  Discussing time complexity analysis and code optimization for sorting algorithms.
                </p>
              </div>
            </div>
          )}
          {rightTab === "files" && (
            <div>
              <div className="mb-3">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E6E7EB] bg-[#FAFAFB] p-6 text-center hover:border-[#2563EB]/40 hover:bg-[#F0F4FF] transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mb-2 h-6 w-6 text-[#9CA3AF]" />
                  <p className="text-[12px] font-medium text-[#111827]">Upload files</p>
                  <p className="mt-0.5 text-[9px] text-[#9CA3AF]">.cpp, .java, .py, .txt, .pdf, .zip</p>
                </div>
              </div>
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded border border-[#E6E7EB] bg-white px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-[#F0F4FF]">
                          <FileText className="h-3.5 w-3.5 text-[#2563EB]" />
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-[#111827]">{f.name}</div>
                          <div className="text-[8px] text-[#9CA3AF]">{formatSize(f.size)}</div>
                        </div>
                      </div>
                      <button onClick={() => removeFile(f.id)} className="rounded p-1 text-[#9CA3AF] hover:bg-[#FAFAFB] hover:text-[#DC2626] transition-colors">
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {rightTab === "problems" && (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-2 h-7 w-7 text-[#9CA3AF]" />
              <p className="text-[12px] font-medium text-[#111827]">Problem Context</p>
              <p className="mt-0.5 text-[10px] text-[#6B7280]">Attach a problem to get AI assistance</p>
            </div>
          )}
          {rightTab === "execution" && (
            <div>
              <h3 className="mb-2 text-[12px] font-semibold text-[#111827]">Execution History</h3>
              {execHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Terminal className="mb-2 h-7 w-7 text-[#9CA3AF]" />
                  <p className="text-[11px] text-[#6B7280]">No executions yet</p>
                  <p className="text-[9px] text-[#9CA3AF]">Run code to see history here</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {execHistory.map((h) => (
                    <div key={h.id} className="rounded border border-[#E6E7EB] bg-white px-2.5 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#111827]">{h.language}</span>
                        <span className="rounded bg-[#16A34A]/10 px-1.5 py-0.5 text-[8px] font-medium text-[#16A34A]">{h.verdict}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[9px] text-[#9CA3AF]">
                        <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {h.runtime}</span>
                        <span className="flex items-center gap-1"><HardDrive className="h-2.5 w-2.5" /> {h.memory}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {!rightOpen && (
        <button
          onClick={() => setRightOpen(true)}
          className="absolute right-2 top-2 z-10 rounded border border-[#E6E7EB] bg-white p-1.5 text-[#6B7280] hover:bg-[#FAFAFB] hover:text-[#111827] transition-colors"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}