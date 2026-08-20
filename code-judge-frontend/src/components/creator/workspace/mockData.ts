/**
 * MOCK DATA — Creator Workspace
 *
 * Fictional but realistic sample data for the creator side of the platform.
 * Everything here is for frontend development only and should be replaced
 * with real API responses once the backend is wired up.
 */

import type {
  CreatorActivityEvent,
  CreatorDashboardMetric,
  CreatorNotification,
  CreatorProfile,
  CreatorSettingsSection,
  Organization,
  OrgMember,
  QuickAction,
  VerificationSection,
  WelcomeChecklistItem,
} from "./types";

/**
 * DEMO SWITCH — treat the signed-in user as a creator.
 * Flip to false to preview the non-creator ("Become a Creator") experience.
 */
export const IS_DEMO_CREATOR = true;

export const CREATOR_PROFILE: CreatorProfile = {
  id: "creator_1",
  creatorUsername: "aaravcodes",
  displayName: "Aarav Verma",
  fullName: "Aarav Verma",
  email: "aarav@byteclash.in",
  phone: "+91 98765 43210",
  location: "New Delhi, India",
  website: "aarav.byteshala.in",
  bio: "Competitive Programming & Computer Science educator. I break down complex concepts into simple, exam-ready lessons.",
  avatarUrl: null,
  role: "Individual",
  verified: true,
  verificationStatus: "verified",
  publicProfileUrl: "byteclash.in/@aaravcodes",
  creatorId: "CR-00217",
  createdAt: "Mar 2023",

  expertise: ["Competitive Programming", "Data Structures", "Physics"],
  subjects: ["Computer Science", "Physics", "Mathematics"],
  exams: ["JEE Main", "JEE Advanced", "NEET"],
  experienceYears: 6,
  qualifications: ["B.Tech, IIT Delhi", "M.Sc. Physics"],
  languages: ["English", "Hindi", "English + Hindi"],

  stats: {
    students: 1842,
    tests: 27,
    series: 12,
    rating: 4.8,
    totalAttempts: 9640,
    totalEarnings: 248650,
    monthlyRevenue: 64280,
  },

  socials: [
    { label: "YouTube", url: "youtube.com/@aaravcodes" },
    { label: "Telegram", url: "t.me/aaravcodes" },
    { label: "Instagram", url: "instagram.com/aaravcodes" },
  ],
};

export const ORGANIZATION: Organization = {
  mode: "individual",
  name: "Jha Learning Academy",
  tagline: "Competitive Exam Preparation",
  logo: null,
  description:
    "A group of educators preparing students for competitive exams with structured mock tests, chapter-wise practice and personalized feedback.",
  website: "jhalearning.in",
  email: "team@jhalearning.in",
  phone: "+91 90000 12345",
  address: "B-204, Green Park Extension, New Delhi",
  country: "India",
  state: "Delhi",
  city: "New Delhi",
  gstStatus: "Registered",
  gstin: "07AAHJL1234F1Z8",
  businessType: "Educational Services",
  foundedYear: "2023",
};

export const ORG_MEMBERS: OrgMember[] = [
  {
    id: "mem_1",
    name: "Aarav Verma",
    email: "aarav@byteclash.in",
    role: "Owner",
    status: "Active",
    joinedAt: "Mar 2023",
    avatarUrl: null,
    permissions: [
      { id: "create", label: "Create tests", enabled: true },
      { id: "edit", label: "Edit tests", enabled: true },
      { id: "publish", label: "Publish tests", enabled: true },
      { id: "students", label: "View students", enabled: true },
      { id: "analytics", label: "View analytics", enabled: true },
      { id: "revenue", label: "View revenue", enabled: true },
      { id: "billing", label: "Manage billing", enabled: true },
    ],
  },
  {
    id: "mem_2",
    name: "Meera Krishnan",
    email: "meera@jhalearning.in",
    role: "Admin",
    status: "Active",
    joinedAt: "Jun 2023",
    avatarUrl: null,
    permissions: [
      { id: "create", label: "Create tests", enabled: true },
      { id: "edit", label: "Edit tests", enabled: true },
      { id: "publish", label: "Publish tests", enabled: true },
      { id: "students", label: "View students", enabled: true },
      { id: "analytics", label: "View analytics", enabled: true },
      { id: "revenue", label: "View revenue", enabled: true },
      { id: "billing", label: "Manage billing", enabled: false },
    ],
  },
  {
    id: "mem_3",
    name: "Rahul Sharma",
    email: "rahul@jhalearning.in",
    role: "Teacher",
    status: "Active",
    joinedAt: "Sep 2023",
    avatarUrl: null,
    permissions: [
      { id: "create", label: "Create tests", enabled: true },
      { id: "edit", label: "Edit tests", enabled: true },
      { id: "publish", label: "Publish tests", enabled: false },
      { id: "students", label: "View students", enabled: true },
      { id: "analytics", label: "View analytics", enabled: false },
      { id: "revenue", label: "View revenue", enabled: false },
      { id: "billing", label: "Manage billing", enabled: false },
    ],
  },
  {
    id: "mem_4",
    name: "Priya Nair",
    email: "priya@jhalearning.in",
    role: "Editor",
    status: "Active",
    joinedAt: "Jan 2024",
    avatarUrl: null,
    permissions: [
      { id: "create", label: "Create tests", enabled: false },
      { id: "edit", label: "Edit tests", enabled: true },
      { id: "publish", label: "Publish tests", enabled: false },
      { id: "students", label: "View students", enabled: false },
      { id: "analytics", label: "View analytics", enabled: false },
      { id: "revenue", label: "View revenue", enabled: false },
      { id: "billing", label: "Manage billing", enabled: false },
    ],
  },
  {
    id: "mem_5",
    name: "Kabir Singh",
    email: "kabir@jhalearning.in",
    role: "Analyst",
    status: "Invited",
    joinedAt: "Aug 2026",
    avatarUrl: null,
    permissions: [
      { id: "create", label: "Create tests", enabled: false },
      { id: "edit", label: "Edit tests", enabled: false },
      { id: "publish", label: "Publish tests", enabled: false },
      { id: "students", label: "View students", enabled: true },
      { id: "analytics", label: "View analytics", enabled: true },
      { id: "revenue", label: "View revenue", enabled: true },
      { id: "billing", label: "Manage billing", enabled: false },
    ],
  },
];

