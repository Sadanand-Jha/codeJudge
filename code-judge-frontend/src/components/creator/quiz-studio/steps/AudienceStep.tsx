"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Upload,
  ClipboardList,
  Copy,
  RefreshCw,
  Plus,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";
import { useRoomStore, getEligibleCount } from "@/store/roomStore";
import { generateQuizCode } from "@/utils/quizCode";
import SelectRoomsModal from "@/components/quiz/creator/settings/audience/SelectRoomsModal";
import CreateRoomModal from "@/components/quiz/creator/settings/audience/CreateRoomModal";

const MODE_OPTIONS: Array<{ id: "public" | "private" | "classroom"; label: string; desc: string }> = [
  { id: "public", label: "Public", desc: "Anyone can discover and attempt the quiz." },
  { id: "private", label: "Private", desc: "Only people with the link can attempt." },
  { id: "classroom", label: "Rooms", desc: "Restricted to students in your selected rooms." },
];

const SAMPLE_CSV = "Name,Roll Number,Email\nAnanya Sharma,001,ananya@example.com\nRohan Mehta,002,rohan@example.com\n";

export function AudienceStep() {
  const { state, updateAudience } = useStudio();
  const a = state.audience;

  const rooms = useRoomStore((s) => s.rooms);
  const [selectRoomsOpen, setSelectRoomsOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  const roomIds = a.roomIds ?? [];
  const selections = a.roomStudentSelections ?? {};
  const selectedRooms = useMemo(
    () => rooms.filter((r) => roomIds.includes(r.id) && !r.archived),
    [rooms, roomIds]
  );
  const eligibleCount = useMemo(() => getEligibleCount(rooms, roomIds), [rooms, roomIds]);

  /** Students of a room allowed to attempt — defaults to every active member. */
  const allowedStudentsOf = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return [] as string[];
    const selected = selections[roomId];
    if (!selected) return room.students.filter((s) => s.active).map((s) => s.rollNumber);
    return room.students.filter((s) => s.active && selected.includes(s.rollNumber)).map((s) => s.rollNumber);
  };

  const toggleStudent = (roomId: string, rollNumber: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    // Build from the full member list so unchecking one student keeps others.
    const base = selections[roomId]
      ? new Set(selections[roomId])
      : new Set(room.students.filter((s) => s.active).map((s) => s.rollNumber));
    if (base.has(rollNumber)) base.delete(rollNumber);
    else base.add(rollNumber);
    updateAudience({ roomStudentSelections: { ...selections, [roomId]: [...base] } });
  };

  const setAllStudents = (roomId: string, allow: boolean) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    updateAudience({
      roomStudentSelections: {
        ...selections,
        [roomId]: allow ? room.students.filter((s) => s.active).map((s) => s.rollNumber) : [],
      },
    });
  };

  const regenerateCode = () =>
    updateAudience({ accessCode: generateQuizCode() });
  const copyCode = () => {
    navigator.clipboard.writeText(a.accessCode);
    toast.success({ title: "Code copied", description: a.accessCode });
  };

  const removeRoom = (roomId: string) =>
    updateAudience({ roomIds: a.roomIds.filter((id) => id !== roomId) });

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Audience & Access</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Control who can register and attempt your quiz.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {MODE_OPTIONS.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
              a.mode === m.id
                ? "border-indigo-500/40 bg-indigo-500/[0.06] dark:border-pink-400/70 dark:bg-pink-500/10"
                : "border-border hover:border-border-hover dark:hover:border-white/25"
            )}
          >
            <input
              type="radio"
              name="accessMode"
              className="sr-only"
              checked={a.mode === m.id}
              onChange={() => updateAudience({ mode: m.id })}
            />
            <span className="text-sm font-bold text-text-primary">{m.label}</span>
            <span className="text-xs text-text-secondary">{m.desc}</span>
          </label>
        ))}
      </div>

      {(a.mode === "classroom" || a.mode === "private") && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Access Code
          </h3>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-mono tracking-widest text-text-primary">
              {a.accessCode || "——"}
            </div>
            <button
              type="button"
              onClick={regenerateCode}
              className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"
              title="Regenerate code"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"
              title="Copy code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {a.mode === "classroom" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Rooms
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Students in the selected rooms can register and attempt this quiz.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectRoomsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover"
              >
                <Users className="h-3.5 w-3.5" /> Select Rooms
              </button>
            </div>
          </div>

          {selectedRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Users className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-2 text-xs text-text-secondary">
                No rooms selected yet. Pick rooms or create a new one to restrict
                this quiz to their members.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-pink-500/10 rounded-lg border border-pink-500/20 bg-pink-500/[0.04] dark:divide-pink-400/15 dark:border-pink-400/40 dark:bg-pink-500/10">
              {selectedRooms.map((room) => {
                const allowed = new Set(allowedStudentsOf(room.id));
                const activeStudents = room.students.filter((s) => s.active);
                return (
                  <li key={room.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      title="Remove room"
                      className="shrink-0 rounded-md p-1 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{room.name}</p>
                      {room.description && (
                        <p className="truncate text-xs text-text-secondary">{room.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {allowed.size}/{activeStudents.length} allowed
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {a.mode === "classroom" && selectedRooms.length > 0 && (
        <AllStudentsPanel
          selectedRooms={selectedRooms}
          selections={selections}
          rooms={rooms}
          toggleStudent={toggleStudent}
          updateAudience={updateAudience}
          eligibleCount={eligibleCount}
        />
      )}

      {a.mode === "classroom" && (
        <div className="relative rounded-xl border border-border bg-card p-5 space-y-4 opacity-60 pointer-events-none select-none">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Manually Added Students
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Add students by email — they can attempt this quiz without being in
                any room.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Coming Soon
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Sample CSV
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              disabled
              placeholder="student@example.com"
              className="h-9 flex-1 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none"
            />
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary"
            >
              <Plus className="h-3.5 w-3.5" /> Add Student
            </button>
          </div>
        </div>
      )}

      <SelectRoomsModal
        open={selectRoomsOpen}
        onClose={() => setSelectRoomsOpen(false)}
        selectedRoomIds={roomIds}
        onApply={(ids) => {
          updateAudience({ roomIds: ids });
          setSelectRoomsOpen(false);
        }}
        onCreateRoom={() => setCreateRoomOpen(true)}
      />
      <CreateRoomModal
        open={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onCreated={(roomId) => {
          updateAudience({ roomIds: [...roomIds, roomId] });
          setCreateRoomOpen(false);
          toast.success({ title: "Room created and added to audience" });
        }}
      />
    </div>
  );
}

/* ─── Unified Student Panel ─────────────────────────────────────────────── */

interface AllStudentsPanelProps {
  selectedRooms: Array<{ id: string; name: string; students: Array<{ id: string; name: string; rollNumber: string; email?: string; username?: string; active: boolean }> }>;
  selections: Record<string, string[]>;
  rooms: Array<{ id: string; students: Array<{ id: string; name: string; rollNumber: string; email?: string; username?: string; active: boolean }> }>;
  toggleStudent: (roomId: string, rollNumber: string) => void;
  updateAudience: (patch: Record<string, unknown>) => void;
  eligibleCount: number;
}

function AllStudentsPanel({
  selectedRooms,
  selections,
  rooms,
  toggleStudent,
  updateAudience,
  eligibleCount,
}: AllStudentsPanelProps) {
  const [query, setQuery] = useState("");

  /** Unique students across all selected rooms, with room membership info. */
  const allStudents = useMemo(() => {
    const seen = new Map<
      string,
      {
        rollNumber: string;
        name: string;
        username?: string;
        email?: string;
        roomIds: string[];
        roomNames: string[];
        isAllowed: boolean;
      }
    >();
    for (const room of selectedRooms) {
      const roomSelections = selections[room.id];
      for (const student of room.students) {
        if (!student.active) continue;
        const key = student.rollNumber.toLowerCase();
        const existing = seen.get(key);
        const allowed = roomSelections
          ? roomSelections.includes(student.rollNumber)
          : true;
        if (existing) {
          existing.roomIds.push(room.id);
          existing.roomNames.push(room.name);
          existing.isAllowed = existing.isAllowed || allowed;
        } else {
          seen.set(key, {
            rollNumber: student.rollNumber,
            name: student.name,
            username: student.username ?? (student as unknown as { email?: string }).email?.split("@")[0],
            email: (student as unknown as { email?: string }).email,
            roomIds: [room.id],
            roomNames: [room.name],
            isAllowed: allowed,
          });
        }
      }
    }
    return [...seen.values()];
  }, [selectedRooms, selections]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allStudents;
    const q = query.trim().toLowerCase();
    return allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.username ?? "").toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
    );
  }, [allStudents, query]);

  const allAllowed = allStudents.length > 0 && allStudents.every((s) => s.isAllowed);
  const noneAllowed = allStudents.every((s) => !s.isAllowed);
  const selectedCount = allStudents.filter((s) => s.isAllowed).length;

  const toggleAll = (allow: boolean) => {
    const next: Record<string, string[]> = { ...selections };
    for (const room of selectedRooms) {
      next[room.id] = allow
        ? room.students.filter((s) => s.active).map((s) => s.rollNumber)
        : [];
    }
    updateAudience({ roomStudentSelections: next });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            All Students
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{allStudents.length}</span> unique{" "}
            {allStudents.length === 1 ? "student" : "students"} across selected rooms.
            {" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCount}</span> allowed to attempt.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            disabled={allAllowed}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            disabled={noneAllowed}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary disabled:opacity-40"
          >
            Unselect all
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username, roll number, or email…"
          className="h-9 w-full rounded-lg border border-input-border bg-input-bg pl-8 pr-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {allStudents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Users className="mx-auto h-6 w-6 text-text-muted" />
          <p className="mt-2 text-xs text-text-secondary">
            No students found in the selected rooms.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-3 text-center text-xs text-text-muted">
          No students match &ldquo;{query}&rdquo;
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-border rounded-lg border border-border">
          {filtered.map((student) => {
            const key = student.rollNumber.toLowerCase();
            return (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 transition-colors duration-150",
                  student.isAllowed
                    ? "bg-emerald-500/[0.04]"
                    : "bg-red-500/[0.06]"
                )}
              >
                <input
                  type="checkbox"
                  checked={student.isAllowed}
                  onChange={() => {
                    const next: Record<string, string[]> = { ...selections };
                    for (const rid of student.roomIds) {
                      const room = rooms.find((r) => r.id === rid);
                      if (!room) continue;
                      const base = next[rid]
                        ? new Set(next[rid])
                        : new Set(room.students.filter((s) => s.active).map((s) => s.rollNumber));
                      if (base.has(student.rollNumber)) base.delete(student.rollNumber);
                      else base.add(student.rollNumber);
                      next[rid] = [...base];
                    }
                    updateAudience({ roomStudentSelections: next });
                  }}
                  className="h-3.5 w-3.5 rounded accent-indigo-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text-primary">
                    @{student.username ?? student.email?.split("@")[0] ?? student.name}
                  </p>
                  <p className="truncate text-[10px] text-text-muted">
                    {student.username ? `@${student.username}` : student.email ?? ""} &middot; {student.rollNumber}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {student.roomNames.map((rn) => (
                    <span
                      key={rn}
                      className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600 dark:text-indigo-400"
                    >
                      {rn}
                    </span>
                  ))}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                    student.isAllowed
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-card-hover text-text-muted"
                  )}
                >
                  {student.isAllowed ? "Can attempt" : "Removed"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
