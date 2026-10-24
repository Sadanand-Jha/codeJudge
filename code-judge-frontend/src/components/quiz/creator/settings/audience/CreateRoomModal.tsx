"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, AtSign, Check, CheckSquare, FileSpreadsheet, Plus, Search, Users, X } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { cn } from "@/lib/helpers";
import { MAX_STUDENTS_PER_ROOM, MAX_ROOMS_PER_CREATOR } from "@/lib/constants";
import { RoomStudent } from "@/types/room";
import { useRoomStore, getOwnedRooms } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import { getAvatarUrlById } from "@/config/dicebear";
import { useToast } from "@/hooks/useToast";
import { searchUserByUsername, createRoom as apiCreateRoom, addMemberToRoom, SearchedUser } from "@/services/rooms";
import { isValidUsername, validateUsername } from "@/utils/importValidation";
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
            const payload = (res as Record<string, unknown>) ?? {};
            const members = (payload.members ?? []) as Array<Record<string, unknown>>;
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
    if (!query.trim()) { setSearchError("Enter a username"); return; }
    const check = validateUsername(query);
    if (!check.ok) { setSearchError(check.error ?? "Invalid username"); return; }
    const u = check.value;
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
      const res = await apiCreateRoom({ name: name.trim(), description: description.trim() || undefined });
      const data = (res as { data?: { id?: string | number } })?.data ?? res as { id?: string | number };
      const roomId = String(data.id ?? (data as unknown as { room?: { id: string } })?.room?.id ?? "");
      if (!roomId) throw new Error("Could not create the room. Please try again.");
      for (const s of pending) {
        try { await addMemberToRoom(roomId, s.username!); } catch {}
      }
      const { fetchMyRooms } = await import("@/services/rooms");
      await fetchMyRooms()
        .then((backendRooms) => setRooms(backendRooms))
        .catch(() => {});
      reset();
      onCreated(roomId);
      toast.success({ title: "Room created", description: "Your room is ready to use." });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create room");
    } finally { setCreating(false); }
  };

  const reset = () => {
    setName(""); setDescription(""); setQuery(""); setPending([]); setError(null); setSearchedUser(null); setSearchError(null); setSelectedRoomId(null); setRoomStudentQuery(""); setRoomSelectedUsernames(new Set()); setDirectUsername("");
  };
  const handleClose = () => { reset(); onClose(); };
  const avatarSrc = searchedUser?.avatarUrl ?? "";

  return (
    <AudienceModal open={open} onClose={handleClose} title="Create a Room" subtitle="Add by username, import, or choose from existing rooms." icon={<Users className="h-5 w-5" />} size="md" footer={<div className="flex items-center justify-end gap-2"><button onClick={handleClose} className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]">Cancel</button><button onClick={handleCreate} disabled={creating} className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50">{creating ? <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" /> : <Check className="h-3.5 w-3.5" />} Create Room</button></div>}>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Room Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="CSE 3rd Year - Section A" className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-extrabold text-[var(--qs-ink)]">Description <span className="font-medium text-[var(--qs-muted)]">(optional)</span></label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Third year CSE students, Section A" className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none" />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-extrabold text-[var(--qs-ink)]">Add Students</label>
            <div className="flex items-center gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-0.5">
              {([{ id: "manual", label: "By Username" }, { id: "import", label: "Import Excel" }, { id: "rooms", label: "Rooms" }] as Array<{ id: AddTab; label: string }>).map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex cursor-pointer items-center gap-1 rounded-[9px] px-2.5 py-1 text-[11px] font-bold transition-colors", tab === t.id ? "bg-[var(--qs-ink)] text-[var(--qs-bg)]" : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]")}>
                  {t.id === "import" && <FileSpreadsheet className="h-3 w-3" />}{t.id === "rooms" && <Users className="h-3 w-3" />}{t.label}
                </button>
              ))}
            </div>
          </div>
          {tab === "manual" ? (
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <AtSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
                  <input value={query} maxLength={30} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key==="Enter"){ e.preventDefault(); handleSearch(); } }} placeholder="Enter username e.g. quizplayer101" className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-4 text-sm font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none" />
                </div>
                <button onClick={handleSearch} disabled={searching || !query.trim()} className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50">
                  {searching ? <SecureLogo variant="mark" size={14} className="animate-pulse motion-reduce:animate-none" /> : <Search className="h-3.5 w-3.5" />} Search
                </button>
              </div>
              {searchError && <p className="mt-2 text-xs font-bold text-[var(--qs-bad)]">{searchError}</p>}
              {searchedUser && (
                <div className="mt-5 flex flex-col rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)]">
                  <div className="flex items-center gap-3.5">
                    {avatarSrc ? <img src={avatarSrc} alt={searchedUser.username} className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--qs-line)]" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-sm font-extrabold text-[var(--qs-brand)]">{searchedUser.username.slice(0,2).toUpperCase()}</div>}
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[var(--qs-ink)]">@{searchedUser.username}</p><p className="truncate text-xs font-medium text-[var(--qs-muted)]">{searchedUser.displayName || `${searchedUser.firstName ?? ""} ${searchedUser.lastName ?? ""}`.trim() || searchedUser.username}</p></div>
                    <span className="rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--qs-ok)]">ACTIVE</span>
                  </div>
                  <button onClick={handleAddSearched} className="mt-3 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"><Plus className="h-3.5 w-3.5" /> Add to list</button>
                </div>
              )}
              {!searchedUser && !searchError && !searching && (<p className="mt-3 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-4 text-center text-xs font-medium text-[var(--qs-muted)]">Type a username and press Search to preview the student profile (100px below).</p>)}
            </div>
          ) : tab === "import" ? (
            <>
              <StudentImportPanel roomName={name} existingRolls={[]} remainingCapacity={Math.max(0, MAX_STUDENTS_PER_ROOM - pending.length)} onImported={(students) => { setPending((prev) => { const seen = new Set(prev.map((s) => (s.username ?? s.rollNumber).toLowerCase())); return [...prev, ...students.filter((s) => !seen.has((s.username ?? s.rollNumber).toLowerCase()))]; }); }} />
              <button onClick={() => setTab("rooms")} className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-[var(--qs-brand)]/40 bg-[var(--qs-poly-1)] text-xs font-bold text-[var(--qs-brand)] hover:border-[var(--qs-brand)]"><Users className="h-3.5 w-3.5" /> Or choose from existing rooms</button>
            </>
          ) : (
            <div>
              {!selectedRoom ? (
                <div>
                  <p className="text-xs font-extrabold text-[var(--qs-ink)]">Select a room</p>
                  <p className="text-[11px] font-medium text-[var(--qs-muted)]">Choose a room to view its students. You can also directly write a username after selecting.</p>
                  <div className="mt-3 grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {ownedRooms.length === 0 ? (<p className="rounded-[12px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-8 text-center text-xs font-medium text-[var(--qs-muted)]">No existing rooms found.</p>) : (
                      ownedRooms.map((room) => (
                        <button key={room.id} onClick={() => { setSelectedRoomId(room.id); setRoomStudentQuery(""); setRoomSelectedUsernames(new Set()); setDirectUsername(""); }} className="flex cursor-pointer items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 text-left transition-colors hover:border-[var(--qs-brand)]">
                          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]"><Users className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-[var(--qs-ink)]">{room.name}</span><span className="block text-xs font-medium text-[var(--qs-muted)]">{room.memberCount ?? room.students.length} students</span></span>
                          <span className="text-xs font-extrabold text-[var(--qs-brand)]">Open →</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setSelectedRoomId(null)} className="mb-3 flex cursor-pointer items-center gap-1 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-brand)]"><ArrowLeft className="h-3.5 w-3.5" /> Back to rooms</button>
                  <p className="text-sm font-extrabold text-[var(--qs-ink)]">{selectedRoom?.name}</p>
                  <p className="text-xs font-medium text-[var(--qs-muted)]">{selectedRoom?.memberCount ?? selectedRoom?.students.length} students</p>
                  <div className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--qs-muted)]" />
                      <input value={roomStudentQuery} onChange={(e) => setRoomStudentQuery(e.target.value)} placeholder="Search by username..." className="h-9 w-full rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-8 pr-3 text-xs font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:outline-none" />
                    </div>
                    <button onClick={() => { if (allFilteredSelected) setRoomSelectedUsernames(new Set()); else setRoomSelectedUsernames(new Set(filteredRoomStudents.map((s) => (s.username ?? s.rollNumber).toLowerCase()))); }} className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]">
                      {allFilteredSelected ? <X className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />} {allFilteredSelected ? "Unselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="mt-3 max-h-[200px] overflow-y-auto rounded-[14px] border-2 border-[var(--qs-line)]">
                    {filteredRoomStudents.length === 0 ? (
                      <div className="px-3 py-6 text-center">
                        <p className="text-xs font-medium text-[var(--qs-muted)]">No students match &quot;{roomStudentQuery}&quot;.</p>
                        {(() => {
                          const q = roomStudentQuery.trim().toLowerCase();
                          const isValid = isValidUsername(q);
                          const already = addedUsernames.has(q) || roomSelectedUsernames.has(q);
                          if (isValid && !already) {
                            return (
                              <button onClick={() => { setRoomSelectedUsernames((prev) => { const n = new Set(prev); n.add(q); return n; }); setRoomStudentQuery(""); }} className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-brand)] transition-colors hover:border-[var(--qs-brand)]">
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
                          <label key={s.id} className="flex cursor-pointer items-center gap-3 border-b-2 border-[var(--qs-line)] px-3 py-2 transition-colors last:border-0 hover:bg-[var(--qs-poly-0)]">
                            <input type="checkbox" checked={isSelected} onChange={(e) => setRoomSelectedUsernames((prev) => { const n = new Set(prev); if (e.target.checked) n.add(key); else n.delete(key); return n; })} className="h-3.5 w-3.5 rounded accent-[var(--qs-brand)]" />
                            {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--qs-line)]" /> : <img src={getAvatarUrlById(s.avatarId)} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-[var(--qs-line)]" />}
                            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-[var(--qs-ink)]">@{s.username ?? s.rollNumber}</span><span className="block truncate text-[11px] font-medium text-[var(--qs-muted)]">{s.name}</span></span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  <button onClick={() => { const toAdd = selectedRoom!.students.filter((s) => roomSelectedUsernames.has((s.username ?? s.rollNumber).toLowerCase()) && !addedUsernames.has((s.username ?? s.rollNumber).toLowerCase())); const copies = toAdd.map((s) => ({ ...s, id: `stu_${Date.now()}_${Math.random().toString(36).slice(2,4)}_${s.id}` })); setPending((prev) => [...prev, ...copies]); setRoomSelectedUsernames(new Set()); }} disabled={roomSelectedUsernames.size===0} className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40">
                    <Plus className="h-3.5 w-3.5" /> Add {roomSelectedUsernames.size ? `${roomSelectedUsernames.size} ` : ""}selected to list
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {pending.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-extrabold text-[var(--qs-ink)]">{pending.length} student{pending.length !== 1 ? "s" : ""} to add</label></div>
            <div className="max-h-[150px] h-[150px] space-y-1 overflow-y-auto pr-1">
              {pending.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 rounded-[12px] border-2 border-[var(--qs-line)] px-2.5 py-1.5">
                  {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover ring-2 ring-[var(--qs-line)]" /> : <img src={getAvatarUrlById(s.avatarId)} alt="" className="h-6 w-6 rounded-full object-cover ring-2 ring-[var(--qs-line)]" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[var(--qs-ink)]">@{s.username}</p><p className="truncate text-[10px] font-medium text-[var(--qs-muted)]">{s.rollNumber}</p></div>
                  <button onClick={() => removeStudent(s.id)} className="cursor-pointer rounded-[8px] px-1.5 py-0.5 text-[10px] font-bold text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)]">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--qs-bad)]"><AlertTriangle className="h-3.5 w-3.5" />{error}</p>}
      </div>
    </AudienceModal>
  );
}
