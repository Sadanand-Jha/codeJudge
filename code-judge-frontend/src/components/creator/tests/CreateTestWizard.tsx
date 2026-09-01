"use client";

import { useState } from "react";
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
  Wallet,
  Eye,
  Rocket,
  IndianRupee,
  Timer,
  Clock3,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { EXAMS, LANGUAGES } from "@/components/tests/mockData";
import { PrimaryButton, GhostButton } from "@/components/tests/ui";

const STEPS = [
  { id: "basic", label: "Basic Information", icon: FileText },
  { id: "exam", label: "Exam & Subjects", icon: GraduationCap },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "publish", label: "Submit / Publish", icon: Rocket },
];

const SUBJECT_POOL = ["Physics", "Chemistry", "Mathematics", "Biology", "Quant", "Reasoning", "English", "GK", "VARC", "DILR"];

type Section = { id: string; name: string; questionCount: number };

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
  const [subjects, setSubjects] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("english");
  const [difficulty, setDifficulty] = useState("medium");
  const [sections, setSections] = useState<Section[]>([{ id: "sec_1", name: "Section A", questionCount: 20 }]);
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [mode, setMode] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [publishing, setPublishing] = useState(false);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);
  const selectedExam = EXAMS.find((e) => e.id === examId);

  const canContinue = () => {
    if (step === 0) return title.trim().length > 3 && description.trim().length > 10;
    if (step === 1) return examId !== "" && subjects.length > 0;
    if (step === 2) return sections.length > 0 && totalQuestions > 0 && sections.every((s) => s.name.trim() && s.questionCount > 0);
    if (step === 3) return mode === "free" || price > 0;
    return true;
  };

  const toggleSubject = (s: string) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const updateSection = (id: string, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSection = () =>
    setSections((prev) => [
      ...prev,
      { id: `sec_${Date.now()}`, name: `Section ${String.fromCharCode(65 + prev.length)}`, questionCount: 10 },
    ]);

  const removeSection = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id));

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
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">{meta.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {meta.subtitle}
        </p>
      </div>

      {/* Stepper */}
      <div className="-mx-5 flex items-center gap-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {STEPS.map((s, i) => {
          const done = i < step || (i === step && publishing);
          const active = i === step && !publishing;
          return (
            <div key={s.id} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all",
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

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Test Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JEE Main 2026 Mock Test 01"
                  className="h-12 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What does this test cover — pattern, difficulty, target audience..."
                  className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  placeholder="e.g. Each question carries 4 marks. No negative marking."
                  className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Duration (minutes)</label>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-text-muted" />
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={duration || ""}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-12 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Exam</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                  {SUBJECT_POOL.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all",
                        subjects.includes(s)
                          ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                          : "border-border bg-card-hover/40 text-text-secondary hover:border-pink-500/30"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary focus:border-pink-500/50 focus:outline-none"
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
                  <div className="grid grid-cols-2 gap-2">
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

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Sections</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {sections.length} section{sections.length !== 1 && "s"} · {totalQuestions} total questions
                  </p>
                </div>
                <GhostButton onClick={addSection}>
                  <Plus className="h-4 w-4" /> Add Section
                </GhostButton>
              </div>

              <div className="mt-4 space-y-3">
                {sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card-hover/30 p-3.5 sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-text-muted">Section name</label>
                      <input
                        value={sec.name}
                        onChange={(e) => updateSection(sec.id, { name: e.target.value })}
                        placeholder="Section A"
                        className="h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none"
                      />
                    </div>
                    <div className="min-w-[120px]">
                      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-text-muted">Questions</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={sec.questionCount || ""}
                        onChange={(e) => updateSection(sec.id, { questionCount: Number(e.target.value) })}
                        className="h-10 w-full rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSection(sec.id)}
                      disabled={sections.length === 1}
                      className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-rose-500/40 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3">
                <input
                  id="negmark"
                  type="checkbox"
                  checked={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.checked)}
                  className="h-4 w-4 rounded border-border-hover accent-pink-500"
                />
                <label htmlFor="negmark" className="text-sm font-medium text-text-primary">
                  Enable negative marking
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-text-primary">Pricing Model</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("free")}
                    className={cn(
                      "rounded-2xl border p-5 text-left transition-all",
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
                      "rounded-2xl border p-5 text-left transition-all",
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
                <div className="grid gap-5 sm:grid-cols-2">
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
                    {negativeMarking && (
                      <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold">-ve marking</span>
                    )}
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
                {sections.length !== 1 && "s"}, {duration || 0} minutes,{" "}
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

      {/* Footer nav */}
      <div className="mt-6 flex items-center justify-between">
        <GhostButton onClick={() => setStep((s) => Math.max(0, s - 1))} className={cn(step === 0 && "invisible")}>
          <ChevronLeft className="h-4 w-4" /> Back
        </GhostButton>
        <div className="flex items-center gap-2">
          <div className="text-xs text-text-muted">Step {Math.min(step + 1, 6)} of {STEPS.length}</div>
          {step < STEPS.length - 1 && (
            <PrimaryButton
              onClick={() => canContinue() && setStep((s) => s + 1)}
              disabled={!canContinue()}
              className="px-6 py-3"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}