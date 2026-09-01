"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  ShieldCheck,
  UserRound,
  Mail,
  Clock,
  Check,
  ChevronDown,
  Search,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { PageHeader, MockDataTag, Panel, StatusBadge, BillButton, EmptyState } from "@/components/creator/billing/ui";
import { useToast } from "@/hooks/useToast";
import { ORG_MEMBERS } from "./mockData";
import type { OrgMember, OrgMemberRole } from "./types";

const ROLE_STYLES: Record<OrgMemberRole, { tone: "violet" | "sky" | "emerald" | "amber" | "slate"; icon: typeof UserRound }> = {
  Owner: { tone: "violet", icon: Crown },
  Admin: { tone: "sky", icon: ShieldCheck },
  Teacher: { tone: "emerald", icon: UserRound },
  Editor: { tone: "amber", icon: UserRound },
  Analyst: { tone: "slate", icon: UserRound },
};

const AVATAR_COLORS = [
  "from-pink-500 to-rose-500",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

export function MembersPage() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [members, setMembers] = useState(ORG_MEMBERS);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>("Teacher");

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.email.toLowerCase().includes(query.toLowerCase())
  );

  const sendInvite = () => {
    if (!inviteEmail.includes("@")) {
      toastError({ title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }
    const id = `mem_${Date.now()}`;
    const newMember: OrgMember = {
      id,
      name: inviteEmail.split("@")[0].replace(/[._-]/g, " "),
      email: inviteEmail,
      role: inviteRole,
      status: "Invited",
      joinedAt: "—",
      avatarUrl: null,
      permissions: [],
    };
    setMembers((prev) => [newMember, ...prev]);
    setInviteOpen(false);
    setInviteEmail("");
    toastSuccess({ title: "Invitation sent", description: `${inviteEmail} was invited as ${inviteRole}.` });
  };

  const changeRole = (id: string, role: OrgMemberRole) => {
    const member = members.find((m) => m.id === id);
    if (member?.role === "Owner") return;
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
    toastSuccess({ title: "Role updated", description: `${member?.name}'s role is now ${role}.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        subtitle="People who help you create and manage your tests."
        badge={<MockDataTag />}
        actions={<BillButton onClick={() => setInviteOpen(true)} icon={<UserPlus className="h-3.5 w-3.5" />}>Invite member</BillButton>}
      />

      {/* Invite modal */}
      <AnimatePresence>
        {inviteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setInviteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Invite a member</h3>
                  <p className="text-xs text-text-secondary">They&apos;ll get an email to join your team.</p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="w-full rounded-xl border border-border bg-input-bg py-2.5 pl-9 pr-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Teacher", "Editor", "Analyst"] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                          inviteRole === role
                            ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:border-ai-accent/40 dark:bg-ai-accent/10 dark:text-ai-accent"
                            : "border-border bg-card text-text-secondary hover:text-text-primary"
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setInviteOpen(false)}
                    className="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <BillButton onClick={sendInvite}>Send invitation</BillButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel title={`${members.length} members`} subtitle="Roles control what each member can do">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-border bg-input-bg py-2 pl-9 pr-3 text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No members found"
            description={`No team members match "${query}".`}
            action={<BillButton onClick={() => setQuery("")}>Clear search</BillButton>}
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((member, i) => {
              const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-white/[0.02] p-3.5 transition-colors hover:border-pink-500/30"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white", avatarColor)}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-text-primary">{member.name}</p>
                      {member.role === "Owner" && <Crown className="h-3.5 w-3.5 text-violet-500" />}
                    </div>
                    <p className="truncate text-[11px] text-text-secondary">{member.email}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted">
                      <Clock className="h-3 w-3" />
                      Joined {member.joinedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={member.status}
                      tone={member.status === "Active" ? "emerald" : "amber"}
                      dot
                    />
                    <RoleSelect
                      role={member.role}
                      disabled={member.role === "Owner"}
                      onChange={(role) => changeRole(member.id, role)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function RoleSelect({
  role,
  disabled,
  onChange,
}: {
  role: OrgMemberRole;
  disabled?: boolean;
  onChange: (role: OrgMemberRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const options: OrgMemberRole[] = ["Owner", "Admin", "Teacher", "Editor", "Analyst"];
  const roleMeta = ROLE_STYLES[role];
  const RoleIcon = roleMeta.icon;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-primary transition-colors",
          !disabled && "hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/30 dark:hover:text-ai-accent"
        )}
      >
        <RoleIcon className="h-3 w-3" />
        {role}
        {!disabled && <ChevronDown className="h-3 w-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            className="absolute right-0 z-30 mt-1 w-36 rounded-xl border border-border bg-card p-1 shadow-2xl"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                  opt === role ? "bg-pink-500/10 text-pink-600 dark:bg-ai-accent/10 dark:text-ai-accent" : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                )}
              >
                {opt}
                {opt === role && <Check className="ml-auto h-3 w-3" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}