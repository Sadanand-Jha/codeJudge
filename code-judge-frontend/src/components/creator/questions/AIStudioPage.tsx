"use client";

import { useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  File,
  FileSpreadsheet,
  FileText,
  Image,
  Minus,
  Plus,
  Presentation,
  Send,
  Sparkles,
  Upload,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  BillButton,
  EmptyState,
  ErrorState,
  MockDataTag,
  PageHeader,
  Panel,
  PanelSkeleton,
  SegmentedControl,
  StatCardSkeleton,
  StatusBadge,
} from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";

type AiTab = "files" | "topic" | "chat";

interface GenerationItem {
  id: string;
  name: string;
  source: string;
  status: "Ready" | "Processing" | "Failed";
  questionCount: number;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
}

const AI_TABS = [
  { id: "files", label: "Generate from Files" },
  { id: "topic", label: "Generate by Topic" },
  { id: "chat", label: "Ask AI" },
] as const;

const GEN_STATUS_TONE: Record<GenerationItem["status"], "emerald" | "sky" | "rose"> = {
  Ready: "emerald",
  Processing: "sky",
  Failed: "rose",
};

const RECENT_GENERATIONS: GenerationItem[] = [
  {
    id: "g1",
    name: "Class 12 Physics — Rotational Motion (20 Q)",
    source: "rotational_motion.pdf",
    status: "Ready",
    questionCount: 20,
    createdAt: "20 Aug 2026",
  },
  {
    id: "g2",
    name: "NEET Biology — Genetics Pack",
    source: "genetics_notes.docx",
    status: "Ready",
    questionCount: 15,
    createdAt: "19 Aug 2026",
  },
  {
    id: "g3",
    name: "Quantitative Aptitude — Speed & Time",
    source: "Topic: Speed, Distance & Time",
    status: "Processing",
    questionCount: 12,
    createdAt: "19 Aug 2026",
  },
  {
    id: "g4",
    name: "Chemistry — Organic Nomenclature",
    source: "nomenclature_slides.pptx",
    status: "Failed",
    questionCount: 0,
    createdAt: "18 Aug 2026",
  },
];

const AI_INTRO: ChatMessage = {
  id: "intro",
  role: "ai",
  text: "Hi! I'm your question-builder assistant. Paste a line from your syllabus, a paragraph from a textbook, or describe the kind of questions you need — and I'll draft a ready-to-review question set tagged by subject, type and difficulty.",
};

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Quantitative Aptitude", "Reasoning", "English"];
const QUESTION_TYPES = ["Single Choice", "Multiple Choice", "Integer", "True-False", "Mixed"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"];

const FORMATS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "PDF", icon: FileText },
  { label: "DOCX", icon: File },
  { label: "PPT", icon: Presentation },
  { label: "CSV", icon: FileSpreadsheet },
  { label: "TXT", icon: FileText },
  { label: "Images", icon: Image },
];

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-2.5 pr-9 text-[13px] text-text-primary outline-none transition-colors focus:border-pink-500/40 dark:focus:border-ai-accent/40"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  );
}

