"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Users, UserCheck, UserPlus, Loader2, Star, AtSign, Eye } from "lucide-react";
import { getFollowers, getFollowing, followUser, unfollowUser, type ProfileUser } from "@/services/profile";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import ProfileSectionHeader from "./ProfileSectionHeader";

interface SocialPageProps {
  mode: "followers" | "following";
}

export default function SocialPage({ mode }: SocialPageProps) {
  const toast = useToast();
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isFollowers = mode === "followers";

  const load = useCallback(async () => {
    try {
      const data = isFollowers ? await getFollowers() : await getFollowing();
      setUsers(data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [isFollowers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const handleUnfollow = async (user: ProfileUser) => {
    setBusyId(user.id);
    try {
      await unfollowUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success({
        title: "Unfollowed",
        description: `You are no longer following @${user.username}.`,
      });
    } catch {
      toast.error({ title: "Could not unfollow", description: "Something went wrong. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const handleFollow = async (user: ProfileUser) => {
    setBusyId(user.id);
    try {
      await followUser(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isFollowing: true } : u))
      );
      toast.success({ title: "Following", description: `You are now following @${user.username}.` });
    } catch {
      toast.error({ title: "Could not follow", description: "Something went wrong. Please try again." });
    } finally {
      setBusyId(null);
    }
  };

  const fullName = (u: ProfileUser) =>
    u.displayName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username;

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <ProfileSectionHeader
          title={isFollowers ? "Followers" : "Following"}
          description={
            isFollowers
              ? "Developers following you on ByteClash."
              : "Developers you follow — keep up with their problem solving."
          }
          icon={isFollowers ? Users : UserCheck}
          iconTone={isFollowers ? "from-[#22C55E] to-[#10B981]" : "from-[#8B5CF6] to-[#6366F1]"}
          badge={
            !loading && users.length > 0 ? (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                {users.length} {isFollowers ? "followers" : "following"}
              </span>
            ) : undefined
          }
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : users.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E]/10 to-[#10B981]/10">
              <Users className="h-5 w-5 text-[#22C55E]" />
            </div>
            <p className="mt-4 text-sm font-semibold text-text-primary">
              {isFollowers ? "No followers yet" : "Not following anyone yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
              {isFollowers
                ? "When other developers follow you, they will appear here."
                : "When you follow other developers, they will appear here so you can track their progress."}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {users.map((user, i) => {
                const avatarUrl = user.avatarUrl || DEFAULT_AVATAR_URL;
                const busy = busyId === user.id;
                return (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border-hover"
                  >
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#F59E0B]/5 blur-2xl" />
                    <div className="relative flex items-start gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#F97316] to-[#F59E0B]">
                        <img src={avatarUrl} alt={user.username || "User"} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-text-primary">{fullName(user)}</p>
                          {user.rating != null && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning">
                              <Star className="h-2.5 w-2.5" />
                              {user.rating}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-muted">
                          <AtSign className="h-3 w-3 shrink-0" />
                          {user.username}
                        </p>
                        {user.bio && (
                          <p className="mt-1.5 line-clamp-1 text-xs text-text-secondary">{user.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="relative mt-4 flex items-center gap-2">
                      <Link
                        href={`/profile`}
                        className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-[11px] font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Profile
                      </Link>
                      {!isFollowers && user.isFollowing && (
                        <button
                          onClick={() => handleUnfollow(user)}
                          disabled={busy}
                          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 text-[11px] font-bold text-[#F59E0B] transition-all hover:bg-[#F59E0B]/15 active:scale-[0.97] disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                          Unfollow
                        </button>
                      )}
                      {isFollowers && (
                        <button
                          onClick={() => handleFollow(user)}
                          disabled={busy}
                          className={cn(
                            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-all active:scale-[0.97] disabled:opacity-50",
                            user.isFollowing
                              ? "border border-border bg-card-hover text-text-secondary"
                              : "bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
                          )}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : user.isFollowing ? (
                            <UserCheck className="h-3.5 w-3.5" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          {user.isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
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
