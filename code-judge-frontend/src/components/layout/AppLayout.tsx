"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Code2,
  Settings,
  Menu,
  LogOut,
  BookOpen,
  Trophy,
  Loader2,
  ChevronDown,
  User,
  Waypoints,
  Repeat,
  UserPlus,
  Rocket,
  Radio,
  IceCreamCone,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import {
  getActivePreparationModule,
  PREPARATION_BASE,
} from "@/config/preparation";
import { FOCUS_MODE_ENABLED } from "@/config/focusMode";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { logout } from "@/services/auth";
import { toast } from "@/lib/toast";
import { isQuizProblemsPath, isNestedQuizPath } from "@/lib/quizWorkspace";
import { cn } from "@/lib/helpers";
import { Sidebar } from "@/components/ui/Sidebar";
import { GuestModeProvider, useGuestMode } from "@/context/GuestModeContext";
import { ChatProvider } from "@/context/ChatContext";
import AuthModal from "@/components/modals/AuthModal";
import NavbarRightActions from "./NavbarRightActions";
import LowCreditNotification from "@/components/ai/LowCreditNotification";
import AiAssistantStrip from "@/components/ai/AiAssistantStrip";
import { useTheme } from "@/context/ThemeContext";

function LogoutConfirmModal({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          > 
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-danger" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Log out</h3>
            </div>
            <p className="mt-2 text-sm text-text-secondary">Are you sure you want to log out of your account?</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="h-10 px-5 rounded-lg border border-border bg-card-hover text-sm font-medium text-text-primary hover:border-border-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="h-10 px-5 rounded-lg bg-danger text-sm font-bold text-white hover:shadow-[0_0_16px_rgba(239,68,68,0.4)] transition-all"
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
    label: "FLIGHT DECK",
    items: [
      { label: "Mission Control", icon: Rocket, href: "/quiz" },
    ],
  },
];

const navGroups: { label: string; items: NavItemData[] }[] = FOCUS_MODE_ENABLED ? _focusNavGroups : _fullNavGroups;

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
  return pathname.includes("/waiting") || pathname.startsWith("/tests/attempt");
}

