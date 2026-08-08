"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Code2,
  Trophy,
  FileCode,
  ListMusic,
  TrendingUp,
  Award,
  MessageSquare,
  Settings,
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Problems", icon: Code2, href: "/problems" },
  { label: "Contests", icon: Trophy, href: "/contests" },
  { label: "Submissions", icon: FileCode, href: "/submissions" },
  { label: "Playlists", icon: ListMusic, href: "/playlists" },
  { label: "Ratings", icon: TrendingUp, href: "/ratings" },
  { label: "Achievements", icon: Award, href: "/achievements" },
  { label: "Discussions", icon: MessageSquare, href: "/discussions" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">ByteClash</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
            >
              {item.active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl bg-[#7C3AED]/15 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={`w-4 h-4 relative z-10 transition-colors ${
                  item.active ? "text-white" : "text-muted-foreground group-hover:text-white"
                }`}
              />
              <span
                className={`relative z-10 transition-colors ${
                  item.active ? "text-white" : "text-muted-foreground group-hover:text-white"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User mini card at bottom */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-xs font-bold text-white">
            U
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">User</p>
            <p className="text-[10px] text-muted-foreground truncate">user@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}