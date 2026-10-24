"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Globe2, MapPin, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getTimezones } from "@/services/quiz";
import {
  fetchCountries,
  updateProfileLocation,
  updateProfileTimezone,
  type LocationOption,
} from "@/services/user";
import { toast } from "@/lib/toast";

const DISMISS_KEY = "quizsupport_timezone_prompt_until";
const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
];

function timezoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const abbreviation = parts.find((part) => part.type === "timeZoneName")?.value;
    return abbreviation ? `${timeZone} (${abbreviation})` : timeZone;
  } catch {
    return timeZone;
  }
}

function countryName(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

export default function TimezonePrompt() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  const [open, setOpen] = useState(false);
  const [timezones, setTimezones] = useState<string[]>(FALLBACK_TIMEZONES);
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [selectedTimezone, setSelectedTimezone] = useState("UTC");
  const [selectedCountryId, setSelectedCountryId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user || (user.timezone && user.countryId)) {
      setOpen(false);
      return;
    }

    try {
      const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Number.isFinite(dismissedUntil) && Date.now() < dismissedUntil) return;
    } catch {
      // Ignore storage failures and ask again.
    }

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setSelectedTimezone(user.timezone || detected);
    setSelectedCountryId(user.countryId ?? "");
    setOpen(true);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    getTimezones()
      .then((list) => {
        if (cancelled || !Array.isArray(list)) return;
        setTimezones((current) =>
          Array.from(new Set([...current, ...list])).sort((a, b) => a.localeCompare(b))
        );
      })
      .catch(() => {
        // The fallback list is enough to let the user continue.
      });

    fetchCountries("")
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.label.localeCompare(b.label));
        setCountries(sorted);
        setSelectedCountryId((current) => {
          if (current) return current;
          if (user?.countryId) return user.countryId;
          const savedName = countryName(user?.country)?.toLowerCase();
          if (!savedName) return "";
          return sorted.find((country) => country.label.toLowerCase() === savedName)?.id ?? "";
        });
      })
      .catch(() => {
        // The prompt can still save a timezone; country is required to submit.
      });

    return () => {
      cancelled = true;
    };
  }, [open, user?.country, user?.countryId]);

  const timezoneOptions = useMemo(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return Array.from(
      new Set([detected, selectedTimezone, ...timezones])
    ).sort((a, b) => a.localeCompare(b));
  }, [selectedTimezone, timezones]);

  const save = async () => {
    if (saving) return;
    if (!selectedCountryId) {
      toast.error("Choose your country", {
        description: "We use it to keep your region and timezone correct.",
      });
      return;
    }

    setSaving(true);
    try {
      const [savedTimezone, location] = await Promise.all([
        updateProfileTimezone(selectedTimezone),
        updateProfileLocation({ countryId: Number(selectedCountryId) }),
      ]);
      const country = countries.find((item) => item.id === selectedCountryId);
      setUser({
        timezone: savedTimezone,
        countryId: location.countryId,
        stateId: location.stateId,
        collegeId: location.collegeId,
        country: country?.label ?? user?.country ?? null,
        state: location.stateId ? user?.state : null,
        college: location.collegeId ? user?.college : null,
      });
      toast.success("Location saved", {
        description: "Dates and daily limits now follow your local time.",
      });
      setOpen(false);
    } catch {
      toast.error("Could not save your location", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86_400_000));
    } catch {
      // Ignore storage failures.
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="qs-ui fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(26, 18, 64, 0.6)" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-prompt-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg rounded-3xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 shadow-[8px_8px_0_var(--qs-sun)] sm:p-7"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-line)] text-[var(--qs-brand)]">
                <Globe2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                  Your location
                </p>
                <h2 id="location-prompt-title" className="mt-1 text-[24px] font-extrabold text-[var(--qs-ink)]">
                  Where are you located?
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--qs-muted)]">
              We store every timestamp in UTC. Your country and timezone let us show dates
              correctly and reset daily limits at your local midnight.
            </p>

            <div className="mt-5 space-y-3">
              <label htmlFor="country-select" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                <MapPin className="h-3.5 w-3.5" />
                Country
              </label>
              <select
                id="country-select"
                value={selectedCountryId}
                onChange={(event) =>
                  setSelectedCountryId(event.target.value ? Number(event.target.value) : "")
                }
                className="h-12 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-sm font-semibold text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)]"
              >
                <option value="">Select your country</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-3">
              <label htmlFor="timezone-select" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                <Clock3 className="h-3.5 w-3.5" />
                Timezone
              </label>
              <select
                id="timezone-select"
                value={selectedTimezone}
                onChange={(event) => setSelectedTimezone(event.target.value)}
                className="h-12 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-sm font-semibold text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)]"
              >
                {timezoneOptions.map((timeZone) => (
                  <option key={timeZone} value={timeZone}>
                    {timezoneLabel(timeZone)}
                  </option>
                ))}
              </select>
              <p className="flex items-center gap-1.5 text-xs text-[var(--qs-muted)]">
                <Globe2 className="h-3.5 w-3.5" />
                Detected from this device. Change it if it is wrong.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={dismiss}
                className="h-11 rounded-xl border-2 border-[var(--qs-line)] px-5 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !selectedCountryId}
                className="h-11 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-sm font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-105 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save location"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
