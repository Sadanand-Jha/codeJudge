"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Code2,
  Settings,
  Menu,
  LogOut,
  BookOpen,
  Trophy,
  ChevronDown,
  User,
  Waypoints,
  Repeat,
  UserPlus,
  Users,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getActivePreparationModule,
  PREPARATION_BASE,
} from "@/config/preparation";
import { FOCUS_MODE_ENABLED, isHomeRedirectPath, isPathAllowed } from "@/config/focusMode";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { logout } from "@/services/auth";
import { toast } from "@/lib/toast";
import { isQuizProblemsPath, isNestedQuizPath, isStudentQuizFlowPath } from "@/lib/quizWorkspace";
import { markQuizBackNavigation } from "@/lib/quizBackNavigation";
import { cn } from "@/lib/helpers";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import { Sidebar } from "@/components/ui/Sidebar";
import { GuestModeProvider, useGuestMode } from "@/context/GuestModeContext";
import { ChatProvider } from "@/context/ChatContext";
import AuthModal from "@/components/modals/AuthModal";
import NavbarRightActions from "./NavbarRightActions";
import LowCreditNotification from "@/components/ai/LowCreditNotification";
import AiAssistantStrip from "@/components/ai/AiAssistantStrip";
import { useTheme } from "@/context/ThemeContext";

function LogoutConfirmModal({
  open,
  email,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  email?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="qs-ui fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(26, 18, 64, 0.6)" }}
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-desc"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-3xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 shadow-[8px_8px_0_var(--qs-sun)] sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]">
                <LogOut className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Account</p>
                <h2 id="logout-modal-title" className="mt-1 text-[24px] font-extrabold text-[var(--qs-ink)]">
                  Log out?
                </h2>
              </div>
            </div>

            <p id="logout-modal-desc" className="mt-4 text-sm leading-6 text-[var(--qs-muted)]">
              You’ll be signed out of{" "}
              <strong className="font-bold text-[var(--qs-ink)]">{email || "your account"}</strong> on this
              device. Your progress stays saved.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={onCancel}
                className="h-11 rounded-xl border-2 border-[var(--qs-line)] px-5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="h-11 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-sm font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--qs-sun)]"
              >
                Log out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type NavItemData = {
  label: string;
  icon: LucideIcon;
  href: string;
};

// Navigation is grouped so the rail can separate logical sections with a
// subtle divider instead of collapsing into one unbroken list.
//
// Information architecture (full mode):
//   HOME        → feed / dashboard
//   ASSESSMENTS → assessments (Contests, Problems, Join Quiz)
//   PREPARATION → one primary entity; its sections live in a dedicated
//                 workspace sidebar inside /preparation/* (like Profile)
//   ACCOUNT     → Profile, Purchases, Settings
//
// When FOCUS_MODE_ENABLED is true only Quiz section remains visible.
const _fullNavGroups: { label: string; items: NavItemData[] }[] = [
  {
    label: "MAIN",
    items: [{ label: "Home", icon: LayoutDashboard, href: "/" }],
  },
  {
    label: "ASSESSMENTS",
    items: [
      { label: "Contests", icon: Trophy, href: "/contests" },
      { label: "Problems", icon: Code2, href: "/problems" },
      { label: "Join Quiz", icon: UserPlus, href: "/quiz" },
    ],
  },
  {
    label: "ROOMS",
    items: [{ label: "My Rooms", icon: Users, href: "/rooms/my" }],
  },
  {
    label: "PREPARATION",
    items: [{ label: "Preparation", icon: Waypoints, href: "/preparation" }],
  },
  {
    label: "TOOLS",
    items: [{ label: "Editor", icon: BookOpen, href: "/editor" }],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", icon: User, href: "/profile" },
      { label: "Settings", icon: Settings, href: "/settings" },
    ],
  },
];

// Focus mode: only Quiz (and Home which becomes quiz hub)
const _focusNavGroups: { label: string; items: NavItemData[] }[] = [
  {
    label: "QUIZ",
    items: [
      { label: "Quiz Hub", icon: UserPlus, href: "/quiz" },
    ],
  },
  {
    label: "ROOMS",
    items: [
      { label: "My Rooms", icon: Users, href: "/rooms/my" },
    ],
  },
];

