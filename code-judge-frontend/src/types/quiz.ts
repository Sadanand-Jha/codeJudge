export type QuizVisibility =
  | "global"
  | "college_only"
  | "company_only"
  | "organization"
  | "classroom"
  | "unlisted"
  | "private"
  | "invite_only"
  | "contest_only";

export interface CollegeFilter {
  collegeIds: string[];
  departments: string[];
  years: string[];
  sections: string[];
  graduationBatch?: string;
}

export interface CompanyFilter {
  companyIds: string[];
  departments: string[];
  teams: string[];
  roles: string[];
  experienceLevel?: string;
}

export interface OrganizationFilter {
  organizationIds: string[];
}

export interface ClassroomFilter {
  classroomId: string;
  batch?: string;
  section?: string;
}

export interface InviteInfo {
  invitedUsers: Array<{ id: string; username: string; email?: string }>;
  inviteCode?: string;
}

export interface ContestFilter {
  contestId: string;
}

export type QuizPermission =
  | "view"
  | "attempt"
  | "comment"
  | "discuss"
  | "share"
  | "rate"
  | "bookmark"
  | "clone"
  | "edit";

export interface DiscoveryPermissions {
  view: boolean;
  attempt: boolean;
  comment: boolean;
  discuss: boolean;
  share: boolean;
  rate: boolean;
  bookmark: boolean;
  clone: boolean;
  edit: boolean;
}

export type CollaboratorRole = "owner" | "admin" | "editor" | "reviewer" | "moderator" | "viewer";

export interface Collaborator {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  role: CollaboratorRole;
  addedAt: string;
}

export type AccessRestriction =
  | "verified_email"
  | "verified_college"
  | "verified_company"
  | "invite_code"
  | "password"
  | "min_xp"
  | "min_rating"
  | "prerequisite_quiz"
  | "organization_member";

export interface AccessRestrictions {
  verifiedEmail: boolean;
  verifiedCollege: boolean;
  verifiedCompany: boolean;
  inviteCode?: string;
  password?: string;
  minXP?: number;
  minRating?: number;
  prerequisiteQuizId?: string;
  requiredOrganizationId?: string;
}

export interface QuizSchedule {
  visibleFrom?: string;
  visibleUntil?: string;
  registrationDeadline?: string;
  attemptWindow?: {
    start: string;
    end: string;
  };
}

export interface QuizVisibilityConfig {
  visibility: QuizVisibility;
  collegeFilter?: CollegeFilter;
  companyFilter?: CompanyFilter;
  organizationFilter?: OrganizationFilter;
  classroomFilter?: ClassroomFilter;
  inviteInfo?: InviteInfo;
  contestFilter?: ContestFilter;
  discoveryPermissions: DiscoveryPermissions;
  collaborators: Collaborator[];
  restrictions: AccessRestrictions;
  schedule: QuizSchedule;
}

