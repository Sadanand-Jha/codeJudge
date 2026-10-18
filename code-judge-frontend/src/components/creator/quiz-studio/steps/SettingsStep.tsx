"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { StudioStepHeader, StudioStepLayout, SwitchField } from "../primitives";
import { TimingSection } from "../components/timing";
import { toast } from "@/lib/toast";
import { updateQuiz } from "@/services/quiz";
import { fetchMyRooms } from "@/services/rooms";
import { getEligibleCount, useRoomStore } from "@/store/roomStore";
import type { AccessMode } from "../types";

const GROUPS: Array<{ id: string; label: string; fields: SettingField[]; comingSoon?: boolean; alwaysOn?: boolean }> = [
  {
    id: "general",
    label: "General",
    fields: [
      { key: "negativeMarking", label: "Enable negative marking", description: "Deduct marks for wrong answers." },
    ],
  },
  {
    id: "behavior",
    label: "Question Behavior",
    fields: [
      { key: "randomizeQuestions", label: "Randomize question order" },
      { key: "randomizeOptions", label: "Randomize option order" },
    ],
  },
  {
    id: "result",
    label: "Result & Visibility",
    fields: [
      { key: "showResultsImmediately", label: "Show results", description: "Students can see the marks obtained in their attempt" },
    ],
  },
  {
    id: "security",
    label: "Security",
    alwaysOn: true,
    fields: [
      { key: "fullscreenMode", label: "Full-screen mode" },
      { key: "tabSwitchDetection", label: "Tab-switch detection" },
      { key: "copyProtection", label: "Disable copy / text selection" },
    ],
  },
];

interface SettingField {
  key: string;
  label: string;
  type?: "number" | "select";
  options?: string[];
  description?: string;
}

export function SettingsStep() {
  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Quiz Settings" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <TimingSection />

          <AccessCard />

          {GROUPS.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
            >
              <SettingGroup
                key={g.id}
                id={g.id}
                label={g.label}
                fields={g.fields}
                comingSoon={g.comingSoon}
                alwaysOn={g.alwaysOn}
              />
            </motion.div>
          ))}
        </div>

        <SummaryAside />
      </div>
    </StudioStepLayout>
  );
}

function SummaryAside() {
  const { state } = useStudio();
  const lifecycle = state.info.quizLifecycle;
  const status =
    lifecycle === "live"
      ? { label: "Live", className: "text-[var(--qs-ok)]" }
      : lifecycle === "scheduled"
        ? { label: "Scheduled", className: "text-[#a85d00]" }
        : lifecycle === "ended"
          ? { label: "Ended", className: "text-[var(--qs-bad)]" }
          : { label: "Draft", className: "text-[var(--qs-muted)]" };

  const startLabel =
    lifecycle === "scheduled" && state.info.startDate
      ? new Date(state.info.startDate).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Manual";

  return (
    <aside className="min-w-0 lg:sticky lg:top-4">
      <div className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 sm:p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">Summary</p>
        <dl className="mt-3.5 space-y-3 text-xs">
          <SummaryRow label="Status" value={status.label} valueClassName={status.className} />
          <SummaryRow label="Start" value={startLabel} />
          <SummaryRow label="Attempt time" value={`${state.info.duration || 60} min`} />
          <SummaryRow label="Negative marking" value={state.settings.negativeMarking ? "On" : "Off"} />
        </dl>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-medium text-[var(--qs-muted)]">{label}</dt>
      <dd className={cn("font-extrabold text-[var(--qs-ink)]", valueClassName)}>{value}</dd>
    </div>
  );
}

