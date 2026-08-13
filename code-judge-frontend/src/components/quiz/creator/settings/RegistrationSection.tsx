"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Globe, Users } from "lucide-react";
import { SettingsCard, Toggle, SettingsRow, SettingsSelect } from "@/components/ui/settings";
import { getTimezones } from "@/services/quiz";
import { useQuizSettings } from "./QuizSettingsContext";
import { DateTimeField, FieldError, settingsInputClass } from "./settingsUi";
import { cn } from "@/lib/helpers";

const FALLBACK_TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];

function formatTimezoneLabel(name: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: name, timeZoneName: "short" }).formatToParts(new Date());
    const abbr = parts.find((p) => p.type === "timeZoneName")?.value;
    if (abbr && abbr !== name && !abbr.includes("GMT+0") && !abbr.includes("GMT0")) {
      return `${name} (${abbr})`;
    }
  } catch {
    // fall through
  }
  return name;
}

const toTimezoneOptions = (zones: string[]) => zones.map((tz) => ({ label: formatTimezoneLabel(tz), value: tz }));

export default function RegistrationSection() {
  const { details, updateDetails } = useQuizSettings();
  const [timezoneOptions, setTimezoneOptions] = useState<Array<{ label: string; value: string }>>(() =>
    toTimezoneOptions(FALLBACK_TIMEZONES)
  );

  const update = (patch: Partial<typeof details>) => updateDetails(patch);

  useEffect(() => {
    let cancelled = false;
    getTimezones()
      .then((zones) => {
        if (!cancelled && Array.isArray(zones) && zones.length > 0) {
          setTimezoneOptions(toTimezoneOptions(zones));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const registrationEndInvalid = Boolean(
    details.registrationEnabled &&
      details.registrationStart &&
      details.registrationEnd &&
      details.registrationEnd < details.registrationStart
  );

  const errors: Partial<Record<string, string>> = {};
  if (details.registrationEnabled) {
    if (!details.registrationStart) errors.registrationStart = "Registration start time is required.";
    if (!details.registrationEnd) errors.registrationEnd = "Registration end time is required.";
    if (registrationEndInvalid) errors.registrationEnd = "Registration end cannot be before start.";
  }
  if (details.timeLimit <= 0) errors.timeLimit = "Duration must be greater than 0.";

  return (
    <SettingsCard
      title="Registration"
      description="Configure registration and availability"
      icon={<Users className="h-5 w-5" />}
      iconClassName="bg-violet-500/10 text-violet-500"
    >
      <div className="rounded-2xl border border-border bg-card p-5">
        <SettingsRow
          label="Registration"
          description={details.registrationEnabled ? "Students must register before the quiz" : "Anyone can take the quiz without registering"}
        >
          <Toggle checked={details.registrationEnabled} onChange={(v) => update({ registrationEnabled: v })} />
        </SettingsRow>
      </div>

      {details.registrationEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid gap-6 sm:grid-cols-2"
        >
          <DateTimeField
            label="Registration Start"
            value={details.registrationStart}
            onChange={(v) => update({ registrationStart: v })}
            required
            error={errors.registrationStart || undefined}
          />
          <DateTimeField
            label="Registration End"
            value={details.registrationEnd}
            onChange={(v) => update({ registrationEnd: v })}
            required
            error={errors.registrationEnd || undefined}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Duration <span className="ml-0.5 text-danger">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                min={1}
                value={details.timeLimit}
                onChange={(e) => update({ timeLimit: Number(e.target.value) })}
                className={cn(settingsInputClass, "pl-10")}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted">
                minutes
              </span>
            </div>
            {errors.timeLimit && <FieldError message={errors.timeLimit} />}
          </div>
        </motion.div>
      )}

      {/* Timezone */}
      <div className="mt-6">
        <SettingsSelect
          label="Timezone"
          value={details.timeZone}
          onChange={(v) => update({ timeZone: v })}
          options={timezoneOptions}
          searchable
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
          <Globe className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          All quiz times are displayed in your selected timezone.
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-500">
            {details.timeZone || "Select a timezone"}
          </span>
        </div>
      </div>
    </SettingsCard>
  );
}
