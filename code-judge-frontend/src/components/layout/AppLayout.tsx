"use client";

import { useState, useEffect } from "react";
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
  Search,
  Bell,
  Flame,
  Route,
  Users,
  LogOut,
  BookOpen,
  Briefcase,
  Sparkles,
  UserPlus,
  ClipboardList,
  Plus,
  ChevronDown,
  Crown,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useSavedAvatar } from "@/store/avatarStore";
import { me, logout } from "@/services/auth";
import { toast } from "@/lib/toast";
import { GuestModeProvider, useGuestMode } from "@/context/GuestModeContext";
import AuthModal from "@/components/modals/AuthModal";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import LowCreditNotification from "@/components/ai/LowCreditNotification";

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

function isQuizPath(pathname: string): boolean {
  return pathname.startsWith("/quiz");
}

// Routes that should be fullscreen (no sidebar/navbar)
function isFullscreenRoute(pathname: string): boolean {
  return pathname.includes("/waiting");
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRedirect, setAuthModalRedirect] = useState<string | undefined>();
  const [assessmentExpanded, setAssessmentExpanded] = useState(() => isQuizPath(pathname));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const savedAvatar = useSavedAvatar();
  const { isGuest } = useGuestMode();
  const { theme } = useTheme();

  // Sync auth state with session cookie on app load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await me();
        if (!cancelled && res.success && res.data?.user) {
          const u = res.data.user as { id: string; email: string; username?: string };
          setAuth("session", u);
        }
      } catch {
        // Not authenticated — keep default state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAuth]);

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
    setAuthModalRedirect(redirectUrl);
    setAuthModalOpen(true);
  };

  // Fullscreen routes (waiting room, etc.) - no sidebar/navbar
  if (isFullscreenRoute(pathname)) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => {
            setAuthModalOpen(false);
            setAuthModalRedirect(undefined);
          }}
          redirectUrl={authModalRedirect}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
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
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        className={`fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50 select-none transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-text-primary tracking-tight">ByteClash</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if ("children" in item) {
              const isQuizActive = isQuizPath(pathname);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setAssessmentExpanded(!assessmentExpanded)}
                    className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer"
                  >
                    <div
                      className={`absolute inset-0 rounded-xl transition-all pointer-events-none ${
                        isQuizActive
                          ? "bg-[#EC4899]/15 shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                          : "group-hover:bg-accent/5"
                      }`}
                    />
                    <item.icon
                      className={`w-4 h-4 relative z-10 transition-colors ${
                        isQuizActive ? "text-[#EC4899]" : "text-text-secondary group-hover:text-text-primary"
                      }`}
                    />
                    <span
                      className={`relative z-10 transition-colors ${
                        isQuizActive ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
                      }`}
                    >
                      {item.label}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 relative z-10 ml-auto text-text-muted transition-transform ${
                        assessmentExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
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
                              onClick={() => setMobileMenuOpen(false)}
                              className="relative flex items-center gap-3 px-3 py-2 pl-10 text-sm font-medium rounded-xl transition-all duration-200 group ml-2 cursor-pointer"
                            >
                              {isChildActive && (
                                <motion.div
                                  layoutId="activeNavChild"
                                  className="absolute inset-0 rounded-xl bg-[#EC4899]/15 shadow-[0_0_16px_rgba(236,72,153,0.15)] pointer-events-none"
                                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                              )}
                              <child.icon
                                className={`w-3.5 h-3.5 relative z-10 transition-colors ${
                                  isChildActive ? "text-[#EC4899]" : "text-text-muted group-hover:text-[#EC4899]"
                                }`}
                              />
                              <span
                                className={`relative z-10 transition-colors ${
                                  isChildActive ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
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
                </div>
              );
            }
            return (
              <NavItem
                key={item.label}
                item={item}
                pathname={pathname}
                isGuest={isGuest}
                onClick={() => setMobileMenuOpen(false)}
              />
            );
          })}
        </nav>

        {/* Bottom: Streak + Version */}
        <div className="p-3 border-t border-border space-y-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/5">
              <Flame className="w-4 h-4 text-warning" />
              <span className="text-xs font-medium text-text-primary">12 Day Streak</span>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
              <div className="text-[10px] text-text-secondary mb-1">{"You're browsing as a guest"}</div>
              <button
                onClick={() => handleAuthRequired(pathname + window.location.search)}
                className="text-[10px] font-semibold text-accent hover:text-accent-secondary transition-colors"
              >
                Sign in to unlock all features →
              </button>
            </div>
          )}
          <div className="px-3 text-[9px] text-text-muted">ByteClash v1.0.0</div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* ===== TOP HEADER ===== */}
        <header
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          className="h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-30 select-none"
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent/5 text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <h1 className="text-sm font-semibold text-text-primary hidden sm:block whitespace-nowrap">{pageTitle}</h1>

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

           {/* Right icons */}
           <div className="flex items-center gap-2">
             <ThemeToggle />
             <button className="p-2 rounded-lg hover:bg-accent/5 text-text-secondary hover:text-text-primary transition-colors relative">
               <Bell className="w-4 h-4" />
               <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
             </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="w-8 h-8 rounded-full overflow-hidden border border-border bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white"
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
                <button
                  onClick={() => setLogoutConfirmOpen(true)}
                  className="hidden sm:flex p-2 rounded-lg hover:bg-accent/5 text-text-secondary hover:text-danger transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleAuthRequired(pathname + window.location.search)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all"
              >
                <UserPlus className="w-3 h-3" />
                Sign in
              </button>
            )}
          </div>
        </header>

        {/* ===== PAGE CONTENT ===== */}
        <main className="flex-1">{children}</main>
      </div>

      <LogoutConfirmModal
        open={logoutConfirmOpen}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          handleLogout();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          setAuthModalRedirect(undefined);
        }}
        redirectUrl={authModalRedirect}
      />
      <LowCreditNotification />
    </div>
  );
}

// Guest badge for navigation items
function NavItem({ item, pathname, isGuest, onClick }: {
  item: typeof navItems[number];
  pathname: string;
  isGuest: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

  // Routes that are protected for guests
  const protectedForGuests = ["/ai/chat", "/editor", "/analytics", "/settings", "/collections"];
  const isProtected = isGuest && protectedForGuests.includes(item.href);

  return (
    <Link
      key={item.label}
      href={item.href}
      onClick={(e) => {
        if (isProtected) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('guest-nav-click', {
            detail: { href: item.href }
          }));
        } else {
          onClick?.();
        }
      }}
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-[250ms] group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute inset-0 rounded-xl bg-accent/15 shadow-[0_0_20px_rgba(124,58,237,0.15)] pointer-events-none"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Icon
        className={`w-4 h-4 relative z-10 transition-colors duration-[250ms] ${
          isActive ? "text-accent" : "text-text-secondary group-hover:text-accent group-hover:scale-110"
        }`}
      />
      <span
        className={`relative z-10 transition-colors duration-[250ms] ${
          isActive ? "text-text-primary font-semibold" : "text-text-secondary group-hover:text-text-primary"
        }`}
      >
        {item.label}
      </span>
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
    <GuestModeProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </GuestModeProvider>
  );
}