"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, Users } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useRoomStore, getEligibleCount, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { timeAgo } from "@/lib/formatters";
import AudienceModal from "./AudienceModal";

type FilterTab = "all" | "my" | "recent";

interface SelectRoomsModalProps {
  open: boolean;
  onClose: () => void;
  /** Room ids currently attached to the quiz audience. */
  selectedRoomIds: string[];
  /** Commit the new selection (called on "Add Rooms"). */
  onApply: (roomIds: string[]) => void;
  /** Open the nested "Create New Room" flow. */
  onCreateRoom: () => void;
}

/**
 * Large centered modal for picking which rooms can register for the quiz.
 * Supports search, quick filters, multi-select and a sticky summary footer.
 */
export default function SelectRoomsModal({
  open,
  onClose,
  selectedRoomIds,
  onApply,
  onCreateRoom,
}: SelectRoomsModalProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const recentlyUsedIds = useRoomStore((s) => s.recentlyUsedIds);
  const markRecentlyUsed = useRoomStore((s) => s.markRecentlyUsed);
  const { user } = useAuthStore();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [draft, setDraft] = useState<string[]>(selectedRoomIds);

  // Only rooms owned by the authenticated admin are selectable.
  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);
  const activeRooms = useMemo(() => ownedRooms.filter((r) => !r.archived), [ownedRooms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const recent = new Set(recentlyUsedIds);
    return activeRooms.filter((room) => {
      if (filter === "recent" && !recent.has(room.id)) return false;
      if (q) {
        const haystack = `${room.name} ${room.description ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeRooms, filter, query, recentlyUsedIds]);

  const eligibleCount = useMemo(() => getEligibleCount(rooms, draft), [rooms, draft]);

  const toggle = (roomId: string) => {
    setDraft((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
    markRecentlyUsed(roomId);
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClose = () => {
    setDraft(selectedRoomIds);
    setQuery("");
    onClose();
  };

  return (
    <AudienceModal
      open={open}
      onClose={handleClose}
      title="Select Rooms"
      subtitle="Choose the rooms whose students should be allowed to register."
      icon={<Users className="h-5 w-5" />}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-text-secondary">
            <span className="font-bold text-text-primary">{draft.length}</span> room
            {draft.length !== 1 ? "s" : ""} selected ·{" "}
            <span className="font-bold text-text-primary">{eligibleCount}</span> student
            {eligibleCount !== 1 ? "s" : ""} eligible
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="h-9 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Check className="h-3.5 w-3.5" />
              Add Rooms
            </button>
          </div>
        </div>
      }
    >
      {/* Search + Create New Room */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms..."
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          />
        </div>
        <button
          onClick={onCreateRoom}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-pink-500/30 bg-pink-500/5 px-3.5 text-xs font-semibold text-pink-500 transition-colors hover:bg-pink-500/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Create New Room
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex items-center gap-1">
        {(
          [
            { id: "all", label: "All" },
            { id: "my", label: "My Rooms" },
            { id: "recent", label: "Recently Used" },
          ] as Array<{ id: FilterTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === tab.id
                ? "bg-pink-500/10 text-pink-500 ring-1 ring-inset ring-pink-500/20"
                : "text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Room rows */}
      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center">
            <Users className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-2 text-sm font-medium text-text-secondary">No rooms found</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {query ? "Try a different search term." : "Create a room to get started."}
            </p>
          </div>
        ) : (
          filtered.map((room) => {
            const isSelected = draft.includes(room.id);
            const meta = [room.description, `Updated ${timeAgo(room.updatedAt)}`]
              .filter(Boolean)
              .join(" • ");
            return (
              <button
                key={room.id}
                onClick={() => toggle(room.id)}
                className={cn(
                  "group flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-150",
                  isSelected
                    ? "border-pink-500/40 bg-pink-500/[0.06] shadow-[0_0_0_1px_rgba(236,72,153,0.15)]"
                    : "border-border hover:border-border-hover hover:bg-white/[0.02]"
                )}
              >
                {/* Checkbox */}
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    isSelected
                      ? "border-pink-500 bg-pink-500 text-white"
                      : "border-border-hover bg-input-bg group-hover:border-pink-500/40"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>

                {/* Room icon */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 ring-1 ring-inset ring-pink-500/15">
                  <Users className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {room.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">
                    {room.students.length} student{room.students.length !== 1 ? "s" : ""}
                  </span>
                  {meta && (
                    <span className="mt-0.5 block truncate text-[11px] text-text-muted">{meta}</span>
                  )}
                </span>

                {isSelected && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-pink-500">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </AudienceModal>
  );
}