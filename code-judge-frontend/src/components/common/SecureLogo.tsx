'use client';

import { useEffect, useState } from 'react';
import { Code2 } from 'lucide-react';
import { cn } from '@/lib/helpers';
import { decryptSecureMedia } from '@/services/secureMedia';

// Module-level cache: one fetch + one object URL shared by every logo
// instance on the page (navbar, sidebar, footer, auth, ...).
let cachedLogoUrl: string | null = null;
let inflightLogoPromise: Promise<string | null> | null = null;

async function fetchBrandLogoUrl(): Promise<string | null> {
  if (cachedLogoUrl) return cachedLogoUrl;
  if (inflightLogoPromise) return inflightLogoPromise;

  inflightLogoPromise = (async () => {
    try {
      const secretKey = process.env.NEXT_PUBLIC_AES_SECRET_KEY;
      if (!secretKey) return null;

      // Same-origin via Next.js /api rewrite -> backend /api/v1/brand/logo.
      // Public endpoint (no auth), encrypted AES-256-GCM payload.
      const response = await fetch('/api/v1/brand/logo', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;

      const result = await response.json();
      if (!result?.success || !result?.data) return null;

      const decrypted = await decryptSecureMedia(result.data, secretKey);
      const blob = new Blob([decrypted], { type: 'image/png' });
      cachedLogoUrl = URL.createObjectURL(blob);
      return cachedLogoUrl;
    } catch {
      return null;
    } finally {
      inflightLogoPromise = null;
    }
  })();

  return inflightLogoPromise;
}

/**
 * Site brand mark served AES-encrypted from the backend
 * (`GET /api/v1/brand/logo` -> secure-media/logo.png) and decrypted
 * client-side. Falls back to the legacy gradient Code2 mark while
 * loading or if decryption is unavailable.
 */
export function SecureLogo({
  size = 28,
  className,
  rounded = true,
}: {
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(cachedLogoUrl);

  useEffect(() => {
    if (cachedLogoUrl) {
      setLogoUrl(cachedLogoUrl);
      return;
    }
    let cancelled = false;
    fetchBrandLogoUrl().then((url) => {
      if (!cancelled && url) setLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      alt="ByteClash logo"
      width={size}
      height={size}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ width: size, height: size }}
      className={cn('shrink-0 object-cover', rounded && 'rounded-lg', className)}
    />
  );
}

export default SecureLogo;
