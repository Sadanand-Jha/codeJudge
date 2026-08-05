"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Hash,
  Lock,
  School,
  Tag,
  Timer,
  Users,
  Check,
  X,
  Sparkles,
  ChevronDown,
  FileText,
  ListChecks,
  ToggleRight,
  Type,
  AlignLeft,
  Code2,
  Award,
  Target,
  BarChart3,
  Settings2,
  RotateCcw,
  Percent,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { QuizDetails, DEFAULT_QUIZ_DETAILS, VISIBILITY_OPTIONS, DIFFICULTY_OPTIONS, CreatorQuestionType } from "./types";
import { saveQuizDetails } from "@/utils/quizStorage";

interface QuizSettingsPageProps {
  initialDetails?: QuizDetails;
  onContinue: (details: QuizDetails) => void;
}

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "English",
  "History",
  "Geography",
  "Economics",
  "General Knowledge",
  "Aptitude",
  "Programming",
];

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22C55E",
  Medium: "#F59E0B",
  Hard: "#EF4444",
  Expert: "#EC4899",
};


const QUESTION_TYPE_META: Array<{ id: CreatorQuestionType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
  { id: "single_choice", label: "MCQ", icon: ListChecks, color: "#3B82F6" },
  { id: "multiple_choice", label: "Multiple Correct", icon: Check, color: "#22C55E" },
  { id: "true_false", label: "True / False", icon: ToggleRight, color: "#F59E0B" },
  { id: "fill_blanks", label: "Fill in the Blank", icon: FileText, color: "#14B8A6" },
  { id: "integer", label: "Integer", icon: Hash, color: "#8B5CF6" },
  { id: "text", label: "Short Answer", icon: Type, color: "#EC4899" },
  { id: "paragraph", label: "Long Answer", icon: AlignLeft, color: "#F97316" },
  { id: "code_output", label: "Coding", icon: Code2, color: "#06B6D4" },
];

// ─────────────────────────────────────────
// Quiz Cover Image Options
// image1-7.png are UNLOCKED (free to use)
// image8-14.png and hero1-6.png are LOCKED (premium)
// ─────────────────────────────────────────
const QUIZ_IMAGES: Array<{ src: string; label: string; unlocked: boolean }> = [
  { src: "/images/quiz/image1.png", label: "image1", unlocked: true },
  { src: "/images/quiz/image2.png", label: "image2", unlocked: true },
  { src: "/images/quiz/image3.png", label: "image3", unlocked: true },
  { src: "/images/quiz/image4.png", label: "image4", unlocked: true },
  { src: "/images/quiz/image5.png", label: "image5", unlocked: true },
  { src: "/images/quiz/image6.png", label: "image6", unlocked: true },
  { src: "/images/quiz/image7.png", label: "image7", unlocked: true },
  { src: "/images/quiz/image8.png", label: "image8", unlocked: false },
  { src: "/images/quiz/image9.png", label: "image9", unlocked: false },
  { src: "/images/quiz/image10.png", label: "image10", unlocked: false },
  { src: "/images/quiz/image11.png", label: "image11", unlocked: false },
  { src: "/images/quiz/image12.png", label: "image12", unlocked: false },
  { src: "/images/quiz/image13.png", label: "image13", unlocked: false },
  { src: "/images/quiz/image14.png", label: "image14", unlocked: false },
  { src: "/images/hero/hero1.png", label: "hero1", unlocked: false },
  { src: "/images/hero/hero2.png", label: "hero2", unlocked: false },
  { src: "/images/hero/hero3.png", label: "hero3", unlocked: false },
  { src: "/images/hero/hero4.png", label: "hero4", unlocked: false },
  { src: "/images/hero/hero5.png", label: "hero5", unlocked: false },
  { src: "/images/hero/hero6.png", label: "hero6", unlocked: false },
];

