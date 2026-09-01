"use client";

export type MechanicId =
  | "fiftyFifty"
  | "audiencePoll"
  | "hint"
  | "skip"
  | "extraTime"
  | "doublePoints"
  | "freezeTimer"
  | "eliminateOne"
  | "streakBonus"
  | "speedBonus"
  | "secondChance"
  | "decayingPoints";

export type UsesValue = number | "unlimited";

export interface FiftyFiftyConfig {
  enabled: boolean;
  uses: UsesValue; // 1/2/3/unlimited ; for <4 options intelligently handle
}
export interface AudiencePollConfig {
  enabled: boolean;
  uses: UsesValue;
  showPercentages: boolean;
  showResponseCount: boolean;
  aiFallback: boolean; // generate AI poll if no live audience
}
export interface HintLevel {
  id: string;
  content: string;
  penalty: number;
}
export interface HintConfig {
  enabled: boolean;
  uses: UsesValue;
  hints: HintLevel[];
}
export interface SkipConfig {
  enabled: boolean;
  uses: UsesValue; // per quiz
  penalty: number; // marks
}
export interface ExtraTimeConfig {
  enabled: boolean;
  uses: UsesValue;
  seconds: 15 | 30 | 60 | number;
  customEnabled?: boolean;
}
export interface DoublePointsConfig {
  enabled: boolean;
  uses: UsesValue;
}
export interface FreezeTimerConfig {
  enabled: boolean;
  uses: UsesValue;
  duration: number; // seconds
}
export interface EliminateOneConfig {
  enabled: boolean;
  uses: UsesValue;
}
export interface StreakBonusConfig {
  enabled: boolean;
  uses: UsesValue;
  bonusPoints?: number;
}
export interface SpeedBonusConfig {
  enabled: boolean;
  uses: UsesValue;
  thresholdSeconds?: number;
}
export interface SecondChanceConfig {
  enabled: boolean;
  uses: UsesValue;
}
export interface DecayingPointsConfig {
  enabled: boolean;
  decayPerSecond: number; // points lost per second
  minPoints: number; // floor so points never reach 0
}

export interface UsageRules {
  sharedAcrossQuiz: boolean; // true = remaining uses decrease for entire quiz
}

export interface GameMechanicsConfig {
  fiftyFifty: FiftyFiftyConfig;
  audiencePoll: AudiencePollConfig;
  hint: HintConfig;
  skip: SkipConfig;
  extraTime: ExtraTimeConfig;
  doublePoints: DoublePointsConfig;
  freezeTimer: FreezeTimerConfig;
  eliminateOne: EliminateOneConfig;
  streakBonus: StreakBonusConfig;
  speedBonus: SpeedBonusConfig;
  secondChance: SecondChanceConfig;
  decayingPoints: DecayingPointsConfig;
  usageRules: UsageRules;
}

export const DEFAULT_GAME_MECHANICS: GameMechanicsConfig = {
  fiftyFifty: { enabled: false, uses: 0 },
  audiencePoll: { enabled: false, uses: 0, showPercentages: true, showResponseCount: true, aiFallback: false },
  hint: {
    enabled: false,
    uses: 0,
    hints: [{ id: "h1", content: "Think about the operation used to remove the most recently inserted element.", penalty: 0 }],
  },
  skip: { enabled: false, uses: 0, penalty: 0 },
  extraTime: { enabled: false, uses: 0, seconds: 30 },
  doublePoints: { enabled: false, uses: 0 },
  freezeTimer: { enabled: false, uses: 0, duration: 10 },
  eliminateOne: { enabled: false, uses: 0 },
  streakBonus: { enabled: false, uses: 0, bonusPoints: 5 },
  speedBonus: { enabled: false, uses: 0, thresholdSeconds: 30 },
  secondChance: { enabled: false, uses: 0 },
  decayingPoints: { enabled: false, decayPerSecond: 1, minPoints: 1 },
  usageRules: { sharedAcrossQuiz: true },
};

// When mechanics are turned off, all uses must be 0 (no lifelines/power-ups).
// When a mechanic is re-enabled, its uses default to 1 if it was 0.
export function normalizeMechanicUses<T extends { enabled: boolean; uses: UsesValue }>(m: T): T {
  if (!m.enabled && m.uses !== 0) return { ...m, uses: 0 as UsesValue };
  if (m.enabled && m.uses === 0) return { ...m, uses: 1 as UsesValue };
  return m;
}

