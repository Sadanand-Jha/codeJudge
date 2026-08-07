"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
  Shuffle,
  Tag,
  Timer,
  Users,
  Check,
  X,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { QuizDetails, DEFAULT_QUIZ_DETAILS, VISIBILITY_OPTIONS, DIFFICULTY_OPTIONS } from "./types";

interface QuizDetailsFormProps {
  onContinue: (details: QuizDetails) => void;
  initialDetails?: QuizDetails;
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

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22C55E",
  Medium: "#F59E0B",
  Hard: "#EF4444",
  Expert: "#EC4899",
};

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ${
          checked ? "bg-[#EC4899]" : "bg-white/10"
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

function FieldLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {icon}
      {children}
    </label>
  );
}

export default function QuizDetailsForm({ onContinue, initialDetails }: QuizDetailsFormProps) {
  const [details, setDetails] = useState<QuizDetails>(initialDetails || DEFAULT_QUIZ_DETAILS);
  const [tagInput, setTagInput] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  const update = (patch: Partial<QuizDetails>) => setDetails((d) => ({ ...d, ...patch }));

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !details.tags.includes(val)) {
      update({ tags: [...details.tags, val] });
    }
    setTagInput("");
  };

  const handleContinue = () => {
    if (!details.name.trim()) return;
    onContinue(details);
  };

  const inputClass =
    "w-full h-11 rounded-xl border border-border-hover bg-[#111217] px-4 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/40 focus:ring-2 focus:ring-[#EC4899]/10 transition-all";

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#EC4899]/5 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-[#7C3AED]/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Quiz Studio</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-3">
            Create New Quiz
          </h1>
          <p className="text-base text-muted-foreground max-w-lg leading-relaxed">
            Set up the foundation of your assessment. {"You'll add questions in the next step."}
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-10"
        >
          {/* ===== Basic Information ===== */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-[#EC4899]" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Basic Information</h2>
            </div>

            <div className="space-y-6">
              {/* Quiz Name */}
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

              {/* Description */}
              <div>
                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={details.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Describe what this quiz covers, who it's for, and any important instructions..."
                  rows={4}
                  className="w-full rounded-xl border border-border-hover bg-[#111217] px-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/40 focus:ring-2 focus:ring-[#EC4899]/10 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Subject + Topic */}
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
                  {showSubjectDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-20 mt-2 w-full rounded-xl border border-border-hover bg-[#171923] shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      <div className="max-h-56 overflow-y-auto p-1.5">
                        {SUBJECTS.map((s) => (
                          <button
                            key={s}
                            onClick={() => { update({ subject: s }); setShowSubjectDropdown(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              details.subject === s ? "bg-[#EC4899]/10 text-[#EC4899]" : "text-muted-foreground hover:text-white hover:bg-white/[0.04]"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
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

              {/* Difficulty */}
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
                            : "border-border-hover bg-[#111217] text-muted-foreground hover:text-white hover:border-white/[0.15]"
                        }`}
                        style={active ? { backgroundColor: `${color}20`, boxShadow: `0 0 20px ${color}20` } : undefined}
                      >
                        <span style={active ? { color } : undefined}>{level}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ===== Visibility ===== */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                <Globe className="w-3 h-3 text-[#EC4899]" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Visibility</h2>
            </div>

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
                        ? "border-[#EC4899]/40 bg-[#EC4899]/5 shadow-[0_0_20px_rgba(236,72,153,0.1)]"
                        : "border-border-hover bg-[#111217] hover:border-white/[0.15]"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#EC4899] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 mb-2 ${active ? "text-[#EC4899]" : "text-[#6B7280]"}`} />
                    <p className={`text-sm font-semibold ${active ? "text-white" : "text-muted-foreground"}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ===== Timing & Schedule ===== */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                <Clock className="w-3 h-3 text-[#EC4899]" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Timing & Schedule</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel icon={<Timer className="w-3 h-3" />}>Time Limit (min)</FieldLabel>
                <div className="relative">
                  <input
                    type="number"
                    value={details.timeLimit}
                    onChange={(e) => update({ timeLimit: Number(e.target.value) })}
                    min={1}
                    className={inputClass}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">min</span>
                </div>
              </div>
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
            </div>
          </section>

          {/* ===== Assessment Rules ===== */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                <Shuffle className="w-3 h-3 text-[#EC4899]" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Assessment Rules</h2>
            </div>

            <div className="rounded-xl border border-border-hover bg-[#111217] px-5 divide-y divide-white/[0.06]">
              <Toggle
                checked={details.randomizeQuestions}
                onChange={(v) => update({ randomizeQuestions: v })}
                label="Randomize Questions"
                description="Shuffle question order for each participant"
              />
              <Toggle
                checked={details.randomizeOptions}
                onChange={(v) => update({ randomizeOptions: v })}
                label="Randomize Options"
                description="Shuffle answer options for each participant"
              />
              <Toggle
                checked={details.allowReattempt}
                onChange={(v) => update({ allowReattempt: v })}
                label="Allow Reattempt"
                description="Let participants retake the quiz"
              />
              <Toggle
                checked={details.showResultImmediately}
                onChange={(v) => update({ showResultImmediately: v })}
                label="Show Result Immediately"
                description="Display score right after submission"
              />
              <Toggle
                checked={details.showCorrectAnswersAfterSubmission}
                onChange={(v) => update({ showCorrectAnswersAfterSubmission: v })}
                label="Show Correct Answers After Submission"
                description="Reveal correct answers after the quiz ends"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <FieldLabel>Passing Percentage</FieldLabel>
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
          </section>

          {/* ===== Tags ===== */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
                <Tag className="w-3 h-3 text-[#EC4899]" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide">Tags</h2>
            </div>

            <div className="rounded-xl border border-border-hover bg-[#111217] p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {details.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EC4899]/10 border border-[#EC4899]/20 text-xs font-medium text-[#EC4899]"
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
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Type a tag and press Enter..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
                />
                <button
                  onClick={addTag}
                  className="px-3 py-1.5 rounded-lg border border-border-hover bg-white/[0.03] text-xs font-medium text-muted-foreground hover:text-white hover:border-white/[0.15] transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </section>
        </motion.div>

        {/* ===== Bottom Action Bar ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="sticky bottom-0 mt-16 -mx-6 sm:-mx-8 px-6 sm:px-8 py-5 bg-gradient-to-t from-[#09090B] via-[#09090B]/95 to-transparent"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {details.name.trim() ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  Draft ready
                </span>
              ) : (
                <span>Enter a quiz name to continue</span>
              )}
            </div>
            <button
              onClick={handleContinue}
              disabled={!details.name.trim()}
              className="group h-12 px-8 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-bold text-white shadow-[0_0_30px_rgba(236,72,153,0.25)] hover:shadow-[0_0_40px_rgba(236,72,153,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
            >
              Continue to Question Builder
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}