"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Pin,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getAvatarUrlById } from "@/config/dicebear";
import { timeAgo } from "@/lib/formatters";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import {
  getRoomSummary,
  type RoomMember,
  type RoomSummary,
} from "@/services/rooms";
import { getCreatorStats, type CreatorPublicStats } from "@/services/quiz";
import TeacherPublicCard from "@/components/rooms/public/TeacherPublicCard";

const QS_PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none";

const QS_OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

const TEACHER_DOCUMENTS = [
  {
    id: "doc-1",
    name: "Chapter 3 — Class Notes.pdf",
    type: "PDF",
    size: "2.4 MB",
    uploaded: "2 days ago",
  },
  {
    id: "doc-2",
    name: "Practice Sheet.docx",
    type: "DOCX",
    size: "860 KB",
    uploaded: "Yesterday",
  },
  {
    id: "doc-3",
    name: "Class Timetable.pdf",
    type: "PDF",
    size: "1.1 MB",
    uploaded: "1 week ago",
  },
];

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [teacher, setTeacher] = useState<CreatorPublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const messages = useMemo(
    () => [
      {
        id: "msg-1",
        title: "Welcome to the classroom",
        body: `Hi everyone! Welcome to ${room?.name ?? "our room"}. I'll share class notes and important updates here.`,
        time: "Just now",
        pinned: true,
      },
      {
        id: "msg-2",
        title: "Tomorrow's class",
        body: "We'll revise the last two chapters and solve the practice sheet together. Please bring your notebook.",
        time: "2h ago",
        pinned: false,
      },
      {
        id: "msg-3",
        title: "Quiz reminder",
        body: "The chapter test is on Friday. I've uploaded the revision notes in the Documents section.",
        time: "Yesterday",
        pinned: false,
      },
    ],
    [room?.name]
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
  const teacherAvatar =
    room.owner?.avatarUrl || getAvatarUrlById(room.owner?.avatarId ?? 1);

  return (
    <div className="min-h-full bg-[var(--qs-bg)]">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 pb-20 sm:px-6">
        <Link
          href="/rooms/my"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          My Rooms
        </Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]">
              <Users className="h-6 w-6" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-ok)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ok)]">
                  Joined
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-poly-1)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ink)]">
                  <Users className="h-3 w-3" />
                  {room.memberCount} classmate{room.memberCount === 1 ? "" : "s"}
                </span>
              </div>
              <h1 className="mt-2 text-[28px] font-extrabold leading-none tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[34px]">
                {room.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--qs-muted)]">
                {room.description || "Your classroom space for classmates, updates and shared notes."}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--qs-muted)]">
                <span>Taught by</span>
                <span className="font-extrabold text-[var(--qs-ink)]">{teacherDisplay}</span>
                {room.owner?.username ? (
                  <span className="text-[var(--qs-muted)]">@{room.owner.username}</span>
                ) : null}
              </p>
            </div>
          </div>
          <Link href="/rooms" className={QS_OUTLINE_BTN}>
            Join another room
          </Link>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="relative mb-4 mr-4">
              <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
              <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
                <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px]">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
                      Classmates
                    </h2>
                    <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
                      Everyone learning with you in this room.
                    </p>
                  </div>
                  <p className="text-sm font-medium text-[var(--qs-muted)]">
                    {classmates.length} total
                  </p>
                </header>

                <div className="border-t-2 border-[var(--qs-line)] p-4 sm:p-5">
                  <div className="relative mb-4 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search classmates…"
                      aria-label="Search classmates"
                      className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] py-2.5 pl-9 pr-3.5 text-sm text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                    />
                  </div>

                  {filteredClassmates.length === 0 ? (
                    <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
                      <Users className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
                      <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">
                        {query.trim() ? "No classmates match your search." : "No classmates yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredClassmates.map((member) => (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-3 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5",
                            member.is_you && "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- member avatars may be remote */}
                          <img
                            src={memberAvatar(member)}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-extrabold text-[var(--qs-ink)]">
                                {memberName(member)}
                              </p>
                              {member.is_you ? (
                                <span className="shrink-0 rounded-full bg-[var(--qs-brand)] px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-on-brand)]">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <p className="truncate text-[11px] font-semibold text-[var(--qs-muted)]">
                              @{member.username}
                            </p>
                            {member.joinedAt ? (
                              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--qs-muted)]">
                                <Clock className="h-3 w-3" />
                                Joined {timeAgo(member.joinedAt)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="relative mb-4 mr-4">
              <div aria-hidden className="absolute left-4 top-4 -bottom-4 -right-4 rounded-[30px] bg-[var(--qs-sun)]" />
              <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
                <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-4 pt-5 sm:px-[26px]">
                  <div>
                    <h2 className="text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
                      From your teacher
                    </h2>
                    <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
                      Messages and documents shared with this classroom.
                    </p>
                  </div>
                  <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                    Preview
                  </span>
                </header>

                <div className="grid border-t-2 border-[var(--qs-line)] md:grid-cols-[1.15fr_1fr]">
                  <div className="p-4 sm:p-5 md:border-r-2 md:border-[var(--qs-line)]">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                      <MessageSquare className="h-4 w-4 text-[var(--qs-brand)]" />
                      Messages
                      <span className="rounded-full bg-[var(--qs-bg)] px-2 py-px text-[10px] font-bold text-[var(--qs-muted)]">
                        {messages.length}
                      </span>
                    </h3>
                    <div className="mt-3 space-y-2.5">
                      {messages.map((message) => (
                        <article
                          key={message.id}
                          className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5"
                        >
                          <div className="flex items-start gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element -- teacher avatar may be remote */}
                            <img
                              src={teacherAvatar}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-xs font-extrabold text-[var(--qs-ink)]">
                                  {teacherDisplay}
                                </p>
                                {message.pinned ? (
                                  <Pin className="h-3 w-3 shrink-0 text-[var(--qs-brand)]" aria-label="Pinned" />
                                ) : null}
                                <span className="ml-auto shrink-0 text-[10px] font-semibold text-[var(--qs-muted)]">
                                  {message.time}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-bold text-[var(--qs-ink)]">
                                {message.title}
                              </p>
                              <p className="mt-0.5 text-xs leading-5 text-[var(--qs-muted)]">
                                {message.body}
                              </p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="border-t-2 border-[var(--qs-line)] p-4 sm:p-5 md:border-t-0">
                    <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                      <FileText className="h-4 w-4 text-[var(--qs-brand)]" />
                      Documents
                      <span className="rounded-full bg-[var(--qs-bg)] px-2 py-px text-[10px] font-bold text-[var(--qs-muted)]">
                        {TEACHER_DOCUMENTS.length}
                      </span>
                    </h3>
                    <div className="mt-3 space-y-2.5">
                      {TEACHER_DOCUMENTS.map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() =>
                            toast.info({
                              title: "Downloads coming soon",
                              description: "Teacher documents will be available here shortly.",
                            })
                          }
                          className="flex w-full items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-left transition-colors hover:border-[var(--qs-brand)]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                            <FileText className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">
                              {document.name}
                            </span>
                            <span className="mt-0.5 block text-[10px] font-semibold text-[var(--qs-muted)]">
                              {document.type} · {document.size} · {document.uploaded}
                            </span>
                          </span>
                          <Download className="h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <TeacherPublicCard teacher={teacher} />

            <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
              <h2 className="text-sm font-extrabold text-[var(--qs-ink)]">Room details</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] pb-2.5">
                  <dt className="font-semibold text-[var(--qs-muted)]">Room code</dt>
                  <dd className="rounded-[8px] bg-[var(--qs-bg)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--qs-ink)]">
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
