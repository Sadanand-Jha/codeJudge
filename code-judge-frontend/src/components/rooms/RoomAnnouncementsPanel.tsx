"use client";

import { useMemo, useState } from "react";
import { Megaphone, Pencil, Trash2, X } from "lucide-react";
import { getAvatarUrlById } from "@/config/dicebear";
import { useRoomContentStore, type RoomAnnouncement } from "@/store/roomContentStore";
import { timeAgo } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-[9px] text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-[9px] text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";

const FIELD_CLS =
  "w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

export default function RoomAnnouncementsPanel({
  roomId,
  roomName,
  readOnly = false,
  author = null,
}: {
  roomId: string;
  roomName: string;
  readOnly?: boolean;
  author?: {
    name: string;
    username?: string | null;
    avatarId?: number | null;
    avatarUrl?: string | null;
  } | null;
}) {
  const toast = useToast();
  const announcements = useRoomContentStore((s) => s.announcements);
  const updateAnnouncement = useRoomContentStore((s) => s.updateAnnouncement);
  const deleteAnnouncement = useRoomContentStore((s) => s.deleteAnnouncement);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoomAnnouncement | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const roomAnnouncements = useMemo(
    () =>
      [...announcements]
        .filter((announcement) => announcement.roomId === roomId)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [announcements, roomId]
  );

  const resetForm = () => {
    setFormOpen(false);
    setEditing(null);
    setTitle("");
    setBody("");
  };

  const startEdit = (announcement: RoomAnnouncement) => {
    setEditing(announcement);
    setTitle(announcement.title);
    setBody(announcement.body);
    setFormOpen(true);
  };

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  const save = () => {
    if (!canSave || !editing) return;
    updateAnnouncement(editing.id, { title, body });
    toast.success({ title: "Announcement updated", description: "Students will see the latest version." });
    resetForm();
  };

  const remove = (announcement: RoomAnnouncement) => {
    deleteAnnouncement(announcement.id);
    if (editing?.id === announcement.id) resetForm();
    toast.success({ title: "Announcement removed", description: "It is no longer visible in this room." });
  };

  return (
    <section className="relative mb-4 mr-1 lg:flex lg:flex-col">
      <div aria-hidden className="absolute left-1 top-1 -bottom-1 -right-1 rounded-[18px] bg-[var(--qs-sun)]" />
      <div className="relative overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] lg:flex lg:flex-1 lg:flex-col">
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div>
            <h2 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-[var(--qs-ink)]">
              <Megaphone className="h-[22px] w-[22px] text-[var(--qs-brand)]" />
              Announcements
            </h2>
            <p className="mt-0.5 text-[13px] leading-[1.4] text-[var(--qs-muted)]">
              {readOnly
                ? "Updates from your teacher for this room."
                : "Updates for this room. Students see them in their room."}
            </p>
          </div>
          {readOnly && roomAnnouncements.length > 0 ? (
            <span className="hidden rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)] sm:inline-flex">
              {roomAnnouncements.length} {roomAnnouncements.length === 1 ? "post" : "posts"}
            </span>
          ) : null}
        </header>

        <div className="border-t-2 border-[var(--qs-line)] p-3 sm:p-4 lg:flex-1">
          {!readOnly && formOpen && (
            <div className="mb-4 rounded-[16px] border-2 border-[var(--qs-brand)] bg-[var(--qs-bg)] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-[var(--qs-ink)]">
                  Edit announcement
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  aria-label="Close announcement form"
                  className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)] hover:text-[var(--qs-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="e.g. Chapter test on Friday"
                  aria-label="Announcement title"
                  className={FIELD_CLS}
                />
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder="Write a message for your students…"
                  aria-label="Announcement message"
                  className={cn(FIELD_CLS, "resize-y leading-6")}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={save} disabled={!canSave} className={PRIMARY_BTN}>
                  Save changes
                </button>
                <button type="button" onClick={resetForm} className={OUTLINE_BTN}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {roomAnnouncements.length === 0 ? (
            <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-10 text-center">
              <Megaphone className="mx-auto h-7 w-7 text-[var(--qs-muted)]" />
              <p className="mt-2 text-sm font-bold text-[var(--qs-ink)]">No announcements yet</p>
              <p className="mt-0.5 text-xs text-[var(--qs-muted)]">
                Updates for {roomName} will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {roomAnnouncements.map((announcement) => (
                <article
                  key={announcement.id}
                  className={cn(
                    "rounded-[14px] border-2 border-[var(--qs-line)] p-3.5 sm:px-[18px] sm:py-4",
                    readOnly ? "bg-[var(--qs-surface)]" : "bg-[var(--qs-bg)]"
                  )}
                >
                  {readOnly && author ? (
                    <div className="mb-2.5 hidden items-center gap-2.5 md:flex">
                      {/* eslint-disable-next-line @next/next/no-img-element -- teacher avatars may be remote/user-configured */}
                      <img
                        src={author.avatarUrl || getAvatarUrlById(author.avatarId ?? 1)}
                        alt=""
                        className="h-[30px] w-[30px] shrink-0 rounded-full border-2 border-[var(--qs-ink)] object-cover"
                      />
                      <p className="min-w-0 truncate text-[13px] text-[var(--qs-muted)]">
                        <span className="font-extrabold text-[var(--qs-ink)]">{author.name}</span>
                        <span> · Posted {timeAgo(announcement.createdAt)}</span>
                      </p>
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className={cn(
                        "truncate font-extrabold text-[var(--qs-ink)]",
                        readOnly ? "text-[15px] md:text-[17px]" : "text-sm"
                      )}>
                        {announcement.title}
                      </h3>
                      {!readOnly || !author ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-[var(--qs-muted)]">
                          Posted {timeAgo(announcement.createdAt)}
                          {announcement.updatedAt !== announcement.createdAt
                            ? ` · edited ${timeAgo(announcement.updatedAt)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    {readOnly && author ? (
                      <span className="shrink-0 text-[12px] font-semibold text-[var(--qs-muted)] md:hidden">
                        {timeAgo(announcement.createdAt)}
                      </span>
                    ) : null}
                    {!readOnly && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(announcement)}
                          aria-label={`Edit ${announcement.title}`}
                          className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-surface)] hover:text-[var(--qs-brand)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(announcement)}
                          aria-label={`Delete ${announcement.title}`}
                          className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-surface)] hover:text-[var(--qs-bad)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.45] text-[var(--qs-muted)] md:mt-2 md:text-[14px] md:leading-[1.5]">
                    {announcement.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
