"use client";

import { useMemo, useEffect, useRef, useCallback } from "react";
import type { MouseEvent, DragEvent } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getSecureImageBlob } from "@/services/secureMedia";

/**
 * Encrypted waiting-room backgrounds (served via the secure-media pipeline).
 *
 * - light theme → jungle scenery
 * - dark theme  → space imagery
 * - mobile widths → `*_mobile` variants (composed for narrow viewports)
 *
 * The actual image files live in `code-judge-backend/secure-media/` (outside the
 * public folder) and are AES-256-GCM encrypted on-the-fly by the backend.
 */
const WAITING_BACKGROUNDS = {
  light: { desktop: "jungle.png", mobile: "jungle_mobile.png" },
  dark: { desktop: "space.png", mobile: "space_mobile.png" },
} as const;

/** Matches Tailwind's `md` breakpoint (768px). Below it we serve the mobile asset. */
const MOBILE_QUERY = "(max-width: 768px)";

/**
 * Full-screen, theme- and viewport-aware encrypted background for the quiz
 * waiting room.
 *
 * The image is fetched through the AES-256-GCM secure-media endpoint
 * (`/api/v1/secure-media/:imageName`), decrypted in-memory and painted onto a
 * full-viewport `<canvas>`. This keeps the raw image URLs out of the Network
 * tab / page source and lets us block right-click / drag-and-drop saving, the
 * same way the rest of the secure-media assets are protected.
 *
 * The active image is selected from the current theme (light ⇒ jungle,
 * dark ⇒ space) and the viewport width (≤ 768px ⇒ `*_mobile` variant).
 */
export function WaitingRoomBackground() {
  const { theme } = useTheme();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Resolve which encrypted asset to show given the active theme + viewport.
  const imageName = useMemo(() => {
    const assets = WAITING_BACKGROUNDS[theme === "light" ? "light" : "dark"];
    return isMobile ? assets.mobile : assets.desktop;
  }, [theme, isMobile]);

  // Paint the currently-loaded image onto the canvas, scaled to cover the
  // whole viewport (mirroring `background-size: cover`).
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const ratio = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    const x = (rect.width - w) / 2;
    const y = (rect.height - h) / 2;

    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }, []);

  // Load + paint whenever the resolved asset name changes (theme toggle or
  // viewport crossing the mobile breakpoint).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const blob = await getSecureImageBlob(imageName);
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          imageRef.current = img;
          paint();
          // Image is decoded now, the object URL is no longer needed.
          URL.revokeObjectURL(objectUrl);
        };

        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (!cancelled) imageRef.current = null;
        };

        img.src = objectUrl;
      } catch (err) {
        console.error("Failed to load secure background image:", err);
        if (!cancelled) imageRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageName, paint]);

  // Repaint on resize using the already-loaded image (debounced via rAF so we
  // don't thrash the canvas during a resize drag).
  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => paint());
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [paint]);

  // Block context menu / drag so the rendered pixels can't be saved directly.
  const handleContextMenu = useCallback((e: MouseEvent<HTMLCanvasElement>) => e.preventDefault(), []);
  const handleDragStart = useCallback((e: DragEvent<HTMLCanvasElement>) => e.preventDefault(), []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 block"
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    />
  );
}

export default WaitingRoomBackground;
