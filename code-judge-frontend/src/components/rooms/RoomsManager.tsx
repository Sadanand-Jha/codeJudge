"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { MAX_ROOMS_PER_CREATOR } from "@/lib/constants";
import { useRoomStore, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { timeAgo, isWithinWindow } from "@/lib/formatters";
import { exportStudentsToFile } from "@/utils/excelImport";
import { useToast } from "@/hooks/useToast";
import RoomMenu, { RoomMenuItem } from "@/components/quiz/creator/settings/audience/RoomMenu";
import SortDropdown from "@/components/ui/SortDropdown";
import CreateRoomModal from "@/components/quiz/creator/settings/audience/CreateRoomModal";
import AddStudentsModal from "@/components/quiz/creator/settings/audience/AddStudentsModal";
import DuplicateRoomModal from "./DuplicateRoomModal";
import DeleteRoomModal from "./DeleteRoomModal";

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
  const rooms = useRoomStore((s) => s.rooms);
  const hydrate = useRoomStore((s) => s.hydrate);
  const setRooms = useRoomStore((s) => s.setRooms);
  const archiveRoom = useRoomStore((s) => s.archiveRoom);
  const unarchiveRoom = useRoomStore((s) => s.unarchiveRoom);
  const duplicateRoom = useRoomStore((s) => s.duplicateRoom);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const addStudents = useRoomStore((s) => s.addStudents);
  const { user } = useAuthStore();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"manual" | "import">("manual");
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addTarget, setAddTarget] = useState<{ roomId: string; tab: "manual" | "import" } | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    hydrate();
    // Fetch rooms from backend on going to rooms page — calls GET /my-rooms
    setLoadingRooms(true);
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

  // Only rooms owned by the authenticated admin.
  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);

  const stats = useMemo(() => {
    const active = ownedRooms.filter((r) => !r.archived);
    const students = ownedRooms.reduce((sum, r) => sum + (r.memberCount ?? r.students.length), 0);
    return {
      rooms: ownedRooms.length,
      students,
      active: active.length,
      archived: ownedRooms.length - active.length,
    };
  }, [ownedRooms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = ownedRooms.filter((r) => {
      if (filter === "active" && r.archived) return false;
      if (filter === "archived" && !r.archived) return false;
      if (filter === "recent" && (r.archived || !isWithinWindow(r.updatedAt, RECENT_WINDOW_MS))) return false;
      if (q && !`${r.name} ${r.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "students") return b.students.length - a.students.length;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [ownedRooms, filter, query, sort]);

  const editRoom = editTarget ? ownedRooms.find((r) => r.id === editTarget) : null;
  const duplicateRoomTarget = duplicateTarget ? ownedRooms.find((r) => r.id === duplicateTarget) : null;
  const deleteRoomTarget = deleteTarget ? ownedRooms.find((r) => r.id === deleteTarget) : null;
  const addRoomTarget = addTarget ? ownedRooms.find((r) => r.id === addTarget.roomId) : null;

  const handleExport = (roomId: string) => {
    const room = ownedRooms.find((r) => r.id === roomId);
    if (!room) return;
    exportStudentsToFile(
      room.name.replace(/[^\w\s-]/g, ""),
      room.students.map((s) => ({ name: s.name, rollNumber: s.rollNumber, username: s.username ?? (s as unknown as { email?: string }).email?.split("@")[0] ?? "" }))
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
    {
      id: "delete",
      label: "Delete Room",
      icon: Trash2,
      destructive: true,
      onClick: () => setDeleteTarget(roomId),
    },
  ];

  // Full-page loading screen while rooms & students are fetched from the backend
  if (loadingRooms) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-card px-8 py-12 text-center shadow-lg">
          <div className="relative mx-auto h-14 w-14">
            <Loader2 className="h-14 w-14 animate-spin text-pink-500" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-text-primary">Loading your rooms…</h2>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-text-secondary">
            Fetching students from the backend. This will only take a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">My Rooms</h1>
          <p className="mt-1.5 text-sm text-text-secondary sm:mt-2">
            Create and manage student groups that you can reuse across your quizzes.
          </p>
        </div>
                <button
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
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98] sm:h-11 sm:px-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create Room
        </button>
      </div>

      {/* Room limit hint */}
      {ownedRooms.length >= MAX_ROOMS_PER_CREATOR && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          You&apos;ve reached the maximum of {MAX_ROOMS_PER_CREATOR} rooms. Remove or archive a room to create a new one.
        </p>
      )}

      {/* Room Overview stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 lg:grid-cols-4 lg:gap-4">
        {(
          [
            { label: "Rooms", value: stats.rooms, icon: Users, tint: "text-pink-500 bg-pink-500/10" },
            { label: "Students", value: stats.students, icon: Users, tint: "text-violet-500 bg-violet-500/10" },
            { label: "Active Rooms", value: stats.active, icon: Archive, tint: "text-success bg-success/10" },
            { label: "Archived", value: stats.archived, icon: ArchiveRestore, tint: "text-text-muted bg-white/[0.04]" },
          ] as Array<{ label: string; value: number; icon: typeof Users; tint: string }>
        ).map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9", s.tint)}>
              <s.icon className="h-4 w-4 sm:h-4 sm:w-4" />
            </div>
            <p className="mt-2.5 text-xl font-bold tabular-nums text-text-primary sm:text-2xl">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-text-muted sm:text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters + sort */}
      <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative w-full sm:max-w-[340px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms..."
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10 sm:h-12"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:gap-3">
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors sm:px-4 sm:py-2.5 sm:text-xs",
                  filter === tab.id ? "bg-pink-500/10 text-pink-500" : "text-text-muted hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <SortDropdown
            options={SORTS.map((s) => ({ id: s.id, label: s.label }))}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            ariaLabel="Sort rooms"
          />
        </div>
      </div>

      {/* Cards */}
      <div className="mt-4 sm:mt-5">
        {ownedRooms.length === 0 ? (
          <EmptyRooms onCreate={() => setCreateOpen(true)} onImport={() => {
            setCreateTab("import");
            setCreateOpen(true);
          }} />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
            <Search className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-3 text-sm font-semibold text-text-primary">No rooms found</p>
            <p className="mt-1 text-xs text-text-muted">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {filtered.map((room) => (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col rounded-xl border p-3.5 transition-all duration-200 sm:p-4",
                  room.archived
                    ? "border-border bg-card/50 opacity-70"
                    : "border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-pink-500/30 hover:shadow-[0_10px_28px_rgba(236,72,153,0.09)]"
                )}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 ring-1 ring-inset ring-pink-500/15 sm:h-10 sm:w-10">
                    <Users className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {room.archived && (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning sm:px-2.5 sm:py-0.5 sm:text-[10px]">
                        Archived
                      </span>
                    )}
                    <RoomMenu items={menuItems(room.id, room.archived)} />
                  </div>
                </div>

                <div className="mt-3 flex min-w-0 flex-col">
                  <Link
                    href={`${basePath}/${room.id}`}
                    className="block truncate text-sm font-bold text-text-primary transition-colors hover:text-pink-500 sm:text-[15px]"
                  >
                    {room.name}
                  </Link>
                  <p className="mt-0.5 truncate text-[11px] text-text-secondary sm:text-xs">
                    {room.description || `${room.memberCount ?? room.students.length} students`}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10px] text-text-muted sm:text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="font-bold text-text-primary tabular-nums">{room.memberCount ?? room.students.length}</span>{" "}
                    student{(room.memberCount ?? room.students.length) !== 1 ? "s" : ""}
                  </span>
                  <span>{timeAgo(room.updatedAt)}</span>
                </div>

                <Link
                  href={`${basePath}/${room.id}`}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-[11px] font-semibold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 sm:text-xs"
                >
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  View Students
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create room */}
      <CreateRoomModal
        key={createOpen ? "open" : "closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialTab={createTab}
        onCreated={() => {
          setCreateOpen(false);
          toast.success({ title: "Room created", description: "Your room is ready to use." });
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

      {/* Delete room */}
      {deleteRoomTarget && (
        <DeleteRoomModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          roomName={deleteRoomTarget.name}
          onConfirm={() => {
            deleteRoom(deleteRoomTarget.id);
            toast.success({ title: "Room deleted", description: "The room was permanently removed." });
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setEditTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <h3 className="text-base font-bold text-text-primary">Edit Room</h3>
              <p className="mt-0.5 text-xs text-text-secondary">Update this room&apos;s details.</p>
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
    </div>
  );
}

function EmptyRooms({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 ring-1 ring-inset ring-pink-500/20">
        <Users className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-text-primary">Create Your First Room</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-text-secondary">
        Rooms help you organize students and quickly control who can register for your quizzes.
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Once created, your rooms can be reused across all future quizzes.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onCreate}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Create Room
        </button>
        <button
          onClick={onImport}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover hover:bg-card-hover"
        >
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
        <label className="mb-1.5 block text-xs font-semibold text-text-primary">Room Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-primary">
          Description <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="h-9 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim()) onSave(name, description);
          }}
          className={cn(
            "h-9 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]",
            !name.trim() && "opacity-50"
          )}
        >
          Save
        </button>
      </div>
    </div>
  );
}