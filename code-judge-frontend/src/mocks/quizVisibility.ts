import {
  QuizVisibility,
  QuizVisibilityConfig,
  VisibilityOption,
  CollegeFilter,
  CompanyFilter,
  OrganizationFilter,
  ClassroomFilter,
  InviteInfo,
  ContestFilter,
  DiscoveryPermissions,
  Collaborator,
  AccessRestrictions,
  QuizSchedule,
} from "@/types/quiz";
import { getAvatarUrlById } from "@/config/dicebear";

export interface MockCollege {
  id: string;
  name: string;
  departments: string[];
}

export interface MockCompany {
  id: string;
  name: string;
  departments: string[];
}

export interface MockOrganization {
  id: string;
  name: string;
  type: "club" | "chapter" | "bootcamp";
}

export interface MockClassroom {
  id: string;
  name: string;
  batch: string;
  section: string;
  teacher: string;
}

export const visibilityOptions: VisibilityOption[] = [
  { id: "global", label: "Global", description: "Anyone on CodeJudge can discover and attempt this quiz.", icon: "Globe" },
  { id: "college_only", label: "College Only", description: "Only students from selected colleges can access this quiz.", icon: "GraduationCap" },
  { id: "company_only", label: "Company Only", description: "Only employees of selected companies can access this quiz.", icon: "Building2" },
  { id: "organization", label: "Organization / Club", description: "Only members of selected organizations can access this quiz.", icon: "Users" },
  { id: "classroom", label: "Classroom / Batch", description: "Only enrolled classroom members can access this quiz.", icon: "School" },
  { id: "unlisted", label: "Unlisted", description: "Quiz does not appear in search or feeds. Only users with the link can access it.", icon: "Link" },
  { id: "private", label: "Private", description: "Only the creator and invited collaborators can access this quiz.", icon: "Lock" },
  { id: "invite_only", label: "Invite Only", description: "Only invited users can access this quiz.", icon: "Mail" },
  { id: "contest_only", label: "Contest Only", description: "Only registered contest participants can access this quiz.", icon: "Trophy" },
];

export const mockColleges: MockCollege[] = [
  { id: "c1", name: "IIT Delhi", departments: ["Computer Science", "Electrical", "Mechanical", "Civil"] },
  { id: "c2", name: "IIT Bombay", departments: ["Computer Science", "Electrical", "Mechanical"] },
  { id: "c3", name: "NIT Trichy", departments: ["Computer Science", "ECE", "Mechanical"] },
  { id: "c4", name: "DTU", departments: ["Computer Science", "IT", "Electrical", "Mechanical"] },
  { id: "c5", name: "VIT", departments: ["Computer Science", "IT", "ECE"] },
  { id: "c6", name: "BITS Pilani", departments: ["Computer Science", "Electrical", "Mechanical"] },
];

export const mockCompanies: MockCompany[] = [
  { id: "co1", name: "Google", departments: ["Engineering", "Product", "Design", "Sales"] },
  { id: "co2", name: "Microsoft", departments: ["Engineering", "Product", "Research"] },
  { id: "co3", name: "Amazon", departments: ["Engineering", "Product", "Operations"] },
  { id: "co4", name: "Adobe", departments: ["Engineering", "Product", "Design"] },
  { id: "co5", name: "Atlassian", departments: ["Engineering", "Product", "Support"] },
  { id: "co6", name: "Goldman Sachs", departments: ["Engineering", "Finance", "Operations"] },
];

export const mockOrganizations: MockOrganization[] = [
  { id: "o1", name: "ACM Student Chapter", type: "chapter" },
  { id: "o2", name: "IEEE", type: "chapter" },
  { id: "o3", name: "Programming Club", type: "club" },
  { id: "o4", name: "Coding Ninjas Campus Club", type: "club" },
  { id: "o5", name: "Internal Bootcamp", type: "bootcamp" },
];

export const mockClassrooms: MockClassroom[] = [
  { id: "cl1", name: "CSE 3rd Year", batch: "2025", section: "A", teacher: "Dr. Smith" },
  { id: "cl2", name: "CSE 3rd Year", batch: "2025", section: "B", teacher: "Dr. Smith" },
  { id: "cl3", name: "Batch 2027", batch: "2027", section: "All", teacher: "Prof. Johnson" },
  { id: "cl4", name: "CP Batch", batch: "2025", section: "A", teacher: "Mr. Brown" },
  { id: "cl5", name: "DSA Weekend Batch", batch: "2025", section: "Weekend", teacher: "Ms. Davis" },
];

export const mockCollaborators: Collaborator[] = [
  { id: "col1", userId: "u1", username: "tourist", avatar: getAvatarUrlById(1), role: "owner", addedAt: "2024-01-01" },
  { id: "col2", userId: "u2", username: "benq", avatar: getAvatarUrlById(2), role: "admin", addedAt: "2024-01-02" },
  { id: "col3", userId: "u3", username: "petr", avatar: getAvatarUrlById(3), role: "editor", addedAt: "2024-01-03" },
];

export const defaultDiscoveryPermissions: DiscoveryPermissions = {
  view: true,
  attempt: true,
  comment: true,
  discuss: true,
  share: true,
  rate: true,
  bookmark: true,
  clone: false,
  edit: false,
};

export const defaultAccessRestrictions: AccessRestrictions = {
  verifiedEmail: false,
  verifiedCollege: false,
  verifiedCompany: false,
};

export const defaultSchedule: QuizSchedule = {};

export const mockContests = [
  { id: "contest1", name: "CodeClash 2025", participants: 1240 },
  { id: "contest2", name: "Winter Challenge", participants: 856 },
  { id: "contest3", name: "Campus Cup", participants: 2340 },
];

export function getDefaultVisibilityConfig(visibility: QuizVisibility): Partial<QuizVisibilityConfig> {
  const base = {
    visibility,
    discoveryPermissions: defaultDiscoveryPermissions,
    collaborators: [],
    restrictions: defaultAccessRestrictions,
    schedule: defaultSchedule,
  };

  switch (visibility) {
    case "college_only":
      return { ...base, collegeFilter: { collegeIds: [], departments: [], years: [], sections: [] } };
    case "company_only":
      return { ...base, companyFilter: { companyIds: [], departments: [], teams: [], roles: [] } };
    case "organization":
      return { ...base, organizationFilter: { organizationIds: [] } };
    case "classroom":
      return { ...base, classroomFilter: { classroomId: "" } };
    case "invite_only":
      return { ...base, inviteInfo: { invitedUsers: [] } };
    case "contest_only":
      return { ...base, contestFilter: { contestId: "" } };
    default:
      return base;
  }
}