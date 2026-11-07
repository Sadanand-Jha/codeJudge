"use client";

import { useEffect, useState } from "react";

export default function LandingAnimationToggle() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    return () => document.documentElement.classList.remove("landing-animations-paused");
  }, []);

  function toggleAnimations() {
    const nextPaused = !paused;
    document.documentElement.classList.toggle("landing-animations-paused", nextPaused);
    window.dispatchEvent(
      new CustomEvent("landing-animations-toggle", { detail: { paused: nextPaused } })
    );
    setPaused(nextPaused);
  }

  return (
    <button
      className="landing-animation-toggle"
      type="button"
      aria-pressed={paused}
      onClick={toggleAnimations}
    >
      {paused ? "Resume animations" : "Pause animations"}
    </button>
  );
}
