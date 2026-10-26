"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Megaphone } from "lucide-react";
import type { Room } from "@/types/room";
import { useRoomContentStore } from "@/store/roomContentStore";
import { timeAgo } from "@/lib/formatters";

export default function RoomUpdatesSummary({
  rooms,
  basePath,
}: {
  rooms: Room[];
  basePath: string;
}) {
  const announcements = useRoomContentStore((s) => s.announcements);
  const documents = useRoomContentStore((s) => s.documents);

  const roomById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room])),
    [rooms]
  );

  const latestAnnouncements = useMemo(
    () =>
      [...announcements]
        .filter((announcement) => roomById.has(announcement.roomId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2),
    [announcements, roomById]
  );

  const latestDocuments = useMemo(
    () =>
      [...documents]
        .filter((document) => roomById.has(document.roomId))
        .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
        .slice(0, 2),
    [documents, roomById]
  );

  if (rooms.length === 0) return null;

  return (
    <section aria-label="Latest room updates" className="mb-5 grid gap-3.5 md:grid-cols-2">
      <div className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
            <Megaphone className="h-4 w-4 text-[var(--qs-brand)]" />
            Latest announcements
          </h2>
        </div>
        {latestAnnouncements.length === 0 ? (
          <p className="mt-3 text-xs font-medium text-[var(--qs-muted)]">
            No announcements yet.
          </p>
        ) : (
          <ul className="mt-2.5 space-y-1.5">
            {latestAnnouncements.map((announcement) => {
              const room = roomById.get(announcement.roomId);
              return (
                <li key={announcement.id}>
                  <Link
                    href={`${basePath}/${announcement.roomId}?tab=announcements`}
                    className="group flex items-start gap-3 rounded-[12px] border-2 border-transparent px-2 py-2 transition-colors hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                      <Megaphone className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">
                        {announcement.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold text-[var(--qs-muted)]">
                        {room?.name ?? "Room"} · {timeAgo(announcement.createdAt)}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
            <FileText className="h-4 w-4 text-[var(--qs-brand)]" />
            Latest documents
          </h2>
        </div>
        {latestDocuments.length === 0 ? (
          <p className="mt-3 text-xs font-medium text-[var(--qs-muted)]">
            No documents shared yet.
          </p>
        ) : (
          <ul className="mt-2.5 space-y-1.5">
            {latestDocuments.map((document) => {
              const room = roomById.get(document.roomId);
              return (
                <li key={document.id}>
                  <Link
                    href={`${basePath}/${document.roomId}?tab=documents`}
                    className="group flex items-start gap-3 rounded-[12px] border-2 border-transparent px-2 py-2 transition-colors hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">
                        {document.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold text-[var(--qs-muted)]">
                        {room?.name ?? "Room"} · {document.type} · {timeAgo(document.addedAt)}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
