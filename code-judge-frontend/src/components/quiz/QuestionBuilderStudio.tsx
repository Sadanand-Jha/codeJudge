"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Copy,
  Check,
  AlertCircle,
  Smartphone,
  Tablet,
  Monitor,
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  X,
  ChevronRight,
  Eye,
  FileJson,
  FileText,
  Wand2,
  Type,
  MessageSquare,
  Lightbulb,
  Target,
  CopyCheck,
  Loader2,
  Plus,
  Image,
  ArrowLeft,
  ListChecks,
  Settings2,
  HelpCircle,
  Star,
  Hash,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  StudioQuestion,
  StudioQuestionType,
  AIAssistantSuggestion,
} from "@/types/quiz";
import QuestionNavigator from "@/components/quiz/QuestionNavigator";
import QuestionEditor from "@/components/quiz/QuestionEditor";
import QuestionLivePreview from "@/components/quiz/LivePreview";

type DeviceMode = "desktop" | "tablet" | "mobile";
type SaveStatus = "idle" | "saving" | "saved";

const QUESTION_TYPE_LABELS: Record<StudioQuestionType, string> = {
  single_choice: "Multiple Choice",
  multiple_choice: "Multiple Select",
  true_false: "True / False",
  text: "Short Answer",
  paragraph: "Paragraph",
  fill_blanks: "Fill in Blanks",
  table_fill: "Table Fill",
  code_output: "Code Output",
  complexity: "Complexity Analysis",
  debugging: "Debugging",
  matching: "Matching",
  ordering: "Ordering",
  drag_drop: "Drag & Drop",
  categorize: "Categorize",
  hotspot: "Hotspot",
  image_based: "Image Based",
  image_label: "Image Label",
  math: "Math",
  graph: "Graph",
  formula: "Formula",
  drawing: "Drawing",
  video_response: "Video Response",
  audio_response: "Audio Response",
  poll: "Poll",
  word_cloud: "Word Cloud",
};

const AI_ACTIONS = [
  { id: "generate", label: "Generate Question", icon: Sparkles, description: "Create a new question from a topic" },
  { id: "grammar", label: "Improve Grammar", icon: Type, description: "Fix grammar and improve clarity" },
  { id: "options", label: "Generate Options", icon: ListChecks, description: "Auto-generate answer options" },
  { id: "distractors", label: "Generate Distractors", icon: Target, description: "Create plausible wrong answers" },
  { id: "explanation", label: "Explain Correct Answer", icon: MessageSquare, description: "Generate a clear explanation" },
  { id: "difficulty", label: "Suggest Difficulty", icon: Target, description: "Recommend difficulty level" },
  { id: "duplicate", label: "Detect Duplicate", icon: CopyCheck, description: "Check for similar questions" },
  { id: "improve", label: "Improve Question", icon: Wand2, description: "AI-enhanced question rewording" },
  { id: "similar", label: "Generate Similar", icon: Copy, description: "Create similar questions" },
  { id: "hint", label: "Generate Hint", icon: Lightbulb, description: "Create a helpful hint" },
];

