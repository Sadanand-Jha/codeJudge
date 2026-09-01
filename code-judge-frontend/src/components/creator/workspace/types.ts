/**
 * Creator Workspace domain types.
 *
 * The creator workspace is the professional side of the platform — a mode that
 * reuses the same design language as the student experience while giving
 * educators a dedicated space for tests, audience, analytics, finance and
 * profile management. All data here is mock/fictional for frontend development.
 */

export type CreatorVerificationStatus = "verified" | "pending" | "required";

export interface CreatorProfile {
  id: string;
  creatorUsername: string;
  displayName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  bio: string;
  avatarUrl: string | null;
  role: "Individual" | "Organization";
  verified: boolean;
  verificationStatus: CreatorVerificationStatus;
  publicProfileUrl: string;
  creatorId: string;
  createdAt: string;

  // Professional information
  expertise: string[];
  subjects: string[];
  exams: string[];
  experienceYears: number;
  qualifications: string[];
  languages: string[];

  // Public profile stats
  stats: {
    students: number;
    tests: number;
    series: number;
    rating: number;
    totalAttempts: number;
    totalEarnings: number;
    monthlyRevenue: number;
  };

  socials: Array<{ label: string; url: string }>;
}

export type OrgMemberRole = "Owner" | "Admin" | "Teacher" | "Editor" | "Analyst";

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: OrgMemberRole;
  status: "Active" | "Invited";
  joinedAt: string;
  avatarUrl: string | null;
  permissions: Array<{
    id: string;
    label: string;
    enabled: boolean;
  }>;
}

export interface Organization {
  mode: "individual" | "organization";
  name: string;
  logo: string | null;
  tagline: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  state: string;
  city: string;
  gstStatus: "Not registered" | "Registered";
  gstin: string;
  businessType: string;
  foundedYear: string;
}

export interface VerificationSection {
  id: "identity" | "organization" | "payment" | "tax";
  label: string;
  description: string;
  status: "complete" | "pending" | "required";
  detail: string;
  updatedAt: string;
}

export type CreatorNotificationKind =
  | "sale"
  | "attempt"
  | "payout"
  | "refund"
  | "verification"
  | "feedback"
  | "weekly";

export interface CreatorNotification {
  id: string;
  kind: CreatorNotificationKind;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface CreatorActivityEvent {
  id: string;
  kind: "test" | "student" | "purchase" | "payout" | "refund" | "feedback" | "attempt";
  title: string;
  detail: string;
  time: string;
}

export interface CreatorDashboardMetric {
  id: string;
  label: string;
  value: number;
  display?: string;
  deltaPct: number;
  hint: string;
  accent: "primary" | "success" | "info" | "gold";
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface WelcomeChecklistItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  href: string;
}

export interface CreatorSettingsSection {
  id: string;
  label: string;
  description: string;
  rows: Array<{
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    kind: "toggle" | "link";
  }>;
}