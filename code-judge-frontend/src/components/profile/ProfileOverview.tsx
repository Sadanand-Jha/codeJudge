"use client";

import { getUserTimeZone } from "@/lib/timezone";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  AtSign,
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  Check,
  Code2,
  Copy,
  GraduationCap,
  History,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Quote,
  Sparkles,
} from "lucide-react";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import { cn } from "@/lib/helpers";
import { useAuthStore } from "@/store/authStore";

// Rating badges are disabled until competitive rating is shown on profiles.
// function ratingBadge(rating: number): { label: string; className: string } {
//   if (rating >= 2100)
//     return {
//       label: "Grandmaster",
//       className: "border-[var(--qs-sun)] bg-[var(--qs-sun)]/30 text-[var(--qs-ink)]",
//     };
//   if (rating >= 1900)
//     return {
//       label: "Master",
//       className: "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
//     };
//   if (rating >= 1600)
//     return {
//       label: "Expert",
//       className: "border-[var(--qs-blue)] bg-[var(--qs-blue)]/10 text-[var(--qs-blue)]",
//     };
//   if (rating >= 1400)
//     return {
//       label: "Specialist",
//       className: "border-[var(--qs-warn)] bg-[var(--qs-warnbg)] text-[var(--qs-warn)]",
//     };
//   if (rating >= 1200)
//     return {
//       label: "Pupil",
//       className: "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
//     };
//   return {
//     label: "Newbie",
//     className: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]",
//   };
// }

type HighlightTone = "brand" | "sun" | "ok" | "blue";

interface Highlight {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: HighlightTone;
}

const TONE_CLASSES: Record<HighlightTone, string> = {
  brand: "border-[var(--qs-brand)]/30 bg-[var(--qs-brand)]/10 text-[var(--qs-brand)]",
  sun: "border-[var(--qs-sun)] bg-[var(--qs-sun)]/30 text-[var(--qs-ink)]",
  ok: "border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  blue: "border-[var(--qs-blue)]/30 bg-[var(--qs-blue)]/10 text-[var(--qs-blue)]",
};

/*
const RATING_HIGHLIGHTS: Highlight[] = [
  { title: "Rising Coder", desc: "Reached 1200 rating", icon: Rocket, tone: "ok", min: 1200 },
  { title: "Specialist", desc: "Reached 1400 rating", icon: Star, tone: "sun", min: 1400 },
  { title: "Expert", desc: "Reached 1600 rating", icon: Target, tone: "blue", min: 1600 },
  { title: "Master", desc: "Reached 1900 rating", icon: Gem, tone: "brand", min: 1900 },
  { title: "Grandmaster", desc: "Reached 2100 rating", icon: Crown, tone: "sun", min: 2100 },
];
*/

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

const QUICK_LINKS = [
  {
    label: "Activity",
    desc: "Your latest quiz attempts",
    href: "/profile/activity",
    icon: Activity,
  },
  {
    label: "Achievements",
    desc: "Milestones you have unlocked",
    href: "/profile/achievements",
    icon: Award,
    comingSoon: true,
  },
  {
    label: "Statistics",
    desc: "Accuracy and performance trends",
    href: "/profile/statistics",
    icon: BarChart3,
  },
  {
    label: "History",
    desc: "Every submission in one place",
    href: "/profile/history",
    icon: History,
    comingSoon: true,
  },
];

function resolveAvatar(avatarUrl: string | null | undefined): string {
  return avatarUrl || DEFAULT_AVATAR_URL;
}

