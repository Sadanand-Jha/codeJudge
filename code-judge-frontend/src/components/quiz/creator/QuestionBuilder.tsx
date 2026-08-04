"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Eye,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Check,
  X,
  Image as ImageIcon,
  Code,
  Sigma,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Quote,
  GripVertical,
  Copy,
  Trash2,
  Lightbulb,
  BookOpen,
  MessageSquare,
  FileText,
  Clock,
  Award,
  Hash,
  CircleDot,
  ListChecks,
  ToggleRight,
  Type,
  AlignLeft,
  Code2,
  Sparkles,
  Send,
  StickyNote,
} from "lucide-react";
import { QuizDetails, CreatorQuestion, CreatorQuestionType, createDefaultQuestion, getQuestionStatus } from "./types";
import { saveQuizQuestions, saveActiveQuestionId } from "@/utils/quizStorage";
import { toast } from "@/lib/toast";
import { generateQuizCode } from "@/utils/quizCode";

interface QuestionBuilderProps {
  details: QuizDetails;
  initialQuestions?: CreatorQuestion[];
  initialActiveQuestionId?: string;
  onBack: () => void;
  onPublish: () => void;
}

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

const QUESTION_TYPES: Array<{ id: CreatorQuestionType; label: string; icon: LucideIcon }> = [
  { id: "single_choice", label: "MCQ", icon: CircleDot },
  { id: "multiple_choice", label: "Multi", icon: ListChecks },
  { id: "true_false", label: "T/F", icon: ToggleRight },
  { id: "fill_blanks", label: "Fill", icon: FileText },
  { id: "integer", label: "Int", icon: Hash },
  { id: "text", label: "Short", icon: Type },
  { id: "paragraph", label: "Long", icon: AlignLeft },
  { id: "code_output", label: "Code", icon: Code2 },
];

const TYPE_COLORS: Record<CreatorQuestionType, string> = {
  single_choice: "#3B82F6",
  multiple_choice: "#22C55E",
  true_false: "#F59E0B",
  fill_blanks: "#14B8A6",
  integer: "#8B5CF6",
  text: "#EC4899",
  paragraph: "#F97316",
  code_output: "#06B6D4",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22C55E",
  Medium: "#F59E0B",
  Hard: "#F97316",
  Expert: "#EF4444",
};

function ToolbarButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg hover:bg-[#2D3B52] text-[#AAB6C8] hover:text-[#F8FAFC] transition-colors"
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default function QuestionBuilder({
  details,
  initialQuestions,
  initialActiveQuestionId,
  onBack,
  onPublish,
}: QuestionBuilderProps) {
  const [questions, setQuestions] = useState<CreatorQuestion[]>(
    initialQuestions?.length ? initialQuestions : [createDefaultQuestion("q_1")]
  );
  const [activeQuestionId, setActiveQuestionId] = useState(
    initialActiveQuestionId || (initialQuestions?.[0]?.id) || "q_1"
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [now, setNow] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [quizCode] = useState(() => generateQuizCode());
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const [dragOverOption, setDragOverOption] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [quizName, setQuizName] = useState(details.name || "Untitled Quiz");

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) || questions[0];
  const activeIndex = questions.findIndex((q) => q.id === activeQuestionId);

  const totalMarks = useMemo(() => questions.reduce((sum, q) => sum + q.marks, 0), [questions]);
  const totalTime = useMemo(() => questions.reduce((sum, q) => sum + q.expectedTime, 0), [questions]);
  const completedCount = useMemo(() => questions.filter((q) => getQuestionStatus(q) === "complete").length, [questions]);

  // ===== Autosave to localStorage (debounced) =====
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveQuizQuestions(questions, activeQuestionId);
      setLastSaved(new Date());
      setNow(Date.now());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 600);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [questions, activeQuestionId]);

  // ===== Question CRUD =====
  const updateQuestion = useCallback((id: string, updates: Partial<CreatorQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q))
    );
  }, []);

  const addQuestion = useCallback(() => {
    const newQuestion = createDefaultQuestion(`q_${Date.now()}`);
    setQuestions((prev) => [...prev, newQuestion]);
    setActiveQuestionId(newQuestion.id);
    saveActiveQuestionId(newQuestion.id);
  }, []);

  const reorderOptions = (from: number, to: number) => {
    if (to < 0 || to >= activeQuestion.options.length) return;
    const reordered = [...activeQuestion.options];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    updateQuestion(activeQuestion.id, {
      options: reordered.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })),
    });
  };

  const updateOption = (optIndex: number, updates: Partial<CreatorQuestion["options"][0]>) => {
    const newOpts = [...activeQuestion.options];
    newOpts[optIndex] = { ...newOpts[optIndex], ...updates };
    updateQuestion(activeQuestion.id, { options: newOpts });
  };

  const toggleCorrect = (optIndex: number) => {
    const newOpts = activeQuestion.options.map((o, i) => ({
      ...o,
      isCorrect: activeQuestion.type === "multiple_choice" ? (i === optIndex ? !o.isCorrect : o.isCorrect) : i === optIndex,
    }));
    updateQuestion(activeQuestion.id, { options: newOpts });
  };

  const addOption = () => {
    if (activeQuestion.options.length >= 8) return;
    const newOpts = [...activeQuestion.options];
    newOpts.push({
      id: `opt_${Date.now()}`,
      label: String.fromCharCode(65 + newOpts.length),
      content: "",
      isCorrect: false,
    });
    updateQuestion(activeQuestion.id, { options: newOpts });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      updateQuestion(activeQuestion.id, {
        images: [...activeQuestion.images, { id: `img_${Date.now()}`, url }],
      });
    };
    reader.readAsDataURL(file);
  };

  const handleOptionImageUpload = (optIndex: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          updateOption(optIndex, { imageUrl: event.target?.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const isChoiceType = activeQuestion.type === "single_choice" || activeQuestion.type === "multiple_choice" || activeQuestion.type === "true_false";
  const isTextType = activeQuestion.type === "fill_blanks" || activeQuestion.type === "integer" || activeQuestion.type === "text" || activeQuestion.type === "paragraph";

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "";
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  const handlePublish = () => {
    const incomplete = questions.filter((q) => getQuestionStatus(q) !== "complete");
    if (incomplete.length > 0) {
      toast.warning(`${incomplete.length} question(s) are incomplete. Please complete them before publishing.`);
      return;
    }
    onPublish();
  };

  // ===== Preview Mode =====
  if (showPreview) {
    return (
      <div className="fixed inset-0 z-50 bg-[#111827] text-[#F8FAFC] flex flex-col overflow-hidden">
        <div className="h-14 border-b border-[#3A4963] bg-[#1B2433] flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setShowPreview(false)}
            className="h-8 px-3 rounded-lg border border-[#3A4963] bg-[#263245] text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#C7DDEC]/50 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Editor
          </button>
          <div className="w-px h-6 bg-[#3A4963]" />
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#C7DDEC]" />
            <span className="text-xs font-bold text-[#F8FAFC]">Preview Mode</span>
            <span className="text-[9px] text-[#AAB6C8]">Student view</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-[#AAB6C8]">Question {activeIndex + 1} of {questions.length}</span>
            <button
              onClick={() => setShowPreview(false)}
              className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all"
            >
              Return to Editing
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-12">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">{quizName}</h1>
              <p className="text-sm text-[#CBD5E1]">{details.description}</p>
            </div>

            <div className="rounded-2xl border border-[#3A4963] bg-[#202B3D] p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#C7DDEC]">Question {activeIndex + 1}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#263245] border border-[#3A4963] text-[9px] font-medium text-[#CBD5E1]">
                    {activeQuestion.marks} marks
                  </span>
                </div>
                <span className="text-[10px] text-[#AAB6C8]">{activeQuestion.expectedTime} min</span>
              </div>

              <h2 className="text-lg font-medium text-[#F8FAFC] mb-6 leading-relaxed whitespace-pre-wrap">
                {activeQuestion.title || "Untitled question"}
              </h2>

              {activeQuestion.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {activeQuestion.images.map((img) => (
                    <img key={img.id} src={img.url} alt={img.caption || "Question image"} className="h-32 rounded-lg border border-[#3A4963]" />
                  ))}
                </div>
              )}

              {isChoiceType && (
                <div className="space-y-2">
                  {activeQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-3 p-4 rounded-xl border border-[#3A4963] bg-[#263245] hover:border-[#C7DDEC]/30 hover:bg-[#2D3B52] transition-all cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-[#AAB6C8]/40 flex items-center justify-center shrink-0">
                        {activeQuestion.type === "multiple_choice" ? (
                          <div className="w-3 h-3 rounded-sm border border-[#AAB6C8]/40" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#AAB6C8]/40" />
                        )}
                      </div>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-[#CBD5E1] bg-[#2D3B52]">
                        {option.label}
                      </span>
                      <span className="text-sm text-[#F8FAFC]">{option.content || `Option ${option.label}`}</span>
                    </div>
                  ))}
                </div>
              )}

              {isTextType && (
                <div className="rounded-xl border border-[#3A4963] bg-[#263245] p-4">
                  <p className="text-xs text-[#AAB6C8] mb-2">
                    {activeQuestion.type === "paragraph" ? "Write your answer below" : "Type your answer"}
                  </p>
                  {activeQuestion.type === "paragraph" ? (
                    <textarea
                      placeholder="Your answer..."
                      rows={4}
                      className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none resize-none"
                    />
                  ) : (
                    <input
                      type={activeQuestion.type === "integer" ? "number" : "text"}
                      placeholder="Your answer..."
                      className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none"
                    />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#3A4963]">
                <button
                  disabled={activeIndex === 0}
                  onClick={() => setActiveQuestionId(questions[activeIndex - 1].id)}
                  className="h-9 px-4 rounded-lg border border-[#3A4963] bg-[#263245] text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1.5">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionId(q.id)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === activeIndex ? "w-6 bg-[#C7DDEC]" : "bg-[#3A4963] hover:bg-[#AAB6C8]"
                      }`}
                    />
                  ))}
                </div>
                <button
                  disabled={activeIndex === questions.length - 1}
                  onClick={() => setActiveQuestionId(questions[activeIndex + 1].id)}
                  className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white disabled:opacity-30 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#111827] text-[#F8FAFC] flex flex-col overflow-hidden">
      {/* ===== HEADER ===== */}
      <div className="h-14 border-b border-[#3A4963] bg-[#1B2433] flex items-center px-4 gap-3 shrink-0 z-30">
        <button
          onClick={onBack}
          className="h-8 px-2.5 rounded-lg border border-[#3A4963] bg-[#263245] text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#C7DDEC]/50 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="w-px h-6 bg-[#3A4963]" />

        {/* Editable quiz name */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <input
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            className="bg-transparent text-sm font-bold text-[#F8FAFC] focus:outline-none focus:border-b focus:border-[#C7DDEC]/50 transition-colors w-48"
            placeholder="Untitled Quiz"
          />
        </div>

        {/* Auto save status */}
        <div className="flex items-center gap-1.5 text-xs text-[#CBD5E1]">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-[#C7DDEC] animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              <span className="text-[#22C55E]">Saved</span>
              {lastSaved && <span className="text-[9px] text-[#AAB6C8]">{formatLastSaved(lastSaved)}</span>}
            </>
          )}
          {saveStatus === "idle" && (
            <>
              <span className="w-3 h-3 rounded-full bg-[#AAB6C8]" />
              <span className="hidden sm:inline">All changes saved</span>
            </>
          )}
        </div>

        {/* Quiz code */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#263245] border border-[#3A4963]">
          <Hash className="w-3 h-3 text-[#C7DDEC]" />
          <span className="text-[10px] font-mono text-[#CBD5E1]">{quizCode.slice(0, 8)}...</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg hover:bg-[#2D3B52] text-[#AAB6C8] hover:text-[#F8FAFC] transition-colors"
            title="Quiz Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowPreview(true)}
            className="h-8 px-3 rounded-lg border border-[#3A4963] bg-[#263245] text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#C7DDEC]/50 transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            onClick={handlePublish}
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </div>

      {/* ===== WORKSPACE ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ===== LEFT: Question Area (75%) ===== */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Question metadata row */}
          <div className="flex items-center gap-2 px-6 pt-3 pb-2 shrink-0">
            <span className="text-sm font-bold text-[#C7DDEC]">Question {activeIndex + 1}</span>
            <span className="text-xs text-[#AAB6C8]">of {questions.length}</span>
            <div className="ml-auto flex items-center gap-2">
              {/* Difficulty chips */}
              <div className="flex items-center gap-1">
                {(["Easy", "Medium", "Hard", "Expert"] as const).map((level) => {
                  const active = activeQuestion.difficulty === level;
                  const color = DIFFICULTY_COLORS[level];
                  return (
                    <button
                      key={level}
                      onClick={() => updateQuestion(activeQuestion.id, { difficulty: level })}
                      className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all ${
                        active
                          ? "text-white"
                          : "text-[#AAB6C8] hover:text-[#F8FAFC] bg-[#263245] hover:bg-[#2D3B52]"
                      }`}
                      style={active ? { backgroundColor: `${color}25`, color, border: `1px solid ${color}40` } : undefined}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-[#3A4963]" />

              {/* Marks */}
              <div className="flex items-center gap-1.5">
                <Award className="w-3 h-3 text-[#C7DDEC]" />
                <input
                  type="number"
                  value={activeQuestion.marks}
                  onChange={(e) => updateQuestion(activeQuestion.id, { marks: Number(e.target.value) })}
                  min={0}
                  className="w-14 h-7 rounded-lg border border-[#3A4963] bg-[#263245] px-2 text-[11px] text-[#F8FAFC] text-center focus:outline-none focus:border-[#C7DDEC]/50 transition-colors"
                />
              </div>

              <div className="w-px h-5 bg-[#3A4963]" />

              {/* Expected time */}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#C7DDEC]" />
                <input
                  type="number"
                  value={activeQuestion.expectedTime}
                  onChange={(e) => updateQuestion(activeQuestion.id, { expectedTime: Number(e.target.value) })}
                  min={0}
                  className="w-14 h-7 rounded-lg border border-[#3A4963] bg-[#263245] px-2 text-[11px] text-[#F8FAFC] text-center focus:outline-none focus:border-[#C7DDEC]/50 transition-colors"
                />
                <span className="text-[9px] text-[#AAB6C8]">min</span>
              </div>
            </div>
          </div>

          {/* Question type selector */}
          <div className="px-6 pb-2 shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[#3A4963] bg-[#1B2433] overflow-x-auto">
              {QUESTION_TYPES.map((type) => {
                const active = activeQuestion.type === type.id;
                const color = TYPE_COLORS[type.id];
                return (
                  <button
                    key={type.id}
                    onClick={() => updateQuestion(activeQuestion.id, { type: type.id })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                      active
                        ? "text-[#C7DDEC] shadow-lg"
                        : "text-[#AAB6C8] hover:text-[#F8FAFC] bg-[#263245] hover:bg-[#2D3B52]"
                    }`}
                    style={active ? { backgroundColor: `${color}20`, border: `1px solid ${color}40` } : undefined}
                  >
                    <type.icon className="w-3 h-3" style={active ? { color } : undefined} />
                    <span style={active ? { color } : undefined}>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question editor area */}
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="space-y-4">
              {/* Question editor */}
              <div className="rounded-xl border border-[#3A4963] bg-[#1F2937] overflow-hidden focus-within:border-[#C7DDEC]/50 transition-colors">
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 p-1.5 border-b border-[#3A4963] bg-[#243246] flex-wrap">
                  <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" />
                  <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" />
                  <div className="w-px h-4 bg-[#3A4963] mx-1" />
                  <ToolbarButton icon={List} label="Bullet List" />
                  <ToolbarButton icon={ListOrdered} label="Numbered List" />
                  <div className="w-px h-4 bg-[#3A4963] mx-1" />
                  <ToolbarButton icon={ImageIcon} label="Insert Image" />
                  <ToolbarButton icon={Code} label="Code Block" />
                  <ToolbarButton icon={Link} label="Link" />
                  <ToolbarButton icon={Quote} label="Quote" />
                  <div className="w-px h-4 bg-[#3A4963] mx-1" />
                  <ToolbarButton icon={Sigma} label="Math (LaTeX)" />
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-medium text-[#C7DDEC] hover:text-[#F8FAFC] transition-colors flex items-center gap-1"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Add Image
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                </div>

                <textarea
                  value={activeQuestion.title}
                  onChange={(e) => updateQuestion(activeQuestion.id, { title: e.target.value })}
                  placeholder="Write your question here... "
                  className="w-full min-h-[180px] p-5 bg-transparent text-lg text-[#F8FAFC] placeholder-[#94A3B8] resize-none focus:outline-none leading-relaxed"
                />
              </div>

              {/* Question images */}
              {activeQuestion.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeQuestion.images.map((img) => (
                    <div key={img.id} className="relative group">
                      <img src={img.url} alt={img.caption || "Question image"} className="h-16 w-24 object-cover rounded-lg border border-[#3A4963]" />
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

              {/* ===== Answer Options (2x2 grid) ===== */}
              {isChoiceType && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider">
                      {activeQuestion.type === "multiple_choice" ? "Select all correct answers" : "Select the correct answer"}
                    </label>
                    {activeQuestion.type !== "true_false" && activeQuestion.options.length < 8 && (
                      <button
                        onClick={addOption}
                        className="text-[10px] font-medium text-[#C7DDEC] hover:text-[#F8FAFC] transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Option
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <AnimatePresence>
                      {activeQuestion.options.map((option, optIndex) => {
                        const isDragging = draggedOption === optIndex;
                        const isDragOver = dragOverOption === optIndex;
                        return (
                          <motion.div
                            key={option.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            draggable
                            onDragStart={() => setDraggedOption(optIndex)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverOption(optIndex); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedOption !== null) reorderOptions(draggedOption, optIndex);
                              setDraggedOption(null);
                              setDragOverOption(null);
                            }}
                            onDragEnd={() => { setDraggedOption(null); setDragOverOption(null); }}
                            className={`group relative flex items-start gap-2.5 rounded-xl border p-3.5 transition-all ${
                              isDragging
                                ? "opacity-40 border-[#C7DDEC]/50 bg-[#C7DDEC]/10"
                                : isDragOver
                                ? "border-[#C7DDEC]/60 bg-[#C7DDEC]/10 shadow-[0_0_20px_rgba(199,221,236,0.15)]"
                                : option.isCorrect
                                ? "border-[#22C55E]/50 bg-[#1F3A2E] shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                                : "border-[#3A4963] bg-[#202B3D] hover:border-[#C7DDEC]/30 hover:bg-[#2C3B52]"
                            }`}
                          >
                            {/* Drag handle */}
                            <div className="pt-1 cursor-move text-[#AAB6C8] opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
                              <GripVertical className="w-3 h-3" />
                            </div>

                            {/* Selection */}
                            <button
                              onClick={() => toggleCorrect(optIndex)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                                option.isCorrect
                                  ? "border-[#22C55E] bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                  : "border-[#AAB6C8]/40 hover:border-[#22C55E]/50"
                              }`}
                            >
                              {option.isCorrect && <Check className="w-3 h-3 text-white" />}
                            </button>

                            {/* Option label */}
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                option.isCorrect ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30" : "bg-[#263245] text-[#CBD5E1] border border-[#3A4963]"
                              }`}
                            >
                              {option.label}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <input
                                type="text"
                                value={option.content}
                                onChange={(e) => updateOption(optIndex, { content: e.target.value })}
                                placeholder={`Enter option ${option.label}...`}
                                className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none"
                              />
                              {option.imageUrl && (
                                <div className="relative inline-block">
                                  <img src={option.imageUrl} alt={option.caption || `Option ${option.label}`} className="h-14 rounded-lg border border-[#3A4963]" />
                                  <button
                                    onClick={() => updateOption(optIndex, { imageUrl: undefined })}
                                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            {activeQuestion.type !== "true_false" && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => handleOptionImageUpload(optIndex)}
                                  className="p-1 rounded-lg hover:bg-[#2D3B52] text-[#AAB6C8] hover:text-[#F8FAFC] transition-colors"
                                  title="Add image"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    const newOpts = [...activeQuestion.options];
                                    const dup = { ...newOpts[optIndex], id: `opt_${Date.now()}`, label: String.fromCharCode(65 + newOpts.length), isCorrect: false };
                                    newOpts.splice(optIndex + 1, 0, dup);
                                    updateQuestion(activeQuestion.id, { options: newOpts.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
                                  }}
                                  className="p-1 rounded-lg hover:bg-[#2D3B52] text-[#AAB6C8] hover:text-[#F8FAFC] transition-colors"
                                  title="Duplicate option"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {activeQuestion.options.length > 2 && (
                                  <button
                                    onClick={() => {
                                      const newOpts = activeQuestion.options.filter((_, i) => i !== optIndex);
                                      updateQuestion(activeQuestion.id, { options: newOpts.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
                                    }}
                                    className="p-1 rounded-lg hover:bg-[#EF4444]/10 text-[#AAB6C8] hover:text-[#EF4444] transition-colors"
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
                    </AnimatePresence>
                  </div>

                  {/* Correct answer summary */}
                  <div className="flex items-center gap-2 text-[10px] text-[#AAB6C8] pt-2">
                    <Check className="w-3 h-3 text-[#22C55E]" />
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

              {/* ===== Text Answer ===== */}
              {isTextType && (
                <div>
                  <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 block">
                    {activeQuestion.type === "paragraph" ? "Model Answer" : "Correct Answer"}
                  </label>
                  {activeQuestion.type === "paragraph" ? (
                    <textarea
                      value={String(activeQuestion.correctAnswer)}
                      onChange={(e) => updateQuestion(activeQuestion.id, { correctAnswer: e.target.value })}
                      placeholder="Enter the model answer..."
                      rows={3}
                      className="w-full rounded-xl border border-[#3A4963] bg-[#202B3D] px-4 py-3 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors resize-none"
                    />
                  ) : (
                    <input
                      type={activeQuestion.type === "integer" ? "number" : "text"}
                      value={String(activeQuestion.correctAnswer)}
                      onChange={(e) => updateQuestion(activeQuestion.id, { correctAnswer: e.target.value })}
                      placeholder={activeQuestion.type === "integer" ? "Enter the integer answer..." : "Enter the correct answer..."}
                      className="w-full h-10 rounded-xl border border-[#3A4963] bg-[#202B3D] px-4 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT: Utility Panel (25%) ===== */}
        <div className="w-[320px] shrink-0 border-l border-[#3A4963] bg-[#1B2433] flex flex-col h-full">
          {/* Question Navigator */}
          <div className="px-4 pt-4 pb-3 border-b border-[#3A4963]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#F8FAFC] flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-[#C7DDEC]" />
                Questions
                <span className="px-1.5 py-0.5 rounded-md bg-[#C7DDEC]/10 border border-[#C7DDEC]/20 text-[9px] font-bold text-[#C7DDEC]">
                  {questions.length}
                </span>
              </h3>
              <span className="text-[9px] text-[#AAB6C8]">{completedCount}/{questions.length} done</span>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-[#3A4963]/50 overflow-hidden mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]"
                animate={{ width: `${questions.length > 0 ? (completedCount / questions.length) * 100 : 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Numbered circles */}
            <div className="grid grid-cols-8 gap-1.5">
              {questions.map((q, i) => {
                const status = getQuestionStatus(q);
                const isActive = q.id === activeQuestionId;
                let bg = "bg-[#263245] border-[#3A4963] text-[#CBD5E1]";
                if (status === "complete") bg = "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]";
                else if (status === "missing_answer") bg = "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]";
                else bg = "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]";

                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`relative w-8 h-8 rounded-lg border text-[11px] font-bold transition-all ${
                      isActive
                        ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                        : `${bg} hover:scale-105`
                    }`}
                    title={`Question ${i + 1}: ${status}`}
                  >
                    {i + 1}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C7DDEC] shadow-[0_0_6px_rgba(199,221,236,0.5)]" />
                    )}
                  </button>
                );
              })}
              <button
                onClick={addQuestion}
                className="w-8 h-8 rounded-lg border border-dashed border-[#C7DDEC]/30 bg-[#C7DDEC]/5 text-[#C7DDEC] hover:bg-[#C7DDEC]/10 transition-colors flex items-center justify-center"
                title="Add Question"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 text-[9px] text-[#AAB6C8]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Complete
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Draft
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Missing
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Current
              </span>
            </div>
          </div>

          {/* Explanation & Notes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Explanation */}
            <div>
              <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-[#C7DDEC]" />
                Explanation
              </label>
              <textarea
                value={activeQuestion.explanation}
                onChange={(e) => updateQuestion(activeQuestion.id, { explanation: e.target.value })}
                placeholder="Explain the correct answer..."
                rows={4}
                className="w-full rounded-xl border border-[#3A4963] bg-[#263245] px-3 py-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors resize-none"
              />
            </div>

            {/* Hint */}
            <div>
              <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3 text-[#C7DDEC]" />
                Hint
              </label>
              <textarea
                value={activeQuestion.hint}
                onChange={(e) => updateQuestion(activeQuestion.id, { hint: e.target.value })}
                placeholder="Optional hint..."
                rows={2}
                className="w-full rounded-xl border border-[#3A4963] bg-[#263245] px-3 py-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors resize-none"
              />
            </div>

            {/* Reference Notes */}
            <div>
              <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <StickyNote className="w-3 h-3 text-[#C7DDEC]" />
                Reference Notes
              </label>
              <textarea
                value={activeQuestion.topic}
                onChange={(e) => updateQuestion(activeQuestion.id, { topic: e.target.value })}
                placeholder="Add reference notes, links, or resources..."
                rows={2}
                className="w-full rounded-xl border border-[#3A4963] bg-[#263245] px-3 py-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors resize-none"
              />
            </div>

            {/* Internal Comments */}
            <div>
              <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-[#C7DDEC]" />
                Internal Comments
              </label>
              <textarea
                placeholder="Add internal comments for reviewers..."
                rows={2}
                className="w-full rounded-xl border border-[#3A4963] bg-[#263245] px-3 py-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <div className="h-14 border-t border-[#3A4963] bg-[#1B2433] flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={() => { if (activeIndex > 0) setActiveQuestionId(questions[activeIndex - 1].id); }}
          disabled={activeIndex === 0}
          className="h-8 px-3 rounded-lg border border-[#3A4963] bg-[#263245] text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#C7DDEC]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        <div className="text-xs text-[#AAB6C8]">
          Question <span className="text-[#F8FAFC] font-semibold">{activeIndex + 1}</span> of {questions.length}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-[10px] text-[#AAB6C8]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#F59E0B]" />
              {totalTime} min
            </span>
            <span className="w-px h-3 bg-[#3A4963]" />
            <span className="flex items-center gap-1">
              <Award className="w-3 h-3 text-[#22C55E]" />
              {totalMarks} marks
            </span>
            <span className="w-px h-3 bg-[#3A4963]" />
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
              {completedCount} complete
            </span>
          </div>

          <button
            onClick={addQuestion}
            className="h-8 px-3 rounded-lg border border-[#3A4963] bg-[#263245] text-xs font-medium text-[#CBD5E1] hover:text-[#F8FAFC] hover:border-[#C7DDEC]/50 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>

          <button
            onClick={() => {
              saveQuizQuestions(questions, activeQuestionId);
              toast.success("Quiz saved successfully!");
            }}
            className="h-8 px-3 rounded-lg border border-[#C7DDEC]/30 bg-[#C7DDEC]/10 text-xs font-bold text-[#C7DDEC] hover:bg-[#C7DDEC]/20 transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>

          <button
            onClick={() => { if (activeIndex < questions.length - 1) setActiveQuestionId(questions[activeIndex + 1].id); }}
            disabled={activeIndex === questions.length - 1}
            className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===== SETTINGS MODAL ===== */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md bg-[#202B3D] border border-[#3A4963] rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[#3A4963] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#C7DDEC]" />
                    Quiz Settings
                  </h2>
                  <p className="text-xs text-[#CBD5E1] mt-0.5">Configure quiz-level options</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-lg hover:bg-[#2D3B52] text-[#AAB6C8] hover:text-[#F8FAFC] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 block">Quiz Name</label>
                  <input
                    type="text"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#3A4963] bg-[#263245] px-4 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#C7DDEC]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#AAB6C8] uppercase tracking-wider mb-2 block">Quiz Code</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-[#263245] border border-[#3A4963] text-xs text-[#C7DDEC] font-mono">
                      {quizCode}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(quizCode)}
                      className="p-2 rounded-lg border border-[#3A4963] bg-[#263245] text-[#AAB6C8] hover:text-[#F8FAFC] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-[#F8FAFC]">Shuffle Questions</p>
                    <p className="text-xs text-[#CBD5E1] mt-0.5">Randomize question order</p>
                  </div>
                  <button
                    onClick={() => updateQuestion(activeQuestion.id, {})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      details.randomizeQuestions ? "bg-[#C7DDEC]" : "bg-[#3A4963]"
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${details.randomizeQuestions ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}