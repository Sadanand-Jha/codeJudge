"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPTY_PRICING,
  getPricingCatalog,
  type PricingCatalog,
} from "@/services/pricing";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Pricing could not be loaded.";
}

export function usePricingCatalog() {
  const [catalog, setCatalog] = useState<PricingCatalog>(EMPTY_PRICING);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getPricingCatalog()
      .then((next) => {
        if (!active) return;
        setCatalog(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCatalog(EMPTY_PRICING);
        setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await getPricingCatalog();
      setCatalog(next);
    } catch (err) {
      setCatalog(EMPTY_PRICING);
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { catalog, isLoading, error, refresh };
}
