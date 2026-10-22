"use client";

import { useEffect, useRef, type ReactNode } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ScrollThemeSection({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const reset = () => {
      section.style.removeProperty("--qp-cine-bottom");
      section.style.removeProperty("--qp-cine-content");
      section.style.removeProperty("--qp-cine-shift");
      section.style.removeProperty("--qp-cine-scale");
    };

    const update = () => {
      if (reduceMotion.matches) {
        reset();
        return;
      }

      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const start = viewport * 0.98;
      const end = viewport * 0.18;
      const progress = clamp((start - rect.top) / Math.max(1, start - end), 0, 1);
      const content = clamp((progress - 0.18) / 0.62, 0, 1);

      section.style.setProperty("--qp-cine-bottom", `${(1 - progress) * 100}%`);
      section.style.setProperty("--qp-cine-content", content.toFixed(4));
      section.style.setProperty("--qp-cine-shift", `${(1 - content) * 42}px`);
      section.style.setProperty("--qp-cine-scale", (0.985 + content * 0.015).toFixed(4));
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const onMotionPreference = () => {
      if (reduceMotion.matches) reset();
      else schedule();
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduceMotion.addEventListener("change", onMotionPreference);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduceMotion.removeEventListener("change", onMotionPreference);
    };
  }, []);

  return (
    <section ref={ref} id={id} className="s qp-credit-section qp-cine">
      <div className="qp-cine-inner">{children}</div>
    </section>
  );
}
