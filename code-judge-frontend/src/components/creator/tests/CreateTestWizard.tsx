"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  FileText,
  Layers,
  HelpCircle,
  ListChecks,
  Eye,
  Timer,
  BookmarkPlus,
  FolderOpen,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { deleteSectionBlueprint, getQuestionGeneratorCatalog, getSectionBlueprints, saveSectionBlueprint, useSectionBlueprint as applySectionBlueprint } from "@/services/aiGenerate";
import type { SectionBlueprint } from "@/services/aiGenerate";
import { AiStreamText } from "@/components/ui";
import styles from "./CreateTestWizard.module.css";
import { SectionCard } from "./sections/SectionCard";
import { AIGenerateModal } from "./sections/AIGenerateModal";
import { QuestionsStep } from "./sections/QuestionsStep";
import { SectionBlueprintLibrary } from "./sections/SectionBlueprintLibrary";
import type { QuestionPaper } from "./sections/paperTypes";
import { saveTestRecord } from "@/utils/savedTests";
import { DEFAULT_PAPER_HEADER, parseTimeAllowedMinutes, type PaperHeaderMeta } from "@/utils/paperHeader";
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
  { id: "preview", label: "Preview", icon: Eye },
];

// The current curated question bank is Operating Systems only. Keep the UI
// aligned with the backend rather than presenting unavailable mock subjects.
const DURATION_PRESETS = [60, 90, 120, 180];

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

const CREATION_META: Record<CreationType, { title: string; subtitle: string }> = {
  test: {
    title: "Create Test",
    subtitle: "Generate a print-ready question paper and save it to your account.",
  },
  quiz: {
    title: "Create Quiz",
    subtitle: "Generate quiz questions as a printable paper and save it to your account.",
  },
  assessment: {
    title: "Create Assessment",
    subtitle: "Generate an assessment paper and save it to your account.",
  },
};

