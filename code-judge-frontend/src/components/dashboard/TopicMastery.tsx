"use client";

import { motion } from "framer-motion";
import { Brackets, Brain, Network, TreePine, Type, Binary, Hand, Sigma } from "lucide-react";

const topics = [
  { name: "Arrays", solved: 18, total: 25, icon: Brackets, color: "#3B82F6" },
  { name: "DP", solved: 12, total: 25, icon: Brain, color: "#7C3AED" },
  { name: "Graphs", solved: 8, total: 25, icon: Network, color: "#22C55E" },
  { name: "Trees", solved: 10, total: 25, icon: TreePine, color: "#F59E0B" },
  { name: "Strings", solved: 15, total: 25, icon: Type, color: "#EC4899" },
  { name: "Binary Search", solved: 14, total: 25, icon: Binary, color: "#06B6D4" },
  { name: "Greedy", solved: 9, total: 25, icon: Hand, color: "#F97316" },
  { name: "Math", solved: 11, total: 25, icon: Sigma, color: "#FBBF24" },
];

export default function TopicMastery() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6"
    >
      <h3 className="text-sm font-semibold text-white mb-5">Topic Proficiency</h3>
      <div className="space-y-4">
        {topics.map((topic, i) => {
          const Icon = topic.icon;
          const pct = Math.round((topic.solved / topic.total) * 100);
          return (
            <div key={topic.name} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${topic.color}15`, border: `1px solid ${topic.color}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: topic.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white">{topic.name}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{topic.solved}/{topic.total}</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: topic.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.08, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}