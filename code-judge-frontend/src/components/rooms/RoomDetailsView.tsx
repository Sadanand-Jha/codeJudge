"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowUpDown,
  Check,
  CheckSquare,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  ClipboardList,
  FileSpreadsheet,
  Search,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { STUDENTS_PER_PAGE } from "@/lib/constants";
import { useRoomStore, getOwnedRooms, countRoomQuizUsage } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { timeAgo, isWithinWindow } from "@/lib/formatters";
import { exportStudentsToFile } from "@/utils/excelImport";
import { isValidUsername } from "@/utils/importValidation";
import { useToast } from "@/hooks/useToast";
import { Room, RoomStudent } from "@/types/room";
import { getAvatarUrlById } from "@/config/dicebear";
import { updateMemberStatus, updateRoomPatch, removeMember } from "@/services/rooms";
import RoomMenu, { RoomMenuItem } from "@/components/quiz/creator/settings/audience/RoomMenu";
import AddStudentsModal from "@/components/quiz/creator/settings/audience/AddStudentsModal";
import DuplicateRoomModal from "./DuplicateRoomModal";
import EditStudentModal from "./EditStudentModal";
import StudentDetailsPanel from "./StudentDetailsPanel";
import RoomInviteModal from "./RoomInviteModal";
import RoomRegistrationFormEditor from "./RoomRegistrationFormEditor";
import RoomAnnouncementsPanel from "./RoomAnnouncementsPanel";
import RoomDocumentsPanel from "./RoomDocumentsPanel";
import { WhatsAppIcon } from "@/components/creator/common/ShareQuizDialog";

type StudentFilter = "all" | "recent" | "issues";
type StudentSort = "default" | "recent" | "name";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const QS_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const QS_OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

const QS_TOP_BTN =
  "inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-[9px] text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

const QS_WHATSAPP_BTN =
  "inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[#0b3d2c] bg-[#25D366] px-3.5 py-[9px] text-sm font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const FILTERS: Array<{ id: StudentFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recently Added" },
  { id: "issues", label: "Issues" },
];

const SORT_OPTIONS: Array<{ id: StudentSort; label: string }> = [
  { id: "default", label: "Default Order" },
  { id: "recent", label: "Recently Added" },
  { id: "name", label: "Name A–Z" },
];

interface RoomDetailsViewProps {
  roomId: string;
  /** Base path for back-to-rooms links — "/profile/rooms" or standalone "/rooms". */
  basePath?: string;
}

/**
 * Profile → Rooms → Room detail — student table for one room with add/import/
 * export, edit/remove per student, bulk actions, filters and a slide-over
 * student profile showing multi-room membership.
 */
