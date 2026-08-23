"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, AtSign, Check, CheckSquare, FileSpreadsheet, Loader2, Plus, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { RoomStudent } from "@/types/room";
import { useRoomStore, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrlById } from "@/config/dicebear";
import { useToast } from "@/hooks/useToast";
import { searchUserByUsername, addMemberToRoom, SearchedUser } from "@/services/rooms";
import AudienceModal from "./AudienceModal";
import StudentImportPanel from "./StudentImportPanel";

interface AddStudentsModalProps {
  open: boolean;
  onClose: () => void;
  existing: RoomStudent[];
  onAdd: (students: RoomStudent[]) => void;
  roomName?: string;
  viewStudentsHref?: string;
  initialTab?: AddTab;
  roomId?: string;
}

type AddTab = "manual" | "import" | "rooms";

export default function AddStudentsModal({
  open,
  onClose,
  existing,
  onAdd,
  roomName,
  viewStudentsHref,
  initialTab = "manual",
  roomId,
}: AddStudentsModalProps) {
  const toast = useToast();
  const { user } = useAuthStore();
  const rooms = useRoomStore((s) => s.rooms);
  const setRooms = useRoomStore((s) => s.setRooms);
  const [tab, setTab] = useState<AddTab>(initialTab);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<RoomStudent[]>([]);
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Rooms chooser state
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomStudentQuery, setRoomStudentQuery] = useState("");
  const [roomSelectedUsernames, setRoomSelectedUsernames] = useState<Set<string>>(new Set());
  const [directUsername, setDirectUsername] = useState("");

  const excluded = new Set(existing.map((s) => (s.username ?? s.rollNumber).toLowerCase()));
  pending.forEach((s) => excluded.add((s.username ?? s.rollNumber).toLowerCase()));

  const ownedRooms = getOwnedRooms(rooms, user?.id).filter((r) => !roomId || r.id !== roomId);
  const selectedRoom = selectedRoomId ? ownedRooms.find((r) => r.id === selectedRoomId) : null;

  useEffect(() => {
    if (open && rooms.length === 0) {
      import("@/services/rooms").then(({ fetchMyRooms }) => fetchMyRooms().then(setRooms).catch(() => {}));
    }
  }, [open, rooms.length, setRooms]);

  useEffect(() => {
    if (!selectedRoomId) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;
    if (room.students.length === 0 && (room.memberCount ?? 0) > 0) {
      import("@/services/rooms").then(({ getRoom }) => {
        getRoom(selectedRoomId)
          .then((res: unknown) => {
            const data = (res as { data?: Record<string, unknown> })?.data ?? (res as Record<string, unknown>);
            const members = (data.members as unknown[]) ?? [];
            const mapped = members.map((m: unknown) => {
              const mm = m as Record<string, unknown>;
              const u = (mm.user as Record<string, unknown>) ?? mm;
              const username = String((u.username as string) ?? "");
              return {
                id: String(u.id ?? mm.userId ?? Math.random()),
                name: String((u.displayName as string) ?? (u.username as string) ?? username),
                rollNumber: username,
                username: username.toLowerCase(),
                active: (mm.statusName as string) === "ACTIVE" || mm.status === 1,
                avatarId: Number(u.avatarId ?? 1),
                avatarUrl: (u.avatarUrl as string) ?? null,
              };
            });
            const current = useRoomStore.getState().rooms;
            const updated = current.map((r) => (String(r.id) === String(selectedRoomId) ? { ...r, students: mapped as unknown as typeof r.students } : r));
            setRooms(updated as never);
          })
          .catch(() => {});
      });
    }
  }, [selectedRoomId, rooms, setRooms]);

  const handleSearch = async () => {
    const u = query.trim();
    if (!u) { setSearchError("Enter a username"); return; }
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(u)) { setSearchError("Invalid username (2-30: letters, numbers, ., _, -)"); return; }
    setSearching(true);
    setSearchError(null);
    setSearchedUser(null);
    try {
      const user = await searchUserByUsername(u);
      if (excluded.has(user.username.toLowerCase())) {
        setSearchError(`@${user.username} is already in this room`);
        setSearchedUser(null);
      } else {
        setSearchedUser(user);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "User not found";
      const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSearchError(axiosMsg || msg || "User not found");
    } finally {
      setSearching(false);
    }
  };

  const handleAddSearched = async () => {
    if (!searchedUser) return;
    setAdding(true);
    try {
      if (roomId) {
        try {
          await addMemberToRoom(roomId, searchedUser.username);
          toast.success({ title: "Added to DB", description: `@${searchedUser.username} added to ${roomName ?? "room"}` });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          if (msg?.includes("Room not found") || (err as { response?: { status?: number } })?.response?.status === 404) {
            // fallback
          } else if ((err as { response?: { status?: number } })?.response?.status === 409) {
            setSearchError(msg || "Already in room");
            setAdding(false);
            return;
          } else { throw err; }
        }
      }
      const student: RoomStudent = {
        id: `stu_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        name: searchedUser.displayName || searchedUser.username,
        rollNumber: searchedUser.username,
        username: searchedUser.username.toLowerCase(),
        active: true,
        avatarId: searchedUser.avatarId ?? 1,
        avatarUrl: searchedUser.avatarUrl ?? null,
      };
      onAdd([student]);
      setPending((prev) => [...prev, student]);
      setQuery("");
      toast.success({ title: "Student added", description: `@${student.username} added` });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e instanceof Error ? e.message : "Failed to add");
      setSearchError(msg);
    } finally { setAdding(false); }
  };

  const handleAddFromRoom = async () => {
    if (!selectedRoom) return;
    const toAdd = selectedRoom.students.filter((s) => roomSelectedUsernames.has((s.username ?? s.rollNumber).toLowerCase()) && !excluded.has((s.username ?? s.rollNumber).toLowerCase()));
    if (toAdd.length === 0) { setSearchError("Select at least one student"); return; }
    // Try DB for each if target roomId exists
    for (const s of toAdd) {
      if (roomId) {
        try { await addMemberToRoom(roomId, s.username ?? s.rollNumber); } catch {}
      }
    }
    const copies = toAdd.map((s) => ({ ...s, id: `stu_${Date.now()}_${Math.random().toString(36).slice(2,4)}_${s.id}` }));
    onAdd(copies);
    setPending((prev) => [...prev, ...copies]);
    setRoomSelectedUsernames(new Set());
    toast.success({ title: "Added", description: `${copies.length} student(s) added from ${selectedRoom.name}` });
  };

  const handleDirectAddInRoom = async () => {
    const u = directUsername.trim().toLowerCase();
    if (!u) return;
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(u)) { setSearchError("Invalid username"); return; }
    if (excluded.has(u) || roomSelectedUsernames.has(u)) { setSearchError("Already selected/added"); return; }
    try {
      const user = await searchUserByUsername(u);
      // Add to selection
      setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(user.username.toLowerCase()); return n; });
      setDirectUsername("");
      setSearchError(null);
    } catch {
      // If not found in DB, still allow as pending custom (fallback)
      setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(u); return n; });
      setDirectUsername("");
    }
  };

  const handleAdd = () => {
    onClose();
    setQuery("");
    setPending([]);
    setSearchedUser(null);
    setSearchError(null);
    setSelectedRoomId(null);
    setRoomStudentQuery("");
    setRoomSelectedUsernames(new Set());
  };
  const handleClose = () => {
    setQuery("");
    setPending([]);
    setSearchedUser(null);
    setSearchError(null);
    setSearching(false);
    setSelectedRoomId(null);
    setRoomStudentQuery("");
    setRoomSelectedUsernames(new Set());
    onClose();
  };
  const avatarSrc = searchedUser?.avatarUrl ?? "";

  const filteredRoomStudents = useMemo(() => {
    if (!selectedRoom) return [];
    const q = roomStudentQuery.trim().toLowerCase();
    return selectedRoom.students.filter((s) => {
      if (excluded.has((s.username ?? s.rollNumber).toLowerCase())) return false;
      if (q) {
        const hay = `${s.username ?? ""} ${s.name} ${s.rollNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [selectedRoom, roomStudentQuery, excluded]);

  const allFilteredSelected = filteredRoomStudents.length > 0 && filteredRoomStudents.every((s) => roomSelectedUsernames.has((s.username ?? s.rollNumber).toLowerCase()));

  return (
    <AudienceModal
      open={open}
      onClose={handleClose}
      title="Add Students"
      subtitle="Add by username, import excel, or choose from existing rooms."
      icon={<Users className="h-5 w-5" />}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button onClick={handleClose} className="h-9 cursor-pointer rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover">Cancel</button>
          <button onClick={handleAdd} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"><Check className="h-3.5 w-3.5" />Done</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          {([
            { id: "manual", label: "By Username" },
            { id: "import", label: "Import Excel" },
            { id: "rooms", label: "Choose from Rooms" },
          ] as Array<{ id: AddTab; label: string }>).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                tab === t.id ? "bg-pink-500/10 text-pink-500" : "text-text-muted hover:text-text-primary"
              )}
            >
              {t.id === "import" && <FileSpreadsheet className="h-3 w-3" />}
              {t.id === "rooms" && <Users className="h-3 w-3" />}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "manual" ? (
          <div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <AtSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }} placeholder="Enter username e.g. sadanandjha3341" className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10" />
              </div>
              <button onClick={handleSearch} disabled={searching || !query.trim()} className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
              </button>
            </div>
            {searchError && <p className="mt-2 text-xs font-medium text-danger">{searchError}</p>}
            {searchedUser && (
              <div style={{ marginTop: "20px", height: "100px" }} className="flex flex-col justify-center rounded-2xl border border-border bg-card p-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  {avatarSrc ? <img src={avatarSrc} alt={searchedUser.username} className="h-12 w-12 rounded-full object-cover ring-2 ring-border" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-violet-600/20 text-sm font-bold text-pink-500 ring-2 ring-border">{searchedUser.username.slice(0,2).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-primary">@{searchedUser.username}</p>
                    <p className="truncate text-xs text-text-secondary">{searchedUser.displayName || `${searchedUser.firstName ?? ""} ${searchedUser.lastName ?? ""}`.trim() || searchedUser.username}</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">ACTIVE</span>
                </div>
                <button onClick={handleAddSearched} disabled={adding} className="mt-3 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add to {roomName ?? "Room"}
                </button>
              </div>
            )}
            {!searchedUser && !searchError && !searching && (
              <p className="mt-3 rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center text-xs text-text-muted">Type a username and press Search to preview the student profile.</p>
            )}
            {/* Quick browse 150px box */}
            {ownedRooms.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold text-text-primary">Or add from existing rooms</p>
                <p className="text-[11px] text-text-muted">Pick any student already in your rooms</p>
                <div className="mt-2 max-h-[150px] overflow-y-auto space-y-2 pr-1">
                  {ownedRooms.map((room) => {
                    const count = room.memberCount ?? room.students.length;
                    const available = room.students.filter((s) => !excluded.has((s.username ?? s.rollNumber).toLowerCase()));
                    // show all rooms — fetched via /my-rooms, memberCount may be >0 even if students not yet loaded
                    return (
                      <div key={room.id} className="rounded-lg border border-border bg-card p-2">
                        <p className="truncate text-[11px] font-bold text-text-primary">{room.name} <span className="font-normal text-text-muted">· {count} students</span></p>
                        <div className="mt-1.5 space-y-1">
                          {available.slice(0, 5).map((s) => (
                            <div key={s.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/[0.04]">
                              {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" /> : <img src={getAvatarUrlById(s.avatarId)} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />}
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">@{s.username ?? s.rollNumber}</span>
                              <button onClick={async () => { const key = (s.username ?? s.rollNumber).toLowerCase(); if (excluded.has(key)) return; if (roomId) { try { await addMemberToRoom(roomId, s.username ?? s.rollNumber); toast.success({ title: "Added to DB", description: `@${s.username} added` }); } catch {} } const copy: RoomStudent = { ...s, id: `stu_${Date.now()}_${Math.random().toString(36).slice(2,4)}` }; onAdd([copy]); setPending((prev) => [...prev, copy]); }} className="flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md bg-pink-500/10 px-2 text-[11px] font-bold text-pink-500 hover:bg-pink-500/20"><Plus className="h-3 w-3" /> Add</button>
                            </div>
                          ))}
                          {available.length > 5 && <p className="text-center text-[10px] text-text-muted">+{available.length - 5} more — use Choose from Rooms tab for full list</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : tab === "import" ? (
          <>
            <StudentImportPanel roomName={roomName ?? ""} existingRolls={existing.map((s) => s.username ?? s.rollNumber)} viewStudentsHref={viewStudentsHref} onImported={(students) => { onAdd(students); setPending((prev) => [...prev, ...students]); }} />
            <button onClick={() => setTab("rooms")} className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-500/30 bg-pink-500/[0.06] text-xs font-semibold text-pink-500 hover:bg-pink-500/10">
              <Users className="h-3.5 w-3.5" /> Or choose from existing rooms
            </button>
          </>
        ) : (
          // Rooms chooser tab
          <div>
            {!selectedRoom ? (
              <div>
                <p className="text-xs font-semibold text-text-primary">Select a room</p>
                <p className="text-[11px] text-text-muted">Choose a room to view its students. You can also directly write a username after selecting.</p>
                <div className="mt-3 grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {ownedRooms.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-8 text-center text-xs text-text-muted">No existing rooms found. Create a room first.</p>
                  ) : (
                    ownedRooms.map((room) => (
                      <button key={room.id} onClick={() => { setSelectedRoomId(room.id); setRoomStudentQuery(""); setRoomSelectedUsernames(new Set()); setDirectUsername(""); }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-pink-500/30 hover:bg-pink-500/[0.04]">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500"><Users className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-text-primary">{room.name}</span>
                          <span className="block text-xs text-text-muted">{room.students.length} students {room.description ? `· ${room.description}` : ""}</span>
                        </span>
                        <span className="text-xs font-bold text-pink-500">Open →</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => setSelectedRoomId(null)} className="mb-3 flex cursor-pointer items-center gap-1 text-xs font-semibold text-text-muted hover:text-pink-500">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to rooms
                </button>
                <p className="text-sm font-bold text-text-primary">{selectedRoom?.name}</p>
                <p className="text-xs text-text-muted">{selectedRoom?.students.length} students</p>

                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                    <input value={roomStudentQuery} onChange={(e) => setRoomStudentQuery(e.target.value)} placeholder="Search by username..." className="h-9 w-full rounded-lg border border-input-border bg-input-bg pl-8 pr-3 text-xs text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10" />
                  </div>
                  <button onClick={() => { if (allFilteredSelected) setRoomSelectedUsernames(new Set()); else setRoomSelectedUsernames(new Set(filteredRoomStudents.map((s) => (s.username ?? s.rollNumber).toLowerCase()))); }} className="flex h-9 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-primary hover:bg-card-hover">
                    {allFilteredSelected ? <X className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />} {allFilteredSelected ? "Unselect all" : "Select all"}
                  </button>
                </div>

                <div className="mt-3 max-h-[200px] overflow-y-auto rounded-xl border border-border">
                  {filteredRoomStudents.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-text-muted">No students match &quot;{roomStudentQuery}&quot;.</p>
                      {(() => {
                        const q = roomStudentQuery.trim().toLowerCase();
                        const isValid = /^[a-zA-Z0-9._-]{2,30}$/.test(q);
                        const already = excluded.has(q) || roomSelectedUsernames.has(q);
                        if (isValid && !already) {
                          return (
                            <button
                              onClick={() => {
                                setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(q); return n; });
                                setRoomStudentQuery("");
                              }}
                              className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-pink-500/10 px-3 py-1.5 text-xs font-bold text-pink-500 hover:bg-pink-500/20"
                            >
                              <Plus className="h-3 w-3" /> Add @{q} directly
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    filteredRoomStudents.map((s) => {
                      const key = (s.username ?? s.rollNumber).toLowerCase();
                      const isSelected = roomSelectedUsernames.has(key);
                      return (
                        <label key={s.id} className="flex cursor-pointer items-center gap-3 border-b border-border/50 px-3 py-2 hover:bg-white/[0.04] last:border-0">
                          <input type="checkbox" checked={isSelected} onChange={(e) => setRoomSelectedUsernames((prev) => { const n = new Set(prev); if (e.target.checked) n.add(key); else n.delete(key); return n; })} className="h-3.5 w-3.5 rounded accent-pink-500" />
                          {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-border" /> : <img src={getAvatarUrlById(s.avatarId)} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-border" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-text-primary">@{s.username ?? s.rollNumber}</span>
                            <span className="block truncate text-[11px] text-text-muted">{s.name}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <button onClick={handleAddFromRoom} disabled={roomSelectedUsernames.size===0} className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] hover:brightness-110 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" /> Add {roomSelectedUsernames.size ? `${roomSelectedUsernames.size} ` : ""}selected to {roomName ?? "list"}
                </button>
              </div>
            )}
          </div>
        )}

        {pending.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-primary">{pending.length} recently added</label>
            <div className="max-h-[150px] h-[150px] space-y-1 overflow-y-auto pr-1">
              {pending.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-success/20 bg-success/[0.04] px-2.5 py-1.5">
                  {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" /> : <img src={getAvatarUrlById(s.avatarId)} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">@{s.username}</p>
                    <p className="truncate text-[10px] text-text-muted">{s.name}</p>
                  </div>
                  <span className="text-[10px] font-bold text-success">Added</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AudienceModal>
  );
}
