"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, FileImage, Sparkles, X } from "lucide-react";
import { LETTERHEAD_MAX_PER_USER } from "@/config/letterheads";
import {
  CUSTOM_HEADER_UPGRADE_EVENT,
  type CustomHeaderUpgradeDetail,
} from "@/lib/customHeaderUpgrade";

function UpgradeDialog({
  onClose,
  onContinueStandard,
}: {
  onClose: () => void;
  onContinueStandard?: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const upgrade = () => {
    onClose();
    router.push("/creator/billing/plans?plan=pro");
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-header-upgrade-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <Crown className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
                Pro feature
              </p>
              <h2 id="custom-header-upgrade-title" className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">
                Use your college letterhead
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="b b-icon sm" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-5">
          <p className="text-sm font-medium text-[var(--qs-muted)]">
            Upgrade to Pro to put your institute&apos;s letterhead at the top of every question paper.
          </p>
          <ul className="space-y-2 text-sm font-semibold text-[var(--qs-ink)]">
            {[
              `Save up to ${LETTERHEAD_MAX_PER_USER} letterheads`,
              "Place and size them on an A4 preview",
              "Repeat the header on every page",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-[11px] font-semibold text-[var(--qs-muted)]">
            <FileImage className="mt-0.5 h-4 w-4 shrink-0" />
            You can keep downloading standard question papers without a custom header.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <button
            type="button"
            className="b sm"
            onClick={() => {
              onContinueStandard?.();
              onClose();
            }}
          >
            Continue with standard PDF
          </button>
          <button type="button" className="b b-pri sm gap-1.5" onClick={upgrade}>
            <Crown className="h-4 w-4" />
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomHeaderUpgradeHost() {
  const [detail, setDetail] = useState<CustomHeaderUpgradeDetail | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      setDetail(
        event instanceof CustomEvent && event.detail
          ? (event.detail as CustomHeaderUpgradeDetail)
          : {}
      );
    };
    window.addEventListener(CUSTOM_HEADER_UPGRADE_EVENT, onOpen);
    return () => window.removeEventListener(CUSTOM_HEADER_UPGRADE_EVENT, onOpen);
  }, []);

  if (!detail) return null;
  return (
    <UpgradeDialog
      onClose={() => setDetail(null)}
      onContinueStandard={detail.onContinueStandard}
    />
  );
}
