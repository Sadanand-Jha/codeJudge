"use client";

import { AlertTriangle } from "lucide-react";

export function DangerZone() {
  return (
    <div className="space-y-4 rounded-xl border border-red-500/20 bg-profile-surface p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500/60" />
        <h2 className="text-[15px] font-semibold text-profile-text-primary">Danger Zone</h2>
      </div>
      <p className="text-[12px] text-profile-text-muted">
        These actions are irreversible. Please be certain before proceeding.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded-lg border border-red-500/20 px-4 py-2 text-[12px] font-semibold text-red-500/80 transition-colors hover:bg-red-500/5 hover:text-red-500"
        >
          Deactivate Creator Account
        </button>
      </div>
    </div>
  );
}
