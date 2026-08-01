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
  History,
  Users,
  Download,
  Upload,
  CheckCircle2,
  X,
  ChevronRight,
  Shield,
  BookOpen,
  Settings2,
  ListChecks,
  Eye,
  FileJson,
  FileText,
  Wand2,
  Type,
  MessageSquare,
  Lightbulb,
  Target,
  CopyCheck,
  HelpCircle,
  Keyboard,
  Loader2,
  Plus,
  Image,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  StudioQuestion,
  StudioQuestionType,
  AIAssistantSuggestion,
  PublishChecklistItem,
  QuestionValidationResult,
  CollaboratorPresence,
} from "@/types/quiz";
import QuestionNavigator from "@/components/quiz/QuestionNavigator";
import QuestionEditor from "@/components/quiz/QuestionEditor";
import LivePreview from "@/components/quiz/LivePreview";

type DeviceMode = "desktop" | "tablet" | "mobile";
type SaveStatus = "idle" | "saving" | "saved";
type PanelTab = "history" | "collaborators";

const QUESTION_TYPE_LABELS: Record<StudioQuestionType, string> = {
  single_choice: "Single Correct",
  multiple_choice: "Multiple Correct",
  true_false: "True / False",
  text: "Fill in the Blank",
  code_output: "Code Output",
  complexity: "Complexity Analysis",
  debugging: "Debugging",
  matching: "Matching",
  ordering: "Ordering",
  image_based: "Image Based",
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

export default function QuizStudio() {
  // ===== Quiz Metadata =====
  const [title, setTitle] = useState("Untitled Quiz");
  const [description, setDescription] = useState("");

  // ===== Questions State =====
  const [questions, setQuestions] = useState<StudioQuestion[]>([
    createDefaultQuestion("q_1"),
  ]);
  const [activeQuestionId, setActiveQuestionId] = useState("q_1");
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // ===== UI State =====
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showPublishChecklist, setShowPublishChecklist] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState<PanelTab | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AIAssistantSuggestion | null>(null);

  // ===== Version History =====
  const [versionHistory, setVersionHistory] = useState<Array<{
    id: string;
    version: number;
    createdAt: string;
    label: string;
  }>>([{ id: "v1", version: 1, createdAt: new Date().toISOString(), label: "Initial" }]);

  // ===== Collaborators =====
  const [collaborators] = useState<CollaboratorPresence[]>([
    { userId: "u1", username: "You", avatar: "", currentlyEditing: undefined, lastActive: new Date().toISOString() },
    { userId: "u2", username: "Prof. Smith", avatar: "", currentlyEditing: "q_1", lastActive: new Date().toISOString() },
  ]);

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId),
    [questions, activeQuestionId]
  );

  const activeIndex = questions.findIndex((q) => q.id === activeQuestionId);

  const totalMarks = useMemo(
    () => questions.reduce((sum, q) => sum + (q.marks || 0), 0),
    [questions]
  );

  // ===== Validation =====
  const validationResults = useMemo(() => {
    const results: QuestionValidationResult[] = questions.map((q) => {
      const issues: QuestionValidationResult["issues"] = [];

      if (!q.title.trim()) {
        issues.push({ field: "title", message: "Question title is required", severity: "error" });
      }

      if (q.title.trim().length < 5) {
        issues.push({ field: "title", message: "Question is too short", severity: "warning" });
      }

      if (q.options.length < 2) {
        issues.push({ field: "options", message: "Minimum 2 options required", severity: "error" });
      }

      const emptyOptions = q.options.filter((o) => !o.content.trim());
      if (emptyOptions.length > 0) {
        issues.push({ field: "options", message: `${emptyOptions.length} empty option(s)`, severity: "error" });
      }

      const uniqueContents = new Set(q.options.map((o) => o.content.trim().toLowerCase()));
      if (uniqueContents.size !== q.options.filter((o) => o.content.trim()).length) {
        issues.push({ field: "options", message: "Duplicate options detected", severity: "error" });
      }

      if (!q.options.some((o) => o.isCorrect)) {
        issues.push({ field: "correctAnswer", message: "At least one correct answer required", severity: "error" });
      }

      if (q.marks <= 0) {
        issues.push({ field: "marks", message: "Marks must be greater than 0", severity: "error" });
      }

      if (q.images.length > 0 && q.images.some((img) => !img.url)) {
        issues.push({ field: "images", message: "Image upload incomplete", severity: "error" });
      }

      return {
        questionId: q.id,
        isValid: issues.filter((i) => i.severity === "error").length === 0,
        issues,
      };
    });
    return results;
  }, [questions]);

  // ===== Publish Readiness =====
  const publishReadiness = useMemo(() => {
    const checks: PublishChecklistItem[] = [
      {
        id: "info",
        label: "Quiz Information Complete",
        description: "Title and description are filled",
        passed: title.trim().length > 0 && description.trim().length > 0,
      },
      {
        id: "questions",
        label: "Questions Valid",
        description: "All questions pass validation",
        passed: questions.length > 0 && validationResults.every((r) => r.isValid),
      },
      {
        id: "answers",
        label: "Answers Configured",
        description: "Every question has correct answers",
        passed: questions.every((q) => q.options.some((o) => o.isCorrect)),
      },
      {
        id: "marks",
        label: "Marks Assigned",
        description: "All questions have marks > 0",
        passed: questions.every((q) => q.marks > 0),
      },
      {
        id: "visibility",
        label: "Visibility Configured",
        description: "Quiz visibility is set",
        passed: true,
      },
      {
        id: "rules",
        label: "Assessment Rules Configured",
        description: "Assessment settings are configured",
        passed: true,
      },
      {
        id: "lifelines",
        label: "Lifelines Configured",
        description: "Lifeline settings are ready",
        passed: true,
      },
      {
        id: "preview",
        label: "Preview Completed",
        description: "Quiz previewed before publishing",
        passed: false,
      },
    ];
    return checks;
  }, [title, description, questions, validationResults]);

  const readinessCount = publishReadiness.filter((c) => c.passed).length;
  const allReady = readinessCount === publishReadiness.length;

  // ===== Auto-Save =====
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(async (silent = false) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    setSaveStatus("saving");
    try {
      await new Promise((r) => setTimeout(r, 600));
      setLastSaved(new Date());
      setSaveStatus("saved");
      if (!silent) {
        toast.success("Quiz saved successfully!");
      }
      setVersionHistory((prev) => {
        const latest = prev[prev.length - 1];
        return [
          ...prev,
          {
            id: `v${Date.now()}`,
            version: (latest?.version || 0) + 1,
            createdAt: new Date().toISOString(),
            label: "Auto-save",
          },
        ];
      });
      autoSaveTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
      if (!silent) {
        toast.error("Failed to save quiz");
      }
    }
  }, []);

  // Auto-save every 5 seconds if there are changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === "idle") {
        handleSave(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [handleSave, saveStatus]);

  // ===== Question Handlers =====
  const handleQuestionChange = useCallback((id: string, updated: Partial<StudioQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updated } : q))
    );
  }, []);

  const handleAddQuestion = useCallback(() => {
    const newQ = createDefaultQuestion(`q_${Date.now()}`);
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionId(newQ.id);
    setSelectedQuestions(new Set());
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
      if (remaining.length > 0) {
        setActiveQuestionId(remaining[qIndex > 0 ? qIndex - 1 : 0].id);
      }
    }
  }, [questions, activeQuestionId]);

  const handleDeleteMultiple = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    const remaining = questions.filter((q) => !idSet.has(q.id));
    setQuestions(remaining);
    setSelectedQuestions(new Set());
    if (idSet.has(activeQuestionId)) {
      setActiveQuestionId(remaining[0]?.id || "");
    }
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
    setQuestions((prev) => [
      ...prev.slice(0, index + 1),
      duplicated,
      ...prev.slice(index + 1),
    ]);
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
        if (dup && index >= 0) {
          newQuestions.splice(index + 1, 0, dup);
        }
      });
      return newQuestions;
    });
    toast.success(`${ids.length} question(s) duplicated`);
  }, [questions]);

  const handleReorder = useCallback((reordered: StudioQuestion[]) => {
    setQuestions(reordered);
  }, []);

  const handleToggleSelection = useCallback((id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedQuestions((prev) => {
      if (prev.size === questions.length) {
        return new Set();
      }
      return new Set(questions.map((q) => q.id));
    });
  }, [questions]);

  // ===== Import/Export =====
  const handleExport = useCallback((format: "json" | "csv") => {
    const quizData = {
      title,
      description,
      questions: questions.map((q) => ({
        type: q.type,
        title: q.title,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        difficulty: q.difficulty,
        estimatedTime: q.estimatedTime,
        tags: q.tags,
        topic: q.topic,
        subtopic: q.subtopic,
        options: q.options.map((o) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })),
        explanation: q.explanation,
        hint: q.hint,
        references: q.references,
      })),
    };

    const blob = format === "json"
      ? new Blob([JSON.stringify(quizData, null, 2)], { type: "application/json" })
      : new Blob([questionsToCSV()], { type: "text/csv" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }, [title, description, questions]);

  const questionsToCSV = useCallback(() => {
    const headers = ["Question", "Type", "Marks", "Difficulty", "Options", "Correct Answer", "Explanation"];
    const rows = questions.map((q) => [
      `"${q.title.replace(/"/g, '""')}"`,
      QUESTION_TYPE_LABELS[q.type],
      q.marks,
      q.difficulty,
      `"${q.options.map((o) => o.content).join("|").replace(/"/g, '""')}"`,
      `"${q.options.filter((o) => o.isCorrect).map((o) => o.label).join("|")}"`,
      `"${(q.explanation || "").replace(/"/g, '""')}"`,
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }, [questions]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.questions && Array.isArray(data.questions)) {
          const imported: StudioQuestion[] = data.questions.map((q: any, i: number) => {
            const qid = `q_${Date.now()}_${i}`;
            return {
              ...createDefaultQuestion(qid),
              type: q.type || "single_choice",
              title: q.title || q.question || "",
              marks: q.marks || q.points || 10,
              negativeMarks: q.negativeMarks || 0,
              difficulty: q.difficulty || "Medium",
              estimatedTime: q.estimatedTime || 2,
              tags: q.tags || [],
              topic: q.topic,
              subtopic: q.subtopic,
              options: (q.options || []).map((o: any, j: number) => ({
                id: `opt_${Date.now()}_${i}_${j}`,
                label: typeof o === "string" ? String.fromCharCode(65 + j) : (o.label || String.fromCharCode(65 + j)),
                content: typeof o === "string" ? o : (o.content || o.text || ""),
                isCorrect: typeof o === "string" ? q.correctAnswer === j : !!(o.isCorrect || q.correctAnswer === j),
              })),
              explanation: q.explanation || "",
              hint: q.hint,
              references: q.references || [],
              codeLanguage: q.codeLanguage,
              codeSnippet: q.codeSnippet,
            };
          });
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
        grammar: {
          id: `ai_${Date.now()}`,
          type: "grammar",
          title: "Improved Grammar",
          content: "What is the time complexity of binary search in a sorted array?",
          applied: false,
        },
        options: {
          id: `ai_${Date.now()}`,
          type: "options",
          title: "Generated Options",
          content: "A. O(log n)\nB. O(n)\nC. O(n²)\nD. O(log n) for best case",
          applied: false,
        },
        explanation: {
          id: `ai_${Date.now()}`,
          type: "explanation",
          title: "Explanation",
          content: "Binary search repeatedly divides the search interval in half, resulting in logarithmic time complexity O(log n) for a sorted array of n elements.",
          applied: false,
        },
        hint: {
          id: `ai_${Date.now()}`,
          type: "hint",
          title: "Generated Hint",
          content: "Think about how many times you can divide n by 2 before reaching 1.",
          applied: false,
        },
        difficulty: {
          id: `ai_${Date.now()}`,
          type: "difficulty",
          title: "Difficulty Suggestion",
          content: "Based on the question complexity and answer options, I recommend setting difficulty to Easy.",
          applied: false,
        },
      };
      const suggestion = suggestions[actionId];
      if (suggestion) {
        setAiResponse(suggestion);
        toast.success("AI suggestion ready");
      }
      setAiLoading(null);
    }, 800);
  }, []);

  const applyAISuggestion = useCallback((suggestion: AIAssistantSuggestion) => {
    if (!activeQuestion) return;
    if (suggestion.type === "grammar" || suggestion.type === "improve") {
      handleQuestionChange(activeQuestion.id, { title: suggestion.content });
    } else if (suggestion.type === "options") {
      const lines = suggestion.content.split("\n")
        .map((l) => l.replace(/^[A-D][.)]\s*/, "").trim())
        .filter(Boolean);
      const newOptions = lines.map((content, i) => ({
        id: `opt_${Date.now()}_${i}`,
        label: String.fromCharCode(65 + i),
        content,
        isCorrect: false,
      }));
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
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if (e.ctrlKey && e.key === "d" && activeQuestionId) {
      e.preventDefault();
      handleDuplicateQuestion(activeQuestionId);
    }
    if (e.ctrlKey && e.shiftKey && e.key === "n") {
      e.preventDefault();
      handleAddQuestion();
    }
    if (e.key === "Delete" && activeQuestionId && !showValidation) {
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
    if (e.key === "?" && !showShortcuts) {
      e.preventDefault();
      setShowShortcuts(true);
    }
  }, [handleSave, handleDuplicateQuestion, handleAddQuestion, handleDeleteQuestion, activeQuestionId, activeIndex, questions, showValidation, showShortcuts]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const activeQuestionIssues = activeQuestion
    ? validationResults.find((r) => r.questionId === activeQuestion.id)?.issues || []
    : [];

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-screen bg-[#09090B] flex flex-col overflow-hidden">
      {/* ===== TOP BAR ===== */}
      <div className="h-14 border-b border-white/[0.08] bg-[#09090B]/80 backdrop-blur-xl flex items-center px-4 gap-4 shrink-0">
        {/* Quiz brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
            <ListChecks className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Quiz title editing */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quiz title..."
            className="w-full h-9 bg-transparent text-sm font-semibold text-white placeholder-[#9CA3AF] outline-none"
          />
          <div className="flex items-center gap-2 text-[9px] text-[#6B7280]">
            <span>{questions.length} questions</span>
            <span>•</span>
            <span>{totalMarks} total pts</span>
          </div>
        </div>

        {/* Save status */}
        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
          {saveStatus === "saving" ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#7C3AED] animate-spin" />
              <span>Saving...</span>
            </div>
          ) : saveStatus === "saved" ? (
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[#22C55E]">Saved</span>
              {lastSaved && (
                <span className="text-[9px] text-[#6B7280]">{formatLastSaved(lastSaved)}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <Save className="w-3.5 h-3.5" />
              <span>Waiting for changes...</span>
            </div>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Import */}
          <button
            onClick={() => document.getElementById("import-file")?.click()}
            className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
            title="Import questions (JSON/CSV)"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            id="import-file"
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={handleImport}
          />

          {/* Export */}
          <div className="relative group">
            <button
              className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
              title="Export"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/[0.08] bg-[#111827] shadow-2xl shadow-black/50 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => handleExport("json")}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <FileJson className="w-3 h-3" />
                Export as JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                <FileText className="w-3 h-3" />
                Export as CSV
              </button>
            </div>
          </div>

          {/* AI Assistant */}
          <button
            onClick={() => setShowAI(!showAI)}
            className={`h-8 px-3 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showAI
                ? "border-[#7C3AED]/40 bg-[#7C3AED]/20 text-[#7C3AED]"
                : "border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED] hover:bg-[#7C3AED]/20"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Assistant
          </button>

          {/* History */}
          <button
            onClick={() => setRightPanelOpen(rightPanelOpen === "history" ? null : "history")}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
              rightPanelOpen === "history"
                ? "border-white/[0.15] bg-white/[0.08] text-white"
                : "border-white/[0.06] bg-white/[0.04] text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]"
            }`}
            title="Version History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{versionHistory.length}</span>
          </button>

          {/* Collaborators */}
          <button
            onClick={() => setRightPanelOpen(rightPanelOpen === "collaborators" ? null : "collaborators")}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
              rightPanelOpen === "collaborators"
                ? "border-white/[0.15] bg-white/[0.08] text-white"
                : "border-white/[0.06] bg-white/[0.04] text-[#9CA3AF] hover:text-white hover:bg-white/[0.06]"
            }`}
            title="Collaborators"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">2</span>
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-6 bg-white/[0.08]" />

          {/* Validation toggle */}
          <button
            onClick={() => setShowValidation(!showValidation)}
            className="h-8 px-3 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
          >
            <AlertCircle className={`w-3.5 h-3.5 ${validationResults.some((r) => !r.isValid) ? "text-[#EF4444]" : "text-[#22C55E]"}`} />
            Validation
          </button>

          {/* Publish readiness */}
          <button
            onClick={() => setShowPublishChecklist(!showPublishChecklist)}
            className="h-8 px-3 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 text-xs font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            {readinessCount}/{publishReadiness.length}
          </button>

          {/* Publish */}
          <button
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white hover:shadow-lg hover:shadow-[#7C3AED]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center gap-1.5"
            disabled={!allReady}
            title={allReady ? "Ready to publish" : `${publishReadiness.length - readinessCount} item(s) remaining`}
          >
            <Check className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>

      {/* ===== PUBLISH CHECKLIST PANEL ===== */}
      <AnimatePresence>
        {showPublishChecklist && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/[0.08] bg-[#111827] overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#22C55E]" />
                  Publish Readiness
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#9CA3AF]">
                    Progress: <span className="text-white font-bold">{readinessCount}/{publishReadiness.length}</span>
                  </span>
                  <div className="w-40 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#22C55E] to-[#7C3AED]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(readinessCount / publishReadiness.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {publishReadiness.map((check) => (
                  <div
                    key={check.id}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 transition-all ${
                      check.passed
                        ? "border-[#22C55E]/20 bg-[#22C55E]/5"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}
                  >
                    <div className="pt-0.5">
                      {check.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-[#6B7280]" />
                      )}
                    </div>
                    <div>
                      <p className={`text-[10px] font-medium ${check.passed ? "text-[#22C55E]" : "text-white"}`}>
                        {check.label}
                      </p>
                      <p className="text-[9px] text-[#6B7280] mt-0.5">{check.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== KEYBOARD SHORTCUTS ===== */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111827] shadow-2xl shadow-black/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-[#7C3AED]" />
                  Keyboard Shortcuts
                </h3>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-2.5">
                {[
                  { keys: "Ctrl + S", description: "Save Quiz" },
                  { keys: "Ctrl + D", description: "Duplicate Question" },
                  { keys: "Ctrl + Shift + N", description: "New Question" },
                  { keys: "Delete", description: "Delete Question" },
                  { keys: "↑ / ↓", description: "Navigate Questions" },
                  { keys: "?", description: "Show Keyboard Shortcuts" },
                ].map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF]">{shortcut.description}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] font-bold text-white font-mono">
                      {shortcut.keys}
                    </span>
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
                onPrevious={() => {
                  if (activeIndex > 0) setActiveQuestionId(questions[activeIndex - 1].id);
                }}
                onNext={() => {
                  if (activeIndex < questions.length - 1)
                    setActiveQuestionId(questions[activeIndex + 1].id);
                }}
                hasNext={activeIndex < questions.length - 1}
                hasPrevious={activeIndex > 0}
                showAdvanced={showAdvanced}
                onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
                validationIssues={activeQuestionIssues}
              />
            ) : (
              <EmptyState onCreateFirst={handleAddQuestion} />
            )}
          </div>

          {/* AI Assistant Floating Panel */}
          <AnimatePresence>
            {showAI && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="absolute right-4 top-4 bottom-4 w-72 rounded-2xl border border-[#7C3AED]/20 bg-[#111827]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col z-40"
              >
                <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">AI Assistant</p>
                      <p className="text-[9px] text-[#6B7280]">Suggestions never auto-apply</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAI(false)}
                    className="p-1 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {AI_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAIAction(action.id)}
                      disabled={aiLoading !== null}
                      className="w-full flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        {aiLoading === action.id ? (
                          <Loader2 className="w-3.5 h-3.5 text-[#7C3AED] animate-spin" />
                        ) : (
                          <action.icon className="w-3.5 h-3.5 text-[#7C3AED]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-white">{action.label}</p>
                        <p className="text-[9px] text-[#6B7280]">{action.description}</p>
                      </div>
                      <ChevronRight className="w-3 h-3 text-[#6B7280] group-hover:text-[#7C3AED] transition-colors" />
                    </button>
                  ))}
                </div>

                {/* AI Response */}
                <AnimatePresence>
                  {aiResponse && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="border-t border-white/[0.06] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-[#7C3AED]">{aiResponse.title}</p>
                        {!aiResponse.applied && (
                          <button
                            onClick={() => applyAISuggestion(aiResponse)}
                            className="px-2 py-0.5 rounded-lg bg-[#7C3AED] text-[9px] font-bold text-white hover:bg-[#8B5AF0] transition-colors"
                          >
                            Apply
                          </button>
                        )}
                        {aiResponse.applied && (
                          <span className="text-[9px] text-[#22C55E] flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Applied
                          </span>
                        )}
                      </div>
                      <pre className="text-[10px] text-[#E5E7EB] whitespace-pre-wrap font-sans leading-relaxed">
                        {aiResponse.content}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="w-[26rem] border-l border-white/[0.08] flex flex-col shrink-0">
          {/* Preview header with device toggle */}
          <div className="h-12 border-b border-white/[0.08] px-3 flex items-center justify-center gap-2">
            <span className="text-[10px] font-medium text-[#9CA3AF] mr-auto flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              Preview
            </span>
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
              <button
                onClick={() => setDeviceMode("desktop")}
                className={`p-1.5 rounded-lg transition-all ${
                  deviceMode === "desktop"
                    ? "bg-[#7C3AED]/10 text-[#7C3AED]"
                    : "text-[#9CA3AF] hover:text-white"
                }`}
                title="Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode("tablet")}
                className={`p-1.5 rounded-lg transition-all ${
                  deviceMode === "tablet"
                    ? "bg-[#7C3AED]/10 text-[#7C3AED]"
                    : "text-[#9CA3AF] hover:text-white"
                }`}
                title="Tablet"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeviceMode("mobile")}
                className={`p-1.5 rounded-lg transition-all ${
                  deviceMode === "mobile"
                    ? "bg-[#7C3AED]/10 text-[#7C3AED]"
                    : "text-[#9CA3AF] hover:text-white"
                }`}
                title="Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          <LivePreview
            question={activeQuestion || null}
            deviceMode={deviceMode}
            totalQuestions={questions.length}
            questionNumber={activeIndex + 1}
          />

          {/* Right panel (history/collaborators) */}
          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/[0.08] overflow-hidden"
              >
                {rightPanelOpen === "history" && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <History className="w-3 h-3 text-[#7C3AED]" />
                        Version History
                      </h4>
                      <button
                        onClick={() => setRightPanelOpen(null)}
                        className="p-1 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {versionHistory.slice().reverse().map((version) => (
                        <div key={version.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                          <div className="w-6 h-6 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center">
                            <History className="w-3 h-3 text-[#7C3AED]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-white">Version {version.version}</p>
                            <p className="text-[9px] text-[#6B7280]">
                              {new Date(version.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <button className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[9px] text-[#9CA3AF] hover:text-white hover:border-white/[0.15] transition-colors">
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rightPanelOpen === "collaborators" && (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-[#7C3AED]" />
                        Collaborators
                      </h4>
                      <button
                        onClick={() => setRightPanelOpen(null)}
                        className="p-1 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {collaborators.map((user) => (
                        <div key={user.userId} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-[8px] font-bold text-white">
                            {user.username.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-white">{user.username}</p>
                            <p className="text-[9px] text-[#6B7280]">
                              {user.currentlyEditing
                                ? <>Editing: <span className="text-[#7C3AED]">Q{questions.findIndex((q) => q.id === user.currentlyEditing) + 1}</span></>
                                : "Idle"}
                            </p>
                          </div>
                          <span className="flex items-center gap-1 text-[8px] text-[#22C55E]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                            Live
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===== Empty State =====
function EmptyState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm px-6"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shadow-2xl shadow-[#7C3AED]/20"
        >
          <ListChecks className="w-9 h-9 text-white" />
        </motion.div>
        <h2 className="text-lg font-bold text-white mb-2">No questions have been added yet.</h2>
        <p className="text-xs text-[#9CA3AF] mb-6 leading-relaxed">
          Start building your quiz by creating your first question.
          You can add dozens or even hundreds of questions with rich formatting, images, code, and math.
        </p>
        <button
          onClick={onCreateFirst}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white hover:shadow-lg hover:shadow-[#7C3AED]/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Your First Question
        </button>
        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Type, label: "Rich Text" },
            { icon: Image, label: "Images" },
            { icon: Sparkles, label: "AI-Powered" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-[#111827] p-3">
              <Icon className="w-4 h-4 mx-auto mb-1.5 text-[#7C3AED]" />
              <p className="text-[9px] text-[#9CA3AF]">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}