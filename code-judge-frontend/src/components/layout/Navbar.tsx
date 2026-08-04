"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Globe, User, LogOut, Search, LogIn, Code2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import { me, logout } from "@/services/auth";

const primaryTabs = [
  { label: "HOME", href: "/" },
  { label: "TOP", href: "/top" },
  { label: "CATALOG", href: "/catalog" },
  { label: "CONTESTS", href: "/contests" },
  { label: "GYM", href: "/gym" },
  { label: "PROBLEMSET", href: "/problems" },
  { label: "GROUPS", href: "/groups" },
  { label: "RATING", href: "/rating" },
  { label: "EDU", href: "/edu" },
  { label: "API", href: "/api" },
  { label: "CALENDAR", href: "/calendar" },
  { label: "HELP", href: "/help" },
];

const secondaryTabs = [
  { label: "MAIN", href: "/problems" },
  { label: "ACMSGURU", href: "/problems/acmsguru" },
  { label: "PROBLEMS", href: "/problems" },
  { label: "SUBMIT", href: "/problems/submit" },
  { label: "STATUS", href: "/problems/status" },
  { label: "STANDINGS", href: "/problems/standings" },
  { label: "CUSTOM TEST", href: "/problems/custom-test" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isProblemset =
    pathname.startsWith("/problems") || pathname === "/problemset";
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);

  // Sync auth state with session cookie on app load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await me();
        if (!cancelled && res.success && res.data?.user) {
          const user = res.data.user as { id: string; email: string; username?: string };
          setAuth("session", user);
        }
      } catch {
        // Not authenticated — keep default state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAuth]);

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      {/* ===== TOP BAR ===== */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-text-primary tracking-tight">ByteClash</span>
        </Link>

        {/* User Utility Menu */}
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <button className="flex items-center gap-1 hover:text-text-primary transition-colors">
            <Bell className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1 hover:text-text-primary transition-colors">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">EN</span>
          </button>
          {isAuthenticated ? (
            <>
              <Link href="/profile" className="flex items-center gap-1 hover:text-text-primary transition-colors">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  useAuthStore.getState().logout();
                  toast.success("Logged out successfully");
                }}
                className="flex items-center gap-1 hover:text-danger transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 hover:text-text-primary transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* ===== PRIMARY NAV ===== */}
      <div className="flex h-9 items-center border-b border-border bg-card px-4">
        <nav className="flex flex-1 items-center gap-0">
          {primaryTabs.map((tab) => {
            const isActive = pathname === tab.href && tab.label === "PROBLEMSET";
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`relative flex items-center px-3 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  isActive
                    ? "text-accent"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Search box on right */}
        <div className="relative ml-4 flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3 w-3 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-32 rounded-lg border border-input-border bg-input-bg py-0.5 pl-6 pr-2 text-[11px] text-text-primary placeholder-text-muted outline-none focus:border-accent/40 transition-colors"
          />
        </div>
      </div>

      {/* ===== SECONDARY NAV ===== */}
      {isProblemset && (
        <div className="flex h-7 items-center border-b border-border bg-background px-4">
          <nav className="flex items-center gap-0">
            {secondaryTabs.map((tab) => {
              const isActive = tab.label === "PROBLEMS";
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`relative flex items-center px-3 py-0.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "text-accent font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}