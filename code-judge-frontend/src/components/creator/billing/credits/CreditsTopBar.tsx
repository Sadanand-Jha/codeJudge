"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { QS_OUTLINE_BTN } from "./styles";

export function CreditsTopBar() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[clamp(32px,4.4vw,48px)] font-black leading-[1.05] tracking-tight">
          AI Credits
        </h1>
        <p className="mt-1.5 text-base text-[var(--qs-muted)]">
          Power your next question paper with AI.
        </p>
      </div>
      <Link href="/creator/billing/transactions" className={QS_OUTLINE_BTN}>
        Transaction history <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
