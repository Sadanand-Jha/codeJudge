"use client";

import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";

const contests = [
  { name: "Codeforces Round #900", rank: 245, ratingChange: 42, solved: 4, date: "Dec 15, 2024" },
  { name: "Weekly Contest 380", rank: 512, ratingChange: -15, solved: 2, date: "Dec 8, 2024" },
  { name: "Biweekly Contest 120", rank: 189, ratingChange: 28, solved: 5, date: "Dec 1, 2024" },
  { name: "Codeforces Round #895", rank: 678, ratingChange: -22, solved: 1, date: "Nov 24, 2024" },
];

export default function RecentContests() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-5">Recent Contests</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-text-muted pb-3">Contest</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-text-muted pb-3">Rank</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-text-muted pb-3">Δ Rating</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-text-muted pb-3">Solved</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-text-muted pb-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {contests.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                <td className="py-3 text-sm text-text-primary font-medium">{c.name}</td>
                <td className="py-3 text-right text-sm text-text-secondary">#{c.rank}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${c.ratingChange > 0 ? "text-[#22C55E]" : "text-red-400"}`}>
                    {c.ratingChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {c.ratingChange > 0 ? "+" : ""}{c.ratingChange}
                  </span>
                </td>
                <td className="py-3 text-right text-sm text-text-secondary">{c.solved}</td>
                <td className="py-3 text-right text-xs text-text-muted">{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}