export const VERIFICATION: VerificationSection[] = [
  {
    id: "identity",
    label: "Identity",
    description: "Government-issued ID and self-verification",
    status: "complete",
    detail: "PAN & Aadhaar verified",
    updatedAt: "Verified on 12 Mar 2023",
  },
  {
    id: "organization",
    label: "Organization",
    description: "Business identity and GST registration",
    status: "complete",
    detail: "GSTIN verified",
    updatedAt: "Verified on 3 Jul 2023",
  },
  {
    id: "payment",
    label: "Payment account",
    description: "Bank account for payouts",
    status: "complete",
    detail: "HDFC Bank •••• 4821",
    updatedAt: "Verified on 12 Mar 2023",
  },
  {
    id: "tax",
    label: "Tax information",
    description: "PAN and tax declaration on file",
    status: "pending",
    detail: "Annual tax declaration pending",
    updatedAt: "Due before 31 Dec 2026",
  },
];

export const CREATOR_NOTIFICATIONS: CreatorNotification[] = [
  { id: "cn_1", kind: "sale", title: "₹499 test purchase received", description: "Priya Nair bought JEE Main 2027 Mock Series", time: "12 min ago", read: false },
  { id: "cn_2", kind: "attempt", title: "Your test received 100 attempts", description: "JEE Physics Mock Test #4 hit 100 attempts today", time: "2 hr ago", read: false },
  { id: "cn_3", kind: "payout", title: "Your payout was processed", description: "₹25,075 sent to HDFC Bank •••• 4821", time: "5 hr ago", read: false },
  { id: "cn_4", kind: "verification", title: "Your verification is complete", description: "Identity and organization verified ✓", time: "1 day ago", read: true },
  { id: "cn_5", kind: "refund", title: "Refund of ₹199 completed", description: "Sneha Patel — JEE Physics Mock Test #4", time: "1 day ago", read: true },
  { id: "cn_6", kind: "feedback", title: "New test feedback", description: "4.8 ★ — 'Really close to the real exam pattern'", time: "2 days ago", read: true },
];

export const DASHBOARD_METRICS: CreatorDashboardMetric[] = [
  { id: "tests", label: "Tests Created", value: 27, deltaPct: 12.5, hint: "3 added this month", accent: "primary" },
  { id: "students", label: "Total Students", value: 1842, deltaPct: 18.4, hint: "118 new this month", accent: "info" },
  { id: "attempts", label: "Total Attempts", value: 9640, deltaPct: 9.2, hint: "across all tests", accent: "primary" },
  { id: "earnings", label: "Total Earnings", value: 248650, deltaPct: 18.4, hint: "lifetime net earnings", accent: "gold" },
  { id: "month", label: "This Month's Revenue", value: 64280, deltaPct: 12.8, hint: "Aug 1 — Aug 20", accent: "success" },
];

