"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  Fingerprint,
  Landmark,
  Receipt,
  ShieldCheck,
  Clock,
  Upload,
  Check,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { PageHeader, MockDataTag, Panel, StatusBadge, BillButton } from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";
import { VERIFICATION } from "./mockData";
import type { VerificationSection } from "./types";

const SECTION_META: Record<VerificationSection["id"], { icon: typeof Fingerprint; color: string }> = {
  identity: { icon: Fingerprint, color: "text-violet-500" },
  organization: { icon: Building2, color: "text-sky-500" },
  payment: { icon: Landmark, color: "text-emerald-500" },
  tax: { icon: Receipt, color: "text-amber-500" },
};

export function VerificationPage() {
  const { info: toastInfo } = useToast();
  const [sections] = useState<VerificationSection[]>(VERIFICATION);

  const completeCount = sections.filter((s) => s.status === "complete").length;
  const pendingCount = sections.filter((s) => s.status === "pending").length;
  const progress = Math.round((completeCount / sections.length) * 100);

  const startVerification = (id: string) => {
    const section = sections.find((s) => s.id === id);
    if (section?.status === "complete") return;
    toastInfo({ title: "Preview mode", description: "Document upload is disabled in this preview." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification"
        subtitle="Verify your identity and business details to unlock payouts and grow trust."
        badge={<MockDataTag />}
        actions={
          <BillButton variant="ghost" href="/creator/billing/settings">
            Payment settings
          </BillButton>
        }
      />

      {/* Progress hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg font-extrabold tracking-tight text-text-primary">
                {completeCount === sections.length ? "You're fully verified" : `${completeCount} of ${sections.length} verified`}
              </h2>
              <StatusBadge
                label={completeCount === sections.length ? "Verified Creator" : `${pendingCount} pending`}
                tone={completeCount === sections.length ? "emerald" : "amber"}
                dot
              />
            </div>
            <p className="mt-1 text-[13px] text-text-secondary">
              {completeCount === sections.length
                ? "All checks passed. You can receive payouts and your profile shows the verified badge."
                : "Complete the remaining sections to unlock payouts and the verified badge."}
            </p>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-text-secondary">Verification progress</span>
              <span className="text-text-primary tabular-nums">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const meta = SECTION_META[section.id];
          const Icon = meta.icon;
          const complete = section.status === "complete";
          return (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "rounded-2xl border bg-card p-5 transition-colors",
                complete ? "border-emerald-500/20" : section.status === "pending" ? "border-amber-500/25" : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]", meta.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-text-primary">{section.label}</h3>
                    <p className="mt-0.5 text-xs text-text-secondary">{section.description}</p>
                  </div>
                </div>
                <StatusBadge
                  label={section.status === "complete" ? "Verified" : section.status === "pending" ? "Pending" : "Required"}
                  tone={complete ? "emerald" : section.status === "pending" ? "amber" : "rose"}
                  dot
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-text-primary">{section.detail}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted">
                    {complete ? (
                      <>
                        <BadgeCheck className="h-3 w-3 text-emerald-500" />
                        {section.updatedAt}
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        {section.updatedAt}
                      </>
                    )}
                  </p>
                </div>
                {!complete && (
                  <BillButton variant={section.status === "required" ? "primary" : "ghost"} onClick={() => startVerification(section.id)}>
                    <Upload className="h-3.5 w-3.5" />
                    {section.status === "required" ? "Start verification" : "Review"}
                  </BillButton>
                )}
                {complete && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                    Complete
                  </span>
                )}
              </div>
            </motion.section>
          );
        })}
      </div>

      <Panel title="Why verification matters">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Lock, title: "Secure payouts", text: "Verified creators can withdraw earnings to their bank account." },
            { icon: BadgeCheck, title: "Verified badge", text: "A trusted badge next to your name builds student confidence." },
            { icon: ShieldCheck, title: "Higher visibility", text: "Verified creators rank higher in search and recommendations." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-border/60 bg-white/[0.02] p-4">
                <Icon className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
                <p className="mt-2.5 text-[13px] font-semibold text-text-primary">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{item.text}</p>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}