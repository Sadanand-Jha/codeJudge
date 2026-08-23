"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/helpers";
import { AudienceStudent } from "@/components/quiz/creator/types";
import { useRoomStore, getAllStudents, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrlById } from "@/config/dicebear";
import AudienceModal from "./AudienceModal";

type FilterTab = "all" | "my" | "recent";
type ViewTab = "search" | "browse";

interface SelectStudentsModalProps {
  open: boolean;
  onClose: () => void;
  /** Students currently attached to the quiz audience. */
  selectedStudents: AudienceStudent[];
  /** Commit the new selection (called on "Add Students"). */
  onApply: (students: AudienceStudent[]) => void;
}

/**
 * Large centered modal for picking individual students for the quiz. Supports
 * search across the teacher's directory, quick filters, select-all/clear, and
 * a "Browse by Room" view so students can be picked from a specific room.
 */
export default function SelectStudentsModal({
  open,
  onClose,
  selectedStudents,
  onApply,
}: SelectStudentsModalProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const recentlyUsedStudentIds = useRoomStore((s) => s.recentlyUsedStudentIds);
  const markRecentlyUsedStudent = useRoomStore((s) => s.markRecentlyUsedStudent);
  const { user } = useAuthStore();

  const [view, setView] = useState<ViewTab>("search");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [draft, setDraft] = useState<Map<string, AudienceStudent>>(
    () => new Map(selectedStudents.map((s) => [s.rollNumber.toLowerCase(), s]))
  );

  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);
  const directory = useMemo(() => getAllStudents(ownedRooms), [ownedRooms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const recent = new Set(recentlyUsedStudentIds);
    return directory.filter((s) => {
      if (filter === "recent" && !recent.has(s.rollNumber.toLowerCase())) return false;
      if (q) {
        const haystack = `${s.name} ${s.rollNumber} ${s.username ?? (s as unknown as { email?: string }).email ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [directory, filter, query, recentlyUsedStudentIds]);

  const draftCount = draft.size;
  const allShownSelected = filtered.length > 0 && filtered.every((s) => draft.has(s.rollNumber.toLowerCase()));

  const toggle = (student: AudienceStudent) => {
    setDraft((prev) => {
      const next = new Map(prev);
      const key = student.rollNumber.toLowerCase();
      if (next.has(key)) next.delete(key);
      else next.set(key, student);
      return next;
    });
    markRecentlyUsedStudent(student.rollNumber);
  };

  const selectAllShown = () => {
    setDraft((prev) => {
      const next = new Map(prev);
      filtered.forEach((s) => next.set(s.rollNumber.toLowerCase(), s));
      return next;
    });
  };

  const clearSelection = () => setDraft(new Map());

  const handleApply = () => {
    onApply(Array.from(draft.values()));
    onClose();
  };

  const handleClose = () => {
    setDraft(new Map(selectedStudents.map((s) => [s.rollNumber.toLowerCase(), s])));
    setQuery("");
    onClose();
  };

  const row = (student: AudienceStudent, icon = true) => {
    const isSelected = draft.has(student.rollNumber.toLowerCase());
    return (
      <button
        key={student.rollNumber}
        onClick={() => toggle(student)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-all duration-150",
          isSelected
            ? "border-pink-500/40 bg-pink-500/[0.06]"
            : "border-border hover:border-border-hover hover:bg-white/[0.02]"
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
            isSelected
              ? "border-pink-500 bg-pink-500 text-white"
              : "border-border-hover bg-input-bg"
          )}
        >
          {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
        {icon && (
          <img
            src={getAvatarUrlById(student.avatarId)}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-text-primary">{student.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-text-muted">
            {student.rollNumber} · @{(student.username ?? (student as unknown as { email?: string }).email?.split("@")[0] ?? "").toLowerCase()}
          </span>
        </span>
      </button>
    );
  };

  return (
    <AudienceModal
      open={open}
      onClose={handleClose}
      title="Select Students"
      subtitle="Choose specific students who should be eligible to register for this quiz."
      icon={<UserRound className="h-5 w-5" />}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-text-secondary">
            <span className="font-bold text-text-primary">{draftCount}</span> student
            {draftCount !== 1 ? "s" : ""} selected
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
              Add Students
            </button>
          </div>
        </div>
      }
    >
      {/* View tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
        {(
          [
            { id: "search", label: "Search" },
            { id: "browse", label: "Browse by Room" },
          ] as Array<{ id: ViewTab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
              view === t.id ? "bg-pink-500/10 text-pink-500" : "text-text-muted hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "search" ? (
        <div className="mt-3">
          {/* Search + actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, roll number or username..."
                className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              {(
                [
                  { id: "all", label: "All Students" },
                  { id: "my", label: "From My Rooms" },
                  { id: "recent", label: "Recently Used" },
                ] as Array<{ id: FilterTab; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                    filter === tab.id
                      ? "bg-pink-500/10 text-pink-500"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllShown}
                disabled={filtered.length === 0}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                disabled={draftCount === 0}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Student list */}
          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {directory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-10 text-center">
                <UserRound className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-2 text-sm font-medium text-text-secondary">No students available</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Add students to a room first, then they become selectable here.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-6 text-center text-xs text-text-muted">
                No students match your search.
              </p>
            ) : (
              filtered.map((s) => row(s))
            )}
          </div>

          {allShownSelected && filtered.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-success">
              <Check className="h-3 w-3" />
              All {filtered.length} shown students selected
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {ownedRooms.filter((r) => !r.archived).length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-6 text-center text-xs text-text-muted">
              You don&apos;t have any rooms with students yet.
            </p>
          ) : (
            ownedRooms
              .filter((r) => !r.archived)
              .map((room) => {
                const roomSelectedAll =
                  room.students.length > 0 &&
                  room.students.every((s) => draft.has(s.rollNumber.toLowerCase()));
                return (
                  <div key={room.id} className="overflow-hidden rounded-xl border border-border">
                    <div className="flex items-center justify-between gap-2 bg-white/[0.02] px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                          <Users className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-text-primary">{room.name}</p>
                          <p className="text-[10px] text-text-muted">
                            {room.students.length} student{room.students.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDraft((prev) => {
                            const next = new Map(prev);
                            room.students.forEach((s) =>
                              roomSelectedAll
                                ? next.delete(s.rollNumber.toLowerCase())
                                : next.set(s.rollNumber.toLowerCase(), s)
                            );
                            return next;
                          });
                        }}
                        className="shrink-0 rounded-md bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold text-pink-500 transition-colors hover:bg-pink-500/20"
                      >
                        {roomSelectedAll ? "Clear All" : "Select All"}
                      </button>
                    </div>
                    <div className="space-y-1.5 border-t border-border p-2">
                      {room.students.map((s) => row(s, false))}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </AudienceModal>
  );
}