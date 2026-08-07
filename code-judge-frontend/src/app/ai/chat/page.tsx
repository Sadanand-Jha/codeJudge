"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Cpu,
  HardDrive,
  CheckCircle,
  Loader2,
  Mic,
  X,
  FileText,
  MessageSquare,
  Code,
  Terminal,
  BookOpen,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Pin,
  Lightbulb,
  GraduationCap,
  Trophy,
  Zap,
  Bug,
  CheckSquare,
  PanelRightClose,
  PanelRightOpen,
  FileCode,
  Image as ImageIcon,
  Paperclip,
  Gauge,
  HelpCircle,
  Route,
  Library,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import ResizableSplitPane from "@/components/layout/ResizableSplitPane";

/* ─────────────────────────────────────────
   Design Tokens
   ───────────────────────────────────────── */
const COLORS = {
  bg: "#09090B",
  panel: "#111827",
  surface: "#0F1115",
  border: "#23252F",
  borderHover: "#32364A",
  accent: "#7C3AED",
  text: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
};

const MODELS = [
  { id: "gpt-5", label: "GPT-5", icon: "🤖" },
  { id: "claude", label: "Claude", icon: "🟣" },
  { id: "gemini", label: "Gemini", icon: "✨" },
  { id: "deepseek", label: "DeepSeek", icon: "🔍" },
  { id: "llama", label: "Llama", icon: "🦙" },
] as const;

const AI_MODES = [
  { id: "tutor", label: "Tutor", icon: GraduationCap },
  { id: "competitive", label: "Competitive", icon: Trophy },
  { id: "debugger", label: "Debugger", icon: Bug },
  { id: "interviewer", label: "Interviewer", icon: HelpCircle },
  { id: "teacher", label: "Teacher", icon: BookOpen },
  { id: "architect", label: "System Designer", icon: LayoutTemplate },
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

const SUGGESTIONS = [
  { label: "Solve DSA Problem", icon: Code, prompt: "Help me solve a DSA problem" },
  { label: "Debug Code", icon: Bug, prompt: "Help me debug this code" },
  { label: "Explain Algorithm", icon: BookOpen, prompt: "Explain how this algorithm works" },
  { label: "Optimize Solution", icon: Zap, prompt: "Optimize my solution" },
  { label: "Generate Tests", icon: CheckSquare, prompt: "Generate test cases" },
  { label: "Interview Prep", icon: GraduationCap, prompt: "Prepare for interviews" },
  { label: "Review Code", icon: FileCode, prompt: "Review this code" },
  { label: "Learn Topic", icon: Lightbulb, prompt: "Teach me about" },
  { label: "Competitive Programming", icon: Trophy, prompt: "Help with competitive programming" },
  { label: "System Design", icon: LayoutTemplate, prompt: "Design a system for" },
];

/* ─────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────── */

function LogoMark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]">
      <Sparkles className="h-4 w-4 text-white" />
    </div>
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

