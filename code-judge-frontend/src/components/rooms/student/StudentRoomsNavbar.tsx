"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useStudentRooms } from "./StudentRoomsProvider";
import RoomsSubNavbar, { type RoomsSubNavItem } from "@/components/rooms/RoomsSubNavbar";

/**
 * Second, rooms-only navbar for the student side. It stays under the app
 * topbar and lets students jump between their rooms horizontally instead of
 * scrolling through a long stack of cards.
 */
export default function StudentRoomsNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { rooms, loading, error, reload } = useStudentRooms();

  const activeRoomId = useMemo(() => {
    const match = pathname.match(/^\/rooms\/([^/]+)$/);
    const id = match?.[1] ?? null;
    return id && id !== "my" ? id : null;
  }, [pathname]);

  const tab = searchParams.get("tab");
  const isStudents = tab === "students";
  const isDocuments = tab === "documents";
  const isAnnouncements = tab === "announcements";

  const items = useMemo<RoomsSubNavItem[]>(() => {
    if (activeRoomId) {
      return [
        {
          id: "overview",
          name: "Overview",
          href: `/rooms/${activeRoomId}`,
          active: !isStudents && !isDocuments && !isAnnouncements,
        },
        {
          id: "students",
          name: "Students",
          href: `/rooms/${activeRoomId}?tab=students`,
          active: isStudents,
        },
        {
          id: "documents",
          name: "Documents",
          href: `/rooms/${activeRoomId}?tab=documents`,
          active: isDocuments,
        },
        {
          id: "announcements",
          name: "Announcements",
          href: `/rooms/${activeRoomId}?tab=announcements`,
          active: isAnnouncements,
        },
      ];
    }

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
  }, [activeRoomId, isAnnouncements, isDocuments, isStudents, pathname, rooms]);

  return (
    <RoomsSubNavbar
      items={items}
      homeHref="/rooms/my"
      homeActive={pathname === "/rooms/my"}
      loading={loading}
      error={error}
      onRetry={() => void reload()}
      className="sticky top-14 z-20"
    />
  );
}
