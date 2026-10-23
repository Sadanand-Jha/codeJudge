"use client";

import { UserPlus } from "lucide-react";
import Image from "next/image";
import ThemeToggle from "@/components/ui/ThemeToggle";
// import NotificationBell from "./NotificationBell"; // hidden for now
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { useAuthStore } from "@/store/authStore";
import { useSavedAvatar } from "@/store/avatarStore";
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
  const openAuthModal = useUIStore((s) => s.openAuthModal);

  return (
    <div className="flex items-center gap-2">
      <WorkspaceSwitcher />
      <ThemeToggle variant="icon" />
      {/* <NotificationBell /> hidden for now */}
      {isAuthenticated ? (
<div className="flex shrink-0 items-center gap-2">
          <div
            className="w-8 h-8 rounded-full overflow-hidden border border-ai-border bg-ai-accent flex items-center justify-center text-xs font-bold text-accent-foreground"
            title={user?.username || "Student"}
            aria-label={user?.username || "Student account"}
          >
            {savedAvatar ? (
              <Image
                src={savedAvatar.url}
                alt={savedAvatar.label}
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            ) : (
              (user?.username || "U").charAt(0).toUpperCase()
            )}
          </div>
          {/* PRO badge hidden for now (commented out on request)
          {isPremium && (
            <span
              className="relative inline-flex items-center overflow-hidden rounded-md bg-gradient-to-r from-[#EC4899]/20 to-[#8B5CF6]/20 px-1.5 py-0.25 text-[10px] font-semibold tracking-wider text-[#EC4899] ring-1 ring-[#8B5CF6]/40 premium-surface"
              aria-label="PRO subscriber"
            >
              <span className="premium-shine" aria-hidden="true" />
              PRO
            </span>
          )}
          */}
        </div>
      ) : (
        <button
          onClick={() =>
            openAuthModal(window.location.pathname + window.location.search)
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-accent-foreground bg-ai-accent transition-colors hover:bg-ai-accent-hover"
        >
          <UserPlus className="w-3 h-3" />
          Sign in
        </button>
      )}
    </div>
  );
}
