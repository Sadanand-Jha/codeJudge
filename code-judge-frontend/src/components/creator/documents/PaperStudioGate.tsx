"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Check, Copy, Loader2, Monitor } from "lucide-react";
import { shouldOpenPaperStudioOnDesktop } from "@/lib/documentEditor/device";

const DocumentEditor = dynamic(() => import("./DocumentEditor").then((module) => module.DocumentEditor), {
  ssr: false,
  loading: () => <PaperStudioLoading />,
});

type DeviceState = "checking" | "desktop" | "mobile";

function PaperStudioLoading() {
  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-[#f2effc]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--qs-brand)]" />
        <p className="text-sm font-bold text-[var(--qs-ink)]">Opening Paper Studio…</p>
      </div>
    </div>
  );
}

export function PaperStudioGate() {
  const [device, setDevice] = useState<DeviceState>("checking");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const wideScreen = window.matchMedia("(min-width: 1024px)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const update = () => {
      const desktop = shouldOpenPaperStudioOnDesktop({
        viewportWidth: window.innerWidth,
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        coarsePointer: coarsePointer.matches,
      });
      setDevice(desktop ? "desktop" : "mobile");
    };
    const timer = window.setTimeout(update, 0);
    wideScreen.addEventListener("change", update);
    coarsePointer.addEventListener("change", update);
    return () => {
      window.clearTimeout(timer);
      wideScreen.removeEventListener("change", update);
      coarsePointer.removeEventListener("change", update);
    };
  }, []);

  if (device === "checking") return <PaperStudioLoading />;
  if (device === "desktop") return <DocumentEditor />;

  const copyLink = () => {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-[#efecfb] p-5 text-[var(--qs-ink)]">
      <div className="w-full max-w-md rounded-[20px] border-2 border-[var(--qs-ink)] bg-white p-6 shadow-[6px_6px_0_var(--qs-sun)] sm:p-7">
        <span className="grid h-14 w-14 place-items-center rounded-[15px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
          <Monitor className="h-7 w-7" />
        </span>
        <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-muted)]">Paper Studio</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Open this editor on a desktop</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--qs-muted)]">
          The paper editor needs a desktop-sized screen and keyboard. Open this link on a laptop or desktop computer to
          edit, import and export papers.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/creator/tests" className="b flex-1 justify-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back to tests
          </Link>
          <button type="button" onClick={copyLink} className="b b-pri flex-1 justify-center gap-1.5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copied" : "Copy desktop link"}
          </button>
        </div>
        <p className="mt-4 border-t border-[var(--qs-line)] pt-4 text-[10px] font-semibold leading-5 text-[var(--qs-muted)]">
          Drafts are stored in this browser. Use the same browser profile on desktop when you continue working.
        </p>
      </div>
    </div>
  );
}
