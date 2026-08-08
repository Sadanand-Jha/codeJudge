"use client";

import { motion, type Variants } from "framer-motion";

interface TagProficiency {
  topic: string;
  solved: number;
  total: number;
}

interface ProblemTagsProps {
  data?: TagProficiency[];
}

const defaultData: TagProficiency[] = [
  { topic: "Arrays", solved: 12, total: 20 },
  { topic: "Math", solved: 10, total: 20 },
  { topic: "DP", solved: 8, total: 20 },
  { topic: "Graphs", solved: 5, total: 20 },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ProblemTags({ data = defaultData }: ProblemTagsProps) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4 }}
      className="md:col-span-4 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-colors hover:border-cyan-500/30"
    >
      {/* Header */}
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">Topic Proficiency</h3>

      {/* Topic List */}
      <div className="space-y-5">
        {data.map((tag, index) => {
          const pct = Math.round((tag.solved / Math.max(tag.total, 1)) * 100);
          return (
            <div key={tag.topic}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">{tag.topic}</span>
                <span className="text-xs text-slate-500">{tag.solved}/{tag.total}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}