export const DEFAULT_DISCOVERY_PERMISSIONS: DiscoveryPermissions = {
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

export const DEFAULT_ACCESS_RESTRICTIONS: AccessRestrictions = {
  verifiedEmail: false,
  verifiedCollege: false,
  verifiedCompany: false,
};

export const DEFAULT_SCHEDULE: QuizSchedule = {};

export interface VisibilityOption {
  id: QuizVisibility;
  label: string;
  description: string;
  icon: string;
}

// Student-facing types
export interface QuizQuestion {
  id: string;
  type: "single_choice" | "multiple_choice" | "true_false" | "text" | "code_output" | "complexity" | "debugging" | "matching" | "ordering" | "image_based";
  question: string;
  options?: string[];
  correctAnswer?: string | number | number[];
  explanation?: string;
  hint?: string;
  references?: string[];
  points: number;
  negativeMarks?: number;
  isBonus?: boolean;
  isMandatory?: boolean;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  estimatedTime?: number; // minutes
  topic?: string;
  subtopic?: string;
  tags: string[];
  randomizeOptions?: boolean;
  shuffleAnswers?: boolean;
  caseSensitive?: boolean;
  timeLimitPerQuestion?: number; // seconds
  codeLanguage?: string;
  matchingPairs?: Array<{ left: string; right: string }>;
  orderingItems?: string[];
}

export type QuestionStatus = "complete" | "incomplete" | "answered" | "unanswered";

// ===== Quiz Construction Studio Types =====

export type StudioQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "text"
  | "paragraph"
  | "fill_blanks"
  | "table_fill"
  | "code_output"
  | "complexity"
  | "debugging"
  | "matching"
  | "ordering"
  | "drag_drop"
  | "categorize"
  | "hotspot"
  | "image_based"
  | "math"
  | "graph"
  | "formula"
  | "image_label"
  | "drawing"
  | "video_response"
  | "audio_response"
  | "poll"
  | "word_cloud";

export type StudioDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

export interface StudioOption {
  id: string;
  label: string;
  content: string;
  isCorrect: boolean;
  imageUrl?: string;
  caption?: string;
}

export interface StudioReference {
  id: string;
  type: "book" | "article" | "video" | "pdf" | "documentation";
  title: string;
  url?: string;
  author?: string;
}

export interface StudioQuestion {
  id: string;
  type: StudioQuestionType;
  title: string;
  status: QuestionStatus;
  marks: number;
  negativeMarks: number;
  difficulty: StudioDifficulty;
  estimatedTime: number; // minutes
  tags: string[];
  topic?: string;
  subtopic?: string;
  visibility?: "visible" | "hidden";
  options: StudioOption[];
  correctAnswer: string | number | number[] | string[];
  explanation: string;
  hint?: string;
  references: StudioReference[];
  codeLanguage?: string;
  codeSnippet?: string;
  matchingPairs?: Array<{ id: string; left: string; right: string }>;
  orderingItems?: string[];
  randomizeOptions: boolean;
  caseSensitive: boolean;
  shuffleAnswers: boolean;
  timeLimitPerQuestion?: number; // seconds
  allowSkipping: boolean;
  isBonus: boolean;
  isMandatory: boolean;
  partialMarking: boolean;
  requireExplanation: boolean;
  images: Array<{ id: string; url: string; caption?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface QuizVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  label?: string;
  snapshot: {
    title: string;
    description: string;
    questions: StudioQuestion[];
  };
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface QuestionValidationResult {
  questionId: string;
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface PublishChecklistItem {
  id: string;
  label: string;
  description: string;
  passed: boolean;
}

export interface CollaboratorPresence {
  userId: string;
  username: string;
  avatar: string;
  currentlyEditing?: string; // question id
  lastActive: string;
}

export interface AIAssistantSuggestion {
  id: string;
  type: string;
  title: string;
  content: string;
  applied: boolean;
}

// ===== Quiz Dashboard Settings Types =====

export interface QuizGeneralSettings {
  name: string;
  description: string;
  thumbnail?: string;
  category?: string;
  tags: string[];
  language: string;
  creatorInfo?: {
    name: string;
    organization?: string;
  };
}

export interface QuizAssessmentSettings {
  duration: number; // minutes
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
  questionRandomization: boolean;
  optionRandomization: boolean;
  timePerQuestion?: number; // seconds
  practiceMode: boolean;
  autoSubmit: boolean;
}

export interface QuizAttemptSettings {
  attemptsAllowed: number;
  cooldownBetweenAttempts: number; // minutes
  retakeRules: "unlimited" | "limited" | "once";
  scoreMethod: "best" | "latest" | "highest";
  leaderboardMethod: "best" | "latest" | "highest";
}

export interface LifecycleSetting {
  enabled: boolean;
  maxUses: number;
  penalty: number; // XP or percentage
  description: string;
}

export interface QuizNavigationSettings {
  allowPrevious: boolean;
  allowNext: boolean;
  allowJumpToQuestion: boolean;
  allowReview: boolean;
  lockAfterAnswer: boolean;
  sequentialMode: boolean;
  freeNavigation: boolean;
}

export interface QuizVisibilitySettings {
  type: QuizVisibility;
  restrictions: {
    verifiedEmail: boolean;
    verifiedCollege: boolean;
    verifiedCompany: boolean;
    inviteCode?: string;
    password?: string;
    minXP?: number;
  };
}

export interface QuizSchedulingSettings {
  registrationOpens?: string;
  registrationCloses?: string;
  assessmentStarts?: string;
  assessmentEnds?: string;
  timezone: string;
  lateEntryPolicy: "allowed" | "blocked" | "penalty";
  lateEntryPenalty?: number;
}

export interface QuizScoringSettings {
  positiveMarks: number;
  negativeMarks: number;
  negativeMarkValue: number;
  partialMarking: boolean;
  bonusQuestions: boolean;
  mandatoryQuestions: boolean;
  weightage: boolean;
}

export interface QuizCertificateSettings {
  enabled: boolean;
  template?: string;
  minimumPassingPercentage: number;
  issueAutomatically: boolean;
}

export interface QuizLeaderboardSettings {
  enabled: boolean;
  showToParticipants: boolean;
  showTop10Only: boolean;
  showOnlyOwnRank: boolean;
  anonymousMode: boolean;
  hideUntilEnd: boolean;
  showAfterQuizEnds: boolean;
  showLiveDuringQuiz: boolean;
  showAfterAllSubmitted: boolean;
  realtimeRanking: boolean;
}

export interface QuizDiscussionSettings {
  enableComments: boolean;
  allowQuestions: boolean;
  moderation: boolean;
  anonymousDiscussions: boolean;
}

export interface QuizSecuritySettings {
  fullscreenMode: boolean;
  tabSwitchingDetection: boolean;
  copyProtection: boolean;
  pasteRestriction: boolean;
  devToolsDetection: boolean;
  ipRestriction: boolean;
  oneDeviceOnly: boolean;
}

export interface QuizNotificationSettings {
  reminderBeforeQuiz: boolean;
  resultPublished: boolean;
  registrationConfirmation: boolean;
  certificateReady: boolean;
  leaderboardUpdates: boolean;
}

export interface QuizAdvancedSettings {
  apiIntegrations: boolean;
  webhook?: string;
  customBranding: boolean;
  customCss: boolean;
  plugins: boolean;
  enterpriseSettings: boolean;
}

export interface QuizSettingsConfig {
  general: QuizGeneralSettings;
  assessment: QuizAssessmentSettings;
  attempts: QuizAttemptSettings;
  lifelines: Record<string, LifecycleSetting>;
  navigation: QuizNavigationSettings;
  visibility: QuizVisibilitySettings;
  scheduling: QuizSchedulingSettings;
  scoring: QuizScoringSettings;
  certificates: QuizCertificateSettings;
  leaderboard: QuizLeaderboardSettings;
  discussion: QuizDiscussionSettings;
  security: QuizSecuritySettings;
  notifications: QuizNotificationSettings;
  advanced: QuizAdvancedSettings;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  visibility: QuizVisibility;
  visibilityConfig: QuizVisibilityConfig;
  questions: QuizQuestion[];
  totalPoints: number;
  timeLimit?: number; // minutes
  attemptsAllowed: number;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  status: "upcoming" | "active" | "completed" | "expired";
  createdAt: string;
  startTime?: string;
  endTime?: string;
  attempts: number;
  registeredCount: number;
  averageScore: number;
  assessmentSettings?: AssessmentSettings;
  coverImage?: string;
  passingScore?: number;
  learningOutcomes?: string[];
  prerequisites?: string[];
  languagesSupported?: string[];
  certificateEligible?: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  username: string;
  startedAt: string;
  completedAt?: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeTaken: number; // seconds
  answers: Array<{
    questionId: string;
    answer: string | number;
    isCorrect: boolean;
    pointsEarned: number;
  }>;
  lifelinesUsed?: LifelineUsage[];
  timeLogs?: TimeLog[];
}

export interface QuizResult {
  attempt: QuizAttempt;
  rank?: number;
  totalParticipants: number;
  leaderboard?: Array<{
    rank: number;
    username: string;
    score: number;
    percentage: number;
  }>;
}

export type LifelineType = "fifty_fifty" | "hint" | "extra_time" | "skip" | "reveal_explanation" | "formula_sheet";

export interface LifelineUsage {
  type: LifelineType;
  used: boolean;
  usesRemaining: number;
}

export interface LifelineConfig {
  type: LifelineType;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  maxUses: number;
  penalty?: number; // percentage penalty per use
}

export interface AssessmentSettings {
  attemptsAllowed: number;
  passingScore: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  timeLimit?: number; // minutes
  canRevisit: boolean;
  enableLeaderboard: boolean;
  enableCertificate: boolean;
  enableDiscussion: boolean;
  enableBookmarks: boolean;
  practiceMode: boolean;
  lifelines: LifelineConfig[];
}

export interface QuizRegistration {
  id: string;
  quizId: string;
  userId: string;
  registeredAt: string;
  attemptsUsed: number;
  status: "registered" | "attempted" | "completed";
}

export interface QuizSession {
  id: string;
  attemptId: string;
  quizId: string;
  userId: string;
  startedAt: string;
  endTime: string;
  lifelinesUsed: LifelineUsage[];
  bookmarks: string[];
}

export interface TimeLog {
  questionId: string;
  timeSpent: number; // seconds
}

export const DEFAULT_ASSESSMENT_SETTINGS: AssessmentSettings = {
  attemptsAllowed: 3,
  passingScore: 40,
  negativeMarking: false,
  negativeMarkValue: 0,
  randomizeQuestions: false,
  randomizeOptions: false,
  timeLimit: 30,
  canRevisit: true,
  enableLeaderboard: true,
  enableCertificate: true,
  enableDiscussion: true,
  enableBookmarks: true,
  practiceMode: false,
  lifelines: [
    { type: "fifty_fifty", label: "50-50", description: "Removes two incorrect options", icon: "Target", enabled: true, maxUses: 1 },
    { type: "hint", label: "Hint", description: "Shows a creator-provided hint", icon: "Lightbulb", enabled: true, maxUses: 3 },
    { type: "extra_time", label: "+30s", description: "Adds extra time", icon: "Clock", enabled: true, maxUses: 1 },
    { type: "skip", label: "Skip", description: "Skip without penalty", icon: "SkipForward", enabled: false, maxUses: 0 },
    { type: "reveal_explanation", label: "Reveal Explanation", description: "Shows explanation immediately (Practice Mode)", icon: "Eye", enabled: false, maxUses: 0 },
    { type: "formula_sheet", label: "Formula Sheet", description: "Opens reference notes", icon: "FileText", enabled: false, maxUses: 0 },
  ],
};