export function AIStudioPage({ demoState }: { demoState?: "empty" | "error" }) {
  const toast = useToast();
  const { state, data, retry } = useBillingData(
    () => ({ generations: RECENT_GENERATIONS }),
    { delayMs: 650, demoState }
  );

  const [tab, setTab] = useState<AiTab>("files");
  const [generating, setGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileCount, setFileCount] = useState(0);

  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [qType, setQType] = useState("Mixed");
  const [difficulty, setDifficulty] = useState("Mixed");
  const [count, setCount] = useState(10);

  const [messages, setMessages] = useState<ChatMessage[]>([AI_INTRO]);
  const [draft, setDraft] = useState("");

  const generations = data?.generations ?? RECENT_GENERATIONS;

  const handleFiles = (files: FileList | null) => {
    const n = files?.length ?? 0;
    if (n === 0) return;
    setFileCount((c) => c + n);
    toast.success({
      title: "Files added",
      description: `${n} file${n === 1 ? "" : "s"} ready for question generation.`,
    });
  };

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast.info({
        title: "Question generation queued",
        description: "You'll be notified when your question set is ready to review.",
      });
    }, 1200);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, role: "user", text }]);
    setDraft("");
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "ai",
          text: `Got it — I'll draft a question set around "${text.length > 60 ? `${text.slice(0, 60)}…` : text}". Review it under Recent generations once it's ready.`,
        },
      ]);
    }, 700);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Studio"
        subtitle="Generate questions from your materials with AI."
        badge={<MockDataTag />}
      />

      {state === "loading" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <PanelSkeleton />
        </>
      )}
      {state === "error" && (
        <ErrorState onRetry={retry} message="We couldn't load AI Studio. Please try again in a moment." />
      )}
      {state === "empty" && (
        <EmptyState
          title="No AI generations yet"
          description="Generate your first question set from a file, a topic, or a quick chat with the assistant."
          action={
            <BillButton icon={<Sparkles className="h-4 w-4" />} onClick={() => setTab("files")}>
              Get started
            </BillButton>
          }
        />
      )}

      {state === "ready" && (
        <>
          <SegmentedControl value={tab} onChange={setTab} options={AI_TABS} size="md" />

          {tab === "files" && (
            <Panel title="Generate from Files" subtitle="Upload your materials and extract questions in minutes.">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
                  dragging
                    ? "border-pink-500/50 bg-pink-500/[0.06] dark:border-ai-accent/50"
                    : "border-border bg-card hover:border-pink-500/30 dark:hover:border-ai-accent/30"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 dark:text-ai-accent">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-text-primary">Drag &amp; drop or browse</p>
                <p className="mt-1 text-[13px] text-text-secondary">PDF, DOCX, PPT, CSV, TXT, Images</p>
                {fileCount > 0 && (
                  <p className="mt-2 text-xs font-semibold text-pink-500 dark:text-ai-accent">
                    {fileCount} file{fileCount === 1 ? "" : "s"} selected
                  </p>
                )}
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {FORMATS.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
                  >
                    <Icon className="h-3.5 w-3.5 text-text-muted" />
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <BillButton
                  icon={<Sparkles className="h-4 w-4" />}
                  loading={generating}
                  onClick={generate}
                  disabled={generating}
                >
                  {generating ? "Generating..." : "Generate Questions"}
                </BillButton>
                <p className="text-[11px] text-text-muted">
                  Files are processed privately — your materials are never used for training.
                </p>
              </div>
            </Panel>
          )}

          {tab === "topic" && (
            <Panel title="Generate by Topic" subtitle="Describe the topic and we'll build a question set around it.">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">Topic</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion"
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-pink-500/40 dark:focus:border-ai-accent/40"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <SelectField label="Subject" value={subject} options={SUBJECTS} onChange={setSubject} />
                  <SelectField label="Question Type" value={qType} options={QUESTION_TYPES} onChange={setQType} />
                  <SelectField label="Difficulty" value={difficulty} options={DIFFICULTIES} onChange={setDifficulty} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3">
                  <label className="text-xs font-semibold text-text-secondary">Number of Questions</label>
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      aria-label="Fewer questions"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-text-primary tabular-nums">{count}</span>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.min(50, c + 1))}
                      aria-label="More questions"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <BillButton
                    icon={<Sparkles className="h-4 w-4" />}
                    loading={generating}
                    onClick={generate}
                    disabled={generating}
                  >
                    {generating ? "Generating..." : "Generate"}
                  </BillButton>
                  <p className="text-[11px] text-text-muted">
                    {count} questions · {subject} · {difficulty}
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {tab === "chat" && (
            <Panel title="Ask AI" subtitle="Chat with the assistant to draft or refine questions." noPadding>
              <div className="flex min-h-[280px] flex-col">
                <div className="flex-1 space-y-3 p-5">
                  {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                          m.role === "user"
                            ? "rounded-br-md bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                            : "rounded-bl-md border border-border bg-white/[0.03] text-text-primary"
                        )}
                      >
                        {m.role === "ai" && (
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-pink-500 dark:text-ai-accent">
                            <Bot className="h-3.5 w-3.5" />
                            AI Assistant
                          </div>
                        )}
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-border p-4">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                    placeholder="Ask for a question set, hints, or a syllabus mapping..."
                    className="h-10 flex-1 rounded-xl border border-border bg-card px-4 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-pink-500/40 dark:focus:border-ai-accent/40"
                  />
                  <button
                    type="button"
                    onClick={send}
                    aria-label="Send message"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:brightness-105 active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Panel>
          )}

          <Panel title="Recent generations" subtitle="Question sets generated by AI, ready for your review.">
            <div className="space-y-2.5">
              {generations.map((g) => {
                const Icon = g.status === "Failed" ? XCircle : g.status === "Processing" ? Clock : CheckCircle2;
                const toneClass =
                  g.status === "Failed"
                    ? "bg-rose-500/10 text-rose-500"
                    : g.status === "Processing"
                      ? "bg-sky-500/10 text-sky-500"
                      : "bg-emerald-500/10 text-emerald-500";
                return (
                  <div
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3 transition-colors hover:border-border-hover"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-text-primary">{g.name}</p>
                        <p className="truncate text-[11px] text-text-muted">
                          {g.source} · {g.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-text-secondary tabular-nums">
                        {g.status === "Processing" ? "—" : `${g.questionCount} questions`}
                      </span>
                      <StatusBadge label={g.status} tone={GEN_STATUS_TONE[g.status]} dot />
                      {g.status === "Ready" && (
                        <BillButton
                          variant="ghost"
                          onClick={() =>
                            toast.info({
                              title: "Review question set",
                              description: "This will open the question review editor.",
                            })
                          }
                        >
                          Review
                        </BillButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}