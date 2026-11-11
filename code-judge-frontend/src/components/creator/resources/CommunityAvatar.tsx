import { cn } from "@/lib/helpers";

const AVATAR_TONES = [
  "bg-[var(--qs-sun)] text-[var(--qs-ink)]",
  "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
  "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  "bg-[var(--qs-ink)] text-[var(--qs-sun)]",
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarTone(name: string): string {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

export function CommunityAvatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-ink)] font-extrabold tracking-[-0.02em]",
        avatarTone(name),
        size === "lg" &&
          "h-[60px] w-[60px] text-[22px] shadow-[2px_2px_0_var(--qs-ink)] sm:h-[72px] sm:w-[72px] sm:text-[26px] sm:shadow-[3px_3px_0_var(--qs-ink)]",
        size === "md" && "h-[54px] w-[54px] text-[19px]",
        size === "sm" && "h-9 w-9 border text-[12px]"
      )}
    >
      {src ? (
        <span
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
