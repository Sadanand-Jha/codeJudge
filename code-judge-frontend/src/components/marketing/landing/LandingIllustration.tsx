import type { CSSProperties, ReactNode } from "react";

type LandingIllustrationVariant = "hero" | "paper" | "proof" | "closing" | "statement";

type SceneShape = {
  key: string;
  className: string;
  style: CSSProperties;
  children: ReactNode;
};

const star = <svg viewBox="0 0 100 100"><path d="m50 6 11 31 33 1-26 20 9 32-27-19-27 19 9-32L6 38l33-1Z" /></svg>;
const heart = <svg viewBox="0 0 100 100"><path d="M50 86S12 63 12 35C12 8 42 4 50 29 58 4 88 8 88 35c0 28-38 51-38 51Z" /></svg>;
const cube = <svg viewBox="0 0 100 100"><path d="M50 8 91 30v41L50 94 9 71V30Z" /><path d="m9 30 41 23 41-23M50 53v41" fill="none" /></svg>;
const sphere = <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" /></svg>;
const ring = <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="9" /></svg>;
const orbit = <svg viewBox="0 0 120 120"><ellipse cx="60" cy="60" rx="50" ry="20" fill="none" stroke="currentColor" strokeWidth="3" transform="rotate(-32 60 60)" /><circle cx="60" cy="60" r="10" /></svg>;
const cone = <svg viewBox="0 0 100 100"><path d="M50 7 12 89h76Z" /></svg>;

