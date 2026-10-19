"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { generateQuizResults, retryQuizResultsEmail } from "@/services/quiz";
import { SecureLogo } from "@/components/common/SecureLogo";
import { useToast } from "@/hooks/useToast";

type GenerationState = "idle" | "confirming" | "regenerate-confirm" | "generating" | "success" | "partial-success" | "error";

const LOADING_STEPS = [
  "Evaluating submissions...",
  "Calculating leaderboard...",
  "Preparing marksheet...",
  "Sending email...",
];

export function GenerateResultsButton({ quizId, quizName }: { quizId: string; quizName: string }) {
  const toast = useToast();
  const [state, setState] = useState<GenerationState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<{
    emailSent: boolean;
    emailError?: string;
    stats?: { evaluated: number };
  } | null>(null);

  const handleGenerate = async (force: boolean) => {
    setState("generating");
    setLoadingStep(0);

    // Simulate progress steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 1500);

    try {
      const response = await generateQuizResults(quizId, { force, sendEmail: true });
      clearInterval(stepInterval);

      setResult({
        emailSent: response.emailSent,
        emailError: response.emailError,
        stats: response.stats,
      });

      if (response.emailSent) {
        setState("success");
        toast.success({
          title: "Results Generated",
          description: `Marksheet emailed successfully. ${response.stats.evaluated} submissions evaluated.`,
        });
      } else {
        setState("partial-success");
        toast.warning({
          title: "Results Generated — Email Failed",
          description: "Results saved, but email delivery failed. You can retry sending the email.",
        });
      }
    } catch (error: any) {
      clearInterval(stepInterval);

      // Check if results already generated (409)
      if (error?.response?.status === 409 || error?.response?.data?.code === "RESULTS_ALREADY_GENERATED") {
        setState("regenerate-confirm");
        return;
      }

      setState("error");
      toast.error({
        title: "Generation Failed",
        description: error?.response?.data?.message || "An error occurred while generating results.",
      });
    }
  };

  const handleRetryEmail = async () => {
    setState("generating");
    setLoadingStep(3); // Skip to "Sending email..."

    try {
      const response = await retryQuizResultsEmail(quizId);
      if (response.emailSent) {
        setState("success");
        setResult((prev) => prev ? { ...prev, emailSent: true, emailError: undefined } : { emailSent: true });
        toast.success({
          title: "Email Sent",
          description: "Marksheet email has been sent successfully.",
        });
      } else {
        setState("partial-success");
        toast.error({
          title: "Email Failed",
          description: response.emailError || "Failed to send email. Please try again.",
        });
      }
    } catch (error: any) {
      setState("partial-success");
      toast.error({
        title: "Email Failed",
        description: error?.response?.data?.message || "An error occurred while sending email.",
      });
    }
  };

  const reset = () => {
    setState("idle");
    setResult(null);
    setLoadingStep(0);
  };

  // ===== Button (idle state) =====
  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("confirming")}
        className="b b-pri b-full justify-start gap-2.5"
      >
        <Mail className="w-4 h-4" />
        <span>Generate results &amp; email</span>
      </button>
    );
  }

  // ===== Loading overlay =====
  if (state === "generating") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-3xl border border-border-hover bg-[#0B0D12] p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center mb-5">
              <SecureLogo variant="mark" size={40} className="animate-pulse motion-reduce:animate-none" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Generating results…</h3>
            <p className="text-xs text-[#6B7280] mb-6">
              Evaluating all submissions for &ldquo;{quizName}&rdquo;
            </p>

            {/* Progress steps */}
            <div className="w-full space-y-2.5">
              {LOADING_STEPS.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
                    index <= loadingStep
                      ? "bg-[#EC4899]/5 border border-[#EC4899]/15"
                      : "bg-white/[0.02] border border-white/[0.04]"
                  }`}
                >
                  {index < loadingStep ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                  ) : index === loadingStep ? (
                    <SecureLogo variant="mark" size={14} className="shrink-0 animate-pulse motion-reduce:animate-none" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      index <= loadingStep ? "text-white font-medium" : "text-[#6B7280]"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-[#6B7280] mt-5">
              This may take a few minutes for large quizzes.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== Success state =====
  if (state === "success") {
    return (
      <div className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#22C55E]/10 border border-[#22C55E]/20">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Results Generated Successfully</p>
            {result?.stats && (
              <p className="text-[10px] text-[#6B7280] mt-1">
                {result.stats.evaluated} submissions evaluated. Marksheets emailed to creator.
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="b b-text sm mt-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Partial success (email failed) =====
  if (state === "partial-success") {
    return (
      <div className="rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#F59E0B]/10 border border-[#F59E0B]/20">
            <AlertCircle className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Results saved — email failed</p>
            <p className="text-[10px] text-[#6B7280] mt-1">
              {result?.emailError || "Email delivery failed. Results are saved in the database."}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleRetryEmail}
                className="b sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry email
              </button>
              <button
                type="button"
                onClick={reset}
                className="b b-text sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Error state =====
  if (state === "error") {
    return (
      <div className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#EF4444]/10 border border-[#EF4444]/20">
            <AlertCircle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Generation failed</p>
            <p className="text-[10px] text-[#6B7280] mt-1">
              An error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="b b-text sm mt-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Confirmation dialogs =====
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={reset}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl border border-border-hover bg-[#0B0D12] p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={reset}
            aria-label="Close"
            title="Close"
            className="b b-icon b-close b-ghost absolute top-4 right-4"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
              {state === "regenerate-confirm" ? (
                <RefreshCw className="w-8 h-8 text-[#F59E0B]" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-[#EC4899]" />
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white text-center mb-2">
            {state === "regenerate-confirm" ? "Regenerate results?" : "Generate results now?"}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground text-center mb-6 leading-relaxed">
            {state === "regenerate-confirm" ? (
              <>
                Results have already been generated for this quiz.
                <br />
                Regenerating will <span className="text-[#F59E0B] font-semibold">overwrite the previous leaderboard</span> and resend the marksheet email.
              </>
            ) : (
              <>
                This will calculate the final marks for all participants
                <br />
                and email the complete marksheet to you.
                <br />
                <span className="text-[#6B7280]">This action may take a few minutes.</span>
              </>
            )}
          </p>

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="rounded-lg border border-border bg-white/[0.02] p-2.5 text-center">
              <FileSpreadsheet className="w-4 h-4 text-[#EC4899] mx-auto mb-1" />
              <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">Evaluate</p>
            </div>
            <div className="rounded-lg border border-border bg-white/[0.02] p-2.5 text-center">
              <Trophy className="w-4 h-4 text-[#F59E0B] mx-auto mb-1" />
              <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">Rank</p>
            </div>
            <div className="rounded-lg border border-border bg-white/[0.02] p-2.5 text-center">
              <Mail className="w-4 h-4 text-[#22C55E] mx-auto mb-1" />
              <p className="text-[9px] text-[#6B7280] uppercase tracking-wider">Email</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="b b-lg flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(state === "regenerate-confirm")}
              className="b b-pri b-lg flex-1"
            >
              {state === "regenerate-confirm" ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}