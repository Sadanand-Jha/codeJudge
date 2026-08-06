/**
 * Premium Waiting Room Theme System — Types
 */

export type WaitingRoomThemeId =
  | "deep-space"
  | "ai-cloud"
  | "cyber-city"
  | "floating-islands"
  | "ancient-temple"
  | "underwater"
  | "cherry-blossom"
  | "winter"
  | "volcano"
  | "hacker-matrix"
  | "fantasy-forest"
  | "space-station";

export type DynamicEventType =
  | "meteor-shower"
  | "northern-lights"
  | "fireworks"
  | "lightning"
  | "rainbow"
  | "passing-rocket"
  | "satellite"
  | "flying-dragon"
  | "whale-jump"
  | "bird-flock"
  | "fireflies";

export type AvatarMovementStyle =
  | "float"
  | "walk"
  | "swim"
  | "fly"
  | "drift"
  | "hover";

export interface WaitingRoomThemeConfig {
  id: WaitingRoomThemeId;
  name: string;
  description: string;
  icon: string;
  /** Primary gradient colors for UI accents */
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  /** Background gradient colors */
  bgGradient: [string, string, string];
  /** Avatar movement style in this environment */
  avatarMovement: AvatarMovementStyle;
  /** Whether avatars leave footprints/marks */
  leavesTraces: boolean;
  /** Trace color for footprints/marks */
  traceColor?: string;
  /** Ambient sound identifier (optional) */
  ambientSound?: string;
  /** Available dynamic events for this theme */
  availableEvents: DynamicEventType[];
  /** Theme pack category */
  pack: "galaxy" | "fantasy" | "cyber" | "nature" | "mythology" | "seasonal" | "halloween" | "christmas" | "new-year" | "free";
  /** Whether this is a premium (paid) theme */
  isPremium: boolean;
  /** Whether this theme is locked by default */
  lockedByDefault: boolean;
}

export interface WaitingRoomThemeState {
  /** Currently active theme */
  activeTheme: WaitingRoomThemeId;
  /** Whether the creator has locked the theme (students can't override) */
  themeLocked: boolean;
  /** Student's preferred theme override (if premium) */
  studentOverride?: WaitingRoomThemeId;
  /** Whether ambient sound is enabled */
  soundEnabled: boolean;
  /** Whether the student has premium access */
  hasPremium: boolean;
}

export interface DynamicEvent {
  id: string;
  type: DynamicEventType;
  /** When the event started (timestamp) */
  startedAt: number;
  /** Duration in seconds */
  duration: number;
  /** Intensity 0-1 */
  intensity: number;
}

export const DAILY_THEME_SCHEDULE: Record<number, WaitingRoomThemeId> = {
  0: "deep-space",        // Sunday
  1: "cherry-blossom",    // Monday
  2: "cyber-city",        // Tuesday
  3: "fantasy-forest",    // Wednesday
  4: "underwater",        // Thursday
  5: "winter",            // Friday
  6: "space-station",     // Saturday
};

