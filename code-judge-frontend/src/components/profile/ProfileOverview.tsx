"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AtSign,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Code2,
  Copy,
  Crown,
  Gem,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Quote,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { getUserInfo } from "@/services/user";
import type { UserInfo } from "@/types/user";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import { cn } from "@/lib/helpers";

/* =============================================
   Rating → specialist title badge
   Mirrors the tier system used across the app.
   ============================================= */
function ratingBadge(rating: number): { label: string; className: string } {
  if (rating >= 2100)
    return { label: "Grandmaster", className: "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]" };
  if (rating >= 1900)
    return { label: "Master", className: "border-[#F97316]/40 bg-[#F97316]/10 text-[#F97316]" };
  if (rating >= 1600)
    return { label: "Expert", className: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]" };
  if (rating >= 1400)
    return { label: "Specialist", className: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]" };
  if (rating >= 1200)
    return { label: "Pupil", className: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]" };
  return { label: "Newbie", className: "border-border bg-card-hover text-text-secondary" };
}

/* =============================================
   Achievement highlights — derived only from
   real profile data (rating, verification, role).
   ============================================= */
interface Highlight {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
  min?: number;
}

const RATING_HIGHLIGHTS: Highlight[] = [
  { title: "Rising Coder", desc: "Reached 1200 rating", icon: Rocket, gradient: "from-[#22C55E] to-[#10B981]", glow: "rgba(34,197,94,0.2)", min: 1200 },
  { title: "Specialist", desc: "Reached 1400 rating", icon: Star, gradient: "from-[#F59E0B] to-[#F97316]", glow: "rgba(245,158,11,0.2)", min: 1400 },
  { title: "Expert", desc: "Reached 1600 rating", icon: Target, gradient: "from-[#3B82F6] to-[#2563EB]", glow: "rgba(59,130,246,0.2)", min: 1600 },
  { title: "Master", desc: "Reached 1900 rating", icon: Gem, gradient: "from-[#F97316] to-[#F59E0B]", glow: "rgba(245,158,11,0.25)", min: 1900 },
  { title: "Grandmaster", desc: "Reached 2100 rating", icon: Crown, gradient: "from-[#FBBF24] to-[#DC2626]", glow: "rgba(251,191,36,0.2)", min: 2100 },
];

const LANGUAGE_LABELS: Record<string, string> = {
  c: "C",
  cpp: "C++",
  csharp: "C#",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  swift: "Swift",
  ruby: "Ruby",
};

function resolveAvatar(avatarUrl: string | null | undefined): string {
  return avatarUrl || DEFAULT_AVATAR_URL;
}

