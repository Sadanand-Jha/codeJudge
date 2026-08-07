"use client";
import type { ComponentType, SVGProps } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { LogIn, CheckCircle2, ListChecks, WifiOff, Wifi, Play, Pause, Radio } from "lucide-react";
import type { ActivityEvent, ActivityEventType } from "@/types/liveAssessment";
import { formatRelative } from "@/lib/liveAssessmentHelpers";

interface ActivityFeedProps {
  events: ActivityEvent[];
  className?: string;
  limit?: number;
}

const EVENT_META: Record<ActivityEventType, { icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  joined: { icon: LogIn, color: "#22C55E", label: "Joined" },
  submitted: { icon: CheckCircle2, color: "#22C55E", label: "Submitted" },
  reached_question: { icon: ListChecks, color: "#EC4899", label: "Progress" },
  disconnected: { icon: WifiOff, color: "#EF4444", label: "Disconnected" },
  reconnected: { icon: Wifi, color: "#3B82F6", label: "Reconnected" },
  started: { icon: Play, color: "#EC4899", label: "Started" },
  paused: { icon: Pause, color: "#F59E0B", label: "Paused" },
  resumed: { icon: Radio, color: "#22C55E", label: "Resumed" },
};

export function ActivityFeed({ events, className = "", limit = 12 }: ActivityFeedProps) {
  const shown = events.slice(0, limit);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <AnimatePresence initial={false}>
        {shown.map((event) => {
          const meta = EVENT_META[event.type];
          const Icon = meta.icon;
          return (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, x: 20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-[#171923] p-2.5 hover:border-white/[0.1] transition-all"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}25` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{event.avatar}</span>
                  <p className="text-[11px] text-white/90 leading-tight truncate">{event.message}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                  {event.detail && <span className="text-[8px] text-muted-foreground">• {event.detail}</span>}
                  <span className="text-[8px] text-muted-foreground ml-auto">{formatRelative(event.secondsAgo)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {shown.length === 0 && (
        <div className="text-center py-8">
          <Radio className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No activity yet</p>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
