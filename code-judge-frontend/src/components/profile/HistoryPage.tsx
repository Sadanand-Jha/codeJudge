"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { History, Code2, ArrowRight } from "lucide-react";
import ProfileSectionHeader from "./ProfileSectionHeader";

export default function HistoryPage() {
  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <ProfileSectionHeader
          title="History"
          description="All your past submissions and activity on ByteClash."
          icon={History}
          iconTone="from-[#3B82F6] to-[#06B6D4]"
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="text-sm font-semibold text-text-primary mb-4">Submissions</h2>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-card-hover flex items-center justify-center mb-3">
              <Code2 className="w-5 h-5 text-text-secondary" />
            </div>
            <p className="text-sm text-text-secondary">No submissions yet.</p>
            <Link
              href="/problems"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all"
            >
              Start solving <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}