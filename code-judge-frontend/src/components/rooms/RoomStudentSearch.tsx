"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserRound } from "lucide-react";
import { getRoom } from "@/services/rooms";
import type { Room } from "@/types/room";
import { cn } from "@/lib/helpers";

interface SearchableStudent {
  key: string;
  name: string;
  username: string;
  roll: string;
  roomId: string;
  roomName: string;
}

function mapStudent(
  member: Record<string, unknown>,
  room: Room,
  index: number
): SearchableStudent {
  const userObj = (member.user as Record<string, unknown>) ?? member;
  const username = String(
    (userObj.username as string) ?? (member.username as string) ?? ""
  );
  const name =
    String((userObj.displayName as string) ?? "").trim() ||
    [userObj.firstName, userObj.lastName].filter(Boolean).join(" ").trim() ||
    username ||
    "Student";
  return {
    key: `${room.id}-${String(userObj.id ?? member.userId ?? index)}`,
    name,
    username,
    roll: String((member.roll_number as string) ?? (member.rollNumber as string) ?? username),
    roomId: room.id,
    roomName: room.name,
  };
}

export default function RoomStudentSearch({
  rooms,
  basePath,
}: {
  rooms: Room[];
  basePath: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestedRef = useRef(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<SearchableStudent[] | null>(null);

  const loadStudents = useCallback(async () => {
    if (requestedRef.current || students !== null) return;
    requestedRef.current = true;
    setLoading(true);
    try {
      const results = await Promise.all(
        rooms.map(async (room) => {
          try {
            const data = (await getRoom(room.id)) as Record<string, unknown>;
            const members = (data?.members ?? []) as Array<Record<string, unknown>>;
            return members
              .filter((member) => member && (member.statusName !== "INACTIVE" || member.active))
              .map((member, index) => mapStudent(member, room, index));
          } catch {
            return [] as SearchableStudent[];
          }
        })
      );
      setStudents(results.flat());
    } finally {
      setLoading(false);
    }
  }, [rooms, students]);

  const handleFocus = () => {
    setOpen(true);
    if (rooms.length > 0) void loadStudents();
  };

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !students) return [];
    return students
      .filter((student) =>
        `${student.name} ${student.username} ${student.roll}`.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [query, students]);

  const selectStudent = (student: SearchableStudent) => {
    setOpen(false);
    setQuery("");
    router.push(
      `${basePath}/${student.roomId}?student=${encodeURIComponent(student.name)}`
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative mb-4 w-full sm:max-w-md"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (students === null && rooms.length > 0) void loadStudents();
        }}
        onFocus={handleFocus}
        placeholder="Search a student across rooms…"
        aria-label="Search a student across rooms"
        className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
      />

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[4px_4px_0_var(--qs-sun)]">
          {loading ? (
            <p className="flex items-center gap-2 px-3.5 py-3 text-xs font-semibold text-[var(--qs-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching students…
            </p>
          ) : matches.length === 0 ? (
            <p className="px-3.5 py-3 text-xs font-semibold text-[var(--qs-muted)]">
              {students === null
                ? "Open a room to load its students, then try again."
                : "No student matches this search."}
            </p>
          ) : (
            <ul className="max-h-[280px] overflow-y-auto p-1.5">
              {matches.map((student) => (
                <li key={student.key}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectStudent(student);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left",
                      "transition-colors hover:bg-[var(--qs-bg)] focus:bg-[var(--qs-bg)] focus:outline-none"
                    )}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                      <UserRound className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">
                        {student.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold text-[var(--qs-muted)]">
                        {student.username ? `@${student.username} · ` : ""}
                        {student.roomName}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
