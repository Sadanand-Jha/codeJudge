"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getApiErrorMessage } from "@/lib/apiError";
import { getEnrolledRooms, type EnrolledRoom } from "@/services/rooms";
import { useAuthStore } from "@/store/authStore";

interface StudentRoomsContextValue {
  rooms: EnrolledRoom[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const StudentRoomsContext = createContext<StudentRoomsContextValue | null>(null);

/**
 * Shares the student's enrolled rooms between the rooms sub-navbar and the
 * rooms pages so navigating between rooms never refetches the list.
 */
export function StudentRoomsProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [rooms, setRooms] = useState<EnrolledRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!hasHydrated) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setRooms([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const next = await getEnrolledRooms();
      if (requestId === requestRef.current) setRooms(next);
    } catch (err: unknown) {
      if (requestId === requestRef.current) {
        setError(getApiErrorMessage(err, "We couldn't load your rooms."));
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    queueMicrotask(() => {
      void reload();
    });
  }, [reload]);

  return (
    <StudentRoomsContext.Provider value={{ rooms, loading, error, reload }}>
      {children}
    </StudentRoomsContext.Provider>
  );
}

export function useStudentRooms(): StudentRoomsContextValue {
  const context = useContext(StudentRoomsContext);
  if (!context) {
    throw new Error("useStudentRooms must be used inside StudentRoomsProvider");
  }
  return context;
}
