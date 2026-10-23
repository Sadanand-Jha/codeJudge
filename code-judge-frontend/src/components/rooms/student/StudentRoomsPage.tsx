"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useAuthStore } from "@/store/authStore";
import { type EnrolledRoom } from "@/services/rooms";
import { useStudentRooms } from "./StudentRoomsProvider";

type RoomFilter = "all" | "active" | "archived";
type RoomSort = "recent" | "name" | "members";

const FILTERS: Array<{ id: RoomFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

const SORTS: Array<{ id: RoomSort; label: string }> = [
  { id: "recent", label: "Recently joined" },
  { id: "name", label: "Name A–Z" },
  { id: "members", label: "Most members" },
];

const QS_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

function teacherName(room: EnrolledRoom): string {
  return (
    room.owner.displayName?.trim() ||
    room.owner.username?.trim() ||
    "Your teacher"
  );
}

function timestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function StudentRoomsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [sort, setSort] = useState<RoomSort>("recent");
  const { rooms, loading, error, reload } = useStudentRooms();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/rooms/my")}`);
    }
  }, [hasHydrated, isAuthenticated, router]);

  const stats = useMemo(() => {
    const active = rooms.filter((room) => room.is_active).length;
    return {
      rooms: rooms.length,
      teachers: new Set(rooms.map((room) => room.owner.id)).size,
      active,
      archived: rooms.length - active,
    };
  }, [rooms]);

  const filterCounts: Record<RoomFilter, number> = {
    all: stats.rooms,
    active: stats.active,
    archived: stats.archived,
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rooms.filter((room) => {
      if (filter === "active" && !room.is_active) return false;
      if (filter === "archived" && room.is_active) return false;
      if (!q) return true;
      const owner = `${room.owner.username ?? ""} ${room.owner.displayName ?? ""}`;
      return `${room.name} ${room.description ?? ""} ${room.room_code} ${owner}`
        .toLowerCase()
        .includes(q);
    });

    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "members") return b.member_count - a.member_count;
      return (
        timestamp(b.joined_at ?? b.updated_at) -
        timestamp(a.joined_at ?? a.updated_at)
      );
    });
  }, [filter, query, rooms, sort]);

  const statCards = [
    { label: "Rooms", value: stats.rooms, sub: "joined", color: "var(--qs-brand)", hi: true },
    { label: "Teachers", value: stats.teachers, sub: "teaching", color: "#2457d6" },
    { label: "Active", value: stats.active, sub: "rooms", color: "var(--qs-ok)" },
    { label: "Archived", value: stats.archived, sub: "rooms", color: "#a85d00" },
  ];

  if (!hasHydrated) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--qs-brand)]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 pb-20 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[34px]">
              My Rooms
            </h1>
            <p className="mt-0.5 truncate text-[var(--qs-muted)]">
              Your joined classrooms — open a room to meet your teacher and classmates.
            </p>
          </div>
          <Link
            href="/rooms"
            className={cn(QS_PRIMARY_BTN, "rounded-[12px] px-3.5 py-[9px]")}
          >
            <UserPlus className="h-4 w-4" strokeWidth={3} />
            Join a Room
          </Link>
        </div>

        {loading ? (
          <>
            <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mb-5 sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="min-w-[132px] flex-1 shrink-0 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 sm:min-w-0 sm:rounded-[18px] sm:p-4"
                >
                  <div className="app-skeleton h-3 w-16 rounded sm:w-20" />
                  <div className="app-skeleton mt-3 h-6 w-12 rounded sm:h-7 sm:w-14" />
                </div>
              ))}
            </div>
            <div className="relative mb-4 mr-4">
              <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
              <div className="relative rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4">
                <div className="app-skeleton h-5 w-28 rounded" />
                <div className="app-skeleton mt-2 h-4 w-72 max-w-full rounded" />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[18px] border-2 border-[var(--qs-line)] p-4"
                    >
                      <div className="app-skeleton h-10 w-10 rounded-[12px]" />
                      <div className="app-skeleton mt-3 h-5 w-36 rounded" />
                      <div className="app-skeleton mt-2 h-3.5 w-48 rounded" />
                      <div className="app-skeleton mt-5 h-10 w-full rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : error ? (
          <div className="rounded-[26px] border-2 border-dashed border-[var(--qs-bad)] bg-[var(--qs-surface)] px-6 py-14 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[var(--qs-bad)]" />
            <h2 className="mt-3 text-lg font-black text-[var(--qs-ink)]">
              Couldn&apos;t load your rooms
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--qs-muted)]">{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mb-5 sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
              {statCards.map((kpi) => (
                <div
                  key={kpi.label}
                  className={cn(
                    "min-w-[136px] flex-1 shrink-0 rounded-[16px] border-2 p-3 sm:min-w-0 sm:rounded-[18px] sm:p-4 sm:px-[18px]",
                    kpi.hi
                      ? "border-[var(--qs-ink)] bg-[var(--qs-sun)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                  )}
                >
                  <small
                    className={cn(
                      "flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] sm:gap-2 sm:text-xs",
                      kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-muted)]"
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5"
                      style={{ background: kpi.color }}
                    />
                    {kpi.label}
                  </small>
                  <b
                    className={cn(
                      "mt-1.5 block text-[24px] font-extrabold leading-[1.1] sm:mt-2 sm:text-[32px] lg:text-[36px]",
                      kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-ink)]"
                    )}
                  >
                    {kpi.value}
                    <span
                      className={cn(
                        "ml-1 text-xs font-medium sm:text-sm",
                        kpi.hi ? "text-[#1A1240]" : "text-[var(--qs-muted)]"
                      )}
                    >
                      {kpi.sub}
                    </span>
                  </b>
                </div>
              ))}
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-[0_1_290px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search rooms or teachers…"
                  aria-label="Search your rooms"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
                {FILTERS.map((item) => {
                  const active = filter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(item.id)}
                      className={cn(
                        "rounded-full border-2 px-[13px] py-1.5 text-xs font-extrabold uppercase tracking-[0.06em] transition-colors",
                        active
                          ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                      )}
                    >
                      {item.label}
                      <i
                        className={cn(
                          "ml-1.5 not-italic",
                          active ? "opacity-70" : "text-[var(--qs-muted)]"
                        )}
                      >
                        {filterCounts[item.id]}
                      </i>
                    </button>
                  );
                })}
              </div>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as RoomSort)}
                aria-label="Sort rooms"
                className="w-full shrink-0 cursor-pointer rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-[9px] text-sm font-bold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)] focus:border-[var(--qs-brand)] sm:w-auto"
              >
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    Sort: {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative mb-4 mr-4">
              <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
              <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
                <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px]">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
                      Rooms
                    </h2>
                    <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
                      Your classrooms — open a card to see classmates and updates.
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[var(--qs-muted)]">
                    {filtered.length} of {stats.rooms}
                  </p>
                </header>

                {stats.rooms === 0 ? (
                  <div className="border-t-2 border-[var(--qs-line)] px-6 py-12 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                      <Users className="h-7 w-7" strokeWidth={2.5} />
                    </div>
                    <h3 className="mt-4 text-lg font-black tracking-tight text-[var(--qs-ink)]">
                      Join your first room
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-relaxed text-[var(--qs-muted)]">
                      Use the room code and password your teacher shared. Your joined
                      classrooms will appear here as cards.
                    </p>
                    <Link href="/rooms" className={cn(QS_PRIMARY_BTN, "mt-5")}>
                      <UserPlus className="h-4 w-4" strokeWidth={3} />
                      Join a Room
                    </Link>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="border-t-2 border-[var(--qs-line)]/60 px-4 py-10 text-center">
                    <Search className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
                    <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">
                      No rooms match this search or filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                      className="mt-3 text-sm font-bold text-[var(--qs-brand)] underline-offset-4 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 border-t-2 border-[var(--qs-line)] p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                    {filtered.map((room) => (
                      <RoomCard key={room.id} room={room} />
                    ))}
                  </div>
                )}

                <div className="border-t-2 border-[var(--qs-line)] px-4 py-3.5 text-sm font-medium text-[var(--qs-muted)] sm:px-[26px]">
                  Showing {filtered.length} of {stats.rooms} room{stats.rooms === 1 ? "" : "s"}
                </div>
              </div>
            </div>
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

      <div className="mt-3 min-w-0 flex-1">
        <h3 className="truncate text-lg font-black tracking-tight text-[var(--qs-ink)]">
          {room.name}
        </h3>
        <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[13px] text-[var(--qs-muted)]">
          {room.description || "Classroom room"}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2.5 border-t-2 border-[var(--qs-line)] pt-3">
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
    "group flex h-full flex-col rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--qs-ink)] hover:shadow-[3px_3px_0_var(--qs-sun)]";

  if (!room.is_active) {
    return <div className={cn(className, "opacity-70")}>{content}</div>;
  }

  return (
    <Link href={`/rooms/${room.id}`} className={className}>
      {content}
    </Link>
  );
}
