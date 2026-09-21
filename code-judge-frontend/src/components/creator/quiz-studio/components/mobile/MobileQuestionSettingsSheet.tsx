"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Hash, AlertTriangle } from "lucide-react";
import { useStudio } from "../../StudioProvider";
import { useQuizReferenceStore } from "@/store/quizReferenceStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileQuestionSettingsSheet({ open, onClose }: Props) {
  const { state, updateQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);
  const { difficultyOptions, fetchAll } = useQuizReferenceStore();

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  if (!q) return null;

  const update = (patch: any) => updateQuestion(q.id, patch);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-[20px] border-x border-t border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <span className="h-1.5 w-10 rounded-full bg-zinc-200" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-zinc-100 shrink-0">
              <div>
                <h3 className="text-[15px] font-bold text-zinc-900">Question Settings</h3>
                <p className="text-xs text-zinc-500">Question {String(state.questions.findIndex((x) => x.id === q.id) + 1).padStart(2, "0")}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {/* Marks */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Scoring</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-xl border border-zinc-200 bg-white p-3">
                    <span className="text-xs font-medium text-zinc-500">Marks</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={q.marks}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        update({ marks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:border-pink-300 focus:outline-none"
                    />
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-white p-3">
                    <span className="text-xs font-medium text-zinc-500">Negative marking</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={q.negativeMarks ?? 0}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        update({ negativeMarks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:border-pink-300 focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* Time & Difficulty */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Timing & Difficulty</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-xl border border-zinc-200 bg-white p-3">
                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-500">
                      <Clock className="h-3 w-3" /> Time
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={q.expectedTime}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          update({ expectedTime: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                        }}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:border-pink-300 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500">min</span>
                    </div>
                  </label>

                  <label className="rounded-xl border border-zinc-200 bg-white p-3">
                    <span className="text-xs font-medium text-zinc-500">Difficulty</span>
                    <select
                      value={q.difficulty}
                      onChange={(e) => update({ difficulty: e.target.value as any })}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:border-pink-300 focus:outline-none"
                    >
                      {difficultyOptions.length === 0 ? (
                        <option>Loading…</option>
                      ) : (
                        difficultyOptions.map((opt) => (
                          <option key={opt.id} value={opt.heading}>
                            {opt.heading}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                </div>
              </div>

              {/* Topic optional — collapsed secondary */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-700">Topic</p>
                <p className="mt-1 text-sm text-zinc-900">{q.topic || <span className="text-zinc-400">No topic set</span>}</p>
                {q.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.tags.map((t) => (
                      <span key={t} className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="flex w-full items-center justify-center rounded-xl bg-[#E91E63] py-3 text-sm font-bold text-white"
              >
                Done
              </button>
              <div className="h-2" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
