"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/helpers";

function Coin({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute grid select-none place-items-center rounded-full font-bold text-[#9a5a00]",
        className
      )}
      style={{
        background: "radial-gradient(circle at 35% 30%, #ffe18a, #f5b72b 55%, #c98310)",
        boxShadow:
          "inset 0 0 0 3px #e9a71f, inset 0 0 0 5px #fbd160, 0 6px 12px rgba(160,100,0,.25)",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

function StepArt({ step }: { step: number }) {
  if (step === 1) {
    return (
      <div aria-hidden="true" className="relative h-[82px] w-[160px]">
        <span className="absolute left-1 top-1 text-[14px] text-[#f5b72b]">✦</span>
        <Coin label="★" className="left-[14%] top-[34px] h-11 w-11 text-[17px]" />
        <Coin label="₹" className="right-[16%] top-0 h-[66px] w-[66px] text-[30px]" />
      </div>
    );
  }

  if (step === 2) {
    return (
      <div aria-hidden="true" className="relative h-[82px] w-[160px]">
        <span className="absolute right-0 top-5 text-[14px] text-[#7c5cff]">✦</span>
        <Coin label="★" className="left-[16%] top-[38px] h-10 w-10 text-[15px]" />
        <Coin label="★" className="left-[38%] top-[22px] h-11 w-11 text-[16px]" />
        <Coin label="₹" className="left-[58%] top-[6px] h-[58px] w-[58px] text-[26px]" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="relative h-[82px] w-[160px]">
      <span className="absolute left-0 top-2 text-[14px] text-[#7c5cff]">✦</span>
      <Coin label="★" className="right-[36%] top-[36px] h-10 w-10 text-[15px]" />
      <Coin label="6M" className="right-[8%] top-0 h-[62px] w-[62px] text-[19px]" />
    </div>
  );
}

export function HowCreditsWork({
  validityMonths,
}: {
  validityMonths?: number;
}) {
  const steps = [
    {
      title: "Buy a top-up",
      body: "Pay once via UPI, card or net banking. No separate AI subscription is required.",
    },
    {
      title: "Credits are added instantly",
      body: "Purchased credits are added to your monthly plan credits as soon as the payment is verified.",
    },
    {
      title: "Use within the validity period",
      body: validityMonths
        ? `Purchased credits remain valid for ${validityMonths} months from the date of purchase. Plan credits refresh every month.`
        : "Purchased credits remain valid for the period shown at purchase. Plan credits refresh every month.",
    },
  ];

  return (
    <details
      open
      className="group mt-3 rounded-[20px] border border-[#d9ccff] bg-white/90 px-4 py-0 shadow-[0_18px_45px_-30px_rgba(70,40,200,0.45)] backdrop-blur sm:mt-8 sm:rounded-[26px] sm:px-5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 [&::-webkit-details-marker]:hidden sm:py-5">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold text-[#9a5a00]"
            style={{
              background: "radial-gradient(circle at 35% 30%, #ffe18a, #f5b72b 55%, #c98310)",
              boxShadow: "inset 0 0 0 2px #e9a71f, inset 0 0 0 4px #fbd160",
            }}
          >
            ₹
          </span>
          <span className="qs-display truncate text-[18px] font-extrabold tracking-tight sm:text-[22px]">
            How credits work
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-bold text-[#5b3df5] sm:text-sm">
          <span className="group-open:hidden">Learn more</span>
          <span className="hidden group-open:inline">Hide</span>
        </span>
      </summary>

      <div className="grid gap-3 pb-4 pt-1 sm:grid-cols-3 sm:gap-4 sm:pb-5">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-[16px] border border-[#d9ccff] bg-white p-4 shadow-[0_10px_24px_-22px_rgba(70,40,200,0.5)] sm:rounded-[18px] sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <b className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1e1b4b] text-[12px] font-extrabold !text-white sm:h-9 sm:w-9 sm:text-[13px]">
                {index + 1}
              </b>
              <StepArt step={index + 1} />
            </div>
            <strong className="mt-2 block text-[15px] font-extrabold leading-snug sm:text-[16px]">
              {step.title}
            </strong>
            <p className="mt-1.5 text-[13px] font-medium leading-5 text-[var(--qs-muted)] sm:text-[13.5px]">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
