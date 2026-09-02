"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  Code,
  Link as LinkIcon,
  Table,
  Sigma,
  Paperclip,
  X,
  Sparkles,
  Clock,
  Award,
  Hash,
  CircleDot,
  ListChecks,
  ToggleRight,
  Type,
  AlignLeft,
  Code2,
  FileText,
  Save,
  Eye,
  Loader2,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Settings2,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import {
  syncQuizQuestions,
  syncQuizProblemsThenAdd,
  validateProblemsForContinue,
} from "@/utils/quizQuestionSync";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_ORDER,
  VISIBILITY_OPTIONS,
  getQuestionStatus,
  type CreatorQuestion,
  type CreatorQuestionType,
} from "@/components/quiz/creator/types";
import { useQuizSettings } from "@/components/quiz/creator/settings/QuizSettingsContext";
import { downloadQuizPaperPdf } from "@/utils/quizPdf";
import { type PdfConfig, type PdfStudent } from "@/utils/pdfConfig";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/helpers";
import PdfConfigModal from "@/components/quiz/creator/settings/PdfConfigModal";
import { computeQuestionsSignature, getSyncedSignature, setSyncedSignature } from "@/utils/quizStorage";

const QUESTION_TYPES: Array<{ id: CreatorQuestionType; label: string; short: string; icon: any; desc: string }> = [
  { id: "single_choice", label: "Multiple Choice", short: "MCQ", icon: CircleDot, desc: "Single correct answer" },
  { id: "multiple_choice", label: "Multiple Select", short: "Multi", icon: ListChecks, desc: "Multiple correct answers" },
  { id: "true_false", label: "True / False", short: "T/F", icon: ToggleRight, desc: "Binary choice" },
  { id: "fill_blanks", label: "Fill in the Blank", short: "Fill", icon: FileText, desc: "Complete the sentence" },
  { id: "text", label: "Short Answer", short: "Short", icon: Type, desc: "Brief text response" },
];

const WIZARD_STEPS = ["Setup", "Questions", "Settings", "Audience", "Registration", "Pricing", "Branding", "Review", "Publish"];

