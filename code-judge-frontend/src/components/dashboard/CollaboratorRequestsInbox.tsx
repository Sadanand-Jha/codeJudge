"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Check, Loader2, Mail, UserPlus, X, XCircle, CheckCircle2 } from "lucide-react";
import {
  getIncomingCollaboratorRequests,
  respondToCollaboratorRequest,
  type IncomingCollaboratorRequest,
} from "@/services/quiz";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";

type RequestStatus = "pending" | "accepted" | "rejected";

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

export default function CollaboratorRequestsInbox() {
  const toast = useToast();
  const [requests, setRequests] = useState<IncomingCollaboratorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getIncomingCollaboratorRequests();
      setRequests(data ?? []);
    } catch (err) {
      console.error("Failed to load collaborator requests:", err);
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
      toast.success({
        title: status === "accepted" ? "Request accepted" : "Request rejected",
        description:
          status === "accepted"
            ? `You can now help manage "${req.quiz_name}".`
            : `You declined the invitation to collaborate on "${req.quiz_name}".`,
      });
    } catch (err) {
      console.error("Failed to respond to request:", err);
      toast.error({
        title: "Could not respond",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#7C3AED] text-text-primary shadow-[0_4px_12px_rgba(236,72,153,0.3)]">
            <UserPlus className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Collaborator Invites</h3>
            <p className="text-xs text-text-muted">Quiz owners have invited you to help manage their quizzes.</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-[#EC4899]/10 px-2.5 py-1 text-[10px] font-bold text-[#EC4899]">
            {pendingCount} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading invites...
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card-hover p-8 text-center">
          <Mail className="mx-auto h-6 w-6 text-text-muted" />
          <p className="mt-2 text-sm text-text-muted">No collaborator invites yet.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <AnimatePresence initial={false}>
            {requests.map((req) => {
              const meta = STATUS_META[req.status as RequestStatus] || STATUS_META.pending;
              const busy = busyId === req.id;
              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card-hover p-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {req.quiz_name}
                      {req.quiz_code && (
                        <span className="ml-2 font-mono text-[10px] font-semibold text-[#EC4899]">{req.quiz_code}</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold", meta.badge)}>
                        <span className={cn("h-1 w-1 rounded-full", meta.dot)} />
                        {meta.label}
                      </span>
                      {req.inviter_username && (
                        <span className="text-[10px] text-text-muted">Invited by @{req.inviter_username}</span>
                      )}
                      <span className="text-[10px] text-text-muted">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>

                  {req.status === "pending" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleRespond(req, "accepted")}
                        disabled={busy}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 text-[11px] font-bold text-text-primary transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(req, "rejected")}
                        disabled={busy}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 text-[11px] font-semibold text-text-secondary transition-all hover:bg-card-hover active:scale-[0.97] disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <Link
                        href={`/quiz/${req.quiz_code}`}
                        className="flex h-8 items-center rounded-lg border border-border px-3 text-[11px] font-semibold text-text-secondary transition-all hover:bg-card-hover"
                      >
                        View Quiz
                      </Link>
                    </div>
                  ) : req.status === "accepted" ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> You are a collaborator
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                      <XCircle className="h-3.5 w-3.5" /> Declined
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
