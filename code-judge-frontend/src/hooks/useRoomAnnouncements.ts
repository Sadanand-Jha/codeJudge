"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  listRoomAnnouncements,
  type RoomAnnouncement,
} from "@/services/roomAnnouncements";

export function useRoomAnnouncements(
  roomId: string | null | undefined,
  enabled = true
) {
  const [announcements, setAnnouncements] = useState<RoomAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!roomId || !enabled) {
      if (!enabled) {
        queueMicrotask(() => {
          setAnnouncements([]);
          setLoading(false);
          setError(null);
        });
      }
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    listRoomAnnouncements(roomId)
      .then((rows) => {
        if (!cancelled) setAnnouncements(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "We couldn't load these announcements."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken, roomId]);

  return { announcements, setAnnouncements, loading, error, reload };
}