function createDefaultQuestion(id: string): StudioQuestion {
  const timestamp = new Date().toISOString();
  return {
    id,
    type: "single_choice",
    title: "",
    status: "incomplete",
    marks: 10,
    negativeMarks: 0,
    difficulty: "Medium",
    estimatedTime: 2,
    tags: [],
    options: [
      { id: `opt_${Date.now()}_a`, label: "A", content: "", isCorrect: false },
      { id: `opt_${Date.now()}_b`, label: "B", content: "", isCorrect: false },
      { id: `opt_${Date.now()}_c`, label: "C", content: "", isCorrect: false },
      { id: `opt_${Date.now()}_d`, label: "D", content: "", isCorrect: false },
    ],
    correctAnswer: -1,
    explanation: "",
    references: [],
    randomizeOptions: false,
    caseSensitive: false,
    shuffleAnswers: false,
    allowSkipping: true,
    isBonus: false,
    isMandatory: false,
    partialMarking: false,
    requireExplanation: false,
    images: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

interface QuestionBuilderStudioProps {
  quizId: string;
  quizName: string;
  initialQuestions?: StudioQuestion[];
  onBack?: () => void;
  onSaveQuestions?: (questions: StudioQuestion[]) => void;
}

export default function QuestionBuilderStudio({
  quizId,
  quizName,
  initialQuestions,
  onBack,
  onSaveQuestions,
}: QuestionBuilderStudioProps) {
  // ===== Questions State =====
  const [questions, setQuestions] = useState<StudioQuestion[]>(
    initialQuestions && initialQuestions.length > 0
      ? initialQuestions
      : [createDefaultQuestion("q_1")]
  );
  const [activeQuestionId, setActiveQuestionId] = useState(
    initialQuestions?.[0]?.id || "q_1"
  );
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // ===== UI State =====
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AIAssistantSuggestion | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId),
    [questions, activeQuestionId]
  );
  const activeIndex = questions.findIndex((q) => q.id === activeQuestionId);
  const totalMarks = useMemo(() => questions.reduce((sum, q) => sum + (q.marks || 0), 0), [questions]);

  // ===== Validation =====
  const validationResults = useMemo(() => {
    return questions.map((q) => {
      const issues: Array<{ field: string; message: string; severity: "error" | "warning" }> = [];
      if (!q.title.trim()) issues.push({ field: "title", message: "Question title is required", severity: "error" });
      if (q.options.length < 2) issues.push({ field: "options", message: "Minimum 2 options required", severity: "error" });
      const emptyOptions = q.options.filter((o) => !o.content.trim());
      if (emptyOptions.length > 0) issues.push({ field: "options", message: `${emptyOptions.length} empty option(s)`, severity: "error" });
      if (!q.options.some((o) => o.isCorrect)) issues.push({ field: "correctAnswer", message: "At least one correct answer required", severity: "error" });
      if (q.marks <= 0) issues.push({ field: "marks", message: "Marks must be greater than 0", severity: "error" });
      return { questionId: q.id, isValid: issues.filter((i) => i.severity === "error").length === 0, issues };
    });
  }, [questions]);

  const activeQuestionIssues = activeQuestion
    ? validationResults.find((r) => r.questionId === activeQuestion.id)?.issues || []
    : [];

  // ===== Auto-Save =====
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const handleSave = useCallback(async (silent = false) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus("saving");
    try {
      await new Promise((r) => setTimeout(r, 600));
      setLastSaved(new Date());
      setSaveStatus("saved");
      if (!silent) toast.success("Questions saved successfully!");
      if (onSaveQuestions) onSaveQuestions(questions);
      autoSaveTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
      if (!silent) toast.error("Failed to save questions");
    }
  }, [onSaveQuestions, questions]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === "idle" && questions.some((q) => q.title.trim() || q.options.some((o) => o.content))) {
        handleSave(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [handleSave, saveStatus, questions]);

  // ===== Question Handlers =====
  const handleQuestionChange = useCallback((id: string, updated: Partial<StudioQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updated } : q)));
  }, []);

  const handleAddQuestion = useCallback(() => {
    const newQ = createDefaultQuestion(`q_${Date.now()}`);
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionId(newQ.id);
    toast.success("New question added");
  }, []);

  const handleDeleteQuestion = useCallback((id: string) => {
    const qIndex = questions.findIndex((q) => q.id === id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeQuestionId === id) {
      const remaining = questions.filter((q) => q.id !== id);
      if (remaining.length > 0) setActiveQuestionId(remaining[qIndex > 0 ? qIndex - 1 : 0].id);
    }
  }, [questions, activeQuestionId]);

  const handleDeleteMultiple = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    const remaining = questions.filter((q) => !idSet.has(q.id));
    setQuestions(remaining);
    setSelectedQuestions(new Set());
    if (idSet.has(activeQuestionId)) setActiveQuestionId(remaining[0]?.id || "");
    toast.success(`${ids.length} question(s) deleted`);
  }, [questions, activeQuestionId]);

  const handleDuplicateQuestion = useCallback((id: string) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return;
    const duplicated: StudioQuestion = {
      ...question,
      id: `q_${Date.now()}`,
      title: `${question.title} (Copy)`,
      options: question.options.map((opt) => ({ ...opt, id: `opt_${Date.now()}_${opt.label}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const index = questions.findIndex((q) => q.id === id);
    setQuestions((prev) => [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]);
    toast.success("Question duplicated");
  }, [questions]);

  const handleDuplicateMultiple = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    const toDuplicate = questions.filter((q) => idSet.has(q.id));
    const duplicated = toDuplicate.map((q) => ({
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: `${q.title || "Untitled"} (Copy)`,
      options: q.options.map((opt) => ({ ...opt, id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setQuestions((prev) => {
      const newQuestions = [...prev];
      toDuplicate.forEach((q) => {
        const index = newQuestions.findIndex((x) => x.id === q.id);
        const dup = duplicated.shift();
        if (dup && index >= 0) newQuestions.splice(index + 1, 0, dup);
      });
      return newQuestions;
    });
    toast.success(`${ids.length} question(s) duplicated`);
  }, [questions]);

  const handleReorder = useCallback((reordered: StudioQuestion[]) => setQuestions(reordered), []);
  const handleToggleSelection = useCallback((id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const handleSelectAll = useCallback(() => {
    setSelectedQuestions((prev) => prev.size === questions.length ? new Set() : new Set(questions.map((q) => q.id)));
  }, [questions]);

  // ===== Import/Export =====
  const handleExport = useCallback((format: "json" | "csv") => {
    const quizData = {
      quizId,
      questions: questions.map((q) => ({
        type: q.type,
        title: q.title,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        estimatedTime: q.estimatedTime,
        tags: q.tags,
        options: q.options.map((o) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })),
        explanation: q.explanation,
        hint: q.hint,
      })),
    };
    const blob = format === "json"
      ? new Blob([JSON.stringify(quizData, null, 2)], { type: "application/json" })
      : new Blob([
          ["Question,Type,Marks,Options,Correct Answer,Explanation"].join(",") + "\n" +
          questions.map((q) => [
            `"${q.title.replace(/"/g, '""')}"`,
            QUESTION_TYPE_LABELS[q.type],
            q.marks,
            `"${q.options.map((o) => o.content).join("|").replace(/"/g, '""')}"`,
            `"${q.options.filter((o) => o.isCorrect).map((o) => o.label).join("|")}"`,
            `"${(q.explanation || "").replace(/"/g, '""')}"`,
          ].join(",")).join("\n")
        ], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${quizName.replace(/\s+/g, "-").toLowerCase()}-questions.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }, [questions, quizId, quizName]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.questions && Array.isArray(data.questions)) {
          const imported: StudioQuestion[] = data.questions.map((q: any, i: number) => ({
            ...createDefaultQuestion(`q_${Date.now()}_${i}`),
            type: q.type || "single_choice",
            title: q.title || q.question || "",
            marks: q.marks || q.points || 10,
            negativeMarks: q.negativeMarks || 0,
            difficulty: q.difficulty || "Medium",
            estimatedTime: q.estimatedTime || 2,
            tags: q.tags || [],
            options: (q.options || []).map((o: any, j: number) => ({
              id: `opt_${Date.now()}_${i}_${j}`,
              label: typeof o === "string" ? String.fromCharCode(65 + j) : (o.label || String.fromCharCode(65 + j)),
              content: typeof o === "string" ? o : (o.content || o.text || ""),
              isCorrect: typeof o === "string" ? q.correctAnswer === j : !!(o.isCorrect || q.correctAnswer === j),
            })),
            explanation: q.explanation || "",
            hint: q.hint,
          }));
          if (imported.length > 0) {
            setQuestions(imported);
            setActiveQuestionId(imported[0].id);
            toast.success(`Imported ${imported.length} question(s)`);
          }
        }
      } catch {
        toast.error("Invalid file format. Please use JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // ===== AI Assistant =====
  const handleAIAction = useCallback((actionId: string) => {
    setAiLoading(actionId);
    setTimeout(() => {
      const suggestions: Record<string, AIAssistantSuggestion> = {
        grammar: { id: `ai_${Date.now()}`, type: "grammar", title: "Improved Grammar", content: "What is the time complexity of binary search in a sorted array?", applied: false },
        options: { id: `ai_${Date.now()}`, type: "options", title: "Generated Options", content: "A. O(log n)\nB. O(n)\nC. O(n²)\nD. O(log n) for best case", applied: false },
        explanation: { id: `ai_${Date.now()}`, type: "explanation", title: "Explanation", content: "Binary search repeatedly divides the search interval in half, resulting in logarithmic time complexity O(log n) for a sorted array of n elements.", applied: false },
        hint: { id: `ai_${Date.now()}`, type: "hint", title: "Generated Hint", content: "Think about how many times you can divide n by 2 before reaching 1.", applied: false },
        difficulty: { id: `ai_${Date.now()}`, type: "difficulty", title: "Difficulty Suggestion", content: "Based on the question complexity, I recommend setting difficulty to Easy.", applied: false },
      };
      const suggestion = suggestions[actionId];
      if (suggestion) { setAiResponse(suggestion); toast.success("AI suggestion ready"); }
      setAiLoading(null);
    }, 800);
  }, []);

  const applyAISuggestion = useCallback((suggestion: AIAssistantSuggestion) => {
    if (!activeQuestion) return;
    if (suggestion.type === "grammar" || suggestion.type === "improve") {
      handleQuestionChange(activeQuestion.id, { title: suggestion.content });
    } else if (suggestion.type === "options") {
      const lines = suggestion.content.split("\n").map((l) => l.replace(/^[A-D][.)]\s*/, "").trim()).filter(Boolean);
      const newOptions = lines.map((content, i) => ({ id: `opt_${Date.now()}_${i}`, label: String.fromCharCode(65 + i), content, isCorrect: false }));
      handleQuestionChange(activeQuestion.id, { options: newOptions });
    } else if (suggestion.type === "explanation") {
      handleQuestionChange(activeQuestion.id, { explanation: suggestion.content });
    } else if (suggestion.type === "hint") {
      handleQuestionChange(activeQuestion.id, { hint: suggestion.content });
    }
    setAiResponse((prev) => prev ? { ...prev, applied: true } : null);
    toast.success("AI suggestion applied");
  }, [activeQuestion, handleQuestionChange]);

  // ===== Keyboard Shortcuts =====
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
    if (e.ctrlKey && e.key === "d" && activeQuestionId) { e.preventDefault(); handleDuplicateQuestion(activeQuestionId); }
    if (e.ctrlKey && e.shiftKey && e.key === "n") { e.preventDefault(); handleAddQuestion(); }
    if (e.key === "Delete" && activeQuestionId) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      handleDeleteQuestion(activeQuestionId);
    }
    if (e.key === "ArrowUp" && activeIndex > 0) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      setActiveQuestionId(questions[activeIndex - 1].id);
    }
    if (e.key === "ArrowDown" && activeIndex < questions.length - 1) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      setActiveQuestionId(questions[activeIndex + 1].id);
    }
    if (e.key === "?" && !showShortcuts) { e.preventDefault(); setShowShortcuts(true); }
  }, [handleSave, handleDuplicateQuestion, handleAddQuestion, handleDeleteQuestion, activeQuestionId, activeIndex, questions, showShortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ===== QUESTION BUILDER HEADER ===== */}
      <div className="h-14 border-b border-border-hover bg-background/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="h-8 px-2.5 rounded-lg border border-border bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-6 bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#EC4899] flex items-center justify-center">
            <ListChecks className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{quizName}</p>
            <p className="text-[9px] text-[#6B7280]">Question Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4 text-[9px] text-[#6B7280]">
          <span>{questions.length} questions</span>
          <span>•</span>
          <span>{totalMarks} pts</span>
          <span>•</span>
          <span>{validationResults.filter((r) => r.isValid).length}/{questions.length} valid</span>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          {saveStatus === "saving" ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#EC4899] animate-spin" />
              <span>Saving...</span>
            </div>
          ) : saveStatus === "saved" ? (
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[#22C55E]">Saved</span>
              {lastSaved && <span className="text-[9px] text-[#6B7280]">{formatLastSaved(lastSaved)}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <Save className="w-3.5 h-3.5" />
              <span>Waiting...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => document.getElementById("qb-import")?.click()}
            className="h-8 px-2.5 rounded-lg border border-border bg-white/[0.04] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
            title="Import"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input id="qb-import" type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />

          <div className="relative group">
            <button className="h-8 px-2.5 rounded-lg border border-border bg-white/[0.04] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5" title="Export">
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border-hover bg-card shadow-2xl shadow-black/50 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => handleExport("json")} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors">
                <FileJson className="w-3 h-3" /> Export as JSON
              </button>
              <button onClick={() => handleExport("csv")} className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors">
                <FileText className="w-3 h-3" /> Export as CSV
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAI(!showAI)}
            className={`h-8 px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showAI ? "border-[#EC4899]/40 bg-[#EC4899]/20 text-[#EC4899]" : "border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899] hover:bg-[#EC4899]/20"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI
          </button>

          <button onClick={() => setShowShortcuts(true)} className="h-8 px-2.5 rounded-lg border border-border bg-white/[0.04] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors" title="Shortcuts (?)">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <button onClick={() => handleSave()} className="h-8 px-3 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save
          </button>

          <button
            onClick={() => { handleSave(); onBack?.(); }}
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#EC4899] text-xs font-bold text-white hover:shadow-lg hover:shadow-[#EC4899]/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Done
          </button>
        </div>
      </div>

      {/* ===== KEYBOARD SHORTCUTS MODAL ===== */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-2xl border border-border-hover bg-card shadow-2xl shadow-black/50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-bold text-white">Keyboard Shortcuts</h3>
                <button onClick={() => setShowShortcuts(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-2.5">
                {[
                  { keys: "Ctrl + S", description: "Save Questions" },
                  { keys: "Ctrl + D", description: "Duplicate Question" },
                  { keys: "Ctrl + Shift + N", description: "New Question" },
                  { keys: "Delete", description: "Delete Question" },
                  { keys: "↑ / ↓", description: "Navigate Questions" },
                  { keys: "?", description: "Show Shortcuts" },
                ].map((s) => (
                  <div key={s.keys} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.description}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-border-hover text-[10px] font-bold text-white font-mono">{s.keys}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 3-COLUMN LAYOUT ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Question Navigator */}
        <QuestionNavigator
          questions={questions}
          activeId={activeQuestionId}
          selected={selectedQuestions}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onSelect={setActiveQuestionId}
          onDelete={handleDeleteQuestion}
          onDeleteMultiple={handleDeleteMultiple}
          onDuplicate={handleDuplicateQuestion}
          onDuplicateMultiple={handleDuplicateMultiple}
          onReorder={handleReorder}
          onSelectAll={handleSelectAll}
          onAdd={handleAddQuestion}
          onToggleSelection={handleToggleSelection}
        />

        {/* CENTER: Question Editor */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto">
            {activeQuestion ? (
              <QuestionEditor
                question={activeQuestion}
                onChange={(updated) => handleQuestionChange(activeQuestion.id, updated)}
                questionNumber={activeIndex + 1}
                onPrevious={() => { if (activeIndex > 0) setActiveQuestionId(questions[activeIndex - 1].id); }}
                onNext={() => { if (activeIndex < questions.length - 1) setActiveQuestionId(questions[activeIndex + 1].id); }}
                hasNext={activeIndex < questions.length - 1}
                hasPrevious={activeIndex > 0}
                validationIssues={activeQuestionIssues}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <ListChecks className="w-8 h-8 mx-auto text-[#6B7280] mb-2" />
                  <p className="text-xs text-muted-foreground">Select a question or create one</p>
                  <button onClick={handleAddQuestion} className="mt-3 text-xs font-semibold text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1 mx-auto">
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant Panel */}
          <AnimatePresence>
            {showAI && (
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                className="absolute right-4 top-4 bottom-4 w-72 rounded-2xl border border-[#EC4899]/20 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col z-40">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#EC4899] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">AI Assistant</p>
                      <p className="text-[9px] text-[#6B7280]">Suggestions never auto-apply</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAI(false)} className="p-1 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {AI_ACTIONS.map((action) => (
                    <button key={action.id} onClick={() => handleAIAction(action.id)} disabled={aiLoading !== null}
                      className="w-full flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] p-2.5 hover:border-[#EC4899]/30 hover:bg-[#EC4899]/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-border-hover flex items-center justify-center shrink-0">
                        {aiLoading === action.id ? <Loader2 className="w-3.5 h-3.5 text-[#EC4899] animate-spin" /> : <action.icon className="w-3.5 h-3.5 text-[#EC4899]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white">{action.label}</p>
                        <p className="text-[9px] text-[#6B7280]">{action.description}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#6B7280] group-hover:text-[#EC4899] transition-colors" />
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {aiResponse && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="border-t border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-[#EC4899]">{aiResponse.title}</p>
                        {!aiResponse.applied && (
                          <button onClick={() => applyAISuggestion(aiResponse)} className="px-2 py-0.5 rounded-lg bg-[#EC4899] text-[9px] font-bold text-white hover:bg-[#DB2777] transition-colors">Apply</button>
                        )}
                        {aiResponse.applied && <span className="text-[9px] text-[#22C55E] flex items-center gap-1"><Check className="w-3 h-3" />Applied</span>}
                      </div>
                      <pre className="text-[10px] text-[#E5E7EB] whitespace-pre-wrap font-sans leading-relaxed">{aiResponse.content}</pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="w-[26rem] border-l border-border-hover flex flex-col shrink-0">
          <div className="h-12 border-b border-border-hover px-3 flex items-center justify-center gap-2">
            <span className="text-[10px] font-medium text-muted-foreground mr-auto flex items-center gap-1.5">
              <Eye className="w-3 h-3" /> Preview
            </span>
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
              {(["desktop", "tablet", "mobile"] as DeviceMode[]).map((mode) => (
                <button key={mode} onClick={() => setDeviceMode(mode)}
                  className={`p-1.5 rounded-lg transition-all ${deviceMode === mode ? "bg-[#EC4899]/10 text-[#EC4899]" : "text-muted-foreground hover:text-white"}`}>
                  {mode === "desktop" && <Monitor className="w-4 h-4" />}
                  {mode === "tablet" && <Tablet className="w-4 h-4" />}
                  {mode === "mobile" && <Smartphone className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
          <QuestionLivePreview question={activeQuestion || null} deviceMode={deviceMode} totalQuestions={questions.length} questionNumber={activeIndex + 1} />
        </div>
      </div>
    </div>
  );
}