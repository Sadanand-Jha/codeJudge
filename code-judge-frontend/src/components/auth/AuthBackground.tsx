"use client";

import { useTheme } from "@/context/ThemeContext";

export default function AuthBackground() {
  const { theme } = useTheme();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {theme === "light" ? (
        <>
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FAFBFF] via-[#FCFCFD] to-[#FAFBFF]" />

          {/* Large soft gradient blobs */}
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#A855F7]/15 to-transparent blur-[60px]" />
          <div className="absolute -right-40 top-1/4 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#EC4899]/12 to-transparent blur-[70px]" />
          <div className="absolute bottom-[-200px] left-1/3 h-[550px] w-[550px] rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-transparent blur-[65px]" />

          {/* Floating glass-like orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#A855F7]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#EC4899]/5 blur-[100px]" />
          <div className="absolute top-1/2 left-[60%] w-64 h-64 rounded-full bg-[#3B82F6]/5 blur-[100px]" />

          {/* Subtle mesh gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.05), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.04), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.03), transparent 60%)',
            }}
          />
        </>
      ) : (
        <>
          {/* Dark theme - cosmic gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#050510] via-[#0a0a1e] to-[#120b24]" />

          {/* Nebula glows */}
          <div className="absolute left-[20%] top-[30%] h-[320px] w-[320px] rounded-full bg-gradient-to-br from-[#7C3AED]/20 to-transparent blur-[80px]" />
          <div className="absolute right-[20%] bottom-[30%] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-[#EC4899]/15 to-transparent blur-[90px]" />
          <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 h-[260px] w-[260px] rounded-full bg-gradient-to-br from-[#6366F1]/12 to-transparent blur-[70px]" />

          {/* Ambient orbs for dark */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#7C3AED]/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#EC4899]/5 blur-[100px]" />

          {/* Subtle star-like particles using radial gradients */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(1px 1px at 20% 30%, rgba(199,210,254,0.4), transparent),
                radial-gradient(1px 1px at 40% 70%, rgba(232,121,249,0.3), transparent),
                radial-gradient(1px 1px at 60% 20%, rgba(165,180,252,0.4), transparent),
                radial-gradient(1px 1px at 80% 80%, rgba(251,191,36,0.3), transparent),
                radial-gradient(1px 1px at 10% 80%, rgba(199,210,254,0.3), transparent),
                radial-gradient(1px 1px at 90% 10%, rgba(232,121,249,0.4), transparent),
                radial-gradient(1px 1px at 30% 50%, rgba(165,180,252,0.3), transparent),
                radial-gradient(1px 1px at 70% 40%, rgba(251,191,36,0.3), transparent)
              `,
              backgroundSize: "200px 200px",
              backgroundRepeat: "repeat",
              opacity: 0.4,
            }}
          />
        </>
      )}
    </div>
  );
}