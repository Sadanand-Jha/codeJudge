import { SITE_URL } from "@/lib/seo/site";
import { formatPasswordExpiry } from "@/utils/passwordExpiry";

export const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_INPUT_PATTERN = /^[A-Z0-9]{6}$/;

/** Normalize a room code for display/submission: trim, uppercase, max 6. */
export function normalizeRoomCodeInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCodeInput(value: string): boolean {
  return ROOM_CODE_INPUT_PATTERN.test(value);
}

/** Public app origin used in the WhatsApp message (NEXT_PUBLIC_APP_URL). */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || SITE_URL).replace(/\/+$/, "");
}

export interface RoomShareMessageInput {
  roomName: string;
  roomCode: string;
  password: string;
  appUrl?: string;
  /** Creator's @username, included so students know who invited them. */
  creatorUsername?: string | null;
  /**
   * ISO expiry for the password. Omit to keep the short message template;
   * pass null to state explicitly that the password never expires.
   */
  passwordExpiresAt?: string | null;
}

/**
 * One-tap join link. The password travels in the URL fragment (never the
 * query string) so it is not sent to servers or referrers. RoomJoinForm
 * prefills both fields, then removes the fragment from the address bar.
 */
export function buildRoomJoinLink({
  roomCode,
  password,
  appUrl = getAppUrl(),
}: {
  roomCode: string;
  password: string;
  appUrl?: string;
}): string {
  const origin = appUrl.replace(/\/+$/, "");
  const code = encodeURIComponent(roomCode.trim().toUpperCase());
  const secret = encodeURIComponent(password);
  return `${origin}/rooms?code=${code}#p=${secret}`;
}

/** Read the prefilled password from a share link's #p=... fragment. */
export function parseRoomInvitePassword(hash: string): string | null {
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const password = params.get("p") || params.get("password");
    if (!password || password.length > 128) return null;
    return password;
  } catch {
    return null;
  }
}

/**
 * Exact message students receive. Keep this in one place so the preview,
 * clipboard copy and WhatsApp link can never drift apart. The link carries
 * both the code and password; they are repeated below so the message still
 * works if a chat client strips the fragment.
 */
export function buildRoomShareMessage({
  roomName,
  roomCode,
  password,
  appUrl = getAppUrl(),
  creatorUsername,
  passwordExpiresAt,
}: RoomShareMessageInput): string {
  const joinLink = buildRoomJoinLink({ roomCode, password, appUrl });
  const teacherLine = creatorUsername?.trim()
    ? `\n👩‍🏫 Teacher: @${creatorUsername.trim().replace(/^@+/, "")}`
    : "";
  const expiryLine =
    passwordExpiresAt === undefined
      ? ""
      : passwordExpiresAt
        ? `\n⏳ Password valid till: ${formatPasswordExpiry(passwordExpiresAt)}`
        : "\n♾️ Password does not expire";
  return `🎒✨ *CLASS INVITE* ✨🎒
┏━━━━━━━━━━━━━━━━━━┓
   📚 *${roomName}*
┗━━━━━━━━━━━━━━━━━━┛${teacherLine}

🎟️ *YOUR ENTRY PASS*
🔑 Room code: *${roomCode}*
🔐 Password: *${password}*${expiryLine}

👇 *Tap to join in one tap*
${joinLink}

🚀 _See you inside!_ ✨`;
}

export function buildWhatsAppHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** Clipboard helper with a legacy fallback for browsers without the API. */
export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("Clipboard unavailable");
}
