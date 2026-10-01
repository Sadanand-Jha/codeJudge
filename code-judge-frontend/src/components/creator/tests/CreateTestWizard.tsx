"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  FileText,
  GraduationCap,
  Layers,
  HelpCircle,
  ListChecks,
  Wallet,
  Eye,
  Rocket,
  IndianRupee,
  Timer,
  Clock3,
  BookmarkPlus,
  FolderOpen,
  Save,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { deleteSectionBlueprint, getQuestionGeneratorCatalog, getSectionBlueprints, saveSectionBlueprint, useSectionBlueprint } from "@/services/aiGenerate";
import type { SectionBlueprint } from "@/services/aiGenerate";
import { EXAMS, LANGUAGES } from "@/components/tests/mockData";
import { PrimaryButton, GhostButton } from "@/components/tests/ui";
import { AiStreamText } from "@/components/ui";
import { SectionCard } from "./sections/SectionCard";
import { AIGenerateModal } from "./sections/AIGenerateModal";
import { QuestionsStep } from "./sections/QuestionsStep";
import { SectionBlueprintLibrary } from "./sections/SectionBlueprintLibrary";
import {
  type Section,
  createDefaultSection,
  getSectionQuestionCount,
  getSectionMarks,
} from "./sections/types";

const STEPS = [
  { id: "basic", label: "Basic Information", icon: FileText },
  // Exam & Subjects step commented out — remove this line to restore it (and the step UI + canContinue branch below).
  // { id: "exam", label: "Exam & Subjects", icon: GraduationCap },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "questions", label: "Questions", icon: HelpCircle },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "publish", label: "Submit / Publish", icon: Rocket },
];

// The current curated question bank is Operating Systems only. Keep the UI
// aligned with the backend rather than presenting unavailable mock subjects.
const SUBJECT_POOL = ["Operating System"];

const cloneBlueprintSections = (sections: Section[]): Section[] => sections.map((section, sectionIndex) => ({
  ...section,
  id: `sec_${Date.now()}_${sectionIndex}_${Math.random().toString(36).slice(2, 6)}`,
  questionGroups: section.questionGroups.map((group, groupIndex) => ({
    ...group,
    id: `qg_${Date.now()}_${sectionIndex}_${groupIndex}_${Math.random().toString(36).slice(2, 6)}`,
    children: group.children?.map((child, childIndex) => ({ ...child, id: `sq_${Date.now()}_${sectionIndex}_${groupIndex}_${childIndex}` })),
    nestedConfig: group.nestedConfig?.map((item, itemIndex) => ({ ...item, id: `nc_${Date.now()}_${sectionIndex}_${groupIndex}_${itemIndex}` })),
  })),
}));

export type CreationType = "test" | "quiz" | "assessment";

const CREATION_META: Record<CreationType, { title: string; subtitle: string; cta: string; toast: string; redirect: string }> = {
  test: {
    title: "Create Test",
    subtitle: "Publish a free or paid test and start earning from enrollments.",
    cta: "Publish Test",
    toast: "Test published",
    redirect: "/creator/tests",
  },
  quiz: {
    title: "Create Quiz",
    subtitle: "Build a quick, interactive quiz with instant scoring.",
    cta: "Publish Quiz",
    toast: "Quiz published",
    redirect: "/creator/quizzes",
  },
  assessment: {
    title: "Create Assessment",
    subtitle: "Set up a classroom assessment for your students.",
    cta: "Publish Assessment",
    toast: "Assessment published",
    redirect: "/creator/tests",
  },
};

