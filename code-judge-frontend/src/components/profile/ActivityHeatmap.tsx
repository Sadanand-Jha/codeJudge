"use client";

import { motion, type Variants } from "framer-motion";

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data?: ActivityDay[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function generateMockData(): ActivityDay[] {
  const data: ActivityDay[] = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = Math.random() > 0.5 ? Math.floor(Math.random() * 12) + 1 : 0;
    data.push({
      date: d.toISOString().split("T")[0],
      count,
    });
  }
  return data;
}

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-slate-700/30";
  if (count <= 3) return "bg-emerald-900/50";
  if (count <= 6) return "bg-emerald-700";
  if (count <= 9) return "bg-emerald-600";
  return "bg-emerald-400";
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const activityData = data || generateMockData();

  const weeks: ActivityDay[][] = [];
  let currentWeek: ActivityDay[] = [];

  activityData.forEach((day, index) => {
    const dayOfWeek = new Date(day.date).getDay();
    if (index === 0) {
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push({ date: "", count: -1 });
      }
    }
    currentWeek.push(day);
    if (dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalSubmissions = activityData.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4 }}
      className="md:col-span-12 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-colors hover:border-cyan-500/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-medium uppercase tracking-widest text-slate-400">Activity Heatmap</h3>
        <span className="text-xs text-slate-400">{totalSubmissions} submissions in the last year</span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`w-3 h-3 rounded-sm ${
                    day.count >= 0 ? getIntensityClass(day.count) : "bg-transparent"
                  }`}
                  title={day.date ? `${day.date}: ${day.count} submissions` : ""}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-4 justify-end">
        <span className="text-xs text-slate-500 mr-1">Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-700/30" />
        <div className="w-3 h-3 rounded-sm bg-emerald-900/50" />
        <div className="w-3 h-3 rounded-sm bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-600" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        <span className="text-xs text-slate-500 ml-1">More</span>
      </div>
    </motion.div>
  );
}