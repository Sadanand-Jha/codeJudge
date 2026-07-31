"use client";

import { ReactNode, useCallback } from "react";
import { useGuestMode } from "@/context/GuestModeContext";
import AuthModal from "@/components/modals/AuthModal";

type ProtectedAction = "submit" | "run" | "save" | "bookmark" | "like" | "comment" | "create-discussion" | "join-contest" | "ai-chat";

interface GuestGuardProps {
  children: ReactNode;
  action: ProtectedAction;
  onAction?: () => void;
  fallback?: ReactNode;
}

export default function GuestGuard({ children, action, onAction, fallback }: GuestGuardProps) {
  const { requireAuth, isGuest } = useGuestMode();

  const handleClick = useCallback(() => {
    const isAllowed = requireAuth(action, onAction);
    if (!isAllowed) {
      // Action was blocked, don't execute onAction
      return;
    }
    // If user is authenticated, execute the action
    if (isAllowed && onAction) {
      onAction();
    }
  }, [requireAuth, action, onAction]);

  // If there's a fallback for guest users, show it
  if (isGuest && fallback) {
    return <>{fallback}</>;
  }

  // For clickable elements, wrap with our handler
  const child = children as ReactNode;
  
  // If child is a single element, clone it with onClick handler
  if (typeof child === 'object' && child !== null && 'type' in child) {
    const originalOnClick = (child as any).props?.onClick;
    
    return (
      <>
        {cloneElementWithHandler(child, originalOnClick, handleClick)}
        <GlobalAuthModal />
      </>
    );
  }

  return (
    <>
      {child}
      <GlobalAuthModal />
    </>
  );
}

function cloneElementWithHandler(element: any, originalOnClick: any, newOnClick: any) {
  const handleClick = (e: any) => {
    originalOnClick?.(e);
    newOnClick();
  };

  // Special handling for Next.js Link components
  if (element.type?.displayName === 'Link' || element.type?.name === 'Link') {
    return element;
  }

  // For button elements or any clickable element
  return (
    <element.type
      {...element.props}
      onClick={handleClick}
    />
  );
}

// Global auth modal component that listens to events
function GlobalAuthModal() {
  const { isModalOpen, closeAuthModal } = useGuestMode();

  return (
    <AuthModal
      isOpen={isModalOpen}
      onClose={closeAuthModal}
    />
  );
}

// Hook for programmatic auth checks
export function useRequireAuth() {
  const { requireAuth, isGuest } = useGuestMode();
  
  const check = useCallback((action: ProtectedAction, callback?: () => void) => {
    return requireAuth(action, callback);
  }, [requireAuth]);

  return { check, isGuest };
}