"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FALLBACK_PRICING,
  getPricingCatalog,
  type PricingCatalog,
} from "@/services/pricing";

export function usePricingCatalog() {
  const [catalog, setCatalog] = useState<PricingCatalog>(FALLBACK_PRICING);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPricingCatalog()
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setCatalog(await getPricingCatalog());
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { catalog, isLoading, refresh };
}