function QuizImageSelector({
  value,
  onChange,
}: {
  value?: string;
  onChange: (src?: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
          <ImageIcon className="w-3 h-3 text-[#C7DDEC]" />
          Quiz Cover Image
        </span>
        <span className="rounded-full border border-[#22C55E]/20 bg-[#22C55E]/10 px-2 py-0.5 text-[9px] font-bold text-[#22C55E]">
          {QUIZ_IMAGES.filter((img) => img.unlocked).length} unlocked
        </span>
      </div>

      {/* Preview of selected image */}
      {value && (
        <div className="relative mb-3 rounded-xl overflow-hidden border border-[#C7DDEC]/30">
          <img src={value} alt="Selected cover" className="w-full h-28 sm:h-36 object-cover" />
          <button
            onClick={() => onChange(undefined)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90 transition-colors"
            title="Remove cover image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
        {QUIZ_IMAGES.map((img) => {
          const isSelected = value === img.src;
          return (
            <button
              key={img.src}
              onClick={() => img.unlocked && onChange(img.src)}
              disabled={!img.unlocked}
              className={`relative rounded-lg overflow-hidden border transition-all aspect-[4/3] ${
                isSelected
                  ? "border-[#C7DDEC] ring-2 ring-[#C7DDEC]/40"
                  : img.unlocked
                  ? "border-white/[0.08] hover:border-[#C7DDEC]/40 hover:scale-[1.02]"
                  : "border-white/[0.06] opacity-60 cursor-not-allowed"
              }`}
            >
              <img src={img.src} alt={img.label} className="w-full h-full object-cover" />
              {isSelected && (
                <div className="absolute inset-0 bg-[#C7DDEC]/20 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-[#C7DDEC] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-[#09090B]" />
                  </div>
                </div>
              )}
              {!img.unlocked && (
                <div className="absolute inset-0 bg-[#0B0D14]/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1">
                  <Lock className="w-4 h-4 text-[#C7DDEC]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#C7DDEC]">Locked</span>
                </div>
              )}
              {img.unlocked && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-bold text-white/80">
                  {img.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-[#6B7280]">
        <span className="text-[#22C55E]">●</span> Free images are unlocked.{" "}
        <Lock className="w-2.5 h-2.5 inline text-[#C7DDEC]" /> Premium images require upgrade.
      </p>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-[#9CA3AF] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-[#C7DDEC]" : "bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden hover:border-white/[0.12] transition-colors"
    >
      <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-[#C7DDEC]/10 border border-[#C7DDEC]/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#C7DDEC]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">{title}</h2>
          {subtitle && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

function FieldLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
      {icon}
      {children}
    </label>
  );
}

const inputClass =
  "w-full h-11 rounded-xl border border-white/[0.08] bg-[#0F1522] px-4 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#C7DDEC]/50 focus:ring-2 focus:ring-[#C7DDEC]/10 transition-all";

export default function QuizSettingsPage({ initialDetails, onContinue }: QuizSettingsPageProps) {
  const [details, setDetails] = useState<QuizDetails>(initialDetails || DEFAULT_QUIZ_DETAILS);
  const [tagInput, setTagInput] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const update = useCallback((patch: Partial<QuizDetails>) => {
    setDetails((d) => ({ ...d, ...patch }));
  }, []);

  // Autosave to localStorage (debounced)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveQuizDetails(details);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [details]);

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !details.tags.includes(val)) {
      update({ tags: [...details.tags, val] });
    }
    setTagInput("");
  };

  const handleContinue = () => {
    if (!details.name.trim()) return;
    saveQuizDetails(details);
    onContinue(details);
  };

  // ===== Question Configuration =====
  const questionTypeSum = useMemo(() => {
    return Object.values(details.questionTypeConfig).reduce((sum, n) => sum + (n || 0), 0);
  }, [details.questionTypeConfig]);

  const questionTypeMatch = questionTypeSum === details.totalQuestions;
  const questionTypeRemaining = details.totalQuestions - questionTypeSum;

  const updateQuestionType = (type: CreatorQuestionType, value: number) => {
    const clamped = Math.max(0, value);
    update({
      questionTypeConfig: {
        ...details.questionTypeConfig,
        [type]: clamped,
      },
    });
  };

  // ===== Marks =====
  const calculatedTotalMarks = useMemo(() => {
    if (details.marksPerQuestion > 0 && details.totalQuestions > 0) {
      return details.marksPerQuestion * details.totalQuestions;
    }
    return details.totalMarks;
  }, [details.marksPerQuestion, details.totalQuestions, details.totalMarks]);

  const calculatedPassingMarks = useMemo(() => {
    if (calculatedTotalMarks > 0 && details.passingPercentage > 0) {
      return Math.ceil((calculatedTotalMarks * details.passingPercentage) / 100);
    }
    return details.passingMarks;
  }, [calculatedTotalMarks, details.passingPercentage, details.passingMarks]);

  const estimatedTime = useMemo(() => {
    if (details.totalQuestions > 0) {
      return Math.max(details.timeLimit, Math.ceil(details.totalQuestions * 1.5));
    }
    return details.timeLimit;
  }, [details.totalQuestions, details.timeLimit]);

  const addTagInput = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#09090B] text-white p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-[#9CA3AF] tracking-widest uppercase">Quiz Studio</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create New Quiz</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Configure your assessment settings. You will add questions in the next step.</p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-xs text-[#9CA3AF] flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-[#C7DDEC] border-t-transparent animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-[#22C55E] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* ===== Main Content ===== */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* ===== Basic Information ===== */}
            <SectionCard icon={BookOpen} title="Basic Information" subtitle="Core details about your quiz">
              <div className="space-y-5">
                <div>
                  <FieldLabel>Quiz Name</FieldLabel>
                  <input
                    type="text"
                    value={details.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="e.g. Data Structures & Algorithms — Midterm"
                    className={`${inputClass} text-base font-medium`}
                    autoFocus
                  />
                </div>

                <div>
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    value={details.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="Describe what this quiz covers, who it's for, and any important instructions..."
                    rows={3}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0F1522] px-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#C7DDEC]/50 focus:ring-2 focus:ring-[#C7DDEC]/10 transition-all resize-none leading-relaxed"
                  />
                </div>

                {/* Quiz Cover Image Selector */}
                <div className="rounded-xl border border-white/[0.08] bg-[#0F1522] p-4">
                  <QuizImageSelector
                    value={details.coverImage}
                    onChange={(src) => update({ coverImage: src })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <FieldLabel icon={<GraduationCap className="w-3 h-3" />}>Subject</FieldLabel>
                    <button
                      onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                      className={`${inputClass} flex items-center justify-between text-left`}
                    >
                      <span className={details.subject ? "text-white" : "text-[#6B7280]"}>
                        {details.subject || "Select subject..."}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showSubjectDropdown ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {showSubjectDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 mt-2 w-full rounded-xl border border-white/[0.08] bg-[#171923] shadow-2xl shadow-black/50 overflow-hidden"
                        >
                          <div className="max-h-56 overflow-y-auto p-1.5">
                            {SUBJECTS.map((s) => (
                              <button
                                key={s}
                                onClick={() => { update({ subject: s }); setShowSubjectDropdown(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  details.subject === s ? "bg-[#C7DDEC]/10 text-[#C7DDEC]" : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div>
                    <FieldLabel icon={<Hash className="w-3 h-3" />}>Topic</FieldLabel>
                    <input
                      type="text"
                      value={details.topic}
                      onChange={(e) => update({ topic: e.target.value })}
                      placeholder="e.g. Binary Trees"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Difficulty</FieldLabel>
                  <div className="flex items-center gap-2">
                    {DIFFICULTY_OPTIONS.map((level) => {
                      const active = details.difficulty === level;
                      const color = DIFFICULTY_COLORS[level];
                      return (
                        <button
                          key={level}
                          onClick={() => update({ difficulty: level })}
                          className={`flex-1 h-11 rounded-xl border text-sm font-semibold transition-all ${
                            active
                              ? "border-transparent text-white shadow-lg"
                              : "border-white/[0.08] bg-[#0F1522] text-[#9CA3AF] hover:text-white hover:border-white/[0.15]"
                          }`}
                          style={active ? { backgroundColor: `${color}20`, boxShadow: `0 0 20px ${color}20` } : undefined}
                        >
                          <span style={active ? { color } : undefined}>{level}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel icon={<Tag className="w-3 h-3" />}>Tags</FieldLabel>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0F1522] p-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {details.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7DDEC]/10 border border-[#C7DDEC]/20 text-xs font-medium text-[#C7DDEC]"
                        >
                          {tag}
                          <button onClick={() => update({ tags: details.tags.filter((t) => t !== tag) })} className="hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={addTagInput}
                        placeholder="Type a tag and press Enter..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.15] transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ===== Question Configuration ===== */}
            <SectionCard icon={BarChart3} title="Question Configuration" subtitle="Define the structure of your quiz">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel icon={<Hash className="w-3 h-3" />}>Total Questions</FieldLabel>
                    <input
                      type="number"
                      value={details.totalQuestions || ""}
                      onChange={(e) => update({ totalQuestions: Number(e.target.value) })}
                      min={0}
                      placeholder="e.g. 25"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel icon={<Clock className="w-3 h-3" />}>Quiz Duration (min)</FieldLabel>
                    <input
                      type="number"
                      value={details.timeLimit}
                      onChange={(e) => update({ timeLimit: Number(e.target.value) })}
                      min={1}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Question Type Distribution</FieldLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {QUESTION_TYPE_META.map((meta) => {
                      const Icon = meta.icon;
                      const value = details.questionTypeConfig[meta.id] || 0;
                      return (
                        <div
                          key={meta.id}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0F1522] px-4 py-3 hover:border-white/[0.15] transition-colors"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}25`, color: meta.color }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white">{meta.label}</p>
                          </div>
                          <input
                            type="number"
                            value={value || ""}
                            onChange={(e) => updateQuestionType(meta.id, Number(e.target.value))}
                            min={0}
                            placeholder="0"
                            className="w-16 h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-2 text-sm text-white text-center focus:outline-none focus:border-[#C7DDEC]/50 transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live validation */}
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
                  questionTypeMatch
                    ? "border-[#22C55E]/30 bg-[#22C55E]/5 text-[#22C55E]"
                    : "border-[#F59E0B]/30 bg-[#F59E0B]/5 text-[#F59E0B]"
                }`}>
                  {questionTypeMatch ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>
                    {questionTypeMatch
                      ? `All ${details.totalQuestions} questions accounted for ✓`
                      : questionTypeRemaining > 0
                      ? `${questionTypeRemaining} question(s) remaining to reach ${details.totalQuestions}`
                      : `${Math.abs(questionTypeRemaining)} question(s) over the total of ${details.totalQuestions}`}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* ===== Marks ===== */}
            <SectionCard icon={Award} title="Marks" subtitle="Scoring configuration">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <FieldLabel icon={<Award className="w-3 h-3" />}>Total Marks</FieldLabel>
                  <input
                    type="number"
                    value={calculatedTotalMarks || ""}
                    onChange={(e) => update({ totalMarks: Number(e.target.value) })}
                    min={0}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel icon={<Zap className="w-3 h-3" />}>Marks Per Question</FieldLabel>
                  <input
                    type="number"
                    value={details.marksPerQuestion || ""}
                    onChange={(e) => update({ marksPerQuestion: Number(e.target.value) })}
                    min={0}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel icon={<Percent className="w-3 h-3" />}>Passing %</FieldLabel>
                  <div className="relative">
                    <input
                      type="number"
                      value={details.passingPercentage}
                      onChange={(e) => update({ passingPercentage: Number(e.target.value) })}
                      min={0}
                      max={100}
                      className={inputClass}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">%</span>
                  </div>
                </div>
                <div>
                  <FieldLabel icon={<Target className="w-3 h-3" />}>Passing Marks</FieldLabel>
                  <input
                    type="number"
                    value={calculatedPassingMarks || ""}
                    onChange={(e) => update({ passingMarks: Number(e.target.value) })}
                    min={0}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border border-[#C7DDEC]/20 bg-[#C7DDEC]/5 text-xs text-[#C7DDEC]">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {details.marksPerQuestion > 0 && details.totalQuestions > 0
                    ? `Auto-calculated: ${details.marksPerQuestion} × ${details.totalQuestions} = ${calculatedTotalMarks} total marks. Passing at ${details.passingPercentage}% = ${calculatedPassingMarks} marks.`
                    : "Set marks per question or total marks to see automatic calculations."}
                </span>
              </div>
            </SectionCard>

            {/* ===== Schedule ===== */}
            <SectionCard icon={Calendar} title="Schedule" subtitle="When should this quiz be available?">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel icon={<Calendar className="w-3 h-3" />}>Start Date</FieldLabel>
                  <input
                    type="datetime-local"
                    value={details.startDate}
                    onChange={(e) => update({ startDate: e.target.value })}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <FieldLabel icon={<Calendar className="w-3 h-3" />}>End Date</FieldLabel>
                  <input
                    type="datetime-local"
                    value={details.endDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div className="relative">
                  <FieldLabel icon={<Globe className="w-3 h-3" />}>Time Zone</FieldLabel>
                  <button
                    onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                    className={`${inputClass} flex items-center justify-between text-left`}
                  >
                    <span className="text-white">{details.timeZone}</span>
                    <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showTimezoneDropdown ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {showTimezoneDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-20 mt-2 w-full rounded-xl border border-white/[0.08] bg-[#171923] shadow-2xl shadow-black/50 overflow-hidden"
                      >
                        <div className="max-h-48 overflow-y-auto p-1.5">
                          {TIMEZONES.map((tz) => (
                            <button
                              key={tz}
                              onClick={() => { update({ timeZone: tz }); setShowTimezoneDropdown(false); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                details.timeZone === tz ? "bg-[#C7DDEC]/10 text-[#C7DDEC]" : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]"
                              }`}
                            >
                              {tz}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </SectionCard>

            {/* ===== Visibility ===== */}
            <SectionCard icon={Globe} title="Visibility" subtitle="Who can see and attempt this quiz?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const active = details.visibility === opt.id;
                  const Icon = opt.id === "public" ? Globe : opt.id === "private" ? Lock : opt.id === "college" ? School : Users;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => update({ visibility: opt.id })}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        active
                          ? "border-[#C7DDEC]/40 bg-[#C7DDEC]/5 shadow-[0_0_20px_rgba(199,221,236,0.1)]"
                          : "border-white/[0.08] bg-[#0F1522] hover:border-white/[0.15]"
                      }`}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#C7DDEC] flex items-center justify-center">
                          <Check className="w-3 h-3 text-[#09090B]" />
                        </div>
                      )}
                      <Icon className={`w-5 h-5 mb-2 ${active ? "text-[#C7DDEC]" : "text-[#6B7280]"}`} />
                      <p className={`text-sm font-semibold ${active ? "text-white" : "text-[#9CA3AF]"}`}>{opt.label}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            {/* ===== Quiz Behaviour ===== */}
            <SectionCard icon={Settings2} title="Quiz Behaviour" subtitle="How the quiz behaves during attempts">
              <div className="rounded-xl border border-white/[0.08] bg-[#0F1522] px-5 divide-y divide-white/[0.06]">
                <Toggle
                  checked={details.randomizeQuestions}
                  onChange={(v) => update({ randomizeQuestions: v })}
                  label="Shuffle Questions"
                  description="Shuffle question order for each participant"
                />
                <Toggle
                  checked={details.randomizeOptions}
                  onChange={(v) => update({ randomizeOptions: v })}
                  label="Shuffle Options"
                  description="Shuffle answer options for each participant"
                />
                <Toggle
                  checked={details.showResultImmediately}
                  onChange={(v) => update({ showResultImmediately: v })}
                  label="Show Results Immediately"
                  description="Display score right after submission"
                />
                <Toggle
                  checked={details.showCorrectAnswersAfterSubmission}
                  onChange={(v) => update({ showCorrectAnswersAfterSubmission: v })}
                  label="Show Correct Answers"
                  description="Reveal correct answers after the quiz ends"
                />
                <Toggle
                  checked={details.allowReattempt}
                  onChange={(v) => update({ allowReattempt: v })}
                  label="Allow Reattempt"
                  description="Let participants retake the quiz"
                />
                <Toggle
                  checked={details.negativeMarking}
                  onChange={(v) => update({ negativeMarking: v })}
                  label="Negative Marking"
                  description="Deduct marks for incorrect answers"
                />
              </div>

              {details.negativeMarking && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel icon={<RotateCcw className="w-3 h-3" />}>Negative Marks Value</FieldLabel>
                    <input
                      type="number"
                      value={details.negativeMarkValue}
                      onChange={(e) => update({ negativeMarkValue: Number(e.target.value) })}
                      min={0}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel icon={<Users className="w-3 h-3" />}>Maximum Participants</FieldLabel>
                    <input
                      type="number"
                      value={details.maxParticipants || ""}
                      onChange={(e) => update({ maxParticipants: Number(e.target.value) })}
                      placeholder="Unlimited"
                      min={0}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ===== Right Summary Card ===== */}
          <div className="hidden xl:block w-80 shrink-0">
            <div className="sticky top-20 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#C7DDEC]" />
                  <h3 className="text-sm font-bold text-white">Quiz Summary</h3>
                </div>
                <div className="p-5 space-y-4">
                  <SummaryRow label="Duration" value={`${details.timeLimit} min`} icon={Clock} />
                  <SummaryRow label="Questions" value={`${details.totalQuestions}`} icon={Hash} />
                  <SummaryRow label="Est. Completion" value={`${estimatedTime} min`} icon={Timer} />
                  <SummaryRow label="Total Marks" value={`${calculatedTotalMarks}`} icon={Award} />
                  <SummaryRow label="Passing Marks" value={`${calculatedPassingMarks}`} icon={Target} />
                  <SummaryRow label="Visibility" value={details.visibility} icon={Globe} />
                  <SummaryRow label="Difficulty" value={details.difficulty} icon={BarChart3} />

                  <div className="pt-3 border-t border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Question Distribution</p>
                    <div className="space-y-1.5">
                      {QUESTION_TYPE_META.map((meta) => {
                        const count = details.questionTypeConfig[meta.id] || 0;
                        if (count === 0) return null;
                        return (
                          <div key={meta.id} className="flex items-center justify-between text-xs">
                            <span className="text-[#9CA3AF]">{meta.label}</span>
                            <span className="text-white font-semibold">{count}</span>
                          </div>
                        );
                      })}
                      {questionTypeSum === 0 && (
                        <p className="text-xs text-[#6B7280]">No questions configured yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Continue button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                onClick={handleContinue}
                disabled={!details.name.trim()}
                className="group w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                Continue to Question Builder
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.button>

              {!details.name.trim() && (
                <p className="text-xs text-[#6B7280] text-center">Enter a quiz name to continue</p>
              )}
            </div>
          </div>
        </div>

        {/* ===== Mobile/Tablet Continue Button ===== */}
        <div className="xl:hidden mt-6">
          <button
            onClick={handleContinue}
            disabled={!details.name.trim()}
            className="group w-full h-12 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white shadow-lg shadow-[#7C3AED]/20 hover:shadow-[#7C3AED]/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            Continue to Question Builder
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#9CA3AF] flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#C7DDEC]" />
        {label}
      </span>
      <span className="text-xs font-semibold text-white capitalize">{value}</span>
    </div>
  );
}