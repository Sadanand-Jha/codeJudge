"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  Hash,
  Clock,
  Tag,
  Eye,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Image,
  Code,
  Link,
  Table,
  Minus,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  ExternalLink,
  Lightbulb,
  Settings2,
  CheckCircle2,
  AlertCircle,
  X,
  Wand2,
  ChevronDown,
  ChevronUp,
  BookMarked,
  GraduationCap,
  Target,
  Timer,
  Shuffle,
  CaseSensitive,
  SkipForward,
  Award,
  Star,
  ListChecks,
  AlignLeft,
  Quote,
  Undo2,
  Redo2,
  Eraser,
  HelpCircle,
  Paperclip,
  Upload,
  XCircle,
  FolderTree,
} from "lucide-react";
import { StudioQuestion, StudioQuestionType, StudioDifficulty, StudioOption, StudioReference } from "@/types/quiz";

interface QuestionEditorProps {
  question: StudioQuestion;
  onChange: (updated: Partial<StudioQuestion>) => void;
  questionNumber: number;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  validationIssues?: Array<{ field: string; message: string; severity: "error" | "warning" }>;
}

const questionTypes: { value: StudioQuestionType; label: string; description: string; icon: any }[] = [
  { value: "single_choice", label: "Multiple Choice", description: "Single correct option", icon: ListChecks },
  { value: "multiple_choice", label: "Multiple Select", description: "Multiple correct options", icon: ListChecks },
  { value: "true_false", label: "True / False", description: "Binary choice", icon: CheckCircle2 },
  { value: "text", label: "Short Answer", description: "Text input answer", icon: Type },
  { value: "paragraph", label: "Paragraph", description: "Long text response", icon: AlignLeft },
  { value: "fill_blanks", label: "Fill in Blanks", description: "Complete the text", icon: FileText },
  { value: "table_fill", label: "Table Fill", description: "Fill table cells", icon: Table },
  { value: "code_output", label: "Code Output", description: "Predict code output", icon: Code },
  { value: "complexity", label: "Complexity Analysis", description: "Time/space complexity", icon: Timer },
  { value: "debugging", label: "Debugging", description: "Find the bug", icon: AlertCircle },
  { value: "matching", label: "Matching", description: "Match pairs", icon: ListChecks },
  { value: "ordering", label: "Ordering", description: "Arrange in order", icon: List },
  { value: "drag_drop", label: "Drag & Drop", description: "Move items to targets", icon: GripVertical },
  { value: "categorize", label: "Categorize", description: "Group items into categories", icon: FolderTree },
  { value: "hotspot", label: "Hotspot", description: "Click on image region", icon: Target },
  { value: "image_based", label: "Image Based", description: "Question with image", icon: Image },
  { value: "image_label", label: "Image Label", description: "Label image parts", icon: Image },
  { value: "math", label: "Math", description: "Mathematical expression", icon: Hash },
  { value: "graph", label: "Graph", description: "Graph-based question", icon: Hash },
  { value: "formula", label: "Formula", description: "Formula-based answer", icon: Hash },
  { value: "drawing", label: "Drawing", description: "Draw response", icon: Type },
  { value: "video_response", label: "Video Response", description: "Record video answer", icon: Video },
  { value: "audio_response", label: "Audio Response", description: "Record audio answer", icon: Hash },
  { value: "poll", label: "Poll", description: "Instant poll", icon: ListChecks },
  { value: "word_cloud", label: "Word Cloud", description: "Word responses", icon: Type },
];

const difficultyLevels: { value: StudioDifficulty; label: string; color: string }[] = [
  { value: "Easy", label: "Easy", color: "#22C55E" },
  { value: "Medium", label: "Medium", color: "#F59E0B" },
  { value: "Hard", label: "Hard", color: "#EF4444" },
  { value: "Expert", label: "Expert", color: "#EC4899" },
];

const codeLanguages = [
  "C",
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "Go",
  "Rust",
  "SQL",
  "TypeScript",
  "Ruby",
  "Kotlin",
  "Swift",
];

const referenceTypes: { value: StudioReference["type"]; label: string; icon: any }[] = [
  { value: "book", label: "Book", icon: BookOpen },
  { value: "article", label: "Article", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "documentation", label: "Documentation", icon: BookMarked },
];

