"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckSquare,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useRoomStore, getOwnedRooms, countRoomQuizUsage } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { timeAgo, isWithinWindow } from "@/lib/formatters";
import { exportStudentsToFile } from "@/utils/excelImport";
import { useToast } from "@/hooks/useToast";
import { RoomStudent } from "@/types/room";
import { getAvatarUrlById } from "@/config/dicebear";
import RoomMenu, { RoomMenuItem } from "@/components/quiz/creator/settings/audience/RoomMenu";
import AddStudentsModal from "@/components/quiz/creator/settings/audience/AddStudentsModal";
import DuplicateRoomModal from "./DuplicateRoomModal";
import DeleteRoomModal from "./DeleteRoomModal";
import EditStudentModal from "./EditStudentModal";
import StudentDetailsPanel from "./StudentDetailsPanel";

type StudentFilter = "all" | "recent" | "issues";
type StudentSort = "default" | "recent" | "name";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
  const rooms = useRoomStore((s) => s.rooms);
  const hydrate = useRoomStore((s) => s.hydrate);
  const addStudents = useRoomStore((s) => s.addStudents);
  const updateStudent = useRoomStore((s) => s.updateStudent);
  const removeStudents = useRoomStore((s) => s.removeStudents);
  const archiveRoom = useRoomStore((s) => s.archiveRoom);
  const unarchiveRoom = useRoomStore((s) => s.unarchiveRoom);
  const duplicateRoom = useRoomStore((s) => s.duplicateRoom);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const { user } = useAuthStore();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [sort, setSort] = useState<StudentSort>("default");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"manual" | "import">("manual");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<RoomStudent | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<RoomStudent | null>(null);
  const [removingStudent, setRemovingStudent] = useState<RoomStudent | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

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

  const filteredStudents = useMemo(() => {
    if (!room) return [];
    const q = query.trim().toLowerCase();
    let list = room.students.filter((s) => {
      if (filter === "recent" && !(s.addedAt && isWithinWindow(s.addedAt, RECENT_WINDOW_MS)))
        return false;
      if (filter === "issues" && !hasStudentIssue(s)) return false;
      if (q && !`${s.name} ${s.rollNumber} ${s.email}`.toLowerCase().includes(q)) return false;
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

  if (!room) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <Users className="mx-auto h-8 w-8 text-text-muted" />
        <h2 className="mt-3 text-lg font-bold text-text-primary">Room not found</h2>
        <p className="mt-1 text-sm text-text-secondary">This room may have been deleted.</p>
        <Link
          href={basePath}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Rooms
        </Link>
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
      room.students.map((s) => ({ name: s.name, rollNumber: s.rollNumber, email: s.email }))
    );
    toast.success({ title: "Export started", description: `${room.students.length} students exported.` });
  };

  const handleRemoveSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
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
      onClick: () => {
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
    { id: "delete", label: "Delete Room", icon: Trash2, destructive: true, onClick: () => setDeleteOpen(true) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={basePath}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-pink-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Rooms
        </Link>
        <RoomMenu items={headerMenuItems} />
      </div>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500 ring-1 ring-inset ring-pink-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">{room.name}</h1>
              {room.archived && (
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning">
                  Archived
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">
              {room.description || "Student group"}
              <span className="mx-1.5 text-text-muted">·</span>
              Updated {timeAgo(room.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover hover:bg-card-hover"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={() => {
              setAddTab("import");
              setAddOpen(true);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover hover:bg-card-hover"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Import
          </button>
          <button
            onClick={() => {
              setAddTab("manual");
              setAddOpen(true);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-3.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <UserRoundPlus className="h-3.5 w-3.5" />
            Add Students
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { label: "Total Students", value: stats.total, icon: Users, tint: "text-pink-500 bg-pink-500/10" },
              { label: "Quizzes Used", value: stats.quizUsage, icon: Eye, tint: "text-violet-500 bg-violet-500/10" },
              { label: "Recently Added", value: stats.recentlyAdded, icon: Plus, tint: "text-success bg-success/10" },
              { label: "Needs Attention", value: stats.issues, icon: AlertTriangle, tint: "text-warning bg-warning/10" },
            ] as Array<{ label: string; value: number; icon: typeof Users; tint: string }>
          ).map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.tint)}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-text-primary">{s.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students..."
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {(
              [
                { id: "all", label: "All" },
                { id: "recent", label: "Recently Added" },
                { id: "issues", label: "Issues" },
              ] as Array<{ id: StudentFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  filter === tab.id ? "bg-pink-500/10 text-pink-500" : "text-text-muted hover:text-text-primary"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as StudentSort)}
            className="h-9 rounded-lg border border-input-border bg-input-bg px-2.5 text-[11px] font-semibold text-text-primary focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
            aria-label="Sort students"
          >
            <option value="default">Default Order</option>
            <option value="recent">Recently Added</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-pink-500/25 bg-pink-500/[0.06] px-3.5 py-2.5"
          >
            <p className="text-xs font-semibold text-text-primary">
              <span className="tabular-nums">{selected.size}</span> selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRemoveSelected}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-danger/25 bg-danger/[0.06] px-3 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-xs font-bold text-text-primary">Students</p>
          <p className="text-xs text-text-muted">
            {filteredStudents.length} of {room.students.length}
          </p>
        </div>

        {room.students.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Users className="mx-auto h-7 w-7 text-text-muted" />
            <p className="mt-3 text-sm font-semibold text-text-primary">No students yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Add students manually or import them from an Excel/CSV file.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setAddTab("manual");
                  setAddOpen(true);
                }}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Students
              </button>
              <button
                onClick={() => {
                  setAddTab("import");
                  setAddOpen(true);
                }}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Import from Excel
              </button>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Search className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-2 text-sm font-semibold text-text-primary">No students match</p>
            <p className="mt-1 text-xs text-text-muted">Try a different search or filter.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5">
                  <button
                    onClick={toggleAllVisible}
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                      allVisibleSelected
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-input-border bg-input-bg"
                    )}
                    aria-label="Select all visible"
                  >
                    {allVisibleSelected && <CheckSquare className="h-3 w-3" />}
                  </button>
                </th>
                <th className="px-2 py-2.5">Student</th>
                <th className="hidden px-2 py-2.5 md:table-cell">Roll</th>
                <th className="hidden px-2 py-2.5 lg:table-cell">Email</th>
                <th className="hidden px-2 py-2.5 sm:table-cell">Added</th>
                <th className="px-2 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const issue = hasStudentIssue(student);
                return (
                  <tr
                    key={student.id}
                    onClick={() => setDetailsStudent(student)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelected(student.id)}
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          selected.has(student.id)
                            ? "border-pink-500 bg-pink-500 text-white"
                            : "border-input-border bg-input-bg"
                        )}
                        aria-label={`Select ${student.name}`}
                      >
                        {selected.has(student.id) && <CheckSquare className="h-3 w-3" />}
                      </button>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getAvatarUrlById(student.avatarId)}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-text-primary">
                            {student.name}
                            {issue && (
                              <AlertTriangle className="ml-1.5 inline h-3 w-3 text-warning" />
                            )}
                          </p>
                          <p className="truncate text-[10px] text-text-muted sm:hidden">
                            {student.rollNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 font-mono text-xs text-text-secondary md:table-cell">
                      {student.rollNumber}
                    </td>
                    <td className="hidden px-2 py-3 text-xs text-text-secondary lg:table-cell">
                      {student.email}
                    </td>
                    <td className="hidden px-2 py-3 text-xs text-text-muted sm:table-cell">
                      {student.addedAt ? timeAgo(student.addedAt) : "—"}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          student.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        )}
                      >
                        <span
                          className={cn("h-1 w-1 rounded-full", student.active ? "bg-success" : "bg-warning")}
                        />
                        {student.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* Delete */}
      <DeleteRoomModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        roomName={room.name}
        onConfirm={() => {
          deleteRoom(room.id);
          window.location.href = basePath;
          toast.success({ title: "Room deleted", description: "The room was permanently removed." });
        }}
      />

      {/* Edit student */}
      <EditStudentModal
        open={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        student={editingStudent}
        onSave={(patch) => {
          if (editingStudent) {
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setRemovingStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <h3 className="text-base font-bold text-text-primary">Remove Student</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Remove <span className="font-semibold text-text-primary">{removingStudent.name}</span> from{" "}
                <span className="font-semibold text-text-primary">{room.name}</span>? The student&apos;s
                profile is not deleted and they can be re-added later.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setRemovingStudent(null)}
                  className="h-9 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeStudents(room.id, [removingStudent.id]);
                    setRemovingStudent(null);
                    toast.success({ title: "Student removed", description: `${removingStudent.name} was removed from ${room.name}.` });
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-danger to-rose-600 px-4 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

function hasStudentIssue(student: RoomStudent): boolean {
  const validEmail = student.email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email.trim());
  return !student.active || !student.rollNumber.trim() || !validEmail;
}