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
  Check,
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
import { StudioStepHeader, StudioStepLayout } from "../primitives";

const MODE_OPTIONS: Array<{ id: "public" | "private" | "classroom"; label: string }> = [
  { id: "public", label: "Public" },
  { id: "private", label: "Private" },
  { id: "classroom", label: "Rooms" },
];

export function AudienceStep() {
  const { state, updateAudience, saveAudienceParticipants, audienceDirty } = useStudio();
  const a = state.audience;

  const rooms = useRoomStore((s) => s.rooms);
  const setRooms = useRoomStore((s) => s.setRooms);
  const [selectRoomsOpen, setSelectRoomsOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [roomListLoading, setRoomListLoading] = useState(a.mode === "classroom");
  const [restoringAudience, setRestoringAudience] = useState(
    a.mode === "classroom" && (a.roomIds?.length ?? 0) === 0 && Boolean(state.serverQuizId)
  );
  const [roomLoadsInFlight, setRoomLoadsInFlight] = useState(0);

  const roomIds = useMemo(() => a.roomIds ?? [], [a.roomIds]);
  const selections = a.roomStudentSelections ?? {};
  const selectedRooms = useMemo(
    () => rooms.filter((r) => roomIds.includes(r.id) && !r.archived),
    [rooms, roomIds]
  );

  useEffect(() => {
    if (a.mode !== "classroom") return;
    let cancelled = false;
    fetchMyRooms()
      .then((freshRooms) => {
        if (!cancelled) setRooms(freshRooms);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRoomListLoading(false);
      });
    return () => { cancelled = true; };
  }, [a.mode, setRooms]);

  useEffect(() => {
    if (a.mode !== "classroom") return;
    if (roomIds.length > 0) return;
    if (!state.serverQuizId) return;

    let cancelled = false;

    (async () => {
      try {
        const participants = await getQuizParticipants(state.serverQuizId!);
        if (cancelled) return;

        const roomParticipants = participants?.filter((p) => p.source === 4) ?? [];
        if (roomParticipants.length === 0) return;

        const userIdSet = new Set(roomParticipants.map((p) => String(p.user_id)));
        const usernameSet = new Set(
          roomParticipants.filter((p) => p.username).map((p) => p.username!.toLowerCase())
        );

        const allRooms = await fetchMyRooms();
        if (cancelled) return;
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

            if (matchingStudents.length > 0) {
              matchedRoomIds.push(room.id);
              matchedSelections[room.id] = matchingStudents.map((s) => s.rollNumber);
            }
          } catch (e) {
          }
        }

        if (!cancelled && matchedRoomIds.length > 0) {
          updateAudience({
            roomIds: matchedRoomIds,
            roomStudentSelections: matchedSelections,
          });
        } else if (!cancelled) {
        }
      } catch (e) {
      } finally {
        if (!cancelled) setRestoringAudience(false);
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
      setRoomLoadsInFlight((count) => count + 1);
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
            // The panel still becomes usable when one room fails; reopening
            // the step can retry that room.
          })
          .finally(() => {
            fetchingRef.current.delete(rid);
            setRoomLoadsInFlight((count) => Math.max(0, count - 1));
          });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomIdsKey, rooms, setRooms]);
  const eligibleCount = useMemo(() => getEligibleCount(rooms, roomIds), [rooms, roomIds]);
  const selectedRoomsNeedMembers = roomIds.some((roomId) => {
    const room = rooms.find((candidate) => candidate.id === roomId);
    return Boolean(room && (room.memberCount ?? 0) > 0 && room.students.length === 0);
  });
  const audienceLoading = a.mode === "classroom" &&
    (roomListLoading || restoringAudience || roomLoadsInFlight > 0 || selectedRoomsNeedMembers);

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
    <StudioStepLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-w-0"
      >
        <StudioStepHeader title="Audience & Access" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3"
      >
        {MODE_OPTIONS.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex min-h-16 cursor-pointer flex-col justify-center gap-1 rounded-[16px] border-2 bg-[var(--qs-surface)] p-3 text-left transition-colors sm:p-4",
              m.id === "classroom" && "col-span-2 sm:col-span-1",
              a.mode === m.id
                ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]"
            )}
          >
            <input
              type="radio"
              name="accessMode"
              className="sr-only"
              checked={a.mode === m.id}
              onChange={() => {
                if (m.id === "classroom") {
                  setRoomListLoading(true);
                  setRestoringAudience(roomIds.length === 0 && Boolean(state.serverQuizId));
                }
                updateAudience({ mode: m.id });
              }}
            />
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-black text-[var(--qs-ink)]">{m.label}</span>
              {a.mode === m.id && (
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                </span>
              )}
            </span>
          </label>
        ))}
      </motion.div>

      {audienceLoading && <AudienceLoadingSkeleton />}

      {a.mode === "classroom" && !audienceLoading && (
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="break-words text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
                Rooms
              </h3>
              <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                Students in the selected rooms can register and attempt this quiz.
              </p>
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <button
                type="button"
                onClick={() => setSelectRoomsOpen(true)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 sm:py-1.5 text-xs font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)]"
              >
                <Users className="h-3.5 w-3.5" /> Select Rooms
              </button>
            </div>
          </div>

          {selectedRooms.length === 0 ? (
            <div className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] p-6 text-center">
              <Users className="mx-auto h-6 w-6 text-[var(--qs-muted)]" />
              <p className="mt-2 break-words text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                No rooms selected yet. Pick rooms or create a new one to restrict
                this quiz to their members.
              </p>
            </div>
          ) : (
            <ul className="divide-y-2 divide-[var(--qs-line)] overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)]">
              {selectedRooms.map((room) => {
                const allowed = new Set(allowedStudentsOf(room.id));
                const activeStudents = room.students.filter((s) => s.active);
                return (
                  <li key={room.id} className="flex min-w-0 items-center gap-2 sm:gap-3 px-3 sm:px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => removeRoom(room.id)}
                      title="Remove room"
                      className="shrink-0 rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1 text-[var(--qs-muted)] transition-colors duration-150 hover:border-[var(--qs-bad)] hover:text-[var(--qs-bad)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--qs-ink)]">{room.name}</p>
                      {room.description && (
                        <p className="truncate text-xs font-medium text-[var(--qs-muted)]">{room.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs font-bold text-[var(--qs-muted)]">
                      {allowed.size}/{activeStudents.length} allowed
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {a.mode === "classroom" && !audienceLoading && selectedRooms.length > 0 && (
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

      {a.mode === "classroom" && !audienceLoading && (
        <div className="relative w-full min-w-0 max-w-full overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 sm:p-5 space-y-3 sm:space-y-4 opacity-60 pointer-events-none select-none">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
                Manually Added Students
              </h3>
              <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                Add students by email — they can attempt this quiz without being in
                any room.
              </p>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-full border-2 border-[#a85d00]/30 bg-[#fff3d6] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#a85d00]">
              Coming Soon
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2 sm:py-1.5 text-xs font-bold text-[var(--qs-muted)]"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Sample CSV
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2 sm:py-1.5 text-xs font-bold text-[var(--qs-muted)]">
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              disabled
              placeholder="student@example.com"
              className="h-11 sm:h-9 flex-1 min-w-0 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] outline-none"
            />
            <button
              type="button"
              disabled
              className="inline-flex h-11 sm:h-auto w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2 text-xs font-bold text-[var(--qs-muted)]"
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
    </StudioStepLayout>
  );
}

function AudienceLoadingSkeleton() {
  return (
    <div className="w-full space-y-4" aria-label="Loading rooms and students" aria-busy="true">
      <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5">
        <div className="app-skeleton h-3 w-16 rounded" />
        <div className="app-skeleton mt-2 h-3 w-3/4 rounded" />
        <div className="app-skeleton mt-4 h-10 w-full rounded-lg" />
        <div className="mt-3 space-y-2 rounded-lg border-2 border-[var(--qs-line)] p-3">
          <div className="app-skeleton h-10 rounded" />
          <div className="app-skeleton h-10 rounded" />
        </div>
      </div>

      <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="app-skeleton h-3 w-24 rounded" />
            <div className="app-skeleton h-3 w-48 rounded" />
          </div>
          <div className="app-skeleton h-8 w-28 rounded-lg" />
        </div>
        <div className="app-skeleton mt-4 h-10 rounded-xl" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="app-skeleton h-12 rounded-xl" />
          ))}
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
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3 sm:p-5 space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
            All Students
          </h3>
          <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            <span className="font-black text-[var(--qs-ink)]">{allStudents.length}</span> unique{" "}
            {allStudents.length === 1 ? "student" : "students"} across selected rooms.
            {" "}
            <span className="font-black text-[var(--qs-ok)]">{selectedCount}</span> allowed.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:gap-2">
          <button
            type="button"
            onClick={() => toggleAll(true)}
            disabled={allAllowed}
            className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-2 sm:px-2.5 sm:py-1 text-xs font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)] disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => toggleAll(false)}
            disabled={noneAllowed}
            className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-2 sm:px-2.5 sm:py-1 text-xs font-bold text-[var(--qs-ink)] transition-colors duration-150 hover:border-[var(--qs-brand)] disabled:opacity-40"
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
            className="rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2 py-2 sm:px-2.5 sm:py-1 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="relative w-full min-w-0">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--qs-muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, username, or roll number…"
          className="h-11 sm:h-9 w-full min-w-0 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-8 pr-8 text-sm sm:text-xs font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] outline-none transition-colors focus:border-[var(--qs-brand)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[8px] p-1 text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
          >
            <X className="h-4 w-4 sm:h-3 sm:w-3" />
          </button>
        )}
      </div>

      {allStudents.length === 0 ? (
        <div className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] p-6 text-center">
          <Users className="mx-auto h-6 w-6 text-[var(--qs-muted)]" />
          <p className="mt-2 break-words text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            No students found in the selected rooms.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-3 text-center break-words text-xs font-medium text-[var(--qs-muted)]">
          No students match &ldquo;{query}&rdquo;
        </p>
      ) : (
        <ul className="max-h-[55vh] sm:max-h-80 overflow-y-auto divide-y-2 divide-[var(--qs-line)] overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          {filtered.map((student) => {
            const key = student.rollNumber.toLowerCase();
            return (
              <li
                key={key}
                className={cn(
                  "flex min-w-0 items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 sm:py-2 transition-colors duration-150",
                  student.isAllowed
                    ? "bg-[var(--qs-okbg)]/60"
                    : "bg-[var(--qs-badbg)]/50"
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
                  className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0 rounded accent-[var(--qs-brand)]"
                />
                <img
                  src={student.avatarUrl || getAvatarUrlById(student.avatarId)}
                  alt=""
                  className="h-8 w-8 sm:h-7 sm:w-7 shrink-0 rounded-full object-cover ring-2 ring-[var(--qs-line)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[var(--qs-ink)]">
                    @{student.username ?? student.name}
                  </p>
                  <p className="truncate text-[11px] sm:text-[10px] font-medium text-[var(--qs-muted)]">
                    {student.rollNumber}
                  </p>
                </div>
                <div className="hidden sm:flex shrink-0 flex-wrap gap-1 max-w-[90px] justify-end">
                  {student.roomNames.slice(0,2).map((rn) => (
                    <span
                      key={rn}
                      className="truncate max-w-[80px] rounded-[6px] border-2 border-[var(--qs-brand)]/20 bg-[var(--qs-poly-1)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--qs-brand)]"
                    >
                      {rn}
                    </span>
                  ))}
                </div>
                <span
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border-2 px-2 sm:px-1.5 py-1 sm:py-0.5 text-[10px] font-extrabold",
                    student.isAllowed
                      ? "border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
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