function IllustrationTexture({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-highlight`} x1="0" x2="1" y1="0" y2="1">
        <stop stopColor="#fff" stopOpacity=".9" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <filter id={`${id}-grain`} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="table" tableValues="0 .06" />
        </feComponentTransfer>
      </filter>
      <pattern id={`${id}-dots`} width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#30166d" fillOpacity=".2" />
      </pattern>
    </defs>
  );
}

function AnswerSheetIllustration() {
  return (
    <svg viewBox="0 0 190 220" role="presentation">
      <IllustrationTexture id="hero-sheet" />
      <path d="M28 20h103l36 36v145H28Z" transform="translate(11 12)" fill="#c6c1d5" />
      <path d="M28 20h103l36 36v145H28Z" fill="#fff" stroke="#ded9e9" strokeWidth="2" />
      <path d="M131 20v37h36" fill="#ece8f5" stroke="#ded9e9" strokeWidth="2" />
      <path d="M44 76h95M44 101h79M44 126h92M44 151h68" stroke="#a9a7b2" strokeWidth="5" strokeLinecap="round" />
      <path d="m45 97 5 5 10-12m-15 37 5 5 10-12" fill="none" stroke="#6c7fe8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 30h92v8H35Z" fill="url(#hero-sheet-highlight)" opacity=".75" />
      <rect x="28" y="20" width="139" height="181" filter="url(#hero-sheet-grain)" opacity=".5" />
      <path d="M112 149h28v26h-28Z" fill="url(#hero-sheet-dots)" />
      <g transform="translate(125 27)">
        <path d="M20 0c11 0 20 9 20 20v9H11V20C11 9 15 0 20 0Z" fill="#b33b78" transform="translate(5 6)" />
        <circle cx="20" cy="20" r="19" fill="#ff6fb1" />
        <path d="m11 20 6 6 12-14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="5" fill="#fff" opacity=".28" />
      </g>
    </svg>
  );
}

function SpeechBubbleIllustration() {
  return (
    <svg viewBox="0 0 150 140" role="presentation">
      <IllustrationTexture id="hero-bubble" />
      <path d="M28 19h88c8 0 14 6 14 14v56c0 8-6 14-14 14H72l-28 25 4-25H28c-8 0-14-6-14-14V33c0-8 6-14 14-14Z" transform="translate(11 10)" fill="#4034a0" />
      <path d="M28 19h88c8 0 14 6 14 14v56c0 8-6 14-14 14H72l-28 25 4-25H28c-8 0-14-6-14-14V33c0-8 6-14 14-14Z" fill="#6c7fe8" />
      <path d="M28 19h88c8 0 14 6 14 14v56c0 8-6 14-14 14H72l-28 25 4-25H28c-8 0-14-6-14-14V33c0-8 6-14 14-14Z" fill="#fff" filter="url(#hero-bubble-grain)" opacity=".5" />
      <path d="M27 27h73" stroke="url(#hero-bubble-highlight)" strokeWidth="7" strokeLinecap="round" />
      <text x="75" y="81" fill="#fff" fontSize="56" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">?</text>
      <path d="M84 33h28v32H84Z" fill="url(#hero-bubble-dots)" />
      <path d="M22 104h28l-4 24Z" fill="#8796f0" />
    </svg>
  );
}

function RoundedStarIllustration() {
  return (
    <svg viewBox="0 0 90 90" role="presentation">
      <IllustrationTexture id="hero-star" />
      <path d="m45 8 10 23 25 2-19 17 6 25-22-13-22 13 6-25L10 33l25-2Z" transform="translate(6 7)" fill="#de7821" stroke="#de7821" strokeWidth="6" strokeLinejoin="round" />
      <path d="m45 8 10 23 25 2-19 17 6 25-22-13-22 13 6-25L10 33l25-2Z" fill="#ffc72c" stroke="#ffc72c" strokeWidth="6" strokeLinejoin="round" />
      <path d="m45 8 10 23 25 2-19 17 6 25-22-13-22 13 6-25L10 33l25-2Z" fill="#fff" stroke="none" filter="url(#hero-star-grain)" opacity=".5" />
      <path d="m43 19 6 13 13 2" fill="none" stroke="#fff3ba" strokeWidth="5" strokeLinecap="round" />
      <path d="M34 48h29v19L45 58l-13 8Z" fill="url(#hero-star-dots)" />
    </svg>
  );
}

const SHAPES: Record<LandingIllustrationVariant, SceneShape[]> = {
  hero: [
    { key: "sheet", className: "hero-shape-sheet", style: { bottom: "0.75rem", left: "-2.375rem", width: "clamp(8.125rem, 13vw, 10.625rem)", rotate: "8deg" }, children: <AnswerSheetIllustration /> },
    { key: "bubble", className: "hero-shape-bubble", style: { right: "-1.75rem", bottom: "8%", width: "clamp(6.75rem, 11vw, 8.125rem)", rotate: "-8deg" }, children: <SpeechBubbleIllustration /> },
    { key: "star", className: "hero-shape-star", style: { bottom: "-1.75rem", left: "47%", width: "4.375rem" }, children: <RoundedStarIllustration /> },
  ],
  closing: [],
  statement: [
    { key: "sphere", className: "shape-sphere shape-depth-back", style: { top: "8%", left: "-3.5rem", width: "11.25rem" }, children: sphere },
    { key: "heart", className: "shape-heart shape-depth-back", style: { right: "6%", bottom: "-3.875rem", width: "10rem" }, children: heart },
    { key: "orbit", className: "shape-orbit shape-depth-back", style: { top: "8%", right: "31%", width: "8.75rem" }, children: orbit },
  ],
  proof: [
    { key: "star", className: "shape-star", style: { top: "0.625rem", left: "0.625rem", width: "3.875rem" }, children: star },
    { key: "ring", className: "shape-ring", style: { top: "0.75rem", right: "0.875rem", width: "3.625rem" }, children: ring },
    { key: "heart", className: "shape-heart", style: { bottom: "0.75rem", left: "1rem", width: "3.25rem" }, children: heart },
    { key: "cube", className: "shape-cube", style: { right: "0.75rem", bottom: "0.875rem", width: "4rem" }, children: cube },
  ],
  paper: [
    { key: "sheet", className: "shape-sheet", style: { right: 0, bottom: 0, width: "10.625rem" }, children: <svg viewBox="0 0 120 110"><path d="M30 10h48l22 22v60H30V10Z" /><path d="M78 10v22h22" /><path d="M42 52h36M42 66h42M42 80h30" /></svg> },
    { key: "sphere", className: "shape-sphere", style: { left: "0.5rem", top: "0.625rem", width: "4.5rem" }, children: sphere },
    { key: "orbit", className: "shape-orbit", style: { right: "2.25rem", top: "0.625rem", width: "7.5rem" }, children: orbit },
    { key: "check", className: "shape-check", style: { left: "1.375rem", bottom: "0.75rem", width: "4.625rem" }, children: <svg viewBox="0 0 100 100"><path d="M22 52l18 18 38-42" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  ],
};

export function Scene({ variant }: { variant: LandingIllustrationVariant }) {
  return (
    <div className={`landing-art landing-art-${variant}`} aria-hidden="true">
      <div className={`landing-scene landing-scene-${variant}`}>
        <div className="landing-scene-shapes">
          {SHAPES[variant].map((shape) => (
            <div key={shape.key} className={`landing-scene-shape ${shape.className}`} style={shape.style}>
              {shape.children}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingIllustration({ variant }: { variant: LandingIllustrationVariant }) {
  return <Scene variant={variant} />;
}
