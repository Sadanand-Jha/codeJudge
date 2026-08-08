"use client";

import { motion, type Variants } from "framer-motion";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";

interface RatingPoint {
  contest: string;
  date: string;
  rating: number;
  rank: number;
}

interface RatingGraphProps {
  data?: RatingPoint[];
  currentRating?: number;
}

const defaultData: RatingPoint[] = [
  { contest: "Initial", date: "Jan", rating: 1200, rank: 0 },
  { contest: "Contest #1", date: "Feb", rating: 1350, rank: 850 },
  { contest: "Contest #2", date: "Mar", rating: 1420, rank: 720 },
  { contest: "Contest #3", date: "Apr", rating: 1380, rank: 780 },
  { contest: "Contest #4", date: "May", rating: 1510, rank: 620 },
  { contest: "Contest #5", date: "Jun", rating: 1480, rank: 650 },
  { contest: "Contest #6", date: "Jul", rating: 1600, rank: 510 },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

interface TooltipPayloadItem {
  value?: number | string | null;
  payload?: { rank?: number };
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
    const rating = payload[0].value;
    return (
      <div className="rounded-xl bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 px-3 py-2 shadow-xl text-xs">
        <p className="font-semibold text-slate-100">{label}</p>
        <p className="text-muted-foreground mt-0.5">
          Rating: <span className="font-bold text-cyan-400">{rating}</span>
        </p>
        <p className="text-muted-foreground">Rank: #{payload[0]?.payload?.rank || "—"}</p>
      </div>
    );
  }
  return null;
};

export default function RatingGraph({ data = defaultData, currentRating }: RatingGraphProps) {
  const latestRating = currentRating || (data.length > 0 ? data[data.length - 1].rating : 0);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4 }}
      className="md:col-span-8 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-colors hover:border-cyan-500/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Rating History</h3>
        <span className="text-sm font-semibold text-cyan-400">{latestRating}</span>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["dataMin - 100", "dataMax + 100"]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="rating"
              stroke="#22d3ee"
              strokeWidth={3}
              fill="url(#ratingGradient)"
              dot={{ r: 3, fill: "#22d3ee", stroke: "#0B1121", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#22d3ee", stroke: "#0B1121", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}