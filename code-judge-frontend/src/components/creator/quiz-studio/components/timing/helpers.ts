export function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function toTimeString(d: Date): string {
  return d.toTimeString().slice(0, 5);
}

export function formatDateTime(date: string, time: string): string {
  if (!date) return "\u2014";
  const d = new Date(`${date}T${time || "00:00"}`);
  const datePart = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return time ? `${datePart} \u00b7 ${formatTime12(time)}` : datePart;
}

export function formatTime12(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60)
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
}

export function isPast(date: string, time: string): boolean {
  if (!date) return false;
  const target = new Date(`${date}T${time || "23:59"}`);
  return target.getTime() < Date.now();
}

export function isStartAfterEnd(
  sDate: string,
  sTime: string,
  eDate: string,
  eTime: string
): boolean {
  if (!sDate || !eDate) return false;
  const a = new Date(`${sDate}T${sTime || "00:00"}`);
  const b = new Date(`${eDate}T${eTime || "23:59"}`);
  return a.getTime() >= b.getTime();
}
