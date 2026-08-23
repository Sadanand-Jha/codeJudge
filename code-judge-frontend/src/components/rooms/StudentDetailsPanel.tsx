"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, AtSign, Check, Pencil, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { Room, RoomStudent } from "@/types/room";
import { getStudentRooms } from "@/store/roomStore";
import { getAvatarUrlById } from "@/config/dicebear";

interface StudentDetailsPanelProps {
  student: RoomStudent | null;
  /** All owned rooms (used to resolve the student's other rooms). */
  rooms: Room[];
  onClose: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

/**
 * Slide-over details for a single student. Shows the student's identity plus
 * every room they belong to — a student can belong to multiple rooms.
 */
export default function StudentDetailsPanel({
  student,
  rooms,
  onClose,
  onEdit,
  onRemove,
}: StudentDetailsPanelProps) {
  const roomsForStudent = student ? getStudentRooms(rooms, student.rollNumber) : [];

  return (
    <AnimatePresence>
      {student && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[95] flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">Student</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Profile & room membership</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Identity — avatar from backend */}
              <div className="flex items-center gap-3.5">
                <img
                  src={student.avatarUrl || getAvatarUrlById(student.avatarId)}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-text-primary">{student.name}</p>
                  <span
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      student.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}
                  >
                    <span className={cn("h-1 w-1 rounded-full", student.active ? "bg-success" : "bg-warning")} />
                    {student.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Roll Number
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
                    {student.rollNumber}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    <AtSign className="h-3 w-3" />
                    Username
                  </p>
                  <p className="mt-1 truncate text-sm text-text-primary">@{student.username ?? student.email?.split("@")[0] ?? "—"}</p>
                </div>
              </div>

              {/* Rooms membership */}
              <div className="mt-6">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  <Users className="h-3 w-3" />
                  Rooms
                </p>
                <div className="mt-2 space-y-1.5">
                  {roomsForStudent.length === 0 && (
                    <p className="text-xs text-text-muted">This student is not in any room.</p>
                  )}
                  {roomsForStudent.map((room) => (
                    <Link
                      key={room.id}
                      href={`/creator/rooms/${room.id}`}
                      onClick={onClose}
                      className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-border-hover"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-text-primary">
                          {room.name}
                        </span>
                        <span className="block text-[10px] text-text-muted">
                          {room.students.length} student{room.students.length !== 1 ? "s" : ""}
                          {room.archived ? " · Archived" : ""}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-pink-500" />
                    </Link>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-text-muted">
                  Students can belong to multiple rooms. Eligibility counts them only once.
                </p>
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={onRemove}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-danger/25 bg-danger/[0.06] text-xs font-bold text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <button
                onClick={onClose}
                className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}