"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Brain,
  Check,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { UploadStep } from "./UploadStep";
import { AnalyzingStep } from "./AnalyzingStep";
import { ReviewStep } from "./ReviewStep";
import { CreateStep } from "./CreateStep";
import { MOCK_QUIZ_CONFIG } from "./mockData";
import type { GeneratorStep, UploadedFile, AiQuizConfig } from "./types";

const STEPS: { id: GeneratorStep; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "analyzing", label: "Analyze", icon: Brain },
  { id: "review", label: "Review", icon: Check },
  { id: "create", label: "Create", icon: Sparkles },
];

const stepOrder: GeneratorStep[] = ["upload", "analyzing", "review", "create"];

export function AiQuizGenerator() {
  const [step, setStep] = useState<GeneratorStep>("upload");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [config, setConfig] = useState<AiQuizConfig | null>(null);

  const currentIndex = stepOrder.indexOf(step);

  const onFileAccepted = useCallback((f: UploadedFile) => {
    setFile(f);
    setTimeout(() => setStep("analyzing"), 500);
  }, []);

  const onAnalysisComplete = useCallback(() => {
    setConfig(MOCK_QUIZ_CONFIG);
    setStep("review");
  }, []);

  const onProceedToCreate = useCallback((cfg: AiQuizConfig) => {
    setConfig(cfg);
    setStep("create");
  }, []);

  const goBack = () => {
    if (currentIndex > 0) setStep(stepOrder[currentIndex - 1]);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Stepper */}
      <div className="sticky top-16 z-30 border-b border-border bg-ai-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-3 py-2 sm:gap-2 sm:px-6 sm:py-3">
          {STEPS.map((s, i) => {
            const isActive = s.id === step;
            const isDone = i < currentIndex;
            const isClickable = i < currentIndex;

            return (
              <div key={s.id} className="flex items-center">
                {i > 0 && (
                  <div
                    className={cn(
                      "mx-0.5 h-px w-4 sm:mx-1 sm:w-10",
                      i <= currentIndex ? "bg-violet-500" : "bg-border"
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && setStep(s.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium transition-colors sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs",
                    isActive && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                    isDone && !isActive && "text-emerald-600 dark:text-emerald-400",
                    !isActive && !isDone && "text-text-muted",
                    isClickable && "cursor-pointer hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold sm:h-5 sm:w-5 sm:text-[10px]",
                      isActive
                        ? "bg-violet-500 text-white"
                        : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-white/[0.06] text-text-muted"
                    )}
                  >
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {step !== "upload" && step !== "create" && (
          <div className="mx-auto max-w-3xl px-4 pb-3 sm:px-6">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {step === "upload" && <UploadStep onFileAccepted={onFileAccepted} />}
            {step === "analyzing" && file && (
              <AnalyzingStep
                file={{ name: file.name, pageCount: file.pageCount }}
                onComplete={onAnalysisComplete}
              />
            )}
            {step === "review" && config && (
              <ReviewStep config={config} onProceed={onProceedToCreate} />
            )}
            {step === "create" && config && (
              <CreateStep config={config} onComplete={() => {}} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
