"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getAvatarUrlById } from "@/config/dicebear";
import { timeAgo } from "@/lib/formatters";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAuthStore } from "@/store/authStore";
import { getEnrolledRooms, type EnrolledRoom } from "@/services/rooms";

function teacherName(room: EnrolledRoom): string {
  return (
    room.owner.displayName?.trim() ||
    room.owner.username?.trim() ||
    "Your teacher"
  );
}

export default function StudentRoomsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [rooms, setRooms] = useState<EnrolledRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRooms(await getEnrolledRooms());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "We couldn't load your rooms."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/rooms/my")}`);
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    void loadRooms();
  }, [hasHydrated, isAuthenticated, loadRooms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const owner = `${room.owner.username ?? ""} ${room.owner.displayName ?? ""}`;
      return `${room.name} ${room.description ?? ""} ${owner}`.toLowerCase().includes(q);
    });
  }, [query, rooms]);

  const teacherCount = useMemo(
    () => new Set(rooms.map((room) => room.owner.id)).size,
    [rooms]
  );

  if (!hasHydrated) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--qs-brand)]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-6 pb-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-[var(--qs-sun)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#1A1240]">
              Student rooms
            </span>
            <h1 className="qs-display mt-3 text-[clamp(30px,4vw,42px)] text-[var(--qs-ink)]">
              My Rooms
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-[var(--qs-muted)]">
              Every classroom you&apos;ve joined. Open a room to see your teacher and
              classmates.
            </p>
          </div>
          <Link
            href="/rooms"
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            <UserPlus className="h-4 w-4" />
            Join a room
          </Link>
        </div>

        {!loading && !error && rooms.length > 0 ? (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:max-w-md">
            <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Joined rooms
              </p>
              <p className="mt-0.5 text-2xl font-extrabold text-[var(--qs-ink)]">
                {rooms.length}
              </p>
            </div>
            <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                Teachers
              </p>
              <p className="mt-0.5 text-2xl font-extrabold text-[var(--qs-ink)]">
                {teacherCount}
              </p>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5"
              >
                <div className="app-skeleton h-10 w-10 rounded-[12px]" />
                <div className="app-skeleton mt-4 h-5 w-40 rounded" />
                <div className="app-skeleton mt-2 h-3.5 w-56 rounded" />
                <div className="app-skeleton mt-5 h-9 w-full rounded-[10px]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-bad)] bg-[var(--qs-surface)] px-6 py-14 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[var(--qs-bad)]" />
            <h2 className="mt-3 text-lg font-black text-[var(--qs-ink)]">
              Couldn&apos;t load your rooms
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--qs-muted)]">{error}</p>
            <button
              type="button"
              onClick={() => void loadRooms()}
              className="mt-5 inline-flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
              <Users className="h-7 w-7" strokeWidth={2.5} />
            </span>
            <h2 className="mt-4 text-lg font-black tracking-tight text-[var(--qs-ink)]">
              No rooms yet
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-relaxed text-[var(--qs-muted)]">
              Join a classroom with the room code and password your teacher shared on
              WhatsApp. Your rooms will show up here.
            </p>
            <Link
              href="/rooms"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              <UserPlus className="h-4 w-4" />
              Join your first room
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search rooms or teachers…"
                  aria-label="Search your rooms"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                />
              </div>
              <p className="text-sm font-medium text-[var(--qs-muted)]">
                {filtered.length} of {rooms.length} room{rooms.length === 1 ? "" : "s"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-12 text-center">
                <Search className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
                <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">
                  No rooms match “{query.trim()}”.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-3 text-sm font-bold text-[var(--qs-brand)] underline-offset-4 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {filtered.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: EnrolledRoom }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
          <Users className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border-2 border-current px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em]",
            room.is_active ? "text-[var(--qs-ok)]" : "text-[#a85d00]"
          )}
        >
          {room.is_active ? "Active" : "Archived"}
        </span>
      </div>

      <div className="mt-4 min-w-0">
        <h2 className="truncate text-lg font-black tracking-tight text-[var(--qs-ink)]">
          {room.name}
        </h2>
        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[13px] text-[var(--qs-muted)]">
          {room.description || "Classroom room"}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2.5 border-t-2 border-[var(--qs-line)] pt-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- teacher avatars may be remote */}
        <img
          src={room.owner.avatarUrl || getAvatarUrlById(room.owner.avatarId ?? 1)}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-[var(--qs-ink)]">
            {teacherName(room)}
          </p>
          <p className="truncate text-[11px] text-[var(--qs-muted)]">
            {room.owner.username ? `@${room.owner.username}` : "Teacher"}
          </p>
        </div>
        {room.is_active ? (
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-[var(--qs-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {room.member_count} member{room.member_count === 1 ? "" : "s"}
        </span>
        {room.joined_at ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Joined {timeAgo(room.joined_at)}
          </span>
        ) : null}
      </div>
    </>
  );

  const className =
    "group flex flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 transition-all hover:border-[var(--qs-ink)] hover:shadow-[4px_4px_0_var(--qs-sun)]";

  if (!room.is_active) {
    return <div className={cn(className, "opacity-70")}>{content}</div>;
  }

  return (
    <Link href={`/rooms/${room.id}`} className={className}>
      {content}
    </Link>
  );
}
