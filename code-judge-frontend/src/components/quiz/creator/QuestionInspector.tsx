"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  Sparkles,
  Wand2,
  Lightbulb,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Languages,
  Copy,
  Eye,
  Hash,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  EyeOff,
  ListChecks,
} from "lucide-react";
import { CreatorQuestion, BLOOM_LEVELS, DIFFICULTY_OPTIONS, getQuestionStatus } from "./types";

type LucideIcon = React.ComponentType<{ className?: string }>;

interface QuestionInspectorProps {
  question: CreatorQuestion;
  onChange: (updates: Partial<CreatorQuestion>) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#22C55E",
  Medium: "#F59E0B",
  Hard: "#EF4444",
  Expert: "#EC4899",
};

const AI_ACTIONS = [
  { id: "generate_question", label: "Generate Question", icon: Wand2 },
  { id: "generate_options", label: "Generate Options", icon: ListChecks },
  { id: "improve_english", label: "Improve English", icon: Languages },
  { id: "simplify", label: "Simplify", icon: TrendingDown },
  { id: "increase_difficulty", label: "Increase Difficulty", icon: TrendingUp },
  { id: "decrease_difficulty", label: "Decrease Difficulty", icon: TrendingDown },
  { id: "generate_explanation", label: "Generate Explanation", icon: BookOpen },
  { id: "generate_hint", label: "Generate Hint", icon: Lightbulb },
  { id: "generate_similar", label: "Generate Similar Question", icon: Copy },
];

