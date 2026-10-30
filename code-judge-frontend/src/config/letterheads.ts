import type { HeaderConfig } from "@/types/letterhead";

export const LETTERHEAD_MAX_PER_USER = 4;
export const LETTERHEAD_MAX_BYTES = 10 * 1024 * 1024;
export const LETTERHEAD_MIN_RECOMMENDED_WIDTH = 1200;

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  cropTop: 0,
  cropHeight: 0.18,
  widthPct: 1,
  offsetXmm: 0,
  offsetYmm: 15,
  align: "center",
  repeatOnAllPages: false,
};

export const HEADER_LIMITS = {
  cropTop: { min: 0, max: 0.9 },
  cropHeight: { min: 0.05, max: 0.4 },
  widthPct: { min: 0.3, max: 1 },
  offsetXmm: { min: -40, max: 40 },
  offsetYmm: { min: 0, max: 60 },
} as const;
