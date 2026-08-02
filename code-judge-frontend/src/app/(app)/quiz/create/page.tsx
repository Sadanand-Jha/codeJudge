"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Eye,
  Save,
  Send,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Circle,
  HelpCircle,
  ListChecks,
  Braces,
  Keyboard,
  MousePointerClick,
  Settings2,
  Search,
  GripVertical,
  Copy,
  X,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Redo2,
  Clock,
  Tag,
  Hash,
  Type,
  Image,
  Code,
  Link,
  Table,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Eraser,
  Lightbulb,
  AlertCircle,
  Check,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Wand2,
  Target,
  Timer,
  Shuffle,
  CaseSensitive,
  SkipForward,
  Award,
  Star,
  AlignLeft,
  FileText,
  Video,
  Mic,
  BarChart3,
  Cloud,
  PenTool,
  FolderTree,
  Move,
  Link2,
  Sigma,
  LineChart,
  FunctionSquare,
  ToggleRight,
  CircleDot,
  Code2,
  GraduationCap,
  BookOpen,
  Globe,
  Lock,
  Users,
  Building2,
  Briefcase,
  Trophy,
  CalendarClock,
  FileBadge,
  Shield,
  Bell,
  Rocket,
  Navigation,
  LifeBuoy,
  RotateCcw,
  Info,
  MessageSquare,
  Settings,
  PanelRight,
  PanelLeft,
  PanelBottom,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Loader2,
} from "lucide-react";
import { QuizQuestion, DEFAULT_ASSESSMENT_SETTINGS, AssessmentSettings, StudioQuestionType } from "@/types/quiz";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { QUESTION_TYPE_META, QuestionTypeMeta, optionColors, pinkGradient } from "@/config/quizTheme";

type QuestionType = StudioQuestionType;

// Map our question type meta to the actual question types
// Each card has a UNIQUE id so it opens its own editor
const QUESTION_TYPES: { id: QuestionType; label: string; description: string; icon: any; category: string; color: string }[] = [
  { id: "single_choice", label: "Multiple Choice", description: "Single correct answer", icon: CircleDot, category: "Basic", color: "#EC4899" },
  { id: "multiple_choice", label: "Multiple Select", description: "Multiple correct answers", icon: ListChecks, category: "Basic", color: "#22C55E" },
  { id: "true_false", label: "True / False", description: "Binary choice", icon: ToggleRight, category: "Basic", color: "#F59E0B" },
  { id: "text", label: "Short Answer", description: "Text response", icon: Type, category: "Text", color: "#EC4899" },
  { id: "paragraph", label: "Paragraph", description: "Long text response", icon: AlignLeft, category: "Text", color: "#8B5CF6" },
  { id: "fill_blanks", label: "Fill in Blanks", description: "Complete the text", icon: FileText, category: "Text", color: "#14B8A6" },
  { id: "table_fill", label: "Table Fill", description: "Fill table cells", icon: Table, category: "Text", color: "#F97316" },
  { id: "code_output", label: "Programming", description: "Code evaluation (future)", icon: Code2, category: "Programming", color: "#06B6D4" },
  { id: "math", label: "Math", description: "Mathematical expression", icon: Sigma, category: "Math", color: "#EC4899" },
  { id: "graph", label: "Graph", description: "Graph-based question", icon: LineChart, category: "Math", color: "#8B5CF6" },
  { id: "formula", label: "Formula", description: "Formula-based answer", icon: FunctionSquare, category: "Math", color: "#F59E0B" },
  { id: "matching", label: "Match", description: "Pair items", icon: Link2, category: "Interactive", color: "#3B82F6" },
  { id: "ordering", label: "Reorder", description: "Sequence items", icon: ListOrdered, category: "Interactive", color: "#22C55E" },
  { id: "drag_drop", label: "Drag & Drop", description: "Move items", icon: Move, category: "Interactive", color: "#F97316" },
  { id: "categorize", label: "Categorize", description: "Group items", icon: FolderTree, category: "Interactive", color: "#EC4899" },
  { id: "hotspot", label: "Hotspot", description: "Click on image", icon: MousePointerClick, category: "Interactive", color: "#14B8A6" },
  { id: "image_label", label: "Image Label", description: "Label image parts", icon: Image, category: "Media", color: "#8B5CF6" },
  { id: "drawing", label: "Drawing", description: "Draw response", icon: PenTool, category: "Media", color: "#F59E0B" },
  { id: "video_response", label: "Video Response", description: "Record video", icon: Video, category: "Media", color: "#EF4444" },
  { id: "audio_response", label: "Audio Response", description: "Record audio", icon: Mic, category: "Media", color: "#3B82F6" },
  { id: "poll", label: "Poll", description: "Instant poll", icon: BarChart3, category: "Media", color: "#22C55E" },
  { id: "word_cloud", label: "Word Cloud", description: "Word responses", icon: Cloud, category: "Media", color: "#EC4899" },
];