function friendlyLanguage(lang: unknown): string {
  if (typeof lang !== "string" || !lang.trim()) return "C++";
  const key = lang.trim().toLowerCase();
  return LANGUAGE_LABELS[key] || lang.trim();
}

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfileOverview() {
  const [profile, setProfile] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getUserInfo()
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fullName = useMemo(() => {
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean);
    return profile?.displayName || (parts.length ? parts.join(" ") : null);
  }, [profile]);

  const title = ratingBadge(profile?.rating ?? 0);

  const highlights = useMemo<Highlight[]>(() => {
    const rating = profile?.rating ?? 0;
    const list: Highlight[] = RATING_HIGHLIGHTS.filter((h) => rating >= (h.min ?? Infinity))
      .slice(-4)
      .map((h) => ({ ...h }));
    if (profile?.isVerified) {
      list.push({
        title: "Verified",
        desc: "Verified ByteClash member",
        icon: BadgeCheck,
        gradient: "from-[#3B82F6] to-[#06B6D4]",
        glow: "rgba(59,130,246,0.2)",
      });
    }
    if (!list.length) {
      list.push({
        title: "Member",
        desc: "Part of the ByteClash community",
        icon: Award,
        gradient: "from-[#F59E0B] to-[#F97316]",
        glow: "rgba(245,158,11,0.25)",
      });
    }
    return list;
  }, [profile]);

  const skills = useMemo(() => {
    const lang = friendlyLanguage(profile?.preferences?.preferredLanguage);
    return [lang];
  }, [profile]);

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short", year: "numeric" })
    : undefined;

  const country = profile?.country ? (typeof profile.country === "string" ? profile.country : profile.country?.name) : undefined;
  const college = profile?.college ? (typeof profile.college === "string" ? profile.college : profile.college?.name) : undefined;
  const company = profile?.company ? (typeof profile.company === "string" ? profile.company : profile.company?.name) : undefined;
  const state = profile?.state ? (typeof profile.state === "string" ? profile.state : profile.state?.name) : undefined;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-card lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ============ Main identity card ============ */}
        <motion.section
          {...fade}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--card-shadow)]"
        >
          {/* Soft gradient backdrop — fire theme */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F59E0B]/15 via-transparent to-[#DC2626]/10" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#F97316]/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#F59E0B]/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-8 p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
            {/* Avatar + identity */}
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              {/* Perfectly circular avatar with gradient ring + glow */}
              <div className="relative shrink-0">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-[#F59E0B] via-[#F97316] to-[#DC2626] opacity-50 blur-2xl" />
                <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-[#F59E0B] via-[#F97316] to-[#DC2626] p-[3px] shadow-lg sm:h-36 sm:w-36">
                  <img
                    src={resolveAvatar(profile?.avatarUrl)}
                    alt={profile?.username || "User"}
                    className="h-full w-full aspect-square rounded-full object-cover bg-card"
                  />
                </div>
                {profile?.isVerified && (
                  <span className="absolute bottom-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#06B6D4] shadow-md ring-2 ring-card">
                    <BadgeCheck className="h-4 w-4 text-white" />
                  </span>
                )}
              </div>

              {/* Name + info */}
              <div className="text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                  <h1 className="fire-text text-2xl font-bold tracking-tight sm:text-3xl">
                    {profile?.username || "User"}
                  </h1>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
                      title.className
                    )}
                  >
                    {title.label}
                  </span>
                  {profile?.role && profile.role.toLowerCase() === "admin" && (
                    <span className="rounded-full border border-[#F97316]/30 bg-[#F97316]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#F97316]">
                      Admin
                    </span>
                  )}
                </div>

                {fullName && (
                  <p className="mt-1 text-sm font-medium text-text-secondary">{fullName}</p>
                )}

                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-text-secondary sm:justify-start">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  {profile?.email || "—"}
                </p>

                {profile?.bio ? (
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
                    No tagline yet — this space will hold your professional bio.
                  </p>
                )}

                {/* Location / institution / joined */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-text-secondary sm:justify-start">
                  {college && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-text-muted" />
                      {college}
                    </span>
                  )}
                  {country && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-text-muted" />
                      {country}
                    </span>
                  )}
                  {joinedDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-text-muted" />
                      Joined {joinedDate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Trophy medallion — decorative, secondary */}
            <div className="hidden shrink-0 md:block">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#FBBF24]/20 blur-2xl" />
                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border border-[#FBBF24]/20 bg-gradient-to-br from-[#FBBF24]/10 to-[#F97316]/10 shadow-lg">
                  <Trophy className="h-9 w-9 text-[#FBBF24]" />
                  <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-[#FBBF24]">
                    {profile?.rating ?? 0}
                  </span>
                </div>
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                <span
                  className="absolute -bottom-2 left-3 h-2 w-2 animate-pulse rounded-full bg-[#F97316] shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                  style={{ animationDelay: "0.5s" }}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ============ Lower grid ============ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* About Me */}
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <SectionTitle icon={Quote} tone="from-[#F59E0B] to-[#F97316]" title="About Me" />
              <div className="mt-4">
                {profile?.bio ? (
                  <p className="text-sm leading-relaxed text-text-secondary">{profile.bio}</p>
                ) : (
                  <EmptyHint
                    title="No bio yet"
                    hint="A short about-me will make your profile feel personal."
                  />
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <IdentityRow icon={GraduationCap} label="Institution" value={college} />
                <IdentityRow icon={Building2} label="Company" value={company} />
                <IdentityRow
                  icon={MapPin}
                  label="Location"
                  value={[state, country].filter(Boolean).join(", ") || undefined}
                />
                <IdentityRow icon={AtSign} label="Username" value={profile?.username} />
              </div>
            </motion.section>

            {/* Current focus */}
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <SectionTitle icon={Target} tone="from-[#F97316] to-[#DC2626]" title="Current Focus" />
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                {profile?.bio
                  ? "Always improving — this is where your current goals and interests will live."
                  : "Focus areas will appear here as you set goals and interests."}
              </p>
            </motion.section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Skills */}
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <SectionTitle icon={Code2} tone="from-[#FBBF24] to-[#F59E0B]" title="Skills" />
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card-hover px-3 py-1.5 text-xs font-semibold text-text-primary"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F97316]" />
                    {skill}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-text-muted">
                Languages and technologies you use will show up here.
              </p>
            </motion.section>

            {/* Coding platforms */}
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <SectionTitle icon={Link2} tone="from-[#F59E0B] to-[#EA580C]" title="Coding Platforms" />
              <div className="mt-4 space-y-2.5">
                {["Codeforces", "LeetCode", "CodeChef"].map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between rounded-xl border border-dashed border-border bg-card-hover/50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-text-secondary">{platform}</span>
                    <span className="rounded-full bg-card-hover px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      Not connected
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-text-muted">
                Connect platforms to showcase them on your profile.
              </p>
            </motion.section>
          </div>
        </div>

        {/* ============ Achievements / Highlights ============ */}
        <motion.section
          {...fade}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SectionTitle icon={Award} tone="from-[#FBBF24] to-[#F59E0B]" title="Highlights" />
            <Link
              href="/profile/achievements"
              className="text-xs font-semibold text-[#F59E0B] transition-colors hover:text-[#F97316]"
            >
              View all →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {highlights.map((h, i) => {
              const Icon = h.icon;
              return (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  whileHover={{ y: -4 }}
                  className="relative overflow-hidden rounded-xl border border-border bg-card-hover p-4 text-center"
                  style={{ boxShadow: `0 0 24px ${h.glow}` }}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl" style={{ background: h.glow }} />
                  <div className={cn("relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", h.gradient)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="relative mt-3 text-xs font-semibold text-text-primary">{h.title}</p>
                  <p className="relative mt-1 text-[10px] leading-relaxed text-text-secondary">{h.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ============ Connect / Contact ============ */}
        <motion.section
          {...fade}
          transition={{ duration: 0.4, delay: 0.24, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#F59E0B]/10 via-transparent to-[#DC2626]/10" />
          <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#F97316] p-[2px]">
                  <img
                    src={resolveAvatar(profile?.avatarUrl)}
                    alt={profile?.username || "User"}
                    className="h-full w-full aspect-square rounded-full object-cover bg-card"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Connect with {profile?.username || "this member"}</p>
                <p className="mt-0.5 text-xs text-text-muted">Reach out, share, or keep your identity up to date.</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#F59E0B]/25 transition-all hover:shadow-[#F97316]/40 hover:brightness-110"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Link>
              <button
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-border-hover hover:bg-card-hover"
              >
                {copied ? <Sparkles className="h-4 w-4 text-[#22C55E]" /> : <Copy className="h-4 w-4" />}
                {copied ? "Link Copied" : "Copy Profile Link"}
              </button>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                <Mail className="h-4 w-4" />
                Contact
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

/* =============================================
   Small shared building blocks
   ============================================= */

function SectionTitle({
  icon: Icon,
  title,
  tone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md", tone)}>
        <Icon className="h-4 w-4 text-white" strokeWidth={2.2} />
      </span>
      <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function IdentityRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card-hover">
        <Icon className="h-3.5 w-3.5 text-text-muted" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-text-primary">{value || "—"}</p>
      </div>
    </div>
  );
}

function EmptyHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card-hover/50 p-4 text-center">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  );
}
