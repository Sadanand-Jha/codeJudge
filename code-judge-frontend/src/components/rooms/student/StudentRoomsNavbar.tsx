"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useStudentRooms } from "./StudentRoomsProvider";
import RoomsSubNavbar, { type RoomsSubNavItem } from "@/components/rooms/RoomsSubNavbar";

/**
 * Second, rooms-only navbar for the student side. It stays under the app
 * topbar and lets students jump between their rooms horizontally instead of
 * scrolling through a long stack of cards.
 */
export default function StudentRoomsNavbar() {
  const pathname = usePathname();
  const { rooms, loading, error, reload } = useStudentRooms();

  const items = useMemo<RoomsSubNavItem[]>(() => {
    return [...rooms]
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((room) => ({
        id: room.id,
        name: room.name,
        href: `/rooms/${room.id}`,
        active: pathname === `/rooms/${room.id}`,
        disabled: !room.is_active,
      }));
  }, [pathname, rooms]);

  return (
    <RoomsSubNavbar
      items={items}
      homeHref="/rooms/my"
      homeActive={pathname === "/rooms/my"}
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      className="sticky top-14 z-20"
      action={
        <Link
          href="/rooms"
          aria-label="Join a room"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 text-xs font-extrabold text-[#1A1240] transition-transform hover:-translate-y-px active:translate-y-0 sm:px-3"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          <span className="hidden sm:inline">Join</span>
        </Link>
      }
    />
  );
}
