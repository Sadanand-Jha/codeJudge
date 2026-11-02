"use client";

import { MotionConfig, motion } from "framer-motion";

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-dvh bg-[var(--background)]"
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
