"use client";

import { motion } from "framer-motion";
import { Palette } from "lucide-react";

export function BrandingStep() {
  return (
    <div className="flex flex-col bg-background">
    <div className="">
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-text-primary">Branding</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Customize how your quiz looks and feels.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-20 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-text-muted">
          <Palette className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-semibold text-text-primary">
          Branding is coming soon
        </p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-text-secondary">
          Logo, colors, certificates and other branding options will be
          available in a future version.
        </p>
      </motion.div>
    </div>
    </div>
    </div>
  );
}
