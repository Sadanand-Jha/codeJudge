import { useState, useCallback } from "react";
import {
  QuizVisibility,
  QuizVisibilityConfig,
  DiscoveryPermissions,
  Collaborator,
  AccessRestrictions,
  QuizSchedule,
  CollegeFilter,
  CompanyFilter,
  OrganizationFilter,
  ClassroomFilter,
  InviteInfo,
  ContestFilter,
} from "@/types/quiz";
import {
  visibilityOptions,
  getDefaultVisibilityConfig,
  mockColleges,
  mockCompanies,
  mockOrganizations,
  mockClassrooms,
  mockContests,
} from "./quizVisibility";

const emptyCollegeFilter: CollegeFilter = { collegeIds: [], departments: [], years: [], sections: [] };
const emptyCompanyFilter: CompanyFilter = { companyIds: [], departments: [], teams: [], roles: [] };
const emptyOrganizationFilter: OrganizationFilter = { organizationIds: [] };
const emptyClassroomFilter: ClassroomFilter = { classroomId: "" };
const emptyInviteInfo: InviteInfo = { invitedUsers: [] };
const emptyContestFilter: ContestFilter = { contestId: "" };

export function useQuizVisibility(initialVisibility: QuizVisibility = "global") {
  const [visibility, setVisibility] = useState<QuizVisibility>(initialVisibility);
  const [collegeFilter, setCollegeFilter] = useState<CollegeFilter>(emptyCollegeFilter);
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>(emptyCompanyFilter);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilter>(emptyOrganizationFilter);
  const [classroomFilter, setClassroomFilter] = useState<ClassroomFilter>(emptyClassroomFilter);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo>(emptyInviteInfo);
  const [contestFilter, setContestFilter] = useState<ContestFilter>(emptyContestFilter);
  const [discoveryPermissions, setDiscoveryPermissions] = useState<DiscoveryPermissions>({
    view: true,
    attempt: true,
    comment: true,
    discuss: true,
    share: true,
    rate: true,
    bookmark: true,
    clone: false,
    edit: false,
  });
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [restrictions, setRestrictions] = useState<AccessRestrictions>({
    verifiedEmail: false,
    verifiedCollege: false,
    verifiedCompany: false,
  });
  const [schedule, setSchedule] = useState<QuizSchedule>({});

  const updateVisibility = useCallback((newVisibility: QuizVisibility) => {
    setVisibility(newVisibility);
    const defaults = getDefaultVisibilityConfig(newVisibility);
    if (defaults.collegeFilter) setCollegeFilter(defaults.collegeFilter as CollegeFilter);
    if (defaults.companyFilter) setCompanyFilter(defaults.companyFilter as CompanyFilter);
    if (defaults.organizationFilter) setOrganizationFilter(defaults.organizationFilter as OrganizationFilter);
    if (defaults.classroomFilter) setClassroomFilter(defaults.classroomFilter as ClassroomFilter);
    if (defaults.inviteInfo) setInviteInfo(defaults.inviteInfo as InviteInfo);
    if (defaults.contestFilter) setContestFilter(defaults.contestFilter as ContestFilter);
  }, []);

  const config: QuizVisibilityConfig = {
    visibility,
    collegeFilter: visibility === "college_only" ? collegeFilter : undefined,
    companyFilter: visibility === "company_only" ? companyFilter : undefined,
    organizationFilter: visibility === "organization" ? organizationFilter : undefined,
    classroomFilter: visibility === "classroom" ? classroomFilter : undefined,
    inviteInfo: visibility === "invite_only" ? inviteInfo : undefined,
    contestFilter: visibility === "contest_only" ? contestFilter : undefined,
    discoveryPermissions,
    collaborators,
    restrictions,
    schedule,
  };

  const reset = useCallback(() => {
    setVisibility("global");
    setCollegeFilter(emptyCollegeFilter);
    setCompanyFilter(emptyCompanyFilter);
    setOrganizationFilter(emptyOrganizationFilter);
    setClassroomFilter(emptyClassroomFilter);
    setInviteInfo(emptyInviteInfo);
    setContestFilter(emptyContestFilter);
    setDiscoveryPermissions({
      view: true,
      attempt: true,
      comment: true,
      discuss: true,
      share: true,
      rate: true,
      bookmark: true,
      clone: false,
      edit: false,
    });
    setCollaborators([]);
    setRestrictions({
      verifiedEmail: false,
      verifiedCollege: false,
      verifiedCompany: false,
    });
    setSchedule({});
  }, []);

  return {
    visibility,
    setVisibility: updateVisibility,
    config,
    updateVisibility,
    collegeFilter,
    setCollegeFilter,
    companyFilter,
    setCompanyFilter,
    organizationFilter,
    setOrganizationFilter,
    classroomFilter,
    setClassroomFilter,
    inviteInfo,
    setInviteInfo,
    contestFilter,
    setContestFilter,
    discoveryPermissions,
    setDiscoveryPermissions,
    collaborators,
    setCollaborators,
    restrictions,
    setRestrictions,
    schedule,
    setSchedule,
    reset,
  };
}

export { visibilityOptions, mockColleges, mockCompanies, mockOrganizations, mockClassrooms, mockContests };