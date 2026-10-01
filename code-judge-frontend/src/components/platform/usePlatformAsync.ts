"use client";

import { useEffect, useRef, useState } from "react";

export function toPlatformError(e: unknown): { status?: number; message: string } {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return { status, message: status === 403 ? "Forbidden: owner access required." : "Unable to load this data." };
}

export function useAsync<T>(fn: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading begins with the keyed request
    setLoading(true);
    fnRef
      .current()
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(toPlatformError(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, nonce]);
  const retry = () => setNonce((n) => n + 1);
  return { data, error, loading, retry };
}
