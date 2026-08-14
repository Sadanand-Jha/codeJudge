"use client";

import { motion } from "framer-motion";
import { Trophy, Calendar, MapPin, AtSign } from "lucide-react";
import { DEFAULT_AVATAR_URL } from "@/config/dicebear";
import { cn } from "@/lib/helpers";

interface ProfileHeroProps {
  username: string;
  email: string;
  fullName?: string | null;
  joinDate?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  rating?: number;
  maxRating?: number;
  country?: string | null;
  location?: string | null;
}

function ratingTitle(rating: number): { label: string; className: string } {
  if (rating >= 2100) return { label: "Grandmaster", className: "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]" };
  if (rating >= 1900) return { label: "Master", className: "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#7C3AED]" };
  if (rating >= 1600) return { label: "Expert", className: "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#3B82F6]" };
  if (rating >= 1400) return { label: "Specialist", className: "border-[#EC4899]/40 bg-[#EC4899]/10 text-[#EC4899]" };
  if (rating >= 1200) return { label: "Pupil", className: "border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]" };
  return { label: "Newbie", className: "border-border bg-card-hover text-text-secondary" };
}

export default function ProfileHero({
  username,
  email,
  fullName,
  joinDate = "Jan 2024",
  avatarUrl,
  bio,
  rating = 0,
  maxRating = 0,
  country,
  location,
}: ProfileHeroProps) {
  const displayAvatarUrl = avatarUrl || DEFAULT_AVATAR_URL;

  const title = ratingTitle(rating);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[var(--card-shadow)]"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#3B82F6]/10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-[100px]" />

      <div className="relative z-10 flex items-center justify-between gap-8">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-[#7C3AED]/20 ring-2 ring-[#7C3AED]/30">
            <img
              src={displayAvatarUrl}
              alt={username || "User"}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">{username || "User"}</h1>
              {fullName && (
                <span className="hidden text-sm text-text-secondary sm:inline">· {fullName}</span>
              )}
              <span className={cn("text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border", title.className)}>
                {title.label}
              </span>
            </div>
            <p className="flex items-center gap-1 text-sm text-text-secondary mt-1">
              <AtSign className="h-3.5 w-3.5" /> {email}
            </p>
            {bio && (
              <p className="text-xs text-text-secondary mt-1 line-clamp-1">{bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
              {location && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <MapPin className="w-3 h-3" /> {location}
                </span>
              )}
              {location && country && <span className="text-text-muted">•</span>}
              {country && <span className="text-xs text-text-secondary">{country}</span>}
              {country && <span className="text-text-muted">•</span>}
              <span className="flex items-center gap-1 text-xs text-text-secondary">
                <Calendar className="w-3 h-3" />
                Joined {joinDate}
              </span>
              {maxRating > 0 && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className="flex items-center gap-1 text-xs text-[#FBBF24]">
                    <Trophy className="w-3 h-3" /> Peak {maxRating}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Quote */}
        <div className="hidden lg:block flex-1 max-w-md mx-auto">
          <p className="text-sm italic text-text-secondary text-center">
            {"\u201cCode is like humor. When you have to explain it, it\u2019s bad.\u201d"}
          </p>
        </div>

        {/* Right: Trophy illustration */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-[#7C3AED]/20 rounded-full blur-2xl" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FBBF24]/20 to-[#7C3AED]/20 border border-[#FBBF24]/20 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-[#FBBF24]" />
          </div>
          {/* Floating particles */}
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FBBF24] animate-pulse" />
          <div className="absolute -bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>
      </div>
    </motion.div>
  );
}
