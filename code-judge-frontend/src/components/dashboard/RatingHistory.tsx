"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const fullData = [
  { date: "Jan", rating: 1200 },
  { date: "Feb", rating: 1350 },
  { date: "Mar", rating: 1420 },
  { date: "Apr", rating: 1380 },
  { date: "May", rating: 1510 },
  { date: "Jun", rating: 1480 },
  { date: "Jul", rating: 1600 },
  { date: "Aug", rating: 1550 },
  { date: "Sep", rating: 1620 },
  { date: "Oct", rating: 1450 },
  { date: "Nov", rating: 1500 },
  { date: "Dec", rating: 1450 },
];

const filters = ["7D", "1M", "6M", "1Y"] as const;
type Filter = (typeof filters)[number];

const filterRanges: Record<Filter, number> = {
  "7D": 2,
  "1M": 4,
  "6M": 8,
  "1Y": 12,
};

interface TooltipPayloadItem {
  value?: number | string | null;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-card border border-border px-3 py-2 shadow-xl text-xs">
        <p className="font-semibold text-text-primary">{label}</p>
        <p className="text-text-secondary mt-0.5">
          Rating: <span className="font-bold text-[#7C3AED]">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function RatingHistory() {
  const [activeFilter, setActiveFilter] = useState<Filter>("1Y");
  const data = fullData.slice(-filterRanges[activeFilter]);
  const currentRating = data[data.length - 1]?.rating || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-primary">Rating History</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-[#7C3AED]">{currentRating}</span>
          <div className="flex items-center gap-1 bg-card-hover dark:bg-[#09090B] rounded-lg p-0.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  activeFilter === f
                    ? "bg-[#7C3AED] text-text-primary shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
            <YAxis domain={["dataMin - 100", "dataMax + 100"]} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="rating"
              stroke="#7C3AED"
              strokeWidth={3}
              fill="url(#ratingGrad)"
              dot={{ r: 3, fill: "#7C3AED", stroke: "#09090B", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#7C3AED", stroke: "#09090B", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}