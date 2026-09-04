"use client";

export type TimingMode = "schedule" | "manual";
export type QuizLifecycle =
  | "draft"
  | "scheduled"
  | "live"
  | "ended";
export type LateJoinCutoff = "15min_before" | "at_end";
export type EndBehavior = "manual" | "auto_duration";

export interface ScheduleConfig {
  startDate: string;
  startTime: string;
  /** Optional fixed end for the quiz window. Empty = manual end. */
  endDate: string;
  endTime: string;
}

export interface ManualConfig {
  status: QuizLifecycle;
  startedAt: string | null;
  endedAt: string | null;
  endBehavior: EndBehavior;
  sessionDuration: number;
}

export interface AdvancedConfig {
  lateJoining: boolean;
  lateJoinCutoff: LateJoinCutoff;
  rejoining: boolean;
  autoSubmit: boolean;
}

export interface TimingState {
  mode: TimingMode;
  schedule: ScheduleConfig;
  manual: ManualConfig;
  participantDuration: number;
  advanced: AdvancedConfig;
  validationErrors: string[];
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
};

export const DEFAULT_MANUAL: ManualConfig = {
  status: "draft",
  startedAt: null,
  endedAt: null,
  endBehavior: "manual",
  sessionDuration: 120,
};

export const DEFAULT_ADVANCED: AdvancedConfig = {
  lateJoining: true,
  lateJoinCutoff: "15min_before",
  rejoining: true,
  autoSubmit: true,
};

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
export const SESSION_DURATION_PRESETS = [30, 60, 90, 120, 180, 240];

export const LIFECYCLE_META: Record<
  QuizLifecycle,
  {
    label: string;
    color: "neutral" | "success" | "warning" | "rose" | "accent";
  }
> = {
  draft: { label: "Draft", color: "neutral" },
  scheduled: { label: "Scheduled", color: "accent" },
  live: { label: "Live", color: "success" },
  ended: { label: "Ended", color: "rose" },
};
