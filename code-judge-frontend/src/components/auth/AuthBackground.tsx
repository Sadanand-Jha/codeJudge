"use client";

import { useTheme } from "@/context/ThemeContext";
import QuizPartyAtmosphere from "@/components/quiz/live/QuizPartyAtmosphere";
import QuizSpaceAtmosphere from "@/components/quiz/live/QuizSpaceAtmosphere";

const AUTH_DESKTOP_STARS = [
  // Kept to the edges/gutters so they don't sit behind the centered form,
  // clear of the static radial starfield + the 3 asteroid spots.
  { left: "3%", top: "10%", size: 2, color: "rgba(255,255,255,.8)", glow: "0 0 10px rgba(255,255,255,.55)", delay: "0s", duration: "3.2s" },
  { left: "7%", top: "32%", size: 2, color: "rgba(165,243,252,.8)", glow: "0 0 10px rgba(165,243,252,.45)", delay: ".6s", duration: "2.8s" },
  { left: "4%", top: "56%", size: 1.5, color: "rgba(255,255,255,.6)", glow: "0 0 8px rgba(255,255,255,.45)", delay: "1.2s", duration: "3.6s" },
  { left: "8%", top: "78%", size: 2, color: "rgba(196,181,253,.75)", glow: "0 0 10px rgba(196,181,253,.45)", delay: ".3s", duration: "3s" },
  { left: "16%", top: "93%", size: 1.5, color: "rgba(199,210,254,.6)", glow: "0 0 8px rgba(199,210,254,.45)", delay: "1.8s", duration: "4s" },
  { left: "28%", top: "5%", size: 2, color: "rgba(232,121,249,.6)", glow: "0 0 10px rgba(232,121,249,.4)", delay: ".9s", duration: "3.4s" },
  { left: "47%", top: "4%", size: 2, color: "rgba(199,210,254,.7)", glow: "0 0 10px rgba(199,210,254,.5)", delay: "2.1s", duration: "2.6s" },
  { left: "69%", top: "5%", size: 1.5, color: "rgba(255,255,255,.55)", glow: "0 0 8px rgba(255,255,255,.4)", delay: "1.5s", duration: "3.8s" },
  { left: "86%", top: "9%", size: 2, color: "rgba(237,233,254,.7)", glow: "0 0 10px rgba(237,233,254,.45)", delay: ".4s", duration: "3.1s" },
  { left: "95%", top: "29%", size: 1.5, color: "rgba(165,243,252,.6)", glow: "0 0 8px rgba(165,243,252,.4)", delay: "2.4s", duration: "3.5s" },
  { left: "96%", top: "52%", size: 2, color: "rgba(255,255,255,.7)", glow: "0 0 10px rgba(255,255,255,.5)", delay: "1s", duration: "2.9s" },
  { left: "90%", top: "80%", size: 2.5, color: "rgba(196,181,253,.7)", glow: "0 0 12px rgba(196,181,253,.5)", delay: "1.7s", duration: "3.3s" },
  { left: "70%", top: "94%", size: 1.5, color: "rgba(249,168,212,.6)", glow: "0 0 8px rgba(249,168,212,.4)", delay: ".2s", duration: "4.2s" },
  { left: "35%", top: "95%", size: 1.5, color: "rgba(199,210,254,.6)", glow: "0 0 8px rgba(199,210,254,.4)", delay: "2.7s", duration: "3s" },
] as const;