export default function RoomDetailsView({ roomId, basePath = "/profile/rooms" }: RoomDetailsViewProps) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const section =
    tabParam === "documents" || tabParam === "announcements" ? tabParam : "students";
  const rooms = useRoomStore((s) => s.rooms);
  const hydrate = useRoomStore((s) => s.hydrate);
  const setRooms = useRoomStore((s) => s.setRooms);
  const addStudents = useRoomStore((s) => s.addStudents);
  const updateStudent = useRoomStore((s) => s.updateStudent);
  const removeStudents = useRoomStore((s) => s.removeStudents);
  const archiveRoom = useRoomStore((s) => s.archiveRoom);
  const unarchiveRoom = useRoomStore((s) => s.unarchiveRoom);
  const duplicateRoom = useRoomStore((s) => s.duplicateRoom);
  const { user } = useAuthStore();
  const [backendLoading, setBackendLoading] = useState(() => /^\d+$/.test(roomId));

  const [query, setQuery] = useState(() => searchParams.get("student") ?? "");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [sort, setSort] = useState<StudentSort>("default");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"manual" | "import">("manual");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameDesc, setRenameDesc] = useState("");
  const [editingStudent, setEditingStudent] = useState<RoomStudent | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<RoomStudent | null>(null);
  const [removingStudent, setRemovingStudent] = useState<RoomStudent | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Fetch room details with members from backend on going to room page — calls GET /my-rooms/:id and populates students
  useEffect(() => {
    if (!roomId || !/^\d+$/.test(roomId)) return;
    import("@/services/rooms")
      .then(({ getRoom }) =>
        getRoom(roomId)
          .then((res: unknown) => {
            const data = (res as Record<string, unknown>) ?? {};
            if (!data || !data.id) return;
            const members = (data.members ?? []) as Array<Record<string, unknown>>;
            const mappedStudents: RoomStudent[] = members.map((m: unknown) => {
              const mm = m as Record<string, unknown>;
              const userObj = (mm.user as Record<string, unknown>) ?? mm;
              const username = String((userObj.username as string) ?? (mm.username as string) ?? "");
              return {
                id: String(userObj.id ?? mm.userId ?? mm.membershipId ?? Math.random()),
                name: String((userObj.displayName as string) ?? (userObj.username as string) ?? username ?? "Unknown"),
                rollNumber: username,
                username: username.toLowerCase(),
                active: (mm.statusName as string) === "ACTIVE" || mm.status === 1 || mm.status === "ACTIVE",
                avatarId: Number(userObj.avatarId ?? 1),
                avatarUrl: (userObj.avatarUrl as string) ?? null,
                addedAt: String((mm.joinedAt as string) ?? new Date().toISOString()),
                registrationData:
                  (mm.registrationData as Record<string, string> | null) ?? undefined,
              };
            });
            const current = useRoomStore.getState().rooms;
            const exists = current.find((r) => String(r.id) === String(roomId));
            if (exists) {
              const updated = current.map((r) =>
                String(r.id) === String(roomId)
                  ? {
                      ...r,
                      students: mappedStudents,
                      memberCount: mappedStudents.length,
                      updatedAt: String((data.updated_at as string) ?? r.updatedAt),
                      passwordExpiresAt: (data.password_expires_at as string | null) ?? r.passwordExpiresAt,
                      registrationForm:
                        (data.registration_form as Room["registrationForm"]) ?? r.registrationForm,
                    }
                  : r
              );
              setRooms(updated as Room[]);
            } else {
              const newRoom: Room = {
                id: String(data.id),
                name: String((data.name as string) ?? "Room"),
                description: (data.description as string) ?? undefined,
                ownerId: String((data.owner_id as string | number) ?? user?.id ?? ""),
                createdAt: String((data.created_at as string) ?? new Date().toISOString()),
                updatedAt: String((data.updated_at as string) ?? new Date().toISOString()),
                archived: !(data.is_active as boolean),
                students: mappedStudents,
                memberCount: mappedStudents.length,
                passwordExpiresAt: (data.password_expires_at as string | null) ?? null,
                registrationForm:
                  (data.registration_form as Room["registrationForm"]) ?? undefined,
              };
              setRooms([...current, newRoom]);
            }
          })
          .catch(() => {})
          .finally(() => setBackendLoading(false))
      )
      .catch(() => setBackendLoading(false));
  }, [roomId, setRooms, user?.id]);

  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);
  const room = ownedRooms.find((r) => r.id === roomId);

  const quizUsage = useMemo(() => (room ? countRoomQuizUsage(room.id) : 0), [room]);

  // Other owned rooms that contain at least one student from this room.
  const sharedRoomsCount = useMemo(() => {
    if (!room) return 0;
    const rolls = new Set(room.students.map((s) => s.rollNumber.trim().toLowerCase()));
    return ownedRooms.filter(
      (r) => r.id !== room.id && r.students.some((s) => rolls.has(s.rollNumber.trim().toLowerCase()))
    ).length;
  }, [room, ownedRooms]);

  const stats = useMemo(() => {
    if (!room) return null;
    const recentlyAdded = room.students.filter(
      (s) => s.addedAt && isWithinWindow(s.addedAt, RECENT_WINDOW_MS)
    ).length;
    const issues = room.students.filter(hasStudentIssue).length;
    return { total: room.students.length, recentlyAdded, issues, quizUsage, sharedRooms: sharedRoomsCount };
  }, [room, quizUsage, sharedRoomsCount]);

  const filterCounts: Record<StudentFilter, number> = {
    all: stats?.total ?? 0,
    recent: stats?.recentlyAdded ?? 0,
    issues: stats?.issues ?? 0,
  };

  const filteredStudents = useMemo(() => {
    if (!room) return [];
    const q = query.trim().toLowerCase();
    let list = room.students.filter((s) => {
      if (filter === "recent" && !(s.addedAt && isWithinWindow(s.addedAt, RECENT_WINDOW_MS)))
        return false;
      if (filter === "issues" && !hasStudentIssue(s)) return false;
      if (q && !`${s.name} ${s.rollNumber} ${s.username ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") {
        const at = (s: RoomStudent) => (s.addedAt ? new Date(s.addedAt).getTime() : 0);
        return at(b) - at(a);
      }
      return 0;
    });
    return list;
  }, [room, filter, query, sort]);

  const changeFilter = (next: StudentFilter) => {
    setFilter(next);
    setCurrentPage(1);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setCurrentPage(1);
  };

  const changeSort = (next: StudentSort) => {
    setSort(next);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));
  const paginatedStudents = useMemo(
    () => filteredStudents.slice((currentPage - 1) * STUDENTS_PER_PAGE, currentPage * STUDENTS_PER_PAGE),
    [filteredStudents, currentPage]
  );

  if (backendLoading) {
    return (
      <div className="min-h-full bg-[var(--qs-bg)]">
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-20 sm:px-6">
          <div className="mb-6 flex items-center gap-3.5">
            <div className="app-skeleton h-[42px] w-[42px] shrink-0 rounded-[12px]" />
            <div>
              <div className="app-skeleton h-8 w-52 rounded" />
              <div className="app-skeleton mt-1.5 h-4 w-36 rounded" />
            </div>
          </div>
          <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mb-5 sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="min-w-[132px] flex-1 shrink-0 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 sm:min-w-0 sm:rounded-[18px] sm:p-4">
                <div className="app-skeleton h-3 w-16 rounded sm:w-20" />
                <div className="app-skeleton mt-3 h-6 w-12 rounded sm:h-7 sm:w-14" />
              </div>
            ))}
          </div>
          <div className="rounded-[26px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="app-skeleton mt-2 h-9 rounded first:mt-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-full bg-[var(--qs-bg)]">
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-20 sm:px-6">
          <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-16 text-center">
            <Users className="mx-auto h-8 w-8 text-[var(--qs-muted)]" />
            <h2 className="mt-3 text-lg font-black text-[var(--qs-ink)]">Room not found</h2>
            <p className="mt-1 text-sm font-medium text-[var(--qs-muted)]">This room is no longer available.</p>
            <Link href={basePath} className={cn(QS_OUTLINE_BTN, "mt-4 py-2 text-xs")}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Rooms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selected.has(s.id));
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredStudents.forEach((s) => next.delete(s.id));
      } else {
        filteredStudents.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const handleExport = () => {
    exportStudentsToFile(
      room.name.replace(/[^\w\s-]/g, ""),
      room.students.map((s) => ({ username: s.username ?? s.rollNumber, rollNumber: s.rollNumber, data: s.data }))
    );
    toast.success({ title: "Export started", description: `${room.students.length} students exported.` });
  };

  const isBackendRoom = /^\d+$/.test(room.id);

  const startRename = () => {
    setRenameName(room.name);
    setRenameDesc(room.description ?? "");
    setIsRenaming(true);
  };

  const saveRename = async () => {
    const name = renameName.trim();
    if (!name) { setIsRenaming(false); return; }
    const desc = renameDesc.trim() || undefined;
    const updated = rooms.map((r) => r.id === room.id ? { ...r, name, description: desc } : r);
    setRooms(updated as never);
    setIsRenaming(false);
    if (isBackendRoom) {
      try { await updateRoomPatch(room.id, { name, description: desc }); } catch {
        const revert = useRoomStore.getState().rooms.map((r) => r.id === room.id ? { ...r, name: room.name, description: room.description } : r);
        setRooms(revert as never);
        toast.error({ title: "Rename failed" });
        return;
      }
    }
    toast.success({ title: "Room renamed" });
  };

  const handleRemoveSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (isBackendRoom) {
      for (const sid of ids) {
        const stu = room.students.find((s) => s.id === sid);
        const identifier = stu?.username ?? sid;
        try { await removeMember(room.id, identifier); } catch {}
      }
    }
    removeStudents(room.id, ids);
    setSelected(new Set());
    toast.success({ title: "Students removed", description: `${ids.length} student${ids.length !== 1 ? "s" : ""} removed from ${room.name}.` });
  };

  const headerMenuItems: RoomMenuItem[] = [
    { id: "export", label: "Export Students", icon: Download, onClick: handleExport },
    {
      id: "archive",
      label: room.archived ? "Restore Room" : "Archive Room",
      icon: room.archived ? ArchiveRestore : Archive,
      destructive: !room.archived,
      onClick: async () => {
        // Sync to backend first if backend room
        if (isBackendRoom) {
          try { await updateRoomPatch(room.id, { archived: !room.archived }); } catch {}
        }
        if (room.archived) {
          unarchiveRoom(room.id);
          toast.success({ title: "Room restored", description: "The room is active again." });
        } else {
          archiveRoom(room.id);
          toast.success({ title: "Room archived", description: "The room is now hidden." });
        }
      },
    },
    {
      id: "duplicate",
      label: "Duplicate Room",
      icon: Copy,
      onClick: () => setDuplicateOpen(true),
    },
  ];

  const statCards = stats
    ? [
        { label: "Total Students", value: stats.total, sub: "in room", color: "var(--qs-brand)", hi: true },
        { label: "Quizzes Used", value: stats.quizUsage, sub: "quizzes", color: "#2457d6" },
        { label: "Recently Added", value: stats.recentlyAdded, sub: "last 7 days", color: "var(--qs-ok)" },
        { label: "Needs Attention", value: stats.issues, sub: "students", color: "#a85d00" },
      ]
    : [];

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto max-w-[1280px] px-4 py-6 pb-20 sm:px-6">

        {/* Top */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <Link
              href={basePath}
              aria-label="Back to Rooms"
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <ArrowLeft className="h-4.5 w-4.5 text-[var(--qs-ink)]" />
            </Link>
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]">
              <Users className="h-[26px] w-[26px]" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              {isRenaming ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    autoFocus
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setIsRenaming(false); }}
                    onBlur={saveRename}
                    aria-label="Room name"
                    className="rounded-[10px] border-2 border-[var(--qs-brand)] bg-[var(--qs-surface)] px-2.5 py-1 text-[22px] font-extrabold tracking-[-0.02em] text-[var(--qs-ink)] outline-none sm:text-[26px]"
                  />
                  <input
                    value={renameDesc}
                    onChange={(e) => setRenameDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setIsRenaming(false); }}
                    onBlur={saveRename}
                    placeholder="Description (optional)"
                    aria-label="Room description"
                    className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-xs font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] sm:text-sm"
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border-2 border-[var(--qs-brand)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-brand)]">
                      Creator
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-poly-1)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-ink)]">
                      <Users className="h-3 w-3" />
                      {room.students.length} student{room.students.length === 1 ? "" : "s"}
                    </span>
                    {room.archived && (
                      <span className="rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[10px] font-extrabold text-[#1A1240]">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[30px]">{room.name}</h1>
                    <button
                      type="button"
                      onClick={startRename}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-brand)]"
                      title="Rename room"
                      aria-label="Rename room"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--qs-muted)]">
                    {room.description || "Student group"}
                    <span className="mx-1">·</span>
                    Updated {timeAgo(room.updatedAt)}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {section === "students" && (
              <>
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  disabled={room.archived}
                  title={room.archived ? "Restore the room before inviting students" : "Create a WhatsApp invite"}
                  className={QS_WHATSAPP_BTN}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  Invite on WhatsApp
                </button>
                <button type="button" onClick={() => setRegistrationOpen(true)} className={QS_TOP_BTN}>
                  <ClipboardList className="h-4 w-4" />
                  Form
                </button>
                <button type="button" onClick={handleExport} className={QS_TOP_BTN}>
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddTab("import");
                    setAddOpen(true);
                  }}
                  className={QS_TOP_BTN}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Import
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddTab("manual");
                    setAddOpen(true);
                  }}
                  className={cn(QS_PRIMARY_BTN, "rounded-[12px] px-3.5 py-[9px] text-sm")}
                >
                  <UserRoundPlus className="h-4 w-4" />
                  Add Students
                </button>
              </>
            )}
            <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] transition-colors hover:border-[var(--qs-brand)]">
              <RoomMenu items={headerMenuItems} />
            </div>
          </div>
        </div>

        {/* Stats */}
        {section === "students" && stats && (
          <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mb-5 sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
            {statCards.map((kpi) => (
              <div
                key={kpi.label}
                className={cn(
                  "min-w-[136px] flex-1 shrink-0 rounded-[16px] border-2 p-3 sm:min-w-0 sm:rounded-[18px] sm:p-4 sm:px-[18px]",
                  kpi.hi ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                )}
              >
                <small className={cn(
                  "flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] sm:gap-2 sm:text-xs",
                  kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-muted)]"
                )}>
                  <span className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5" style={{ background: kpi.color }} />
                  {kpi.label}
                </small>
                <b className={cn("mt-1.5 block text-[24px] font-extrabold leading-[1.1] sm:mt-2 sm:text-[32px] lg:text-[36px]", kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-ink)]")}>
                  {kpi.value}
                  <span className={cn("ml-1 text-xs font-medium sm:text-sm", kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-muted)]")}>{kpi.sub}</span>
                </b>
              </div>
            ))}
          </div>
        )}

        {section === "students" ? (
          <>
        {/* Filter bar */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-[0_1_290px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
            <input
              value={query}
              onChange={(e) => changeQuery(e.target.value)}
              placeholder="Search name, roll or username…"
              aria-label="Search students"
              className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeFilter(f.id)}
                  className={cn(
                    "rounded-full border-2 px-[13px] py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] transition-colors",
                    active
                      ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  {f.label}
                  <i className={cn("ml-1.5 not-italic", active ? "opacity-70" : "text-[var(--qs-muted)]")}>{filterCounts[f.id]}</i>
                </button>
              );
            })}
          </div>
          <SortSelect value={sort} onChange={changeSort} />
        </div>

        {/* Bulk bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[#fff7dd] px-3 py-2"
            >
              <p className="text-xs font-extrabold text-[var(--qs-ink)]">
                <span className="tabular-nums">{selected.size}</span> selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRemoveSelected}
                  className="flex h-8 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-bad)] bg-[var(--qs-bad)] px-3 text-xs font-extrabold text-white transition-all hover:brightness-105"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="flex h-8 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student table */}
        <div className="relative mb-4 mr-4">
          <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
          <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
            <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px]">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">Students</h2>
                <p className="mt-0.5 text-sm text-[var(--qs-muted)]">Manage every student in this room — select rows for bulk actions.</p>
              </div>
              <p className="text-sm font-medium text-[var(--qs-muted)]">
                {filteredStudents.length} of {room.students.length}
              </p>
            </header>

            {/* Mobile cards */}
            <div className="space-y-2.5 border-t-2 border-[var(--qs-line)] p-4 md:hidden">
              {room.students.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm font-medium text-[var(--qs-muted)]">
                  No students yet — add students manually or import them from an Excel/CSV file.
                </p>
              ) : filteredStudents.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm font-medium text-[var(--qs-muted)]">
                  No students match this search or filter.
                </p>
              ) : (
                paginatedStudents.map((student) => {
                  const issue = hasStudentIssue(student);
                  return (
                    <div
                      key={student.id}
                      onClick={() => setDetailsStudent(student)}
                      className="cursor-pointer rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 transition-colors active:bg-[var(--qs-bg)]"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelected(student.id);
                          }}
                          className={cn(
                            "mt-2 grid h-4.5 w-4.5 shrink-0 place-items-center rounded border-2 transition-colors",
                            selected.has(student.id)
                              ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                              : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                          )}
                          aria-label={`Select ${student.name}`}
                        >
                          {selected.has(student.id) && <CheckSquare className="h-3 w-3" />}
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured and may be remote */}
                        <img
                          src={student.avatarUrl || getAvatarUrlById(student.avatarId)}
                          alt=""
                          className="h-[38px] w-[38px] shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 font-bold text-[var(--qs-ink)]">
                              <span className="truncate">{student.name}</span>
                              {issue && <AlertTriangle className="h-3 w-3 shrink-0 text-[#a85d00]" />}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border-2 border-current px-2 py-px text-[10px] font-extrabold uppercase tracking-[0.05em]",
                                student.active ? "text-[var(--qs-ok)]" : "text-[#a85d00]"
                              )}
                            >
                              {student.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[var(--qs-muted)]">
                            Roll {student.rollNumber} · @{(student.username ?? "").toLowerCase() || "—"}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--qs-muted)]">
                            Added {student.addedAt ? timeAgo(student.addedAt) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden overflow-x-auto border-t-2 border-[var(--qs-line)] md:block">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="w-12 whitespace-nowrap px-3 py-3.5">
                      <button
                        onClick={toggleAllVisible}
                        className={cn(
                          "grid h-4.5 w-4.5 place-items-center rounded border-2 transition-colors",
                          allVisibleSelected
                            ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                            : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                        )}
                        aria-label="Select all visible"
                      >
                        {allVisibleSelected && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </th>
                    {["Student", "Roll", "Username", "Added", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {room.students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border-t-2 border-[var(--qs-line)]/60 px-4 py-10 text-center text-sm font-medium text-[var(--qs-muted)]">
                        No students yet — add students manually or import them from an Excel/CSV file.
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border-t-2 border-[var(--qs-line)]/60 px-4 py-10 text-center text-sm font-medium text-[var(--qs-muted)]">
                        No students match this search or filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => {
                      const issue = hasStudentIssue(student);
                      return (
                        <tr
                          key={student.id}
                          onClick={() => setDetailsStudent(student)}
                          className="cursor-pointer border-t-2 border-[var(--qs-line)]/60 transition-colors hover:bg-[var(--qs-bg)]"
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleSelected(student.id)}
                              className={cn(
                                "grid h-4.5 w-4.5 place-items-center rounded border-2 transition-colors",
                                selected.has(student.id)
                                  ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                                  : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                              )}
                              aria-label={`Select ${student.name}`}
                            >
                              {selected.has(student.id) && <CheckSquare className="h-3 w-3" />}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured and may be remote */}
                              <img
                                src={student.avatarUrl || getAvatarUrlById(student.avatarId)}
                                alt=""
                                className="h-[38px] w-[38px] shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
                              />
                              <span className="flex max-w-[180px] items-center gap-1.5 font-bold text-[var(--qs-ink)]">
                                <span className="truncate">{student.name}</span>
                                {issue && (
                                  <AlertTriangle className="h-3 w-3 shrink-0 text-[#a85d00]" />
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[var(--qs-muted)]">{student.rollNumber}</td>
                          <td className="px-3 py-3 text-[var(--qs-muted)]">
                            @{(student.username ?? "").toLowerCase() || "—"}
                          </td>
                          <td className="px-3 py-3 text-[var(--qs-muted)]">
                            {student.addedAt ? timeAgo(student.addedAt) : "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "inline-block rounded-full border-2 border-current px-[11px] py-px text-xs font-extrabold uppercase tracking-[0.05em]",
                                student.active ? "text-[var(--qs-ok)]" : "text-[#a85d00]"
                              )}
                            >
                              {student.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[var(--qs-line)] px-4 py-3.5 sm:px-[26px]">
              <p className="text-sm font-medium text-[var(--qs-muted)]">
                Showing {filteredStudents.length} of {room.students.length} students
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-medium text-[var(--qs-muted)]">
                    Page <b className="tabular-nums text-[var(--qs-ink)]">{currentPage}</b> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
          </>
        ) : section === "documents" ? (
          <RoomDocumentsPanel roomId={room.id} roomName={room.name} />
        ) : (
          <RoomAnnouncementsPanel roomId={room.id} roomName={room.name} />
        )}
      </div>

      {/* Add / import students */}
      <AddStudentsModal
        key={addOpen ? "open" : "closed"}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existing={room.students}
        roomName={room.name}
        initialTab={addTab}
        roomId={room.id}
        viewStudentsHref={`${basePath}/${room.id}`}
        onAdd={(students) => {
          addStudents(room.id, students);
          setAddOpen(false);
          toast.success({
            title: "Students added",
            description: `${students.length} student${students.length !== 1 ? "s" : ""} added to ${room.name}.`,
          });
        }}
      />

      {/* Duplicate */}
      <DuplicateRoomModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        roomName={room.name}
        onConfirm={(copyStudents) => {
          const copy = duplicateRoom(room.id, { copyStudents });
          if (copy) {
            toast.success({ title: "Room duplicated", description: `"${copy.name}" was created.` });
          }
        }}
      />

      {/* Edit student — status synced to backend */}
      <EditStudentModal
        open={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSave={async (patch) => {
          if (editingStudent) {
            if (isBackendRoom && patch.active !== undefined) {
              try { await updateMemberStatus(room.id, editingStudent.username ?? editingStudent.id, patch.active); } catch {}
            }
            updateStudent(room.id, editingStudent.id, patch);
            toast.success({ title: "Student updated", description: "Changes have been saved." });
          }
        }}
      />

      {/* Remove student */}
      <AnimatePresence>
        {removingStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1240]/50 p-4 backdrop-blur-sm"
            onClick={() => setRemovingStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 shadow-[6px_6px_0_var(--qs-sun)]"
            >
              <h3 className="text-base font-black text-[var(--qs-ink)]">Remove Student</h3>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                Remove <span className="font-extrabold text-[var(--qs-ink)]">{removingStudent.name}</span> from{" "}
                <span className="font-extrabold text-[var(--qs-ink)]">{room.name}</span>? The student&apos;s
                profile is not deleted and they can be re-added later.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setRemovingStudent(null)} className={cn(QS_OUTLINE_BTN, "py-2 text-xs")}>
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (isBackendRoom) {
                      try { await removeMember(room.id, removingStudent.username ?? removingStudent.id); } catch {}
                    }
                    removeStudents(room.id, [removingStudent.id]);
                    setRemovingStudent(null);
                    toast.success({ title: "Student removed", description: `${removingStudent.name} was removed from ${room.name}.` });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-4 py-2 text-xs font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RoomInviteModal
        key={`invite-${room.id}`}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        roomId={room.id}
        roomName={room.name}
        onEditForm={() => setRegistrationOpen(true)}
      />

      <RoomRegistrationFormEditor
        key={`registration-${room.id}`}
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        roomId={room.id}
        roomName={room.name}
        onSaved={(form) => {
          const current = useRoomStore.getState().rooms;
          setRooms(
            current.map((r) =>
              String(r.id) === String(room.id) ? { ...r, registrationForm: form } : r
            ) as Room[]
          );
        }}
      />

      {/* Student details slide-over */}
      <StudentDetailsPanel
        student={detailsStudent}
        rooms={ownedRooms}
        onClose={() => setDetailsStudent(null)}
        onEdit={() => {
          setEditingStudent(detailsStudent);
          setDetailsStudent(null);
        }}
        onRemove={() => {
          setRemovingStudent(detailsStudent);
          setDetailsStudent(null);
        }}
      />
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: StudentSort;
  onChange: (value: StudentSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = SORT_OPTIONS.find((option) => option.id === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const currentIndex = SORT_OPTIONS.findIndex((option) => option.id === value);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + SORT_OPTIONS.length) % SORT_OPTIONS.length;
    onChange(SORT_OPTIONS[nextIndex].id);
  };

  return (
    <div ref={rootRef} className="relative w-full shrink-0 sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-label="Sort students"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-[42px] w-full items-center justify-between gap-2 rounded-[12px] border-2 bg-[var(--qs-surface)] px-3.5 text-sm font-bold text-[var(--qs-ink)] outline-none transition-all sm:w-auto sm:min-w-[196px]",
          open
            ? "border-[var(--qs-brand)] shadow-[0_0_0_3px_var(--qs-poly-2)]"
            : "border-[var(--qs-line)] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] focus-visible:shadow-[0_0_0_3px_var(--qs-poly-2)]"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ArrowUpDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors",
              open ? "text-[var(--qs-brand)]" : "text-[var(--qs-muted)]"
            )}
          />
          <span className="truncate">Sort: {selected.label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform duration-200",
            open && "rotate-180 text-[var(--qs-brand)]"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              role="listbox"
              aria-label="Sort students"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 z-50 mt-2 w-full min-w-[196px] origin-top-left overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)] sm:left-auto sm:right-0 sm:w-[228px] sm:origin-top-right"
            >
              {SORT_OPTIONS.map((option) => {
                const active = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-[9px] px-2.5 py-2 text-left text-sm font-bold transition-colors",
                      active
                        ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                        : "text-[var(--qs-ink)] hover:bg-[var(--qs-poly-0)]"
                    )}
                  >
                    <span className="truncate">Sort: {option.label}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function getUsername(student: RoomStudent): string {
  return (student.username ?? "").trim();
}

function hasStudentIssue(student: RoomStudent): boolean {
  const validUsername = isValidUsername(getUsername(student));
  return !student.active || !student.rollNumber.trim() || !validUsername;
}
