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
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { me, logout } from "@/services/auth";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Problems", icon: Code2, href: "/problems" },
  { label: "Contests", icon: Trophy, href: "/contests" },
  { label: "Leaderboard", icon: Award, href: "/leaderboard" },
  { label: "Roadmaps", icon: Route, href: "/roadmaps" },
  { label: "Collections", icon: Bookmark, href: "/collections" },
  { label: "Discussions", icon: MessageSquare, href: "/discussions" },
  { label: "Achievements", icon: TrendingUp, href: "/achievements" },
  { label: "Analytics", icon: Users, href: "/analytics" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

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

  // Theme is currently dark-only for the premium design system.
  // Toggle is wired for future light theme support.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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
    navItems.find((n) => pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)))?.label || "CodeJudge";

  return (
    <div className="min-h-screen bg-[#09090B] flex">
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
        className={`fixed left-0 top-0 h-screen w-64 bg-[#09090B] border-r border-white/[0.06] flex flex-col z-50 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">CodeJudge</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-[#7C3AED]/15 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 relative z-10 transition-colors ${
                    isActive ? "text-white" : "text-[#9CA3AF] group-hover:text-white"
                  }`}
                />
                <span
                  className={`relative z-10 transition-colors ${
                    isActive ? "text-white" : "text-[#9CA3AF] group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Streak + Version */}
        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03]">
            <Flame className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-xs font-medium text-white">12 Day Streak</span>
          </div>
          <div className="px-3 text-[9px] text-[#6B7280]">CodeJudge v1.0.0</div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* ===== TOP HEADER ===== */}
        <header className="h-14 border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl flex items-center px-4 gap-4 sticky top-0 z-30">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF]"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <h1 className="text-sm font-semibold text-white hidden sm:block whitespace-nowrap">{pageTitle}</h1>

          {/* Global search */}
          <div className="flex-1 max-w-md mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search by title, ID, tag or company..."
                className="w-full bg-[#111827] border border-white/[0.06] rounded-xl py-2 pl-10 pr-10 text-xs text-white placeholder-[#6B7280] outline-none focus:border-[#7C3AED]/40 transition-colors"
              />
              <kbd className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-medium text-[#9CA3AF] bg-white/[0.04] border border-white/[0.06] rounded-md">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="p-2 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button className="p-2 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-white transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white"
                  title={user?.username || "Profile"}
                >
                  {(user?.username || "U").charAt(0).toUpperCase()}
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex p-2 rounded-lg hover:bg-white/[0.04] text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
              >
                Sign in
              </Link>
            )}
          </div>
        </header>

        {/* ===== PAGE CONTENT ===== */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}