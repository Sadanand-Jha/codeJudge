"use client";

import { motion } from "framer-motion";
import { Award, Flame, Star, Rocket, Target } from "lucide-react";

const achievements = [
  { title: "Specialist", desc: "Reached 1400 rating", icon: Award, gradient: "from-[#7C3AED] to-[#6D28D9]", glow: "rgba(124,58,237,0.2)" },
  { title: "100 Day Streak", desc: "Solved problems 100 days in a row", icon: Flame, gradient: "from-[#F59E0B] to-[#DC2626]", glow: "rgba(245,158,11,0.2)" },
  { title: "500 Problems Solved", desc: "Solved 500 problems total", icon: Star, gradient: "from-[#FBBF24] to-[#F59E0B]", glow: "rgba(251,191,36,0.2)" },
  { title: "Top 10%", desc: "Ranked in top 10% globally", icon: Rocket, gradient: "from-[#3B82F6] to-[#2563EB]", glow: "rgba(59,130,246,0.2)" },
  { title: "Contest Winner", desc: "Won a weekly contest", icon: Target, gradient: "from-[#22C55E] to-[#16A34A]", glow: "rgba(34,197,94,0.2)" },
];

export default function Achievements() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-5">Achievements</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {achievements.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-xl border border-border bg-card-hover dark:bg-[#09090B] p-4 text-center"
              style={{ boxShadow: `0 0 20px ${a.glow}` }}
            >
              <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center mb-2`}>
                <Icon className="w-5 h-5 text-text-primary" />
              </div>
              <p className="text-xs font-semibold text-text-primary">{a.title}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{a.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}