export const CREATOR_ACTIVITY: CreatorActivityEvent[] = [
  { id: "act_1", kind: "purchase", title: "Priya Nair purchased JEE Main 2027 Mock Series", detail: "₹499 · UPI", time: "12 min ago" },
  { id: "act_2", kind: "test", title: "You created 'JEE Physics Mock Test #5'", detail: "Draft saved · 40 questions", time: "3 hr ago" },
  { id: "act_3", kind: "attempt", title: "100 attempts on JEE Physics Mock Test #4", detail: "Peak hour: 6–8 PM", time: "4 hr ago" },
  { id: "act_4", kind: "payout", title: "Payout of ₹25,075 processed", detail: "HDFC Bank •••• 4821", time: "5 hr ago" },
  { id: "act_5", kind: "student", title: "Kabir Singh joined as Analyst", detail: "Invitation accepted", time: "1 day ago" },
  { id: "act_6", kind: "refund", title: "Refund of ₹199 completed", detail: "Sneha Patel — duplicate purchase", time: "1 day ago" },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "qa_1", label: "Create Test", description: "Build a new mock test", href: "/creator/tests/create" },
  { id: "qa_2", label: "Create Quiz", description: "Quick interactive assessment", href: "/creator/quizzes/create" },
  { id: "qa_3", label: "Create Test Series", description: "Bundle tests together", href: "/creator/series/create" },
  { id: "qa_4", label: "Create Problem", description: "Add to your question bank", href: "/creator/problems/create" },
  { id: "qa_5", label: "Import Questions", description: "Bulk add to your bank", href: "/creator/question-bank" },
  { id: "qa_6", label: "View Earnings", description: "Finance & payouts", href: "/creator/billing" },
];

export const WELCOME_CHECKLIST: WelcomeChecklistItem[] = [
  { id: "wc_1", label: "Create your first test", detail: "Publish a mock test for students", done: false, href: "/creator/tests/create" },
  { id: "wc_2", label: "Add questions to your bank", detail: "Build up your reusable library", done: true, href: "/creator/question-bank" },
  { id: "wc_3", label: "Set up your public profile", detail: "Help students find you", done: true, href: "/creator/profile" },
  { id: "wc_4", label: "Invite your first students", detail: "Grow your audience", done: false, href: "/creator/invitations" },
  { id: "wc_5", label: "Complete your verification", detail: "Unlock payouts & tax reporting", done: false, href: "/creator/verification" },
];

export const SETTINGS_SECTIONS: CreatorSettingsSection[] = [
  {
    id: "account",
    label: "Account",
    description: "Your login and security basics",
    rows: [
      { id: "acc_name", label: "Show my real name on tests", description: "Display your full name as the test author", enabled: true, kind: "toggle" },
      { id: "acc_email", label: "Email me for login alerts", description: "A security email when a new device signs in", enabled: true, kind: "toggle" },
      { id: "acc_2fa", label: "Two-factor authentication", description: "Extra security for your creator account", enabled: true, kind: "toggle" },
    ],
  },
  {
    id: "creator",
    label: "Creator",
    description: "How you appear as an educator",
    rows: [
      { id: "cr_vis", label: "Public profile visible", description: "Students can view your public creator page", enabled: true, kind: "toggle" },
      { id: "cr_dm", label: "Allow direct messages", description: "Students can message you about tests", enabled: true, kind: "toggle" },
      { id: "cr_review", label: "Allow reviews", description: "Students can rate and review your tests", enabled: true, kind: "toggle" },
      { id: "cr_show_stats", label: "Show earnings on profile", description: "Display total students and tests publicly", enabled: false, kind: "toggle" },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "What we send you",
    rows: [
      { id: "nt_purchase", label: "New purchase", description: "When a student buys your test", enabled: true, kind: "toggle" },
      { id: "nt_student", label: "New student", description: "When a new student enrolls", enabled: true, kind: "toggle" },
      { id: "nt_submission", label: "Test submission", description: "When a student submits a test", enabled: true, kind: "toggle" },
      { id: "nt_feedback", label: "Test feedback", description: "When a student leaves feedback", enabled: true, kind: "toggle" },
      { id: "nt_payout", label: "Payout", description: "When a payout is initiated", enabled: true, kind: "toggle" },
      { id: "nt_refund", label: "Refund", description: "When a refund is requested", enabled: true, kind: "toggle" },
      { id: "nt_weekly", label: "Weekly analytics", description: "A Monday morning performance summary", enabled: false, kind: "toggle" },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "What students can see about you",
    rows: [
      { id: "pv_public", label: "Public profile", description: "Anyone on the platform can view your page", enabled: true, kind: "toggle" },
      { id: "pv_students", label: "Student visibility", description: "Students see your name on purchased tests", enabled: true, kind: "toggle" },
      { id: "pv_leaderboard", label: "Leaderboard visibility", description: "Show your creator rank on leaderboards", enabled: false, kind: "toggle" },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    description: "Company and team settings",
    rows: [
      { id: "og_company", label: "Operate as organization", description: "Publish under your company instead of your name", enabled: false, kind: "toggle" },
      { id: "og_members", label: "Allow members to publish", description: "Team members can publish tests on your behalf", enabled: true, kind: "toggle" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Payments and payouts",
    rows: [
      { id: "fn_auto_payout", label: "Automatic payouts", description: "Withdraw earnings automatically on schedule", enabled: false, kind: "toggle" },
      { id: "fn_tax", label: "Apply platform tax statements", description: "Generate monthly tax statements", enabled: true, kind: "toggle" },
      { id: "fn_email_receipts", label: "Email receipts", description: "Send receipts for every payout", enabled: true, kind: "toggle" },
    ],
  },
];