/* ─── MARKDOWN RENDERER ─── */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="text-[13px] leading-relaxed text-[#E5E7EB]">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="mb-1 mt-3 text-[14px] font-bold text-white">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="mb-1 mt-4 text-[16px] font-bold text-white">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="mb-2 mt-5 text-[18px] font-bold text-white">{line.slice(2)}</h1>;
        if (line.match(/^[-*] /)) return <li key={i} className="ml-4 list-disc text-[13px] text-[#E5E7EB]">{line.slice(2)}</li>;
        if (line.match(/^\d+\. /)) {
          const idx = line.indexOf(". ");
          return <li key={i} className="ml-4 list-decimal text-[13px] text-[#E5E7EB]">{line.slice(idx + 2)}</li>;
        }
        if (line.startsWith("> ")) return <blockquote key={i} className="mb-1 border-l-2 border-[#7C3AED] pl-3 text-[12px] italic text-muted-foreground">{line.slice(2)}</blockquote>;
        if (line.startsWith("```")) return null;
        if (line.includes("`")) {
          const parts = line.split(/(`[^`]+`)/g);
          return (
            <p key={i} className="mb-1 text-[13px]">
              {parts.map((part, j) =>
                part.startsWith("`") && part.endsWith("`") ? (
                  <code key={j} className="rounded bg-[#1F2937] px-1 py-0.5 text-[11px] font-mono text-[#A5F3FC]">{part.slice(1, -1)}</code>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i} className="mb-1 text-[13px] leading-relaxed text-[#E5E7EB]">{line}</p>;
      })}
    </div>
  );
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
    <div className="my-3 overflow-hidden rounded-lg border border-[#23252F] bg-[#0F1115]">
      <div className="flex items-center justify-between border-b border-[#23252F] bg-card px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: langColors[block.language] || "#6B7280" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{block.language}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowOutput(!showOutput)} className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Run"><Play className="h-3 w-3" /></button>
          <button className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Download"><Download className="h-3 w-3" /></button>
          <button onClick={copy} className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Copy">
            {copied ? <CheckCircle className="h-3 w-3 text-[#22C55E]" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-3">
        <pre className="text-[12px] leading-relaxed">
          <code className="font-mono text-[#E5E7EB]">{block.code}</code>
        </pre>
      </div>
      {showOutput && (
        <div className="border-t border-[#23252F] bg-card">
          <div className="flex items-center gap-2 border-b border-[#23252F] bg-[#0F1115] px-3 py-1.5">
            <Terminal className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Output</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 0.012s</span>
              <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> 2.4 MB</span>
              <span className="flex items-center gap-1 text-[#22C55E]"><CheckCircle className="h-3 w-3" /> Accepted</span>
            </div>
            <pre className="mt-2 rounded bg-[#0F1115] p-2 text-[12px] font-mono text-muted-foreground">// Output will appear here...</pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── MESSAGE BUBBLE ─── */
function MessageBubble({ message, onRegenerate }: { message: Message; onRegenerate?: () => void }) {
  const isUser = message.role === "user";

  return (
    <div className={`group flex w-full gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white">
        {isUser ? <span className="text-[10px] font-bold">U</span> : <Sparkles className="h-3.5 w-3.5" />}
      </div>

      <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : ""}`}>
        <div className={`flex items-center gap-1.5 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-[9px] text-[#6B7280]">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {message.model && <span className="rounded bg-[#7C3AED]/10 px-1.5 py-0.5 text-[8px] font-medium text-[#7C3AED]">{message.model}</span>}
        </div>

        {isUser ? (
          <div className="rounded-lg rounded-tr-sm bg-[#7C3AED]/20 px-3 py-2 text-[13px] text-white border border-[#7C3AED]/30">
            <p className="leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="rounded-lg rounded-tl-sm border border-[#23252F] bg-card px-3 py-2 shadow-sm">
            {message.thinking && (
              <div className="mb-2 flex items-center gap-2 rounded border border-[#23252F] bg-[#0F1115] p-2">
                <Spinner className="h-2.5 w-2.5 text-[#7C3AED]" />
                <span className="text-[10px] text-muted-foreground">Thinking...</span>
              </div>
            )}
            <MarkdownRenderer content={message.content} />
            {message.codeBlocks?.map((block) => <CodeBlock key={block.id} block={block} />)}
            {message.executionResult && <ExecutionCard result={message.executionResult} />}

            <div className="mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Copy"><Copy className="h-3 w-3" /></button>
              <button onClick={onRegenerate} className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Regenerate"><RefreshCw className="h-3 w-3" /></button>
              <button className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Bookmark"><Bookmark className="h-3 w-3" /></button>
              <button className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Save"><Save className="h-3 w-3" /></button>
              <button className="rounded p-1 text-muted-foreground hover:bg-[#1F2937] hover:text-white transition-colors" title="Notes"><StickyNote className="h-3 w-3" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── EXECUTION CARD ─── */
function ExecutionCard({ result }: { result: ExecutionResult }) {
  const passed = result.testCases.filter((t) => t.passed).length;
  const total = result.testCases.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const statusColor = result.status === "Accepted" ? "text-[#22C55E]" : result.status.includes("Error") || result.status.includes("Wrong") ? "text-[#EF4444]" : "text-[#F59E0B]";

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-[#23252F] bg-[#0F1115]">
      <div className="flex items-center justify-between bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 text-[#22C55E]" />
          <span className={`text-[11px] font-semibold ${statusColor}`}>{result.status}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#6B7280]">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {result.time}</span>
          <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {result.memory}</span>
        </div>
      </div>
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Test Cases: {passed}/{total}</span>
          <span className="text-[10px] text-[#6B7280]">{pct}%</span>
        </div>
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-[#23252F]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#EF4444] via-[#F59E0B] to-[#22C55E] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ─── EMPTY STATE ─── */
function EmptyState({ onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16">
      <div className="mb-6">
        <LogoMark />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">What would you like to build today?</h1>
      <p className="mb-8 text-sm text-muted-foreground">Ask anything about algorithms, competitive programming, debugging or interviews.</p>
      <div className="grid max-w-3xl grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={() => onSuggestion(s.prompt)} className="group flex flex-col items-center gap-2 rounded-xl border border-[#23252F] bg-card p-4 text-center hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/10 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all">
              <Icon className="h-5 w-5 text-[#7C3AED]" />
              <span className="text-[11px] font-medium text-[#E5E7EB] group-hover:text-white transition-colors">{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────── */
export default function AIChatPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<"conversation" | "problem" | "memory" | "tools">("conversation");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<string>("gpt-5");
  const [modelOpen, setModelOpen] = useState(false);
  const [aiMode, setAiMode] = useState<string>("tutor");
  const [modeOpen, setModeOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationGroups, setConversationGroups] = useState<{ today: Conversation[]; yesterday: Conversation[]; week: Conversation[]; older: Conversation[] }>({ today: [], yesterday: [], week: [], older: [] });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const now = Date.now();
    const makeConvs = (count: number, offsetMinutes: number): Conversation[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `conv-${offsetMinutes}-${i}`,
        title: `Conversation ${offsetMinutes}-${i + 1}`,
        preview: "Recent discussion about algorithms and data structures...",
        time: now - offsetMinutes * 60 * 1000 - i * 60000,
        messages: Math.floor(Math.random() * 20) + 1,
        model: MODELS[Math.floor(Math.random() * MODELS.length)].id,
        unread: i === 0 && offsetMinutes < 60,
      }));

    setConversationGroups({
      today: makeConvs(3, 30),
      yesterday: makeConvs(4, 24 * 60),
      week: makeConvs(5, 3 * 24 * 60),
      older: makeConvs(6, 10 * 24 * 60),
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
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
        content: "Here is an analysis of your code. **Time complexity:** O(n log n). **Space complexity:** O(n).\n\n```python\ndef solve(arr):\n    arr.sort()\n    return [x * 2 for x in arr]\n```\n\nThe main bottleneck is the sorting step.",
        timestamp: Date.now(),
        model: model.toUpperCase(),
        codeBlocks: [{ id: "cb-1", language: "python", code: "def solve(arr):\n    arr.sort()\n    return [x * 2 for x in arr]" }],
        executionResult: {
          status: "Accepted", stdout: "[2, 4, 6, 8, 10]", stderr: "", time: "0.012s", memory: "2.4 MB",
          testCases: [
            { id: 0, passed: true, input: "[1,2,3,4,5]", expected: "[2,4,6,8,10]", output: "[2,4,6,8,10]" },
            { id: 1, passed: true, input: "[]", expected: "[]", output: "[]" },
          ],
        },
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 2000);
  }, [input, isLoading, model]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSuggestion = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const groupedConversations = useMemo(() => {
    const groups = [
      { key: "today" as const, label: "Today", items: conversationGroups.today },
      { key: "yesterday" as const, label: "Yesterday", items: conversationGroups.yesterday },
      { key: "week" as const, label: "Previous 7 Days", items: conversationGroups.week },
      { key: "older" as const, label: "Older", items: conversationGroups.older },
    ];
    return groups.filter((g) => g.items.length > 0);
  }, [conversationGroups.today, conversationGroups.yesterday, conversationGroups.week, conversationGroups.older]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden" style={{ backgroundColor: COLORS.bg }}>
        <ResizableSplitPane
          storageKey="ai-left-panel"
          leftMin={220}
          rightMin={320}
          editorLayout={() => {}}
          left={
            <div className="flex h-full flex-col border-r" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2">
                  <LogoMark />
                  <div>
                    <div className="text-[12px] font-bold text-white">ByteClash AI</div>
                    <div className="text-[8px] text-[#7C3AED] font-medium">PREMIUM</div>
                  </div>
                </div>
                <button onClick={() => setLeftOpen(false)} className="rounded p-1 text-[#6B7280] hover:bg-[#1F2937] hover:text-white transition-colors">
                  <PanelLeftClose className="h-3.5 w-3.5 rotate-180" />
                </button>
              </div>

              <div className="px-2 py-2">
                <button
                  onClick={() => { setMessages([]); setSelectedChat(null); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-3 py-2 text-[12px] font-semibold text-white hover:shadow-[0_0_12px_rgba(124,58,237,0.4)] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Chat
                  <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[8px]">Ctrl K</span>
                </button>
              </div>

              <div className="relative px-2 pb-2">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6B7280]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-lg border py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-[#7C3AED]/50 transition-colors"
                  style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface, color: "white" }}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-2">
                {groupedConversations.map((group: { key: string; label: string; items: Conversation[] }) => (
                  <div key={group.key} className="mb-3">
                    <div className="mb-0.5 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#6B7280]">{group.label}</div>
                    {group.items.map((conv: Conversation) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedChat(conv.id)}
                        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                          selectedChat === conv.id ? "bg-[#7C3AED]/10 border-l-2 border-[#7C3AED]" : "hover:bg-[#1F2937] border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="truncate text-[11px] font-medium text-white">{conv.title}</div>
                            {conv.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C3AED]" />}
                          </div>
                          <div className="truncate text-[9px] text-[#6B7280]">{conv.preview}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="rounded p-0.5 text-[#6B7280] hover:text-white transition-colors"><PenLine className="h-3 w-3" /></button>
                          <button className="rounded p-0.5 text-[#6B7280] hover:text-[#EF4444] transition-colors"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="border-t px-2 py-2" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#1F2937] transition-colors cursor-pointer">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-[8px] font-bold text-white">JD</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-white">John Doe</div>
                    <div className="text-[8px] text-[#6B7280]">Free Plan · 12.4K tokens</div>
                  </div>
                  <button className="rounded p-1 text-[#6B7280] hover:text-white transition-colors"><Settings className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          }
          right={
            <div className="flex h-full flex-col" style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg }}>
              <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: COLORS.border }}>
                <div className="flex items-center gap-2">
                  <h2 className="text-[12px] font-semibold text-white">New Conversation</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setModelOpen(!modelOpen)}
                      className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors"
                      style={{ borderColor: COLORS.border, color: "#E5E7EB" }}
                    >
                      <Sparkles className="h-3 w-3 text-[#7C3AED]" />
                      {MODELS.find((m) => m.id === model)?.label}
                      <ChevronDown className="h-2.5 w-2.5 text-[#6B7280]" />
                    </button>
                    {modelOpen && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border shadow-lg" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                        {MODELS.map((m) => (
                          <button key={m.id} onClick={() => { setModel(m.id); setModelOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors ${model === m.id ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-[#E5E7EB] hover:bg-[#1F2937]"}`}>
                            <span>{m.icon}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setModeOpen(!modeOpen)}
                      className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors"
                      style={{ borderColor: COLORS.border, color: "#E5E7EB" }}
                    >
                      {AI_MODES.find((m) => m.id === aiMode)?.label}
                      <ChevronDown className="h-2.5 w-2.5 text-[#6B7280]" />
                    </button>
                    {modeOpen && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border shadow-lg" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                        {AI_MODES.map((m) => (
                          <button key={m.id} onClick={() => { setAiMode(m.id); setModeOpen(false); }} className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors ${aiMode === m.id ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-[#E5E7EB] hover:bg-[#1F2937]"}`}>
                            <m.icon className="h-3.5 w-3.5" />
                            {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {messages.length === 0 && !isLoading ? (
                  <EmptyState onSuggestion={handleSuggestion} />
                ) : (
                  <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
                    {messages.map((msg) => <MessageBubble key={msg.id} message={msg} onRegenerate={() => {}} />)}
                    {isLoading && (
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="rounded-lg rounded-tl-sm border border-[#23252F] bg-card px-3 py-2">
                          <div className="mb-1 flex items-center gap-2">
                            <Spinner className="h-3 w-3 text-[#7C3AED]" />
                            <span className="text-[11px] text-muted-foreground">Thinking...</span>
                          </div>
                          <TypingDots />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              <div className="border-t px-4 py-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.panel }}>
                {messages.length === 0 && !isLoading && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {QUICK_ACTIONS.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button key={a.label} onClick={() => handleSuggestion(a.prompt)} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] transition-all hover:border-[#7C3AED]/40 hover:bg-[#7C3AED]/10" style={{ borderColor: COLORS.border, color: "#9CA3AF" }}>
                          <Icon className="h-3 w-3" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-end gap-1.5 rounded-xl border px-3 py-2" style={{ borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
                  <div className="flex items-center gap-1">
                    <button className="rounded p-1 text-[#6B7280] hover:text-white transition-colors" title="Upload Image"><ImageIcon className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-[#6B7280] hover:text-white transition-colors" title="Attach File"><Paperclip className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-[#6B7280] hover:text-white transition-colors" title="Paste Code"><FileCode className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-[#6B7280] hover:text-white transition-colors" title="Import Editor"><Code className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1 text-[#6B7280] hover:text-white transition-colors" title="Voice"><Mic className="h-3.5 w-3.5" /></button>
                  </div>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about algorithms, debugging, system design or competitive programming..."
                    className="flex-1 resize-none bg-transparent py-1.5 text-[13px] text-white placeholder-[#6B7280] outline-none"
                    rows={1}
                    style={{ minHeight: "24px", maxHeight: "120px" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white hover:shadow-[0_0_12px_rgba(124,58,237,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-1 text-center text-[8px] text-[#6B7280]">Enter to send · Shift+Enter for newline</div>
              </div>
            </div>
          }
        />
      </div>
    </AppLayout>
  );
}