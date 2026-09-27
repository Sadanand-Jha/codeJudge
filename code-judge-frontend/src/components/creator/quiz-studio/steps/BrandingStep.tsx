"use client";

import { motion } from "framer-motion";
import { Palette } from "lucide-react";
import { StudioStepHeader, StudioStepLayout } from "../primitives";

export function BrandingStep() {
  return (
    <StudioStepLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <StudioStepHeader title="Branding" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-text-muted">
          <Palette className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-semibold text-text-primary">
          Branding is coming soon
        </p>
      </motion.div>
    </StudioStepLayout>
  );
}
