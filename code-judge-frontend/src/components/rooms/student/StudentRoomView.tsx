"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  Loader2,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getAvatarUrlById } from "@/config/dicebear";
import { timeAgo } from "@/lib/formatters";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAuthStore } from "@/store/authStore";
import {
  useRoomContentStore,
  type RoomAnnouncement,
  type RoomDocument,
} from "@/store/roomContentStore";
import {
  getRoomSummary,
  type RoomMember,
  type RoomSummary,
} from "@/services/rooms";
import { getCreatorStats, type CreatorPublicStats } from "@/services/quiz";
import TeacherPublicCard from "@/components/rooms/public/TeacherPublicCard";
import RoomDocumentsPanel from "@/components/rooms/RoomDocumentsPanel";
import RoomAnnouncementsPanel from "@/components/rooms/RoomAnnouncementsPanel";

const QS_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none";

const QS_OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

function teacherName(room: RoomSummary): string {
  return (
    room.owner?.displayName?.trim() ||
    room.owner?.username?.trim() ||
    "Your teacher"
  );
}

function memberName(member: RoomMember): string {
  return (
    member.displayName?.trim() ||
    [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
    member.username
  );
}

function memberAvatar(member: RoomMember): string {
  return member.avatarUrl || getAvatarUrlById(member.avatarId ?? 1);
}

export default function StudentRoomView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const announcements = useRoomContentStore((s) => s.announcements);
  const documents = useRoomContentStore((s) => s.documents);
  const seedRoom = useRoomContentStore((s) => s.seedRoom);

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [teacher, setTeacher] = useState<CreatorPublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const tab = searchParams.get("tab");
  const section =
    tab === "students" || tab === "documents" || tab === "announcements"
      ? tab
      : "overview";

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(`/rooms/${roomId}`)}`);
    }
  }, [hasHydrated, isAuthenticated, roomId, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    getRoomSummary(roomId)
      .then((summary) => {
        if (cancelled) return;
        setRoom(summary);
        if (summary.owner?.id) {
          getCreatorStats(summary.owner.id)
            .then((stats) => {
              if (!cancelled) setTeacher(stats);
            })
            .catch(() => {
              if (!cancelled) setTeacher(null);
            });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(err, "We couldn't load this room."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAuthenticated, roomId]);

  const classmates = useMemo(() => {
    const members = room?.members ?? [];
    return [...members].sort((a, b) => {
      if (a.is_you !== b.is_you) return a.is_you ? -1 : 1;
      return memberName(a).localeCompare(memberName(b));
    });
  }, [room]);

  const filteredClassmates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classmates;
    return classmates.filter((member) =>
      `${memberName(member)} ${member.username}`.toLowerCase().includes(q)
    );
  }, [classmates, query]);

  const myMembership = useMemo(
    () => room?.members?.find((member) => member.is_you) ?? null,
    [room]
  );

  useEffect(() => {
    if (!room) return;
    seedRoom(room.id, room.name);
  }, [room, seedRoom]);

  const roomAnnouncements = useMemo(
    () =>
      [...announcements]
        .filter((announcement) => announcement.roomId === roomId)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [announcements, roomId]
  );

  const roomDocuments = useMemo(
    () =>
      [...documents]
        .filter((document) => document.roomId === roomId)
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()),
    [documents, roomId]
  );

  if (!hasHydrated || loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--qs-brand)]" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-bad)] text-[var(--qs-bad)]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="qs-display mt-4 text-2xl text-[var(--qs-ink)]">Room unavailable</h1>
        <p className="mt-2 text-sm text-[var(--qs-muted)]">
          {error || "This room no longer exists."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/rooms/my" className={QS_PRIMARY_BTN}>
            <ArrowLeft className="h-4 w-4" />
            My Rooms
          </Link>
          <Link href="/rooms" className={QS_OUTLINE_BTN}>
            Join another room
          </Link>
        </div>
      </div>
    );
  }

  const teacherDisplay = teacherName(room);

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 pb-20 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4 xl:items-center">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] md:h-16 md:w-16 md:rounded-[16px]">
              <Users className="h-[26px] w-[26px] md:h-[30px] md:w-[30px]" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-ok)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ok)] md:text-[11px]">
                  Joined
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-poly-1)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ink)] md:text-[11px]">
                  <Users className="h-3 w-3" />
                  {room.memberCount} classmate{room.memberCount === 1 ? "" : "s"}
                </span>
              </div>
              <h1 className="mt-2 text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[30px] md:text-[34px]">
                {room.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--qs-muted)]">
                {room.description || "Your classroom space for classmates, updates and shared notes."}
                <span className="hidden md:inline">
                  <span className="mx-1">·</span>
                  Taught by{" "}
                  <span className="font-extrabold text-[var(--qs-ink)]">{teacherDisplay}</span>
                  {room.owner?.username ? (
                    <span className="text-[var(--qs-muted)]"> @{room.owner.username}</span>
                  ) : null}
                </span>
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--qs-muted)] md:hidden">
                <span>Taught by</span>
                <span className="font-extrabold text-[var(--qs-ink)]">{teacherDisplay}</span>
                {room.owner?.username ? (
                  <span className="text-[var(--qs-muted)]">@{room.owner.username}</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-auto">
            <RoomStat label="Classmates" value={room.memberCount} />
            <RoomStat label="Documents" value={roomDocuments.length} />
            <RoomStat label="Announcements" value={roomAnnouncements.length} />
            <RoomStat
              label="Joined"
              value={myMembership?.joinedAt ? timeAgo(myMembership.joinedAt) : "—"}
            />
          </div>
        </header>

        {section === "overview" && teacher ? (
          <div className="mt-5">
            <TeacherPublicCard teacher={teacher} className="bg-[var(--qs-surface)]" />
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 md:mt-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-6">
          <div className="min-w-0">
            {section === "documents" ? (
              <RoomDocumentsPanel roomId={room.id} roomName={room.name} readOnly />
            ) : section === "announcements" ? (
              <RoomAnnouncementsPanel
                roomId={room.id}
                roomName={room.name}
                readOnly
                author={
                  room.owner
                    ? {
                        name: teacherDisplay,
                        username: room.owner.username,
                        avatarId: room.owner.avatarId,
                        avatarUrl: room.owner.avatarUrl,
                      }
                    : null
                }
              />
            ) : section === "students" ? (
              <StudentsPanel
                classmates={classmates}
                filteredClassmates={filteredClassmates}
                query={query}
                setQuery={setQuery}
              />
            ) : (
              <RecentUpdatesPanel
                room={room}
                announcements={roomAnnouncements}
                documents={roomDocuments}
              />
            )}
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
              <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">Room details</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] pb-2.5">
                  <dt className="font-semibold text-[var(--qs-muted)]">Room code</dt>
                  <dd className="rounded-[8px] bg-[var(--qs-poly-1)] px-2 py-0.5 font-mono text-xs font-bold tracking-[0.08em] text-[var(--qs-brand)]">
                    {room.room_code}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] pb-2.5">
                  <dt className="font-semibold text-[var(--qs-muted)]">Classmates</dt>
                  <dd className="font-extrabold text-[var(--qs-ink)]">{room.memberCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-[var(--qs-muted)]">You joined</dt>
                  <dd className="font-extrabold text-[var(--qs-ink)]">
                    {myMembership?.joinedAt ? timeAgo(myMembership.joinedAt) : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RoomStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 sm:px-3.5 lg:w-[112px] xl:w-[128px]">
      <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)] md:text-[11px]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-lg font-extrabold leading-[1.15] text-[var(--qs-ink)] md:text-xl",
          typeof value === "string" && value.length > 6 && "md:text-[17px]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StudentsPanel({
  classmates,
  filteredClassmates,
  query,
  setQuery,
}: {
  classmates: RoomMember[];
  filteredClassmates: RoomMember[];
  query: string;
  setQuery: (value: string) => void;
}) {
  return (
    <section className="relative mb-4 mr-4 min-w-0">
      <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
      <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px] md:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)]">
              Students
              <span className="rounded-full bg-[var(--qs-poly-1)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--qs-brand)]">
                {classmates.length}
              </span>
            </h2>
            <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
              Classmates in this room.
            </p>
          </div>
          <div className="relative w-full md:w-[280px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students…"
              aria-label="Search students"
              className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
            />
          </div>
        </header>

        <div className="border-t-2 border-[var(--qs-line)] p-4">
          {filteredClassmates.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
              <Users className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">
                {query.trim() ? "No students match your search." : "No students yet."}
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredClassmates.map((member) => (
                <Link
                  key={member.id}
                  href={`/students/${encodeURIComponent(member.username || member.id)}`}
                  className={cn(
                    "group flex min-w-0 items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5 transition-colors hover:border-[var(--qs-brand)] hover:bg-[var(--qs-bg)]",
                    member.is_you && "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- member avatars may be remote */}
                  <img
                    src={memberAvatar(member)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover md:h-[42px] md:w-[42px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[15px] font-extrabold text-[var(--qs-ink)]">
                        {memberName(member)}
                      </p>
                      {member.is_you ? (
                        <span className="shrink-0 rounded-full bg-[var(--qs-brand)] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-on-brand)]">
                          You
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                      <span>@{member.username}</span>
                      {member.joinedAt ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Joined {timeAgo(member.joinedAt)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="border-t-2 border-[var(--qs-line)] px-4 py-3.5 text-sm font-medium text-[var(--qs-muted)] sm:px-[26px]">
          Showing {filteredClassmates.length} of {classmates.length} students
        </div>
      </div>
    </section>
  );
}

function RecentUpdatesPanel({
  room,
  announcements,
  documents,
}: {
  room: RoomSummary;
  announcements: RoomAnnouncement[];
  documents: RoomDocument[];
}) {
  const latestAnnouncements = announcements.slice(0, 2);
  const latestDocuments = documents.slice(0, 3);

  return (
    <section className="relative mb-4 mr-4 min-w-0">
      <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
      <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px]">
          <div>
            <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
              Recent updates
            </h2>
            <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
              Announcements and documents shared by your teacher.
            </p>
          </div>
          <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
            {announcements.length + documents.length} total
          </span>
        </header>

        <div className="border-t-2 border-[var(--qs-line)] md:grid md:grid-cols-2">
          <div className="p-4 sm:p-5 md:border-r-2 md:border-[var(--qs-line)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                <Megaphone className="h-4 w-4 text-[var(--qs-brand)]" />
                Announcements
                <span className="rounded-full bg-[var(--qs-bg)] px-2 py-px text-[10px] font-bold text-[var(--qs-muted)]">
                  {announcements.length}
                </span>
              </h3>
              <Link
                href={`/rooms/${room.id}?tab=announcements`}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[var(--qs-brand)] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {latestAnnouncements.length === 0 ? (
                <p className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-3 py-6 text-center text-xs font-medium text-[var(--qs-muted)]">
                  No announcements yet.
                </p>
              ) : (
                latestAnnouncements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-[var(--qs-ink)]">
                        {announcement.title}
                      </p>
                      <span className="shrink-0 text-[10px] font-semibold text-[var(--qs-muted)]">
                        {timeAgo(announcement.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--qs-muted)]">
                      {announcement.body}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="border-t-2 border-[var(--qs-line)] p-4 sm:p-5 md:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                <FileText className="h-4 w-4 text-[var(--qs-brand)]" />
                Documents
                <span className="rounded-full bg-[var(--qs-bg)] px-2 py-px text-[10px] font-bold text-[var(--qs-muted)]">
                  {documents.length}
                </span>
              </h3>
              <Link
                href={`/rooms/${room.id}?tab=documents`}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-[var(--qs-brand)] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {latestDocuments.length === 0 ? (
                <p className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-3 py-6 text-center text-xs font-medium text-[var(--qs-muted)]">
                  No documents shared yet.
                </p>
              ) : (
                latestDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">
                        {document.name}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-[var(--qs-muted)]">
                        {document.type} · {document.size} · {timeAgo(document.addedAt)}
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
