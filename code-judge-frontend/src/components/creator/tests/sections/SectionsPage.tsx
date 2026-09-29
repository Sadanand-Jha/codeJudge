"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Save,
  Layers,
  FileText,
  HelpCircle,
  Settings,
  Eye,
  Rocket,
  Clock3,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { SectionCard } from "./SectionCard";
import { AIGenerateModal } from "./AIGenerateModal";
import { QuestionsStep } from "./QuestionsStep";
import {
  type Section,
  createDefaultSection,
  getSectionQuestionCount,
  getSectionMarks,
} from "./types";

const STEPS = [
  { id: "basic", label: "Basic Details", icon: FileText },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "questions", label: "Questions", icon: HelpCircle },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "preview", label: "Preview", icon: Eye },
];

export function SectionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeStep, setActiveStep] = useState(1);
  const [sections, setSections] = useState<Section[]>([createDefaultSection(0)]);
  const [saving, setSaving] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [paperTitle, setPaperTitle] = useState("Operating Systems — Question Paper");

  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + getSectionQuestionCount(s), 0),
    [sections]
  );

  const totalMarks = useMemo(
    () => sections.reduce((sum, s) => sum + getSectionMarks(s), 0),
    [sections]
  );

  const estimatedDuration = useMemo(() => {
    const objectiveQs = sections.reduce(
      (sum, s) =>
        sum +
        s.questionGroups
          .filter((g) => g.category === "objective")
          .reduce((qs, g) => qs + g.questionCount, 0),
      0
    );
    const subjectiveQs = totalQuestions - objectiveQs;
    return Math.max(10, Math.ceil((objectiveQs * 1.5 + subjectiveQs * 6) / 5) * 5);
  }, [sections, totalQuestions]);

  const updateSection = useCallback((id: string, patch: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSection = useCallback((id: string) => {
    setSections((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const duplicateSection = useCallback((id: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const source = prev[idx];
      const newSection: Section = {
        ...source,
        id: `sec_${Date.now()}_dup`,
        name: `${source.name} (Copy)`,
        questionGroups: source.questionGroups.map((g) => ({ ...g, id: `qg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newSection);
      return next;
    });
  }, []);

  const moveSection = useCallback((id: string, direction: "up" | "down") => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  const addSection = useCallback(() => {
    setSections((prev) => [...prev, createDefaultSection(prev.length)]);
  }, []);

  const handleSaveDraft = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success({
        title: "Draft saved",
        description: "Your test structure has been saved.",
      });
    }, 800);
  };

  const handleContinue = () => {
    if (sections.length === 0 || totalQuestions === 0) {
      toast.error({
        title: "Cannot continue",
        description: "Add at least one section with questions.",
      });
      return;
    }
    if (activeStep < 2) {
      setActiveStep(2);
      return;
    }
    toast.success({
      title: "Sections configured",
      description: `${sections.length} section${sections.length !== 1 ? "s" : ""} with ${totalQuestions} question${totalQuestions !== 1 ? "s" : ""} ready.`,
    });
  };

  const canContinue = sections.length > 0 && totalQuestions > 0;

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-28 pt-4 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-primary sm:text-2xl">
            Create Test
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">
            Build and structure your question paper with sections.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold text-text-primary transition-all hover:border-border-hover disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
          >
            Continue to Questions
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="-mx-4 mb-6 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STEPS.map((s, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <div key={s.id} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => i <= activeStep && setActiveStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all",
                  active &&
                    "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]",
                  done && !active &&
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                  !active && !done && "border-border bg-card text-text-secondary"
                )}
              >
                {done && !active ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight
                  className={cn("mx-0.5 h-3.5 w-3.5", done ? "text-emerald-500/60" : "text-text-muted")}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Page Title & Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-extrabold text-text-primary">
          {activeStep === 2 ? "Questions" : "Create Sections"}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {activeStep === 2
            ? "Generate the full question paper from your sections — add a syllabus and let AI pick bank questions, then download."
            : "Organize your question paper into sections and define the question types, marks, and structure for each section."}
        </p>
      </div>

      {/* Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Total Sections</p>
          <p className="mt-1 text-xl font-extrabold text-text-primary tabular-nums">{sections.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Total Questions</p>
          <p className="mt-1 text-xl font-extrabold text-text-primary tabular-nums">{totalQuestions}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Total Marks</p>
          <p className="mt-1 text-xl font-extrabold text-text-primary tabular-nums">{totalMarks}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Est. Duration</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-text-muted" />
            <p className="text-xl font-extrabold text-text-primary tabular-nums">{estimatedDuration} min</p>
          </div>
        </div>
      </motion.div>

      {activeStep === 2 ? (
        <QuestionsStep
          sections={sections}
          paperTitle={paperTitle}
          onPaperTitleChange={setPaperTitle}
        />
      ) : (
        <>
          {/* Sections List */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {sections.map((section, idx) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={idx}
                  totalSections={sections.length}
                  onUpdate={updateSection}
                  onRemove={removeSection}
                  onDuplicate={duplicateSection}
                  onMoveUp={() => moveSection(section.id, "up")}
                  onMoveDown={() => moveSection(section.id, "down")}
                  onAIGenerate={() => setAiModalOpen(true)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Add Section Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <button
              type="button"
              onClick={addSection}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 py-5 text-sm font-semibold text-text-secondary transition-all hover:border-pink-500/30 hover:text-pink-500 dark:hover:text-pink-400"
            >
              <Plus className="h-5 w-5" />
              Add Section
            </button>
          </motion.div>
        </>
      )}

      {/* Footer Nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-border bg-card/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mt-8 sm:border-t sm:bg-transparent sm:px-0 sm:pt-6 sm:shadow-none">
        <button
          type="button"
          onClick={() => (activeStep === 2 ? setActiveStep(1) : router.push("/creator/tests/create"))}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] font-semibold text-text-primary transition-all hover:border-border-hover sm:px-4"
        >
          <ChevronLeft className="h-4 w-4" />
          {activeStep === 2 ? "Back to Sections" : "Back to Basic Details"}
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-text-muted sm:inline">Step {activeStep + 1} of {STEPS.length}</span>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none sm:px-6"
          >
            {activeStep === 2 ? "Done" : "Continue"}
            {activeStep !== 2 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* AI Generate Modal */}
      <AIGenerateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onGenerate={(aiSections) => {
          setSections(aiSections);
          setAiModalOpen(false);
        }}
        existingSectionCount={sections.length}
      />
    </div>
  );
}
