"use client";

import { useEffect, useState } from "react";

/**
 * Preload a list of image URLs and resolve when all are decoded.
 * Falls back to onload/onerror and a safety timeout so the page never blocks forever.
 * Usage: const ready = useImagePreload(urls)
 */
export function useImagePreload(urls: string[], timeoutMs = 2500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (urls.length === 0) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const key = urls.join("|");

    const preload = async () => {
      try {
        await Promise.all(
          urls.map(
            (src) =>
              new Promise<void>((resolve) => {
                const img = new Image();
                let settled = false;
                const done = () => {
                  if (!settled) {
                    settled = true;
                    resolve();
                  }
                };
                img.onload = done;
                img.onerror = done;
                img.src = src;
                // Prefer decode() for fully-decoded readiness
                if (typeof (img as any).decode === "function") {
                  (img as any).decode().then(done).catch(done);
                } else if (img.complete) {
                  done();
                }
                // safety per-image timeout
                setTimeout(done, timeoutMs);
              })
          )
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    // Global timeout — even if some images hang, show the page
    const t = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, timeoutMs);

    void preload();

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urls.join("|")]);

  return ready;
}

/**
 * Imperative helper (non-hook) — useful inside useEffect where hooks cannot be called conditionally.
 */
export function preloadImages(urls: string[], timeoutMs = 2500): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  const safety = new Promise<void>((res) => setTimeout(res, timeoutMs));
  const loads = Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          let settled = false;
          const done = () => {
            if (!settled) {
              settled = true;
              resolve();
            }
          };
          img.onload = done;
          img.onerror = done;
          img.src = src;
          if (typeof (img as any).decode === "function") {
            (img as any).decode().then(done).catch(done);
          } else if (img.complete) done();
          setTimeout(done, timeoutMs);
        })
    )
  ).then(() => {});
  return Promise.race([loads, safety]);
}
