"use client";

import { motion } from "framer-motion";

const submissions = [
  { problem: "Two Sum", language: "C++", verdict: "Accepted", runtime: "4ms", memory: "8.2MB", time: "2h ago" },
  { problem: "Longest Substring", language: "Python", verdict: "TLE", runtime: "—", memory: "—", time: "5h ago" },
  { problem: "Binary Tree DFS", language: "Java", verdict: "Accepted", runtime: "7ms", memory: "12.1MB", time: "1d ago" },
  { problem: "Dijkstra's Algorithm", language: "C++", verdict: "Runtime Error", runtime: "—", memory: "—", time: "1d ago" },
  { problem: "Merge Intervals", language: "Python", verdict: "Wrong Answer", runtime: "—", memory: "—", time: "2d ago" },
];

const verdictStyles: Record<string, string> = {
  "Accepted": "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
  "Wrong Answer": "bg-red-500/10 text-red-400 border-red-500/20",
  "TLE": "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
  "Runtime Error": "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20",
};

export default function RecentSubmissions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6"
    >
      <h3 className="text-sm font-semibold text-white mb-5">Recent Submissions</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] pb-3">Problem</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] pb-3">Language</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] pb-3">Verdict</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] pb-3">Runtime</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] pb-3">Memory</th>
              <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] pb-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s, i) => (
              <tr key={i} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 text-sm text-white font-medium">{s.problem}</td>
                <td className="py-3 text-sm text-[#9CA3AF]">{s.language}</td>
                <td className="py-3">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${verdictStyles[s.verdict]}`}>
                    {s.verdict}
                  </span>
                </td>
                <td className="py-3 text-right text-sm text-[#9CA3AF]">{s.runtime}</td>
                <td className="py-3 text-right text-sm text-[#9CA3AF]">{s.memory}</td>
                <td className="py-3 text-right text-xs text-[#6B7280]">{s.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}