export const THEME_CONFIGS: Record<WaitingRoomThemeId, WaitingRoomThemeConfig> = {
  "deep-space": {
    id: "deep-space",
    name: "Deep Space",
    description: "Journey through the cosmos with stars, nebulas, and shooting stars.",
    icon: "🌌",
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    accentColor: "#6366F1",
    bgGradient: ["#050510", "#0a0a1e", "#120b24"],
    avatarMovement: "float",
    leavesTraces: false,
    ambientSound: "space",
    availableEvents: ["meteor-shower", "northern-lights", "passing-rocket", "satellite"],
    pack: "galaxy",
    isPremium: false,
    lockedByDefault: false,
  },
  "ai-cloud": {
    id: "ai-cloud",
    name: "AI Cloud",
    description: "A bright, futuristic cloud workspace with floating glass elements.",
    icon: "☁️",
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    accentColor: "#3B82F6",
    bgGradient: ["#FFFFFF", "#FCFCFD", "#FAFBFF"],
    avatarMovement: "hover",
    leavesTraces: false,
    ambientSound: "wind",
    availableEvents: ["rainbow", "bird-flock"],
    pack: "free",
    isPremium: false,
    lockedByDefault: false,
  },
  "cyber-city": {
    id: "cyber-city",
    name: "Cyber City",
    description: "A neon-drenched futuristic city with flying vehicles and holograms.",
    icon: "🌃",
    primaryColor: "#A855F7",
    secondaryColor: "#22D3EE",
    accentColor: "#EC4899",
    bgGradient: ["#0a0a1a", "#1a0a2e", "#0a1a2e"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(34,211,238,0.2)",
    ambientSound: "cyber",
    availableEvents: ["lightning", "fireworks", "satellite"],
    pack: "cyber",
    isPremium: true,
    lockedByDefault: true,
  },
  "floating-islands": {
    id: "floating-islands",
    name: "Floating Islands",
    description: "Majestic floating islands with waterfalls, clouds, and sun rays.",
    icon: "🏔️",
    primaryColor: "#10B981",
    secondaryColor: "#3B82F6",
    accentColor: "#F59E0B",
    bgGradient: ["#87CEEB", "#B0E0E6", "#E0F7FA"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(16,185,129,0.15)",
    ambientSound: "wind",
    availableEvents: ["rainbow", "bird-flock", "flying-dragon"],
    pack: "nature",
    isPremium: true,
    lockedByDefault: true,
  },
  "ancient-temple": {
    id: "ancient-temple",
    name: "Ancient Temple",
    description: "Floating ruins with golden light, magic runes, and glowing symbols.",
    icon: "🏛️",
    primaryColor: "#F59E0B",
    secondaryColor: "#D97706",
    accentColor: "#FBBF24",
    bgGradient: ["#1a1206", "#2a1a0a", "#3a2a10"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(245,158,11,0.15)",
    ambientSound: "wind",
    availableEvents: ["fireworks", "flying-dragon"],
    pack: "mythology",
    isPremium: true,
    lockedByDefault: true,
  },
  underwater: {
    id: "underwater",
    name: "Underwater",
    description: "Dive into an ocean world with fish, coral reefs, and jellyfish.",
    icon: "🌊",
    primaryColor: "#0EA5E9",
    secondaryColor: "#06B6D4",
    accentColor: "#22D3EE",
    bgGradient: ["#0a2a4a", "#0a3a5a", "#0a4a6a"],
    avatarMovement: "swim",
    leavesTraces: true,
    traceColor: "rgba(14,165,233,0.15)",
    ambientSound: "ocean",
    availableEvents: ["whale-jump", "rainbow"],
    pack: "nature",
    isPremium: true,
    lockedByDefault: true,
  },
  "cherry-blossom": {
    id: "cherry-blossom",
    name: "Cherry Blossom",
    description: "Pink petals, trees, lanterns, and butterflies in soft sunlight.",
    icon: "🌸",
    primaryColor: "#F472B6",
    secondaryColor: "#EC4899",
    accentColor: "#F9A8D4",
    bgGradient: ["#FFF0F5", "#FFE4E1", "#FFDAB9"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(244,114,182,0.15)",
    ambientSound: "wind",
    availableEvents: ["bird-flock", "rainbow", "fireworks"],
    pack: "seasonal",
    isPremium: true,
    lockedByDefault: true,
  },
  winter: {
    id: "winter",
    name: "Winter",
    description: "Snow, ice, aurora, and a frozen lake under the northern lights.",
    icon: "❄️",
    primaryColor: "#60A5FA",
    secondaryColor: "#93C5FD",
    accentColor: "#BFDBFE",
    bgGradient: ["#0a1a2e", "#1a2a3e", "#2a3a4e"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(255,255,255,0.2)",
    ambientSound: "wind",
    availableEvents: ["northern-lights", "meteor-shower", "bird-flock"],
    pack: "seasonal",
    isPremium: true,
    lockedByDefault: true,
  },
  volcano: {
    id: "volcano",
    name: "Volcano",
    description: "Lava, ash, smoke, and fire particles with glowing rocks.",
    icon: "🌋",
    primaryColor: "#EF4444",
    secondaryColor: "#F97316",
    accentColor: "#FBBF24",
    bgGradient: ["#1a0a0a", "#2a0a0a", "#3a0a0a"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(239,68,68,0.2)",
    ambientSound: "wind",
    availableEvents: ["fireworks", "lightning"],
    pack: "nature",
    isPremium: true,
    lockedByDefault: true,
  },
  "hacker-matrix": {
    id: "hacker-matrix",
    name: "Hacker Matrix",
    description: "Green code rain, floating windows, and digital glitches.",
    icon: "💻",
    primaryColor: "#22C55E",
    secondaryColor: "#4ADE80",
    accentColor: "#86EFAC",
    bgGradient: ["#0a0a0a", "#0a1a0a", "#0a2a0a"],
    avatarMovement: "drift",
    leavesTraces: false,
    ambientSound: "cyber",
    availableEvents: ["lightning", "satellite"],
    pack: "cyber",
    isPremium: true,
    lockedByDefault: true,
  },
  "fantasy-forest": {
    id: "fantasy-forest",
    name: "Fantasy Forest",
    description: "Huge glowing trees, fireflies, fog, and magic particles.",
    icon: "🌲",
    primaryColor: "#10B981",
    secondaryColor: "#34D399",
    accentColor: "#A7F3D0",
    bgGradient: ["#0a1a0a", "#0a2a0a", "#0a3a0a"],
    avatarMovement: "walk",
    leavesTraces: true,
    traceColor: "rgba(16,185,129,0.15)",
    ambientSound: "forest",
    availableEvents: ["fireflies", "flying-dragon", "bird-flock"],
    pack: "fantasy",
    isPremium: true,
    lockedByDefault: true,
  },
  "space-station": {
    id: "space-station",
    name: "Space Station",
    description: "Wait inside a futuristic orbital station with Earth outside the window.",
    icon: "🚀",
    primaryColor: "#8B5CF6",
    secondaryColor: "#6366F1",
    accentColor: "#A78BFA",
    bgGradient: ["#0a0a1a", "#0a0a2a", "#0a0a3a"],
    avatarMovement: "float",
    leavesTraces: false,
    ambientSound: "space",
    availableEvents: ["passing-rocket", "satellite", "meteor-shower"],
    pack: "galaxy",
    isPremium: true,
    lockedByDefault: true,
  },
};

export const THEME_PACKS: Record<string, { name: string; icon: string; themes: WaitingRoomThemeId[] }> = {
  free: { name: "Free Themes", icon: "🎁", themes: ["deep-space", "ai-cloud"] },
  galaxy: { name: "Galaxy Pack", icon: "🌌", themes: ["deep-space", "space-station"] },
  fantasy: { name: "Fantasy Pack", icon: "🧙", themes: ["fantasy-forest", "floating-islands"] },
  cyber: { name: "Cyber Pack", icon: "🤖", themes: ["cyber-city", "hacker-matrix"] },
  nature: { name: "Nature Pack", icon: "🌿", themes: ["underwater", "volcano", "floating-islands"] },
  mythology: { name: "Mythology Pack", icon: "🏛️", themes: ["ancient-temple"] },
  seasonal: { name: "Seasonal Pack", icon: "🌸", themes: ["cherry-blossom", "winter"] },
};

export function getDailyTheme(date: Date = new Date()): WaitingRoomThemeId {
  return DAILY_THEME_SCHEDULE[date.getDay()];
}

export function getThemeConfig(id: WaitingRoomThemeId): WaitingRoomThemeConfig {
  return THEME_CONFIGS[id];
}