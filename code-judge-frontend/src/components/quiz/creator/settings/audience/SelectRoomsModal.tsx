"use client";

import { useEffect, useMemo, useState } from "react";
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
  const setRooms = useRoomStore((s) => s.setRooms);
  const recentlyUsedIds = useRoomStore((s) => s.recentlyUsedIds);
  const markRecentlyUsed = useRoomStore((s) => s.markRecentlyUsed);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!open) return;
    import("@/services/rooms").then(({ fetchMyRooms }) => {
      fetchMyRooms().then((fresh) => setRooms(fresh as never)).catch(() => {});
    });
  }, [open, setRooms]);

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
          <p className="text-xs font-medium text-[var(--qs-muted)]">
            <span className="font-extrabold text-[var(--qs-ink)]">{draft.length}</span> room
            {draft.length !== 1 ? "s" : ""} selected ·{" "}
            <span className="font-extrabold text-[var(--qs-ink)]">{eligibleCount}</span> student
            {eligibleCount !== 1 ? "s" : ""} eligible
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="inline-flex h-9 items-center justify-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              <Check className="h-3.5 w-3.5" />
              Add Rooms
            </button>
          </div>
        </div>
      }
    >
      {/* Search + Create New Room */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms..."
            className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-4 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none"
          />
        </div>
        <button
          onClick={onCreateRoom}
          className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-[var(--qs-brand)]/40 bg-[var(--qs-poly-1)] px-3.5 text-xs font-bold text-[var(--qs-brand)] transition-colors hover:border-[var(--qs-brand)] sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Create New Room
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex w-fit items-center gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-0.5">
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
              "rounded-[9px] px-3 py-1.5 text-xs font-bold transition-colors",
              filter === tab.id
                ? "bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Room rows */}
      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-10 text-center">
            <Users className="mx-auto h-6 w-6 text-[var(--qs-muted)]" />
            <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">No rooms found</p>
            <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
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
                  "group flex w-full items-center gap-3.5 rounded-[16px] border-2 p-3.5 text-left transition-colors",
                  isSelected
                    ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                )}
              >
                {/* Checkbox */}
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-colors",
                    isSelected
                      ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] group-hover:border-[var(--qs-brand)]"
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>

                {/* Room icon */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                  <Users className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-[var(--qs-ink)]">
                    {room.name}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-[var(--qs-muted)]">
                    {room.memberCount ?? room.students.length} student{(room.memberCount ?? room.students.length) !== 1 ? "s" : ""}
                  </span>
                  {meta && (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--qs-muted)]">{meta}</span>
                  )}
                </span>

                {isSelected && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
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
