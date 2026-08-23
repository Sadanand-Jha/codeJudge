"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Eye,
  Globe,
  Info,
  Plus,
  Settings2,
  Trash2,
  UserCheck,
  UserRound,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { SettingsCard } from "@/components/ui/settings";
import { cn } from "@/lib/helpers";
import {
  DEFAULT_QUIZ_AUDIENCE,
  QuizAudience,
  AudienceStudent,
  AudienceMode,
} from "@/components/quiz/creator/types";
import { Room } from "@/types/room";
import { useQuizSettings } from "./QuizSettingsContext";
import {
  useRoomStore,
  getOwnedRooms,
  getAllStudents,
  countAudience,
  getAudienceSummaryLabel,
} from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrlById } from "@/config/dicebear";
import { saveQuizAudience } from "@/utils/quizStorage";
import SelectRoomsModal from "./audience/SelectRoomsModal";
import SelectStudentsModal from "./audience/SelectStudentsModal";
import CreateRoomModal from "./audience/CreateRoomModal";
import RoomMenu, { RoomMenuItem } from "./audience/RoomMenu";

const MAX_OR_ITEMS = 8;

/**
 * Audience — controls who can register for this quiz.
 *
 * Four modes:
 *   EVERYONE       — anyone with access can register.
 *   ROOMS          — students from the selected rooms (OR logic).
 *   STUDENTS       — the individually selected students only.
 *   ROOMS_STUDENTS — students from selected rooms OR individually selected.
 *
 * Rooms are persistent, admin-owned resources. Individual students are
 * selected per-quiz. The selection here is configuration only — the backend
 * resolves actual membership at registration time.
 */
