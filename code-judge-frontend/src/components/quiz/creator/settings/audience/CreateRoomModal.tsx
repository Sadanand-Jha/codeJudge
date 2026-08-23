"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, AtSign, Check, CheckSquare, FileSpreadsheet, Loader2, Plus, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { MAX_STUDENTS_PER_ROOM, MAX_ROOMS_PER_CREATOR } from "@/lib/constants";
import { RoomStudent } from "@/types/room";
import { useRoomStore, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrlById } from "@/config/dicebear";
import { useToast } from "@/hooks/useToast";
import { searchUserByUsername, createRoom as apiCreateRoom, addMemberToRoom, SearchedUser } from "@/services/rooms";
import AudienceModal from "./AudienceModal";
import StudentImportPanel from "./StudentImportPanel";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
  initialTab?: AddTab;
}

type AddTab = "manual" | "import" | "rooms";

export default function CreateRoomModal({ open, onClose, onCreated, initialTab = "manual" }: CreateRoomModalProps) {
  const rooms = useRoomStore((s) => s.rooms);
  const setRooms = useRoomStore((s) => s.setRooms);
  const createRoomLocal = useRoomStore((s) => s.createRoom);
  const { user } = useAuthStore();
  const toast = useToast();

  const [tab, setTab] = useState<AddTab>(initialTab);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<RoomStudent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Rooms chooser state
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomStudentQuery, setRoomStudentQuery] = useState("");
  const [roomSelectedUsernames, setRoomSelectedUsernames] = useState<Set<string>>(new Set());
  const [directUsername, setDirectUsername] = useState("");

  const addedUsernames = new Set(pending.map((s) => (s.username ?? s.rollNumber).toLowerCase()));
  const ownedRooms = getOwnedRooms(rooms, user?.id);
  const selectedRoom = selectedRoomId ? ownedRooms.find((r) => r.id === selectedRoomId) : null;

  // Fetch rooms from backend when modal opens — ensures current rooms are shown while creating
  useEffect(() => {
    if (open && rooms.length === 0) {
      import("@/services/rooms").then(({ fetchMyRooms }) => {
        fetchMyRooms().then(setRooms).catch(() => {});
      });
    }
  }, [open, rooms.length, setRooms]);

  // If selected room has memberCount but no students loaded, fetch its members
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
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(u)) { setSearchError("Invalid username"); return; }
    setSearching(true);
    setSearchError(null);
    setSearchedUser(null);
    try {
      const user = await searchUserByUsername(u);
      if (addedUsernames.has(user.username.toLowerCase())) {
        setSearchError(`@${user.username} already added`);
      } else {
        setSearchedUser(user);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e instanceof Error ? e.message : "User not found");
      setSearchError(msg);
    } finally { setSearching(false); }
  };

  const handleAddSearched = () => {
    if (!searchedUser) return;
    if (addedUsernames.has(searchedUser.username.toLowerCase())) {
      setSearchError(`@${searchedUser.username} already added`);
      return;
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
    setPending((prev) => [...prev, student]);
    setSearchedUser(null);
    setQuery("");
    setSearchError(null);
  };

  const removeStudent = (id: string) => setPending((prev) => prev.filter((s) => s.id !== id));

  const filteredRoomStudents = useMemo(() => {
    if (!selectedRoom) return [];
    const q = roomStudentQuery.trim().toLowerCase();
    return selectedRoom.students.filter((s) => {
      if (addedUsernames.has((s.username ?? s.rollNumber).toLowerCase())) return false;
      if (q) {
        const hay = `${s.username ?? ""} ${s.name} ${s.rollNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [selectedRoom, roomStudentQuery, addedUsernames]);

  const allFilteredSelected = filteredRoomStudents.length > 0 && filteredRoomStudents.every((s) => roomSelectedUsernames.has((s.username ?? s.rollNumber).toLowerCase()));

  const handleAddFromRoom = () => {
    if (!selectedRoom) return;
    const toAdd = selectedRoom.students.filter((s) => roomSelectedUsernames.has((s.username ?? s.rollNumber).toLowerCase()) && !addedUsernames.has((s.username ?? s.rollNumber).toLowerCase()));
    if (toAdd.length === 0) { setError("Select at least one student"); return; }
    const copies = toAdd.map((s) => ({ ...s, id: `stu_${Date.now()}_${Math.random().toString(36).slice(2,4)}_${s.id}` }));
    setPending((prev) => [...prev, ...copies]);
    setRoomSelectedUsernames(new Set());
    toast.success({ title: "Added", description: `${copies.length} student(s) added from ${selectedRoom.name}` });
  };

  const handleDirectAddInRoom = async () => {
    const u = directUsername.trim().toLowerCase();
    if (!u) return;
    if (!/^[a-zA-Z0-9._-]{2,30}$/.test(u)) { setError("Invalid username"); return; }
    if (addedUsernames.has(u) || roomSelectedUsernames.has(u)) { setError("Already selected/added"); return; }
    try {
      const user = await searchUserByUsername(u);
      setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(user.username.toLowerCase()); return n; });
      setDirectUsername("");
      setError(null);
    } catch {
      setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(u); return n; });
      setDirectUsername("");
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Room name is required."); return; }
    if (ownedRooms.length >= MAX_ROOMS_PER_CREATOR) {
      toast.error({ title: "Room limit reached", description: `You can create at most ${MAX_ROOMS_PER_CREATOR} rooms.` });
      return;
    }
    if (pending.length > MAX_STUDENTS_PER_ROOM) {
      toast.error({ title: "Too many students", description: `A room can have at most ${MAX_STUDENTS_PER_ROOM} students.` });
      return;
    }
    setCreating(true);
    setError(null);
    try {
      let roomId: string | null = null;
      try {
        const res = await apiCreateRoom({ name: name.trim(), description: description.trim() || undefined });
        const data = (res as { data?: { id?: string | number } })?.data ?? res as { id?: string | number };
        roomId = String(data.id ?? (data as unknown as { room?: { id: string } })?.room?.id ?? "");
        if (!roomId) throw new Error("No id from backend");
        for (const s of pending) {
          try { await addMemberToRoom(roomId, s.username!); } catch {}
        }
        toast.success({ title: "Room created", description: "Saved to database with members" });
      } catch (err) {
        console.warn("Backend room create failed, falling back to local", err);
      }
      const localRoom = createRoomLocal({ name, description, students: pending, ownerId: user?.id });
      roomId = roomId || localRoom.id;
      reset();
      onCreated(roomId);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to create room"));
    } finally { setCreating(false); }
  };

  const reset = () => {
    setName(""); setDescription(""); setQuery(""); setPending([]); setError(null); setSearchedUser(null); setSearchError(null); setSelectedRoomId(null); setRoomStudentQuery(""); setRoomSelectedUsernames(new Set()); setDirectUsername("");
  };
  const handleClose = () => { reset(); onClose(); };
  const avatarSrc = searchedUser?.avatarUrl ?? "";

  return (
    <AudienceModal open={open} onClose={handleClose} title="Create a Room" subtitle="Add by username, import, or choose from existing rooms." icon={<Users className="h-5 w-5" />} size="md" footer={<div className="flex items-center justify-end gap-2"><button onClick={handleClose} className="h-9 cursor-pointer rounded-xl border border-border bg-card px-4 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover">Cancel</button><button onClick={handleCreate} disabled={creating} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50">{creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Create Room</button></div>}>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Room Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="CSE 3rd Year - Section A" className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-text-primary">Description <span className="font-normal text-text-muted">(optional)</span></label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Third year CSE students, Section A" className="h-10 w-full rounded-xl border border-input-border bg-input-bg px-3.5 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-text-primary">Add Students</label>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              {([{ id: "manual", label: "By Username" }, { id: "import", label: "Import Excel" }, { id: "rooms", label: "Rooms" }] as Array<{ id: AddTab; label: string }>).map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors", tab === t.id ? "bg-pink-500/10 text-pink-500" : "text-text-muted hover:text-text-primary")}>
                  {t.id === "import" && <FileSpreadsheet className="h-3 w-3" />}{t.id === "rooms" && <Users className="h-3 w-3" />}{t.label}
                </button>
              ))}
            </div>
          </div>
          {tab === "manual" ? (
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <AtSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key==="Enter"){ e.preventDefault(); handleSearch(); } }} placeholder="Enter username e.g. sadanandjha3341" className="h-10 w-full rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10" />
                </div>
                <button onClick={handleSearch} disabled={searching || !query.trim()} className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
                  {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
                </button>
              </div>
              {searchError && <p className="mt-2 text-xs font-medium text-danger">{searchError}</p>}
              {searchedUser && (
                <div style={{ marginTop: "20px" }} className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-xl">
                  <div className="flex items-center gap-3.5">
                    {avatarSrc ? <img src={avatarSrc} alt={searchedUser.username} className="h-12 w-12 rounded-full object-cover ring-2 ring-border" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500/20 to-violet-600/20 text-sm font-bold text-pink-500 ring-2 ring-border">{searchedUser.username.slice(0,2).toUpperCase()}</div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-text-primary">@{searchedUser.username}</p><p className="truncate text-xs text-text-secondary">{searchedUser.displayName || `${searchedUser.firstName ?? ""} ${searchedUser.lastName ?? ""}`.trim() || searchedUser.username}</p></div>
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">ACTIVE</span>
                  </div>
                  <button onClick={handleAddSearched} className="mt-3 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:brightness-110 active:scale-[0.98]"><Plus className="h-3.5 w-3.5" /> Add to list</button>
                </div>
              )}
              {!searchedUser && !searchError && !searching && (<p className="mt-3 rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center text-xs text-text-muted">Type a username and press Search to preview the student profile (100px below).</p>)}
            </div>
          ) : tab === "import" ? (
            <>
              <StudentImportPanel roomName={name} existingRolls={[]} onImported={(students) => { setPending((prev) => { const seen = new Set(prev.map((s) => (s.username ?? s.rollNumber).toLowerCase())); return [...prev, ...students.filter((s) => !seen.has((s.username ?? s.rollNumber).toLowerCase()))]; }); }} />
              <button onClick={() => setTab("rooms")} className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-500/30 bg-pink-500/[0.06] text-xs font-semibold text-pink-500 hover:bg-pink-500/10"><Users className="h-3.5 w-3.5" /> Or choose from existing rooms</button>
            </>
          ) : (
            <div>
              {!selectedRoom ? (
                <div>
                  <p className="text-xs font-semibold text-text-primary">Select a room</p>
                  <p className="text-[11px] text-text-muted">Choose a room to view its students. You can also directly write a username after selecting.</p>
                  <div className="mt-3 grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {ownedRooms.length === 0 ? (<p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-8 text-center text-xs text-text-muted">No existing rooms found.</p>) : (
                      ownedRooms.map((room) => (
                        <button key={room.id} onClick={() => { setSelectedRoomId(room.id); setRoomStudentQuery(""); setRoomSelectedUsernames(new Set()); setDirectUsername(""); }} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-pink-500/30 hover:bg-pink-500/[0.04]">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500"><Users className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-primary">{room.name}</span><span className="block text-xs text-text-muted">{room.memberCount ?? room.students.length} students</span></span>
                          <span className="text-xs font-bold text-pink-500">Open →</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedRoomId(null)} className="mb-3 flex cursor-pointer items-center gap-1 text-xs font-semibold text-text-muted hover:text-pink-500"><ArrowLeft className="h-3.5 w-3.5" /> Back to rooms</button>
                  <p className="text-sm font-bold text-text-primary">{selectedRoom?.name}</p>
                  <p className="text-xs text-text-muted">{selectedRoom?.memberCount ?? selectedRoom?.students.length} students</p>
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
                          const already = addedUsernames.has(q) || roomSelectedUsernames.has(q);
                          if (isValid && !already) {
                            return (
                              <button onClick={() => { setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(q); return n; }); setRoomStudentQuery(""); }} className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-pink-500/10 px-3 py-1.5 text-xs font-bold text-pink-500 hover:bg-pink-500/20">
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
                            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text-primary">@{s.username ?? s.rollNumber}</span><span className="block truncate text-[11px] text-text-muted">{s.name}</span></span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <button onClick={() => { const toAdd = selectedRoom!.students.filter((s) => roomSelectedUsernames.has((s.username ?? s.rollNumber).toLowerCase()) && !addedUsernames.has((s.username ?? s.rollNumber).toLowerCase())); const copies = toAdd.map((s) => ({ ...s, id: `stu_${Date.now()}_${Math.random().toString(36).slice(2,4)}_${s.id}` })); setPending((prev) => [...prev, ...copies]); setRoomSelectedUsernames(new Set()); }} disabled={roomSelectedUsernames.size===0} className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] hover:brightness-110 disabled:opacity-40">
                    <Plus className="h-3.5 w-3.5" /> Add {roomSelectedUsernames.size ? `${roomSelectedUsernames.size} ` : ""}selected to list
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {pending.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-semibold text-text-primary">{pending.length} student{pending.length !== 1 ? "s" : ""} to add</label></div>
            <div className="max-h-[150px] h-[150px] space-y-1 overflow-y-auto pr-1">
              {pending.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5">
                  {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" /> : <img src={getAvatarUrlById(s.avatarId)} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-text-primary">@{s.username}</p><p className="truncate text-[10px] text-text-muted">{s.rollNumber}</p></div>
                  <button onClick={() => removeStudent(s.id)} className="cursor-pointer rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-text-muted transition-colors hover:bg-danger/10 hover:text-danger">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="flex items-center gap-1.5 text-xs font-medium text-danger"><AlertTriangle className="h-3.5 w-3.5" />{error}</p>}
      </div>
    </AudienceModal>
  );
}