export function normalizeGameMechanics(cfg: GameMechanicsConfig): GameMechanicsConfig {
  const next = JSON.parse(JSON.stringify(cfg)) as GameMechanicsConfig;
  (Object.keys(next) as MechanicId[]).forEach((id) => {
    const v: any = (next as any)[id];
    if (v && typeof v.enabled === "boolean" && "uses" in v) {
      (next as any)[id] = normalizeMechanicUses(v);
    }
  });
  return next;
}

export function zeroAllMechanics(cfg: GameMechanicsConfig): GameMechanicsConfig {
  const next = JSON.parse(JSON.stringify(cfg)) as GameMechanicsConfig;
  (Object.keys(next) as MechanicId[]).forEach((id) => {
    const v: any = (next as any)[id];
    if (v && typeof v.enabled === "boolean") v.enabled = false;
    if (v && "uses" in v) v.uses = 0;
  });
  return next;
}

export function isAnyMechanicEnabled(cfg: GameMechanicsConfig): boolean {
  return (Object.keys(cfg) as (keyof GameMechanicsConfig)[]).some((k) => {
    const v: any = (cfg as any)[k];
    return v && v.enabled === true;
  });
}

export const MECHANIC_META: Record<MechanicId, { label: string; short: string; description: string; icon: string }> = {
  fiftyFifty: { label: "50:50", short: "50:50", description: "Remove two incorrect options and leave two possible answers.", icon: "split" },
  audiencePoll: { label: "Audience Poll", short: "Poll", description: "Let students see how other participants answered.", icon: "users" },
  hint: { label: "Hint", short: "Hint", description: "Give students a clue without revealing the answer.", icon: "lightbulb" },
  skip: { label: "Skip", short: "Skip", description: "Allow students to temporarily skip and return later.", icon: "skip" },
  extraTime: { label: "+30 Seconds", short: "+30s", description: "Give students a limited ability to extend the timer.", icon: "timer" },
  doublePoints: { label: "2× Points", short: "2×", description: "Double the points earned from this question.", icon: "zap" },
  freezeTimer: { label: "Freeze Time", short: "Freeze", description: "Pause the countdown temporarily while the student thinks.", icon: "snowflake" },
  eliminateOne: { label: "Eliminate 1", short: "-1", description: "Remove one incorrect option.", icon: "minus" },
  streakBonus: { label: "Streak Bonus", short: "Streak", description: "Bonus points for consecutive correct answers.", icon: "flame" },
  speedBonus: { label: "Speed Bonus", short: "Speed", description: "Extra points for fast correct answers.", icon: "gauge" },
  secondChance: { label: "Second Chance", short: "Revive", description: "Allow a retry after a wrong answer.", icon: "rotate" },
  decayingPoints: { label: "Decaying Points", short: "Decay", description: "Points on each question decrease over time — answer fast for maximum marks.", icon: "timer-off" },
};

export type QuestionTypeForMechanics = import("@/components/quiz/creator/types").CreatorQuestionType;

