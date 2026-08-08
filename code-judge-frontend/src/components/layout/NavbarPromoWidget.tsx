"use client";

import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type Plan = "pro" | "ultimate";

interface PlanConfig {
  label: string;
  emoji: string;
  tokens: string;
  features: string;
  ringGradient: string;
  borderGradient: string;
  textGradient: string;
  glowA: string;
  glowB: string;
  flame: "subtle" | "intense";
}

const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  pro: {
    label: "PRO",
    emoji: "✨",
    tokens: "2M AI TOKENS",
    features: "Premium Avatars + Fire Effects",
    ringGradient:
      "conic-gradient(from 0deg, #d946ef, #8b5cf6, #f0abfc, #a855f7, #ec4899, #d946ef)",
    borderGradient:
      "linear-gradient(90deg, rgba(217,70,239,0.9), rgba(139,92,246,0.9), rgba(236,72,153,0.9))",
    textGradient: "linear-gradient(90deg, #ec4899, #a855f7)",
    glowA: "rgba(217, 70, 239, 0.45)",
    glowB: "rgba(139, 92, 246, 0.4)",
    flame: "subtle",
  },
  ultimate: {
    label: "ULTIMATE",
    emoji: "👑",
    tokens: "5M AI TOKENS",
    features: "Exclusive Avatars + Premium Effects",
    ringGradient:
      "conic-gradient(from 0deg, #fbbf24, #ec4899, #8b5cf6, #6366f1, #f0abfc, #fbbf24)",
    borderGradient:
      "linear-gradient(90deg, rgba(251,191,36,0.95), rgba(236,72,153,0.95), rgba(99,102,241,0.95), rgba(139,92,246,0.95))",
    textGradient: "linear-gradient(90deg, #fbbf24, #ec4899, #a855f7)",
    glowA: "rgba(251, 191, 36, 0.5)",
    glowB: "rgba(236, 72, 153, 0.45)",
    flame: "intense",
  },
};

const AVATAR_URL =
  "https://api.dicebear.com/7.x/avataaars/svg?seed=student&backgroundColor=171923,09090B,111827&eyes=happy,wink&mouth=smile,grimace&hairColor=6B7280,374151,1F2937,EC4899,8B5CF6,FBBF24";

const ROTATE_MS = 6000;

function FlameIcon({ size, id }: { size: number; id: string }) {
  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 24 34"
      style={{ filter: "drop-shadow(0 0 5px rgba(251,146,60,0.85))" }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FBBF24" stopOpacity={0.95} />
          <stop offset="55%" stopColor="#F97316" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#EC4899" stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <path
        d="M12 2 C 5.5 10.5 2.5 16 2.5 21.5 a 9.5 9.5 0 0 0 19 0 C 21.5 16 18.5 10.5 12 2 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M12 9 C 9.5 13 8 16 8 19.5 a 4 4 0 0 0 8 0 C 16 16 14.5 13 12 9 Z"
        fill="#FFFFFF"
        opacity={0.35}
      />
    </svg>
  );
}

function FireArc({ flame }: { flame: "subtle" | "intense" }) {
  const count = flame === "intense" ? 5 : 3;
  const angleStep = flame === "intense" ? 18 : 20;
  const start = -((count - 1) * angleStep) / 2;
  const base = 46 * 0.17;

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="flex items-end justify-center">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            className="relative flex items-end justify-center"
            style={{
              transform: `rotate(${start + i * angleStep}deg) translateY(3px)`,
              width: base,
            }}
            animate={{ y: [0, -2, 0], opacity: [0.75, 1, 0.75], scale: [1, 1.12, 1] }}
            transition={{
              duration: 1.1 + (i % 2) * 0.35,
              delay: i * 0.12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <FlameIcon size={flame === "intense" ? base : base * 0.85} id={`flame-${flame}-${i}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RisingEmbers({ flame }: { flame: "subtle" | "intense" }) {
  const count = flame === "intense" ? 6 : 3;
  const colors =
    flame === "intense"
      ? ["#FBBF24", "#F97316", "#EC4899", "#FBBF24", "#FB923C", "#F472B6"]
      : ["#FBBF24", "#F97316", "#EC4899"];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: flame === "intense" ? 3 : 2.5,
            height: flame === "intense" ? 3 : 2.5,
            left: `${22 + ((i * 17) % 56)}%`,
            top: `${62 + ((i * 11) % 30)}%`,
            background: colors[i % colors.length],
            boxShadow: `0 0 6px ${colors[i % colors.length]}`,
          }}
          animate={{ y: [0, -10 - i * 3], opacity: [0.9, 0], scale: [1, 0.3] }}
          transition={{
            duration: 1.6 + i * 0.25,
            delay: i * 0.35,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function SparkleOrb({ flame }: { flame: "subtle" | "intense" }) {
  const count = flame === "intense" ? 4 : 2;
  const pos = flame === "intense" ? [18, 38, 62, 82] : [30, 70];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${pos[i]}%`, top: i % 2 === 0 ? "4%" : "12%" }}
          animate={{ scale: [0.4, 1.3, 0.4], opacity: [0.2, 1, 0.2], rotate: [0, 90, 0] }}
          transition={{
            duration: 2.2 + i * 0.4,
            delay: i * 0.45,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Sparkles
            className="drop-shadow-[0_0_5px_rgba(251,191,36,0.9)]"
            color={flame === "intense" ? "#FBBF24" : "#F0ABFC"}
            size={flame === "intense" ? 9 : 7}
          />
        </motion.div>
      ))}
    </div>
  );
}

