export type Num = number | string | null | undefined;

export function toNumber(value: Num): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampPercent(value: Num): number {
  return Math.min(100, Math.max(0, toNumber(value)));
}

export function fmtSec(sec: Num): string {
  const s = Math.round(toNumber(sec));
  if (s <= 0) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export function fmtPercent(value: Num): string {
  return `${toNumber(value).toFixed(1)}%`;
}

export function cleanStatement(raw: string | null | undefined): string {
  if (!raw) return "Untitled question";
  let t = String(raw);
  t = t
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
  t = t.replace(/<[^>]*>/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 140) t = t.slice(0, 140) + "…";
  return t || "Untitled question";
}

export function prettyType(t: string | null | undefined): string {
  if (!t) return "—";
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function prettyEvent(t: string | null | undefined): string {
  if (!t) return "—";
  const key = t.toLowerCase();
  if (key === "fifty_fifty" || key === "fifty-fifty" || key === "50_50") return "50-50";
  if (key === "extra_time" || key === "extra-time") return "Extra time";
  return key.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}
