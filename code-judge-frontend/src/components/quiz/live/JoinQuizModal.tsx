"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface JoinQuizModalProps {
  open: boolean;
  onClose: () => void;
  /** Receives the normalized 16-char quiz code */
  onJoin: (code: string) => void;
}

export function JoinQuizModal({ open, onClose, onJoin }: JoinQuizModalProps) {
  const [raw, setRaw] = useState("");

  const digits = raw.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const groups = digits.match(/.{1,4}/g) ?? [];
  const display = groups.join("-");
  const valid = digits.length === 16;

  const handleSubmit = () => {
    if (!valid) return;
    onJoin(digits);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="join-quiz-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md mx-4"
          >
            <div className="join-quiz-modal relative rounded-3xl border border-border-hover bg-gradient-to-br from-[#111217] to-[#0B0D14] p-6 shadow-2xl shadow-black/60">
              <div className="join-quiz-glow absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] opacity-20 blur" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="join-quiz-icon w-9 h-9 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
                        <Sparkles className="join-quiz-sparkles w-5 h-5 text-white" />
                    </div>
                    <h2 className="join-quiz-title text-lg font-bold text-white">Join Quiz</h2>
                  </div>
                  <button onClick={onClose} className="join-quiz-close p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="join-quiz-desc text-xs text-muted-foreground mb-5">
                  Enter the code shared by your teacher to join a live
                  assessment.
                </p>

                <label className="join-quiz-label block text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                  Quiz Code
                </label>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={19}
                  value={display}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="ABCD-1234-EFGH-5678"
                  className="join-quiz-input w-full text-center text-xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl border border-border bg-[#171923] text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors"
                />

                {!valid && digits.length > 0 && (
                  <p className="join-quiz-error text-[10px] text-[#F59E0B] mt-2">
                    Enter the full 16-character code.
                  </p>
                )}

                <motion.button
                  whileHover={valid ? { scale: 1.02 } : {}}
                  whileTap={valid ? { scale: 0.98 } : {}}
                  onClick={handleSubmit}
                  disabled={!valid}
                  className="join-quiz-btn w-full mt-5 h-10 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join Quiz
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default JoinQuizModal;