const navGroups: { label: string; items: NavItemData[] }[] = FOCUS_MODE_ENABLED ? _focusNavGroups : _fullNavGroups;
const fullNavItems = _fullNavGroups.flatMap((group) => group.items);

// Flat list (longest href first) used for page-title resolution and for
// guest-protection checks.
const navItems: NavItemData[] = navGroups
  .flatMap((group) => group.items)
  .sort((a, b) => b.href.length - a.href.length);

function isEditorPath(pathname: string): boolean {
  return pathname === "/editor";
}

// Routes that should be fullscreen (no sidebar/navbar)
function isFullscreenRoute(pathname: string): boolean {
  return isStudentQuizFlowPath(pathname) || pathname.startsWith("/tests/attempt");
}

// Public pages whose children are fully static (server-rendered). Rendering
// them while auth rehydrates keeps their content in the initial HTML for
// crawlers; every other route waits for hydration before rendering children.
const PUBLIC_SSR_ROUTES = new Set(["/about", "/docs"]);

function AppLayoutContent({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Creator Studio has its own dedicated layout + navigation. It is a separate
  // workspace, so on /creator routes we hide the student sidebar entirely and
  // only Studio's navigation is visible.
  const isStudioRoute = pathname.startsWith("/creator");
  const isQuizWorkspace = isNestedQuizPath(pathname);
  const { theme } = useTheme();
  const isStudentQuizRoute = pathname.startsWith("/quiz") && !isQuizWorkspace && pathname !== "/quiz/create";
  const isStudentPartyRoute = isStudentQuizRoute && theme === "light";
  const visibleNavGroups = navGroups;
  const homeHref = isStudioRoute ? "/creator" : isQuizWorkspace ? "/creator/quizzes" : FOCUS_MODE_ENABLED ? "/quiz" : "/";
  const isBlockedRoute = FOCUS_MODE_ENABLED && !isPathAllowed(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Student mode opens with the sidebar closed so the page content takes
  // center stage; it can be reopened anytime via the topbar toggle.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const authModalOpen = useUIStore((s) => s.authModalOpen);
  const authModalRedirect = useUIStore((s) => s.authModalRedirect);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const logoutConfirmOpen = useUIStore((s) => s.logoutConfirmOpen);
  const cancelLogout = useUIStore((s) => s.cancelLogout);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const { isGuest } = useGuestMode();
  const savedAvatar = useSavedAvatar();

  // The AI assistant is only relevant inside the quiz creator's problem
  // building section (/quiz/{code}/problems and /quiz/{code}/problems/{id}).
  const showAiAssistant = isQuizProblemsPath(pathname);

  // Rehydrate token + user from zustand's persisted storage, then validate the
  // session against the backend via /auth/me (see authStore.hydrate).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Browser back/forward does not expose its intent to the destination route.
  // Mark history traversals here so protected routes (quiz attempts) can
  // refuse to reopen from browser history.
  useEffect(() => {
    window.addEventListener("popstate", markQuizBackNavigation);
    return () => window.removeEventListener("popstate", markQuizBackNavigation);
  }, []);

  // Proxy enforcement handles direct requests. This client-side guard also
  // covers already-prefetched pages and stale deployments so a restricted
  // student route can never render its content or full navigation. Blocked
  // marketing pages (e.g. /pricing) redirect home; legacy modules hit /quiz.
  useEffect(() => {
    if (!isBlockedRoute) return;
    router.replace(
      isHomeRedirectPath(pathname) ? "/" : `/quiz?blocked=${encodeURIComponent(pathname)}`
    );
  }, [isBlockedRoute, pathname, router]);

  // Desktop keeps the student rail permanently visible and lets the topbar
  // toggle it; on phones the same rail behaves as a slide-in drawer.
  const isDesktopViewport = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  const toggleSidebar = () => {
    if (isDesktopViewport()) {
      setSidebarCollapsed((collapsed) => !collapsed);
      return;
    }
    setSidebarOpen((open) => !open);
  };

  const closeSidebar = () => {
    if (isDesktopViewport()) {
      setSidebarCollapsed(true);
      return;
    }
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      useAuthStore.getState().logout();
      // A hard navigation destroys every in-memory Zustand store. The auth
      // store also clears all persisted QuizSupport data before this redirect.
      window.location.replace("/login");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const pageTitle = (() => {
    if (isStudioRoute) return "Studio";
    if (isNestedQuizPath(pathname)) return "Quiz Settings";
    if (FOCUS_MODE_ENABLED) {
      if (pathname === "/") return "Quiz";
      if (pathname === "/quiz") return isStudentPartyRoute ? "Quiz Party" : "Mission Control";
      if (pathname === "/quiz/attempts") return "Attempts";
      if (pathname === "/quiz/join") return isStudentPartyRoute ? "Party Pass" : "Launch Bay";
      if (pathname.includes("/attempt")) return isStudentPartyRoute ? "Quiz Playtime" : "Mission in Progress";
      if (pathname.includes("/results")) return isStudentPartyRoute ? "Sweet Results" : "Mission Debrief";
      if (pathname.includes("/register")) return isStudentPartyRoute ? "Party Check-in" : "Crew Check-in";
      if (pathname.startsWith("/quiz")) return isStudentPartyRoute ? "Celebration Zone" : "Flight Deck";
      return fullNavItems.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.label || "QuizSupport";
    }
    if (pathname === PREPARATION_BASE) return "Preparation";
    const prepModule = getActivePreparationModule(pathname);
    if (prepModule) return `Preparation · ${prepModule.label}`;
    return (
      navItems.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.label ||
      "QuizSupport"
    );
  })();

  const handleAuthRequired = (redirectUrl?: string) => {
    openAuthModal(redirectUrl);
  };

  // Wait for persisted auth to rehydrate so user details render on first paint
  // without a flash of the guest UI.
  if (!hasHydrated || isBlockedRoute) {
    if (!isBlockedRoute && PUBLIC_SSR_ROUTES.has(pathname)) {
      return <div className="min-h-dvh w-full min-w-0 bg-ai-bg">{children}</div>;
    }
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  // Fullscreen routes (waiting room, etc.) - no sidebar/navbar
  if (isFullscreenRoute(pathname)) {
    return (
      <div className="min-h-dvh bg-background">
        {children}
        <AuthModal
          isOpen={authModalOpen}
          onClose={closeAuthModal}
          redirectUrl={authModalRedirect}
        />
      </div>
    );
  }

  const usesDefaultHeader = !header && !isEditorPath(pathname);

  return (
    <div
      className={cn(
        "flex min-h-dvh w-full min-w-0 flex-col bg-ai-bg",
        usesDefaultHeader && "pt-14"
      )}
      data-ai-scope
    >
      {/* Mobile overlay (starts below the topbar so the menu toggle stays usable) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== TOP HEADER (full width so the logo never moves with the sidebar) ===== */}
      {header ? (
        header
      ) : !isEditorPath(pathname) ? (
        <header
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          className={cn(
            "app-topbar fixed inset-x-0 top-0 z-30 flex h-14 min-w-0 w-full select-none items-center gap-2 border-b border-ai-border bg-ai-sidebar px-3 sm:gap-4 sm:px-4"
          )}
        >
          {/* Left: sidebar toggle + brand + page title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Sidebar toggle button */}
            <button
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
              aria-expanded={!sidebarCollapsed || sidebarOpen}
              className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-accent/5"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand logo */}
            <Link href={homeHref} className="flex shrink-0 items-center gap-2" aria-label="QuizSupport home">
              <SecureLogo size={30} variant="mark" className="sm:hidden" />
              <SecureLogo size={40} variant="full" className="hidden sm:block" />
            </Link>
          </div>

          {/* Center spacer */}
          <div className="flex-1 max-w-md mx-auto min-w-0">
             <div className="relative flex items-center">
               {/* <Search className="absolute left-3 w-4 h-4 text-text-muted" />
               <input
                 type="text"
                 placeholder="Search by title, ID, tag or company..."
                 className="w-full bg-input-bg border border-input-border rounded-xl py-2 pl-10 pr-10 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
               />
               <kbd className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-text-secondary bg-card-hover border border-border rounded-md">
                 ⌘K
               </kbd> */}
             </div>
           </div>

            {/* Right actions */}
            <NavbarRightActions />
        </header>
      ) : null}

      {/* ===== WORKSPACE (sidebar starts below the navbar) ===== */}
      <div
        className={cn(
          "flex w-full min-w-0 flex-1",
          !isStudioRoute && !sidebarCollapsed && "lg:pl-64"
        )}
      >
        {/* ===== STUDENT SIDEBAR (permanent on desktop, drawer on phones) ===== */}
        {!isStudioRoute && (
          <Sidebar
            dataSidebar="true"
            className={cn(
              "app-sidebar-rail fixed left-0 top-14 z-50 flex h-[calc(100dvh-3.5rem)] w-64 shrink-0 flex-col overflow-hidden border-r-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] transition-transform duration-200 ease-out",
              sidebarOpen && "app-sidebar-mobile-open",
              sidebarCollapsed && "lg:hidden"
            )}
          >
            <div className="relative z-10 flex h-full w-full flex-col">
              {/* Brand header */}
              <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] px-3 py-3">
                <Link
                  href={homeHref}
                  onClick={closeSidebar}
                  className="flex min-w-0 items-center gap-2.5"
                  aria-label="QuizSupport home"
                >
                  <span className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
                    Student Mode
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={closeSidebar}
                  className="shrink-0 lg:hidden"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
                {visibleNavGroups.map((group, groupIndex) => (
                  <div key={group.label} className="space-y-1">
                    {groupIndex > 0 && (
                      <div className="mx-1 my-2 h-0.5 shrink-0 rounded-full bg-[var(--qs-line)]" />
                    )}
                    <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]">{group.label}</p>
                    {group.items.map((item) => (
                      <NavItem
                        key={item.label}
                        item={item}
                        pathname={pathname}
                        isGuest={isGuest}
                        onClick={() => setSidebarOpen(false)}
                      />
                    ))}
                  </div>
                ))}
              </nav>

              {/* Bottom: developer link + account dropdown */}
              <div className="shrink-0 space-y-1 border-t-2 border-[var(--qs-line)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                {!isAuthenticated && (
                  <div className="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                    <div className="mb-1 text-[10px] text-[var(--qs-muted)]">{"You're browsing as a guest"}</div>
                    <button
                      onClick={() => handleAuthRequired(pathname + window.location.search)}
                      className="text-[10px] font-bold text-[var(--qs-brand)] transition-colors hover:text-[var(--qs-ink)]"
                    >
                      Sign in to unlock all features →
                    </button>
                  </div>
                )}

                <Link
                  href="/meet-the-developer"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Meet the developer"
                  className="mx-1 flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[11px] font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
                  <span>Meet the developer</span>
                </Link>

                <ProfileMenu
                  open={accountMenuOpen}
                  onOpenChange={setAccountMenuOpen}
                  isAuthenticated={isAuthenticated}
                  username={user?.username || "Guest"}
                  avatar={savedAvatar}
                  onAuthRequired={() => handleAuthRequired(pathname + window.location.search)}
                />
              </div>
            </div>
          </Sidebar>
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div
          className={cn(
            "flex-1 w-0 min-w-0 flex flex-col",
            isStudioRoute ? "h-[calc(100dvh-3.5rem)] overflow-hidden" : "min-h-[calc(100dvh-3.5rem)]"
          )}
        >
          <main className={cn("min-w-0 w-full flex-1", isStudioRoute && "min-h-0 flex flex-col")}>{children}</main>
        </div>
      </div>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        email={user?.email}
        onConfirm={() => {
          cancelLogout();
          handleLogout();
        }}
        onCancel={cancelLogout}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        redirectUrl={authModalRedirect}
      />
      <LowCreditNotification />
      {showAiAssistant && <AiAssistantStrip />}
    </div>
  );
}

// Shared icon slot: consistent size/stroke + right-side status dot, aligned to
// the icon so it never floats. Active/hover colors come from the parent group.
function NavIcon({ Icon, isActive, showDot }: { Icon: LucideIcon; isActive: boolean; showDot?: boolean }) {
  return (
    <span className="relative z-10 inline-flex shrink-0">
      <Icon
        className={cn(
          "h-5 w-5 transition-colors duration-150",
          isActive ? "text-[var(--qs-on-brand)]" : "text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]"
        )}
      />
      {showDot && (
        <span
          className="absolute -right-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--qs-bad)] ring-2 ring-[var(--qs-surface)]"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

// Student account menu — student-only.
function ProfileMenu({ open, onOpenChange, isAuthenticated, username, avatar, onAuthRequired }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAuthenticated: boolean;
  username: string;
  avatar: { url: string; label: string } | null;
  onAuthRequired: () => void;
}) {
  const requestLogout = useUIStore((s) => s.requestLogout);
  const setOpen = onOpenChange;

  // Sign the current session out and immediately surface the auth modal so
  // the user can sign in with a different account.
  const handleSwitchAccount = async () => {
    setOpen(false);
    try {
      await logout();
    } catch {
      // Backend call failed — clear the local session anyway so the
      // switch never leaves the user stuck on the old account.
    }
    useAuthStore.getState().logout();
    window.location.replace("/login");
  };

  const handleTrigger = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    setOpen(!open);
  };

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={handleTrigger}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border-2 border-[var(--qs-line)] px-3 py-2 transition-colors duration-150 hover:border-[var(--qs-brand)] hover:bg-[var(--qs-bg)]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-xs font-bold text-[var(--qs-on-brand)]">
          {avatar ? (
            <Image src={avatar.url} alt={avatar.label} width={32} height={32} unoptimized className="h-full w-full rounded-full object-cover" />
          ) : (
            (username || "U").charAt(0).toUpperCase()
          )}
        </div>
        <span className="truncate text-xs font-bold text-[var(--qs-ink)]">{username}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)] transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="absolute bottom-full left-0 z-50 w-60 pt-2"
            >
              {/* pt-2 above acts as a hover bridge so moving the cursor from
                  the trigger into the card never fires onMouseLeave. */}
              <div className="overflow-hidden rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1.5 shadow-[4px_4px_0_var(--qs-sun)]">
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-xs font-bold text-[var(--qs-on-brand)]">
                  {avatar ? (
                    <Image src={avatar.url} alt={avatar.label} width={32} height={32} unoptimized className="h-full w-full rounded-full object-cover" />
                  ) : (
                    (username || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-bold text-[var(--qs-ink)]">{username}</p>
                  <p className="text-[9px] text-[var(--qs-muted)]">Student account</p>
                </div>
              </div>

              <div className="my-1 h-0.5 rounded-full bg-[var(--qs-line)]" />

              {/* Navigation lives in the sidebar rail — this menu only handles
                  account-level actions: switching accounts and logging out. */}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
              >
                <Repeat className="h-3.5 w-3.5 shrink-0" />
                Switch account
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  requestLogout();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-badbg)]"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Log out
              </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Standard nav link — same pill, spacing and active state for every item so the
// rail reads as one unified navigation system.
function NavItem({ item, pathname, isGuest, onClick }: {
  item: (typeof navItems)[number];
  pathname: string;
  isGuest: boolean;
  onClick?: () => void;
}) {
  const isQuizWorkspace = isNestedQuizPath(pathname);
  // Join Quiz (/quiz) should not appear active while inside creator quiz workspace
  // — otherwise it looks like we jumped to the Student section.
  const isActive = (item.href === "/quiz" && isQuizWorkspace)
    ? false
    : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  // Routes that are protected for guests
  const protectedForGuests = ["/ai/chat", "/editor", "/analytics", "/settings", "/collections"];
  const isProtected = isGuest && protectedForGuests.includes(item.href);

  return (
    <Link
      href={item.href}
      onClick={(e) => {
        if (isProtected) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('guest-nav-click', {
            detail: { href: item.href }
          }));
          return;
        }
        onClick?.();
      }}
      className={cn(
        "relative group flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-bold whitespace-nowrap outline-none transition-all duration-150 focus-visible:ring-3 focus-visible:ring-[var(--qs-brand)]/40",
        isActive
          ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
          : "border-transparent hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)]"
      )}
    >
      <NavIcon Icon={item.icon} isActive={isActive} showDot={isProtected} />
      <span
        className={cn(
          "relative z-10 transition-colors duration-150",
          isActive
            ? "font-extrabold text-[var(--qs-on-brand)]"
            : "text-[var(--qs-muted)] group-hover:text-[var(--qs-ink)]"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

// Main AppLayout with providers
export default function AppLayout({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <ChatProvider>
      <GuestModeProvider>
        <AppLayoutContent header={header}>{children}</AppLayoutContent>
      </GuestModeProvider>
    </ChatProvider>
  );
}
