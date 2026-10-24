"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getApiErrorMessage } from "@/lib/apiError";
import { fetchMyRooms } from "@/services/rooms";
import { getOwnedRooms, useRoomStore } from "@/store/roomStore";
import { useAuthStore } from "@/store/authStore";
import RoomsSubNavbar, { type RoomsSubNavItem } from "./RoomsSubNavbar";

/**
 * Horizontal rooms switcher for the creator (studio) rooms workspace. Sits
 * between the studio header and the page content so teachers can move between
 * their rooms without returning to the rooms table every time.
 */
export default function CreatorRoomsNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rooms = useRoomStore((s) => s.rooms);
  const hydrate = useRoomStore((s) => s.hydrate);
  const setRooms = useRoomStore((s) => s.setRooms);
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const backendRooms = await fetchMyRooms();
      if (Array.isArray(backendRooms)) setRooms(backendRooms);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "We couldn't load your rooms."));
    } finally {
      setLoading(false);
    }
  }, [setRooms]);

  useEffect(() => {
    queueMicrotask(() => {
      hydrate();
      void load();
    });
  }, [hydrate, load]);

  const ownedRooms = useMemo(() => getOwnedRooms(rooms, user?.id), [rooms, user]);

  const activeRoomId = useMemo(() => {
    const match = pathname.match(/^\/creator\/rooms\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [pathname]);

  const tab = searchParams.get("tab");
  const isDocuments = tab === "documents";
  const isAnnouncements = tab === "announcements";

  const items = useMemo<RoomsSubNavItem[]>(() => {
    if (activeRoomId) {
      return [
        {
          id: "students",
          name: "Students",
          href: `/creator/rooms/${activeRoomId}`,
          active: !isDocuments && !isAnnouncements,
        },
        {
          id: "documents",
          name: "Documents",
          href: `/creator/rooms/${activeRoomId}?tab=documents`,
          active: isDocuments,
        },
        {
          id: "announcements",
          name: "Announcements",
          href: `/creator/rooms/${activeRoomId}?tab=announcements`,
          active: isAnnouncements,
        },
      ];
    }
    return [...ownedRooms]
      .sort((a, b) => {
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        return a.name.localeCompare(b.name);
      })
      .map((room) => ({
        id: room.id,
        name: room.name,
        href: `/creator/rooms/${room.id}`,
        active: pathname === `/creator/rooms/${room.id}`,
        disabled: room.archived,
      }));
  }, [activeRoomId, isAnnouncements, isDocuments, ownedRooms, pathname]);

  return (
    <RoomsSubNavbar
      items={items}
      homeHref="/creator/rooms"
      homeActive={pathname === "/creator/rooms"}
      loading={loading}
      error={error}
      onRetry={() => void load()}
    />
  );
}
