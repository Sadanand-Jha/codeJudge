"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiError";
import { listRoomDocuments, type RoomDocument } from "@/services/roomDocuments";

export function useRoomDocuments(
  roomId: string | null | undefined,
  enabled = true
) {
  const [documents, setDocuments] = useState<RoomDocument[]>([]);
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
          setDocuments([]);
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

    listRoomDocuments(roomId)
      .then((rows) => {
        if (!cancelled) setDocuments(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "We couldn't load these documents."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken, roomId]);

  return { documents, setDocuments, loading, error, reload };
}