export default function QuizProblemsPreview({ focusId }: { focusId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { quizId, code, isLive, isEnded, details, quiz } = useQuizSettings();
  const problems = useQuizProblemsStore((s) => s.problems);
  const activeProblemId = useQuizProblemsStore((s) => s.activeProblemId);
  const hydrate = useQuizProblemsStore((s) => s.hydrate);
  const updateProblem = useQuizProblemsStore((s) => s.updateProblem);
  const setActiveProblem = useQuizProblemsStore((s) => s.setActiveProblem);
  const duplicateProblem = useQuizProblemsStore((s) => s.duplicateProblem);
  const reorderProblem = useQuizProblemsStore((s) => s.reorderProblem);
  const deleteProblem = useQuizProblemsStore((s) => s.deleteProblem);
  const deleteAllProblems = useQuizProblemsStore((s) => s.deleteAllProblems);

  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [showMarksMenu, setShowMarksMenu] = useState(false);
  const [showAfterAnswer, setShowAfterAnswer] = useState(false);
  const [afterTab, setAfterTab] = useState<"explanation" | "hint" | "solution">("explanation");
  const [editorFocused, setEditorFocused] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState<string | null>(null);
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const [dragOverOption, setDragOverOption] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => hydrate(), [hydrate]);
  useEffect(() => {
    if (focusId && problems.some((p) => p.id === focusId)) setActiveProblem(focusId);
  }, [focusId, problems, setActiveProblem]);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSyncQuestions();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleContinue();
      }
      if (!isInput && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const idx = problems.findIndex((p) => p.id === activeProblemId);
        if (e.key === "ArrowUp" && idx > 0) setActiveProblem(problems[idx - 1].id);
        if (e.key === "ArrowDown" && idx < problems.length - 1) setActiveProblem(problems[idx + 1].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems, activeProblemId]);

  const problemsBase = pathname.replace(/\/problems(\/.*)?$/, "/problems");
  const activeIndex = problems.findIndex((p) => p.id === activeProblemId);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const current = problems[safeIndex];
  const total = problems.length;
  const complete = problems.filter((q) => getQuestionStatus(q) === "complete").length;
  const currentSig = computeQuestionsSignature(problems);
  const savedSig = code ? getSyncedSignature(code) : null;
  const isSynced = total > 0 && currentSig === savedSig;
  const lockSync = Boolean(isLive || isEnded);

  const formatSavedAgo = () => {
    if (isSynced) return "Saved just now";
    if (!savedSig) return "Not saved";
    return "Unsaved changes";
  };

  const handleAdd = async () => {
    if (adding) return;
    const store = useQuizProblemsStore.getState();
    if (store.problems.length >= 25) {
      toast.error({ title: "Problem limit reached", description: "A quiz can have at most 25 problems." });
      return;
    }
    setAdding(true);
    try {
      const id = await syncQuizProblemsThenAdd(quizId, store.problems, store.addProblem);
      router.push(`${problemsBase}/${id}`);
    } catch (err) {
      console.error(err);
      toast.error({ title: "Could not add question", description: "The current question couldn't be saved. Please try again." });
    } finally {
      setAdding(false);
    }
  };

  const handleSyncQuestions = async () => {
    if (!quizId) {
      toast.error({ title: "Quiz not saved yet", description: "Save the quiz draft first, then save your questions." });
      return;
    }
    if (syncing) return;
    setSyncing(true);
    try {
      await syncQuizQuestions(String(quizId), problems);
      setSyncedSignature(code, currentSig);
      toast.success({ title: "Questions saved", description: `All ${problems.length} questions are saved to the server.` });
    } catch {
      toast.error({ title: "Could not save questions", description: "Something went wrong. Please try again." });
    } finally {
      setSyncing(false);
    }
  };

  const handleContinue = async () => {
    if (continuing) return;
    const issues = validateProblemsForContinue(problems);
    if (issues.length > 0) {
      const shown = issues.slice(0, 3).map((i) => i.message).join(" ");
      const extra = issues.length > 3 ? ` and ${issues.length - 3} more.` : "";
      toast.error({ title: `${issues.length} question${issues.length !== 1 ? "s" : ""} need your attention`, description: `${shown}${extra}` });
      return;
    }
    if (!quizId) {
      toast.error({ title: "Quiz not saved yet", description: "Save the quiz draft first so the questions can be saved to it." });
      return;
    }
    setContinuing(true);
    try {
      await syncQuizQuestions(String(quizId), problems);
      setSyncedSignature(code, currentSig);
      toast.success({ title: "All questions saved", description: `${problems.length} question${problems.length !== 1 ? "s" : ""} saved.` });
      router.push(`/quiz/${code}/settings/info`);
    } catch {
      toast.error({ title: "Could not save questions", description: "Something went wrong while saving. Please try again." });
    } finally {
      setContinuing(false);
    }
  };

  const handleDownloadPdf = (config: PdfConfig, students: PdfStudent[]) => {
    setPdfModalOpen(false);
    if (total === 0) return;
    setGeneratingPdf(true);
    downloadQuizPaperPdf(
      {
        config,
        meta: {
          quizName: details.name || quiz?.name || "Quiz",
          subject: details.subject,
          description: details.description,
          difficulty: details.difficulty,
          timeLimit: details.timeLimit ? `${details.timeLimit} min` : undefined,
          topic: details.topic,
          visibility: VISIBILITY_OPTIONS.find((v) => v.id === details.visibility)?.label ?? details.visibility,
          quizId: quiz?.code ?? code,
          creatorName: quiz?.creator_name ?? undefined,
          totalQuestions: problems.length,
          totalMarks: problems.reduce((sum, q) => sum + (q.marks || 0), 0),
        },
        questions: problems,
        student: null,
      },
      students
    )
      .then(() => toast.success({ title: "Question paper downloaded", description: "PDF generated." }))
      .catch(() => toast.error({ title: "Could not generate PDF", description: "Something went wrong." }))
      .finally(() => setGeneratingPdf(false));
  };

  const handleDeleteAll = () => {
    if (total === 0) return;
    deleteAllProblems();
    setConfirmDeleteAll(false);
    setSyncedSignature(code, "");
    const toastId = toast.success({
      title: "All questions deleted",
      description: `${total} question${total !== 1 ? "s" : ""} removed. Use Ctrl+Z to restore.`,
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          toast.dismiss(toastId);
          const label = useQuizProblemsStore.getState().undo();
          if (label) toast.success({ title: "Undo successful", description: label });
        },
      },
    });
  };

  const filtered = problems.filter((q) => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return q.title.toLowerCase().includes(s) || q.type.toLowerCase().includes(s);
  });

  const reorderQuestions = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIdx = problems.findIndex((x) => x.id === fromId);
    const toIdx = problems.findIndex((x) => x.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    reorderProblem(fromIdx, toIdx);
  };

  const updateOption = (idx: number, patch: Partial<CreatorQuestion["options"][0]>) => {
    if (!current) return;
    const next = [...current.options];
    next[idx] = { ...next[idx], ...patch };
    updateProblem(current.id, { options: next });
  };

  const toggleCorrect = (idx: number) => {
    if (!current) return;
    const isMulti = current.type === "multiple_choice";
    const next = current.options.map((o, i) => ({ ...o, isCorrect: isMulti ? (i === idx ? !o.isCorrect : o.isCorrect) : i === idx }));
    updateProblem(current.id, { options: next });
  };

  const addOption = () => {
    if (!current || current.options.length >= 8) return;
    const next = [...current.options, { id: `opt_${Date.now()}`, label: String.fromCharCode(65 + current.options.length), content: "", isCorrect: false }];
    updateProblem(current.id, { options: next });
  };

  const reorderOptions = (from: number, to: number) => {
    if (!current || to < 0 || to >= current.options.length) return;
    const reordered = [...current.options];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    updateProblem(current.id, { options: reordered.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !current) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateProblem(current.id, { images: [...current.images, { id: `img_${Date.now()}`, url: ev.target?.result as string }] });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleOptionImage = (idx: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = (ev) => updateOption(idx, { imageUrl: ev.target?.result as string });
      r.readAsDataURL(file);
    };
    input.click();
  };

  if (total === 0) {
    return (
      <div className="flex flex-col bg-[#FCFCF9] min-h-[500px] rounded-2xl border border-zinc-200 overflow-visible">
        <div className="h-[56px] shrink-0 border-b border-zinc-200 bg-white flex items-center px-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-zinc-900 truncate">{details.name || "Untitled Quiz"}</span>
            <span className="hidden sm:inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Draft</span>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-zinc-400 ml-6">
            {WIZARD_STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                <span className={s === "Questions" ? "font-semibold text-zinc-900" : ""}>{s}</span>
                {i < WIZARD_STEPS.length - 1 && <span className="text-zinc-300">→</span>}
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleAdd} disabled={adding} className="h-8 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add Question
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900">Build your first question</h2>
            <p className="text-sm text-zinc-500 mt-2">Create a question manually or let AI generate one from your content.</p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={handleAdd} disabled={adding} className="h-9 px-5 rounded-xl bg-zinc-900 text-white text-sm font-medium inline-flex items-center gap-1.5">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Question
              </button>
              <button onClick={handleAdd} className="h-9 px-5 rounded-xl border border-zinc-200 bg-white text-sm font-medium">Generate with AI</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">Loading…</div>
    );
  }

  const activeTypeMeta = QUESTION_TYPES.find((t) => t.id === current.type)!;
  const isChoiceType = current.type === "single_choice" || current.type === "multiple_choice" || current.type === "true_false";
  const isTextType = current.type === "fill_blanks" || current.type === "integer" || current.type === "text" || current.type === "paragraph";

  return (
    <div className="flex flex-col bg-[#FCFCF9] rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Top header 56px */}
      <header className="h-[56px] shrink-0 border-b border-zinc-200 bg-white flex items-center px-4 gap-4">
        <button onClick={() => router.push(`/quiz/${code}`)} className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="sm:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200">
          <MoreHorizontal className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-zinc-900 truncate max-w-[160px] sm:max-w-[240px]">{details.name || "Untitled Quiz"}</span>
            <span className="hidden sm:inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Draft</span>
            <span className="hidden md:inline text-xs text-zinc-400">·</span>
            <span className="hidden md:inline text-xs text-zinc-500">{total} questions</span>
            <span className="hidden lg:inline-flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> {formatSavedAgo()}
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-1 mt-0.5 text-[11px] text-zinc-400">
            {WIZARD_STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                <span className={s === "Questions" ? "font-semibold text-zinc-900" : ""}>{s}</span>
                {i < WIZARD_STEPS.length - 1 && <span className="text-zinc-300">→</span>}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden xl:inline text-xs text-zinc-500">{complete} / {total} complete</span>
          <button onClick={() => setPdfModalOpen(true)} className="hidden sm:inline-flex h-8 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={handleSyncQuestions} disabled={syncing || isSynced || lockSync} className="hidden sm:inline-flex h-8 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 items-center gap-1.5 disabled:opacity-40">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Draft
          </button>
          <button onClick={handleContinue} disabled={continuing || lockSync} className="h-8 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 flex items-center gap-1.5 disabled:opacity-40">
            Continue <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left Navigator 250px */}
        <aside className={`${mobileNavOpen ? "flex" : "hidden"} sm:flex w-[250px] shrink-0 border-r border-zinc-200 bg-white flex-col min-h-0`}>
          <div className="px-3 pt-4 pb-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-900">Questions</h2>
              <span className="text-[11px] font-medium rounded-full bg-zinc-900 text-white px-2 py-0.5">{total}</span>
            </div>
            <div className="mt-3 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search questions..." className="w-full h-8 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-xs placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
            {filtered.map((q, i) => {
              const realIdx = problems.findIndex((x) => x.id === q.id);
              const status = getQuestionStatus(q);
              const isActive = q.id === current.id;
              return (
                <div
                  key={q.id}
                  draggable
                  onDragStart={() => setDraggedQuestion(q.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedQuestion) reorderQuestions(draggedQuestion, q.id);
                    setDraggedQuestion(null);
                  }}
                  onClick={() => {
                    setActiveProblem(q.id);
                    setMobileNavOpen(false);
                    router.push(`${problemsBase}/${q.id}`);
                  }}
                  className={`group relative flex flex-col justify-center rounded-xl border px-3 py-3 cursor-pointer h-[64px] ${isActive ? "bg-violet-50 border-violet-200 shadow-sm border-l-[3px] border-l-violet-600" : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[11px] font-bold tabular-nums mt-0.5 ${isActive ? "text-violet-600" : "text-zinc-400"}`}>{String(realIdx + 1).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-tight line-clamp-1 ${isActive ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"}`} dangerouslySetInnerHTML={{ __html: q.title?.trim() || "Untitled question" }} />
                      <p className="text-[11px] text-zinc-500 truncate">
                        {QUESTION_TYPES.find((t) => t.id === q.type)?.short || q.type} · {q.difficulty} · {q.marks} marks
                      </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${status === "complete" ? "bg-emerald-500" : status === "missing_answer" ? "bg-amber-400" : "bg-zinc-300"}`} />
                  </div>
                  <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white rounded-lg border border-zinc-200 p-0.5 shadow-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const id = duplicateProblem(q.id);
                        router.push(`${problemsBase}/${id}`);
                      }}
                      className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProblem(q.id);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-zinc-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="p-1 text-zinc-400 cursor-grab">
                      <GripVertical className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-zinc-100 space-y-2">
            <button onClick={handleAdd} disabled={adding} className="w-full h-9 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 flex items-center justify-center gap-1.5 disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add question
            </button>
            <button onClick={() => toast.success("AI Generate coming soon")} className="w-full h-9 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" /> AI Generate
            </button>
          </div>
        </aside>

        {/* Center Canvas — 60-65% dominant */}
        <main className="bg-[#FCFCF9] min-w-0">
          <div className="max-w-[720px] mx-auto px-6 sm:px-8 py-8 pb-24">
            <div className="flex items-center justify-between">
              <h1 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Question {String(safeIndex + 1).padStart(2, "0")}</h1>
              <span className="text-xs text-zinc-400">
                {safeIndex + 1} / {total}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <button onClick={() => setShowTypeMenu(!showTypeMenu)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50">
                  <activeTypeMeta.icon className="w-3.5 h-3.5" />
                  {activeTypeMeta.short} <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
                {showTypeMenu && (
                  <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-zinc-200 bg-white shadow-xl z-20 overflow-hidden">
                    {QUESTION_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          updateProblem(current.id, { type: t.id });
                          setShowTypeMenu(false);
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-zinc-50 ${current.type === t.id ? "bg-violet-50" : ""}`}
                      >
                        <t.icon className={`w-4 h-4 mt-0.5 ${current.type === t.id ? "text-violet-600" : "text-zinc-500"}`} />
                        <div>
                          <p className={`text-xs font-medium ${current.type === t.id ? "text-violet-700" : "text-zinc-900"}`}>{t.label}</p>
                          <p className="text-[11px] text-zinc-500">{t.desc}</p>
                        </div>
                        {current.type === t.id && <Check className="w-4 h-4 text-violet-600 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-zinc-300">·</span>
              <div className="relative">
                <button onClick={() => setShowDifficultyMenu(!showDifficultyMenu)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50">
                  {current.difficulty} <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
                {showDifficultyMenu && (
                  <div className="absolute left-0 top-full mt-2 w-40 rounded-xl border border-zinc-200 bg-white shadow-xl z-20 p-1">
                    {(["Easy", "Medium", "Hard", "Expert"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          updateProblem(current.id, { difficulty: d });
                          setShowDifficultyMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${current.difficulty === d ? "bg-zinc-900 text-white" : "hover:bg-zinc-100 text-zinc-700"}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-zinc-300">·</span>
              <div className="relative">
                <button onClick={() => setShowMarksMenu(!showMarksMenu)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50">
                  {current.marks} marks <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
                {showMarksMenu && (
                  <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-zinc-200 bg-white shadow-xl z-20 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-[11px] font-medium text-zinc-600">
                        Marks <input type="number" value={current.marks} onChange={(e) => updateProblem(current.id, { marks: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" />
                      </label>
                      <label className="text-[11px] font-medium text-zinc-600">
                        Negative <input type="number" value={current.negativeMarks} onChange={(e) => updateProblem(current.id, { negativeMarks: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" />
                      </label>
                      <label className="text-[11px] font-medium text-zinc-600">
                        Time (min) <input type="number" value={current.expectedTime} onChange={(e) => updateProblem(current.id, { expectedTime: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs" />
                      </label>
                    </div>
                    <button onClick={() => setShowMarksMenu(false)} className="mt-3 w-full h-7 rounded-lg bg-zinc-900 text-white text-xs">
                      Done
                    </button>
                  </div>
                )}
              </div>
              <span className="text-zinc-300 hidden sm:inline">·</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-zinc-500">
                <Clock className="w-3 h-3" /> {current.expectedTime} min
              </span>
              {(showTypeMenu || showDifficultyMenu || showMarksMenu) && <div className="fixed inset-0 z-10" onClick={() => { setShowTypeMenu(false); setShowDifficultyMenu(false); setShowMarksMenu(false); }} />}
            </div>

            <div className="mt-6">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Question</label>
              <div className={`mt-2 rounded-2xl border bg-white transition-all ${editorFocused ? "border-zinc-300 shadow-sm" : "border-zinc-200"}`}>
                <AnimatePresence>
                  {editorFocused && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-0.5 p-2 border-b border-zinc-100">
                      <ToolbarBtn icon={Bold} label="Bold" />
                      <ToolbarBtn icon={Italic} label="Italic" />
                      <ToolbarBtn icon={Underline} label="Underline" />
                      <div className="w-px h-4 bg-zinc-200 mx-1" />
                      <ToolbarBtn icon={Code} label="Inline code" />
                      <ToolbarBtn icon={Sigma} label="Math" />
                      <ToolbarBtn icon={LinkIcon} label="Link" />
                      <ToolbarBtn icon={ImageIcon} label="Image" onClick={() => fileInputRef.current?.click()} />
                      <ToolbarBtn icon={Table} label="Table" />
                      <ToolbarBtn icon={Code} label="Code block" />
                      <ToolbarBtn icon={Paperclip} label="Attachment" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <textarea
                  value={current.title}
                  onChange={(e) => updateProblem(current.id, { title: e.target.value })}
                  onFocus={() => setEditorFocused(true)}
                  onBlur={() => setEditorFocused(false)}
                  placeholder="Write your question..."
                  className="w-full min-h-[140px] p-5 bg-transparent text-[17px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none resize-none"
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
              {current.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {current.images.map((img) => (
                    <div key={img.id} className="relative group">
                      <img src={img.url} alt="" className="h-20 w-28 object-cover rounded-xl border border-zinc-200" />
                      <button onClick={() => updateProblem(current.id, { images: current.images.filter((i) => i.id !== img.id) })} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
              <span className="text-[11px] font-medium text-zinc-500">
                Difficulty <span className="font-semibold text-zinc-900">{current.difficulty}</span>
              </span>
              <span className="text-zinc-300">·</span>
              <span>
                Marks <span className="font-semibold text-zinc-900">{current.marks}</span>
              </span>
              <span className="text-zinc-300">·</span>
              <span>
                Negative <span className="font-semibold text-zinc-900">{current.negativeMarks}</span>
              </span>
              <span className="text-zinc-300">·</span>
              <span>
                Time <span className="font-semibold text-zinc-900">{current.expectedTime} min</span>
              </span>
            </div>

            {isChoiceType && (
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Answer Options</h3>
                  <span className="text-[11px] font-medium rounded-full bg-zinc-900 text-white px-2 py-0.5">{current.type === "multiple_choice" ? "Multiple answers" : "Single answer"}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {current.options.map((opt, idx) => {
                    const isCorrect = opt.isCorrect;
                    return (
                      <div
                        key={opt.id}
                        draggable
                        onDragStart={() => setDraggedOption(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverOption(idx);
                        }}
                        onDrop={() => {
                          if (draggedOption !== null) reorderOptions(draggedOption, idx);
                          setDraggedOption(null);
                          setDragOverOption(null);
                        }}
                        onDragEnd={() => {
                          setDraggedOption(null);
                          setDragOverOption(null);
                        }}
                        className={`group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all ${isCorrect ? "bg-emerald-50/60 border-emerald-200" : dragOverOption === idx ? "bg-violet-50 border-violet-200" : "bg-white border-zinc-200 hover:border-zinc-300"} ${draggedOption === idx ? "opacity-50" : ""}`}
                      >
                        <button onClick={() => toggleCorrect(idx)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-zinc-300 bg-white hover:border-zinc-400"}`}>
                          {isCorrect ? <Check className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-transparent" />}
                        </button>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${isCorrect ? "bg-emerald-500 text-white border-emerald-500" : "bg-zinc-50 text-zinc-700 border-zinc-200"}`}>{opt.label}</span>
                        <input value={opt.content} onChange={(e) => updateProblem(current.id, { options: current.options.map((o, i) => (i === idx ? { ...o, content: e.target.value } : o)) })} placeholder={`Option ${opt.label}`} className="flex-1 bg-transparent text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none" />
                        {isCorrect && <span className="hidden sm:inline text-xs font-medium text-emerald-700">Correct</span>}
                        <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOptionImage(idx)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => reorderOptions(idx, idx - 1)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 disabled:opacity-30">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => reorderOptions(idx, idx + 1)} disabled={idx === current.options.length - 1} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 disabled:opacity-30">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          {current.options.length > 2 && (
                            <button
                              onClick={() => updateProblem(current.id, { options: current.options.filter((_, i) => i !== idx).map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) })}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="p-1.5 text-zinc-400 cursor-grab">
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        {opt.imageUrl && (
                          <div className="relative">
                            <img src={opt.imageUrl} alt="" className="h-12 rounded-lg border border-zinc-200" />
                            <button onClick={() => updateOption(idx, { imageUrl: undefined })} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.type !== "true_false" && current.options.length < 8 && (
                    <>
                      <button onClick={addOption} className="h-8 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Add option
                      </button>
                      <button onClick={() => toast.success("AI option generation coming soon")} className="h-8 px-3 rounded-lg border border-violet-200 bg-violet-50 text-xs font-medium text-violet-700 hover:bg-violet-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Add option with AI
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {isTextType && (
              <div className="mt-8">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{current.type === "paragraph" ? "Model Answer" : "Correct Answer"}</label>
                {current.type === "paragraph" ? (
                  <textarea value={String(current.correctAnswer ?? "")} onChange={(e) => updateProblem(current.id, { correctAnswer: e.target.value })} placeholder="Enter the model answer..." rows={4} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 resize-none" />
                ) : (
                  <input type={current.type === "integer" ? "number" : "text"} value={String(current.correctAnswer ?? "")} onChange={(e) => updateProblem(current.id, { correctAnswer: current.type === "integer" && e.target.value !== "" ? Number(e.target.value) : e.target.value })} placeholder="Enter the correct answer..." className="mt-2 w-full h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 focus:outline-none focus:border-zinc-300" />
                )}
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
              <button onClick={() => setShowAfterAnswer(!showAfterAnswer)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50">
                <span className="text-xs font-semibold text-zinc-900 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-500" /> After Answer
                </span>
                {showAfterAnswer ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>
              <AnimatePresence initial={false}>
                {showAfterAnswer && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-zinc-200">
                      <div className="flex gap-1 p-2 border-b border-zinc-100">
                        {(["explanation", "hint", "solution"] as const).map((t) => (
                          <button key={t} onClick={() => setAfterTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${afterTab === t ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="p-4">
                        {afterTab === "explanation" && <textarea value={current.explanation} onChange={(e) => updateProblem(current.id, { explanation: e.target.value })} placeholder="Explain the correct answer..." rows={4} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 resize-none" />}
                        {afterTab === "hint" && <textarea value={current.hint} onChange={(e) => updateProblem(current.id, { hint: e.target.value })} placeholder="Optional hint for students..." rows={3} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 resize-none" />}
                        {afterTab === "solution" && <textarea value={current.solution || ""} onChange={(e) => updateProblem(current.id, { solution: e.target.value })} placeholder="Detailed solution..." rows={4} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 resize-none" />}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <AnimatePresence initial={false}>
          {showRightPanel ? (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="hidden lg:flex shrink-0 border-l border-zinc-200 bg-white flex-col min-h-0 overflow-visible">
              <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-100 shrink-0">
                <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" /> Properties
                </span>
                <button onClick={() => setShowRightPanel(false)} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-6">
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Question Properties</h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                      <span className="text-xs text-zinc-600">Marks</span>
                      <span className="text-xs font-semibold text-zinc-900">{current.marks}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                      <span className="text-xs text-zinc-600">Difficulty</span>
                      <span className="text-xs font-semibold text-zinc-900">{current.difficulty}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                      <span className="text-xs text-zinc-600">Time</span>
                      <span className="text-xs font-semibold text-zinc-900">{current.expectedTime} min</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs text-zinc-600">Negative Marking</span>
                      <span className="text-xs font-semibold text-zinc-900">{current.negativeMarks}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Question Status</h3>
                  <div className="mt-3 space-y-2 text-xs">
                    <StatusRow done={current.title.trim().length > 0} label="Question text" />
                    <StatusRow done={current.options.length >= 2 && current.options.every((o) => o.content.trim() !== "") || isTextType && String(current.correctAnswer).trim().length>0} label={isTextType ? "Correct answer" : `${current.options.length} options`} />
                    <StatusRow done={isTextType ? String(current.correctAnswer).trim().length>0 : current.options.some((o) => o.isCorrect)} label="Correct answer" />
                    <StatusRow done={current.marks > 0} label="Marks assigned" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Warnings</h3>
                  <div className="mt-3 space-y-2">
                    {!current.explanation.trim() && <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Explanation missing</div>}
                    {!current.title.trim() && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Question text required</div>}
                    {!current.options.some((o) => o.isCorrect) && isChoiceType && <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> No correct answer selected</div>}
                    {current.explanation.trim() && current.title.trim() && (isTextType || current.options.some((o) => o.isCorrect)) && <div className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No warnings</div>}
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-100 space-y-2">
                  <label className="text-[11px] font-medium text-zinc-600">
                    Topic <input value={current.topic} onChange={(e) => updateProblem(current.id, { topic: e.target.value })} placeholder="e.g. Binary Trees" className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs focus:outline-none" />
                  </label>
                </div>
              </div>
            </motion.aside>
          ) : (
            <div className="hidden lg:flex w-10 shrink-0 border-l border-zinc-200 bg-white items-start justify-center py-4">
              <button onClick={() => setShowRightPanel(true)} className="rotate-90 whitespace-nowrap text-[11px] font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1">
                Properties <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-14 shrink-0 border-t border-zinc-200 bg-white flex items-center px-4 gap-3">
        <button onClick={() => { const idx = problems.findIndex((p) => p.id === current.id); if (idx > 0) { setActiveProblem(problems[idx - 1].id); router.push(`${problemsBase}/${problems[idx - 1].id}`); } }} disabled={safeIndex === 0} className="h-8 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <span className="hidden sm:inline text-xs text-zinc-500">
          Question <span className="font-semibold text-zinc-900">{safeIndex + 1}</span> of {total}
        </span>
        <span className="sm:hidden text-xs text-zinc-500">
          {safeIndex + 1} / {total}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleSyncQuestions} disabled={syncing || isSynced || lockSync} className="h-8 px-4 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 hidden sm:inline-flex disabled:opacity-40">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Save Draft
          </button>
          <button onClick={handleContinue} disabled={continuing || lockSync} className="h-8 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 flex items-center gap-1.5 disabled:opacity-40">
            Continue <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {confirmDeleteAll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setConfirmDeleteAll(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 8 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Delete all questions?</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">This will remove all {total} questions. This action cannot be undone.</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button onClick={() => setConfirmDeleteAll(false)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                  Cancel
                </button>
                <button onClick={handleDeleteAll} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
                  <Trash2 className="h-3.5 w-3.5" /> Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PdfConfigModal key={pdfModalOpen ? "open" : "closed"} open={pdfModalOpen} onClose={() => setPdfModalOpen(false)} questions={problems} generating={generatingPdf} onGenerate={handleDownloadPdf} />
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={label} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900">
      <Icon className="w-4 h-4" />
    </button>
  );
}
function StatusRow({ done, label }: { done: boolean; label: string }) {
  return <div className={`flex items-center gap-2 ${done ? "text-emerald-700" : "text-zinc-500"}`}>{done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <span className="w-3.5 h-3.5 rounded-full border border-zinc-300" />} {label}</div>;
}
