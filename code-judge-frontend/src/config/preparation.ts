import {
  Compass,
  Route,
  Briefcase,
  Dumbbell,
  MessagesSquare,
  Building2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * Preparation information architecture
 * =====================================
 * Preparation is a first-class product area that orchestrates the student's
 * long-term journey (roadmaps, interviews, practice, companies, discussions,
 * progress) on top of the existing execution systems (Problems, Tests,
 * Contests). It never duplicates those systems — it references them.
 *
 * To add a new preparation module (e.g. "Resume", "Mock Exams"), append an
 * entry to `preparationModules`. The sidebar, overview quick-access grid and
 * page titles all derive from this list, so no core layout changes needed.
 */

export const PREPARATION_BASE = "/preparation";

export interface PreparationModule {
  /** Stable id used for keys / analytics */
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Icon gradient tone used by the workspace sidebar (profile-sidebar style) */
  tone: string;
  /** One-line description shown on the overview quick-access grid */
  description: string;
}

export const preparationModules: PreparationModule[] = [
  {
    id: "overview",
    label: "Overview",
    href: PREPARATION_BASE,
    icon: Compass,
    tone: "from-[#EC4899] to-[#8B5CF6]",
    description: "Your preparation dashboard — continue where you left off.",
  },
  {
    id: "roadmaps",
    label: "Roadmaps",
    href: `${PREPARATION_BASE}/roadmaps`,
    icon: Route,
    tone: "from-[#8B5CF6] to-[#6366F1]",
    description: "Structured learning paths organized by career goal.",
  },
  {
    id: "interviews",
    label: "Interviews",
    href: `${PREPARATION_BASE}/interviews`,
    icon: Briefcase,
    tone: "from-[#F59E0B] to-[#F97316]",
    description: "Practice questions, mock interviews and real experiences.",
  },
  {
    id: "practice",
    label: "Practice",
    href: `${PREPARATION_BASE}/practice`,
    icon: Dumbbell,
    tone: "from-[#22C55E] to-[#10B981]",
    description: "Today's plan across problems, tests and contests.",
  },
  {
    id: "discussions",
    label: "Discussions",
    href: `${PREPARATION_BASE}/discussions`,
    icon: MessagesSquare,
    tone: "from-[#3B82F6] to-[#06B6D4]",
    description: "Experiences, advice and strategies from the community.",
  },
  {
    id: "companies",
    label: "Companies",
    href: `${PREPARATION_BASE}/companies`,
    icon: Building2,
    tone: "from-[#06B6D4] to-[#3B82F6]",
    description: "Company-specific preparation tracks.",
  },
  {
    id: "progress",
    label: "Progress",
    href: `${PREPARATION_BASE}/progress`,
    icon: TrendingUp,
    tone: "from-[#FBBF24] to-[#F59E0B]",
    description: "Long-term analytics — how prepared am I?",
  },
];

export const isPreparationPath = (pathname: string): boolean =>
  pathname === PREPARATION_BASE || pathname.startsWith(`${PREPARATION_BASE}/`);

/** Resolve the active preparation module for a pathname (longest prefix wins). */
export const getActivePreparationModule = (pathname: string): PreparationModule | undefined =>
  [...preparationModules]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));

/** Legacy routes that now live inside the Preparation area. */
export const LEGACY_PREPARATION_ROUTES: { source: string; destination: string }[] = [
  { source: "/roadmaps", destination: `${PREPARATION_BASE}/roadmaps` },
  { source: "/roadmaps/:slug", destination: `${PREPARATION_BASE}/roadmaps/:slug` },
  { source: "/interview", destination: `${PREPARATION_BASE}/interviews` },
  { source: "/discussions", destination: `${PREPARATION_BASE}/discussions` },
];
