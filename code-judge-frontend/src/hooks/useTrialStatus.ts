"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTrialStatus,
  requestBasicTrial,
  type TrialRequestSummary,
  type TrialStatus,
} from "@/services/billing";

export function useTrialStatus() {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setStatus(await getTrialStatus());
      setError(null);
    } catch {
      setError("Could not load trial eligibility.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getTrialStatus()
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load trial eligibility.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submitRequest = useCallback(
    async (note?: string): Promise<TrialRequestSummary> => {
      const request = await requestBasicTrial(note);
      setStatus(await getTrialStatus());
      return request;
    },
    []
  );

  return { status, isLoading, error, refresh, submitRequest };
}
