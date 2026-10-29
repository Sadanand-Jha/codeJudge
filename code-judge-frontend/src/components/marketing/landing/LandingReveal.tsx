"use client";

import { useEffect } from "react";

export default function LandingReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    root.classList.add("reveal-ready");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((element) => element.classList.add("is-revealed"));
      return;
    }

    let observer: IntersectionObserver | null = null;

    const reveal = (element: HTMLElement) => {
      if (element.classList.contains("is-revealed")) return;
      element.classList.add("is-revealed");
      observer?.unobserve(element);
    };

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target as HTMLElement);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );

    const revealReached = () => {
      const limit = window.innerHeight * 0.92;
      targets.forEach((element) => {
        if (element.classList.contains("is-revealed")) return;
        if (element.getBoundingClientRect().top < limit) reveal(element);
      });
    };

    targets.forEach((element) => observer?.observe(element));
    revealReached();

    window.addEventListener("scroll", revealReached, { passive: true });
    window.addEventListener("resize", revealReached);
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", revealReached);
      window.removeEventListener("resize", revealReached);
    };
  }, []);

  return null;
}
