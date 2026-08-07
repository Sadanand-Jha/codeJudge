"use client";
import type { ComponentType, SVGProps } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { X, Search, Users, CheckCircle2, Activity, WifiOff, ArrowDownUp, UserX } from "lucide-react";
import type { LiveParticipant, ParticipantStatus } from "@/types/liveAssessment";
import { ParticipantCard } from "./ParticipantCard";

interface ParticipantsDrawerProps {
  open: boolean;
  onClose: () => void;
  participants: LiveParticipant[];
}

type FilterOption = "all" | ParticipantStatus;
type SortOption = "alphabetical" | "progress" | "submission" | "join";

const FILTERS: { id: FilterOption; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; color: string }[] = [
  { id: "all", label: "All", icon: Users, color: "#EC4899" },
  { id: "attempting", label: "Online", icon: Activity, color: "#3B82F6" },
  { id: "submitted", label: "Submitted", icon: CheckCircle2, color: "#22C55E" },
  { id: "idle", label: "Idle", icon: UserX, color: "#9CA3AF" },
  { id: "disconnected", label: "Disconnected", icon: WifiOff, color: "#EF4444" },
];

const SORTS: { id: SortOption; label: string }[] = [
  { id: "alphabetical", label: "Alphabetical" },
  { id: "progress", label: "Progress" },
  { id: "submission", label: "Submission Time" },
  { id: "join", label: "Join Time" },
];

export function ParticipantsDrawer({ open, onClose, participants }: ParticipantsDrawerProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("alphabetical");

  const filtered = useMemo(() => {
    let list = [...participants];
    if (filter !== "all") list = list.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.username.toLowerCase().includes(q));
    }
    switch (sort) {
      case "alphabetical": list.sort((a, b) => a.username.localeCompare(b.username)); break;
      case "progress": list.sort((a, b) => b.progress - a.progress); break;
      case "submission": list.sort((a, b) => {
        const at = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bt = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bt - at;
      }); break;
      case "join": list.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()); break;
    }
    return list;
  }, [participants, filter, search, sort]);

  const counts = useMemo(() => ({
    all: participants.length,
    attempting: participants.filter((p) => p.status === "attempting").length,
    submitted: participants.filter((p) => p.status === "submitted").length,
    idle: participants.filter((p) => p.status === "idle").length,
    disconnected: participants.filter((p) => p.status === "disconnected").length,
  }), [participants]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            className="fixed top-0 right-0 h-screen w-[420px] max-w-[90vw] bg-[#0B0D14] border-l border-border-hover z-[100] flex flex-col shadow-2xl shadow-black/50"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Participants</h2>
                  <p className="text-[10px] text-muted-foreground">{filtered.length} of {participants.length} shown</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-[#9CA3Af] hover:text-white transition-colors" aria-label="Close drawer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search participants..." className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-[#111217] text-white placeholder-[#71717A] focus:outline-none focus:border-[#EC4899]/30 transition-colors" />
              </div>
            </div>

            <div className="px-5 pb-2 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {FILTERS.map((f) => {
                  const Icon = f.icon;
                  const active = filter === f.id;
                  const count = counts[f.id as keyof typeof counts];
                  return (
                    <button key={f.id} onClick={() => setFilter(f.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${active ? "text-white border" : "text-[#9CA3Af] hover:text-white border border-transparent hover:bg-white/[0.04]"}`} style={active ? { backgroundColor: `${f.color}15`, borderColor: `${f.color}40`, color: f.color } : undefined}>
                      <Icon className="w-3 h-3" />
                      {f.label}
                      <span className="ml-0.5 px-1 py-0.5 rounded text-[8px] bg-white/[0.06] text-muted-foreground">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-3 shrink-0 flex items-center gap-2">
              <ArrowDownUp className="w-3 h-3 text-muted-foreground" />
              <div className="flex items-center gap-1 overflow-x-auto">
                {SORTS.map((s) => (
                  <button key={s.id} onClick={() => setSort(s.id)} className={`px-2 py-1 rounded-md text-[9px] font-medium whitespace-nowrap transition-all ${sort === s.id ? "bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/25" : "text-muted-foreground hover:text-white border border-transparent"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {filtered.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#171923] border border-border flex items-center justify-center">
                      <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-white">No participants</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{search ? "Try a different search." : "No one matches this filter."}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((p, i) => (
                      <ParticipantCard key={p.id} participant={p} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ParticipantsDrawer;
