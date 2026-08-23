"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, AtSign, Check, FileSpreadsheet, Plus, Users } from "lucide-react";
import { cn } from "@/lib/helpers";
import { RoomStudent } from "@/types/room";
import { useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrlById } from "@/config/dicebear";
import AudienceModal from "./AudienceModal";
import StudentImportPanel from "./StudentImportPanel";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after the room is created with the new room id. */
  onCreated: (roomId: string) => void;
  /** Which "Add Students" tab to start on. */
  initialTab?: AddTab;
}

type AddTab = "manual" | "import";

const VALID_USERNAME = /^[a-zA-Z0-9._-]{2,30}$/;

/**
 * Create room — username-only add flow.
 */
export default function CreateRoomModal({ open, onClose, onCreated, initialTab = "manual" }: CreateRoomModalProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const createRoom = useRoomStore((s) => s.createRoom);
  const { user } = useAuthStore();

  const [tab, setTab] = useState<AddTab>(initialTab);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<RoomStudent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const directory = useMemo(() => {
    const seen = new Map<string, RoomStudent>();
    for (const room of rooms) {
      for (const s of room.students) {
        const key = (s.username ?? s.rollNumber).toLowerCase();
        if (!seen.has(key)) seen.set(key, s);
      }
    }
    return Array.from(seen.values());
  }, [rooms]);

  const addedUsernames = useMemo(() => new Set(pending.map((s) => (s.username ?? s.rollNumber).toLowerCase())), [pending]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().split(/[,\s]+/)[0] || "";
    if (!q) return [];
    return directory
      .filter(
        (s) =>
          !addedUsernames.has((s.username ?? s.rollNumber).toLowerCase()) &&
          (s.username ?? (s as unknown as { email?: string }).email?.split("@")[0] ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [directory, query, addedUsernames]);

  const createStudentFromUsername = (username: string): RoomStudent => ({
    id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: username,
    rollNumber: username,
    username: username.toLowerCase(),
    active: true,
    avatarId: Math.floor(Math.random() * 7) + 1,
  });

  const addStudent = (s: RoomStudent) => {
    if (addedUsernames.has((s.username ?? s.rollNumber).toLowerCase())) return;
    setPending((prev) => [...prev, { ...s, id: `${s.id || "stu"}_${Date.now()}` }]);
  };

  const addUsernames = (input: string) => {
    const parts = input.split(/[,\s\n]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    const invalid = parts.find((u) => !VALID_USERNAME.test(u));
    if (invalid) { setError(`Invalid username "${invalid}". Use 2-30 chars: letters, numbers, ., _, -`); return; }
    setError(null);
    const toAdd: RoomStudent[] = [];
    for (const u of parts) {
      if (addedUsernames.has(u) || toAdd.some((x) => (x.username ?? "").toLowerCase() === u)) continue;
      const match = directory.find((s) => (s.username ?? s.rollNumber).toLowerCase() === u);
      if (match) toAdd.push({ ...match, id: `${match.id}_${Date.now()}` });
      else toAdd.push(createStudentFromUsername(u));
    }
    if (toAdd.length) setPending((prev) => [...prev, ...toAdd]);
    setQuery("");
  };

  const removeStudent = (id: string) => setPending((prev) => prev.filter((s) => s.id !== id));

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Room name is required.");
      return;
    }
    const room = createRoom({ name, description, students: pending, ownerId: user?.id });
    reset();
    onCreated(room.id);
  };

  const reset = () => {
    setName("");
    setDescription("");
    setQuery("");
    setPending([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AudienceModal
      open={open}
      onClose={handleClose}
      title="Create a Room"
      subtitle="Organize your students into a room — add by username only."
      icon={<Users className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            className="h-9 cursor-pointer rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Check className="h-3.5 w-3.5" />
            Create Room
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Room name */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Room Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="CSE 3rd Year - Section A"
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">
            Description <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Third year CSE students, Section A"
            className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          />
        </div>

        {/* Add students */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary">Add Students</label>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              {(
                [
                  { id: "manual", label: "By Username" },
                  { id: "import", label: "Import Excel" },
                ] as Array<{ id: AddTab; label: string }>
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    tab === t.id
                      ? "bg-pink-500/10 text-pink-500"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {t.id === "import" && <FileSpreadsheet className="h-3 w-3" />}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "manual" ? (
            <div>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUsernames(query); } }}
                  placeholder="Enter username(s) e.g. rahul.kumar42, priya.singh43"
                  className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-20 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                />
                <button
                  onClick={() => addUsernames(query)}
                  disabled={!query.trim()}
                  className="absolute right-1.5 top-1/2 flex h-7 -translate-y-1/2 cursor-pointer items-center gap-1 rounded-lg bg-pink-500 px-3 text-xs font-bold text-white hover:bg-pink-600 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-text-muted">Separate multiple usernames with commas or spaces. Press Enter to add.</p>
              <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
                {results.length === 0 ? (
                  query.trim() ? (
                    <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-5 text-center text-xs text-text-muted">
                      No matches. Press Enter to create &quot;{query.split(/[,\s]+/)[0]}&quot;.
                    </p>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-5 text-center text-xs text-text-muted">
                      Type a username to search or create.
                    </p>
                  )
                ) : (
                  results.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 transition-colors hover:border-border-hover"
                    >
                      <img
                        src={getAvatarUrlById(s.avatarId)}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-text-primary">@{s.username ?? (s as unknown as { email?: string }).email?.split("@")[0]}</p>
                        <p className="truncate text-[11px] text-text-muted">{s.name}</p>
                      </div>
                      <button
                        onClick={() => addStudent(s)}
                        className="flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-pink-500/10 px-2.5 text-[11px] font-bold text-pink-500 transition-colors hover:bg-pink-500/20"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <StudentImportPanel
              roomName={name}
              existingRolls={[]}
              onImported={(students) => {
                setPending((prev) => {
                  const seen = new Set(prev.map((s) => (s.username ?? s.rollNumber).toLowerCase()));
                  return [...prev, ...students.filter((s) => !seen.has((s.username ?? s.rollNumber).toLowerCase()))];
                });
              }}
            />
          )}
        </div>

        {/* Pending students preview */}
        {pending.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">
                {pending.length} student{pending.length !== 1 ? "s" : ""} to add
              </label>
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {pending.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5"
                >
                  <img
                    src={getAvatarUrlById(s.avatarId)}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">@{s.username}</p>
                    <p className="truncate text-[10px] text-text-muted">{s.rollNumber}</p>
                  </div>
                  <button
                    onClick={() => removeStudent(s.id)}
                    className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>
    </AudienceModal>
  );
}
