"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Globe, User, LogOut, Search, LogIn } from "lucide-react";
import { toast } from "sonner";
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
    <header className="border-b border-[#E6E7EB] bg-white">
      {/* ===== TOP BAR ===== */}
      <div className="flex h-10 items-center justify-between border-b border-[#E6E7EB] px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-[#111827]">
          <span className="text-base">CodeJudge</span>
        </Link>

        {/* User Utility Menu */}
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <button className="flex items-center gap-1 hover:text-[#2563EB] transition-colors">
            <Bell className="h-3.5 w-3.5" />
          </button>
          <button className="flex items-center gap-1 hover:text-[#2563EB] transition-colors">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">EN</span>
          </button>
            {isAuthenticated ? (
            <>
              <Link href="/profile" className="flex items-center gap-1 hover:text-[#2563EB] transition-colors">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  useAuthStore.getState().logout();
                  toast.success("Logged out successfully");
                }}
                className="flex items-center gap-1 hover:text-[#DC2626] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 hover:text-[#2563EB] transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* ===== PRIMARY NAV ===== */}
      <div className="flex h-9 items-center border-b border-[#E6E7EB] bg-[#FAFAFB] px-4">
        <nav className="flex flex-1 items-center gap-0">
          {primaryTabs.map((tab) => {
            const isActive = pathname === tab.href && tab.label === "PROBLEMSET";
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`relative flex items-center px-3 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  isActive
                    ? "text-[#2563EB]"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2563EB]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Search box on right */}
        <div className="relative ml-4 flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3 w-3 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-32 rounded border border-[#E6E7EB] bg-white py-0.5 pl-6 pr-2 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
          />
        </div>
      </div>

      {/* ===== SECONDARY NAV ===== */}
      {isProblemset && (
        <div className="flex h-7 items-center border-b border-[#E6E7EB] bg-white px-4">
          <nav className="flex items-center gap-0">
            {secondaryTabs.map((tab) => {
              const isActive = tab.label === "PROBLEMS";
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`relative flex items-center px-3 py-0.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "text-[#2563EB] font-semibold"
                      : "text-[#6B7280] hover:text-[#111827]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#2563EB]" />
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