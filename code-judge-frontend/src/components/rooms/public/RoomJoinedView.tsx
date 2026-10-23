"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Loader2, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getRoomSummary, type RoomSummary } from "@/services/rooms";
import { getApiErrorMessage } from "@/lib/apiError";

export default function RoomJoinedView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent("/rooms")}`);
    }
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    let cancelled = false;
    getRoomSummary(roomId)
      .then((summary) => {
        if (!cancelled) setRoom(summary);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(err, "We couldn't load this room."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAuthenticated, roomId]);

  if (!hasHydrated || loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--qs-brand)]" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-bad)] text-[var(--qs-bad)]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="qs-display mt-4 text-2xl text-[var(--qs-ink)]">Room unavailable</h1>
        <p className="mt-2 text-sm text-[var(--qs-muted)]">{error || "This room no longer exists."}</p>
        <Link href="/rooms" className="qs-btn mt-6 inline-flex min-h-11 px-5 text-sm">
          Try another code
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-[var(--qs-ok)] text-[var(--qs-ok)]">
        <Check className="h-8 w-8" />
      </div>
      <span className="mt-4 inline-block rounded-full border-2 border-[var(--qs-ok)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
        Joined
      </span>
      <h1 className="qs-display mt-3 text-3xl text-[var(--qs-ink)]">{room.name}</h1>
      <p className="mt-2 text-sm text-[var(--qs-muted)]">
        You&apos;re in. Your teacher can see you in the room.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-poly-1)] px-3 py-1 text-xs font-bold text-[var(--qs-ink)]">
        <Users className="h-3.5 w-3.5" /> {room.memberCount} member{room.memberCount === 1 ? "" : "s"}
      </p>

      <div className="mt-7 grid gap-2.5">
        <Link href="/quiz" className="qs-btn min-h-12 w-full text-base">
          Go to quizzes
        </Link>
        <Link href="/rooms" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]">
          <ArrowLeft className="h-4 w-4" /> Join another room
        </Link>
      </div>
    </div>
  );
}