const TYPE_CATEGORIES = ["All", "Basic", "Text", "Programming", "Math", "Interactive", "Media"] as const;

interface StudioOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  imageUrl?: string;
  caption?: string;
}

interface StudioQuestion {
  id: string;
  type: QuestionType;
  title: string;
  options: StudioOption[];
  correctAnswer: string | number | number[];
  explanation: string;
  hint?: string;
  points: number;
  negativeMarks: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  estimatedTime: number;
  tags: string[];
  randomizeOptions: boolean;
  caseSensitive: boolean;
  shuffleAnswers: boolean;
  timeLimitPerQuestion?: number;
  isBonus: boolean;
  isMandatory: boolean;
  requireExplanation: boolean;
  images: Array<{ id: string; url: string; caption?: string }>;
  status: "complete" | "incomplete";
}

function createDefaultQuestion(id: string): StudioQuestion {
  const timestamp = Date.now();
  return {
    id,
    type: "multiple_choice",
    title: "",
    options: [
      { id: `opt_${timestamp}_a`, label: "A", content: "", isCorrect: false },
      { id: `opt_${timestamp}_b`, label: "B", content: "", isCorrect: false },
      { id: `opt_${timestamp}_c`, label: "C", content: "", isCorrect: false },
      { id: `opt_${timestamp}_d`, label: "D", content: "", isCorrect: false },
    ],
    correctAnswer: -1,
    explanation: "",
    points: 10,
    negativeMarks: 0,
    difficulty: "Medium",
    estimatedTime: 2,
    tags: [],
    randomizeOptions: false,
    caseSensitive: false,
    shuffleAnswers: false,
    isBonus: false,
    isMandatory: false,
    requireExplanation: false,
    images: [],
    status: "incomplete",
  };
}

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [questions, setQuestions] = useState<StudioQuestion[]>([createDefaultQuestion("q_1")]);
  const [settings, setSettings] = useState<AssessmentSettings>(DEFAULT_ASSESSMENT_SETTINGS);
  const [activeQuestionId, setActiveQuestionId] = useState(questions[0].id);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [showProperties, setShowProperties] = useState(true);
  const [showNavigator, setShowNavigator] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState<number | null>(null);
  const [dragOverQuestion, setDragOverQuestion] = useState<number | null>(null);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [showQuizDetails, setShowQuizDetails] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) || questions[0];
  const activeIndex = questions.findIndex((q) => q.id === activeQuestionId);

  // Validation
  const validationResults = useMemo(() => {
    return questions.map((q) => {
      const issues: Array<{ field: string; message: string; severity: "error" | "warning" }> = [];
      if (!q.title.trim()) issues.push({ field: "title", message: "Question title is required", severity: "error" });
      if (q.options.length < 2) issues.push({ field: "options", message: "Minimum 2 options required", severity: "error" });
      const emptyOptions = q.options.filter((o) => !o.content.trim());
      if (emptyOptions.length > 0) issues.push({ field: "options", message: `${emptyOptions.length} empty option(s)`, severity: "error" });
      if (!q.options.some((o) => o.isCorrect)) issues.push({ field: "correctAnswer", message: "At least one correct answer required", severity: "error" });
      if (q.points <= 0) issues.push({ field: "points", message: "Points must be greater than 0", severity: "error" });
      return { questionId: q.id, isValid: issues.filter((i) => i.severity === "error").length === 0, issues };
    });
  }, [questions]);

  const activeQuestionIssues = activeQuestion
    ? validationResults.find((r) => r.questionId === activeQuestion.id)?.issues || []
    : [];

  const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + q.points, 0), [questions]);
  const validCount = validationResults.filter((r) => r.isValid).length;

  // Auto-save
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const handleSave = useCallback(async (silent = false) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveStatus("saving");
    try {
      await new Promise((r) => setTimeout(r, 600));
      setLastSaved(new Date());
      setSaveStatus("saved");
      if (!silent) toast.success("Quiz saved successfully!");
      autoSaveTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
      if (!silent) toast.error("Failed to save quiz");
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === "idle" && (title.trim() || questions.some((q) => q.title.trim() || q.options.some((o) => o.content)))) {
        handleSave(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [handleSave, saveStatus, title, questions]);

  const addQuestion = () => {
    const newQuestion = createDefaultQuestion(`q_${Date.now()}`);
    newQuestion.type = selectedType || "multiple_choice";
    if (newQuestion.type === "true_false") {
      newQuestion.options = [
        { id: `opt_${Date.now()}_t`, label: "A", content: "True", isCorrect: false },
        { id: `opt_${Date.now()}_f`, label: "B", content: "False", isCorrect: false },
      ];
    }
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
    setSelectedType(null);
    setShowTypePicker(false);
  };

  const updateQuestion = (id: string, updates: Partial<StudioQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) {
      toast.error("Quiz must have at least one question");
      return;
    }
    const next = questions.filter((q) => q.id !== id);
    setQuestions(next);
    if (activeQuestionId === id) setActiveQuestionId(next[0].id);
  };

  const duplicateQuestion = (id: string) => {
    const question = questions.find((q) => q.id === id);
    if (!question) return;
    const duplicated: StudioQuestion = {
      ...question,
      id: `q_${Date.now()}`,
      title: `${question.title} (Copy)`,
      options: question.options.map((opt) => ({ ...opt, id: `opt_${Date.now()}_${opt.label}` })),
    };
    const index = questions.findIndex((q) => q.id === id);
    setQuestions([...questions.slice(0, index + 1), duplicated, ...questions.slice(index + 1)]);
    toast.success("Question duplicated");
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setQuestions(reordered);
  };

  const filteredTypes = useMemo(() => {
    let types = QUESTION_TYPES;
    if (activeCategory !== "All") {
      types = types.filter((t) => t.category === activeCategory);
    }
    if (searchQuery) {
      types = types.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()) || t.category.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return types;
  }, [searchQuery, activeCategory]);

  const handlePublish = () => {
    if (!title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }
    if (validCount < questions.length) {
      toast.error("Please fix validation errors before publishing");
      return;
    }
    setSaveStatus("saving");
    setTimeout(() => {
      setSaveStatus("saved");
      toast.success("Quiz published successfully!");
      router.push("/quiz");
    }, 1200);
  };

  const handleSaveDraft = () => {
    handleSave();
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getQuestionTypeMeta = (type: QuestionType) => {
    return QUESTION_TYPES.find((t) => t.id === type) || QUESTION_TYPES[0];
  };

  const getQuestionStatus = (q: StudioQuestion): "complete" | "incomplete" => {
    const hasTitle = q.title.trim().length > 0;
    const hasOptions = q.options.length >= 2 && q.options.every((o) => o.content.trim() !== "");
    const hasCorrect = q.options.some((o) => o.isCorrect);
    return hasTitle && hasOptions && hasCorrect ? "complete" : "incomplete";
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col text-white">
      {/* ===== TOP TOOLBAR ===== */}
      <div className="h-14 border-b border-white/[0.06] bg-[#0B0D14]/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0 sticky top-0 z-30">
        <button onClick={() => router.back()} className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit
        </button>

        <div className="w-px h-6 bg-white/[0.06]" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{title || "Untitled Quiz"}</p>
            <p className="text-[9px] text-[#71717A]">Quiz Studio</p>
          </div>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 ml-2">
          <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Redo (Ctrl+Y)">
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-[#EC4899] animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-[#22C55E]">Saved</span>
                {lastSaved && <span className="text-[9px] text-[#71717A]">{formatLastSaved(lastSaved)}</span>}
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <span className="w-3 h-3 rounded-full bg-[#71717A]" />
                <span className="hidden sm:inline">All changes saved</span>
              </>
            )}
          </div>

          {/* Panel toggles */}
          <div className="hidden md:flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className={`p-1.5 rounded-lg transition-all ${showNavigator ? "bg-[#EC4899]/10 text-[#EC4899]" : "text-[#9CA3AF] hover:text-white"}`}
              title="Toggle Question Navigator"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowProperties(!showProperties)}
              className={`p-1.5 rounded-lg transition-all ${showProperties ? "bg-[#EC4899]/10 text-[#EC4899]" : "text-[#9CA3AF] hover:text-white"}`}
              title="Toggle Properties Panel"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded-lg transition-all ${showPreview ? "bg-[#EC4899]/10 text-[#EC4899]" : "text-[#9CA3AF] hover:text-white"}`}
              title="Toggle Preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="h-8 px-3 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="h-8 px-3 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button onClick={handleSaveDraft} className="h-8 px-3 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors">
            Save Draft
          </button>

          <button onClick={handlePublish} className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>

      {/* ===== WORKSPACE ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Question Navigator */}
        {showNavigator && (
          <aside className="w-64 border-r border-white/[0.06] bg-[#09090B] flex flex-col shrink-0 hidden md:flex">
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <ListChecks className="w-3.5 h-3.5 text-[#EC4899]" />
                  Questions
                  <span className="px-1.5 py-0.5 rounded-md bg-[#EC4899]/10 border border-[#EC4899]/20 text-[9px] font-bold text-[#EC4899]">
                    {questions.length}
                  </span>
                </h3>
                <span className="text-[9px] text-[#71717A]">{validCount}/{questions.length} valid</span>
              </div>
              <button
                onClick={() => setShowTypePicker(true)}
                className="w-full h-9 rounded-xl border border-dashed border-[#EC4899]/30 bg-[#EC4899]/5 text-xs font-semibold text-[#EC4899] hover:bg-[#EC4899]/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Question
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {questions.map((q, i) => {
                const isActive = q.id === activeQuestionId;
                const TypeIcon = getQuestionTypeMeta(q.type).icon;
                const status = getQuestionStatus(q);
                const isDragging = draggedQuestion === i;
                const isDragOver = dragOverQuestion === i;
                const isMenuOpen = expandedMenu === q.id;

                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    draggable
                    onDragStart={() => setDraggedQuestion(i)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverQuestion(i); }}
                    onDrop={(e) => { e.preventDefault(); handleReorder(draggedQuestion!, i); setDraggedQuestion(null); setDragOverQuestion(null); }}
                    onDragEnd={() => { setDraggedQuestion(null); setDragOverQuestion(null); }}
                    className={`group relative rounded-xl border transition-all cursor-pointer ${
                      isDragging
                        ? "opacity-50 border-[#EC4899]/50 bg-[#EC4899]/10"
                        : isDragOver
                        ? "border-[#EC4899]/60 bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                        : isActive
                        ? "border-[#EC4899]/40 bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                        : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
                    }`}
                    onClick={() => setActiveQuestionId(q.id)}
                  >
                    {isDragOver && <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-[#EC4899] rounded-full" />}
                    <div className="p-2.5">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <div className="cursor-move text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
                            <GripVertical className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-[#9CA3AF]">Q{i + 1}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-medium" style={{ color: getQuestionTypeMeta(q.type).color }}>
                              {getQuestionTypeMeta(q.type).label.split(" ")[0]}
                            </span>
                            <span className="text-[9px] text-[#9CA3AF] ml-auto flex items-center gap-0.5">
                              <Hash className="w-2.5 h-2.5" />
                              {q.points} pts
                            </span>
                          </div>
                          <p className="text-[11px] text-white line-clamp-2 leading-relaxed">
                            {q.title || "Untitled question"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {status === "complete" ? (
                              <span className="text-[9px] text-[#22C55E] flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Complete
                              </span>
                            ) : (
                              <span className="text-[9px] text-[#F59E0B] flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Incomplete
                              </span>
                            )}
                            {q.estimatedTime > 0 && (
                              <span className="text-[9px] text-[#6B7280] flex items-center gap-0.5 ml-auto">
                                <Clock className="w-2.5 h-2.5" />
                                {q.estimatedTime}m
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedMenu(isMenuOpen ? null : q.id); }}
                            className="p-1 rounded-md text-[#6B7280] hover:text-white hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-white/[0.08] bg-[#111217] shadow-2xl shadow-black/50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => { duplicateQuestion(q.id); setExpandedMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                  Duplicate
                                </button>
                                <button
                                  onClick={() => { removeQuestion(q.id); setExpandedMenu(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <div className="p-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowTypePicker(true)}
                className="w-full h-9 rounded-xl border border-[#EC4899]/30 bg-[#EC4899]/10 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>
          </aside>
        )}

        {/* CENTER: Question Editor */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
            {/* ===== Quiz Details ===== */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-[#111217] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#EC4899]" />
                  Quiz Details
                </h3>
                <button onClick={() => setShowQuizDetails(!showQuizDetails)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors">
                  {showQuizDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              <AnimatePresence>
                {showQuizDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Quiz Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter quiz title..."
                        className="w-full h-11 rounded-xl border border-white/[0.08] bg-[#09090B] px-4 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your quiz..."
                        rows={3}
                        className="w-full rounded-xl border border-white/[0.08] bg-[#09090B] px-4 py-3 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Category</label>
                        <select className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#09090B] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors">
                          <option>Academics</option>
                          <option>Placements</option>
                          <option>Coding</option>
                          <option>Certifications</option>
                          <option>Organizations</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Difficulty</label>
                        <select className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#09090B] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors">
                          <option>Easy</option>
                          <option selected>Medium</option>
                          <option>Hard</option>
                          <option>Expert</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ===== Question Editor ===== */}
            <motion.div
              key={activeQuestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/[0.08] bg-[#111217] p-5 space-y-5"
            >
              {/* Question header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#EC4899]">Q{activeIndex + 1}</span>
                  <span
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-medium"
                    style={{ color: getQuestionTypeMeta(activeQuestion.type).color }}
                  >
                    {getQuestionTypeMeta(activeQuestion.type).label}
                  </span>
                  {activeQuestion.isBonus && (
                    <span className="px-2 py-0.5 rounded-md bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-[9px] font-bold text-[#FBBF24]">Bonus</span>
                  )}
                  {activeQuestion.isMandatory && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/30 text-[9px] font-bold text-[#EF4444]">Mandatory</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { if (activeIndex > 0) setActiveQuestionId(questions[activeIndex - 1].id); }}
                    disabled={activeIndex === 0}
                    className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous Question"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (activeIndex < questions.length - 1) setActiveQuestionId(questions[activeIndex + 1].id); }}
                    disabled={activeIndex === questions.length - 1}
                    className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next Question"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => duplicateQuestion(activeQuestion.id)}
                    className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors"
                    title="Duplicate Question"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeQuestion(activeQuestion.id)}
                    className="p-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Validation issues */}
              {activeQuestionIssues.length > 0 && (
                <div className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-3 space-y-1.5">
                  {activeQuestionIssues.map((issue, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                      <span className="text-[#EF4444]">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Question title with rich text toolbar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white">Question Title</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const url = event.target?.result as string;
                              updateQuestion(activeQuestion.id, { images: [...activeQuestion.images, { id: `img_${Date.now()}`, url }] });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
                    >
                      <Image className="w-3 h-3" />
                      Add Image
                    </button>
                    {activeQuestion.images.length > 0 && (
                      <span className="text-[10px] text-[#6B7280]">{activeQuestion.images.length} image(s)</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#09090B] overflow-hidden">
                  {/* Rich text toolbar */}
                  <div className="flex items-center gap-0.5 p-1.5 border-b border-white/[0.06] bg-[#111217] flex-wrap">
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Bold (Ctrl+B)">
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Italic (Ctrl+I)">
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-white/[0.08] mx-1" />
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Bullet List">
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Numbered List">
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-white/[0.08] mx-1" />
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Insert Image">
                      <Image className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Code Block">
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Link">
                      <Link className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Table">
                      <Table className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Quote">
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-white/[0.08] mx-1" />
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors" title="Math (LaTeX)">
                      <span className="text-[10px] font-bold">∑</span>
                    </button>
                    <div className="w-px h-4 bg-white/[0.08] mx-1" />
                    <button className="p-1.5 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors ml-auto" title="Clear formatting">
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Question images */}
                  {activeQuestion.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border-b border-white/[0.06] bg-[#111217]">
                      {activeQuestion.images.map((img) => (
                        <div key={img.id} className="relative group">
                          <img src={img.url} alt={img.caption || "Question image"} className="h-16 w-24 object-cover rounded-lg border border-white/[0.08]" />
                          <button
                            onClick={() => updateQuestion(activeQuestion.id, { images: activeQuestion.images.filter((i) => i.id !== img.id) })}
                            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea
                    value={activeQuestion.title}
                    onChange={(e) => updateQuestion(activeQuestion.id, { title: e.target.value })}
                    placeholder="Enter your question... (Markdown, LaTeX, and code supported)"
                    rows={4}
                    className="w-full p-3 bg-transparent text-sm text-white placeholder-[#6B7280] resize-none focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#6B7280]">
                  Supports Markdown, images, tables, math (LaTeX), and code blocks
                </p>
              </div>

              {/* Options */}
              {(activeQuestion.type === "multiple_choice" || activeQuestion.type === "true_false") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-[#EC4899]" />
                      Options
                      <span className="text-[9px] text-[#6B7280]">
                        {activeQuestion.type === "multiple_choice" ? "Select all correct answers" : "Select the correct answer"}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      {activeQuestion.type !== "true_false" && activeQuestion.options.length < 8 && (
                        <button
                          onClick={() => {
                            const newOpts = [...activeQuestion.options];
                            newOpts.push({
                              id: `opt_${Date.now()}`,
                              label: String.fromCharCode(65 + newOpts.length),
                              content: "",
                              isCorrect: false,
                            });
                            updateQuestion(activeQuestion.id, { options: newOpts });
                          }}
                          className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Option
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeQuestion.options.map((option, index) => {
                      const colorSet = optionColors[index % optionColors.length];
                      return (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`group flex items-start gap-3 rounded-xl border p-3 transition-all ${
                            option.isCorrect
                              ? "border-[#EC4899]/40 bg-[#EC4899]/5 shadow-[0_0_16px_rgba(236,72,153,0.1)]"
                              : "border-white/[0.06] bg-[#09090B] hover:border-white/[0.12]"
                          }`}
                        >
                          {/* Drag handle */}
                          <div className="pt-1 cursor-move text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          {/* Selection */}
                          <div className="pt-0.5">
                            <button
                              onClick={() => {
                                const newOpts = activeQuestion.options.map((o, i) => ({
                                  ...o,
                                  isCorrect: activeQuestion.type === "multiple_choice" ? (i === index ? !o.isCorrect : o.isCorrect) : i === index,
                                }));
                                updateQuestion(activeQuestion.id, { options: newOpts });
                              }}
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                option.isCorrect
                                  ? "border-[#EC4899] bg-[#EC4899]"
                                  : "border-white/20 hover:border-[#EC4899]/50"
                              }`}
                            >
                              {option.isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                            </button>
                          </div>

                          {/* Option Label */}
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: colorSet.bg, color: colorSet.text, borderColor: colorSet.border, borderWidth: 1 }}
                          >
                            {option.label}
                          </div>

                          {/* Option Content */}
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={option.content}
                              onChange={(e) => {
                                const newOpts = [...activeQuestion.options];
                                newOpts[index] = { ...option, content: e.target.value };
                                updateQuestion(activeQuestion.id, { options: newOpts });
                              }}
                              placeholder={`Enter option ${option.label}...`}
                              className="w-full bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
                            />
                            {option.imageUrl && (
                              <div className="relative inline-block">
                                <img src={option.imageUrl} alt={option.caption || `Option ${option.label}`} className="h-20 rounded-lg border border-white/[0.08]" />
                                <button
                                  onClick={() => {
                                    const newOpts = [...activeQuestion.options];
                                    newOpts[index] = { ...option, imageUrl: undefined };
                                    updateQuestion(activeQuestion.id, { options: newOpts });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {activeQuestion.type !== "true_false" && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  const newOpts = [...activeQuestion.options];
                                  const dup = { ...option, id: `opt_${Date.now()}`, label: String.fromCharCode(65 + newOpts.length), isCorrect: false };
                                  newOpts.splice(index + 1, 0, dup);
                                  const relabeled = newOpts.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
                                  updateQuestion(activeQuestion.id, { options: relabeled });
                                }}
                                className="p-1 rounded hover:bg-white/[0.06] text-[#6B7280] hover:text-white transition-colors"
                                title="Duplicate option"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              {activeQuestion.options.length > 2 && (
                                <button
                                  onClick={() => {
                                    const newOpts = activeQuestion.options.filter((_, i) => i !== index);
                                    const relabeled = newOpts.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
                                    updateQuestion(activeQuestion.id, { options: relabeled });
                                  }}
                                  className="p-1 rounded hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                                  title="Delete option"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Correct answer summary */}
                  <div className="flex items-center gap-2 text-[10px] text-[#6B7280] pt-1">
                    <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                    {activeQuestion.type === "multiple_choice" ? (
                      <span>{activeQuestion.options.filter((o) => o.isCorrect).length} correct answer(s) selected</span>
                    ) : (
                      <span>
                        {activeQuestion.options.some((o) => o.isCorrect)
                          ? `Correct answer: ${activeQuestion.options.find((o) => o.isCorrect)?.label}`
                          : "No correct answer selected"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Text answer */}
              {activeQuestion.type === "text" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-[#EC4899]" />
                    Correct Answer
                  </label>
                  <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-3">
                    <input
                      type="text"
                      value={(activeQuestion.correctAnswer as string) || ""}
                      onChange={(e) => updateQuestion(activeQuestion.id, { correctAnswer: e.target.value })}
                      placeholder="Enter the correct answer..."
                      className="w-full bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuestion(activeQuestion.id, { caseSensitive: !activeQuestion.caseSensitive })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                        activeQuestion.caseSensitive
                          ? "border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899]"
                          : "border-white/[0.06] bg-white/[0.02] text-[#9CA3AF] hover:text-white"
                      }`}
                    >
                      <CaseSensitive className="w-3 h-3" />
                      Case Sensitive
                    </button>
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Explanation</label>
                <textarea
                  value={activeQuestion.explanation}
                  onChange={(e) => updateQuestion(activeQuestion.id, { explanation: e.target.value })}
                  placeholder="Explain the correct answer..."
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.06] bg-[#09090B] px-4 py-3 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
                />
              </div>
            </motion.div>
          </div>
        </main>

        {/* RIGHT: Properties Panel — Professional inspector width (400px) */}
        {showProperties && (
          <aside className="w-[400px] border-l border-white/[0.06] bg-[#09090B] flex flex-col shrink-0 hidden lg:flex">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#EC4899]" />
                Question Properties
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Points */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">Points</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={activeQuestion.points}
                    onChange={(e) => updateQuestion(activeQuestion.id, { points: Number(e.target.value) })}
                    className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors"
                  />
                  <span className="text-[10px] text-[#6B7280]">pts</span>
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">Difficulty</label>
                <div className="flex items-center gap-1">
                  {(["Easy", "Medium", "Hard", "Expert"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updateQuestion(activeQuestion.id, { difficulty: level })}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                        activeQuestion.difficulty === level
                          ? "bg-[#EC4899]/10 border border-[#EC4899]/30 text-[#EC4899]"
                          : "bg-white/[0.02] text-[#9CA3AF] border border-white/[0.06] hover:text-white"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">Time Limit (sec)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={activeQuestion.timeLimitPerQuestion || ""}
                    onChange={(e) => updateQuestion(activeQuestion.id, { timeLimitPerQuestion: Number(e.target.value) })}
                    placeholder="30"
                    className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors"
                  />
                  <span className="text-[10px] text-[#6B7280]">s</span>
                </div>
              </div>

              {/* Estimated Time */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">Estimated Time</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={activeQuestion.estimatedTime}
                    onChange={(e) => updateQuestion(activeQuestion.id, { estimatedTime: Number(e.target.value) })}
                    className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors"
                  />
                  <span className="text-[10px] text-[#6B7280]">min</span>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {activeQuestion.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 text-[9px] font-medium text-[#EC4899] flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => updateQuestion(activeQuestion.id, { tags: activeQuestion.tags.filter((_, j) => j !== i) })}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    className="h-6 px-2 rounded-lg bg-transparent text-[10px] text-white placeholder-[#6B7280] focus:outline-none border border-white/[0.06] w-20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        const val = (e.target as HTMLInputElement).value.trim();
                        updateQuestion(activeQuestion.id, { tags: [...activeQuestion.tags, val] });
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>

              {/* Hint */}
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider">Hint</label>
                <textarea
                  value={activeQuestion.hint || ""}
                  onChange={(e) => updateQuestion(activeQuestion.id, { hint: e.target.value })}
                  placeholder="Optional hint..."
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.06] bg-[#111217] px-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#111217]">
                  <span className="text-xs font-medium text-white">Required</span>
                  <button
                    onClick={() => updateQuestion(activeQuestion.id, { isMandatory: !activeQuestion.isMandatory })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      activeQuestion.isMandatory ? "bg-[#EC4899]" : "bg-white/10"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${activeQuestion.isMandatory ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#111217]">
                  <span className="text-xs font-medium text-white">Bonus Question</span>
                  <button
                    onClick={() => updateQuestion(activeQuestion.id, { isBonus: !activeQuestion.isBonus })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      activeQuestion.isBonus ? "bg-[#EC4899]" : "bg-white/10"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${activeQuestion.isBonus ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#111217]">
                  <span className="text-xs font-medium text-white">Shuffle Options</span>
                  <button
                    onClick={() => updateQuestion(activeQuestion.id, { shuffleAnswers: !activeQuestion.shuffleAnswers })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      activeQuestion.shuffleAnswers ? "bg-[#EC4899]" : "bg-white/10"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${activeQuestion.shuffleAnswers ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.06] bg-[#111217]">
                  <span className="text-xs font-medium text-white">Randomize Options</span>
                  <button
                    onClick={() => updateQuestion(activeQuestion.id, { randomizeOptions: !activeQuestion.randomizeOptions })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      activeQuestion.randomizeOptions ? "bg-[#EC4899]" : "bg-white/10"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${activeQuestion.randomizeOptions ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>

              {/* AI Settings */}
              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#EC4899]" />
                  AI Settings
                </label>
                <button className="w-full h-9 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors flex items-center justify-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  Generate with AI
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ===== QUESTION TYPE PICKER MODAL ===== */}
      <AnimatePresence>
        {showTypePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowTypePicker(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-5xl max-h-[85vh] bg-[#111217] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold text-white">Choose Question Type</h2>
                  <button onClick={() => setShowTypePicker(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#A1A1AA] mb-4">Select the type of question you want to add</p>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 w-4 h-4 text-[#71717A]" />
                  <input
                    type="text"
                    placeholder="Search question types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/[0.08] bg-[#09090B] pl-10 pr-4 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors"
                  />
                </div>

                {/* Category filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {TYPE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
                        activeCategory === cat
                          ? "bg-[#EC4899]/15 text-white border border-[#EC4899]/30"
                          : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.03] border border-transparent"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredTypes.map((type, i) => {
                    const Icon = type.icon;
                    return (
                      <motion.button
                        key={`${type.id}-${type.label}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => { setSelectedType(type.id); addQuestion(); }}
                        className="p-4 rounded-2xl border border-white/[0.08] bg-[#171923] hover:border-[#EC4899]/30 hover:bg-[#EC4899]/5 transition-all text-center group"
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border transition-all"
                          style={{
                            backgroundColor: `${type.color}10`,
                            borderColor: `${type.color}25`,
                            color: type.color,
                          }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-white mb-0.5">{type.label}</h3>
                        <p className="text-[9px] text-[#9CA3AF]">{type.description}</p>
                        <span className="inline-block mt-2 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[8px] font-medium text-[#71717A]">
                          {type.category}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SETTINGS MODAL ===== */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl max-h-[85vh] bg-[#111217] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#EC4899]" />
                    Quiz Settings
                  </h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">Configure assessment rules and preferences</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* General */}
                <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-[#EC4899]" />
                    General
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Language</label>
                      <select className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors">
                        <option>English</option>
                        <option>Hindi</option>
                        <option>Spanish</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Passing %</label>
                      <input type="number" defaultValue={40} className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Timing */}
                <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-[#EC4899]" />
                    Timing
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Duration (min)</label>
                      <input type="number" defaultValue={30} className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Time/Question (s)</label>
                      <input type="number" placeholder="Auto" className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Attempts */}
                <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-[#EC4899]" />
                    Attempts
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Attempts Allowed</label>
                      <input type="number" defaultValue={3} className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[#A1A1AA] uppercase tracking-wider mb-1.5 block">Score Method</label>
                      <select className="w-full h-9 rounded-lg border border-white/[0.06] bg-[#111217] px-3 text-xs text-white focus:outline-none focus:border-[#EC4899]/30 transition-colors">
                        <option>Best</option>
                        <option>Latest</option>
                        <option>Highest</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Randomization */}
                <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-4 space-y-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Shuffle className="w-3.5 h-3.5 text-[#EC4899]" />
                    Randomization
                  </h3>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[#A1A1AA]">Randomize Questions</span>
                    <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.randomizeQuestions ? "bg-[#EC4899]" : "bg-white/10"}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${settings.randomizeQuestions ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[#A1A1AA]">Randomize Options</span>
                    <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.randomizeOptions ? "bg-[#EC4899]" : "bg-white/10"}`}>
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${settings.randomizeOptions ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>

                {/* Security */}
                <div className="rounded-xl border border-white/[0.06] bg-[#09090B] p-4 space-y-2">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#EC4899]" />
                    Security
                  </h3>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[#A1A1AA]">Fullscreen Mode</span>
                    <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${false ? "bg-[#EC4899]" : "bg-white/10"}`}>
                      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-[#A1A1AA]">Tab Switching Detection</span>
                    <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${false ? "bg-[#EC4899]" : "bg-white/10"}`}>
                      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
                <button onClick={() => setShowSettings(false)} className="h-9 px-4 rounded-lg border border-white/[0.06] bg-white/[0.03] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors">
                  Cancel
                </button>
                <button onClick={() => { setShowSettings(false); toast.success("Settings saved"); }} className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all">
                  Save Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}