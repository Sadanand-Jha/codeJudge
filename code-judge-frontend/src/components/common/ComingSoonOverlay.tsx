"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function ComingSoonOverlay({
  title = "Dashboard — Coming Soon",
  description = "We’re rebuilding the dashboard to focus on Problems, Quizzes & Tests. Use the sidebar to continue.",
  primaryHref = "/tests",
  primaryLabel = "Go to Tests",
}: {
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-card shadow-2xl p-5 sm:p-6 text-center max-h-[90vh] overflow-y-auto"
          >
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">{description}</p>
            <div className="mt-5 flex gap-2 justify-center">
              <Link
                href={primaryHref}
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white text-xs font-semibold hover:brightness-110 transition"
              >
                {primaryLabel}
              </Link>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition"
              >
                Dismiss
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition"
              aria-label="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
