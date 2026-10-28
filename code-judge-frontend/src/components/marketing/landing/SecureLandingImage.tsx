"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import Image from "next/image";
import { decryptSecureMedia } from "@/services/secureMedia";

export type LandingImageName =
  | "quiz-builder"
  | "ai-question-generator"
  | "question-bank"
  | "rooms";

const imageUrlCache = new Map<string, string>();
const inflightImages = new Map<string, Promise<string | null>>();

async function fetchLandingImageUrl(name: LandingImageName): Promise<string | null> {
  const cached = imageUrlCache.get(name);
  if (cached) return cached;

  const inflight = inflightImages.get(name);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const secretKey = process.env.NEXT_PUBLIC_AES_SECRET_KEY;
      if (!secretKey) return null;

      const response = await fetch(`/api/v1/landing/image/${name}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;

      const result = await response.json();
      if (!result?.success || !result?.data) return null;

      const decrypted = await decryptSecureMedia(result.data, secretKey);
      const blob = new Blob([decrypted], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      imageUrlCache.set(name, url);
      return url;
    } catch {
      return null;
    } finally {
      inflightImages.delete(name);
    }
  })();

  inflightImages.set(name, promise);
  return promise;
}

const blockInteraction = (event: SyntheticEvent) => event.preventDefault();

export function SecureLandingImage({
  name,
  alt,
  width,
  height,
}: {
  name: LandingImageName;
  alt: string;
  width: number;
  height: number;
}) {
  const [src, setSrc] = useState<string | null>(() => imageUrlCache.get(name) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLandingImageUrl(name).then((url) => {
      if (cancelled) return;
      if (url) {
        setSrc(url);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!src) {
    return (
      <span
        className="ss-shot ss-shot-placeholder"
        style={{ aspectRatio: `${width} / ${height}` }}
        role={failed ? "img" : undefined}
        aria-label={failed ? alt : undefined}
        aria-hidden={failed ? undefined : true}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      draggable={false}
      className="ss-shot"
      onContextMenu={blockInteraction}
      onDragStart={blockInteraction}
      onDrop={blockInteraction}
    />
  );
}
