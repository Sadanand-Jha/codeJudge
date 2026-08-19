"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  FileText,
  Layers,
  Wallet,
  Eye,
  Rocket,
  GraduationCap,
  IndianRupee,
  Image as ImageIcon,
} from "lucide-react";
import { EXAMS, LANGUAGES, AVAILABLE_TESTS_POOL } from "./mockData";
import { SectionHeading, GhostButton, PrimaryButton } from "./ui";
import { cn } from "@/lib/helpers";

const STEPS = [
  { id: "basic", label: "Basic Information", icon: FileText },
  { id: "exam", label: "Exam & Subjects", icon: GraduationCap },
  { id: "tests", label: "Add Tests", icon: Layers },
  { id: "pricing", label: "Pricing", icon: Wallet },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "publish", label: "Submit / Publish", icon: Rocket },
];

const SUBJECT_POOL = ["Physics", "Chemistry", "Mathematics", "Biology", "Quant", "Reasoning", "English", "GK", "VARC", "DILR"];

export function CreateTestSeries() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examId, setExamId] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("english");
  const [difficulty, setDifficulty] = useState("medium");
  const [mode, setMode] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [published, setPublished] = useState(false);

  const canContinue = () => {
    if (step === 0) return title.trim().length > 3 && description.trim().length > 10;
    if (step === 1) return examId !== "" && subjects.length > 0;
    if (step === 2) return selectedTests.length > 0;
    if (step === 3) return mode === "free" || price > 0;
    return true;
  };

  const toggleSubject = (s: string) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const toggleTest = (id: string) =>
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedExam = EXAMS.find((e) => e.id === examId);
  const selectedTestObjs = AVAILABLE_TESTS_POOL.filter((t) => selectedTests.includes(t.id));
  const totalQuestions = selectedTestObjs.reduce((sum, t) => sum + t.questions, 0);

  const handlePublish = () => {
    setPublished(true);
    setTimeout(() => router.push("/tests/my-series"), 1600);
  };

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <SectionHeading
          title="Create Test Series"
          subtitle="Publish free or paid test series and reach thousands of students."
        />

        {/* Stepper */}
        <div className="tests-scroll-x -mx-5 flex items-center gap-1 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          {STEPS.map((s, i) => {
            const done = i < step || (i === step && published);
            const active = i === step && !published;
            return (
              <div key={s.id} className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all",
                    active && "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]",
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
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Series Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. JEE Main 2027 Complete Test Series"
                    className="h-12 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe what students get — tests, difficulty, pattern, language..."
                    className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Thumbnail</label>
                  <button
                    onClick={() => setThumbnail(thumbnail ? null : "gradient")}
                    className={cn(
                      "flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors",
                      thumbnail
                        ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-500"
                        : "border-border bg-card-hover/40 text-text-secondary hover:border-pink-500/40 hover:text-pink-500"
                    )}
                  >
                    <ImageIcon className="h-5 w-5" />
                    <span className="text-xs font-semibold">
                      {thumbnail ? "Thumbnail selected — click to remove" : "Upload thumbnail (or auto-generate)"}
                    </span>
                  </button>
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
                    <h3 className="text-sm font-bold text-text-primary">Tests in this Series</h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {selectedTests.length} selected · {totalQuestions} total questions
                    </p>
                  </div>
                  <GhostButton
                    onClick={() => setSelectedTests((prev) => (prev.length === AVAILABLE_TESTS_POOL.length ? [] : AVAILABLE_TESTS_POOL.map((t) => t.id)))}
                  >
                    {selectedTests.length === AVAILABLE_TESTS_POOL.length ? "Clear all" : "Select all"}
                  </GhostButton>
                </div>
                <div className="mt-4 space-y-2">
                  {AVAILABLE_TESTS_POOL.map((t) => {
                    const selected = selectedTests.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTest(t.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                          selected
                            ? "border-pink-500/40 bg-pink-500/6 dark:border-ai-accent/40 dark:bg-ai-accent/6"
                            : "border-border bg-card-hover/30 hover:border-border-hover"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                            selected ? "border-pink-500 bg-pink-500 text-white dark:border-ai-accent dark:bg-ai-accent" : "border-border-hover bg-card"
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-text-primary">{t.name}</div>
                          <div className="text-[11px] text-text-muted">
                            {t.type.replace("-", " ")} · {t.questions} questions
                          </div>
                        </div>
                        <span className="flex h-6 items-center gap-0.5 rounded-md border border-border bg-card px-1.5 text-[10px] font-bold capitalize text-text-secondary">
                          <Plus className="h-3 w-3" /> add
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs font-bold text-text-secondary transition-colors hover:border-pink-500/40 hover:text-pink-500"
                >
                  <Plus className="h-4 w-4" /> Create a New Test
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-text-primary">Pricing Model</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => setMode("free")}
                      className={cn(
                        "rounded-2xl border p-5 text-left transition-all",
                        mode === "free"
                          ? "border-emerald-500/50 bg-emerald-500/6"
                          : "border-border bg-card-hover/30 hover:border-border-hover"
                      )}
                    >
                      <span className={cn("text-sm font-extrabold", mode === "free" ? "text-emerald-500" : "text-text-primary")}>Free</span>
                      <p className="mt-1 text-xs text-text-secondary">Reach the widest audience. No price, no friction.</p>
                    </button>
                    <button
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
                          placeholder="499"
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
                          placeholder="999"
                          className="h-12 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                        />
                      </div>
                    </div>
                    {price > 0 && originalPrice > price && (
                      <div className="rounded-xl bg-emerald-500/8 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-300 sm:col-span-2">
                        Students will see <span className="font-extrabold">₹{price}</span> with <span className="font-extrabold">{Math.round((1 - price / originalPrice) * 100)}% OFF</span> against ₹{originalPrice}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-card">
                  <div className={cn("flex h-32 items-center justify-center bg-gradient-to-br text-white", selectedExam?.gradient ?? "from-pink-500 to-violet-600")}>
                    {selectedExam ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <selectedExam.icon className="h-9 w-9 drop-shadow" />
                        <span className="text-sm font-extrabold">{selectedExam.name} · {title || "Untitled Series"}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold">Test Series</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-text-primary">{title || "Untitled Series"}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{description || "No description yet."}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                      <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold">{selectedTestObjs.length} tests</span>
                      <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold">{totalQuestions} Qs</span>
                      <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold capitalize">{difficulty}</span>
                      <span className="rounded-full border border-border bg-card-hover px-2.5 py-0.5 font-semibold capitalize">{LANGUAGES.find((l) => l.id === language)?.label}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      {mode === "free" ? (
                        <span className="text-lg font-extrabold text-emerald-500">FREE</span>
                      ) : (
                        <span className="text-lg font-extrabold text-text-primary">
                          ₹{price}
                          {originalPrice > price && <span className="ml-1.5 text-xs font-medium text-text-muted line-through">₹{originalPrice}</span>}
                        </span>
                      )}
                      <span className="rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-600/10 px-3 py-1.5 text-[11px] font-bold text-pink-500 dark:text-ai-accent">
                        {mode === "paid" ? `${Math.round((1 - price / originalPrice) * 100)}% OFF` : "Free to enroll"}
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
                  <span className="font-bold text-text-primary">{title}</span> — {selectedTestObjs.length} tests, {totalQuestions} questions,{" "}
                  {mode === "free" ? "free" : `₹${price}`}. Once published it will be visible to all students.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <GhostButton onClick={() => setStep(4)}>Back to Preview</GhostButton>
                  <PrimaryButton onClick={handlePublish} className="px-6 py-3">
                    <Rocket className="h-4 w-4" />
                    {published ? "Publishing…" : "Publish Test Series"}
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
            <div className="text-xs text-text-muted">
              Step {Math.min(step + 1, 6)} of {STEPS.length}
            </div>
            {step < STEPS.length - 1 && (
              <PrimaryButton onClick={() => canContinue() && setStep((s) => s + 1)} disabled={!canContinue()} className="px-6 py-3">
                Continue <ChevronRight className="h-4 w-4" />
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}