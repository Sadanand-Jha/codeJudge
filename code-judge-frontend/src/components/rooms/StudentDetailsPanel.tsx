"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Pencil, Trash2, Users, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { Room, RoomStudent } from "@/types/room";
import { getStudentRooms } from "@/store/roomStore";
import { getAvatarUrlById } from "@/config/dicebear";
import { fetchRoomsForStudent } from "@/services/rooms";

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
  const [backendRooms, setBackendRooms] = useState<Room[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = student?.username ?? student?.rollNumber ?? null;

  useEffect(() => {
    if (!key) return;
    let disposed = false;
    fetchRoomsForStudent(key)
      .then((result) => {
        if (disposed) return;
        setBackendRooms(result);
        setLoadedKey(key);
      })
      .catch(() => {
        if (disposed) return;
        setBackendRooms([]);
        setLoadedKey(key);
      });
    return () => {
      disposed = true;
    };
  }, [key]);

  const loadingRooms = Boolean(key) && loadedKey !== key;

  // Prefer backend rooms (owner is creator) — fallback to local getStudentRooms for offline/mock
  const localRooms = student ? getStudentRooms(rooms, student.rollNumber) : [];
  const roomsForStudent = key && loadedKey === key && backendRooms !== null ? backendRooms : localRooms;

  return (
    <AnimatePresence>
      {student && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#1A1240]/55 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-[95] h-full w-full max-w-md overflow-y-auto border-l-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-4">
              <div>
                <h3 className="text-base font-extrabold text-[var(--qs-ink)]">Student Details</h3>
                <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">Profile & room membership</p>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Identity — avatar from backend */}
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured and may be remote */}
                <img
                  src={student.avatarUrl || getAvatarUrlById(student.avatarId)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
                />
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-extrabold text-[var(--qs-ink)]">{student.name}</h4>
                  <p className="text-xs font-medium text-[var(--qs-muted)]">{student.rollNumber}</p>
                  <div className="mt-1.5">
                    <span
                      className={cn(
                        "inline-block rounded-full border-2 border-current px-[11px] py-px text-xs font-extrabold uppercase tracking-[0.05em]",
                        student.active ? "text-[var(--qs-ok)]" : "text-[#a85d00]"
                      )}
                    >
                      {student.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                    Roll Number
                  </p>
                  <p className="mt-0.5 truncate font-mono text-sm font-extrabold text-[var(--qs-ink)]">
                    {student.rollNumber}
                  </p>
                </div>
                <div className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                    Username
                  </p>
                  <p className="mt-0.5 truncate text-sm font-extrabold text-[var(--qs-ink)]">
                    @{student.username ?? "—"}
                  </p>
                </div>
              </div>

              {student.username ? (
                <Link
                  href={`/students/${encodeURIComponent(student.username)}`}
                  onClick={onClose}
                  className="group flex items-center justify-between gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 text-sm font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  View public profile
                  <ArrowRight className="h-4 w-4 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
                </Link>
              ) : null}

              {student.registrationData && Object.keys(student.registrationData).length > 0 ? (
                <div>
                  <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                    Registration answers
                  </h4>
                  <div className="space-y-1.5">
                    {Object.entries(student.registrationData).map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2"
                      >
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                          {label}
                        </p>
                        <p className="mt-0.5 break-words text-xs font-bold text-[var(--qs-ink)]">
                          {value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Rooms membership */}
              <div>
                <h4 className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Rooms
                </h4>
                <div className="space-y-1.5">
                  {loadingRooms && (
                    <p className="text-xs font-medium text-[var(--qs-muted)]">
                      Loading rooms where admin is creator…
                    </p>
                  )}
                  {!loadingRooms && roomsForStudent.length === 0 && (
                    <p className="text-xs font-medium text-[var(--qs-muted)]">
                      This student is not in any room where you are admin.
                    </p>
                  )}
                  {roomsForStudent.map((room) => (
                    <Link
                      key={room.id}
                      href={`/creator/rooms/${room.id}`}
                      onClick={onClose}
                      className="group flex items-center gap-2.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 transition-colors hover:border-[var(--qs-brand)]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                        <Users className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">
                          {room.name}
                        </span>
                        <span className="block text-[10px] font-medium text-[var(--qs-muted)]">
                          {(room.memberCount ?? room.students.length)} student
                          {(room.memberCount ?? room.students.length) !== 1 ? "s" : ""}
                          {room.archived ? " · Archived" : ""}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
                    </Link>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
                  Students can belong to multiple rooms. Eligibility counts them only once.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={onRemove}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] text-xs font-extrabold text-[var(--qs-bad)] transition-colors hover:border-[var(--qs-bad)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
              <button
                onClick={onClose}
                className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
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
