"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Hydrates the persisted auth state (token + user saved by zustand persist)
 * and validates it once on initial client load. Every page then renders user
 * details from Zustand without making another /auth/me request.
 */
export default function AuthHydrator() {
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  return null;
}
