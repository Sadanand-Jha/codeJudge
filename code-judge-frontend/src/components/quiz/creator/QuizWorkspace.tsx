"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  FileText,
  Send,
  Save,
  Eye,
  Rocket,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/helpers";

type QuizWorkspaceTab = "overview" | "questions" | "sections" | "settings" | "participants" | "review" | "publish";

const TABS: Array<{ id: QuizWorkspaceTab; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "questions", label: "Questions", icon: ListChecks },
  { id: "sections", label: "Sections", icon: Settings },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "participants", label: "Participants", icon: Users },
  { id: "review", label: "Review", icon: FileText },
  { id: "publish", label: "Publish", icon: Send },
];

interface QuizWorkspaceProps {
  children: React.ReactNode;
  quizTitle: string;
  quizStatus: "draft" | "published" | "scheduled";
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
}

export function QuizWorkspace({
  children,
  quizTitle,
  quizStatus,
  onBack,
  onSave,
  onPreview,
  onPublish,
  isSaving = false,
  lastSaved = null,
}: QuizWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<QuizWorkspaceTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const formatLastSaved = (date: Date | null) => {
    if (!date) return "Not saved";
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  const statusConfig = {
    draft: { label: "Draft", color: "bg-yellow-500/20 text-yellow-400", dot: "bg-yellow-500" },
    published: { label: "Published", color: "bg-emerald-500/20 text-emerald-400", dot: "bg-emerald-500" },
    scheduled: { label: "Scheduled", color: "bg-violet-500/20 text-violet-400", dot: "bg-violet-500" },
  };

  const status = statusConfig[quizStatus];

  return (
    <div className="min-h-screen bg-[#0B0D12] flex flex-col">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Left sidebar - Quiz building navigation */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[#263245] bg-[#1B2433] shadow-2xl lg:hidden"
          >
            <div className="flex h-full flex-col">
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#263245] px-4">
                <Link
                  href="/creator"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-xs font-bold text-foreground">Studio</span>
                </Link>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                    className={cn(
                      "group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "text-foreground bg-gradient-to-r from-[#EC4899]/10 to-[#3B82F6]/10"
                        : "text-muted-foreground hover:bg-[#263245] hover:text-foreground"
                    )}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                ))}
              </nav>
              <div className="border-t border-[#263245] p-3 space-y-1">
                <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#3A4963] bg-[#263245] px-3 py-2 text-xs font-semibold text-[#CBD5E1] transition-colors hover:border-[#EC4899]/50 hover:bg-[#2D3B52]">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 px-3 py-2 text-xs font-semibold text-[#EC4899] transition-colors hover:bg-[#EC4899]/20">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#3B82F6] px-3 py-2 text-xs font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                  <Rocket className="w-3.5 h-3.5" /> Publish
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside data-sidebar="true" className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[260px] border-r border-[#263245] bg-[#1B2433] flex flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#263245] px-4">
          <Link href="/creator" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold text-foreground">Studio</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-foreground bg-gradient-to-r from-[#EC4899]/10 to-[#3B82F6]/10"
                  : "text-muted-foreground hover:bg-[#263245] hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t border-[#263245] p-3 space-y-1">
          <button onClick={onSave} className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#3A4963] bg-[#263245] px-3 py-2 text-xs font-semibold text-[#CBD5E1] transition-colors hover:border-[#EC4899]/50 hover:bg-[#2D3B52]">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={onPreview} className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 px-3 py-2 text-xs font-semibold text-[#EC4899] transition-colors hover:bg-[#EC4899]/20">
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button onClick={onPublish} className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#3B82F6] px-3 py-2 text-xs font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Rocket className="w-3.5 h-3.5" /> Publish
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[260px] flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#263245] bg-[#0B0D12]/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden shrink-0 p-2 rounded-xl border border-[#3A4963] bg-[#1B2433] text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onBack}
            className="lg:hidden shrink-0 p-2 rounded-xl border border-[#3A4963] bg-[#1B2433] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#3B82F6] shrink-0">
                <ListChecks className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className="truncate text-sm font-semibold text-foreground">{quizTitle}</p>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]", status.color)}>
                  <span className="relative h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lastSaved ? formatLastSaved(lastSaved) : "Not saved"}
            </span>

            <div className="h-6 w-px bg-[#263243] mx-1 hidden sm:block" />

            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#3A4963] bg-[#263245] px-3 py-1.5 text-xs font-semibold text-[#CBD5E1] transition-colors hover:border-[#EC4899]/50 hover:bg-[#2D3B52] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save"}</span>
            </button>

            <button
              onClick={onPreview}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 px-3 py-1.5 text-xs font-semibold text-[#EC4899] transition-colors hover:bg-[#EC4899]/20"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            <button
              onClick={onPublish}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#3B82F6] px-4 py-1.5 text-xs font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}