function AppLayoutContent({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const pathname = usePathname();
  // Creator Studio has its own dedicated layout + navigation. It is a separate
  // workspace, so on /creator routes we hide the student sidebar entirely and
  // only Studio's navigation is visible.
  const isStudioRoute = pathname.startsWith("/creator");
  const isQuizWorkspace = isNestedQuizPath(pathname);
  const { theme } = useTheme();
  const isStudentQuizRoute = pathname.startsWith("/quiz") && !isQuizWorkspace && pathname !== "/quiz/create";
  const isStudentMissionRoute = isStudentQuizRoute && theme === "dark";
  const isStudentPartyRoute = isStudentQuizRoute && theme === "light";
  const visibleNavGroups = FOCUS_MODE_ENABLED && theme === "light"
    ? [{ label: "SWEET SPOT", items: [{ label: "Quiz Party", icon: IceCreamCone, href: "/quiz" }] }]
    : navGroups;
  const homeHref = isStudioRoute || isQuizWorkspace ? "/creator/quizzes" : "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  // Account dropdown state lives here (not inside ProfileMenu) so the
  // sidebar's collapse handlers can close it — the card must never float
  // over a collapsed rail.
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const authModalOpen = useUIStore((s) => s.authModalOpen);
  const authModalRedirect = useUIStore((s) => s.authModalRedirect);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const logoutConfirmOpen = useUIStore((s) => s.logoutConfirmOpen);
  const cancelLogout = useUIStore((s) => s.cancelLogout);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const savedAvatar = useSavedAvatar();
  const { isGuest } = useGuestMode();

  // The desktop nav is an icon rail by default. Hovering the rail expands it
  // and moving the cursor away collapses it back. Labels appear only while
  // expanded (or when the mobile drawer is open).
  const showLabels = sidebarExpanded || mobileMenuOpen;
  // After an explicit collapse (active-click / Collapse button) the rail
  // stays collapsed even while the cursor remains over it, until the cursor
  // leaves and re-enters the sidebar.
  const suppressHoverRef = useRef(false);

  const collapseSidebar = useCallback(() => {
    suppressHoverRef.current = true;
    setSidebarExpanded(false);
    setAccountMenuOpen(false);
  }, []);

  // The AI assistant is only relevant inside the quiz creator's problem
  // building section (/quiz/{code}/problems and /quiz/{code}/problems/{id}).
  const showAiAssistant = isQuizProblemsPath(pathname);

  // Rehydrate token + user from zustand's persisted storage, then validate the
  // session against the backend via /auth/me (see authStore.hydrate).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleLogout = async () => {
    try {
      await logout();
      useAuthStore.getState().logout();
      toast.success("Logged out successfully");
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
      if (pathname === "/quiz/join") return isStudentPartyRoute ? "Party Pass" : "Launch Bay";
      if (pathname.includes("/attempt")) return isStudentPartyRoute ? "Quiz Playtime" : "Mission in Progress";
      if (pathname.includes("/results")) return isStudentPartyRoute ? "Sweet Results" : "Mission Debrief";
      if (pathname.includes("/register")) return isStudentPartyRoute ? "Party Check-in" : "Crew Check-in";
      if (pathname.startsWith("/quiz")) return isStudentPartyRoute ? "Celebration Zone" : "Flight Deck";
      return navItems.find((n) => pathname.startsWith(n.href))?.label || "Quiz";
    }
    if (pathname === PREPARATION_BASE) return "Preparation";
    const prepModule = getActivePreparationModule(pathname);
    if (prepModule) return `Preparation · ${prepModule.label}`;
    return (
      navItems.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.label ||
      "ByteClash"
    );
  })();

  const handleAuthRequired = (redirectUrl?: string) => {
    openAuthModal(redirectUrl);
  };

  // Wait for persisted auth to rehydrate so user details render on first paint
  // without a flash of the guest UI.
  if (!hasHydrated) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
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

  return (
    <div
      className="min-h-dvh w-full min-w-0 bg-ai-bg flex"
      data-ai-scope
      style={{ "--rail-w": isStudioRoute ? "0rem" : mobileMenuOpen || sidebarExpanded ? "16rem" : "3.75rem" } as CSSProperties}
    >
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => {
              setMobileMenuOpen(false);
              setAccountMenuOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ===== SIDEBAR (hidden inside Creator Studio — it has its own nav) ===== */}
      {!isStudioRoute && (
      <Sidebar
        dataSidebar="true"
        className={cn(
          // `100vh` can extend behind mobile browser chrome. `100dvh` tracks
          // the actually visible viewport, keeping the account action onscreen.
          "fixed left-0 top-0 h-dvh bg-ai-sidebar/75 backdrop-blur-xl backdrop-saturate-150 border-r border-ai-border flex flex-col z-50 overflow-hidden",
          isStudentMissionRoute && "border-violet-400/15 bg-white/80 shadow-[12px_0_55px_-34px_rgba(91,69,196,.7)] dark:bg-[#080B18]/90 dark:shadow-[12px_0_60px_-32px_rgba(69,48,155,.65)]",
          isStudentPartyRoute && "border-pink-300/50 bg-[#FFF9F2]/88 shadow-[12px_0_55px_-34px_rgba(244,114,182,.65)]",
          "transition-[width,transform] duration-200 ease-out",
          "w-[var(--rail-w)]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {isStudentQuizRoute && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {isStudentMissionRoute ? <>
              <div className="absolute -left-20 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
              <div className="absolute -right-24 top-[38%] h-44 w-44 rounded-full bg-cyan-400/[0.07] blur-3xl" />
              <div className="absolute left-1/2 top-24 h-56 w-56 -translate-x-1/2 rounded-full border border-violet-400/[0.06]" />
              <span className="absolute left-[18%] top-[16%] h-1 w-1 rounded-full bg-violet-300/60 shadow-[0_0_8px_rgba(196,181,253,.8)]" />
              <span className="absolute right-[20%] top-[31%] h-1 w-1 rounded-full bg-cyan-200/60 shadow-[0_0_8px_rgba(165,243,252,.8)]" />
            </> : <>
              <div className="absolute -left-16 -top-14 h-44 w-44 rounded-full bg-pink-300/30 blur-3xl" />
              <div className="absolute -right-20 top-[38%] h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
              <div className="absolute bottom-[8%] left-[12%] h-36 w-36 rounded-full bg-amber-300/20 blur-3xl" />
              <span className="absolute right-3 top-24 text-2xl opacity-35">🎈</span>
              <span className="absolute left-3 top-[42%] text-xl opacity-30">🍭</span>
              <span className="absolute right-4 top-[68%] text-xl opacity-30">🎉</span>
            </>}
          </div>
        )}
        <div
          onMouseEnter={() => {
            suppressHoverRef.current = false;
            setSidebarExpanded(true);
          }}
          onMouseLeave={() => {
            setSidebarExpanded(false);
            setAccountMenuOpen(false);
          }}
          className="relative z-10 flex h-full flex-col"
        >
        {/* Logo */}
        <div className={cn("shrink-0 py-4 flex items-center", showLabels ? "px-6 justify-start" : "px-0 justify-center")}>
          <Link href={homeHref} className="flex items-center gap-2.5">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]", isStudentMissionRoute && "rounded-xl from-[#8B7CFF] via-[#765AEF] to-[#366ED8] shadow-[0_0_22px_rgba(124,92,255,.35)]", isStudentPartyRoute && "rounded-xl from-[#FF79B0] via-[#FF9E57] to-[#FFD34E] shadow-[0_0_22px_rgba(255,121,176,.3)]")}>
              {isStudentMissionRoute ? <Rocket className="h-4 w-4 text-white" /> : isStudentPartyRoute ? <IceCreamCone className="h-4 w-4 text-white" /> : <Code2 className="h-4 w-4 text-accent-foreground" />}
            </div>
            {showLabels && (
              <span className="min-w-0 whitespace-nowrap">
                <span className="block text-base font-bold tracking-tight text-ai-text">{isStudentMissionRoute ? "Mission Control" : isStudentPartyRoute ? "Quiz Party" : "ByteClash"}</span>
                {isStudentQuizRoute && <span className={cn("mt-0.5 block text-[8px] font-bold uppercase tracking-[0.18em]", isStudentPartyRoute ? "text-pink-500" : "text-violet-500 dark:text-violet-300/70")}>{isStudentPartyRoute ? "Sprinkles & Smiles" : "ByteClash Flight Deck"}</span>}
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", showLabels ? "px-2.5 py-3 space-y-1" : "px-0 py-3 space-y-1")}>
          {visibleNavGroups.map((group, groupIndex) => (
            <div key={group.label} className="space-y-1">
              {groupIndex > 0 && (
                <div className={cn("my-2 h-px shrink-0 bg-ai-border", showLabels ? "mx-1" : "mx-2.5")} />
              )}
              {showLabels && isStudentQuizRoute && (
                <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-ai-text-mut">{group.label}</p>
              )}
              {group.items.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  isGuest={isGuest}
                  sidebarExpanded={sidebarExpanded}
                  showLabels={showLabels}
                  setSidebarExpanded={setSidebarExpanded}
                  collapseSidebar={collapseSidebar}
                  missionMode={isStudentMissionRoute}
                  partyMode={isStudentPartyRoute}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAccountMenuOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom: Account + Collapse */}
        <div className="shrink-0 border-t border-ai-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] space-y-1">
          {isStudentQuizRoute && showLabels && (
            <div className={cn("mx-1 mb-2 rounded-xl px-3 py-2.5", isStudentPartyRoute ? "border border-pink-300/45 bg-gradient-to-r from-pink-100/75 to-amber-100/75" : "border border-emerald-400/15 bg-emerald-400/[0.055]")}>
              <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em]", isStudentPartyRoute ? "text-pink-600" : "text-emerald-600 dark:text-emerald-300")}>
                {isStudentPartyRoute ? <PartyPopper className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />} {isStudentPartyRoute ? "Party is ready" : "Flight systems online"}
              </div>
              <p className="mt-1 text-[9px] leading-4 text-ai-text-mut">{isStudentPartyRoute ? "Color, treats and quiz-time fun" : "Secure assessment channel connected"}</p>
            </div>
          )}
          {!isAuthenticated && showLabels && (
            <div className="px-3 py-2 rounded-lg bg-ai-accent-soft border border-ai-accent/20">
              <div className="text-[10px] text-ai-text-sec mb-1">{"You're browsing as a guest"}</div>
              <button
                onClick={() => handleAuthRequired(pathname + window.location.search)}
                className="text-[10px] font-semibold text-ai-accent hover:text-ai-accent-hover transition-colors"
              >
                Sign in to unlock all features →
              </button>
            </div>
          )}

          <ProfileMenu
            showLabels={showLabels}
            sidebarExpanded={sidebarExpanded}
            setSidebarExpanded={setSidebarExpanded}
            open={accountMenuOpen}
            onOpenChange={setAccountMenuOpen}
            isAuthenticated={isAuthenticated}
            username={user?.username || "Guest"}
            avatar={savedAvatar}
            onAuthRequired={() => handleAuthRequired(pathname + window.location.search)}
          />

          {showLabels && (
            <div className="px-3 text-[9px] text-ai-text-mut">ByteClash v1.0.0</div>
          )}
        </div>
      </div>
      </Sidebar>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div
        className={cn(
          "flex-1 w-0 min-w-0 flex flex-col transition-[margin] duration-200 ease-out",
          isStudioRoute ? "h-dvh overflow-hidden" : "min-h-dvh",
          !isStudioRoute && "lg:ml-[var(--rail-w)]"
        )}
      >
        {/* ===== TOP HEADER ===== */}
        {header ? (
          header
        ) : !isEditorPath(pathname) ? (
        <header
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          className={cn(
            "sticky top-0 z-30 flex h-14 min-w-0 w-full select-none items-center gap-2 border-b border-ai-border bg-ai-bg/60 px-3 backdrop-blur-2xl backdrop-saturate-150 sm:gap-4 sm:px-4",
            isStudentMissionRoute && "border-violet-400/15 bg-white/72 shadow-[0_14px_44px_-34px_rgba(91,69,196,.8)] dark:bg-[#080C18]/78",
            isStudentPartyRoute && "border-pink-300/45 bg-[#FFF9F2]/80 shadow-[0_14px_44px_-34px_rgba(244,114,182,.7)]"
          )}
        >
          {/* Left: menu + brand + page title */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden shrink-0 p-2 rounded-lg hover:bg-accent/5 text-text-secondary"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand logo — always visible (the project sidebar hides in the quiz workspace) */}
            <Link href={homeHref} className="flex shrink-0 items-center gap-2" aria-label={isStudentMissionRoute ? "Mission Control home" : isStudentPartyRoute ? "Quiz Party home" : "ByteClash home"}>
              {isStudentQuizRoute && <span className={cn("grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br", isStudentPartyRoute ? "from-pink-400 via-orange-400 to-amber-300 shadow-[0_0_18px_rgba(244,114,182,.28)]" : "from-violet-500 to-blue-600 shadow-[0_0_18px_rgba(124,92,255,.3)]")}>{isStudentPartyRoute ? <IceCreamCone className="h-3.5 w-3.5 text-white" /> : <Rocket className="h-3.5 w-3.5 text-white" />}</span>}
              <span className="hidden text-sm font-bold tracking-tight text-text-primary sm:block">{isStudentMissionRoute ? "ByteClash Space Program" : isStudentPartyRoute ? "ByteClash Ice Cream Party" : "ByteClash"}</span>
            </Link>

            {/* Page title — show on mobile too, truncated */}
            <div className="flex min-w-0 items-center gap-2">
              {isStudentQuizRoute && <span className={cn("hidden h-4 w-px sm:block", isStudentPartyRoute ? "bg-pink-400/30" : "bg-violet-400/20")} />}
              <h1 className="min-w-0 max-w-[40vw] truncate whitespace-nowrap text-sm font-semibold text-text-primary sm:max-w-none">{pageTitle}</h1>
              {isStudentQuizRoute && <span className={cn("hidden items-center gap-1.5 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.13em] md:inline-flex", isStudentPartyRoute ? "border border-pink-300/45 bg-pink-100/70 text-pink-600" : "border border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-600 dark:text-emerald-300")}><span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", isStudentPartyRoute ? "bg-pink-400" : "bg-emerald-400")} /> {isStudentPartyRoute ? "Party time" : "Online"}</span>}
            </div>
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

        {/* ===== PAGE CONTENT ===== */}
        <main className={cn("flex-1", isStudioRoute && "min-h-0 flex flex-col")}>{children}</main>
      </div>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
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
function NavIcon({ Icon, isActive, showDot, missionMode = false, partyMode = false }: { Icon: LucideIcon; isActive: boolean; showDot?: boolean; missionMode?: boolean; partyMode?: boolean }) {
  return (
    <span className="relative z-10 inline-flex shrink-0">
      <Icon
        className={cn(
          "h-5 w-5 transition-colors duration-150",
          isActive ? (missionMode ? "text-violet-500 dark:text-violet-300" : partyMode ? "text-pink-500" : "text-ai-accent") : "text-ai-text-sec group-hover:text-ai-text"
        )}
      />
      {showDot && (
        <span
          className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-ai-accent ring-2 ring-ai-sidebar"
          aria-hidden="true"
        />
      )}
    </span>
  );
}

// Student account menu — student-only.
function ProfileMenu({ showLabels, sidebarExpanded, setSidebarExpanded, open, onOpenChange, isAuthenticated, username, avatar, onAuthRequired }: {
  showLabels: boolean;
  sidebarExpanded: boolean;
  setSidebarExpanded: (v: boolean) => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAuthenticated: boolean;
  username: string;
  avatar: { url: string; label: string } | null;
  onAuthRequired: () => void;
}) {
  const requestLogout = useUIStore((s) => s.requestLogout);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
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
    toast.success("Signed out — sign in with another account");
    openAuthModal("/");
  };

  const handleTrigger = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    // Collapsed rail: the first click expands the sidebar (opening the menu
    // here would render a clipped card); only expand it and let the user
    // click again to open the account menu.
    if (!sidebarExpanded) {
      setSidebarExpanded(true);
      return;
    }
    setOpen(!open);
  };

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={handleTrigger}
        title={showLabels ? undefined : "Account"}
        aria-label={showLabels ? undefined : "Account"}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-3 rounded-lg transition-colors duration-150 hover:bg-ai-hover",
          showLabels ? "justify-start px-3 py-2 w-full" : "justify-center py-2.5 w-full"
        )}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0">
          {avatar ? (
            <img src={avatar.url} alt={avatar.label} className="h-full w-full object-cover rounded-full" />
          ) : (
            (username || "U").charAt(0).toUpperCase()
          )}
        </div>
        {showLabels && (
          <>
            <span className="text-xs font-medium text-ai-text truncate">{username}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-ai-text-mut shrink-0 transition-transform", open && "rotate-180")} />
          </>
        )}
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
              <div className="overflow-hidden rounded-xl border border-ai-border bg-ai-sidebar p-1.5 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-accent-foreground shrink-0">
                  {avatar ? (
                    <img src={avatar.url} alt={avatar.label} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    (username || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-semibold text-ai-text">{username}</p>
                  <p className="text-[9px] text-ai-text-mut">Student account</p>
                </div>
              </div>

              <div className="my-1 h-px bg-ai-border" />

              {/* Navigation lives in the sidebar rail — this menu only handles
                  account-level actions: switching accounts and logging out. */}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-ai-text-sec transition-colors hover:bg-ai-hover hover:text-ai-text"
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
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
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
function NavItem({ item, pathname, isGuest, onClick, sidebarExpanded, showLabels, setSidebarExpanded, collapseSidebar, missionMode = false, partyMode = false }: {
  item: (typeof navItems)[number];
  pathname: string;
  isGuest: boolean;
  onClick?: () => void;
  sidebarExpanded: boolean;
  showLabels: boolean;
  setSidebarExpanded: (v: boolean) => void;
  collapseSidebar: () => void;
  missionMode?: boolean;
  partyMode?: boolean;
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
      title={showLabels ? undefined : item.label}
      aria-label={showLabels ? undefined : item.label}
      onClick={(e) => {
        if (isProtected) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('guest-nav-click', {
            detail: { href: item.href }
          }));
          return;
        }
        // Rail mode: clicking any icon expands the sidebar. Expanded mode:
        // clicking the active item again collapses back to the icon rail.
        if (!sidebarExpanded) {
          setSidebarExpanded(true);
        } else if (isActive) {
          collapseSidebar();
        }
        onClick?.();
      }}
      className={cn(
        "relative group w-full flex items-center gap-3 rounded-lg text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ai-accent/40",
        "transition-colors duration-150 hover:bg-ai-accent/10",
        missionMode && "hover:bg-violet-500/10",
        partyMode && "hover:bg-pink-400/10",
        showLabels ? "justify-start px-3 py-2.5" : "justify-center py-2.5"
      )}
    >
      {isActive && (
        <div className={cn("pointer-events-none absolute inset-0 rounded-lg bg-ai-accent-soft", missionMode && "border border-violet-400/15 bg-gradient-to-r from-violet-500/15 to-blue-500/[0.06] shadow-[0_0_24px_rgba(124,92,255,.08)]", partyMode && "border border-pink-300/40 bg-gradient-to-r from-pink-200/55 via-orange-100/45 to-cyan-100/45 shadow-[0_0_24px_rgba(244,114,182,.12)]")} />
      )}
      <NavIcon Icon={item.icon} isActive={isActive} showDot={isProtected} missionMode={missionMode} partyMode={partyMode} />
      {showLabels && (
        <span className={cn("relative z-10 transition-colors duration-150", isActive ? "text-ai-text font-semibold" : "text-ai-text-sec group-hover:text-ai-text")}>
          {item.label}
        </span>
      )}
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
