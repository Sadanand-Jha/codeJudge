export type Range = "7d" | "30d" | "90d";

export const RANGE_OPTIONS: ReadonlyArray<{ id: Range; label: string }> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
];

export interface TrendPoint {
  label: string;
  value: number;
}

export function buildTrend(
  base: number,
  weights: readonly number[],
  labels: readonly string[]
): TrendPoint[] {
  return labels.map((label, i) => ({
    label,
    value: Math.round(base * (weights[i] ?? 1)),
  }));
}