export function isMechanicAvailable(
  mechanic: MechanicId,
  questionType: QuestionTypeForMechanics | "quiz",
  hasTimer: boolean
): { available: boolean; reason?: string; extensible?: boolean } {
  // extensible power-ups — show as extensible UI
  if ((mechanic === "streakBonus" || mechanic === "speedBonus" || mechanic === "secondChance") && questionType === "quiz") {
    return { available: true, reason: "Extensible — backend will enforce when enabled." };
  }
  if (mechanic === "decayingPoints" && questionType === "quiz") {
    return { available: true, reason: "Quiz-wide setting — applies to all questions with marks." };
  }
  // quiz-wide: extraTime/freeze only if hasTimer
  if ((mechanic === "extraTime" || mechanic === "freezeTimer") && !hasTimer) {
    return { available: false, reason: "Only available for timed assessments." };
  }
  if (mechanic === "decayingPoints" && !hasTimer) {
    return { available: false, reason: "Decaying Points requires a timed assessment." };
  }
  if (questionType === "quiz") {
    return { available: true };
  }
  // per question rules
  switch (questionType) {
    case "single_choice":
    case "multiple_choice":
      if (mechanic === "extraTime" || mechanic === "freezeTimer") return hasTimer ? { available: true } : { available: false, reason: "Only available for timed assessments." };
      return { available: true };
    case "true_false":
      if (mechanic === "fiftyFifty") return { available: false, reason: "50:50 is unavailable for True / False (only 2 options)." };
      if (mechanic === "eliminateOne") return { available: false, reason: "Eliminate 1 is unavailable for True / False." };
      if (mechanic === "extraTime" || mechanic === "freezeTimer") return hasTimer ? { available: true } : { available: false, reason: "Only available for timed assessments." };
      return { available: true };
    case "match_following":
      if (mechanic === "fiftyFifty" || mechanic === "eliminateOne" || mechanic === "audiencePoll")
        return { available: false, reason: `${MECHANIC_META[mechanic].label} is unavailable for Match the Following questions.` };
      if (mechanic === "extraTime" || mechanic === "freezeTimer") return hasTimer ? { available: true } : { available: false, reason: "Only available for timed assessments." };
      return { available: true };
    case "fill_blanks":
    case "integer":
    case "text":
    case "paragraph":
      if (mechanic === "fiftyFifty" || mechanic === "eliminateOne" || mechanic === "audiencePoll")
        return { available: false, reason: `${MECHANIC_META[mechanic].label} is unavailable for this question type.` };
      if (mechanic === "extraTime" || mechanic === "freezeTimer") return hasTimer ? { available: true } : { available: false, reason: "Only available for timed assessments." };
      return { available: true };
    case "code_output":
      if (mechanic === "fiftyFifty" || mechanic === "eliminateOne" || mechanic === "audiencePoll" || mechanic === "doublePoints")
        return { available: false, reason: `${MECHANIC_META[mechanic].label} is unavailable for Coding questions.` };
      if (mechanic === "extraTime" || mechanic === "freezeTimer") return hasTimer ? { available: true } : { available: false, reason: "Only available for timed assessments." };
      return { available: true };
    default:
      return { available: true };
  }
}

export function getEnabledMechanicsSummary(cfg: GameMechanicsConfig): string[] {
  const out: string[] = [];
  if (cfg.fiftyFifty.enabled) out.push(cfg.fiftyFifty.uses === "unlimited" ? "50:50 · ∞" : `50:50 · ×${cfg.fiftyFifty.uses}`);
  if (cfg.audiencePoll.enabled) out.push(cfg.audiencePoll.uses === "unlimited" ? "Audience Poll · ∞" : `Audience Poll · ×${cfg.audiencePoll.uses}`);
  if (cfg.hint.enabled) out.push(cfg.hint.uses === "unlimited" ? "Hint · ∞" : `Hint · ×${cfg.hint.uses}`);
  if (cfg.skip.enabled) out.push(cfg.skip.uses === "unlimited" ? "Skip · ∞" : `Skip · ×${cfg.skip.uses}`);
  if (cfg.extraTime.enabled) out.push(`+${cfg.extraTime.seconds}s · ×${cfg.extraTime.uses === "unlimited" ? "∞" : cfg.extraTime.uses}`);
  if (cfg.doublePoints.enabled) out.push(cfg.doublePoints.uses === "unlimited" ? "2× Points · ∞" : `2× Points · ×${cfg.doublePoints.uses}`);
  if (cfg.freezeTimer.enabled) out.push(`${cfg.freezeTimer.duration}s Freeze · ×${cfg.freezeTimer.uses === "unlimited" ? "∞" : cfg.freezeTimer.uses}`);
  if (cfg.eliminateOne.enabled) out.push(cfg.eliminateOne.uses === "unlimited" ? "Eliminate 1 · ∞" : `Eliminate 1 · ×${cfg.eliminateOne.uses}`);
  if ((cfg as any).streakBonus?.enabled) out.push(`Streak · ×${(cfg as any).streakBonus.uses === "unlimited" ? "∞" : (cfg as any).streakBonus.uses}`);
  if ((cfg as any).speedBonus?.enabled) out.push(`Speed · ×${(cfg as any).speedBonus.uses === "unlimited" ? "∞" : (cfg as any).speedBonus.uses}`);
  if ((cfg as any).secondChance?.enabled) out.push(`Revive · ×${(cfg as any).secondChance.uses === "unlimited" ? "∞" : (cfg as any).secondChance.uses}`);
  if ((cfg as any).decayingPoints?.enabled) out.push(`Decay · -${(cfg as any).decayingPoints.decayPerSecond}pt/s`);
  return out;
}
