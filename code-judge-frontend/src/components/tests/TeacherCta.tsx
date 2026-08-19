"use client";

import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, FileStack, Wallet, Users } from "lucide-react";
import { PrimaryButton } from "./ui";

/**
 * Teacher creator CTA — feels like part of the product, not an ad.
 */
export function TeacherCta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="tests-teacher-cta relative overflow-hidden rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/8 via-transparent to-violet-600/10 p-7 sm:p-10"
    >
      {/* Ambient accents — kept subtle */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-bold text-violet-500 dark:text-violet-300">
            <GraduationCap className="h-3.5 w-3.5" />
            For Educators
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-primary sm:text-[28px]">
            Create & sell your test series
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
            Have high-quality questions? Build your own test series, set your price, and reach thousands of
            students across India — free or paid.
          </p>
          <div className="mt-6 flex flex-wrap gap-6">
            {[
              { icon: FileStack, label: "Publish tests & series" },
              { icon: Wallet, label: "Set free or paid pricing" },
              { icon: Users, label: "Track students & sales" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                <f.icon className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <PrimaryButton href="/tests/create" className="px-6 py-3 text-sm">
            Start Creating
            <ArrowRight className="h-4 w-4" />
          </PrimaryButton>
          <div className="text-xs text-text-muted">
            10,000+ educators already publishing on ByteClash
          </div>
        </div>
      </div>
    </motion.section>
  );
}