export function CreateTestWizard({ creationType = "test" }: { creationType?: CreationType }) {
  const router = useRouter();
  const toast = useToast();
  const meta = CREATION_META[creationType];
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(180);
  const [examId, setExamId] = useState("");
  const [subjects, setSubjects] = useState<string[]>(["Operating System"]);
  // Same subject source as Create Problem (question-generator catalog), so
  // both pages always show identical subjects. Null = still loading.
  const [catalogSubjects, setCatalogSubjects] = useState<string[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getQuestionGeneratorCatalog(controller.signal)
      .then((catalog) => {
        const names = catalog.subjects.map((s) => s.name);
        setCatalogSubjects(names);
        if (names.length > 0) setSubjects(names);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setCatalogSubjects([]);
      });
    return () => controller.abort();
  }, []);
  const [language, setLanguage] = useState<string>("english");
  const [difficulty, setDifficulty] = useState("medium");
  const [sections, setSections] = useState<Section[]>([createDefaultSection(0)]);
  const [mode, setMode] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [blueprintLibraryOpen, setBlueprintLibraryOpen] = useState(false);
  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const [blueprints, setBlueprints] = useState<SectionBlueprint[]>([]);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [blueprintsLoaded, setBlueprintsLoaded] = useState(false);
  const [blueprintBusyId, setBlueprintBusyId] = useState<number | null>(null);
  const [saveBlueprintOpen, setSaveBlueprintOpen] = useState(false);
  const [blueprintName, setBlueprintName] = useState("");
  const [blueprintDescription, setBlueprintDescription] = useState("");
  const [savingBlueprint, setSavingBlueprint] = useState(false);

  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + getSectionQuestionCount(s), 0),
    [sections]
  );

  const totalMarks = useMemo(
    () => sections.reduce((sum, s) => sum + getSectionMarks(s), 0),
    [sections]
  );

  const selectedExam = EXAMS.find((e) => e.id === examId);

  const canContinue = () => {
    if (step === 0) return title.trim().length > 3 && description.trim().length > 10;
    // Exam & Subjects gate commented out with its step: `if (step === 1) return examId !== "" && subjects.length > 0;`
    if (step === 1) return sections.length > 0 && totalQuestions > 0;
    if (step === 2) return true;
    if (step === 3) return mode === "free" || price > 0;
    return true;
  };

  const sectionChoicePending = step === 1 && (!sectionEditorOpen || blueprintLibraryOpen);
  const hasNextStep = step < STEPS.length - 1;

  const goBack = () => setStep((current) => Math.max(0, current - 1));
  const goForward = () => {
    if (!canContinue() || sectionChoicePending) return;
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

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

  useEffect(() => {
    if (step !== 1 || blueprintsLoaded || blueprintsLoading) return;
    let active = true;
    setBlueprintsLoading(true);
    getSectionBlueprints()
      .then((saved) => {
        if (active) setBlueprints(saved);
      })
      .catch((error) => {
        if (active) toast.error({ title: "Could not load saved sections", description: error instanceof Error ? error.message : "Please try again." });
      })
      .finally(() => {
        if (active) {
          setBlueprintsLoading(false);
          setBlueprintsLoaded(true);
        }
      });
    return () => { active = false; };
  }, [step, blueprintsLoaded, toast]);

  const startNewSection = useCallback(() => {
    setSections([createDefaultSection(0)]);
    setBlueprintLibraryOpen(false);
    setSectionEditorOpen(true);
  }, []);

  const openBlueprintLibrary = useCallback(async () => {
    setBlueprintLibraryOpen(true);
    setSectionEditorOpen(false);
    if (blueprintsLoaded || blueprintsLoading) return;
    setBlueprintsLoading(true);
    try {
      setBlueprints(await getSectionBlueprints());
    } catch (error) {
      toast.error({ title: "Could not load blueprints", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBlueprintsLoading(false);
      setBlueprintsLoaded(true);
    }
  }, [blueprintsLoaded, blueprintsLoading, toast]);

  const handleUseBlueprint = useCallback(async (blueprint: SectionBlueprint) => {
    setBlueprintBusyId(blueprint.id);
    try {
      const selected = await useSectionBlueprint(blueprint.id);
      setSections(cloneBlueprintSections(selected.sections));
      setBlueprintLibraryOpen(false);
      setSectionEditorOpen(true);
      setStep(2);
      toast.success({ title: "Blueprint applied", description: `${selected.name} loaded. Continue with question generation.` });
    } catch (error) {
      toast.error({ title: "Could not use blueprint", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBlueprintBusyId(null);
    }
  }, [toast]);

  const handleDeleteBlueprint = useCallback(async (blueprint: SectionBlueprint) => {
    if (!window.confirm(`Delete blueprint “${blueprint.name}”?`)) return;
    setBlueprintBusyId(blueprint.id);
    try {
      await deleteSectionBlueprint(blueprint.id);
      setBlueprints((current) => current.filter((item) => item.id !== blueprint.id));
      toast.success({ title: "Blueprint deleted" });
    } catch (error) {
      toast.error({ title: "Could not delete blueprint", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setBlueprintBusyId(null);
    }
  }, [toast]);

  const handleSaveBlueprint = useCallback(async () => {
    if (!blueprintName.trim()) return;
    setSavingBlueprint(true);
    try {
      const saved = await saveSectionBlueprint({ name: blueprintName, description: blueprintDescription, sections });
      setBlueprints((current) => [saved, ...current]);
      setSaveBlueprintOpen(false);
      setBlueprintName("");
      setBlueprintDescription("");
      toast.success({ title: "Blueprint saved", description: "You can reuse this complete section structure in future tests." });
    } catch (error) {
      toast.error({ title: "Could not save blueprint", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSavingBlueprint(false);
    }
  }, [blueprintName, blueprintDescription, sections, toast]);

  const handlePublish = () => {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      toast.success({
        title: meta.toast,
        description: `"${title}" is now live for students.`,
      });
      router.push(meta.redirect);
    }, 1500);
  };

  return (
    <div className="creator-mobile-calm w-full space-y-4 pb-10 pt-1 sm:pt-2">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:px-5 sm:py-4">
        <div aria-hidden="true" className="creator-desktop-flourish absolute -right-12 -top-20 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />
        <div aria-hidden="true" className="creator-desktop-flourish absolute -bottom-20 left-1/4 h-32 w-32 rounded-full bg-pink-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 text-white">
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-base font-extrabold tracking-tight text-text-primary sm:text-lg">{meta.title}</h1>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Draft</span>
            </div>
            <p className="mt-0.5 max-w-2xl truncate text-xs text-text-secondary">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-border pt-2 text-xs text-text-secondary sm:border-0 sm:pt-0">
          <span><strong className="text-text-primary">{totalQuestions}</strong> questions</span>
          <span className="h-3 w-px bg-border" />
          <span><strong className="text-text-primary">{duration || 0}</strong> min</span>
        </div>
        </div>
      </header>

      {/* Mobile progress keeps the active task clear without a tiny, overflowing stepper. */}
      <div className="rounded-xl border border-border bg-card p-3 sm:hidden">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-bold text-text-primary">{STEPS[step].label}</span>
          <span className="shrink-0 font-semibold text-text-secondary">{step + 1} / {STEPS.length}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {/* Desktop stepper */}
      <div className="hidden items-center gap-1 overflow-x-auto pb-1 sm:flex">
        {STEPS.map((s, i) => {
          const done = i < step || (i === step && publishing);
          const active = i === step && !publishing;
          return (
            <div key={s.id} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                  active &&
                    "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]",
                  done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                  !active && !done && "border-border bg-card text-text-secondary"
                )}
              >
                {done ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className={cn("mx-0.5 h-3.5 w-3.5", done ? "text-emerald-500/60" : "text-text-muted")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Primary navigation stays above the working area, so teachers never need to hunt for it. */}
      <div className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/95 px-3 py-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-4">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold text-text-primary transition-colors hover:border-violet-400/40 hover:bg-card-hover disabled:pointer-events-none disabled:opacity-35 sm:px-4"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 text-center sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-600 text-[11px] font-extrabold text-white shadow-sm">
            {step + 1}
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate text-xs font-extrabold text-text-primary">{STEPS[step].label}</p>
            <p className="text-[10px] text-text-muted">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        {sectionChoicePending ? (
          <span className="ml-auto max-w-[12rem] text-right text-[10px] font-semibold leading-4 text-text-muted sm:max-w-none sm:text-xs">
            Choose a section option to continue
          </span>
        ) : hasNextStep ? (
          <button
            type="button"
            onClick={goForward}
            disabled={!canContinue()}
            className="ml-auto inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 text-xs font-extrabold text-white shadow-[0_6px_18px_rgba(139,92,246,0.22)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:px-5"
          >
            <span className="hidden sm:inline">Continue</span>
            <span className="max-w-[9rem] truncate sm:hidden">{STEPS[step + 1].label}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        ) : (
          <span className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" /> Ready to publish
          </span>
        )}
      </div>

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          data-creator-step-panel
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "rounded-xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-5",
            step === 1 && sectionEditorOpen && "overflow-hidden"
          )}
        >
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Test Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026 Mock Test 01"
                  className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="What does this test cover — pattern, difficulty, target audience..."
                    className="w-full resize-y rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Instructions</label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={3}
                    placeholder="e.g. Each question carries 4 marks. No negative marking."
                    className="w-full resize-y rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
              </div>
              <div className="md:max-w-xs">
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Duration (minutes)</label>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 shrink-0 text-text-muted" />
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={duration || ""}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Exam & Subjects step commented out — restore the STEPS entry above to bring it back.
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Exam</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                  {EXAMS.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setExamId(exam.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all",
                        examId === exam.id
                          ? "border-pink-500/50 bg-pink-500/8 text-pink-500 dark:border-ai-accent/50 dark:bg-ai-accent/8 dark:text-ai-accent"
                          : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover"
                      )}
                    >
                      <exam.icon className="h-4 w-4" />
                      {exam.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {(catalogSubjects ?? SUBJECT_POOL).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setSubjects((prev) =>
                          prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                        subjects.includes(s)
                          ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                          : "border-border bg-card-hover/40 text-text-secondary hover:border-pink-500/30"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {catalogSubjects === null ? (
                  <p className="mt-2 text-[11px] text-text-muted">Loading available subjects…</p>
                ) : catalogSubjects.length === 0 ? (
                  <p className="mt-2 text-[11px] text-text-muted">More subjects will appear here when their curriculum data is ready.</p>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary focus:border-pink-500/50 focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Difficulty</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(["easy", "medium", "hard", "mixed"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs font-bold capitalize transition-all",
                          difficulty === d
                            ? "border-pink-500/50 bg-pink-500/8 text-pink-500 dark:border-ai-accent/50 dark:bg-ai-accent/8 dark:text-ai-accent"
                            : "border-border bg-card-hover/40 text-text-secondary"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          */}

          {step === 1 && !sectionEditorOpen && !blueprintLibraryOpen && (
            <div className="mx-auto max-w-3xl py-3 sm:py-6">
              <div className="text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/15">
                  <Layers className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-lg font-extrabold text-text-primary">Set up your paper sections</h2>
                <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-text-secondary">Create a fresh section structure or reuse one you have already saved.</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={startNewSection}
                  className="group min-h-44 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/[0.08] via-card to-violet-500/[0.05] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-pink-500/45 hover:shadow-[0_12px_32px_rgba(236,72,153,0.12)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-md shadow-pink-500/20">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="mt-5 block text-sm font-extrabold text-text-primary">Create new section</span>
                  <span className="mt-1 block text-xs leading-5 text-text-secondary">Build sections, question groups, marks and attempt rules from scratch.</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-pink-500">Start creating <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
                </button>

                <button
                  type="button"
                  onClick={openBlueprintLibrary}
                  className="group min-h-44 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-card to-blue-500/[0.04] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-violet-500/45 hover:shadow-[0_12px_32px_rgba(124,58,237,0.12)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                    <FolderOpen className="h-5 w-5" />
                  </span>
                  <span className="mt-5 flex items-center gap-2 text-sm font-extrabold text-text-primary">
                    Use existing section
                    {!blueprintsLoading && blueprintsLoaded && blueprints.length > 0 && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-600 dark:text-violet-300">{blueprints.length} saved</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-text-secondary">
                    {blueprintsLoading ? "Checking saved sections…" : blueprintsLoaded && blueprints.length === 0 ? "No saved sections yet — create your first section." : "Choose a complete saved blueprint and continue immediately."}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-300">{blueprintsLoaded && blueprints.length === 0 ? "Create your first section" : "View saved sections"} <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
                </button>
              </div>
            </div>
          )}

          {step === 1 && blueprintLibraryOpen && (
            <SectionBlueprintLibrary
              blueprints={blueprints}
              loading={blueprintsLoading}
              busyId={blueprintBusyId}
              onBack={() => setBlueprintLibraryOpen(false)}
              onCreateNew={startNewSection}
              onUse={handleUseBlueprint}
              onDelete={handleDeleteBlueprint}
            />
          )}

          {step === 1 && sectionEditorOpen && !blueprintLibraryOpen && (
            <div>
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card-hover/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                  <button type="button" onClick={() => setSectionEditorOpen(false)} className="mr-1 inline-flex items-center gap-1 font-bold text-text-secondary hover:text-violet-500"><ChevronLeft className="h-3.5 w-3.5" /> Change option</button>
                  <span className="h-3 w-px bg-border" />
                  <span className="font-semibold text-text-primary">{sections.length} Section{sections.length !== 1 && "s"}</span>
                  <span>·</span>
                  <span>{totalQuestions} Question{totalQuestions !== 1 && "s"}</span>
                  <span>·</span>
                  <span className="font-semibold text-text-secondary">{totalMarks} Total Marks</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBlueprintName(title.trim() ? `${title.trim()} blueprint` : "");
                    setSaveBlueprintOpen(true);
                  }}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[10px] font-bold text-text-secondary transition-all hover:border-pink-500/30 hover:text-pink-500"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" /> Save for reuse
                </button>
              </div>

              <div className="ai-color-note mb-4 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-text-primary">Need a single question instead?</p>
                  <p className="mt-1 min-h-5 text-xs leading-5 text-text-secondary"><AiStreamText text="Open the AI question generator directly. You do not need to create sections or a full paper first." /></p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/creator/problems/create")}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-500/25 bg-card px-4 text-xs font-bold text-violet-600 transition-colors hover:bg-violet-500/10 dark:text-violet-300"
                >
                  <ListChecks className="h-4 w-4" /> <AiStreamText text="Open AI Question Generator" />
                </button>
              </div>

              {/* Section Cards */}
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

              {/* Add Section */}
              <button
                type="button"
                onClick={addSection}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/50 py-3 text-sm font-semibold text-text-secondary transition-all hover:border-pink-500/30 hover:text-pink-500 dark:hover:text-pink-400"
              >
                <Plus className="h-5 w-5" />
                Add Section
              </button>
            </div>
          )}

          {step === 2 && (
            <QuestionsStep
              sections={sections}
              paperTitle={title}
              onPaperTitleChange={setTitle}
            />
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Pricing Model</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("free")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      mode === "free" ? "border-emerald-500/50 bg-emerald-500/6" : "border-border bg-card-hover/30 hover:border-border-hover"
                    )}
                  >
                    <span className={cn("text-sm font-extrabold", mode === "free" ? "text-emerald-500" : "text-text-primary")}>Free</span>
                    <p className="mt-1 text-xs text-text-secondary">Reach the widest audience. No price, no friction.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("paid")}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all",
                      mode === "paid"
                        ? "border-pink-500/50 bg-pink-500/6 dark:border-ai-accent/50 dark:bg-ai-accent/6"
                        : "border-border bg-card-hover/30 hover:border-border-hover"
                    )}
                  >
                    <span className={cn("text-sm font-extrabold", mode === "paid" ? "text-pink-500 dark:text-ai-accent" : "text-text-primary")}>Paid</span>
                    <p className="mt-1 text-xs text-text-secondary">Set a price and earn from every enrollment.</p>
                  </button>
                </div>
              </div>

              {mode === "paid" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-text-primary">Your Price (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="number"
                        min={0}
                        value={price || ""}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        placeholder="99"
                        className="h-12 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-text-primary">Original / MRP (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                      <input
                        type="number"
                        min={0}
                        value={originalPrice || ""}
                        onChange={(e) => setOriginalPrice(Number(e.target.value))}
                        placeholder="199"
                        className="h-12 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                      />
                    </div>
                  </div>
                  {price > 0 && originalPrice > price && (
                    <div className="rounded-xl bg-emerald-500/8 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-300 sm:col-span-2">
                      Students will see <span className="font-extrabold">₹{price}</span> with{" "}
                      <span className="font-extrabold">{Math.round((1 - price / originalPrice) * 100)}% OFF</span> against ₹{originalPrice}.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card">
                <div
                  className={cn(
                    "flex h-32 items-center justify-center bg-gradient-to-br text-white",
                    selectedExam?.gradient ?? "from-pink-500 to-violet-600"
                  )}
                >
                  {selectedExam ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <selectedExam.icon className="h-9 w-9 drop-shadow" />
                      <span className="text-sm font-extrabold">
                        {selectedExam.name} · {title || "Untitled Test"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold">Test</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-text-primary">{title || "Untitled Test"}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{description || "No description yet."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                    <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold">{totalQuestions} Qs</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold">
                      <Clock3 className="h-3 w-3" /> {duration || 0} min
                    </span>
                    <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold capitalize">{difficulty}</span>
                    <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold capitalize">
                      {LANGUAGES.find((l) => l.id === language)?.label}
                    </span>
                    <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold">
                      {totalMarks} marks
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    {mode === "free" ? (
                      <span className="text-lg font-extrabold text-emerald-500">FREE</span>
                    ) : (
                      <span className="text-lg font-extrabold text-text-primary">
                        ₹{price}
                        {originalPrice > price && (
                          <span className="ml-1.5 text-xs font-medium text-text-muted line-through">₹{originalPrice}</span>
                        )}
                      </span>
                    )}
                    <span className="rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-600/10 px-3 py-1.5 text-[11px] font-bold text-pink-500 dark:text-ai-accent">
                      {mode === "paid" ? `${Math.round((1 - price / originalPrice) * 100)}% OFF` : "Free to attempt"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_12px_36px_rgba(236,72,153,0.4)]">
                <Rocket className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-text-primary">Ready to publish?</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-text-secondary">
                <span className="font-bold text-text-primary">{title}</span> — {totalQuestions} questions across {sections.length} section
                {sections.length !== 1 && "s"}, {totalMarks} marks, {duration || 0} minutes,{" "}
                {mode === "free" ? "free" : `₹${price}`}. Once published it will be visible to all students.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <GhostButton onClick={() => setStep(4)}>Back to Preview</GhostButton>
                <PrimaryButton onClick={handlePublish} disabled={publishing} className="px-6 py-3">
                  <Rocket className="h-4 w-4" />
                  {publishing ? "Publishing…" : "Publish Test"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {saveBlueprintOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !savingBlueprint) setSaveBlueprintOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-text-primary">Save section blueprint</h2>
                  <p className="mt-1 text-xs text-text-secondary">This saves all {sections.length} sections, groups, marks and attempt rules.</p>
                </div>
                <button type="button" onClick={() => setSaveBlueprintOpen(false)} disabled={savingBlueprint} className="rounded-lg p-1.5 text-text-muted hover:bg-card-hover hover:text-text-primary" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Blueprint name</label>
                  <input
                    autoFocus
                    value={blueprintName}
                    maxLength={120}
                    onChange={(event) => setBlueprintName(event.target.value)}
                    placeholder="e.g. Semester exam — 5 sections"
                    className="h-11 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Description <span className="font-medium text-text-muted">(optional)</span></label>
                  <textarea
                    value={blueprintDescription}
                    maxLength={500}
                    rows={3}
                    onChange={(event) => setBlueprintDescription(event.target.value)}
                    placeholder="When should this blueprint be used?"
                    className="w-full resize-none rounded-xl border border-input-border bg-input-bg px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <GhostButton onClick={() => { if (!savingBlueprint) setSaveBlueprintOpen(false); }}>Cancel</GhostButton>
                <PrimaryButton onClick={handleSaveBlueprint} disabled={savingBlueprint || !blueprintName.trim()}>
                  <Save className="h-4 w-4" /> {savingBlueprint ? "Saving…" : "Save blueprint"}
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