export default function AuthBackground() {
  const { theme } = useTheme();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {theme === "light" ? (
        <QuizPartyAtmosphere showFloaters={false} />
      ) : (
        <>
          {/* Dark theme - cosmic gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#050510] via-[#0a0a1e] to-[#120b24]" />

          {/* Nebula glows — violet/indigo/cyan to match site quiz-space palette */}
          <div className="absolute left-[20%] top-[30%] h-[320px] w-[320px] rounded-full bg-gradient-to-br from-[#7C3AED]/20 to-transparent blur-[80px]" />
          <div className="absolute right-[20%] bottom-[30%] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-[#22D3EE]/12 to-transparent blur-[90px]" />
          <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 h-[260px] w-[260px] rounded-full bg-gradient-to-br from-[#6366F1]/12 to-transparent blur-[70px]" />

          {/* Ambient orbs for dark */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#7C3AED]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#22D3EE]/5 blur-[100px]" />

          {/* Subtle star-like particles using radial gradients */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(1px 1px at 20% 30%, rgba(199,210,254,0.4), transparent),
                radial-gradient(1px 1px at 40% 70%, rgba(165,243,252,0.3), transparent),
                radial-gradient(1px 1px at 60% 20%, rgba(165,180,252,0.4), transparent),
                radial-gradient(1px 1px at 80% 80%, rgba(196,181,253,0.3), transparent),
                radial-gradient(1px 1px at 10% 80%, rgba(199,210,254,0.3), transparent),
                radial-gradient(1px 1px at 90% 10%, rgba(165,243,252,0.4), transparent),
                radial-gradient(1px 1px at 30% 50%, rgba(165,180,252,0.3), transparent),
                radial-gradient(1px 1px at 70% 40%, rgba(196,181,253,0.3), transparent)
              `,
              backgroundSize: "200px 200px",
              backgroundRepeat: "repeat",
              opacity: 0.4,
            }}
          />
          {/* Desktop-only twinkling stars + drifting asteroids (hidden on mobile for perf) */}
          <div className="absolute inset-0 hidden md:block">
            {AUTH_DESKTOP_STARS.map((star, i) => (
              <span
                key={i}
                className="auth-desktop-star absolute rounded-full"
                style={{
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  backgroundColor: star.color,
                  boxShadow: star.glow,
                  animationDelay: star.delay,
                  animationDuration: star.duration,
                }}
              />
            ))}

            {/* Asteroid 1 — grey rocky chunk, top-left drift */}
            <div
              className="auth-desktop-asteroid absolute left-[13%] top-[18%] hidden lg:block"
              style={{ animationDuration: "11s", animationDelay: "0s" }}
            >
              <div className="relative h-9 w-11 rounded-[46%_54%_52%_48%/55%_48%_52%_45%] border border-white/10 bg-gradient-to-br from-[#8b8fa3]/50 via-[#4b4f63]/45 to-[#23262f]/60 shadow-[inset_-6px_-5px_10px_rgba(0,0,0,.55),0_0_22px_rgba(148,163,184,.12)]">
                <span className="absolute left-[22%] top-[28%] h-1.5 w-1.5 rounded-full bg-black/30" />
                <span className="absolute bottom-[24%] right-[26%] h-2 w-2 rounded-full bg-black/25" />
                <span className="absolute left-[48%] top-[52%] h-1 w-1 rounded-full bg-white/15" />
              </div>
            </div>

            {/* Asteroid 2 — small pebble, right side */}
            <div
              className="auth-desktop-asteroid absolute right-[10%] top-[46%] hidden lg:block"
              style={{ animationDuration: "14s", animationDelay: "-6s" }}
            >
              <div className="relative h-6 w-7 rounded-[52%_48%_46%_54%/48%_55%_45%_52%] border border-white/10 bg-gradient-to-br from-[#7d8296]/45 via-[#434654]/45 to-[#1e2028]/60 shadow-[inset_-4px_-4px_8px_rgba(0,0,0,.55),0_0_18px_rgba(148,163,184,.1)]">
                <span className="absolute left-[30%] top-[30%] h-1 w-1 rounded-full bg-black/30" />
                <span className="absolute bottom-[22%] right-[24%] h-1.5 w-1.5 rounded-full bg-black/25" />
              </div>
            </div>

            {/* Asteroid 3 — tiny distant rock, bottom-left */}
            <div
              className="auth-desktop-asteroid absolute bottom-[16%] left-[24%] hidden xl:block"
              style={{ animationDuration: "17s", animationDelay: "-10s" }}
            >
              <div className="relative h-4 w-5 rounded-[48%_52%_55%_45%/52%_46%_54%_48%] border border-white/[0.08] bg-gradient-to-br from-[#6b7080]/40 via-[#363945]/45 to-[#17181d]/60 shadow-[inset_-3px_-3px_6px_rgba(0,0,0,.55)]">
                <span className="absolute left-[32%] top-[32%] h-[3px] w-[3px] rounded-full bg-black/30" />
              </div>
            </div>

            {/* Shooting star streak */}
            <span className="auth-desktop-shooting absolute left-[68%] top-[14%] hidden lg:block" />
          </div>

          <QuizSpaceAtmosphere />
        </>
      )}
    </div>
  );
}
