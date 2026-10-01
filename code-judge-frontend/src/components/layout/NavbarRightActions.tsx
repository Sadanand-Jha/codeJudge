"use client";

import { Sparkles, UserPlus } from "lucide-react";
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
      {isAuthenticated && (
        <div
          className="group relative flex h-8 items-center gap-1.5 overflow-hidden rounded-xl border border-violet-400/25 bg-gradient-to-r from-violet-500/[0.10] via-fuchsia-500/[0.08] to-pink-500/[0.10] px-2.5 shadow-[inset_0_0_14px_rgba(139,92,246,0.08)]"
          title="Demo AI credits"
          aria-label="240 demo AI credits"
        >
          <span className="pointer-events-none absolute inset-y-0 -left-8 w-6 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-all duration-700 group-hover:left-[110%]" />
          <Sparkles className="relative h-3.5 w-3.5 text-violet-500" />
          <span className="relative text-[11px] font-black tabular-nums text-violet-700 dark:text-violet-300">240</span>
          <span className="relative hidden text-[9px] font-bold uppercase tracking-wide text-text-muted xl:inline">credits</span>
        </div>
      )}
      <ThemeToggle />
      <NotificationBell />
      {isAuthenticated ? (
<div className="flex shrink-0 items-center gap-2">
          <div
            className="w-8 h-8 rounded-full overflow-hidden border border-border bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-accent-foreground"
            title={user?.username || "Student"}
            aria-label={user?.username || "Student account"}
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
          </div>
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
