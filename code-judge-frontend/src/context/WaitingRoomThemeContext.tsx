"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import {
  WaitingRoomThemeId,
  WaitingRoomThemeState,
  DynamicEvent,
  DynamicEventType,
  getDailyTheme,
  getThemeConfig,
  THEME_CONFIGS,
} from "@/types/waitingRoomTheme";
import { useTheme } from "@/context/ThemeContext";

interface WaitingRoomThemeContextValue {
  state: WaitingRoomThemeState;
  activeConfig: ReturnType<typeof getThemeConfig>;
  activeEvents: DynamicEvent[];
  setTheme: (theme: WaitingRoomThemeId) => void;
  toggleSound: () => void;
  setThemeLocked: (locked: boolean) => void;
  setStudentOverride: (theme: WaitingRoomThemeId | undefined) => void;
  triggerEvent: (type: DynamicEventType) => void;
  clearEvent: (id: string) => void;
}

const WaitingRoomThemeContext = createContext<WaitingRoomThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "waiting_room_theme_state";

interface StoredState {
  activeTheme: WaitingRoomThemeId;
  soundEnabled: boolean;
  studentOverride?: WaitingRoomThemeId;
}

function getStoredState(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.activeTheme === "string" && THEME_CONFIGS[parsed.activeTheme as WaitingRoomThemeId]) {
      return parsed as StoredState;
    }
  } catch {}
  return null;
}

export function WaitingRoomThemeProvider({ children }: { children: ReactNode }) {
  const { theme: appTheme } = useTheme();
  const [state, setState] = useState<WaitingRoomThemeState>({
    activeTheme: "deep-space",
    themeLocked: false,
    soundEnabled: false,
    hasPremium: false,
  });
  const [activeEvents, setActiveEvents] = useState<DynamicEvent[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Sync with app theme: dark mode → Deep Space, light mode → AI Cloud
  useEffect(() => {
    if (!isHydrated) return;
    
    const targetTheme = appTheme === 'dark' ? 'deep-space' : 'ai-cloud';
    setState((prev) => {
      // Only update if not manually overridden by user
      if (prev.activeTheme !== targetTheme && !prev.studentOverride) {
        return { ...prev, activeTheme: targetTheme };
      }
      return prev;
    });
  }, [appTheme, isHydrated]);

  // Load stored state on mount
  useEffect(() => {
    const stored = getStoredState();
    if (stored) {
      setState((prev) => ({
        ...prev,
        activeTheme: stored.activeTheme,
        soundEnabled: stored.soundEnabled,
        studentOverride: stored.studentOverride,
      }));
    } else {
      // Default based on app theme
      const defaultTheme = appTheme === 'dark' ? 'deep-space' : 'ai-cloud';
      setState((prev) => ({
        ...prev,
        activeTheme: defaultTheme,
      }));
    }
    setIsHydrated(true);
  }, [appTheme]);

  // Persist state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const toStore: StoredState = {
        activeTheme: state.activeTheme,
        soundEnabled: state.soundEnabled,
        studentOverride: state.studentOverride,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {}
  }, [state.activeTheme, state.soundEnabled, state.studentOverride, isHydrated]);

  const setTheme = useCallback((theme: WaitingRoomThemeId) => {
    setState((prev) => ({ ...prev, activeTheme: theme }));
  }, []);

  const toggleSound = useCallback(() => {
    setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const setThemeLocked = useCallback((locked: boolean) => {
    setState((prev) => ({ ...prev, themeLocked: locked }));
  }, []);

  const setStudentOverride = useCallback((theme: WaitingRoomThemeId | undefined) => {
    setState((prev) => ({ ...prev, studentOverride: theme }));
  }, []);

  const triggerEvent = useCallback((type: DynamicEventType) => {
    const config = getThemeConfig(state.activeTheme);
    if (!config.availableEvents.includes(type)) return;

    const event: DynamicEvent = {
      id: `${type}-${Date.now()}`,
      type,
      startedAt: Date.now(),
      duration: 8 + Math.random() * 8,
      intensity: 0.5 + Math.random() * 0.5,
    };

    setActiveEvents((prev) => [...prev.slice(-2), event]);

    // Auto-clear after duration
    setTimeout(() => {
      setActiveEvents((prev) => prev.filter((e) => e.id !== event.id));
    }, event.duration * 1000);
  }, [state.activeTheme]);

  const clearEvent = useCallback((id: string) => {
    setActiveEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Random dynamic events every 2-4 minutes
  useEffect(() => {
    if (!isHydrated) return;

    const scheduleEvent = () => {
      const config = getThemeConfig(state.activeTheme);
      if (config.availableEvents.length === 0) return;

      const randomEvent = config.availableEvents[Math.floor(Math.random() * config.availableEvents.length)];
      triggerEvent(randomEvent);

      // Schedule next event in 2-4 minutes
      const nextDelay = (120 + Math.random() * 120) * 1000;
      timer = setTimeout(scheduleEvent, nextDelay);
    };

    let timer: ReturnType<typeof setTimeout>;
    const initialDelay = (30 + Math.random() * 60) * 1000;
    timer = setTimeout(scheduleEvent, initialDelay);

    return () => clearTimeout(timer);
  }, [state.activeTheme, isHydrated, triggerEvent]);

  const activeConfig = useMemo(() => getThemeConfig(state.activeTheme), [state.activeTheme]);

  const value = useMemo(
    () => ({
      state,
      activeConfig,
      activeEvents,
      setTheme,
      toggleSound,
      setThemeLocked,
      setStudentOverride,
      triggerEvent,
      clearEvent,
    }),
    [state, activeConfig, activeEvents, setTheme, toggleSound, setThemeLocked, setStudentOverride, triggerEvent, clearEvent]
  );

  return (
    <WaitingRoomThemeContext.Provider value={value}>
      {children}
    </WaitingRoomThemeContext.Provider>
  );
}

export function useWaitingRoomTheme() {
  const context = useContext(WaitingRoomThemeContext);
  if (context === undefined) {
    throw new Error("useWaitingRoomTheme must be used within a WaitingRoomThemeProvider");
  }
  return context;
}