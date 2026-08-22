"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CalendarClock, Clock, Globe } from "lucide-react";
import { SettingsCard, Toggle, SettingsRow, SettingsSelect } from "@/components/ui/settings";
import { getTimezones, updateQuiz } from "@/services/quiz";
import { useQuizSettings } from "./QuizSettingsContext";
import { FieldError, settingsInputClass } from "./settingsUi";
import { cn } from "@/lib/helpers";
import { saveQuizDetails } from "@/utils/quizStorage";

/* =============================================
   Local helpers
   ============================================= */
function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Format a Date as a datetime-local value: YYYY-MM-DDTHH:mm */
function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function splitDateTime(v: string) {
  return {
    date: v.split("T")[0] || "",
    time: v.split("T")[1]?.slice(0, 5) || "",
  };
}

const todayDate = () => toLocalInput(new Date()).split("T")[0];

function formatDisplay(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

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

const FALLBACK_TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];

/* =============================================
   Date / Time inputs
   ============================================= */
function DateField({
  label,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <div className="relative">
        <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            settingsInputClass,
            "pl-10 [color-scheme:light] dark:[color-scheme:dark]",
            error && "!border-danger focus:!border-danger focus:ring-danger/10"
          )}
        />
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <div className="relative">
        <Clock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            settingsInputClass,
            "pl-10 [color-scheme:light] dark:[color-scheme:dark]",
            error && "!border-danger focus:!border-danger focus:ring-danger/10"
          )}
        />
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}

export default function ScheduleSection() {
  const { details, updateDetails, quizId } = useQuizSettings();
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const [timezoneOptions, setTimezoneOptions] = useState<Array<{ label: string; value: string }>>(() =>
    FALLBACK_TIMEZONES.map((tz) => ({ label: formatTimezoneLabel(tz), value: tz }))
  );

  const hasStart = Boolean(details.startDate);
  const hasEnd = Boolean(details.endDate);

  const start = splitDateTime(details.startDate);
  const end = splitDateTime(details.endDate);

  useEffect(() => {
    let cancelled = false;
    getTimezones()
      .then((zones) => {
        if (!cancelled && Array.isArray(zones) && zones.length > 0) {
          setTimezoneOptions(zones.map((tz) => ({ label: formatTimezoneLabel(tz), value: tz })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /** Persist locally, push to workspace state, then debounce-save to the server.
      An empty value is sent as null so a previously saved time can be cleared. */
  const scheduleChanged = (nextStart: string, nextEnd: string) => {
    saveQuizDetails({ ...details, startDate: nextStart, endDate: nextEnd });
    updateDetails({ startDate: nextStart, endDate: nextEnd });
    if (!quizId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateQuiz(String(quizId), {
          starttime: nextStart || null,
          endtime: nextEnd || null,
        });
      } catch (err) {
        console.error("Failed to save quiz schedule:", err);
      }
    }, 700);
  };

  const toggleStart = (enabled: boolean) => {
    scheduleChanged(enabled ? toLocalInput(new Date(Date.now() + 60 * 60 * 1000)) : "", details.endDate);
  };

  const toggleEnd = (enabled: boolean) => {
    if (!enabled) {
      scheduleChanged(details.startDate, "");
      return;
    }
    const base = hasStart ? new Date(details.startDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    scheduleChanged(details.startDate, toLocalInput(new Date(base.getTime() + 60 * 60 * 1000)));
  };

  const endInvalid = Boolean(hasStart && hasEnd && details.endDate <= details.startDate);
  const endError = endInvalid ? "End date/time cannot be before or equal to start." : undefined;

  return (
    <SettingsCard
      title="Schedule"
      description="When students can access and attempt this quiz"
      icon={<CalendarClock className="h-5 w-5" />}
      iconClassName="bg-blue-500/10 text-blue-500"
    >
      <div className="space-y-6">
        {/* ===== Start ===== */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SettingsRow
            label="Scheduled Opening"
            description={
              hasStart
                ? "The quiz opens automatically at the scheduled start"
                : "The quiz opens as soon as it is started"
            }
          >
            <Toggle checked={hasStart} onChange={toggleStart} />
          </SettingsRow>

          {hasStart && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              className="mt-5 grid gap-6 sm:grid-cols-2"
            >
              <DateField
                label="Start Date"
                value={start.date}
                onChange={(v) => scheduleChanged(`${v}T${start.time || "00:00"}`, details.endDate)}
                required
              />
              <TimeField
                label="Start Time"
                value={start.time}
                onChange={(v) => scheduleChanged(`${start.date || todayDate()}T${v}`, details.endDate)}
                required
              />
            </motion.div>
          )}
        </div>

        {/* ===== End ===== */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SettingsRow
            label="Fixed End Time"
            description={
              hasEnd
                ? "The quiz stops accepting attempts at the scheduled end"
                : "No fixed end — you can close the quiz manually anytime"
            }
          >
            <Toggle checked={hasEnd} onChange={toggleEnd} />
          </SettingsRow>

          {hasEnd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              className="mt-5 grid gap-6 sm:grid-cols-2"
            >
              <DateField
                label="End Date"
                value={end.date}
                onChange={(v) => scheduleChanged(details.startDate, `${v}T${end.time || "23:59"}`)}
                required
                error={endError}
              />
              <TimeField
                label="End Time"
                value={end.time}
                onChange={(v) => scheduleChanged(details.startDate, `${end.date || todayDate()}T${v}`)}
                required
                error={endError}
              />
            </motion.div>
          )}
        </div>

        {/* ===== Summary ===== */}
        {(hasStart || hasEnd) && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-500">Availability Window</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Students can attempt
                  {hasStart ? ` from ${formatDisplay(details.startDate)}` : ""}
                  {hasEnd ? ` until ${formatDisplay(details.endDate)}` : " with no fixed end"}.
                  <span className="ml-2 text-[10px] font-medium text-blue-500">({details.timeZone})</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== Timezone ===== */}
        <div>
          <SettingsSelect
            label="Timezone"
            value={details.timeZone}
            onChange={(v) => {
              saveQuizDetails({ ...details, timeZone: v });
              updateDetails({ timeZone: v });
            }}
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
      </div>
    </SettingsCard>
  );
}