export function CreateTestWizard({ creationType = "test" }: { creationType?: CreationType }) {
  const toast = useToast();
  const meta = CREATION_META[creationType];
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(180);
  const [subjects, setSubjects] = useState<string[]>(["Operating System"]);

  useEffect(() => {
    const controller = new AbortController();
    getQuestionGeneratorCatalog(controller.signal)
      .then((catalog) => {
        const names = catalog.subjects.map((s) => s.name);
        if (names.length > 0) setSubjects(names);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const [sections, setSections] = useState<Section[]>([createDefaultSection(0)]);
  const [draftId] = useState(() => `draft-${Date.now()}`);
  const [paperHeader, setPaperHeader] = useState<PaperHeaderMeta>({ ...DEFAULT_PAPER_HEADER });
  const [generatedPaper, setGeneratedPaper] = useState<QuestionPaper | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const [autoSavingSections, setAutoSavingSections] = useState(false);
  const savedSectionsSigRef = useRef<string | null>(null);
  const blueprintsRequestedRef = useRef(false);

  const totalQuestions = useMemo(
    () => sections.reduce((sum, s) => sum + getSectionQuestionCount(s), 0),
    [sections]
  );

  const totalMarks = useMemo(
    () => sections.reduce((sum, s) => sum + getSectionMarks(s), 0),
    [sections]
  );

  const durationForAi = useMemo(
    () => parseTimeAllowedMinutes(paperHeader.timeAllowed) ?? duration,
    [paperHeader.timeAllowed, duration]
  );

  const savedSubjects = useMemo(
    () => paperHeader.subject.trim() ? [paperHeader.subject.trim()] : subjects.length === 1 ? subjects : [],
    [paperHeader.subject, subjects]
  );

  const canContinue = () => {
    if (step === 0) return title.trim().length > 3;
    // Exam & Subjects gate commented out with its step: `if (step === 1) return examId !== "" && subjects.length > 0;`
    if (step === 1) return sections.length > 0 && totalQuestions > 0;
    return true;
  };

  const sectionChoicePending = step === 1 && (!sectionEditorOpen || blueprintLibraryOpen);
  const hasNextStep = step < STEPS.length - 1;

  const goBack = () => setStep((current) => Math.max(0, current - 1));
  const goForward = async () => {
    if (!canContinue() || sectionChoicePending || autoSavingSections) return;
    if (step === 1 && sectionEditorOpen) {
      const signature = JSON.stringify(sections);
      if (signature !== savedSectionsSigRef.current) {
        setAutoSavingSections(true);
        try {
          const saved = await saveSectionBlueprint({
            name: `${title.trim() || "Untitled test"} sections`,
            description: `${sections.length} section${sections.length === 1 ? "" : "s"} · ${totalQuestions} question${totalQuestions === 1 ? "" : "s"}`,
            sections,
          });
          savedSectionsSigRef.current = signature;
          setBlueprints((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
          toast.success({ title: "Sections saved for reuse", description: "Find them again under Use existing section." });
        } catch (error) {
          toast.error({ title: "Could not save sections", description: error instanceof Error ? error.message : "Continuing without saving." });
        } finally {
          setAutoSavingSections(false);
        }
      }
    }
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
    if (step !== 1 || blueprintsLoaded || blueprintsRequestedRef.current) return;
    blueprintsRequestedRef.current = true;
    let active = true;
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
    savedSectionsSigRef.current = null;
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
      const selected = await applySectionBlueprint(blueprint.id);
      const cloned = cloneBlueprintSections(selected.sections);
      setSections(cloned);
      savedSectionsSigRef.current = JSON.stringify(cloned);
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
      savedSectionsSigRef.current = JSON.stringify(sections);
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

  const persistPaper = useCallback(async (paper: QuestionPaper) => {
    setSaveState("saving");
    setSaveError(null);
    try {
      await saveTestRecord({
        draftId,
        title: title.trim() || paperHeader.heading.trim() || "Untitled test",
        creationType,
        duration: paper.durationMinutes ?? durationForAi,
        subjects: savedSubjects,
        sectionsCount: paper.sections.length,
        totalQuestions: paper.totalQuestions,
        totalMarks: paper.totalMarks,
        meta: { ...paperHeader, heading: title.trim() || paperHeader.heading.trim() || "Question Paper" },
        paper,
      });
      setSaveState("saved");
      toast.success({ title: "Paper saved", description: "Find it under Tests in your account." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the paper to your account.";
      setSaveState("error");
      setSaveError(message);
      toast.error({ title: "Paper not saved", description: message });
    }
  }, [draftId, title, paperHeader, creationType, durationForAi, savedSubjects, toast]);

  const handlePaperReady = useCallback((paper: QuestionPaper) => {
    setGeneratedPaper(paper);
    void persistPaper(paper);
  }, [persistPaper]);

  return (
    <div className={cn(styles.root, "creator-mobile-calm qs-onest")}>
      <section className={styles.hero}>
        <i className={styles.heroA} aria-hidden="true" />
        <i className={styles.heroB} aria-hidden="true" />
        <i className={styles.heroC} aria-hidden="true" />
        <i className={styles.heroD} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.head}>
            <div className={styles.titleRow}>
              <span className={styles.icon}>
                <FileText className="h-7 w-7" />
              </span>
              <div className={styles.titleWrap}>
                <h1 className={styles.title}>
                  {meta.title}
                  <span className={styles.pill}>Draft</span>
                </h1>
                <p className={styles.sub}>{meta.subtitle}</p>
              </div>
            </div>

            <div className={styles.meta}>
              <div className={styles.metric}>
                <strong>{totalQuestions}</strong>
                <small>questions</small>
              </div>
              <div className={styles.metric}>
                <strong>{totalMarks}</strong>
                <small>marks</small>
              </div>
              <div className={styles.metric}>
                <strong>{duration || 0}</strong>
                <small>min</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.body}>
        <div className={styles.steps}>
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(styles.step, done && styles.stepDone, active && styles.stepActive)}
                >
                  {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                  <span>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight className={cn(styles.chev, "h-4 w-4")} />}
              </div>
            );
          })}
        </div>

        <div className={styles.bar}>
          <button type="button" onClick={goBack} disabled={step === 0} className={styles.back}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <div className={styles.cur}>
            <span className={styles.num}>{step + 1}</span>
            <div className={styles.curText}>
              <p className={styles.curTitle}>{STEPS[step].label}</p>
              <p className={styles.curStep}>Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>

          {sectionChoicePending ? (
            <span className={styles.pending}>Choose a section option to continue</span>
          ) : hasNextStep ? (
            <button
              type="button"
              onClick={goForward}
              disabled={!canContinue() || autoSavingSections}
              className={styles.next}
            >
              <span>{autoSavingSections ? "Saving…" : "Continue"}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className={cn(styles.statusPill, saveState === "error" && styles.statusBad)}>
              <Check className="h-3.5 w-3.5" />
              {saveState === "saved" ? "Paper saved" : saveState === "saving" ? "Saving paper…" : saveState === "error" ? "Paper not saved" : "Generate your paper"}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            data-creator-step-panel
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className={cn(styles.panel, step === 1 && sectionEditorOpen && "overflow-hidden")}
          >
          {step === 0 && (
            <div>
              <div className={styles.field}>
                <label htmlFor="test-title" className={styles.label}>
                  <span>
                    Test title <span className={styles.req}>*</span>
                  </span>
                </label>
                <input
                  id="test-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026 Mock Test 01"
                  autoComplete="off"
                  className={styles.input}
                />
              </div>

              <div className={cn(styles.g2, styles.field)}>
                <div>
                  <label htmlFor="test-description" className={styles.label}>
                    Description <span className={styles.optional}>Optional</span>
                  </label>
                  <textarea
                    id="test-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="What does this test cover: pattern, difficulty, target audience…"
                    className={styles.textarea}
                  />
                </div>
                <div>
                  <label htmlFor="test-instructions" className={styles.label}>
                    Instructions <span className={styles.optional}>Printed on the paper</span>
                  </label>
                  <textarea
                    id="test-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    placeholder="e.g. Each question carries 4 marks. No negative marking."
                    className={styles.textarea}
                  />
                </div>
              </div>

              <div className={styles.fieldLast}>
                <span className={styles.label}>Duration (minutes)</span>
                <div className={styles.durationRow}>
                  <div className={styles.durationWrap}>
                    <Timer className={styles.durationIcon} />
                    <input
                      type="number"
                      min={5}
                      max={600}
                      value={duration || ""}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      aria-label="Duration in minutes"
                      className={cn(styles.input, styles.durationInput)}
                    />
                  </div>
                  <div className={styles.chips}>
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDuration(preset)}
                        aria-pressed={duration === preset}
                        className={cn(styles.chip, duration === preset && styles.chipOn)}
                      >
                        {preset} min
                      </button>
                    ))}
                  </div>
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
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                  <Layers className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-lg font-extrabold text-[var(--qs-ink)]">Set up your paper sections</h2>
                <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-[var(--qs-muted)]">Create a fresh section structure or reuse one you have already saved.</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={startNewSection}
                  className="group min-h-44 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--qs-brand)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="mt-5 block text-sm font-extrabold text-[var(--qs-ink)]">Create new section</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--qs-muted)]">Build sections, question groups, marks and attempt rules from scratch.</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--qs-brand)]">Start creating <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
                </button>

                <button
                  type="button"
                  onClick={openBlueprintLibrary}
                  className="group min-h-44 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--qs-brand)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                    <FolderOpen className="h-5 w-5" />
                  </span>
                  <span className="mt-5 flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                    Use existing section
                    {!blueprintsLoading && blueprintsLoaded && blueprints.length > 0 && <span className="rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] px-2 py-0.5 text-[9px] font-bold text-[var(--qs-ink)]">{blueprints.length} saved</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--qs-muted)]">
                    {blueprintsLoading ? "Checking saved sections…" : blueprintsLoaded && blueprints.length === 0 ? "No saved sections yet — create your first section." : "Choose a complete saved blueprint and continue immediately."}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--qs-brand)]">{blueprintsLoaded && blueprints.length === 0 ? "Create your first section" : "View saved sections"} <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
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
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[11px] text-[var(--qs-muted)]">
                  <button type="button" onClick={() => setSectionEditorOpen(false)} className="b b-ghost sm mr-1 gap-1"><ChevronLeft className="h-3.5 w-3.5" /> Change option</button>
                  <span className="h-3 w-0.5 rounded-full bg-[var(--qs-line)]" />
                  <span className="font-bold text-[var(--qs-ink)]">{sections.length} Section{sections.length !== 1 && "s"}</span>
                  <span>·</span>
                  <span>{totalQuestions} Question{totalQuestions !== 1 && "s"}</span>
                  <span>·</span>
                  <span className="font-bold text-[var(--qs-ink)]">{totalMarks} Total Marks</span>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setBlueprintName(title.trim() ? `${title.trim()} blueprint` : "");
                      setSaveBlueprintOpen(true);
                    }}
                    className="b sm flex-1 shrink-0 gap-1.5 sm:flex-none"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" /> Save for reuse
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(true)}
                    className="b b-pri sm flex-1 shrink-0 gap-1.5 sm:flex-none"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--qs-ink)]">Need a single question instead?</p>
                  <p className="mt-1 min-h-5 text-xs leading-5 text-[var(--qs-muted)]"><AiStreamText text="Open the AI question generator directly. You do not need to create sections or a full paper first." /></p>
                </div>
                <Link href="/creator/problems/create" className="b sm shrink-0 gap-1.5">
                  <ListChecks className="h-4 w-4" /> <AiStreamText text="Open AI Question Generator" />
                </Link>
              </div>

              {/* Section Cards */}
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
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

              {/* Add Section */}
              <button
                type="button"
                onClick={addSection}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] py-3 text-sm font-bold text-[var(--qs-muted)] transition-all hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)]"
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
              paperHeader={paperHeader}
              onPaperHeaderChange={setPaperHeader}
              durationMinutes={durationForAi}
              onPaperReady={handlePaperReady}
            />
          )}

          {step === 3 && (
            <div>
              <article className={styles.paper}>
                <h2 className={styles.paperTitle}>{title.trim() || "Untitled test"}</h2>
                <div className={styles.paperMeta}>
                  <span>Time: {generatedPaper?.durationMinutes ?? duration ?? 0} min</span>
                  <span>Max marks: {generatedPaper?.totalMarks ?? totalMarks}</span>
                </div>

                {description.trim() ? (
                  <>
                    <h4 className={styles.paperHeading}>About</h4>
                    <p className={styles.paperText}>{description}</p>
                  </>
                ) : null}

                <h4 className={styles.paperHeading}>Instructions</h4>
                {instructions.trim() ? (
                  <p className={styles.paperText}>{instructions}</p>
                ) : (
                  <p className={cn(styles.paperText, styles.empty)}>No instructions added.</p>
                )}

                <h4 className={styles.paperHeading}>Sections</h4>
                <div>
                  {sections.map((section) => (
                    <div key={section.id} className={styles.paperRow}>
                      <span>{section.name || "Untitled section"}</span>
                      <span>
                        {getSectionQuestionCount(section)} Qs · {getSectionMarks(section)} marks
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              {saveError && <p className={styles.saveError}>{saveError}</p>}

              <div className={styles.actions}>
                <button type="button" onClick={() => setStep(2)} className={styles.actionGhost}>
                  Back to Questions
                </button>
                {saveState === "error" && generatedPaper && (
                  <button type="button" onClick={() => void persistPaper(generatedPaper)} className={styles.actionPrimary}>
                    Retry save
                  </button>
                )}
                <Link href="/creator/tests" className={styles.actionPrimary}>
                  View my tests
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      <AnimatePresence>
        {saveBlueprintOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !savingBlueprint) setSaveBlueprintOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="w-full max-w-md rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--qs-ink)]">Save section blueprint</h2>
                  <p className="mt-1 text-xs text-[var(--qs-muted)]">This saves all {sections.length} sections, groups, marks and attempt rules.</p>
                </div>
                <button type="button" onClick={() => setSaveBlueprintOpen(false)} disabled={savingBlueprint} className="b b-icon sm" aria-label="Close"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--qs-ink)]">Blueprint name</label>
                  <input
                    autoFocus
                    value={blueprintName}
                    maxLength={120}
                    onChange={(event) => setBlueprintName(event.target.value)}
                    placeholder="e.g. Semester exam — 5 sections"
                    className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-[15px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--qs-ink)]">Description <span className="font-medium text-[var(--qs-muted)]">(optional)</span></label>
                  <textarea
                    value={blueprintDescription}
                    maxLength={500}
                    rows={3}
                    onChange={(event) => setBlueprintDescription(event.target.value)}
                    placeholder="When should this blueprint be used?"
                    className="w-full resize-none rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2.5 text-[15px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => { if (!savingBlueprint) setSaveBlueprintOpen(false); }} className="b sm">Cancel</button>
                <button type="button" onClick={handleSaveBlueprint} disabled={savingBlueprint || !blueprintName.trim()} className="b b-pri sm gap-1.5">
                  <Save className="h-4 w-4" /> {savingBlueprint ? "Saving…" : "Save blueprint"}
                </button>
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
