"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { type CreatorQuestion } from "@/components/quiz/creator/types";
import { useQuizSettings } from "@/components/quiz/creator/settings/QuizSettingsContext";
import {
  computeQuestionsSignature,
  getSyncedSignature,
} from "@/utils/quizStorage";
import { toast } from "@/lib/toast";

/**
 * Confirmation dialog shown before a problem is deleted from the quiz
 * workspace. When the current question set is still saved on the server it
 * adds a note that the server copy will be out of sync until questions are
 * saved again.
 */
export default function ProblemDeleteModal({
  question,
  index,
  onClose,
}: {
  question: CreatorQuestion | null;
  index?: number;
  onClose: () => void;
}) {
  const problems = useQuizProblemsStore((s) => s.problems);
  const deleteProblem = useQuizProblemsStore((s) => s.deleteProblem);
  const { code } = useQuizSettings();

  const isSavedToServer =
    code && problems.length > 0
      ? computeQuestionsSignature(problems) === getSyncedSignature(code)
      : false;

  const handleConfirm = () => {
    if (!question) return;
    deleteProblem(question.id);
    toast.success("Question deleted");
    onClose();
  };

  const label = question?.title.trim() || `Question ${(index ?? 0) + 1}`;

  return (
    <AnimatePresence>
      {question && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label="Delete question confirmation"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-text-primary">Delete this question?</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  “{label}” will be permanently removed from your test. This action cannot be
                  undone.
                </p>
                {isSavedToServer && (
                  <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-[10px] font-medium leading-relaxed text-amber-500">
                    This question is currently saved on the server. After deleting, save your
                    questions again so the server stays in sync.
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card-hover px-4 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-danger px-4 text-xs font-bold text-white shadow-[0_2px_12px_rgba(239,68,68,0.35)] transition-all hover:brightness-110 active:scale-[0.97]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
