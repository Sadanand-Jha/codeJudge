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
  Sparkles,
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
import { DEFAULT_PAPER_HEADER, parseTimeAllowedMinutes, type PaperHeaderMeta } from "@/utils/paperHeader";
import { requireAiCreditsOrNotify } from "@/store/aiCreditsStore";
import { saveTestRecord } from "@/utils/savedTests";
import type { QuestionPaper } from "./paperTypes";

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
  const [paperHeader, setPaperHeader] = useState<PaperHeaderMeta>({ ...DEFAULT_PAPER_HEADER });
  const [draftId] = useState(() => `draft-${Date.now()}`);

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

  const durationForAi = useMemo(
    () => parseTimeAllowedMinutes(paperHeader.timeAllowed) ?? estimatedDuration,
    [paperHeader.timeAllowed, estimatedDuration]
  );

  const handlePaperReady = useCallback((paper: QuestionPaper) => {
    void saveTestRecord({
      draftId,
      title: paper.title.trim() || paperTitle.trim() || "Untitled test",
      creationType: "test",
      duration: paper.durationMinutes ?? durationForAi,
      subjects: paperHeader.subject.trim() ? [paperHeader.subject.trim()] : [],
      sectionsCount: paper.sections.length,
      totalQuestions: paper.totalQuestions,
      totalMarks: paper.totalMarks,
      meta: { ...paperHeader, heading: paper.title.trim() || paperTitle.trim() || "Question Paper" },
      paper,
    })
      .then(() => toast.success({ title: "Paper saved", description: "Find it under Tests in your account." }))
      .catch((error) => toast.error({
        title: "Paper not saved",
        description: error instanceof Error ? error.message : "Could not save the paper to your account.",
      }));
  }, [draftId, paperTitle, paperHeader, durationForAi, toast]);

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
    <div className="creator-mobile-calm mx-auto w-full max-w-[960px] px-4 pb-10 pt-4 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="qs-ui relative mb-4 overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)] sm:p-5">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-brand)]/30 bg-[var(--qs-poly-1)] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--qs-brand)]">
            <FileText className="h-3 w-3" />
            Step {activeStep + 1} of {STEPS.length} · {STEPS[activeStep]?.label}
          </p>
          <h1 className="mt-2 text-[22px] font-black tracking-tight text-[var(--qs-ink)] sm:text-2xl">
            Create Test
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[var(--qs-muted)]">
            Build and structure your question paper with sections.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <button
            type="button"
            onClick={() => (activeStep === 2 ? setActiveStep(1) : router.push("/creator/tests/create"))}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => {
              requireAiCreditsOrNotify();
              setAiModalOpen(true);
            }}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] sm:col-span-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate with AI
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:shadow-none sm:col-span-1"
          >
            {activeStep === 2 ? "Done" : "Continue to Questions"}
            {activeStep !== 2 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="-mx-4 mb-6 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {STEPS.map((s, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          return (
            <div key={s.id} className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => i <= activeStep && setActiveStep(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full border-2 px-3.5 py-2 text-[11px] font-extrabold transition-all",
                  active &&
                    "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-white shadow-[2px_2px_0_var(--qs-sun)]",
                  done && !active &&
                    "border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
                  !active && !done && "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]"
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
            ? "Generate the full question paper from your sections — add a syllabus, review the result, then download."
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
          paperHeader={paperHeader}
          onPaperHeaderChange={setPaperHeader}
          durationMinutes={durationForAi}
          onPaperReady={handlePaperReady}
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
