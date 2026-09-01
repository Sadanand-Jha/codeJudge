"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  "/editor",
  "/profile",
  "/analytics",
  "/settings",
  "/bookmarks",
  "/submissions",
  "/ai/chat",
  "/ai/feedback",
  "/ai/hints",
];

// Protected actions that trigger the auth modal
const PROTECTED_ACTIONS = [
  "submit",
  "run",
  "save",
  "bookmark",
  "like",
  "comment",
  "create-discussion",
  "join-contest",
  "ai-chat",
] as const;

type ProtectedAction = (typeof PROTECTED_ACTIONS)[number];

interface GuestModeContextType {
  isGuest: boolean;
  isModalOpen: boolean;
  protectedActionCount: number;
  openAuthModal: (redirectUrl?: string, action?: ProtectedAction) => void;
  closeAuthModal: () => void;
  requireAuth: (action: ProtectedAction, callback?: () => void) => boolean;
  canAccess: (route: string) => boolean;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [protectedActionCount, setProtectedActionCount] = useState(0);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pathname = usePathname();
  const router = useRouter();

  const isGuest = !isAuthenticated;

  const canAccess = useCallback((route: string) => {
    if (!isGuest) return true;
    
    // Check if route is in protected routes
    return !PROTECTED_ROUTES.some(protectedRoute => 
      route.startsWith(protectedRoute)
    );
  }, [isGuest]);

  const openAuthModal = useCallback((redirectUrl?: string, action?: ProtectedAction) => {
    if (action) {
      setProtectedActionCount(prev => prev + 1);
    }
    // Store the redirect URL in a data attribute or state for the modal
    window.dispatchEvent(new CustomEvent('open-auth-modal', { 
      detail: { redirectUrl, action } 
    }));
    setIsModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingCallback(null);
  }, []);

  const requireAuth = useCallback((action: ProtectedAction, callback?: () => void) => {
    if (!isGuest) {
      callback?.();
      return true;
    }

    setProtectedActionCount(prev => prev + 1);
    
    if (callback) {
      setPendingCallback(() => callback);
    }

    // Get current URL for redirect
    const currentUrl = pathname + window.location.search;
    openAuthModal(currentUrl, action);
    
    return false;
  }, [isGuest, openAuthModal, pathname]);

  // Check route access on navigation
  useCallback(() => {
    if (isGuest && !canAccess(pathname)) {
      // For protected routes, we don't redirect but could show a message
      // The route itself should handle showing appropriate content
    }
  }, [isGuest, canAccess, pathname]);

  // Execute pending callback after login
  const executePendingCallback = useCallback(() => {
    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
  }, [pendingCallback]);

  return (
    <GuestModeContext.Provider value={{
      isGuest,
      isModalOpen,
      protectedActionCount,
      openAuthModal,
      closeAuthModal,
      requireAuth,
      canAccess,
    }}>
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  const context = useContext(GuestModeContext);
  if (context === undefined) {
    throw new Error('useGuestMode must be used within a GuestModeProvider');
  }
  return context;
}