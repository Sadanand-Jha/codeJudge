"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Loader2,
  Mail,
  UserPlus,
  X,
  CheckCircle2,
  XCircle,
  Bell,
  Users,
  Trophy,
} from "lucide-react";
import {
  getIncomingCollaboratorRequests,
  respondToCollaboratorRequest,
  type IncomingCollaboratorRequest,
} from "@/services/quiz";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { useInboxStore } from "@/store/inboxStore";
import ProfileSectionHeader from "./ProfileSectionHeader";

type RequestStatus = "pending" | "accepted" | "rejected";
type Tab = "all" | "collaboration" | "notifications";

const STATUS_META: Record<RequestStatus, { label: string; badge: string; dot: string }> = {
  pending: {
    label: "PENDING",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    dot: "bg-amber-500",
  },
  accepted: {
    label: "ACCEPTED",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "REJECTED",
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
    dot: "bg-red-500",
  },
};

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "collaboration", label: "Collaboration" },
  { id: "notifications", label: "Notifications" },
];

interface InboxItem {
  id: string;
  kind: "collaboration" | "notification";
  icon: React.ComponentType<{ className?: string }>;
  iconTone: string;
  title: string;
  description: string;
  timeLabel: string;
  unread: boolean;
  status?: RequestStatus;
  href?: string;
}

export default function InboxPage() {
  const toast = useToast();
  const refreshInbox = useInboxStore((s) => s.refresh);
  const [requests, setRequests] = useState<IncomingCollaboratorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    try {
      const data = await getIncomingCollaboratorRequests();
      setRequests(data ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const handleRespond = async (req: IncomingCollaboratorRequest, status: "accepted" | "rejected") => {
    setBusyId(req.id);
    try {
      const updated = await respondToCollaboratorRequest(String(req.quiz_id), status);
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: updated.status as RequestStatus } : r))
      );
      refreshInbox();
      toast.success({
        title: status === "accepted" ? "Request accepted" : "Request rejected",
        description:
          status === "accepted"
            ? `You can now help manage "${req.quiz_name}".`
            : `You declined the invitation to collaborate on "${req.quiz_name}".`,
      });
    } catch {
      toast.error({
        title: "Could not respond",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const items = useMemo<InboxItem[]>(() => {
    const collab: InboxItem[] = (requests ?? []).map((r) => ({
      id: `collab-${r.id}`,
      kind: "collaboration",
      icon: UserPlus,
      iconTone: "from-[#F59E0B] to-[#F97316]",
      title: `Collaboration request · ${r.quiz_name}${r.quiz_code ? ` (${r.quiz_code})` : ""}`,
      description:
        r.status === "pending"
          ? "You have been invited to collaborate on this quiz."
          : r.status === "accepted"
          ? "You accepted this invitation and are now a collaborator."
          : "You declined this invitation.",
      timeLabel: r.created_at
        ? new Date(r.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric" })
        : "",
      unread: r.status === "pending",
      status: r.status as RequestStatus,
      href: `/quiz/${r.quiz_code}`,
    }));

    return collab;
  }, [requests]);

  const pendingCount = items.filter((i) => i.unread).length;
  const filtered = activeTab === "all" ? items : activeTab === "collaboration" ? items : [];

  const markAllRead = () => {
    toast.info({ title: "Inbox up to date", description: "There is nothing else to read right now." });
  };

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <ProfileSectionHeader
          title="Inbox"
          description="Messages, notifications, collaboration requests and quiz invitations."
          icon={Mail}
          iconTone="from-[#F59E0B] to-[#F97316]"
          badge={
            pendingCount > 0 ? (
              <span className="rounded-full bg-[#F59E0B]/10 px-2.5 py-1 text-[10px] font-bold text-[#F59E0B]">
                {pendingCount} unread
              </span>
            ) : undefined
          }
          actions={
            items.length > 0 ? (
              <button
                onClick={markAllRead}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : undefined
          }
        />

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#F59E0B]/15 to-[#F97316]/15 text-text-primary shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]"
                  : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
              )}
            >
              {tab.id === "collaboration" && <Users className="h-3.5 w-3.5" />}
              {tab.id === "notifications" && <Bell className="h-3.5 w-3.5" />}
              {tab.id === "all" && <Mail className="h-3.5 w-3.5" />}
              {tab.label}
              {tab.id !== "notifications" && items.length > 0 && (
                <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                  {items.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading inbox...
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B]/10 to-[#F97316]/10">
              {activeTab === "notifications" ? (
                <Bell className="h-5 w-5 text-[#F59E0B]" />
              ) : (
                <Trophy className="h-5 w-5 text-[#F59E0B]" />
              )}
            </div>
            <p className="mt-4 text-sm font-semibold text-text-primary">
              {activeTab === "notifications" ? "No notifications yet" : "Your inbox is empty"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
              {activeTab === "notifications"
                ? "System updates, quiz invitations and activity alerts will appear here."
                : "When someone invites you to collaborate or sends you a message, it will show up here."}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((item) => {
                const Icon = item.icon;
                const meta = item.status ? STATUS_META[item.status] : undefined;
                const busy = item.status === "pending" && busyId != null;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={cn(
                      "relative flex flex-wrap items-center gap-3.5 rounded-2xl border p-4 transition-colors",
                      item.unread
                        ? "border-[#F59E0B]/25 bg-gradient-to-r from-[#F59E0B]/[0.06] to-[#F97316]/[0.04]"
                        : "border-border bg-card"
                    )}
                  >
                    {/* Unread indicator */}
                    {item.unread && (
                      <span className="absolute left-0 top-1/2 hidden h-8 w-1 -translate-y-1/2 rounded-r-full bg-[#F59E0B] sm:block" />
                    )}

                    <div className="relative flex w-full flex-wrap items-center gap-3.5 sm:w-auto sm:flex-nowrap sm:flex-1">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md",
                          item.iconTone
                        )}
                      >
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-text-primary">{item.title}</p>
                          {meta && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold",
                                meta.badge
                              )}
                            >
                              <span className={cn("h-1 w-1 rounded-full", meta.dot)} />
                              {meta.label}
                            </span>
                          )}
                          {item.unread && (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-text-secondary">{item.description}</p>
                        {item.timeLabel && (
                          <p className="mt-0.5 text-[10px] text-text-muted">{item.timeLabel}</p>
                        )}
                      </div>

                      {item.status === "pending" ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => {
                              const req = requests.find((r) => `collab-${r.id}` === item.id);
                              if (req) handleRespond(req, "accepted");
                            }}
                            disabled={busy}
                            className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 text-[11px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              const req = requests.find((r) => `collab-${r.id}` === item.id);
                              if (req) handleRespond(req, "rejected");
                            }}
                            disabled={busy}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 text-[11px] font-semibold text-text-primary transition-all hover:bg-accent/5 active:scale-[0.97] disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            Reject
                          </button>
                          {item.href && (
                            <Link
                              href={item.href}
                              className="flex h-8 items-center rounded-lg border border-border px-3 text-[11px] font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                            >
                              View Quiz
                            </Link>
                          )}
                        </div>
                      ) : item.status === "accepted" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" /> You are a collaborator
                        </span>
                      ) : item.status === "rejected" ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                          <XCircle className="h-3.5 w-3.5" /> Declined
                        </span>
                      ) : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