function friendlyLanguage(lang: unknown): string {
  if (typeof lang !== "string" || !lang.trim()) return "C++";
  const key = lang.trim().toLowerCase();
  return LANGUAGE_LABELS[key] || lang.trim();
}

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfileOverview() {
  const profile = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [copied, setCopied] = useState(false);

  const fullName = useMemo(() => {
    const parts = [profile?.firstName, profile?.lastName].filter(Boolean);
    return profile?.displayName || (parts.length ? parts.join(" ") : null);
  }, [profile]);

  const displayName = fullName || profile?.username || "Your profile";

  const highlights = useMemo<Highlight[]>(() => {
    const list: Highlight[] = [];
    if (profile?.isVerified) {
      list.push({
        title: "Verified",
        desc: "Verified QuizSupport member",
        icon: BadgeCheck,
        tone: "blue",
      });
    }
    if (!list.length) {
      list.push({
        title: "Member",
        desc: "Part of the QuizSupport community",
        icon: Award,
        tone: "sun",
      });
    }
    return list;
  }, [profile]);

  const language = useMemo(
    () => friendlyLanguage(profile?.preferences?.preferredLanguage),
    [profile]
  );

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", {
        timeZone: getUserTimeZone(),
        month: "short",
        year: "numeric",
      })
    : undefined;

  const country = profile?.country
    ? typeof profile.country === "string"
      ? profile.country
      : profile.country?.name
    : undefined;
  const college = profile?.college
    ? typeof profile.college === "string"
      ? profile.college
      : profile.college?.name
    : undefined;
  const company = profile?.company
    ? typeof profile.company === "string"
      ? profile.company
      : profile.company?.name
    : undefined;
  const state = profile?.state
    ? typeof profile.state === "string"
      ? profile.state
      : profile.state?.name
    : undefined;
  const location = [state, country].filter(Boolean).join(", ") || undefined;

  const completionFields = useMemo(
    () => [
      { label: "a profile photo", done: Boolean(profile?.avatarUrl) },
      { label: "a short bio", done: Boolean(profile?.bio) },
      { label: "your college", done: Boolean(college) },
      { label: "your company", done: Boolean(company) },
      { label: "your location", done: Boolean(location) },
      { label: "a username", done: Boolean(profile?.username) },
    ],
    [college, company, location, profile]
  );
  const completedFields = completionFields.filter((field) => field.done).length;
  const completionPct = Math.round((completedFields / completionFields.length) * 100);
  const nextStep = completionFields.find((field) => !field.done)?.label;

  const stats = [
    {
      label: "Highlights",
      value: highlights.length,
      hint: "Unlocked",
      icon: Award,
      highlight: true,
    },
    {
      label: "Member since",
      value: joinedDate || "—",
      hint: "Joined QuizSupport",
      icon: Calendar,
      highlight: false,
    },
    {
      label: "Account",
      value: profile?.isVerified ? "Verified" : "Member",
      hint: "QuizSupport status",
      icon: BadgeCheck,
      highlight: false,
    },
    {
      label: "Location",
      value: location || "—",
      hint: country ? "Based in" : "Add location",
      icon: MapPin,
      highlight: false,
    },
  ];

  const copyLink = async () => {
    try {
      const url = profile?.username
        ? `${window.location.origin}/students/${encodeURIComponent(profile.username)}`
        : window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable.
    }
  };

  if (!hasHydrated) {
    return (
      <div className="px-4 py-5 pb-20 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-[1280px] space-y-5">
          <div className="app-skeleton h-72 rounded-[24px] border-2 border-[var(--qs-line)]" />
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="app-skeleton h-28 rounded-[16px] border-2 border-[var(--qs-line)]"
              />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="app-skeleton h-96 rounded-[20px]" />
            <div className="app-skeleton h-96 rounded-[20px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-4 py-5 pb-20 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <motion.section
          {...fade}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
        >
          <div
            className="h-24 border-b-2 border-[var(--qs-ink)] bg-[linear-gradient(110deg,var(--qs-brand)_0%,#9b7cf6_48%,var(--qs-sun)_100%)] sm:h-28"
            aria-hidden="true"
          >
            <div
              className="h-full w-full opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, #fff 0 2px, transparent 2.5px), radial-gradient(circle at 70% 60%, #fff 0 1.5px, transparent 2px)",
                backgroundSize: "52px 52px, 38px 38px",
              }}
            />
          </div>

          <div className="px-4 pb-5 pt-6 sm:px-7 sm:pb-6">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-3.5 sm:gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[4px_4px_0_var(--qs-sun)] sm:h-28 sm:w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element -- avatar URLs are user-configured */}
                  <img
                    src={resolveAvatar(profile?.avatarUrl)}
                    alt={profile?.username || "User"}
                    className="h-full w-full object-cover"
                  />
                  {profile?.isVerified && (
                    <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-blue)] text-[var(--qs-on-brand)]">
                      <BadgeCheck className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 pb-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="qs-display truncate text-2xl font-extrabold text-[var(--qs-ink)] sm:text-3xl">
                      {displayName}
                    </h1>
                    {/* Rating badge hidden until competitive rating is shown on profiles. */}
                    {profile?.role?.toLowerCase() === "admin" && (
                      <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ink)]">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-[var(--qs-brand)]">
                    @{profile?.username || "user"}
                  </p>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-[var(--qs-muted)]">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{profile?.email || "—"}</span>
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <Link
                  href="/settings"
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none sm:flex-none"
                >
                  <Pencil className="h-4 w-4" />
                  Edit profile
                </Link>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] sm:flex-none"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[var(--qs-ok)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </button>
                {profile?.username ? (
                  <Link
                    href={`/students/${encodeURIComponent(profile.username)}`}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] sm:flex-none"
                  >
                    <Link2 className="h-4 w-4" />
                    Public view
                  </Link>
                ) : null}
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--qs-muted)]">
              {profile?.bio ||
                "Add a short bio to tell teachers and classmates what you are working on."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {college && (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--qs-ink)]">
                  <GraduationCap className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                  {college}
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--qs-ink)]">
                  <MapPin className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                  {location}
                </span>
              )}
              {joinedDate && (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--qs-ink)]">
                  <Calendar className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                  Joined {joinedDate}
                </span>
              )}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                {...fade}
                transition={{ duration: 0.35, delay: 0.04 * index, ease: "easeOut" }}
                className={cn(
                  "rounded-[16px] border-2 p-3.5 sm:p-4",
                  stat.highlight
                    ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] shadow-[3px_3px_0_var(--qs-ink)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-[10px] font-extrabold uppercase tracking-[0.08em]",
                      stat.highlight ? "text-[#1A1240]" : "text-[var(--qs-muted)]"
                    )}
                  >
                    {stat.label}
                  </p>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      stat.highlight ? "text-[#1A1240]" : "text-[var(--qs-brand)]"
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "mt-2 truncate text-[22px] font-extrabold leading-none tabular-nums sm:text-[28px]",
                    stat.highlight ? "text-[#1A1240]" : "text-[var(--qs-ink)]"
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-[11px] font-semibold",
                    stat.highlight ? "text-[#1A1240]/70" : "text-[var(--qs-muted)]"
                  )}
                >
                  {stat.hint}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
              className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
            >
              <SectionHeading icon={Quote} title="About" />
              <p className="mt-4 text-sm leading-relaxed text-[var(--qs-muted)]">
                {profile?.bio || "No bio yet. Add a short introduction from Settings."}
              </p>

              <div className="mt-5 grid gap-2.5 border-t-2 border-[var(--qs-line)] pt-5 sm:grid-cols-2">
                <IdentityRow icon={GraduationCap} label="Institution" value={college} />
                <IdentityRow icon={Building2} label="Company" value={company} />
                <IdentityRow icon={MapPin} label="Location" value={location} />
                <IdentityRow
                  icon={AtSign}
                  label="Username"
                  value={profile?.username ? `@${profile.username}` : undefined}
                />
              </div>
            </motion.section>

            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.12, ease: "easeOut" }}
              className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
            >
              <SectionHeading
                icon={Award}
                title="Highlights"
                action={
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                    Coming soon
                  </span>
                }
              />
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                {highlights.map((highlight, index) => {
                  const Icon = highlight.icon;
                  return (
                    <motion.div
                      key={highlight.title}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: 0.04 * index }}
                      className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-center"
                    >
                      <span
                        className={cn(
                          "mx-auto grid h-10 w-10 place-items-center rounded-[11px] border-2",
                          TONE_CLASSES[highlight.tone]
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <p className="mt-2 text-[11px] font-extrabold leading-tight text-[var(--qs-ink)]">
                        {highlight.title}
                      </p>
                      <p className="mt-1 text-[10px] leading-snug text-[var(--qs-muted)]">
                        {highlight.desc}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.16, ease: "easeOut" }}
              className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-6"
            >
              <SectionHeading icon={Sparkles} title="Jump back in" />
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {QUICK_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5 transition-colors hover:border-[var(--qs-brand)]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)] transition-colors group-hover:border-[var(--qs-brand)]">
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-[var(--qs-ink)]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-[var(--qs-muted)]">
                          {item.desc}
                        </span>
                      </span>
                      {item.comingSoon ? (
                        <span className="shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                          Coming soon
                        </span>
                      ) : (
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-colors group-hover:text-[var(--qs-brand)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.section>
          </div>

          <div className="space-y-5">
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              className="rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-5 shadow-[3px_3px_0_var(--qs-sun)]"
            >
              <SectionHeading icon={Sparkles} title="Profile completion" />
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="text-3xl font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                  {completionPct}%
                </p>
                <p className="text-[11px] font-bold text-[var(--qs-muted)]">
                  {completedFields} of {completionFields.length} complete
                </p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--qs-brand)] transition-[width] duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[var(--qs-muted)]">
                {nextStep
                  ? `Add ${nextStep} to make your profile easier to recognize.`
                  : "Your profile is complete. Nice work."}
              </p>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--qs-brand)] transition-colors hover:text-[var(--qs-ink)]"
              >
                {nextStep ? "Complete your profile" : "Review settings"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </motion.section>

            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.14, ease: "easeOut" }}
              className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5"
            >
              <SectionHeading icon={Code2} title="Skills" />
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-brand)]" />
                  {language}
                </span>
                {profile?.isVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ok)]">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--qs-brand)] transition-colors hover:text-[var(--qs-ink)]"
              >
                Manage skills
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </motion.section>

            {/*
            <motion.section
              {...fade}
              transition={{ duration: 0.4, delay: 0.18, ease: "easeOut" }}
              className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5"
            >
              <SectionHeading icon={Link2} title="Coding platforms" />
              <div className="mt-4 space-y-2">
                {["Codeforces", "LeetCode", "CodeChef"].map((platform) => (
                  <div
                    key={platform}
                    className="flex items-center justify-between gap-3 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5"
                  >
                    <span className="truncate text-xs font-bold text-[var(--qs-ink)]">
                      {platform}
                    </span>
                    <span className="shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                      Not connected
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--qs-muted)]">
                Connect your handles to bring competitive stats into one profile.
              </p>
            </motion.section>
            */}

          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
          <Icon className="h-4 w-4" strokeWidth={2.3} />
        </span>
        <h2 className="truncate text-sm font-extrabold text-[var(--qs-ink)]">{title}</h2>
      </div>
      {action}
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
    <div className="flex items-center gap-2.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
          {label}
        </p>
        <p className="truncate text-xs font-bold text-[var(--qs-ink)]">{value || "—"}</p>
      </div>
    </div>
  );
}
