'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/helpers';
import { decryptSecureMedia } from '@/services/secureMedia';
import { useTheme } from '@/context/ThemeContext';

export type SecureLogoVariant = 'full' | 'mark';
type LogoTheme = 'light' | 'dark';

// Static fallback — same artwork family as the login page (AuthBrandMark).
// `full` uses the combined mascot + wordmark artwork (name.png / dark_name.png),
// `mark` uses the icon-only bubble for square slots (collapsed sidebar rail,
// favicon-sized slots). This renders instantly on first paint, so the small
// sidebar never flashes the generic Code2 box while the encrypted logo loads.
const STATIC_LOGO_FALLBACK: Record<LogoTheme, Record<SecureLogoVariant, string>> = {
  light: {
    full: '/logos/name.png',
    mark: '/logos/mark.png',
  },
  dark: {
    full: '/logos/dark_name.png',
    mark: '/logos/dark_mark.png',
  },
};

// Natural aspect ratios of the artwork (width / height) — keeps the box
// exactly as wide as the logo, so neighbours never shift.
const LOGO_ASPECT: Record<SecureLogoVariant, number> = {
  full: 1800 / 367,
  mark: 512 / 468,
};

// Module-level caches: one fetch + one object URL per variant+theme, shared by
// every logo instance on the page (navbar, sidebar, footer, auth, ...).
const logoUrlCache = new Map<string, string>();
const inflightLogoPromises = new Map<string, Promise<string | null>>();

async function fetchBrandLogoUrl(
  variant: SecureLogoVariant,
  theme: LogoTheme
): Promise<string | null> {
  const cacheKey = `${variant}:${theme}`;
  const cached = logoUrlCache.get(cacheKey);
  if (cached) return cached;
  const inflight = inflightLogoPromises.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const secretKey = process.env.NEXT_PUBLIC_AES_SECRET_KEY;
      if (!secretKey) return null;

      // Same-origin via Next.js /api rewrite -> backend /api/v1/brand/logo.
      // Public endpoint (no auth), encrypted AES-256-GCM payload.
      // `variant=mark` serves the icon-only mascot art; `theme=dark` serves the
      // dark-background artwork (quizsupport-logo-dark / quizsupport-icon-dark).
      const response = await fetch(
        `/api/v1/brand/logo?variant=${variant}&theme=${theme}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        }
      );
      if (!response.ok) return null;

      const result = await response.json();
      if (!result?.success || !result?.data) return null;

      const decrypted = await decryptSecureMedia(result.data, secretKey);
      const blob = new Blob([decrypted], { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      logoUrlCache.set(cacheKey, url);
      return url;
    } catch {
      return null;
    } finally {
      inflightLogoPromises.delete(cacheKey);
    }
  })();

  inflightLogoPromises.set(cacheKey, promise);
  return promise;
}

/**
 * Site brand logo — same artwork as the login page (AuthBrandMark).
 *
 * - `variant="full"` — combined mascot + QuizSupport wordmark art
 *   (`/logos/name.png` / `/logos/dark_name.png`, ~4.9:1). Never upgrades
 *   from the backend, so header/sidebar always match login.
 * - `variant="mark"` — icon-only mascot art for square slots
 *   (collapsed sidebar rail, favicon-sized slots). Static file renders
 *   instantly, then upgrades to the encrypted backend art when available.
 */
export function SecureLogo({
  size = 28,
  className,
  rounded = true,
  variant = 'full',
}: {
  size?: number;
  className?: string;
  rounded?: boolean;
  variant?: SecureLogoVariant;
}) {
  const { theme } = useTheme();
  const logoKey = `${variant}:${theme}`;
  const staticFallback = STATIC_LOGO_FALLBACK[theme][variant];

  const [logoUrl, setLogoUrl] = useState<string>(
    () => logoUrlCache.get(logoKey) ?? staticFallback
  );

  // If `variant` or the active theme changes after mount, re-seed from the
  // cache during render (React's recommended state-adjustment pattern —
  // avoids a sync setState inside the effect below). Falls back to the
  // static login-page artwork, never to a generic icon.
  const [prevKey, setPrevKey] = useState<string>(logoKey);
  if (prevKey !== logoKey) {
    setPrevKey(logoKey);
    setLogoUrl(logoUrlCache.get(logoKey) ?? STATIC_LOGO_FALLBACK[theme][variant]);
  }

  useEffect(() => {
    // `full` is the master combined artwork (login-page logo) — never fetch
    // the backend variant, so header/sidebar always match login exactly.
    if (variant === 'full') return;
    if (logoUrlCache.get(logoKey)) return;
    let cancelled = false;
    fetchBrandLogoUrl(variant, theme).then((url) => {
      if (!cancelled && url) setLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [logoKey, variant, theme]);

  return (
    <img
      src={logoUrl}
      alt="QuizSupport logo"
      height={size}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onError={() => {
        if (logoUrl !== staticFallback) setLogoUrl(staticFallback);
      }}
      style={{ height: size, width: size * LOGO_ASPECT[variant] }}
      className={cn('shrink-0 object-contain', rounded && 'rounded-md', className)}
    />
  );
}

export default SecureLogo;
