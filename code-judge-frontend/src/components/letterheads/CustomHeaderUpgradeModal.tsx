"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, FileImage, X } from "lucide-react";
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
    router.push("/creator/billing/plans");
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
      <div className="w-full max-w-[460px] overflow-hidden rounded-[24px] border-2 border-[#1b1740] bg-white shadow-[0_30px_80px_-24px_rgba(27,23,64,0.65)]">
        <div className="relative overflow-hidden bg-[linear-gradient(155deg,#34268a_0%,#231a66_45%,#1b1740_100%)] px-5 py-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border border-[#f6bf2f]/20 bg-[#f6bf2f]/10" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-[#f6bf2f]/45 bg-[#f6bf2f]/15">
                <Crown className="h-5 w-5 text-[#f6bf2f]" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] !text-[#f6bf2f]">
                  Paid feature
                </p>
                <h2 id="custom-header-upgrade-title" className="mt-1 text-lg font-extrabold tracking-tight !text-white">
                  Use your college letterhead
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5">
          <p className="text-sm font-medium leading-relaxed text-[#5b5780]">
            Upgrade to any monthly plan to put your institute&apos;s letterhead at the top of every question paper.
          </p>
          <ul className="grid gap-2 rounded-[14px] border border-[#e4ddff] bg-[#faf8ff] p-3">
            {[
              `Save up to ${LETTERHEAD_MAX_PER_USER} letterheads`,
              "Place and size them on an A4 preview",
              "Repeat the header on every page",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] font-semibold text-[#1e1b4b]">
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#22c55e] !text-white">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2 rounded-[12px] border border-[#f0d28a] bg-[#fffaf0] p-3 text-[11.5px] font-medium leading-relaxed text-[#6b5a2b]">
            <FileImage className="mt-0.5 h-4 w-4 shrink-0 text-[#a16207]" />
            You can keep downloading standard question papers without a custom header.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#ece7ff] bg-[#faf8ff] px-5 py-4">
          <button
            type="button"
            className="min-h-[42px] cursor-pointer rounded-[12px] border border-[#d9d2f5] bg-white px-3.5 text-[12px] font-bold text-[#5b5780] transition-colors hover:border-[#8b6cff] hover:text-[#1e1b4b]"
            onClick={() => {
              onContinueStandard?.();
              onClose();
            }}
          >
            Continue with standard PDF
          </button>
          <button
            type="button"
            className="flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-[12px] border border-white/20 bg-[linear-gradient(135deg,#8b6cff,#5b3fe8)] px-4 text-[12px] font-bold !text-white shadow-[0_12px_26px_-12px_rgba(123,92,255,0.9)] transition-all hover:brightness-110 active:translate-y-px"
            onClick={upgrade}
          >
            <Crown className="h-4 w-4" />
            View monthly plans
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
