"use client";

import { useState } from "react";
import { Globe, Clock, Languages, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";

export function StudioPreferences() {
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [duration, setDuration] = useState(60);
  const [language, setLanguage] = useState("English");
  const [aiEnabled, setAiEnabled] = useState(true);

  return (
    <div className="space-y-4">
      <h2 className="text-[15px] font-semibold text-profile-text-primary">Studio Preferences</h2>
      <div className="space-y-0">
        {/* Default visibility */}
        <PrefRow icon={Globe} label="Default Quiz Visibility">
          <div className="flex items-center gap-1.5">
            {(["public", "private"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                  visibility === v
                    ? "bg-profile-accent text-white"
                    : "bg-profile-surface-elevated text-profile-text-secondary hover:text-profile-text-primary"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </PrefRow>

        {/* Default duration */}
        <PrefRow icon={Clock} label="Default Assessment Duration">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-8 w-20 rounded-md border border-profile-border bg-profile-surface-elevated px-2.5 text-[13px] text-profile-text-primary outline-none focus:border-profile-accent"
            />
            <span className="text-[12px] text-profile-text-muted">min</span>
          </div>
        </PrefRow>

        {/* Language */}
        <PrefRow icon={Languages} label="Default Language">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-8 rounded-md border border-profile-border bg-profile-surface-elevated px-2.5 text-[13px] text-profile-text-primary outline-none focus:border-profile-accent"
          >
            <option>English</option>
            <option>Hindi</option>
            <option>Bilingual</option>
          </select>
        </PrefRow>

        {/* AI Generation */}
        <PrefRow icon={Sparkles} label="AI Generation">
          <button
            type="button"
            onClick={() => setAiEnabled(!aiEnabled)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150",
              aiEnabled
                ? "border-profile-accent bg-profile-accent"
                : "border-profile-border bg-profile-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150",
                aiEnabled ? "translate-x-[18px]" : "translate-x-0.5"
              )}
            />
          </button>
        </PrefRow>
      </div>
    </div>
  );
}

function PrefRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-profile-border py-3.5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-profile-text-muted" />
        <span className="text-[13px] font-medium text-profile-text-primary">{label}</span>
      </div>
      {children}
    </div>
  );
}
