"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Hydrates the persisted auth state (token + user saved by zustand persist at
 * login time) exactly once on the client. Mounted in the root layout so every
 * page renders user details from the store without calling /auth/me.
 */
export default function AuthHydrator() {
  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  return null;
}
