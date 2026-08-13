"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock3, Loader2, Send, ShieldAlert, Trash2, UserPlus, XCircle, Users } from "lucide-react";
import { SettingsCard } from "@/components/ui/settings";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/useToast";
import { useQuizSettings } from "./QuizSettingsContext";
import { FieldError, settingsInputClass } from "./settingsUi";
import {
  getQuizCollaborators,
  removeQuizCollaborator,
  sendCollaboratorRequest,
  type CollaboratorRequest,
} from "@/services/quiz";
import { lookupUserById } from "@/services/user";
import { cn } from "@/lib/helpers";

type RequestStatus = "pending" | "accepted" | "rejected";

const STATUS_META: Record<RequestStatus, { label: string; icon: typeof Clock3; badge: string; dot: string }> = {
  pending: {
    label: "Pending",
    icon: Clock3,
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    dot: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badge: "border-red-500/30 bg-red-500/10 text-red-500",
    dot: "bg-red-500",
  },
};

export default function CollaboratorsSection() {
  const toast = useToast();
  const { quizId } = useQuizSettings();
  const currentUserId = useAuthStore((s) => (s.user?.id != null ? String(s.user.id) : undefined));

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CollaboratorRequest[]>([]);

  const load = useCallback(async () => {
    if (!quizId) return;
    setLoading(true);
    try {
      const data = await getQuizCollaborators(String(quizId));
      setRequests(data.requests ?? []);
    } catch (err) {
      console.error("Failed to load collaborators:", err);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, [load]);

  const handleSendRequest = async () => {
    if (busy) return;

    const val = input.trim();
    setError(null);

    if (!val) {
      setError("Enter a collaborator user ID.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(val)) {
      setError("Enter a valid user ID (letters, numbers, '-' or '_').");
      return;
    }
    if (currentUserId && val === String(currentUserId)) {
      setError("You cannot invite yourself — you are the admin/creator.");
      return;
    }
    if (requests.some((r) => String(r.user_id).toLowerCase() === val.toLowerCase())) {
      const existing = requests.find((r) => String(r.user_id).toLowerCase() === val.toLowerCase());
      setError(
        existing?.status === "pending"
          ? "A request is already pending for this user."
          : existing?.status === "accepted"
          ? "This user is already a collaborator."
          : "This user previously rejected the request. Send a new request to invite them again."
      );
      return;
    }

    if (!quizId) {
      setError("Save the quiz first before inviting collaborators.");
      return;
    }

    setBusy(true);
    try {
      const user = await lookupUserById(val);
      await sendCollaboratorRequest(String(quizId), user.id);
      setInput("");
      setError(null);
      await load();
      toast.success({
        title: "Collaborator request sent",
        description: `@${user.username} will need to accept the request before they can help manage this quiz.`,
      });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setError("No user found with that user ID. Please check and try again.");
      } else if (status === 409) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(message || "A request already exists for this user.");
      } else {
        setError("We couldn't send the request right now. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string | number) => {
    if (!quizId) return;
    try {
      await removeQuizCollaborator(String(quizId), userId);
      await load();
      toast.success({ title: "Removed", description: "Collaborator / request removed." });
    } catch {
      toast.error({ title: "Could not remove", description: "Something went wrong. Please try again." });
    }
  };

  return (
    <SettingsCard
      title="Collaborators"
      description="Send collaborator requests — they only gain access after they accept."
      icon={<UserPlus className="h-5 w-5" />}
      iconClassName="bg-pink-500/10 text-pink-500"
    >
      {/* Admin / Creator */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-pink-500/20 bg-gradient-to-r from-pink-500/[0.07] to-violet-500/[0.07] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#7C3AED] text-white shadow-[0_4px_12px_rgba(236,72,153,0.35)]">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">ADMIN / CREATOR</p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            User ID: {currentUserId || "—"} <span className="text-pink-500">(You)</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-500">
          Owner
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">Add Collaborator</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <UserPlus className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendRequest();
                  }
                }}
                placeholder="Enter collaborator user ID"
                className={cn(
                  settingsInputClass,
                  "pl-10 focus:border-pink-500 focus:ring-pink-500/10",
                  error && "!border-danger focus:!border-danger focus:ring-danger/10"
                )}
              />
            </div>
            <button
              onClick={handleSendRequest}
              disabled={busy}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#7C3AED] px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.45)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "Sending..." : "Send Request"}
            </button>
          </div>
          {error && <FieldError message={error} />}
          <p className="mt-2 text-xs text-text-secondary">
            A collaborator request is sent — the user becomes a collaborator only after they accept.
          </p>
        </div>

        {/* Request / Collaborator list */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-input-bg/50 p-8 text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading collaborators...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-input-bg/50 p-6 text-center">
            <UserPlus className="mx-auto h-6 w-6 text-text-muted" />
            <p className="mt-2 text-xs font-medium text-text-secondary">
              No collaborator requests yet. Enter a user ID above to invite someone.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence initial={false}>
              {requests.map((collab) => {
                const meta = STATUS_META[collab.status as RequestStatus] || STATUS_META.pending;
                const StatusIcon = meta.icon;
                return (
                  <motion.div
                    key={String(collab.user_id)}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 transition-colors",
                      collab.status === "accepted"
                        ? "border-emerald-500/20 bg-emerald-500/[0.04] hover:border-emerald-500/30"
                        : collab.status === "rejected"
                        ? "border-red-500/15 bg-red-500/[0.03] hover:border-red-500/30"
                        : "border-amber-500/20 bg-amber-500/[0.04] hover:border-amber-500/30"
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", collab.status === "accepted" ? "bg-emerald-500/10 text-emerald-500" : collab.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500")}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        User ID: <span className="text-pink-500">{collab.user_id}</span>
                        {collab.username && (
                          <span className="ml-2 font-medium text-text-secondary">@{collab.username}</span>
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", meta.badge)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                        {collab.status === "pending" ? (
                          <span className="text-[10px] text-text-muted">Request sent — awaiting acceptance</span>
                        ) : collab.status === "accepted" ? (
                          <span className="text-[10px] text-emerald-500">Active collaborator</span>
                        ) : (
                          <span className="text-[10px] text-red-400">Request rejected</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(String(collab.user_id))}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-danger/20 bg-danger/5 px-3 py-1.5 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {collab.status === "accepted" ? "Remove" : "Cancel"}
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-pink-500/15 bg-pink-500/[0.05] p-3.5">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
        <p className="text-xs leading-relaxed text-text-secondary">
          Only <span className="font-semibold text-pink-500">accepted</span> collaborators can help manage this quiz.
          Pending and rejected users have no access.
        </p>
      </div>
    </SettingsCard>
  );
}
