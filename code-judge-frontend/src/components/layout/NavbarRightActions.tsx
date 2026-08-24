"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationBell from "./NotificationBell";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useAuthStore } from "@/store/authStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { useUIStore } from "@/store/uiStore";

/**
 * The right-side cluster of the top navbar (theme toggle, notifications,
 * profile avatar, PRO badge, sign in/log out). Used by the shared AppLayout
 * header and the code editor's own header so both show the same actions.
 */
export default function NavbarRightActions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const savedAvatar = useSavedAvatar();
  const creditBalance = useAICreditsStore((s) => s.balance);
  const openAuthModal = useUIStore((s) => s.openAuthModal);

  // A user is "premium" (PRO / ULTIMATE) when they have an active paid
  // subscription. Derived solely from existing subscription/credit state —
  // never faked in the frontend.
  const isPremium = !!(
    creditBalance?.hasActiveSubscription &&
    creditBalance?.planId &&
    !["free", "student"].includes((creditBalance.planId as string).toLowerCase())
  );

  return (
    <div className="flex items-center gap-2">
      <WorkspaceSwitcher />
      <ThemeToggle />
      <NotificationBell />
      {isAuthenticated ? (
<div className="flex shrink-0 items-center gap-2">
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full overflow-hidden border border-border bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-accent-foreground"
            title={user?.username || "Profile"}
          >
            {savedAvatar ? (
              <img
                src={savedAvatar.url}
                alt={savedAvatar.label}
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.username || "U").charAt(0).toUpperCase()
            )}
          </Link>
          {isPremium && (
            <span
              className="relative inline-flex items-center overflow-hidden rounded-md bg-gradient-to-r from-[#EC4899]/20 to-[#8B5CF6]/20 px-1.5 py-0.25 text-[10px] font-semibold tracking-wider text-[#EC4899] ring-1 ring-[#8B5CF6]/40 premium-surface"
              aria-label="PRO subscriber"
            >
              <span className="premium-shine" aria-hidden="true" />
              PRO
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={() =>
            openAuthModal(window.location.pathname + window.location.search)
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all"
        >
          <UserPlus className="w-3 h-3" />
          Sign in
        </button>
      )}
    </div>
  );
}
