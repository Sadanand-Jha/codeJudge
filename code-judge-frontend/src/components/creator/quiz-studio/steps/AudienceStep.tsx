"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Upload,
  ClipboardList,
  Plus,
  Search,
  X,
  BookOpen,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getAvatarUrlById } from "@/config/dicebear";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";
import { useRoomStore, getEligibleCount } from "@/store/roomStore";
import SelectRoomsModal from "@/components/quiz/creator/settings/audience/SelectRoomsModal";
import CreateRoomModal from "@/components/quiz/creator/settings/audience/CreateRoomModal";
import { fetchMyRooms, getRoom } from "@/services/rooms";
import { getQuizParticipants } from "@/services/quiz";

const MODE_OPTIONS: Array<{ id: "public" | "private" | "classroom"; label: string; desc: string }> = [
  { id: "public", label: "Public", desc: "Anyone can discover and attempt the quiz." },
  { id: "private", label: "Private", desc: "Only people with the link can attempt." },
  { id: "classroom", label: "Rooms", desc: "Restricted to students in your selected rooms." },
];

export function AudienceStep() {
  const { state, updateAudience, saveAudienceParticipants, audienceDirty } = useStudio();
  const a = state.audience;

  const rooms = useRoomStore((s) => s.rooms);
  const setRooms = useRoomStore((s) => s.setRooms);
  const [selectRoomsOpen, setSelectRoomsOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  const roomIds = a.roomIds ?? [];
  const selections = a.roomStudentSelections ?? {};
  const selectedRooms = useMemo(
    () => rooms.filter((r) => roomIds.includes(r.id) && !r.archived),
    [rooms, roomIds]
  );

  useEffect(() => {
    if (a.mode !== "classroom") return;
    if (roomIds.length > 0) return;
    if (!state.serverQuizId) return;

    let cancelled = false;

    (async () => {
      try {
        const participants = await getQuizParticipants(state.serverQuizId!);
        if (cancelled) return;
        console.log("[AudienceStep] participants:", participants);

        const roomParticipants = participants?.filter((p) => p.source === 4) ?? [];
        console.log("[AudienceStep] roomParticipants:", roomParticipants.length, roomParticipants);
        if (roomParticipants.length === 0) return;

        const userIdSet = new Set(roomParticipants.map((p) => String(p.user_id)));
        const usernameSet = new Set(
          roomParticipants.filter((p) => p.username).map((p) => p.username!.toLowerCase())
        );
        console.log("[AudienceStep] userIdSet:", [...userIdSet], "usernameSet:", [...usernameSet]);

        const allRooms = await fetchMyRooms();
        if (cancelled) return;
        console.log("[AudienceStep] allRooms:", allRooms.length, allRooms);
        useRoomStore.getState().setRooms(allRooms);

        const matchedRoomIds: string[] = [];
        const matchedSelections: Record<string, string[]> = {};

        for (const room of allRooms) {
          if (cancelled) break;
          if (room.archived) continue;

          try {
            const res: unknown = await getRoom(room.id);
            const payload = (res as Record<string, unknown>) ?? {};
            const members = (payload.members ?? []) as Array<Record<string, unknown>>;
            const mapped = members.map((mm) => {
              const u = (mm.user as Record<string, unknown>) ?? mm;
              const username = String((u.username as string) ?? "");
              return {
                id: String(u.id ?? mm.userId ?? Math.random()),
                name: String((u.displayName as string) ?? username),
                rollNumber: username,
                username: username.toLowerCase(),
                active: (mm.statusName as string) === "ACTIVE" || mm.status === 1,
                avatarId: Number(u.avatarId ?? 1),
                avatarUrl: (u.avatarUrl as string) ?? null,
              };
            });

            const current = useRoomStore.getState().rooms;
            const updated = current.map((r) =>
              String(r.id) === String(room.id) ? { ...r, students: mapped as never } : r
            );
            useRoomStore.getState().setRooms(updated as never);

            const matchingStudents = mapped.filter(
              (s) =>
                userIdSet.has(String(s.id)) ||
                (s.username && usernameSet.has(s.username.toLowerCase())) ||
                (s.rollNumber && usernameSet.has(s.rollNumber.toLowerCase()))
            );
            console.log(`[AudienceStep] room "${room.name}" members:`, mapped.map(s => ({ id: s.id, username: s.username })), "matched:", matchingStudents.length);

            if (matchingStudents.length > 0) {
              matchedRoomIds.push(room.id);
              matchedSelections[room.id] = matchingStudents.map((s) => s.rollNumber);
            }
          } catch (e) {
            console.error(`[AudienceStep] Failed to fetch room ${room.id}:`, e);
          }
        }

        if (!cancelled && matchedRoomIds.length > 0) {
          console.log("[AudienceStep] updating audience with matched rooms:", matchedRoomIds, matchedSelections);
          updateAudience({
            roomIds: matchedRoomIds,
            roomStudentSelections: matchedSelections,
          });
        } else if (!cancelled) {
          console.log("[AudienceStep] no rooms matched");
        }
      } catch (e) {
        console.error("[AudienceStep] Failed to resolve rooms:", e);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.mode, roomIds.length, state.serverQuizId]);

  const fetchingRef = useRef(new Set<string>());

  const selectedRoomIdsKey = roomIds.join(",");

  useEffect(() => {
    if (!selectedRoomIdsKey) return;
    const ids = selectedRoomIdsKey.split(",").filter(Boolean);
    for (const rid of ids) {
      const room = rooms.find((r) => r.id === rid);
      if (!room) continue;
      if (room.students.length > 0) continue;
      if ((room.memberCount ?? 0) <= 0) continue;
      if (fetchingRef.current.has(rid)) continue;
      fetchingRef.current.add(rid);
      import("@/services/rooms").then(({ getRoom }) => {
        getRoom(rid)
          .then((res: unknown) => {
            const payload = (res as Record<string, unknown>) ?? {};
            const members = (payload.members ?? []) as Array<Record<string, unknown>>;
            const mapped = members.map((mm) => {
              const u = (mm.user as Record<string, unknown>) ?? mm;
              const username = String((u.username as string) ?? "");
              return {
                id: String(u.id ?? mm.userId ?? Math.random()),
                name: String((u.displayName as string) ?? username),
                rollNumber: username,
                username: username.toLowerCase(),
                active: (mm.statusName as string) === "ACTIVE" || mm.status === 1,
                avatarId: Number(u.avatarId ?? 1),
                avatarUrl: (u.avatarUrl as string) ?? null,
              };
            });
            const current = useRoomStore.getState().rooms;
            const updated = current.map((r) =>
              String(r.id) === String(rid)
                ? { ...r, students: mapped as unknown as typeof r.students }
                : r
            );
            setRooms(updated as never);
          })
          .catch(() => {
            fetchingRef.current.delete(rid);
          });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomIdsKey, rooms, setRooms]);
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

  const removeRoom = (roomId: string) =>
    updateAudience({ roomIds: a.roomIds.filter((id) => id !== roomId) });

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col overflow-x-hidden bg-background sm:bg-background bg-zinc-50 lg:bg-background">
    <div className="w-full max-w-full min-w-0">
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-4 sm:space-y-8 px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-w-0"
      >
        <h2 className="break-words text-base sm:text-lg font-semibold text-text-primary">Audience & Access</h2>
        <p className="mt-1 break-words text-xs text-text-secondary">
          Control who can register and attempt your quiz.
        </p>
      </motion.div>

      {/* Access modes tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-200 sm:border-border bg-white sm:bg-card p-3 sm:p-5"
      >
        <div className="flex min-w-0 items-center gap-2 mb-3">
          <Users className="h-4 w-4 shrink-0 text-pink-500" />
          <h4 className="min-w-0 break-words text-xs font-semibold uppercase tracking-wider text-text-secondary">
            How audience &amp; access works
          </h4>
        </div>
        <p className="break-words text-xs text-text-secondary leading-relaxed mb-4">
          Choose who can discover, register, and attempt your quiz. Each mode
          offers a different level of visibility and restriction.
        </p>
        <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <AccessTip
            icon={<Users className="h-3.5 w-3.5" />}
            label="Public"
            description="Anyone on the platform can find and attempt the quiz. Best for open contests, practice sets, and widespread assessments."
          />
          <AccessTip
            icon={<Shield className="h-3.5 w-3.5" />}
            label="Private"
            description="Only people with the link or access code can attempt. Ideal for invite-only tests, interviews, and internal evaluations."
          />
          <AccessTip
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Rooms"
            description="Restricted to students in your selected rooms. Perfect for classroom quizzes, section-wise exams, and batch assessments."
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="grid w-full min-w-0 gap-3 sm:grid-cols-3"
      >
        {MODE_OPTIONS.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
              a.mode === m.id
                ? "border-pink-500/40 bg-pink-500/[0.06] dark:border-pink-400/70 dark:bg-pink-500/10"
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
      </motion.div>

      {a.mode === "classroom" && (
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-200 sm:border-border bg-white sm:bg-card p-3 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Rooms
              </h3>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-text-secondary">
                Students in the selected rooms can register and attempt this quiz.
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <button
                type="button"
                onClick={() => setSelectRoomsOpen(true)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-zinc-200 sm:border-border bg-white sm:bg-card px-3 py-2.5 sm:py-1.5 text-xs font-semibold sm:font-medium text-zinc-900 sm:text-text-primary transition-colors duration-150 hover:bg-zinc-50 sm:hover:bg-card-hover"
              >
                <Users className="h-3.5 w-3.5" /> Select Rooms
              </button>
            </div>
          </div>

          {selectedRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 sm:border-border p-6 text-center">
              <Users className="mx-auto h-6 w-6 text-zinc-400 sm:text-text-muted" />
              <p className="mt-2 break-words text-xs leading-relaxed text-zinc-600 sm:text-text-secondary">
                No rooms selected yet. Pick rooms or create a new one to restrict
                this quiz to their members.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-pink-500/10 rounded-lg border border-pink-500/20 bg-pink-500/[0.04] dark:divide-pink-400/15 dark:border-pink-400/40 dark:bg-pink-500/10 overflow-hidden">
              {selectedRooms.map((room) => {
                const allowed = new Set(allowedStudentsOf(room.id));
                const activeStudents = room.students.filter((s) => s.active);
                return (
                  <li key={room.id} className="flex min-w-0 items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      title="Remove room"
                      className="shrink-0 rounded-md p-1 text-zinc-500 sm:text-text-secondary transition-colors duration-150 hover:bg-zinc-100 sm:hover:bg-card-hover hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 sm:text-text-primary">{room.name}</p>
                      {room.description && (
                        <p className="truncate text-xs text-zinc-600 sm:text-text-secondary">{room.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs font-medium text-zinc-600 sm:text-text-secondary">
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
          onSave={saveAudienceParticipants}
          dirty={audienceDirty}
        />
      )}

      {a.mode === "classroom" && (
        <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-200 sm:border-border bg-white sm:bg-card p-3 sm:p-5 space-y-3 sm:space-y-4 opacity-60 pointer-events-none select-none">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Manually Added Students
              </h3>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-text-secondary">
                Add students by email — they can attempt this quiz without being in
                any room.
              </p>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Coming Soon
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 sm:border-border px-3 py-2 sm:py-1.5 text-xs font-semibold text-text-secondary"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Sample CSV
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 sm:border-border px-3 py-2 sm:py-1.5 text-xs font-semibold text-text-secondary">
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              disabled
              placeholder="student@example.com"
              className="h-11 sm:h-9 flex-1 min-w-0 rounded-lg border border-zinc-200 sm:border-input-border bg-zinc-50 sm:bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none"
            />
            <button
              type="button"
              disabled
              className="inline-flex h-11 sm:h-auto w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 sm:border-border bg-white sm:bg-card px-3.5 py-2 text-xs font-semibold text-text-secondary"
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
    </div>
    </div>
  );
}

/* ─── Unified Student Panel ─────────────────────────────────────────────── */

interface AllStudentsPanelProps {
  selectedRooms: Array<{ id: string; name: string; students: Array<{ id: string; name: string; rollNumber: string; username?: string; active: boolean; avatarId?: number; avatarUrl?: string | null }> }>;
  selections: Record<string, string[]>;
  rooms: Array<{ id: string; students: Array<{ id: string; name: string; rollNumber: string; username?: string; active: boolean; avatarId?: number; avatarUrl?: string | null }> }>;
  toggleStudent: (roomId: string, rollNumber: string) => void;
  updateAudience: (patch: Record<string, unknown>) => void;
  eligibleCount: number;
  onSave: () => Promise<void>;
  dirty: boolean;
}

function AllStudentsPanel({
  selectedRooms,
  selections,
  rooms,
  toggleStudent,
  updateAudience,
  eligibleCount,
  onSave,
  dirty,
}: AllStudentsPanelProps) {
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  /** Unique students across all selected rooms, with room membership info. */
  const allStudents = useMemo(() => {
    const seen = new Map<
      string,
      {
        rollNumber: string;
        name: string;
        username?: string;
        avatarId: number;
        avatarUrl?: string | null;
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
            username: student.username,
            avatarId: student.avatarId ?? 1,
            avatarUrl: student.avatarUrl,
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
        s.rollNumber.toLowerCase().includes(q)
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
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-zinc-200 sm:border-border bg-white sm:bg-card p-3 sm:p-5 space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-xs font-semibold uppercase tracking-wider text-zinc-600 sm:text-text-secondary">
            All Students
          </h3>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-600 sm:text-text-secondary">
            <span className="font-semibold text-zinc-900 sm:text-text-primary">{allStudents.length}</span> unique{" "}
            {allStudents.length === 1 ? "student" : "students"} across selected rooms.
            {" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedCount}</span> allowed.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:gap-2">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            disabled={allAllowed}
            className="rounded-lg sm:rounded-md border border-zinc-200 sm:border-border bg-white sm:bg-card px-2 py-2 sm:px-2.5 sm:py-1 text-xs sm:text-[11px] font-semibold sm:font-medium text-zinc-700 sm:text-text-secondary transition-colors duration-150 hover:bg-zinc-50 sm:hover:bg-card-hover hover:text-zinc-900 sm:hover:text-text-primary disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            disabled={noneAllowed}
            className="rounded-lg sm:rounded-md border border-zinc-200 sm:border-border bg-white sm:bg-card px-2 py-2 sm:px-2.5 sm:py-1 text-xs sm:text-[11px] font-semibold sm:font-medium text-zinc-700 sm:text-text-secondary transition-colors duration-150 hover:bg-zinc-50 sm:hover:bg-card-hover hover:text-zinc-900 sm:hover:text-text-primary disabled:opacity-40"
          >
            Unselect
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave();
                toast.success({ title: "Audience saved", description: `${selectedCount} student${selectedCount !== 1 ? "s" : ""} allowed to attempt.` });
              } catch (e) {
                toast.error({ title: "Failed to save audience" });
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg sm:rounded-md bg-[#E91E63] sm:bg-pink-500 px-2 py-2 sm:px-2.5 sm:py-1 text-xs sm:text-[11px] font-bold sm:font-medium text-white transition-colors duration-150 hover:bg-[#D81B60] sm:hover:bg-pink-600 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="relative w-full min-w-0">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 sm:text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username, or roll number…"
          className="h-11 sm:h-9 w-full min-w-0 rounded-xl sm:rounded-lg border border-zinc-200 sm:border-input-border bg-zinc-50 sm:bg-input-bg pl-8 pr-8 sm:pr-3 text-sm sm:text-xs text-zinc-900 sm:text-text-primary placeholder-zinc-400 sm:placeholder-text-muted outline-none focus:border-pink-300 sm:focus:border-pink-500/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 sm:right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 sm:text-text-muted hover:text-zinc-700 sm:hover:text-text-primary"
          >
            <X className="h-4 w-4 sm:h-3 sm:w-3" />
          </button>
        )}
      </div>

      {allStudents.length === 0 ? (
        <div className="rounded-xl sm:rounded-lg border border-dashed border-zinc-200 sm:border-border p-6 text-center">
          <Users className="mx-auto h-6 w-6 text-zinc-400 sm:text-text-muted" />
          <p className="mt-2 break-words text-xs leading-relaxed text-zinc-600 sm:text-text-secondary">
            No students found in the selected rooms.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-3 text-center break-words text-xs text-zinc-500 sm:text-text-muted">
          No students match &ldquo;{query}&rdquo;
        </p>
      ) : (
        <ul className="max-h-[55vh] sm:max-h-80 overflow-y-auto divide-y divide-zinc-200 sm:divide-border rounded-xl sm:rounded-lg border border-zinc-200 sm:border-border overflow-hidden">
          {filtered.map((student) => {
            const key = student.rollNumber.toLowerCase();
            return (
              <li
                key={key}
                className={cn(
                  "flex min-w-0 items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 sm:py-2 transition-colors duration-150",
                  student.isAllowed
                    ? "bg-emerald-50/60 sm:bg-emerald-500/[0.04]"
                    : "bg-red-50/60 sm:bg-red-500/[0.06]"
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
                  className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0 rounded accent-pink-500"
                />
                <img
                  src={student.avatarUrl || getAvatarUrlById(student.avatarId)}
                  alt=""
                  className="h-8 w-8 sm:h-7 sm:w-7 shrink-0 rounded-full object-cover ring-1 ring-zinc-200 sm:ring-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold sm:font-medium text-zinc-900 sm:text-text-primary">
                    @{student.username ?? student.name}
                  </p>
                  <p className="truncate text-[11px] sm:text-[10px] text-zinc-500 sm:text-text-muted">
                    {student.rollNumber}
                  </p>
                </div>
                <div className="hidden sm:flex shrink-0 flex-wrap gap-1 max-w-[90px] justify-end">
                  {student.roomNames.slice(0,2).map((rn) => (
                    <span
                      key={rn}
                      className="truncate max-w-[80px] rounded bg-pink-500/10 px-1.5 py-0.5 text-[9px] font-medium text-pink-600 dark:text-pink-400"
                    >
                      {rn}
                    </span>
                  ))}
                </div>
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full sm:rounded px-2 sm:px-1.5 py-1 sm:py-0.5 text-[10px] font-bold sm:font-medium",
                    student.isAllowed
                      ? "bg-emerald-100 sm:bg-emerald-500/10 text-emerald-700 sm:text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-100 sm:bg-card-hover text-zinc-500 sm:text-text-muted"
                  )}
                >
                  <span className="sm:hidden">{student.isAllowed ? "✓" : "✕"}</span>
                  <span className="hidden sm:inline">{student.isAllowed ? "Can attempt" : "Removed"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AccessTip({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card-hover p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-pink-500">{icon}</span>
        <p className="text-xs font-semibold text-text-primary">{label}</p>
      </div>
      <p className="text-[11px] text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
