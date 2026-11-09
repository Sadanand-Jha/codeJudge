"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  MoreVertical,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { MAX_ROOMS_PER_CREATOR } from "@/lib/constants";
import { useRoomStore, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { timeAgo, isWithinWindow } from "@/lib/formatters";
import { exportStudentsToFile } from "@/utils/excelImport";
import { useToast } from "@/hooks/useToast";
import type { RoomMenuItem } from "@/components/quiz/creator/settings/audience/RoomMenu";
import CreateRoomModal from "@/components/quiz/creator/settings/audience/CreateRoomModal";
import AddStudentsModal from "@/components/quiz/creator/settings/audience/AddStudentsModal";
import DuplicateRoomModal from "./DuplicateRoomModal";
import Select from "@/components/ui/Select";

type FilterTab = "all" | "active" | "archived" | "recent";
type SortKey = "updated" | "name" | "students";

const FILTERS: Array<{ id: FilterTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
  { id: "recent", label: "Recently Updated" },
];

const SORTS: Array<{ id: SortKey; label: string }> = [
  { id: "updated", label: "Recently Updated" },
  { id: "name", label: "Name A–Z" },
  { id: "students", label: "Most Students" },
];

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const QS_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const QS_OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

interface RoomsManagerProps {
  /** Base path for room links — "/profile/rooms" under the profile layout or "/rooms" standalone. */
  basePath?: string;
}

/**
 * Profile → Rooms — admin-owned, reusable student groups. Rooms live here
 * (persistent account resources) and are merely *selected* per quiz in
 * Quiz Creation → Audience.
 */
export default function RoomsManager({ basePath = "/profile/rooms" }: RoomsManagerProps) {
  const toast = useToast();
  const router = useRouter();
  const rooms = useRoomStore((s) => s.rooms);
  const hydrate = useRoomStore((s) => s.hydrate);
  const setRooms = useRoomStore((s) => s.setRooms);
  const archiveRoom = useRoomStore((s) => s.archiveRoom);
  const unarchiveRoom = useRoomStore((s) => s.unarchiveRoom);
  const duplicateRoom = useRoomStore((s) => s.duplicateRoom);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const addStudents = useRoomStore((s) => s.addStudents);
  const { user } = useAuthStore();

  const [filter, setFilter] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"manual" | "import">("manual");
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<{ roomId: string; tab: "manual" | "import" } | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [actionMenu, setActionMenu] = useState<{ roomId: string; archived: boolean; top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    hydrate();
    // Fetch rooms from backend on going to rooms page — calls GET /my-rooms
    import("@/services/rooms").then(({ fetchMyRooms }) => {
      fetchMyRooms()
        .then((backendRooms) => {
          // Only overwrite if backend returned data; keeps local fallback
          if (Array.isArray(backendRooms)) setRooms(backendRooms);
        })
        .catch(() => {})
        .finally(() => setLoadingRooms(false));
    }).catch(() => setLoadingRooms(false));
  }, [hydrate, setRooms]);

  useEffect(() => {
    if (!actionMenu) return;
    const close = () => setActionMenu(null);
    document.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [actionMenu]);

  // Only rooms owned by the authenticated admin.
  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);

  const stats = useMemo(() => {
    const active = ownedRooms.filter((r) => !r.archived);
    const students = ownedRooms.reduce((sum, r) => sum + (r.memberCount ?? r.students.length), 0);
    const recent = active.filter((r) => isWithinWindow(r.updatedAt, RECENT_WINDOW_MS)).length;
    return {
      rooms: ownedRooms.length,
      students,
      active: active.length,
      archived: ownedRooms.length - active.length,
      recent,
    };
  }, [ownedRooms]);

  const filterCounts: Record<FilterTab, number> = {
    all: stats.rooms,
    active: stats.active,
    archived: stats.archived,
    recent: stats.recent,
  };

  const filtered = useMemo(() => {
    let list = ownedRooms.filter((r) => {
      if (filter === "active" && r.archived) return false;
      if (filter === "archived" && !r.archived) return false;
      if (filter === "recent" && (r.archived || !isWithinWindow(r.updatedAt, RECENT_WINDOW_MS))) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "students") return b.students.length - a.students.length;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [ownedRooms, filter, sort]);

  const editRoom = editTarget ? ownedRooms.find((r) => r.id === editTarget) : null;
  const duplicateRoomTarget = duplicateTarget ? ownedRooms.find((r) => r.id === duplicateTarget) : null;
  const addRoomTarget = addTarget ? ownedRooms.find((r) => r.id === addTarget.roomId) : null;

  const openActionMenu = (e: React.MouseEvent, roomId: string, archived: boolean) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const openUp = window.innerHeight - rect.bottom < 340;
    setActionMenu({
      roomId,
      archived,
      top: openUp ? undefined : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
      right: window.innerWidth - rect.right,
    });
  };

  const handleExport = (roomId: string) => {
    const room = ownedRooms.find((r) => r.id === roomId);
    if (!room) return;
    exportStudentsToFile(
      room.name.replace(/[^\w\s-]/g, ""),
      room.students.map((s) => ({ username: s.username ?? s.rollNumber, rollNumber: s.rollNumber, data: s.data }))
    );
    toast.success({ title: "Export started", description: `${room.students.length} students exported.` });
  };

  const menuItems = (roomId: string, isArchived: boolean): RoomMenuItem[] => [
    {
      id: "view",
      label: "View Students",
      icon: Eye,
      onClick: () => {
        window.location.href = `${basePath}/${roomId}`;
      },
    },
    {
      id: "edit",
      label: "Edit Room",
      icon: Settings2,
      onClick: () => setEditTarget(roomId),
    },
    {
      id: "add",
      label: "Add Students",
      icon: Users,
      onClick: () => setAddTarget({ roomId, tab: "manual" }),
    },
    {
      id: "import",
      label: "Import Students",
      icon: FileSpreadsheet,
      onClick: () => setAddTarget({ roomId, tab: "import" }),
    },
    {
      id: "export",
      label: "Export Students",
      icon: Download,
      onClick: () => handleExport(roomId),
    },
    {
      id: "duplicate",
      label: "Duplicate Room",
      icon: Copy,
      onClick: () => setDuplicateTarget(roomId),
    },
    {
      id: "archive",
      label: isArchived ? "Restore Room" : "Archive Room",
      icon: isArchived ? ArchiveRestore : Archive,
      destructive: !isArchived,
      onClick: () => {
        if (isArchived) {
          unarchiveRoom(roomId);
          toast.success({ title: "Room restored", description: "The room is active again." });
        } else {
          archiveRoom(roomId);
          toast.success({ title: "Room archived", description: "The room is now hidden." });
        }
      },
    },
  ];

  // Full-page skeleton while rooms & students are fetched from the backend
  if (loadingRooms) {
    return (
      <div className="qs-ui min-h-full bg-[var(--qs-bg)]">
        <div className="mx-auto max-w-[1280px] px-4 py-4 pb-20 sm:px-6 sm:py-6">
          <div className="mb-6 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 sm:p-8">
            <div className="app-skeleton h-4 w-36 rounded-full" />
            <div className="app-skeleton mt-4 h-9 w-64 max-w-full rounded" />
            <div className="app-skeleton mt-2 h-4 w-80 max-w-full rounded" />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-5 sm:gap-3.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
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

  const statCards = [
    { label: "Rooms", short: "Rooms", value: stats.rooms, sub: "total", color: "var(--qs-brand)" },
    { label: "Students", short: "Students", value: stats.students, sub: "across rooms", color: "var(--qs-blue)" },
    { label: "Active Rooms", short: "Active", value: stats.active, sub: "usable", color: "var(--qs-ok)" },
    { label: "Archived", short: "Archived", value: stats.archived, sub: "hidden", color: "var(--qs-warn)" },
  ];

  return (
    <div className="qs-ui min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto max-w-[1280px] px-4 py-4 pb-20 sm:px-6 sm:py-6">
        {/* Mobile header */}
        <header className="mb-3 rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-3.5 text-[var(--qs-on-brand)] shadow-[2px_3px_0_var(--qs-sun)] md:hidden">
          <div className="flex items-center justify-end gap-2">
            <span className="inline-flex h-[26px] shrink-0 items-center rounded-full bg-[var(--qs-surface)] px-2.5 text-[11.5px] font-bold text-[var(--qs-ink)]">
              {stats.rooms}/{MAX_ROOMS_PER_CREATOR} rooms
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <h1 className="min-w-0 truncate text-[21px] font-bold leading-tight">
              {basePath === "/creator/rooms" ? "My Classrooms" : "My Rooms"}
            </h1>
            <button
              type="button"
              onClick={() => {
                setCreateTab("manual");
                setCreateOpen(true);
              }}
              disabled={ownedRooms.length >= MAX_ROOMS_PER_CREATOR}
              title={
                ownedRooms.length >= MAX_ROOMS_PER_CREATOR
                  ? `You can have at most ${MAX_ROOMS_PER_CREATOR} rooms`
                  : "Create a new room"
              }
              className="inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[#3B1FA8] px-3 text-[12.5px] font-semibold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-[15px] w-[15px]" strokeWidth={3} />
              Create Room
            </button>
          </div>
          <p className="mt-2 text-[11.5px] leading-4 text-[#EAE5FF]">
            Organize students into reusable groups and manage quiz access from one place.
          </p>
        </header>

        {/* Desktop header */}
        <header className="relative mb-6 hidden overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 py-6 text-[var(--qs-on-brand)] shadow-[6px_6px_0_var(--qs-sun)] sm:px-8 sm:py-8 md:block">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[var(--qs-sun)]/15" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="min-w-0 max-w-2xl">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-1.5 text-xs font-extrabold text-[#1a1240]">
                <Users className="h-3.5 w-3.5" />
                Creator Studio · Student groups
              </span>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                {basePath === "/creator/rooms" ? "My Classrooms" : "My Rooms"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--qs-on-brand)]/85 sm:text-base">
                Organize students into reusable groups and manage quiz access from one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3.5 py-2.5 text-sm font-extrabold text-[var(--qs-ink)]">
                {stats.rooms}/{MAX_ROOMS_PER_CREATOR} rooms
              </span>
            <button
              type="button"
              onClick={() => {
                setCreateTab("manual");
                setCreateOpen(true);
              }}
              disabled={ownedRooms.length >= MAX_ROOMS_PER_CREATOR}
              title={
                ownedRooms.length >= MAX_ROOMS_PER_CREATOR
                  ? `You can have at most ${MAX_ROOMS_PER_CREATOR} rooms`
                  : "Create a new room"
              }
              className={cn(QS_PRIMARY_BTN, "rounded-[12px] px-3.5 py-[9px] text-sm")}
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Create Room
            </button>
            </div>
          </div>
        </header>

        {/* Room limit hint */}
        {ownedRooms.length >= MAX_ROOMS_PER_CREATOR && (
          <p className="mb-5 flex items-center gap-2 rounded-[12px] border-2 border-[#a85d00]/30 bg-[#fff3d6] px-3 py-2 text-xs font-bold text-[#a85d00]">
            <AlertTriangle className="h-3.5 w-3.5" />
            You&apos;ve reached the maximum of {MAX_ROOMS_PER_CREATOR} rooms. Remove or archive a room to create a new one.
          </p>
        )}

        {/* Stats */}
        <div className="mb-3 grid grid-cols-4 gap-1.5 md:mb-5 md:gap-3.5">
          {statCards.map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "flex h-[54px] flex-col justify-center rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 md:h-auto md:rounded-[18px] md:border-2 md:border-[var(--qs-ink)] md:p-4 md:px-[18px] md:shadow-[3px_3px_0_var(--qs-sun)]"
              )}
            >
              <small className="order-2 flex items-center gap-1.5 text-[10.5px] font-normal leading-3.5 text-[var(--qs-muted)] md:order-1 md:gap-2 md:text-xs md:font-extrabold md:uppercase md:tracking-[0.08em]">
                <span className="hidden h-2.5 w-2.5 shrink-0 rounded-full md:block" style={{ background: kpi.color }} />
                <span className="md:hidden">{kpi.short}</span>
                <span className="hidden md:inline">{kpi.label}</span>
              </small>
              <b className="order-1 text-[17px] font-bold leading-5 text-[var(--qs-ink)] md:order-2 md:mt-2 md:text-[32px] md:font-extrabold md:leading-[1.1] lg:text-[36px]">
                {kpi.value}
                <span className="hidden text-xs font-medium text-[var(--qs-muted)] md:ml-1 md:inline md:text-sm">{kpi.sub}</span>
              </b>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="mb-3 flex flex-col gap-3 md:mb-5 md:flex-row md:flex-wrap md:items-center md:gap-2.5">
          <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-none md:w-auto md:flex-1 md:flex-wrap md:gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium leading-3.5 transition-colors md:border-2 md:px-[13px] md:text-[13px] md:font-extrabold md:uppercase md:leading-[18px] md:tracking-[0.06em]",
                    active
                      ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                      : "border-[#CFC7F0] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] md:border-[var(--qs-line)] md:text-[var(--qs-ink)]"
                  )}
                >
                  <span className="md:hidden">{f.id === "recent" ? "Recent" : f.label}</span>
                  <span className="hidden md:inline">{f.label}</span>
                  <i className={cn("ml-1 not-italic md:ml-1.5", active ? "opacity-70" : "text-[var(--qs-muted)]")}>{filterCounts[f.id]}</i>
                </button>
              );
            })}
            <div className="relative ml-auto shrink-0 md:hidden">
              <span aria-hidden className="grid h-8 w-9 place-items-center rounded-[10px] text-[var(--qs-ink)]">
                <ArrowUpDown className="h-4 w-4" />
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort rooms"
                title={`Sort: ${SORTS.find((s) => s.id === sort)?.label ?? ""}`}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort rooms"
            className="hidden w-full shrink-0 cursor-pointer rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-[11px] text-sm font-extrabold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)] focus:border-[var(--qs-brand)] sm:w-auto sm:py-[9px] md:block"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                Sort: {s.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Rooms table */}
        <div className="relative mb-4 mr-1 md:mr-4">
          <div aria-hidden className="absolute left-0.5 top-0.5 -bottom-0.5 -right-0.5 rounded-[14px] bg-[var(--qs-sun)] md:left-4 md:top-4 md:-bottom-4 md:-right-4 md:rounded-[30px]" />
          <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] md:rounded-[26px] md:border-2">
            <header className="flex flex-col gap-1 bg-[var(--qs-bg)] px-3.5 pb-2.5 pt-3.5 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-3 md:px-[26px] md:pb-4 md:pt-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 md:block">
                  <h2 className="text-[15px] font-bold tracking-tight text-[var(--qs-ink)] md:text-2xl md:font-extrabold">Rooms</h2>
                  <p className="text-[10.5px] font-medium text-[var(--qs-muted)] md:hidden">
                    {filtered.length} of {stats.rooms}
                  </p>
                </div>
                <p className="mt-0.5 text-[10.5px] leading-3.5 text-[var(--qs-muted)] md:text-sm md:leading-[1.4]">Reusable student groups — open a room to manage its students.</p>
              </div>
              <p className="hidden text-[13px] font-medium text-[var(--qs-muted)] md:block md:text-sm">
                {filtered.length} of {stats.rooms}
              </p>
            </header>

            {ownedRooms.length === 0 ? (
              <div className="border-t-2 border-[var(--qs-line)]">
                <EmptyRooms onCreate={() => setCreateOpen(true)} onImport={() => {
                  setCreateTab("import");
                  setCreateOpen(true);
                }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="border-t-2 border-[var(--qs-line)]/60 px-4 py-10 text-center text-sm font-medium text-[var(--qs-muted)]">
                No rooms match this search or filter.
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="space-y-1.5 border-t border-[var(--qs-line)] p-3 md:hidden">
                  {filtered.map((room) => {
                    const count = room.memberCount ?? room.students.length;
                    return (
                      <div
                        key={room.id}
                        onClick={() => router.push(`${basePath}/${room.id}`)}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-2.5 pr-1 transition-colors active:bg-[var(--qs-bg)]"
                      >
                        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                          <Users className="h-4 w-4" strokeWidth={2.5} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-4 text-[var(--qs-ink)]">
                              {room.name}
                            </p>
                            <span
                              className={cn(
                                "shrink-0 rounded-[6px] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em]",
                                room.archived ? "bg-[#FFEBC2] text-[#8A4B00]" : "bg-[#D9F5E5] text-[#0B6B3A]"
                              )}
                            >
                              {room.archived ? "Archived" : "Active"}
                            </span>
                          </div>
                          <p className="truncate text-[10.5px] leading-3.5 text-[var(--qs-muted)]">
                            {room.description || "No description"}
                          </p>
                          <p className="flex min-w-0 items-center gap-1 text-[10.5px] leading-3.5 text-[var(--qs-muted)]">
                            <Clock className="h-[11px] w-[11px] shrink-0" />
                            <span className="truncate">
                              {count} students · {timeAgo(room.updatedAt)}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Actions for ${room.name}`}
                          onClick={(e) => openActionMenu(e, room.id, room.archived)}
                          className="grid h-10 w-9 shrink-0 place-items-center rounded-[10px] text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-line)]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto border-t-2 border-[var(--qs-line)] md:block">
                  <table className="w-full min-w-[820px] border-collapse text-left">
                    <thead>
                      <tr>
                        {["Room", "Description", "Students", "Updated", "Status", "Actions"].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((room) => {
                        const count = room.memberCount ?? room.students.length;
                        return (
                          <tr
                            key={room.id}
                            onClick={() => router.push(`${basePath}/${room.id}`)}
                            className="cursor-pointer border-t-2 border-[var(--qs-line)]/60 transition-colors hover:bg-[var(--qs-bg)]"
                          >
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                                  <Users className="h-4 w-4" strokeWidth={2.5} />
                                </span>
                                <span className="max-w-[200px] truncate font-bold text-[var(--qs-ink)]">{room.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[var(--qs-muted)]">
                              <span className="block max-w-[280px] truncate">{room.description || "—"}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-bold text-[var(--qs-ink)]">{count}</span>
                              <span className="font-medium text-[var(--qs-muted)]"> students</span>
                            </td>
                            <td className="px-3 py-3 text-[var(--qs-muted)]">{timeAgo(room.updatedAt)}</td>
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-block rounded-full border-2 border-current px-[11px] py-px text-xs font-extrabold uppercase tracking-[0.05em]",
                                  room.archived ? "text-[#a85d00]" : "text-[var(--qs-ok)]"
                                )}
                              >
                                {room.archived ? "Archived" : "Active"}
                              </span>
                            </td>
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                aria-label={`Actions for ${room.name}`}
                                onClick={(e) => openActionMenu(e, room.id, room.archived)}
                                className="grid h-[34px] w-[34px] place-items-center rounded-[10px] text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-line)]"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="border-t-0 px-3 py-2.5 text-[10.5px] font-medium text-[var(--qs-muted)] md:border-t-2 md:border-[var(--qs-line)] md:px-[26px] md:py-3.5 md:text-sm">
              Showing {filtered.length} of {stats.rooms} rooms
            </div>
          </div>
        </div>
      </div>

      {/* Create room */}
      <CreateRoomModal
        key={createOpen ? "open" : "closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialTab={createTab}
        onCreated={() => {
          setCreateOpen(false);
        }}
      />

      {/* Add / import students */}
      {addRoomTarget && (
        <AddStudentsModal
          key={addRoomTarget.id}
          open={Boolean(addTarget)}
          onClose={() => setAddTarget(null)}
          existing={addRoomTarget.students}
          roomName={addRoomTarget.name}
          initialTab={addTarget?.tab ?? "manual"}
          roomId={addRoomTarget.id}
          viewStudentsHref={`${basePath}/${addRoomTarget.id}`}
          onAdd={(students) => {
            addStudents(addRoomTarget.id, students);
            setAddTarget(null);
            toast.success({
              title: "Students added",
              description: `${students.length} student${students.length !== 1 ? "s" : ""} added to ${addRoomTarget.name}.`,
            });
          }}
        />
      )}

      {/* Duplicate room */}
      {duplicateRoomTarget && (
        <DuplicateRoomModal
          open={Boolean(duplicateTarget)}
          onClose={() => setDuplicateTarget(null)}
          roomName={duplicateRoomTarget.name}
          onConfirm={(copyStudents) => {
            const copy = duplicateRoom(duplicateRoomTarget.id, { copyStudents });
            if (copy) {
              toast.success({
                title: "Room duplicated",
                description: `"${copy.name}" was created.`,
              });
            }
          }}
        />
      )}

      {/* Edit room */}
      <AnimatePresence>
        {editRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1240]/50 p-4 backdrop-blur-sm"
            onClick={() => setEditTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 shadow-[6px_6px_0_var(--qs-sun)]"
            >
              <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">Edit Room</h3>
              <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">Update this room&apos;s details.</p>
              <EditRoomForm
                key={editRoom.id}
                roomName={editRoom.name}
                roomDescription={editRoom.description ?? ""}
                onCancel={() => setEditTarget(null)}
                onSave={(name, description) => {
                  updateRoom(editRoom.id, { name, description });
                  setEditTarget(null);
                  toast.success({ title: "Room updated", description: "Changes have been saved." });
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row action menu — fixed so the table's overflow never clips it */}
      {actionMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: actionMenu.top, bottom: actionMenu.bottom, right: actionMenu.right }}
          className="fixed z-50 min-w-[170px] rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)]"
        >
          {menuItems(actionMenu.roomId, actionMenu.archived).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActionMenu(null);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] font-bold transition-colors",
                  item.destructive
                    ? "text-[var(--qs-bad)] hover:bg-[var(--qs-bg)]"
                    : "text-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
                )}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyRooms({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
        <Users className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <h2 className="mt-4 text-lg font-black tracking-tight text-[var(--qs-ink)]">Create Your First Room</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-relaxed text-[var(--qs-muted)]">
        Rooms help you organize students and quickly control who can register for your quizzes.
      </p>
      <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
        Once created, your rooms can be reused across all future quizzes.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button onClick={onCreate} className={QS_PRIMARY_BTN}>
          <Plus className="h-4 w-4" strokeWidth={3} />
          Create Room
        </button>
        <button onClick={onImport} className={QS_OUTLINE_BTN}>
          <FileSpreadsheet className="h-4 w-4" />
          Import Students
        </button>
      </div>
    </div>
  );
}

function EditRoomForm({
  roomName,
  roomDescription,
  onCancel,
  onSave,
}: {
  roomName: string;
  roomDescription: string;
  onCancel: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(roomName);
  const [description, setDescription] = useState(roomDescription);

  return (
    <div className="mt-5 space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Room Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">
          Description <span className="font-medium text-[var(--qs-muted)]">(optional)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className={cn(QS_OUTLINE_BTN, "py-2 text-xs")}>
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim()) onSave(name, description);
          }}
          className={cn(QS_PRIMARY_BTN, "py-2 text-xs", !name.trim() && "opacity-50")}
        >
          Save
        </button>
      </div>
    </div>
  );
}