function SettingGroup({
  label,
  fields,
  comingSoon,
  alwaysOn,
}: {
  id: string;
  label: string;
  fields: SettingField[];
  comingSoon?: boolean;
  alwaysOn?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn("rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 min-w-0 overflow-hidden", comingSoon && "opacity-60")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-black text-[var(--qs-ink)]">
            {label}
          </span>
          {comingSoon && (
            <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">
              Coming soon
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-[var(--qs-muted)] transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-1">
          {fields.map((f) =>
            alwaysOn ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-[var(--qs-ink)]">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]">
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            ) : comingSoon ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-[var(--qs-muted)]">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-line)] opacity-60">
                  <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            ) : (
              <Field key={f.key} field={f} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Field({ field }: { field: SettingField }) {
  const { state, updateSettings } = useStudio();
  const value = (state.settings as unknown as Record<string, unknown>)[field.key];

  if (field.type === "select") {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm font-medium text-[var(--qs-ink)]">{field.label}</span>
        <select
          value={String(value)}
          onChange={(e) => updateSettings({ [field.key]: e.target.value })}
          className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-xs font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm font-medium text-[var(--qs-ink)]">{field.label}</span>
        <input
          type="number"
          min={0}
          value={Number(value) || ""}
          onChange={(e) => updateSettings({ [field.key]: Number(e.target.value) })}
          className="h-8 w-20 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-xs font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
        />
      </div>
    );
  }

  return (
    <SwitchField
      label={field.label}
      description={field.description}
      checked={!!value}
      onChange={(v) => updateSettings({ [field.key]: v })}
    />
  );
}

const ACCESS_MODES: Array<{ id: AccessMode; label: string; description: string }> = [
  { id: "public", label: "Public", description: "Anyone can discover and attempt this quiz." },
  { id: "private", label: "Private", description: "Only students with the quiz link can attempt." },
  { id: "classroom", label: "Rooms", description: "Only students from the rooms you select can attempt." },
];

function AccessCard() {
  const { state, updateAudience, saveAudienceParticipants, audienceDirty, goToStep } = useStudio();
  const rooms = useRoomStore((s) => s.rooms);
  const setRooms = useRoomStore((s) => s.setRooms);
  const [saving, setSaving] = useState(false);

  const audience = state.audience;
  const mode = audience.mode;
  const roomIds = useMemo(() => audience.roomIds ?? [], [audience.roomIds]);
  const eligibleCount = useMemo(() => getEligibleCount(rooms, roomIds), [rooms, roomIds]);
  const activeMode = ACCESS_MODES.find((m) => m.id === mode) ?? ACCESS_MODES[0];

  useEffect(() => {
    if (mode !== "classroom" || rooms.length > 0) return;
    let cancelled = false;
    fetchMyRooms()
      .then((freshRooms) => {
        if (!cancelled) setRooms(freshRooms);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mode, rooms.length, setRooms]);

  const handleUpdateAccess = async () => {
    if (saving) return;
    if (!state.serverQuizId) {
      toast.info({
        title: "Quiz not saved yet",
        description: "Save the quiz once — access updates apply to saved quizzes.",
      });
      return;
    }
    setSaving(true);
    try {
      if (mode === "classroom") {
        await saveAudienceParticipants();
        toast.success({
          title: "Quiz access updated",
          description:
            eligibleCount > 0
              ? `${eligibleCount} student${eligibleCount === 1 ? "" : "s"} from ${roomIds.length} room${roomIds.length === 1 ? "" : "s"} can attempt this quiz.`
              : "Room access saved for this quiz.",
        });
      } else {
        await updateQuiz(state.serverQuizId, { audienceMode: mode });
        toast.success({
          title: "Quiz access updated",
          description:
            mode === "public"
              ? "Anyone can now discover and attempt this quiz."
              : "Only students with the link can attempt this quiz.",
        });
      }
    } catch (error) {
      toast.error({
        title: "Could not update access",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-[var(--qs-ink)]">Access</h3>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">{activeMode.description}</p>
        </div>
        <button
          type="button"
          onClick={handleUpdateAccess}
          disabled={saving}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", saving && "animate-spin motion-reduce:animate-none")} />
          {saving ? "Updating…" : "Update Access"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {ACCESS_MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => updateAudience({ mode: m.id })}
              className={cn(
                "flex min-h-12 flex-col justify-center gap-0.5 rounded-[14px] border-2 p-3 text-left transition-all duration-150",
                active
                  ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                  : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]"
              )}
            >
              <span className={cn("text-sm font-black", active ? "text-[var(--qs-brand)]" : "text-[var(--qs-ink)]")}>
                {m.label}
              </span>
              <span className="text-[10px] font-medium leading-snug text-[var(--qs-muted)]">{m.description}</span>
            </button>
          );
        })}
      </div>

      {mode === "classroom" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-3 py-2">
          <span className="text-xs font-bold text-[var(--qs-ink)]">
            {roomIds.length > 0
              ? `${roomIds.length} room${roomIds.length === 1 ? "" : "s"} · ${eligibleCount} student${eligibleCount === 1 ? "" : "s"} eligible`
              : "No rooms selected yet."}
          </span>
          {roomIds.length > 0 ? (
            audienceDirty ? (
              <span className="rounded-full border-2 border-[#a85d00]/30 bg-[#fff3d6] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#a85d00]">
                Unsaved changes
              </span>
            ) : (
              <span className="rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-ok)]">
                Saved
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => goToStep("audience")}
              className="text-xs font-extrabold text-[var(--qs-brand)] transition-colors duration-150 hover:text-[var(--qs-ink)]"
            >
              Pick rooms →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