function AvatarBadge({ plan, size = 46 }: { plan: Plan; size?: number }) {
  const cfg = PLAN_CONFIGS[plan];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full"
        style={{
          inset: -7,
          background: `radial-gradient(circle, ${cfg.glowA} 0%, ${cfg.glowB} 40%, transparent 70%)`,
          filter: "blur(3px)",
        }}
        animate={{ opacity: [0.5, 0.95, 0.5], scale: [1, 1.09, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{ inset: 0, background: cfg.ringGradient }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      <div
        className="absolute rounded-full avatar-bg"
        style={{ inset: 2.5 }}
      />

      <div className="absolute rounded-full overflow-hidden" style={{ inset: 4 }}>
        <img src={AVATAR_URL} alt="Student avatar" className="h-full w-full object-cover" loading="lazy" />
      </div>

      {plan === "ultimate" && (
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: -4,
            background: cfg.ringGradient,
            mask: "radial-gradient(circle, transparent 62%, #000 64%)",
            WebkitMask: "radial-gradient(circle, transparent 62%, #000 64%)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />
      )}

      <FireArc flame={cfg.flame} />
      <RisingEmbers flame={cfg.flame} />
      <SparkleOrb flame={cfg.flame} />

      {plan === "ultimate" && (
        <motion.div
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
            boxShadow: "0 0 8px rgba(251,191,36,0.8)",
          }}
          animate={{ y: [0, -1, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Crown className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
        </motion.div>
      )}
    </div>
  );
}

function PlanContent({ plan }: { plan: Plan }) {
  const cfg = PLAN_CONFIGS[plan];

  return (
    <div className="min-w-0 pr-1">
      <div className="flex items-center gap-1">
        <span className="text-[11px] leading-none" aria-hidden="true">
          {cfg.emoji}
        </span>
        <span
          className="text-[10px] font-extrabold uppercase leading-none tracking-wider"
          style={{
            background: cfg.textGradient,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          {cfg.label}
        </span>
      </div>
      <div
        className="mt-1 text-[8px] font-bold uppercase leading-none tracking-[0.12em]"
        style={{ color: plan === "ultimate" ? "#FBBF24" : "var(--promo-accent, #c084fc)" }}
      >
        {cfg.tokens}
      </div>
      <div className="mt-1 truncate text-[7.5px] leading-none promo-muted">{cfg.features}</div>
    </div>
  );
}

function UpgradeButton() {
  return (
    <motion.button
      className="relative flex-shrink-0 overflow-hidden rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-white"
      style={{
        background: "linear-gradient(135deg, #ec4899, #8b5cf6, #6366f1)",
        backgroundSize: "200% 200%",
        boxShadow: "0 2px 10px rgba(168,85,247,0.45)",
      }}
      animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
    >
      Upgrade
    </motion.button>
  );
}

export default function NavbarPromoWidget({
  className = "",
  plan: initialPlan = "pro",
}: {
  className?: string;
  plan?: Plan;
}) {
  const [plan, setPlan] = useState<Plan>(initialPlan);

  useEffect(() => {
    const id = setInterval(() => {
      setPlan((p) => (p === "pro" ? "ultimate" : "pro"));
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const cfg = PLAN_CONFIGS[plan];

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`navbar-promo-widget relative flex items-center ${className}`}
        style={{ width: 300, height: 40 }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[13px] p-[1px]">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: cfg.borderGradient,
              backgroundSize: "250% 100%",
              filter: "blur(4px)",
              opacity: 0.55,
            }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex h-full w-full items-center overflow-hidden rounded-[12px] promo-surface">
            <div className="flex h-full min-w-0 flex-1 items-center" style={{ paddingLeft: 48, paddingRight: 8 }}>
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={plan}
                    initial={{ opacity: 0, x: 16, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -16, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <PlanContent plan={plan} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <UpgradeButton />
            </div>
          </div>
        </div>

        <div className="absolute z-10" style={{ left: -12, top: "50%", transform: "translateY(-50%)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={plan}
              initial={{ opacity: 0, scale: 0.7, x: -8, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.7, x: 8, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <AvatarBadge plan={plan} />
            </motion.div>
          </AnimatePresence>
        </div>

        <style jsx global>{`
          .navbar-promo-widget {
            --promo-surface: linear-gradient(160deg, rgba(26, 29, 46, 0.96), rgba(17, 19, 33, 0.98));
            --promo-muted-color: rgba(156, 163, 175, 0.95);
            --promo-accent: #c084fc;
            --promo-avatar-bg: #151726;
          }
          .navbar-promo-widget .promo-surface {
            background: var(--promo-surface);
          }
          .navbar-promo-widget .avatar-bg {
            background: var(--promo-avatar-bg);
          }
          .navbar-promo-widget .promo-muted {
            color: var(--promo-muted-color);
          }

          [data-theme="light"] .navbar-promo-widget {
            --promo-surface: linear-gradient(160deg, #ffffff, #f7f0ff);
            --promo-muted-color: rgba(100, 116, 139, 0.95);
            --promo-accent: #9333ea;
            --promo-avatar-bg: #ffffff;
          }
        `}</style>
      </div>
    </MotionConfig>
  );
}
