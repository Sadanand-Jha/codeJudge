'use client';

import { useEffect, useState } from 'react';
import { Code2 } from 'lucide-react';
import { cn } from '@/lib/helpers';
import { decryptSecureMedia } from '@/services/secureMedia';
import { useTheme } from '@/context/ThemeContext';

export type SecureLogoVariant = 'full' | 'mark';
type LogoTheme = 'light' | 'dark';

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
      // `variant=mark` serves the icon-only art; `theme=dark` serves the
      // dark-background artwork (dark_logo_with_name / dark_logo_).
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
 * Site brand mark served AES-encrypted from the backend
 * (`GET /api/v1/brand/logo` -> public/logo/logo_with_name.png for light
 * `full`, dark_logo_with_name.png for dark `full`, logo.png / dark_logo_.png
 * for `mark`, whitespace-trimmed) and decrypted client-side. The active app
 * theme picks the artwork, so dark mode gets the dark-background logo.
 *
 * - `variant="full"` — the QuizSupport wordmark + icon, drawn at `size`
 *   height with a 4:1 box (`object-contain`, so aspect changes degrade
 *   gracefully instead of cropping).
 * - `variant="mark"` — icon-only speech-bubble art for square slots
 *   (collapsed sidebar rail, auth headers, platform console).
 *
 * Falls back to the legacy gradient Code2 mark while loading or if
 * decryption is unavailable.
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

  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => logoUrlCache.get(logoKey) ?? null
  );

  // If `variant` or the active theme changes after mount, re-seed from the
  // cache during render (React's recommended state-adjustment pattern —
  // avoids a sync setState inside the effect below).
  const [prevKey, setPrevKey] = useState<string>(logoKey);
  if (prevKey !== logoKey) {
    setPrevKey(logoKey);
    setLogoUrl(logoUrlCache.get(logoKey) ?? null);
  }

  useEffect(() => {
    if (logoUrlCache.get(logoKey)) return;
    let cancelled = false;
    fetchBrandLogoUrl(variant, theme).then((url) => {
      if (!cancelled && url) setLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [logoKey, variant, theme]);

  if (!logoUrl) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={cn(
          'flex shrink-0 items-center justify-center bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white',
          rounded && 'rounded-lg',
          className
        )}
      >
        <Code2 style={{ width: size * 0.57, height: size * 0.57 }} />
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt="QuizSupport logo"
      height={size}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ height: size, width: size * (variant === 'mark' ? 1 : 4) }}
      className={cn('shrink-0 object-contain', rounded && 'rounded-md', className)}
    />
  );
}

export default SecureLogo;
