import type { UserProfile } from "@/store/authStore";
import type { CreatorProfile } from "@/components/creator/workspace/types";

function namedValue(value: UserProfile["country"]): string {
  if (typeof value === "string") return value;
  return value?.name || "";
}

/**
 * Build the Studio profile exclusively from authenticated user data.
 * Unknown creator-only fields stay empty until a backend endpoint provides
 * them; this intentionally avoids presenting sample data as the user's data.
 */
export function creatorProfileFromUser(user: UserProfile | null): CreatorProfile {
  const username = user?.username?.trim() || "creator";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const displayName = user?.displayName?.trim() || fullName || username;
  const location = [namedValue(user?.state), namedValue(user?.country)].filter(Boolean).join(", ");
  const preferredLanguage = user?.preferences?.preferredLanguage?.trim();
  const id = user?.id == null ? "" : String(user.id);

  return {
    id,
    creatorUsername: username,
    displayName,
    fullName: fullName || displayName,
    email: user?.email || "",
    phone: user?.mobile || "",
    location,
    website: "",
    bio: user?.bio || "",
    avatarUrl: user?.avatarUrl || null,
    role: user?.role === "organization" ? "Organization" : "Individual",
    verified: Boolean(user?.isVerified),
    verificationStatus: user?.isVerified ? "verified" : "required",
    publicProfileUrl: "/creator/profile/public",
    creatorId: id,
    createdAt: user?.createdAt || "",
    expertise: preferredLanguage ? [preferredLanguage] : [],
    subjects: [],
    exams: [],
    experienceYears: 0,
    qualifications: [],
    languages: preferredLanguage ? [preferredLanguage] : [],
    stats: {
      students: 0,
      tests: 0,
      series: 0,
      rating: 0,
      totalAttempts: 0,
      totalEarnings: 0,
      monthlyRevenue: 0,
    },
    socials: [],
  };
}