export default function QuestionEditor({
  question,
  onChange,
  questionNumber,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  showAdvanced,
  onToggleAdvanced,
  validationIssues = [],
}: QuestionEditorProps) {
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showCodeLanguage, setShowCodeLanguage] = useState(false);
  const [showHint, setShowHint] = useState(!!question.hint);
  const [showReferences, setShowReferences] = useState(question.references.length > 0);
  const [showScoring, setShowScoring] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const [dragOverOption, setDragOverOption] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof StudioQuestion, value: any) => {
    onChange({ [field]: value, updatedAt: new Date().toISOString() });
  };

  const addOption = () => {
    if (question.options.length >= 8) return;
    const newOption: StudioOption = {
      id: `opt_${Date.now()}`,
      label: String.fromCharCode(65 + question.options.length),
      content: "",
      isCorrect: false,
    };
    update("options", [...question.options, newOption]);
  };

  const removeOption = (index: number) => {
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== index);
    // Re-label options
    const relabeled = newOptions.map((opt, i) => ({ ...opt, label: String.fromCharCode(65 + i) }));
    update("options", relabeled);
  };

  const updateOption = (index: number, field: keyof StudioOption, value: any) => {
    const newOptions = [...question.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    update("options", newOptions);
  };

  const duplicateOption = (index: number) => {
    if (question.options.length >= 8) return;
    const option = question.options[index];
    const newOption: StudioOption = {
      ...option,
      id: `opt_${Date.now()}`,
      label: String.fromCharCode(65 + question.options.length),
      isCorrect: false,
    };
    const newOptions = [...question.options];
    newOptions.splice(index + 1, 0, newOption);
    const relabeled = newOptions.map((opt, i) => ({ ...opt, label: String.fromCharCode(65 + i) }));
    update("options", relabeled);
  };

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= question.options.length) return;
    const newOptions = [...question.options];
    const [moved] = newOptions.splice(fromIndex, 1);
    newOptions.splice(toIndex, 0, moved);
    const relabeled = newOptions.map((opt, i) => ({ ...opt, label: String.fromCharCode(65 + i) }));
    update("options", relabeled);
  };

  const setCorrectAnswer = (index: number) => {
    const newOptions = question.options.map((opt, i) => ({
      ...opt,
      isCorrect: question.type === "multiple_choice" ? (i === index ? !opt.isCorrect : opt.isCorrect) : i === index,
    }));
    update("options", newOptions);
    if (question.type === "single_choice" || question.type === "true_false") {
      update("correctAnswer", index);
    } else if (question.type === "multiple_choice") {
      const correctIndices = newOptions.filter((o) => o.isCorrect).map((_, i) => i);
      update("correctAnswer", correctIndices);
    }
  };

  const addReference = () => {
    const newRef: StudioReference = {
      id: `ref_${Date.now()}`,
      type: "book",
      title: "",
    };
    update("references", [...question.references, newRef]);
  };

  const updateReference = (id: string, field: keyof StudioReference, value: any) => {
    const newRefs = question.references.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    update("references", newRefs);
  };

  const removeReference = (id: string) => {
    update("references", question.references.filter((r) => r.id !== id));
  };

  const addImage = (url: string, caption?: string) => {
    const newImage = { id: `img_${Date.now()}`, url, caption };
    update("images", [...question.images, newImage]);
  };

  const removeImage = (id: string) => {
    update("images", question.images.filter((img) => img.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      addImage(url);
    };
    reader.readAsDataURL(file);
    setShowImageUpload(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          addImage(url);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDragOverOption = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverOption(index);
  };

  const handleDropOption = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedOption === null || draggedOption === targetIndex) {
      setDraggedOption(null);
      setDragOverOption(null);
      return;
    }
    moveOption(draggedOption, targetIndex);
    setDraggedOption(null);
    setDragOverOption(null);
  };

  const isChoiceType = ["single_choice", "multiple_choice", "true_false"].includes(question.type);
  const isTextType = question.type === "text";
  const isCodeType = ["code_output", "complexity", "debugging"].includes(question.type);
  const isMatchingType = question.type === "matching";
  const isOrderingType = question.type === "ordering";

  const currentTypeMeta = questionTypes.find((t) => t.value === question.type);

  return (
    <div className="h-full overflow-y-auto" onPaste={handlePaste}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* ===== Question Header ===== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">Question {questionNumber}</h2>
            <span className="px-2 py-1 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/30 text-[10px] font-bold text-[#EC4899]">
              {currentTypeMeta?.label || question.type}
            </span>
            {question.isBonus && (
              <span className="px-2 py-1 rounded-lg bg-[#FBBF24]/10 border border-[#FBBF24]/30 text-[10px] font-bold text-[#FBBF24]">
                Bonus
              </span>
            )}
            {question.isMandatory && (
              <span className="px-2 py-1 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[10px] font-bold text-[#EF4444]">
                Mandatory
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="p-2 rounded-lg border border-border bg-white/[0.02] text-muted-foreground hover:text-white hover:border-border-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Question (↑)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-2 rounded-lg border border-border bg-white/[0.02] text-muted-foreground hover:text-white hover:border-border-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Question (↓)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ===== Validation Issues ===== */}
        {validationIssues.length > 0 && (
          <div className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-3 space-y-1.5">
            {validationIssues.map((issue, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                {issue.severity === "error" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                )}
                <span className={issue.severity === "error" ? "text-[#EF4444]" : "text-[#F59E0B]"}>
                  {issue.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ===== Question Settings Bar ===== */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Question Type */}
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Type className="w-3 h-3" />
                Question Type
              </label>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white flex items-center justify-between hover:border-[#EC4899]/40 transition-colors"
              >
                <span className="truncate">{currentTypeMeta?.label || question.type}</span>
                <ChevronDown className={`w-3 h-3 text-[#6B7280] transition-transform ${showTypeDropdown ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showTypeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                    className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-border-hover bg-card shadow-2xl shadow-black/50 overflow-hidden"
                  >
                    {questionTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => {
                          update("type", type.value);
                          setShowTypeDropdown(false);
                        }}
                        className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                          question.type === type.value
                            ? "bg-[#EC4899]/10 text-white"
                            : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <type.icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-medium">{type.label}</p>
                          <p className="text-[9px] text-[#6B7280]">{type.description}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Marks */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Marks
              </label>
              <input
                type="number"
                value={question.marks}
                onChange={(e) => update("marks", Number(e.target.value))}
                min="0"
                className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white focus:border-[#EC4899] focus:outline-none"
              />
            </div>

            {/* Estimated Time */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time (min)
              </label>
              <input
                type="number"
                value={question.estimatedTime || ""}
                onChange={(e) => update("estimatedTime", Number(e.target.value))}
                min="0"
                placeholder="Auto"
                className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#EC4899] focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Tags
              </label>
              <input
                type="text"
                value={question.tags.join(", ")}
                onChange={(e) => update("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
                placeholder="e.g. arrays, dp"
                className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#EC4899] focus:outline-none"
              />
            </div>
          </div>

          {/* Topic & Subtopic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Topic
              </label>
              <input
                type="text"
                value={question.topic || ""}
                onChange={(e) => update("topic", e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#EC4899] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <Target className="w-3 h-3" />
                Subtopic
              </label>
              <input
                type="text"
                value={question.subtopic || ""}
                onChange={(e) => update("subtopic", e.target.value)}
                placeholder="e.g. Linked Lists"
                className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#EC4899] focus:outline-none"
              />
            </div>
          </div>

          {/* Difficulty and Advanced Toggle */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground">Difficulty:</span>
              <div className="flex items-center gap-1">
                {difficultyLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => update("difficulty", level.value)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      question.difficulty === level.value
                        ? "bg-white/[0.06] border border-white/[0.15] text-white"
                        : "bg-white/[0.02] text-muted-foreground border border-border hover:text-white"
                    }`}
                    style={question.difficulty === level.value ? { color: level.color, borderColor: `${level.color}40`, background: `${level.color}10` } : {}}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={onToggleAdvanced}
              className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              {showAdvanced ? "Hide Advanced" : "Show Advanced"}
            </button>
          </div>
        </div>

        {/* ===== Question Title with Rich Text Toolbar ===== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white">Question Title</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImageUpload(!showImageUpload)}
                className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
              >
                <Image className="w-3 h-3" />
                Add Image
              </button>
              {question.images.length > 0 && (
                <span className="text-[10px] text-[#6B7280]">{question.images.length} image(s)</span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1.5 border-b border-border bg-[#0B0D12] flex-wrap">
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Bold (Ctrl+B)">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Italic (Ctrl+I)">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Bullet List">
                <List className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Numbered List">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Insert Image">
                <Image className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Code Block">
                <Code className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Inline Code">
                <Hash className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Link">
                <Link className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Table">
                <Table className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Quote">
                <Quote className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Math (LaTeX)">
                <span className="text-[10px] font-bold">∑</span>
              </button>
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Undo">
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Redo">
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors ml-auto" title="Clear formatting">
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Image upload area */}
            <AnimatePresence>
              {showImageUpload && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 border-b border-border bg-[#0B0D12]">
                    <div
                      className="rounded-lg border-2 border-dashed border-border-hover p-4 text-center hover:border-[#EC4899]/40 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            addImage(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    >
                      <Upload className="w-4 h-4 mx-auto mb-1 text-[#6B7280]" />
                      <p className="text-[10px] text-muted-foreground">Drag & drop, paste, or click to upload</p>
                      <p className="text-[9px] text-[#6B7280] mt-0.5">PNG, JPG, GIF up to 5MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Question images */}
            {question.images.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 border-b border-border bg-[#0B0D12]">
                {question.images.map((img) => (
                  <div key={img.id} className="relative group">
                    <img
                      src={img.url}
                      alt={img.caption || "Question image"}
                      className="h-16 w-24 object-cover rounded-lg border border-border-hover"
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={question.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Enter your question... (Markdown, LaTeX, and code supported)"
              rows={4}
              className="w-full p-3 bg-transparent text-sm text-white placeholder-[#6B7280] resize-none focus:outline-none"
            />
          </div>
          <p className="text-[10px] text-[#6B7280]">
            Supports Markdown, images, tables, math (LaTeX), and code blocks
          </p>
        </div>

        {/* ===== Code Support ===== */}
        {isCodeType && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[#EC4899]" />
                Code Snippet
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCodeLanguage(!showCodeLanguage)}
                  className="h-7 px-2.5 rounded-lg border border-border-hover bg-[#0B0D12] text-[10px] font-medium text-muted-foreground hover:text-white hover:border-white/[0.15] transition-colors flex items-center gap-1.5"
                >
                  {question.codeLanguage || "Select Language"}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showCodeLanguage ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showCodeLanguage && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.98 }}
                      className="absolute z-50 right-0 top-full mt-1 w-40 rounded-xl border border-border-hover bg-card shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      {codeLanguages.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            update("codeLanguage", lang);
                            setShowCodeLanguage(false);
                          }}
                          className={`w-full px-3 py-1.5 text-[10px] text-left transition-colors ${
                            question.codeLanguage === lang
                              ? "bg-[#EC4899]/10 text-[#EC4899]"
                              : "text-muted-foreground hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-[#0B0D12] overflow-hidden">
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-card">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]/60" />
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]/60" />
                <span className="w-2 h-2 rounded-full bg-[#22C55E]/60" />
                <span className="ml-2 text-[9px] text-[#6B7280] font-mono">
                  {question.codeLanguage || "code"} — syntax highlighting
                </span>
              </div>
              <textarea
                value={question.codeSnippet || ""}
                onChange={(e) => update("codeSnippet", e.target.value)}
                placeholder={`// Enter ${question.codeLanguage || "code"} here...\n// Syntax highlighting will be applied automatically`}
                rows={6}
                className="w-full p-3 bg-transparent text-xs font-mono text-[#E5E7EB] placeholder-[#6B7280] resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* ===== Options Section ===== */}
        {isChoiceType && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-[#EC4899]" />
                Options
                <span className="text-[9px] text-[#6B7280]">
                  {question.type === "multiple_choice" ? "Select all correct answers" : "Select the correct answer"}
                </span>
              </label>
              <div className="flex items-center gap-2">
                {question.type !== "true_false" && question.options.length < 8 && (
                  <button
                    onClick={addOption}
                    className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Option
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {question.options.map((option, index) => (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  draggable
                  onDragStart={() => setDraggedOption(index)}
                  onDragOver={(e) => handleDragOverOption(e, index)}
                  onDrop={(e) => handleDropOption(e, index)}
                  onDragEnd={() => {
                    setDraggedOption(null);
                    setDragOverOption(null);
                  }}
                  className={`group flex items-start gap-3 rounded-xl border p-3 transition-all ${
                    option.isCorrect
                      ? "border-[#22C55E]/30 bg-[#22C55E]/5"
                      : "border-border bg-card hover:border-border-hover"
                  } ${dragOverOption === index ? "border-[#EC4899]/50 shadow-[0_0_20px_rgba(236,72,153,0.15)]" : ""}`}
                >
                  {/* Drag handle */}
                  <div className="pt-1 cursor-move text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Selection */}
                  <div className="pt-0.5">
                    {question.type === "multiple_choice" ? (
                      <button
                        onClick={() => setCorrectAnswer(index)}
                        className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                          option.isCorrect
                            ? "bg-[#22C55E] border-[#22C55E]"
                            : "border-white/20 hover:border-[#22C55E]/50"
                        }`}
                      >
                        {option.isCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => setCorrectAnswer(index)}
                        className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
                          option.isCorrect
                            ? "border-[#22C55E]"
                            : "border-white/20 hover:border-[#22C55E]/50"
                        }`}
                      >
                        {option.isCorrect && <div className="w-2 h-2 rounded-full bg-[#22C55E]" />}
                      </button>
                    )}
                  </div>

                  {/* Option Label */}
                  <div className="w-6 pt-0.5 text-[11px] font-bold text-muted-foreground">
                    {option.label}
                  </div>

                  {/* Option Content */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={option.content}
                      onChange={(e) => updateOption(index, "content", e.target.value)}
                      placeholder={`Enter option ${option.label}...`}
                      className="w-full bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
                    />
                    {option.imageUrl && (
                      <div className="relative inline-block">
                        <img
                          src={option.imageUrl}
                          alt={option.caption || `Option ${option.label}`}
                          className="h-20 rounded-lg border border-border-hover"
                        />
                        <button
                          onClick={() => updateOption(index, "imageUrl", undefined)}
                          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.caption || ""}
                        onChange={(e) => updateOption(index, "caption", e.target.value)}
                        placeholder="Caption or explanation (optional)"
                        className="flex-1 bg-transparent text-xs text-muted-foreground placeholder-[#6B7280] focus:outline-none"
                      />
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
                                updateOption(index, "imageUrl", event.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="p-1 rounded hover:bg-white/[0.06] text-[#6B7280] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Add image to option"
                      >
                        <Image className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  {question.type !== "true_false" && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => duplicateOption(index)}
                        className="p-1 rounded hover:bg-white/[0.06] text-[#6B7280] hover:text-white transition-colors"
                        title="Duplicate option"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {question.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-1 rounded hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                          title="Delete option"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Correct answer summary */}
            <div className="flex items-center gap-2 text-[10px] text-[#6B7280] pt-1">
              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
              {question.type === "multiple_choice" ? (
                <span>
                  {question.options.filter((o) => o.isCorrect).length} correct answer(s) selected
                </span>
              ) : (
                <span>
                  {question.options.some((o) => o.isCorrect)
                    ? `Correct answer: ${question.options.find((o) => o.isCorrect)?.label}`
                    : "No correct answer selected"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ===== Text Answer ===== */}
        {isTextType && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-white flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#EC4899]" />
              Correct Answer
            </label>
            <div className="rounded-xl border border-border bg-card p-3">
              <input
                type="text"
                value={(question.correctAnswer as string) || ""}
                onChange={(e) => update("correctAnswer", e.target.value)}
                placeholder="Enter the correct answer..."
                className="w-full bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update("caseSensitive", !question.caseSensitive)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                  question.caseSensitive
                    ? "border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899]"
                    : "border-border bg-white/[0.02] text-muted-foreground hover:text-white"
                }`}
              >
                <CaseSensitive className="w-3 h-3" />
                Case Sensitive
              </button>
            </div>
          </div>
        )}

        {/* ===== Matching ===== */}
        {isMatchingType && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5 text-[#EC4899]" />
                Matching Pairs
              </label>
              <button
                onClick={() => {
                  const pairs = question.matchingPairs || [];
                  update("matchingPairs", [
                    ...pairs,
                    { id: `pair_${Date.now()}`, left: "", right: "" },
                  ]);
                }}
                className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Pair
              </button>
            </div>
            <div className="space-y-2">
              {(question.matchingPairs || []).map((pair, index) => (
                <div key={pair.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <span className="text-[10px] font-bold text-muted-foreground w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={pair.left}
                    onChange={(e) => {
                      const pairs = [...(question.matchingPairs || [])];
                      pairs[index] = { ...pair, left: e.target.value };
                      update("matchingPairs", pairs);
                    }}
                    placeholder="Left item"
                    className="flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none"
                  />
                  <span className="text-[#6B7280]">↔</span>
                  <input
                    type="text"
                    value={pair.right}
                    onChange={(e) => {
                      const pairs = [...(question.matchingPairs || [])];
                      pairs[index] = { ...pair, right: e.target.value };
                      update("matchingPairs", pairs);
                    }}
                    placeholder="Right item"
                    className="flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const pairs = (question.matchingPairs || []).filter((_, i) => i !== index);
                      update("matchingPairs", pairs);
                    }}
                    className="p-1 rounded hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Ordering ===== */}
        {isOrderingType && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-white flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-[#EC4899]" />
                Ordering Items
              </label>
              <button
                onClick={() => {
                  const items = question.orderingItems || [];
                  update("orderingItems", [...items, ""]);
                }}
                className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Item
              </button>
            </div>
            <div className="space-y-2">
              {(question.orderingItems || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <GripVertical className="w-3.5 h-3.5 text-[#6B7280] cursor-move" />
                  <span className="text-[10px] font-bold text-muted-foreground w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const items = [...(question.orderingItems || [])];
                      items[index] = e.target.value;
                      update("orderingItems", items);
                    }}
                    placeholder={`Step ${index + 1}`}
                    className="flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const items = (question.orderingItems || []).filter((_, i) => i !== index);
                      update("orderingItems", items);
                    }}
                    className="p-1 rounded hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Explanation ===== */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-white flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-[#EC4899]" />
            Explanation
            <span className="text-[9px] text-[#6B7280]">Shown after submission</span>
          </label>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-0.5 p-1.5 border-b border-border bg-[#0B0D12]">
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Bold">
                <Bold className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Italic">
                <Italic className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Code">
                <Code className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Image">
                <Image className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors" title="Math">
                <span className="text-[10px] font-bold">∑</span>
              </button>
            </div>
            <textarea
              value={question.explanation}
              onChange={(e) => update("explanation", e.target.value)}
              placeholder="Explain why the correct answer is right... (Markdown supported)"
              rows={3}
              className="w-full p-3 bg-transparent text-sm text-white placeholder-[#6B7280] resize-none focus:outline-none"
            />
          </div>
        </div>

        {/* ===== Hint ===== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" />
              Hint
              <span className="text-[9px] text-[#6B7280]">Optional</span>
            </label>
            <button
              onClick={() => {
                setShowHint(!showHint);
                if (!showHint && !question.hint) {
                  update("hint", "");
                }
              }}
              className={`text-[10px] font-medium transition-colors ${
                showHint ? "text-muted-foreground hover:text-white" : "text-[#EC4899] hover:text-[#DB2777]"
              }`}
            >
              {showHint ? "Remove Hint" : "+ Add Hint"}
            </button>
          </div>
          <AnimatePresence>
            {showHint && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 overflow-hidden">
                  <textarea
                    value={question.hint || ""}
                    onChange={(e) => update("hint", e.target.value)}
                    placeholder="Add a helpful hint for students... (Markdown supported)"
                    rows={2}
                    className="w-full p-3 bg-transparent text-sm text-white placeholder-[#6B7280] resize-none focus:outline-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== References ===== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-white flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#EC4899]" />
              References
              <span className="text-[9px] text-[#6B7280]">Optional</span>
            </label>
            <button
              onClick={() => {
                setShowReferences(!showReferences);
                if (!showReferences) addReference();
              }}
              className={`text-[10px] font-medium transition-colors ${
                showReferences ? "text-muted-foreground hover:text-white" : "text-[#EC4899] hover:text-[#DB2777]"
              }`}
            >
              {showReferences ? "Hide References" : "+ Add Reference"}
            </button>
          </div>
          <AnimatePresence>
            {showReferences && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                {question.references.map((ref) => (
                  <div key={ref.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                    <select
                      value={ref.type}
                      onChange={(e) => updateReference(ref.id, "type", e.target.value)}
                      className="h-7 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-[10px] text-white focus:border-[#EC4899] focus:outline-none"
                    >
                      {referenceTypes.map((rt) => (
                        <option key={rt.value} value={rt.value}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={ref.title}
                      onChange={(e) => updateReference(ref.id, "title", e.target.value)}
                      placeholder="Reference title"
                      className="flex-1 bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={ref.url || ""}
                      onChange={(e) => updateReference(ref.id, "url", e.target.value)}
                      placeholder="URL (optional)"
                      className="w-40 bg-transparent text-xs text-muted-foreground placeholder-[#6B7280] focus:outline-none"
                    />
                    <button
                      onClick={() => removeReference(ref.id)}
                      className="p-1 rounded hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {question.references.length === 0 && (
                  <button
                    onClick={addReference}
                    className="w-full h-9 rounded-xl border border-dashed border-border-hover text-[10px] text-[#6B7280] hover:text-muted-foreground hover:border-white/[0.15] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    Add Reference
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Scoring ===== */}
        <div className="space-y-2">
          <button
            onClick={() => setShowScoring(!showScoring)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-border-hover transition-colors"
          >
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#FBBF24]" />
              Scoring Configuration
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#6B7280] transition-transform ${showScoring ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showScoring && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground">Marks</label>
                      <input
                        type="number"
                        value={question.marks}
                        onChange={(e) => update("marks", Number(e.target.value))}
                        min="0"
                        className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white focus:border-[#EC4899] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground">Negative Marks</label>
                      <input
                        type="number"
                        value={question.negativeMarks}
                        onChange={(e) => update("negativeMarks", Number(e.target.value))}
                        min="0"
                        className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white focus:border-[#EC4899] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white flex items-center gap-1.5">
                      <ListChecks className="w-3 h-3 text-[#EC4899]" />
                      Partial Marking
                      <span className="text-[9px] text-[#6B7280]">For multiple correct</span>
                    </label>
                    <button
                      onClick={() => update("partialMarking", !question.partialMarking)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        question.partialMarking ? "bg-[#EC4899]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          question.partialMarking ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-[#FBBF24]" />
                      Bonus Question
                    </label>
                    <button
                      onClick={() => update("isBonus", !question.isBonus)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        question.isBonus ? "bg-[#FBBF24]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          question.isBonus ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-[#EF4444]" />
                      Mandatory Question
                    </label>
                    <button
                      onClick={() => update("isMandatory", !question.isMandatory)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        question.isMandatory ? "bg-[#EF4444]" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                          question.isMandatory ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Advanced Settings ===== */}
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4 rounded-xl border border-border bg-card p-4"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#EC4899]" />
              Advanced Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  Time Limit (seconds)
                </label>
                <input
                  type="number"
                  value={question.timeLimitPerQuestion || ""}
                  onChange={(e) => update("timeLimitPerQuestion", Number(e.target.value))}
                  placeholder="No limit"
                  className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#EC4899] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Visibility
                </label>
                <select
                  value={question.visibility || "visible"}
                  onChange={(e) => update("visibility", e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border-hover bg-[#0B0D12] text-xs text-white focus:border-[#EC4899] focus:outline-none"
                >
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white flex items-center gap-1.5">
                  <Shuffle className="w-3 h-3 text-[#EC4899]" />
                  Randomize Options
                </label>
                <button
                  onClick={() => update("randomizeOptions", !question.randomizeOptions)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    question.randomizeOptions ? "bg-[#EC4899]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      question.randomizeOptions ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white flex items-center gap-1.5">
                  <CaseSensitive className="w-3 h-3 text-[#EC4899]" />
                  Case Sensitive
                </label>
                <button
                  onClick={() => update("caseSensitive", !question.caseSensitive)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    question.caseSensitive ? "bg-[#EC4899]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      question.caseSensitive ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white flex items-center gap-1.5">
                  <Shuffle className="w-3 h-3 text-[#EC4899]" />
                  Shuffle Answers
                </label>
                <button
                  onClick={() => update("shuffleAnswers", !question.shuffleAnswers)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    question.shuffleAnswers ? "bg-[#EC4899]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      question.shuffleAnswers ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white flex items-center gap-1.5">
                  <SkipForward className="w-3 h-3 text-[#EC4899]" />
                  Allow Skipping
                </label>
                <button
                  onClick={() => update("allowSkipping", !question.allowSkipping)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    question.allowSkipping ? "bg-[#EC4899]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      question.allowSkipping ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3 text-[#EC4899]" />
                  Require Explanation
                  <span className="text-[9px] text-[#6B7280]">Future</span>
                </label>
                <button
                  onClick={() => update("requireExplanation", !question.requireExplanation)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    question.requireExplanation ? "bg-[#EC4899]" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      question.requireExplanation ? "translate-x-4" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}