function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: LucideIcon; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-[#EC4899]" />
          {title}
        </span>
        {open ? <ChevronUp className="w-3 h-3 text-[#6B7280]" /> : <ChevronDown className="w-3 h-3 text-[#6B7280]" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full h-8 rounded-lg border border-border bg-[#111217] px-2.5 text-[11px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors";

export default function QuestionInspector({ question, onChange }: QuestionInspectorProps) {
  const [tagInput, setTagInput] = useState("");
  const [showAI, setShowAI] = useState(true);
  const status = getQuestionStatus(question);

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !question.tags.includes(val)) {
      onChange({ tags: [...question.tags, val] });
    }
    setTagInput("");
  };

  return (
    <aside data-sidebar="true" className="w-[320px] shrink-0 border-l border-border bg-[#0B0D14] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5 text-[#EC4899]" />
          Inspector
        </h3>
        <div className="flex items-center gap-1.5">
          {status === "complete" ? (
            <span className="px-2 py-0.5 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/20 text-[9px] font-bold text-[#22C55E] flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Complete
            </span>
          ) : status === "missing_answer" ? (
            <span className="px-2 py-0.5 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[9px] font-bold text-[#F59E0B] flex items-center gap-0.5">
              <AlertCircle className="w-2.5 h-2.5" />
              Missing Answer
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[9px] font-bold text-muted-foreground flex items-center gap-0.5">
              <FileText className="w-2.5 h-2.5" />
              Draft
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ===== AI Assistant ===== */}
        <div className="border-b border-border">
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#EC4899]" />
              AI Assistant
            </span>
            {showAI ? <ChevronUp className="w-3 h-3 text-[#6B7280]" /> : <ChevronDown className="w-3 h-3 text-[#6B7280]" />}
          </button>
          <AnimatePresence initial={false}>
            {showAI && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 gap-1.5">
                    {AI_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-[#111217] text-[11px] font-medium text-muted-foreground hover:text-white hover:border-[#EC4899]/30 hover:bg-[#EC4899]/5 transition-all"
                      >
                        <action.icon className="w-3 h-3 text-[#EC4899]" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== Metadata ===== */}
        <Section title="Metadata" icon={Hash}>
          <Field label="Difficulty">
            <div className="flex items-center gap-1">
              {DIFFICULTY_OPTIONS.map((level) => {
                const active = question.difficulty === level;
                const color = DIFFICULTY_COLORS[level];
                return (
                  <button
                    key={level}
                    onClick={() => onChange({ difficulty: level })}
                    className={`flex-1 px-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                      active ? "text-white" : "text-muted-foreground hover:text-white bg-white/[0.02]"
                    }`}
                    style={active ? { backgroundColor: `${color}20`, color } : undefined}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Marks">
              <div className="relative">
                <input
                  type="number"
                  value={question.marks}
                  onChange={(e) => onChange({ marks: Number(e.target.value) })}
                  min={0}
                  className={inputClass}
                />
                <Award className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B7280]" />
              </div>
            </Field>
            <Field label="Negative Marks">
              <input
                type="number"
                value={question.negativeMarks}
                onChange={(e) => onChange({ negativeMarks: Number(e.target.value) })}
                min={0}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Expected Time (min)">
            <div className="relative">
              <input
                type="number"
                value={question.expectedTime}
                onChange={(e) => onChange({ expectedTime: Number(e.target.value) })}
                min={0}
                className={inputClass}
              />
              <Clock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B7280]" />
            </div>
          </Field>

          <Field label="Topic">
            <input
              type="text"
              value={question.topic}
              onChange={(e) => onChange({ topic: e.target.value })}
              placeholder="e.g. Binary Trees"
              className={inputClass}
            />
          </Field>

          <Field label="Bloom Level">
            <select
              value={question.bloomLevel}
              onChange={(e) => onChange({ bloomLevel: e.target.value as CreatorQuestion["bloomLevel"] })}
              className={inputClass}
            >
              {BLOOM_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </Field>

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {question.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-[#EC4899]/10 border border-[#EC4899]/20 text-[9px] font-medium text-[#EC4899] flex items-center gap-1">
                  {tag}
                  <button onClick={() => onChange({ tags: question.tags.filter((t) => t !== tag) })} className="hover:text-white transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="Add tag..."
              className={inputClass}
            />
          </Field>
        </Section>

        {/* ===== Explanation & Hint ===== */}
        <Section title="Explanation & Hint" icon={BookOpen}>
          <Field label="Explanation">
            <textarea
              value={question.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
              placeholder="Explain the answer..."
              rows={3}
              className="w-full rounded-lg border border-border bg-[#111217] px-2.5 py-2 text-[11px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
            />
          </Field>
          <Field label="Hint">
            <textarea
              value={question.hint}
              onChange={(e) => onChange({ hint: e.target.value })}
              placeholder="Optional hint..."
              rows={2}
              className="w-full rounded-lg border border-border bg-[#111217] px-2.5 py-2 text-[11px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
            />
          </Field>
        </Section>

        {/* ===== Visibility & Status ===== */}
        <Section title="Visibility & Status" icon={Eye}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Visibility</span>
            <button
              onClick={() => onChange({ visibility: question.visibility === "visible" ? "hidden" : "visible" })}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                question.visibility === "visible"
                  ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                  : "border-border bg-white/[0.02] text-muted-foreground"
              }`}
            >
              {question.visibility === "visible" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {question.visibility === "visible" ? "Visible" : "Hidden"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Status</span>
            <button
              onClick={() => onChange({ status: question.status === "published" ? "draft" : "published" })}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
                question.status === "published"
                  ? "border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899]"
                  : "border-border bg-white/[0.02] text-muted-foreground"
              }`}
            >
              {question.status === "published" ? <CheckCircle2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              {question.status === "published" ? "Published" : "Draft"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Required</span>
            <button
              onClick={() => onChange({ required: !question.required })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                question.required ? "bg-[#EC4899]" : "bg-white/10"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${question.required ? "translate-x-4" : "translate-x-1"}`} />
            </button>
          </div>
        </Section>

        {/* ===== Question ID ===== */}
        <Section title="Question ID" icon={Hash} defaultOpen={false}>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#111217] border border-border text-[10px] text-muted-foreground font-mono">
              {question.id}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(question.id)}
              className="p-1.5 rounded-lg border border-border bg-white/[0.02] text-muted-foreground hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </Section>
      </div>
    </aside>
  );
}