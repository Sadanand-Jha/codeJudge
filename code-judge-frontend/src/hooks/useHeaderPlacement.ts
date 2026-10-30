"use client";

import { useEffect, useRef, useState } from "react";
import { prepareHeaderPlacement } from "@/utils/letterheadLayout";
import type { HeaderConfig, HeaderPlacement } from "@/types/letterhead";

interface HeaderAsset {
  pngUrl: string;
  width: number;
  height: number;
}

/**
 * Debounced canvas crop shared by the adjust dialog and the paper preview.
 * The same placement object is handed to the final PDF request.
 */
export function useHeaderPlacement(
  asset: HeaderAsset | null | undefined,
  config: HeaderConfig | null | undefined,
  enabled = true
) {
  const [placement, setPlacement] = useState<HeaderPlacement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const configRef = useRef(config);
  configRef.current = config;
  const configKey = config ? JSON.stringify(config) : "";

  useEffect(() => {
    if (!enabled || !asset?.pngUrl || !configRef.current) {
      setPlacement(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      prepareHeaderPlacement(asset, configRef.current as HeaderConfig)
        .then((next) => {
          if (!cancelled) setPlacement(next);
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          setPlacement(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "The header image could not be prepared."
          );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [asset?.pngUrl, asset?.width, asset?.height, configKey, enabled, retryKey]);

  return {
    placement,
    loading,
    error,
    retry: () => setRetryKey((key) => key + 1),
  };
}