export default function AudienceSection() {
  const { details, updateDetails, code } = useQuizSettings();
  const rooms = useRoomStore((s) => s.rooms);
  const hydrate = useRoomStore((s) => s.hydrate);
  const { user } = useAuthStore();

  const [selectRoomsOpen, setSelectRoomsOpen] = useState(false);
  const [selectStudentsOpen, setSelectStudentsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const audience: QuizAudience = { ...DEFAULT_QUIZ_AUDIENCE, ...(details.audience ?? {}) };

  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);
  const activeRooms = useMemo(() => ownedRooms.filter((r) => !r.archived), [ownedRooms]);
  const selectedRooms = useMemo(
    () => ownedRooms.filter((r) => audience.roomIds.includes(r.id)),
    [ownedRooms, audience.roomIds]
  );
  const unavailableCount = useMemo(
    () => audience.roomIds.filter((id) => !ownedRooms.some((r) => r.id === id)).length,
    [ownedRooms, audience.roomIds]
  );
  const directory = useMemo(() => getAllStudents(activeRooms), [activeRooms]);

  const stats = useMemo(
    () => countAudience(ownedRooms, audience.roomIds, audience.students ?? []),
    [ownedRooms, audience.roomIds, audience.students]
  );
  const summaryLabel = getAudienceSummaryLabel(audience);

  const setAudience = (patch: Partial<QuizAudience>) => {
    const next = { ...audience, ...patch };
    const counted = countAudience(ownedRooms, next.roomIds, next.students ?? []);
    const merged: QuizAudience = { ...next, eligibleCount: counted.unique };
    updateDetails({ audience: merged });
    saveQuizAudience(code, merged);
  };

  const setMode = (mode: AudienceMode) => setAudience({ mode });

  const applyRooms = (roomIds: string[]) => {
    const names = ownedRooms.filter((r) => roomIds.includes(r.id)).map((r) => r.name);
    const mode: AudienceMode =
      audience.mode === "STUDENTS"
        ? "ROOMS_STUDENTS"
        : audience.mode === "EVERYONE"
        ? "ROOMS"
        : audience.mode;
    setAudience({ mode, roomIds, roomNames: names });
  };

  const applyStudents = (students: AudienceStudent[]) => {
    const mode: AudienceMode =
      audience.mode === "ROOMS"
        ? "ROOMS_STUDENTS"
        : audience.mode === "EVERYONE"
        ? "STUDENTS"
        : audience.mode;
    setAudience({ mode, students });
  };

  const removeRoom = (roomId: string) => applyRooms(audience.roomIds.filter((id) => id !== roomId));

  const removeStudent = (roll: string) =>
    applyStudents(audience.students.filter((s) => s.rollNumber.toLowerCase() !== roll.toLowerCase()));

  const handleCreated = (roomId: string) => {
    const roomIds = audience.roomIds.includes(roomId)
      ? audience.roomIds
      : [...audience.roomIds, roomId];
    applyRooms(roomIds);
  };

  const roomMenuItems = (roomId: string): RoomMenuItem[] => [
    {
      id: "view",
      label: "View Students",
      icon: Eye,
      onClick: () => {
        window.location.href = `/rooms/${roomId}`;
      },
    },
    {
      id: "manage",
      label: "Manage Room",
      icon: Settings2,
      onClick: () => {
        window.location.href = `/rooms/${roomId}`;
      },
    },
    {
      id: "remove",
      label: "Remove from Quiz",
      icon: Trash2,
      destructive: true,
      onClick: () => removeRoom(roomId),
    },
  ];

  const showRooms = audience.mode === "ROOMS" || audience.mode === "ROOMS_STUDENTS";
  const showStudents = audience.mode === "STUDENTS" || audience.mode === "ROOMS_STUDENTS";

  const orItems = useMemo(
    () => [
      ...selectedRooms.map((r) => ({
        key: `room_${r.id}`,
        icon: <Users className="h-3.5 w-3.5" />,
        label: r.name,
        meta: `${r.students.length} student${r.students.length !== 1 ? "s" : ""}`,
      })),
      ...audience.students.map((s) => ({
        key: `stu_${s.rollNumber}`,
        icon: <UserRound className="h-3.5 w-3.5" />,
        label: s.name,
        meta: s.rollNumber,
      })),
    ],
    [selectedRooms, audience.students]
  );
  const orVisible = orItems.slice(0, MAX_OR_ITEMS);
  const orMore = orItems.length - orVisible.length;

  return (
    <SettingsCard
      title="Audience"
      description="Choose which students are eligible to register for this quiz."
      icon={<Users className="h-5 w-5" />}
      iconClassName="bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500"
    >
      <p className="rounded-xl border border-border bg-card/40 px-3.5 py-2.5 text-xs leading-relaxed text-text-secondary">
        You can use your existing rooms, select individual students, or combine both.
      </p>

      {/* ===== Mode selection ===== */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ModeCard
          icon={<Globe className="h-5 w-5" />}
          title="Everyone"
          description="Any eligible student can register for this quiz."
          selected={audience.mode === "EVERYONE"}
          onClick={() => setMode("EVERYONE")}
        />
        <ModeCard
          icon={<Users className="h-5 w-5" />}
          title="Selected Rooms"
          description="Use reusable student groups for this quiz."
          selected={audience.mode === "ROOMS"}
          onClick={() => setMode("ROOMS")}
        />
        <ModeCard
          icon={<UserCheck className="h-5 w-5" />}
          title="Selected Students"
          description="Choose students individually."
          selected={audience.mode === "STUDENTS"}
          onClick={() => setMode("STUDENTS")}
        />
        <ModeCard
          icon={<UserRoundPlus className="h-5 w-5" />}
          title="Rooms + Students"
          description="Combine both methods for maximum flexibility."
          selected={audience.mode === "ROOMS_STUDENTS"}
          onClick={() => setMode("ROOMS_STUDENTS")}
        />
      </div>

      {/* ===== Everyone selected — simple confirmation ===== */}
      {audience.mode === "EVERYONE" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/[0.05] px-4 py-3">
            <Check className="h-4 w-4 shrink-0 text-success" />
            <div>
              <p className="text-sm font-bold text-text-primary">Anyone can register</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                This quiz does not have a room or individual student restriction.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Allowed Rooms ===== */}
      {showRooms && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <AllowedRooms
            activeRooms={activeRooms}
            selectedRooms={selectedRooms}
            unavailableCount={unavailableCount}
            roomMenuItems={roomMenuItems}
            onSelect={() => setSelectRoomsOpen(true)}
            onCreateRoom={() => setCreateOpen(true)}
          />
        </motion.div>
      )}

      {/* ===== Individual Students ===== */}
      {showStudents && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <IndividualStudents
            selectedStudents={audience.students ?? []}
            directoryCount={directory.length}
            onSelect={() => setSelectStudentsOpen(true)}
            onCreateRoom={() => setCreateOpen(true)}
            onRemove={removeStudent}
          />
        </motion.div>
      )}

      {/* ===== Access rule (OR) — Rooms + Students ===== */}
      {audience.mode === "ROOMS_STUDENTS" && orItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-6 rounded-xl border border-accent/15 bg-accent/[0.04] p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">Access Rule</h4>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
              Students belonging to <span className="font-semibold text-text-primary">any selected room</span>{" "}
              OR the <span className="font-semibold text-text-primary">individually selected students</span> can
              register. A student only needs to satisfy one condition.
            </p>
            <div className="mt-3 space-y-1">
              {orVisible.map((item, i) => (
                <div key={item.key}>
                  {i > 0 && (
                    <div className="my-1 flex items-center gap-1.5 pl-4">
                      <span className="h-2.5 w-px bg-accent/30" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-accent">or</span>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                    <span className="text-pink-500">{item.icon}</span>
                    <span className="text-xs font-semibold text-text-primary">{item.label}</span>
                    <span className="text-[10px] text-text-muted">{item.meta}</span>
                  </div>
                </div>
              ))}
              {orMore > 0 && (
                <p className="pl-4 pt-1 text-[11px] font-medium text-text-muted">+{orMore} more</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Audience Summary ===== */}
      <div className="mt-8 rounded-xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Audience Summary
            </h4>
            <p className="mt-2 text-lg font-bold text-text-primary">{summaryLabel}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {audience.mode === "EVERYONE"
                ? "Anyone with access can register for this quiz."
                : `${stats.unique} unique student${stats.unique !== 1 ? "s" : ""} can register for this quiz.`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-pink-500/[0.07] px-3.5 py-2.5 ring-1 ring-inset ring-pink-500/20">
            <Users className="h-4 w-4 text-pink-500" />
            <span className="text-lg font-bold text-pink-500 tabular-nums">
              {audience.mode === "EVERYONE" ? "∞" : stats.unique}
            </span>
          </div>
        </div>

        {audience.mode !== "EVERYONE" && (
          <div className="mt-3 space-y-1.5 border-t border-border pt-3">
            {selectedRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-text-secondary">{room.name}</span>
                <span className="shrink-0 font-semibold text-text-primary tabular-nums">
                  {room.students.length} student{room.students.length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
            {(audience.students?.length ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-text-secondary">Additional students</span>
                <span className="shrink-0 font-semibold text-text-primary tabular-nums">
                  {audience.students.length} selected
                </span>
              </div>
            )}

            {stats.roomOverlap > 0 && (
              <p className="pt-1 text-[11px] text-text-muted">
                {stats.roomOverlap} student{stats.roomOverlap !== 1 ? "s" : ""} belong to more than one
                selected room — counted once.
              </p>
            )}
            {stats.individualOverlap > 0 && (
              <p className="pt-1 text-[11px] text-text-muted">
                {stats.individualOverlap} individually selected student
                {stats.individualOverlap !== 1 ? "s" : ""} {stats.individualOverlap !== 1 ? "are" : "is"}{" "}
                already in a selected room — counted once.
              </p>
            )}

            {stats.unique > 0 && (
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
                <span className="font-medium text-text-muted">Unique eligible students</span>
                <span className="font-bold text-success tabular-nums">{stats.unique}</span>
              </div>
            )}
          </div>
        )}

        {unavailableCount > 0 && (
          <p className="mt-3 border-t border-border pt-3 text-[11px] font-medium text-danger">
            {unavailableCount} selected room{unavailableCount !== 1 ? "s" : ""} is no longer available.
          </p>
        )}

        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
          <Info className="h-3 w-3 shrink-0" />
          {audience.mode === "EVERYONE"
            ? "No restriction is applied to this quiz."
            : "The backend verifies actual eligibility at registration time."}
        </p>
      </div>

      {/* ===== Modals ===== */}
      <SelectRoomsModal
        open={selectRoomsOpen}
        onClose={() => setSelectRoomsOpen(false)}
        selectedRoomIds={audience.roomIds}
        onApply={applyRooms}
        onCreateRoom={() => setCreateOpen(true)}
      />
      <SelectStudentsModal
        open={selectStudentsOpen}
        onClose={() => setSelectStudentsOpen(false)}
        selectedStudents={audience.students ?? []}
        onApply={applyStudents}
      />
      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
    </SettingsCard>
  );
}

/* =============================================
   Allowed Rooms block
   ============================================= */
function AllowedRooms({
  activeRooms,
  selectedRooms,
  unavailableCount,
  roomMenuItems,
  onSelect,
  onCreateRoom,
}: {
  activeRooms: Room[];
  selectedRooms: Room[];
  unavailableCount: number;
  roomMenuItems: (roomId: string) => RoomMenuItem[];
  onSelect: () => void;
  onCreateRoom: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Allowed Rooms</h3>
          <p className="mt-0.5 text-xs text-text-secondary">Select from rooms created under your account.</p>
        </div>
        <Link
          href="/creator/rooms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-pink-500"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Manage Rooms
        </Link>
      </div>

      <button
        onClick={onSelect}
        className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-500/40 bg-pink-500/[0.06] text-sm font-bold text-pink-500 transition-all hover:bg-pink-500/10 active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" />
        Select Rooms
      </button>

      {/* No rooms created at all */}
      {activeRooms.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">No Rooms Yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
            Create a room to organize students and reuse the group across future quizzes.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={onCreateRoom}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Room
            </button>
            <Link
              href="/creator/rooms"
              className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
            >
              Manage Rooms
            </Link>
          </div>
        </div>
      )}

      {/* Selected room cards */}
      {selectedRooms.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {selectedRooms.map((room) => {
            const archived = room.archived;
            const empty = room.students.length === 0;
            return (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-4 transition-colors",
                  archived
                    ? "border-warning/25 bg-warning/[0.04]"
                    : "border-border bg-card hover:border-border-hover"
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 ring-1 ring-inset ring-pink-500/15">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-text-primary">{room.name}</p>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {archived && (
                        <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {room.students.length} student{room.students.length !== 1 ? "s" : ""}
                    </p>
                    {room.description && (
                      <p className="mt-0.5 truncate text-[11px] text-text-muted">{room.description}</p>
                    )}
                    {empty && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-warning">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        This room doesn&apos;t have any students yet.
                      </p>
                    )}
                  </div>
                  <RoomMenu items={roomMenuItems(room.id)} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Selected room deleted / unavailable */}
      {unavailableCount > 0 && (
        <div className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-danger/20 bg-danger/[0.04] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
            <p className="text-xs text-text-secondary">
              {unavailableCount} selected room{unavailableCount !== 1 ? "s" : ""} unavailable. Remove it
              from the audience.
            </p>
          </div>
          <button
            onClick={() => onSelect()}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/10"
          >
            Remove
          </button>
        </div>
      )}

      {/* No rooms selected yet */}
      {selectedRooms.length === 0 && activeRooms.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">No rooms selected</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
            Select one or more rooms to control who can register for this quiz.
          </p>
          <button
            onClick={onSelect}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            Select Rooms
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================
   Individual Students block
   ============================================= */
function IndividualStudents({
  selectedStudents,
  directoryCount,
  onSelect,
  onCreateRoom,
  onRemove,
}: {
  selectedStudents: AudienceStudent[];
  directoryCount: number;
  onSelect: () => void;
  onCreateRoom: () => void;
  onRemove: (roll: string) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Individual Students</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Add specific students who should be eligible for this quiz.
          </p>
        </div>
        {selectedStudents.length > 0 && (
          <span className="rounded-full bg-pink-500/10 px-2.5 py-1 text-[11px] font-bold text-pink-500">
            {selectedStudents.length} student{selectedStudents.length !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      <button
        onClick={onSelect}
        className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-500/40 bg-pink-500/[0.06] text-sm font-bold text-pink-500 transition-all hover:bg-pink-500/10 active:scale-[0.99]"
      >
        <UserCheck className="h-4 w-4" />
        Select Students
      </button>

      {/* No students available at all */}
      {directoryCount === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
            <UserRound className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">No Students Available</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
            Add students to your account before selecting them for a quiz.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/creator/rooms"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Manage Students
            </Link>
            <button
              onClick={onCreateRoom}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Room
            </button>
          </div>
        </div>
      )}

      {/* Selected students table */}
      {selectedStudents.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_120px_1fr_64px] items-center gap-3 border-b border-border bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Student</span>
            <span>Roll Number</span>
            <span>Email</span>
            <span className="text-right">Action</span>
          </div>
          {selectedStudents.map((s) => (
            <div
              key={s.rollNumber}
              className="grid grid-cols-[1fr_120px_1fr_64px] items-center gap-3 border-b border-border px-4 py-2.5 last:border-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <img
                  src={getAvatarUrlById(s.avatarId)}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
                <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
              </div>
              <p className="truncate font-mono text-xs text-text-secondary">{s.rollNumber}</p>
              <p className="truncate text-xs text-text-muted">{s.email}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => onRemove(s.rollNumber)}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* None selected yet */}
      {selectedStudents.length === 0 && directoryCount > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card/40 px-5 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
            <UserCheck className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-text-primary">No students selected</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-secondary">
            Only the students you explicitly select will be eligible for this quiz.
          </p>
          <button
            onClick={onSelect}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Select Students
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================
   Mode card
   ============================================= */
function ModeCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200",
        selected
          ? "border-pink-500/40 bg-pink-500/[0.06] shadow-[0_0_0_1px_rgba(236,72,153,0.15),0_10px_30px_-16px_rgba(236,72,153,0.4)]"
          : "border-border bg-card hover:border-border-hover hover:bg-card-hover"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-gradient-to-br from-pink-500/20 to-violet-600/20 text-pink-500"
            : "bg-white/[0.04] text-text-secondary group-hover:text-text-primary"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-bold", selected ? "text-pink-500" : "text-text-primary")}>
          {title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p>
      </div>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-pink-500 bg-pink-500 text-white"
            : "border-border-hover bg-input-bg group-hover:border-pink-500/40"
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}