"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Code2,
  Trophy,
  Award,
  TrendingUp,
  MessageSquare,
  Settings,
  Bookmark,
  Menu,
  PanelLeftClose,
  Search,
  Flame,
  Route,
  Users,
  LogOut,
  BookOpen,
  Briefcase,
  Sparkles,
  ClipboardList,
  Plus,
  ChevronDown,
  Crown,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { logout } from "@/services/auth";
import { toast } from "@/lib/toast";
import { isNestedQuizPath, isQuizProblemsPath } from "@/lib/quizWorkspace";
import { cn } from "@/lib/helpers";
import { GuestModeProvider, useGuestMode } from "@/context/GuestModeContext";
import { ChatProvider } from "@/context/ChatContext";
import AuthModal from "@/components/modals/AuthModal";
import NavbarRightActions from "./NavbarRightActions";
import { useTheme } from "@/context/ThemeContext";
import LowCreditNotification from "@/components/ai/LowCreditNotification";
import AiAssistantStrip from "@/components/ai/AiAssistantStrip";

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

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  {
    label: "Assessment",
    icon: ClipboardList,
    href: "/quiz",
    expanded: true,
    children: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/quiz" },
      { label: "Create Quiz", icon: Plus, href: "/quiz/create" },
    ],
  },

  { label: "Problems", icon: Code2, href: "/problems" },
  { label: "Contests", icon: Trophy, href: "/contests" },
  { label: "Interview", icon: Briefcase, href: "/interview" },
  { label: "Leaderboard", icon: Award, href: "/leaderboard" },
  { label: "Roadmaps", icon: Route, href: "/roadmaps" },
  { label: "Collections", icon: Bookmark, href: "/collections" },
  { label: "Discussions", icon: MessageSquare, href: "/discussions" },
  { label: "AI Chat", icon: Sparkles, href: "/ai/chat" },
  { label: "Editor", icon: BookOpen, href: "/editor" },
  { label: "Achievements", icon: TrendingUp, href: "/achievements" },
  { label: "Analytics", icon: Users, href: "/analytics" },
  { label: "Upgrade", icon: Crown, href: "/pricing" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

// Subtle staircase rhythm for expanded nav items. Offsets start near 0, climb
// gently toward the middle of the list, then descend back — a small symmetric
// hump (0, 2, 4, 6, ... capped), not a diagonal. Applied as margin so the step
// settle animates smoothly when the rail expands/collapses.
const navStepOffset = (index: number, count: number) =>
  Math.min(Math.min(index, count - 1 - index) * 2, 10);

function isQuizPath(pathname: string): boolean {
  return pathname.startsWith("/quiz");
}

function isEditorPath(pathname: string): boolean {
  return pathname === "/editor";
}

// Routes that should be fullscreen (no sidebar/navbar)
function isFullscreenRoute(pathname: string): boolean {
  return pathname.includes("/waiting");
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const authModalOpen = useUIStore((s) => s.authModalOpen);
  const authModalRedirect = useUIStore((s) => s.authModalRedirect);
  const closeAuthModal = useUIStore((s) => s.closeAuthModal);
  const logoutConfirmOpen = useUIStore((s) => s.logoutConfirmOpen);
  const cancelLogout = useUIStore((s) => s.cancelLogout);
  const openAuthModal = useUIStore((s) => s.openAuthModal);
  const [assessmentExpanded, setAssessmentExpanded] = useState(() => isQuizPath(pathname));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const savedAvatar = useSavedAvatar();
  const { isGuest } = useGuestMode();
  const { theme } = useTheme();

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
  }, []);

  // Nested quiz creator workspace — the project sidebar slides out of the
  // viewport and the Quiz Settings / Problem workspace takes its place.
  const nestedWorkspace = isNestedQuizPath(pathname);
  // The AI assistant is only relevant inside the quiz creator's problem
  // building section (/quiz/{code}/problems and /quiz/{code}/problems/{id}).
  const showAiAssistant = isQuizProblemsPath(pathname);

  // Rehydrate token + user from zustand's persisted storage. No /auth/me call —
  // the profile saved at login time is rendered on every page from the store.
  useEffect(() => {
    hydrate();
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

  const pageTitle =
    navItems.find((n) => pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)))?.label ||
    "ByteClash";

  const handleAuthRequired = (redirectUrl?: string) => {
    openAuthModal(redirectUrl);
  };

  // Wait for persisted auth to rehydrate so user details render on first paint
  // without a flash of the guest UI.
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  // Fullscreen routes (waiting room, etc.) - no sidebar/navbar
  if (isFullscreenRoute(pathname)) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-ai-bg flex" data-ai-scope>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ===== SIDEBAR ===== */}
      <aside
        onMouseEnter={() => {
          suppressHoverRef.current = false;
          setSidebarExpanded(true);
        }}
        onMouseLeave={() => setSidebarExpanded(false)}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        className={cn(
          "fixed left-0 top-0 h-screen bg-ai-sidebar border-r border-ai-border flex flex-col z-50 select-none overflow-hidden",
          "transition-[width,transform] duration-200 ease-out",
          sidebarExpanded || mobileMenuOpen ? "w-64" : "w-[60px]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          nestedWorkspace && "lg:-translate-x-full lg:pointer-events-none"
        )}
      >
        {/* Logo */}
        <div className={cn("py-6 flex items-center", showLabels ? "px-6 justify-start" : "px-0 justify-center")}>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4 text-accent-foreground" />
            </div>
            {showLabels && (
              <span className="text-base font-bold text-ai-text tracking-tight whitespace-nowrap">ByteClash</span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 py-2 space-y-1 overflow-y-auto", showLabels ? "px-3" : "px-0")}>
          {navItems.map((item, index) => {
            const step = navStepOffset(index, navItems.length);
            if ("children" in item) {
              const isQuizActive = isQuizPath(pathname);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => {
                      if (!sidebarExpanded) {
                        setSidebarExpanded(true);
                        setAssessmentExpanded(true);
                      } else if (isQuizActive) {
                        collapseSidebar();
                      } else {
                        setAssessmentExpanded(!assessmentExpanded);
                      }
                    }}
                    title={sidebarExpanded ? undefined : "Assessment"}
                    aria-label={sidebarExpanded ? undefined : "Assessment"}
                    style={{ marginLeft: `${showLabels ? step + (isQuizActive ? 2 : 0) : 0}px` }}
                    className={cn(
                      "relative w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer whitespace-nowrap origin-left",
                      showLabels ? "justify-start px-3 py-2.5" : "justify-center px-0 py-2.5",
                      showLabels && "hover:translate-x-[3px] hover:scale-[1.03]",
                      isQuizActive && "shadow-[0_1px_3px_rgba(124,58,237,0.18)]"
                    )}
                  >
                    <div
                      className={`absolute inset-0 rounded-xl transition-colors pointer-events-none ${
                        isQuizActive ? "bg-ai-accent-soft" : "group-hover:bg-ai-accent/10"
                      }`}
                    />
                    <item.icon
                      className={`w-4 h-4 relative z-10 shrink-0 transition-colors ${
                        isQuizActive ? "text-ai-accent" : "text-ai-text-sec group-hover:text-ai-text"
                      }`}
                    />
                    {showLabels && (
                      <>
                        <span className={`relative z-10 transition-colors ${isQuizActive ? "text-ai-text" : "text-ai-text-sec group-hover:text-ai-text"}`}>
                          {item.label}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 relative z-10 ml-auto text-ai-text-mut transition-transform ${assessmentExpanded ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>
                  {showLabels && (
                    <AnimatePresence initial={false}>
                      {assessmentExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {item.children!.map((child) => {
                            const isChildActive = pathname === child.href || (child.href !== "/" && pathname.startsWith(child.href.split("#")[0]));
                            return (
                              <Link
                                key={child.label}
                                href={child.href}
                                onClick={() => { setAssessmentExpanded(true); setMobileMenuOpen(false); }}
                                className="relative flex items-center gap-3 px-3 py-2 pl-10 text-sm font-medium rounded-xl transition-all duration-200 group ml-2 cursor-pointer"
                              >
                                {isChildActive && (
                                  <div className="absolute inset-0 rounded-xl bg-ai-accent-soft pointer-events-none" />
                                )}
                                <child.icon
                                  className={`w-3.5 h-3.5 relative z-10 transition-colors ${
                                    isChildActive ? "text-ai-accent" : "text-ai-text-mut group-hover:text-ai-accent"
                                  }`}
                                />
                                <span
                                  className={`relative z-10 transition-colors ${
                                    isChildActive ? "text-ai-text" : "text-ai-text-sec group-hover:text-ai-text"
                                  }`}
                                >
                                  {child.label}
                                </span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            }
            return (
              <NavItem
                key={item.label}
                item={item}
                pathname={pathname}
                isGuest={isGuest}
                sidebarExpanded={sidebarExpanded}
                showLabels={showLabels}
                setSidebarExpanded={setSidebarExpanded}
                collapseSidebar={collapseSidebar}
                stepOffset={step}
                onClick={() => setMobileMenuOpen(false)}
              />
            );
          })}
        </nav>

        {/* Bottom: Account + Collapse */}
        <div className="border-t border-ai-border p-2 space-y-1">
          {isAuthenticated ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl transition-colors",
                showLabels ? "px-3 py-2 justify-start bg-ai-accent-soft" : "px-0 py-1 justify-center"
              )}
            >
              <Flame className="w-4 h-4 text-warning shrink-0" />
              {showLabels && <span className="text-xs font-medium text-ai-text whitespace-nowrap">12 Day Streak</span>}
            </div>
          ) : (
            showLabels && (
              <div className="px-3 py-2 rounded-xl bg-ai-accent-soft border border-ai-accent/20">
                <div className="text-[10px] text-ai-text-sec mb-1">{"You're browsing as a guest"}</div>
                <button
                  onClick={() => handleAuthRequired(pathname + window.location.search)}
                  className="text-[10px] font-semibold text-ai-accent hover:text-ai-accent-hover transition-colors"
                >
                  Sign in to unlock all features →
                </button>
              </div>
            )
          )}

          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-2 rounded-xl hover:bg-ai-hover transition-colors",
              showLabels ? "px-3 py-2 justify-start" : "px-0 py-1 justify-center"
            )}
            title={showLabels ? undefined : "Account"}
            aria-label={showLabels ? undefined : "Account"}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0">
              {savedAvatar ? (
                <img src={savedAvatar.url} alt={savedAvatar.label} className="h-full w-full object-cover rounded-full" />
              ) : (
                (user?.username || "U").charAt(0).toUpperCase()
              )}
            </div>
            {showLabels && (
              <span className="text-xs font-medium text-ai-text truncate">{user?.username || "Guest"}</span>
            )}
          </Link>

          {sidebarExpanded && (
            <button
              onClick={collapseSidebar}
              className="hidden lg:flex w-full items-center gap-2 px-3 py-2 rounded-xl text-ai-text-sec hover:bg-ai-hover hover:text-ai-text transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">Collapse</span>
            </button>
          )}

          {showLabels && (
            <div className="px-3 text-[9px] text-ai-text-mut">ByteClash v1.0.0</div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-[margin] duration-200 ease-out",
          nestedWorkspace ? "lg:ml-0" : sidebarExpanded ? "lg:ml-64" : "lg:ml-[60px]"
        )}
      >
        {/* ===== TOP HEADER ===== */}
        {!isEditorPath(pathname) && (
        <header
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          className="h-14 border-b border-ai-border bg-ai-bg/80 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-30 select-none"
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent/5 text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>

           {/* Brand logo — always visible (the project sidebar hides in the quiz workspace) */}
           <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="ByteClash home">
             <span className="hidden sm:block text-sm font-bold text-text-primary tracking-tight">ByteClash</span>
           </Link>

           {/* Page title */}
           <h1 className="text-sm font-semibold text-text-primary hidden md:block whitespace-nowrap">{pageTitle}</h1>

           {/* Global search */}
           <div className="flex-1 max-w-md mx-auto">
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
        )}

        {/* ===== PAGE CONTENT ===== */}
        <main className="flex-1">{children}</main>
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

// Guest badge for navigation items
function NavItem({ item, pathname, isGuest, onClick, sidebarExpanded, showLabels, setSidebarExpanded, collapseSidebar, stepOffset }: {
  item: typeof navItems[number];
  pathname: string;
  isGuest: boolean;
  onClick?: () => void;
  sidebarExpanded: boolean;
  showLabels: boolean;
  setSidebarExpanded: (v: boolean) => void;
  collapseSidebar: () => void;
  stepOffset: number;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  // Routes that are protected for guests
  const protectedForGuests = ["/ai/chat", "/editor", "/analytics", "/settings", "/collections"];
  const isProtected = isGuest && protectedForGuests.includes(item.href);

  // Staircase margin only while labels are shown; the active item steps one
  // notch further forward. Collapsed rail keeps icons on a straight line.
  const stepMargin = showLabels ? stepOffset + (isActive ? 2 : 0) : 0;

  return (
    <Link
      key={item.label}
      href={item.href}
      title={showLabels ? undefined : item.label}
      aria-label={showLabels ? undefined : item.label}
      style={{ marginLeft: `${stepMargin}px` }}
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
        "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/40 whitespace-nowrap origin-left",
        showLabels ? "justify-start px-3 py-2.5" : "justify-center px-0 py-2.5",
        showLabels && "hover:translate-x-[3px] hover:scale-[1.03]",
        "hover:bg-ai-accent/10",
        isActive && "shadow-[0_1px_3px_rgba(124,58,237,0.18)]"
      )}
    >
      {isActive && (
        <div className="absolute inset-0 rounded-xl bg-ai-accent-soft pointer-events-none" />
      )}
      <Icon
        className={`w-4 h-4 relative z-10 shrink-0 transition-colors duration-200 ${
          isActive ? "text-ai-accent" : "text-ai-text-sec group-hover:text-ai-text"
        }`}
      />
      {showLabels && (
        <span className={`relative z-10 transition-colors duration-200 ${isActive ? "text-ai-text font-semibold" : "text-ai-text-sec group-hover:text-ai-text"}`}>
          {item.label}
        </span>
      )}
      {isProtected && (
        <span className="ml-auto">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
        </span>
      )}
    </Link>
  );
}

// Main AppLayout with providers
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <GuestModeProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </GuestModeProvider>
    </ChatProvider>
  );
}