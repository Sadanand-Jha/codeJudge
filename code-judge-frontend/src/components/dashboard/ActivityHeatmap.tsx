"use client";

import { motion } from "framer-motion";

interface ActivityDay {
  date: string;
  count: number;
}

function generateMockData(): ActivityDay[] {
  const data: ActivityDay[] = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const count = Math.random() > 0.5 ? Math.floor(Math.random() * 12) + 1 : 0;
    data.push({ date: d.toISOString().split("T")[0], count });
  }
  return data;
}

function getIntensity(count: number): string {
  if (count === 0) return "bg-card-hover";
  if (count <= 3) return "bg-[#22C55E]/30";
  if (count <= 6) return "bg-[#22C55E]/55";
  if (count <= 9) return "bg-[#22C55E]/75";
  return "bg-[#22C55E]";
}

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ActivityHeatmap() {
  const activityData = generateMockData();
  const weeks: ActivityDay[][] = [];
  let currentWeek: ActivityDay[] = [];

  activityData.forEach((day, index) => {
    const dayOfWeek = new Date(day.date).getDay();
    if (index === 0) {
      for (let i = 0; i < dayOfWeek; i++) currentWeek.push({ date: "", count: -1 });
    }
    currentWeek.push(day);
    if (dayOfWeek === 6) { weeks.push(currentWeek); currentWeek = []; }
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalSubmissions = activityData.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-primary">Activity Heatmap</h3>
        <span className="text-xs text-text-secondary">{totalSubmissions} submissions in the last year</span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`w-3 h-3 rounded-sm ${day.count >= 0 ? getIntensity(day.count) : "bg-transparent"}`}
                  title={day.date ? `${day.date}: ${day.count} submissions` : ""}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-4 justify-end">
        <span className="text-[10px] text-text-muted mr-1">Less</span>
        <div className="w-3 h-3 rounded-sm bg-card-hover" />
        <div className="w-3 h-3 rounded-sm bg-[#22C55E]/30" />
        <div className="w-3 h-3 rounded-sm bg-[#22C55E]/55" />
        <div className="w-3 h-3 rounded-sm bg-[#22C55E]/75" />
        <div className="w-3 h-3 rounded-sm bg-[#22C55E]" />
        <span className="text-[10px] text-text-muted ml-1">More</span>
      </div>
    </motion.div>
  );
}