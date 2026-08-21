"use client";

import { useMemo, useState } from "react";
import {
  Users,
  Upload,
  ClipboardList,
  Copy,
  RefreshCw,
  Plus,
  ChevronDown,
  Mail,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { toast } from "@/lib/toast";
import { useRoomStore, getEligibleCount } from "@/store/roomStore";
import { generateQuizCode } from "@/utils/quizCode";
import SelectRoomsModal from "@/components/quiz/creator/settings/audience/SelectRoomsModal";
import CreateRoomModal from "@/components/quiz/creator/settings/audience/CreateRoomModal";

const MODE_OPTIONS: Array<{ id: "public" | "private" | "unlisted" | "classroom"; label: string; desc: string }> = [
  { id: "public", label: "Public", desc: "Anyone can discover and attempt the quiz." },
  { id: "private", label: "Private", desc: "Only people with the link can attempt." },
  { id: "unlisted", label: "Unlisted", desc: "Accessible only through a direct link." },
  { id: "classroom", label: "Rooms", desc: "Restricted to students in your selected rooms." },
];

const SAMPLE_CSV = "Name,Roll Number,Email\nAnanya Sharma,001,ananya@example.com\nRohan Mehta,002,rohan@example.com\n";

export function AudienceStep() {
  const { state, updateAudience } = useStudio();
  const a = state.audience;

  const rooms = useRoomStore((s) => s.rooms);
  const [selectRoomsOpen, setSelectRoomsOpen] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");

  const inviteEmail = () => {
    const email = emailDraft.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error({ title: "Invalid email", description: email });
      return;
    }
    if (a.invitedEmails.includes(email)) {
      toast.info({ title: "Already added", description: email });
      setEmailDraft("");
      return;
    }
    updateAudience({ invitedEmails: [...a.invitedEmails, email] });
    setEmailDraft("");
  };

  const roomIds = a.roomIds ?? [];
  const selections = a.roomStudentSelections ?? {};
  const selectedRooms = useMemo(
    () => rooms.filter((r) => roomIds.includes(r.id) && !r.archived),
    [rooms, roomIds]
  );
  const eligibleCount = useMemo(() => getEligibleCount(rooms, roomIds), [rooms, roomIds]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [studentQuery, setStudentQuery] = useState("");

  /** Students of a room allowed to attempt — defaults to every active member. */
  const allowedStudentsOf = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return [] as string[];
    const selected = selections[roomId];
    if (!selected) return room.students.filter((s) => s.active).map((s) => s.rollNumber);
    return room.students.filter((s) => s.active && selected.includes(s.rollNumber)).map((s) => s.rollNumber);
  };

  const toggleStudent = (roomId: string, rollNumber: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    // Build from the full member list so unchecking one student keeps others.
    const base = selections[roomId]
      ? new Set(selections[roomId])
      : new Set(room.students.filter((s) => s.active).map((s) => s.rollNumber));
    if (base.has(rollNumber)) base.delete(rollNumber);
    else base.add(rollNumber);
    updateAudience({ roomStudentSelections: { ...selections, [roomId]: [...base] } });
  };

  const setAllStudents = (roomId: string, allow: boolean) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    updateAudience({
      roomStudentSelections: {
        ...selections,
        [roomId]: allow ? room.students.filter((s) => s.active).map((s) => s.rollNumber) : [],
      },
    });
  };

  const regenerateCode = () =>
    updateAudience({ accessCode: generateQuizCode() });
  const copyCode = () => {
    navigator.clipboard.writeText(a.accessCode);
    toast.success({ title: "Code copied", description: a.accessCode });
  };

  const removeRoom = (roomId: string) =>
    updateAudience({ roomIds: a.roomIds.filter((id) => id !== roomId) });

  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateAudience({ csvPreview: String(reader.result) });
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Audience & Access</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Control who can register and attempt your quiz.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODE_OPTIONS.map((m) => (
          <label
            key={m.id}
            className={cn(
              "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all",
              a.mode === m.id
                ? "border-indigo-500/40 bg-indigo-500/[0.06] dark:border-pink-400/70 dark:bg-pink-500/10"
                : "border-border hover:border-border-hover dark:hover:border-white/25"
            )}
          >
            <input
              type="radio"
              name="accessMode"
              className="sr-only"
              checked={a.mode === m.id}
              onChange={() => updateAudience({ mode: m.id })}
            />
            <span className="text-sm font-bold text-text-primary">{m.label}</span>
            <span className="text-xs text-text-secondary">{m.desc}</span>
          </label>
        ))}
      </div>

      {(a.mode === "classroom" || a.mode === "private" || a.mode === "unlisted") && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Access Code
          </h3>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-mono tracking-widest text-text-primary">
              {a.accessCode || "——"}
            </div>
            <button
              type="button"
              onClick={regenerateCode}
              className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"
              title="Regenerate code"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-border p-1.5 text-text-secondary hover:text-text-primary"
              title="Copy code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {a.mode === "classroom" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Rooms
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Students in the selected rooms can register and attempt this quiz.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectRoomsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover"
              >
                <Users className="h-3.5 w-3.5" /> Select Rooms
              </button>
            </div>
          </div>

          {selectedRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Users className="mx-auto h-6 w-6 text-text-muted" />
              <p className="mt-2 text-xs text-text-secondary">
                No rooms selected yet. Pick rooms or create a new one to restrict
                this quiz to their members.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-pink-500/10 rounded-lg border border-pink-500/20 bg-pink-500/[0.04] dark:divide-pink-400/15 dark:border-pink-400/40 dark:bg-pink-500/10">
                {selectedRooms.map((room) => {
                  const expanded = expandedRoomId === room.id;
                  const allowed = new Set(allowedStudentsOf(room.id));
                  const activeStudents = room.students.filter((s) => s.active);
                  return (
                    <li key={room.id}>
                      <div className="flex items-center gap-3 px-3.5 py-2.5">
                        <button
                          type="button"
                          onClick={() => removeRoom(room.id)}
                          title="Remove room"
                          className="shrink-0 rounded-md p-1 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-rose-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{room.name}</p>
                          {room.description && (
                            <p className="truncate text-xs text-text-secondary">{room.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-text-secondary">
                          {allowed.size}/{activeStudents.length} allowed
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedRoomId(expanded ? null : room.id);
                            setStudentQuery("");
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-text-secondary transition-colors duration-150 hover:bg-card-hover"
                          title={expanded ? "Hide students" : "Choose students"}
                        >
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                        </button>
                      </div>
                      {expanded && (
                        <div className="border-t border-border bg-card px-3.5 py-2">
                          <div className="flex items-center justify-end gap-2 pb-1.5">
                            <button
                              type="button"
                              onClick={() => setAllStudents(room.id, true)}
                              className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                            >
                              Select all
                            </button>
                            <button
                              type="button"
                              onClick={() => setAllStudents(room.id, false)}
                              className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
                            >
                              Unselect all
                            </button>
                          </div>
                          <div className="relative pb-2">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                            <input
                              type="text"
                              value={expandedRoomId === room.id ? studentQuery : ""}
                              onChange={(e) => setStudentQuery(e.target.value)}
                              placeholder="Search students by username…"
                              className="h-8 w-full rounded-lg border border-input-border bg-input-bg pl-8 pr-3 text-xs text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/60"
                            />
                          </div>
                          <ul>
                            {(() => {
                              const q = studentQuery.trim().toLowerCase();
                              const visible = activeStudents.filter((s) => {
                                if (!q) return true;
                                return (
                                  (s.username ?? s.name).toLowerCase().includes(q) ||
                                  s.email.toLowerCase().includes(q) ||
                                  s.rollNumber.toLowerCase().includes(q)
                                );
                              });
                              if (activeStudents.length === 0) {
                                return <li className="py-2 text-xs text-text-muted">No students in this room.</li>;
                              }
                              if (visible.length === 0) {
                                return <li className="py-2 text-xs text-text-muted">No students match "{studentQuery}".</li>;
                              }
                              return visible.map((student) => {
                                const isAllowed = allowed.has(student.rollNumber);
                                return (
                                  <li
                                    key={student.id}
                                    className={cn(
                                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150",
                                      isAllowed ? "bg-emerald-500/[0.07]" : "bg-red-500/[0.12]"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAllowed}
                                      onChange={() => toggleStudent(room.id, student.rollNumber)}
                                      className="h-3.5 w-3.5 rounded accent-indigo-500"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-xs text-text-primary">
                                      @{student.username || student.name}
                                    </span>
                                    <span
                                      className={cn(
                                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                        isAllowed
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                          : "bg-card-hover text-text-muted"
                                      )}
                                    >
                                      {isAllowed ? "Can attempt" : "Not selected"}
                                    </span>
                                  </li>
                                );
                              });
                            })()}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">{eligibleCount}</span> unique{" "}
                {eligibleCount === 1 ? "student is" : "students are"} eligible across the selected
                rooms.
              </p>
            </>
          )}
        </div>
      )}

      {a.mode === "classroom" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Manually Added Students
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary">
              Add students by email — they can attempt this quiz without being in
              any room.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toast.info({ title: "CSV format", description: "Download the sample CSV." })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
            >
              <ClipboardList className="h-3.5 w-3.5" /> Sample CSV
            </button>
            <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" accept=".csv,.xlsx" hidden onChange={handleCsv} />
              Upload CSV
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  inviteEmail();
                }
              }}
              placeholder="student@example.com"
              className="h-9 flex-1 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/60"
            />
            <button
              type="button"
              onClick={inviteEmail}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 px-3.5 py-2 text-xs font-semibold transition-colors duration-150 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25"
            >
              <Plus className="h-3.5 w-3.5" /> Add Student
            </button>
          </div>

          {a.invitedEmails.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card-hover/40 px-3.5 py-2">
              <span className="text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">{a.invitedEmails.length}</span>{" "}
                student{a.invitedEmails.length !== 1 ? "s" : ""} added manually
              </span>
              <button
                type="button"
                onClick={() => updateAudience({ invitedEmails: [] })}
                title="Remove all"
                className="rounded-md p-1 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-rose-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {a.csvPreview && (
            <div className="rounded-lg bg-input-bg p-3 text-[10px] font-mono text-text-secondary">
              {a.csvPreview}
            </div>
          )}
        </div>
      )}

      <SelectRoomsModal
        open={selectRoomsOpen}
        onClose={() => setSelectRoomsOpen(false)}
        selectedRoomIds={roomIds}
        onApply={(ids) => {
          updateAudience({ roomIds: ids });
          setSelectRoomsOpen(false);
        }}
        onCreateRoom={() => setCreateRoomOpen(true)}
      />
      <CreateRoomModal
        open={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onCreated={(roomId) => {
          updateAudience({ roomIds: [...roomIds, roomId] });
          setCreateRoomOpen(false);
          toast.success({ title: "Room created and added to audience" });
        }}
      />
    </div>
  );
}
