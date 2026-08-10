/* ============================================
   ByteClash Pricing — Single Source of Truth
   The /pricing page renders ONLY from this config.
   Kept separate from config/aiCredits.ts (student/credit
   gating) so the student side and AI credit logic stay
   untouched. When payment/gating is wired to these plans,
   mirror the plan ids here.
   ============================================ */

export type TeacherPlanId = "free" | "teacher" | "teacher-pro" | "ai-pro";

export interface PricingFeature {
  text: string;
  /** Marks AI-powered features — rendered under the "AI-powered features" divider. */
  ai?: boolean;
  /** Highlight a headline metric (e.g. "2M AI credits / month"). */
  highlight?: boolean;
}

export interface TeacherPlan {
  id: TeacherPlanId;
  name: string;
  tagline: string;
  description: string;
  price: number;
  badge?: string;
  /** Soft visual accent — AI plan uses a subtle violet treatment. */
  accent?: "violet";
  ai?: boolean;
  cta: string;
  features: PricingFeature[];
  monthlyCredits?: number;
}

export const TEACHER_PLANS: TeacherPlan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For occasional quizzes",
    description: "Try ByteClash. No card required.",
    price: 0,
    cta: "Get Started",
    features: [
      { text: "Basic quiz creation" },
      { text: "Basic quiz results" },
      { text: "Basic rankings" },
      { text: "Basic question management" },
      { text: "Limited quiz usage" },
      { text: "Limited students per quiz" },
      { text: "Basic PDF export" },
    ],
  },
  {
    id: "teacher",
    name: "Teacher",
    tagline: "Run better assessments",
    description: "The most affordable serious upgrade.",
    price: 49,
    badge: "Best Value",
    cta: "Upgrade to Teacher",
    features: [
      { text: "Advanced results & rankings" },
      { text: "Question-wise analysis" },
      { text: "Student performance insights" },
      { text: "Question Bank" },
      { text: "Question randomization" },
      { text: "Professional PDF question papers" },
      { text: "Student-specific PDFs" },
      { text: "Certificates" },
      { text: "Excel / CSV exports" },
      { text: "Basic anti-cheat insights" },
      { text: "Increased quiz limits" },
      { text: "Up to 100 students per quiz" },
    ],
  },
  {
    id: "teacher-pro",
    name: "Teacher Pro",
    tagline: "Manage your classroom",
    description: "The natural choice for teachers who run quizzes regularly.",
    price: 99,
    badge: "Most Popular",
    cta: "Upgrade to Teacher Pro",
    features: [
      { text: "Everything in Teacher" },
      { text: "Up to 300 students per quiz" },
      { text: "Higher quiz limits" },
      { text: "Email results" },
      { text: "Bulk student reports" },
      { text: "Bulk certificates" },
      { text: "Advanced anti-cheat insights" },
      { text: "Student performance history" },
      { text: "Quiz-to-quiz comparison" },
      { text: "Complete report export" },
      { text: "Custom teacher/school branding" },
      { text: "Up to 3 collaborators" },
      { text: "Priority report generation" },
    ],
  },
  {
    id: "ai-pro",
    name: "AI Pro",
    tagline: "Create and manage with AI",
    description: "Everything in Teacher Pro, powered by AI.",
    price: 199,
    accent: "violet",
    ai: true,
    cta: "Upgrade to AI Pro",
    monthlyCredits: 2_000_000,
    features: [
      { text: "Everything in Teacher Pro" },
      { text: "AI Assistant", ai: true },
      { text: "AI quiz generation", ai: true },
      { text: "Generate quizzes from topics", ai: true },
      { text: "Generate quizzes from PDF", ai: true },
      { text: "Generate quizzes from PPT", ai: true },
      { text: "Generate quizzes from Word", ai: true },
      { text: "Generate quizzes from Excel / CSV", ai: true },
      { text: "Image / OCR question generation", ai: true },
      { text: "AI question improvement", ai: true },
      { text: "AI explanations", ai: true },
      { text: "AI distractor / option generation", ai: true },
      { text: "Change question difficulty with AI", ai: true },
      { text: "Generate question variations", ai: true },
      { text: "AI performance analysis", ai: true },
      { text: "AI coding assistant", ai: true },
      { text: "2M AI credits / month", ai: true, highlight: true },
    ],
  },
];

/** Feature text shown on a plan card. Keeps cards compact. */
export const PLAN_CARD_FEATURE_LIMIT: Record<TeacherPlanId, number> = {
  free: 7,
  teacher: 8,
  "teacher-pro": 9,
  "ai-pro": 9,
};

/* ---------------------------------- Comparison table ---------------------------------- */

export type PlanTierValue = boolean | string;

export interface ComparisonRow {
  label: string;
  values: Record<TeacherPlanId, PlanTierValue>;
}

export interface ComparisonCategory {
  label: string;
  rows: ComparisonRow[];
}

const yes = true;
const no = false;
const tier = { free: no, teacher: yes, "teacher-pro": yes, "ai-pro": yes };

export const COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    label: "Quiz Creation",
    rows: [
      { label: "Basic quiz creation", values: { free: yes, teacher: yes, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Question randomization", values: { free: no, teacher: yes, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Quiz limits", values: { free: "Limited", teacher: "Increased", "teacher-pro": "Higher", "ai-pro": "Higher" } },
      { label: "Generate quizzes with AI (topics, PDF, PPT, Word, Excel, Image)", values: { ...tier, free: no } },
    ],
  },
  {
    label: "Assessment",
    rows: [
      { label: "Results & rankings", values: { free: "Basic", teacher: "Advanced", "teacher-pro": "Advanced", "ai-pro": "Advanced" } },
      { label: "Certificates", values: { free: no, teacher: yes, "teacher-pro": "Bulk", "ai-pro": "Bulk" } },
      { label: "Email results", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Anti-cheat insights", values: { free: no, teacher: "Basic", "teacher-pro": "Advanced", "ai-pro": "Advanced" } },
    ],
  },
  {
    label: "Analytics",
    rows: [
      { label: "Question-wise analysis", values: tier },
      { label: "Student performance insights", values: tier },
      { label: "Student performance history", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Quiz-to-quiz comparison", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
      { label: "AI performance analysis", values: { free: no, teacher: no, "teacher-pro": no, "ai-pro": yes } },
    ],
  },
  {
    label: "Question Bank",
    rows: [
      { label: "Basic question management", values: { free: yes, teacher: yes, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Question Bank", values: { free: no, teacher: yes, "teacher-pro": yes, "ai-pro": yes } },
      { label: "AI question improvement", values: { free: no, teacher: no, "teacher-pro": no, "ai-pro": yes } },
      { label: "AI explanations & difficulty change", values: { free: no, teacher: no, "teacher-pro": no, "ai-pro": yes } },
    ],
  },
  {
    label: "PDF & Reports",
    rows: [
      { label: "PDF export", values: { free: "Basic", teacher: "Professional", "teacher-pro": "Professional", "ai-pro": "Professional" } },
      { label: "Student-specific PDFs", values: tier },
      { label: "Excel / CSV exports", values: tier },
      { label: "Bulk student reports", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Complete report export", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
      { label: "Priority report generation", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
    ],
  },
  {
    label: "Students",
    rows: [
      { label: "Students per quiz", values: { free: "Limited", teacher: "Up to 100", "teacher-pro": "Up to 300", "ai-pro": "Up to 300" } },
      { label: "Bulk certificates", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
    ],
  },
  {
    label: "Collaboration",
    rows: [
      { label: "Collaborators", values: { free: no, teacher: no, "teacher-pro": "Up to 3", "ai-pro": "Up to 3" } },
    ],
  },
  {
    label: "Branding",
    rows: [
      { label: "Custom teacher/school branding", values: { free: no, teacher: no, "teacher-pro": yes, "ai-pro": yes } },
    ],
  },
  {
    label: "AI",
    rows: [
      { label: "AI Assistant", values: { free: no, teacher: no, "teacher-pro": no, "ai-pro": yes } },
      { label: "AI quiz generation", values: { free: no, teacher: no, "teacher-pro": no, "ai-pro": yes } },
      { label: "AI question tooling", values: { free: no, teacher: no, "teacher-pro": no, "ai-pro": yes } },
      { label: "AI credits", values: { free: "—", teacher: "—", "teacher-pro": "—", "ai-pro": "2M / month" } },
    ],
  },
];

/* ---------------------------------- AI credits explainer ---------------------------------- */

export const AI_CREDITS_POINTS = [
  { title: "Included with AI Pro", text: "2M AI credits every month while your AI Pro subscription is active." },
  { title: "Purchased credits roll over", text: "Additional credits you buy stay available even after your subscription month ends." },
  { title: "AI usage consumes credits", text: "Every AI action — quiz generation, explanations, difficulty change — uses credits." },
  { title: "Buy more when needed", text: "Add credit packs any time from your AI Credits dashboard." },
];

/* ---------------------------------- Trust section ---------------------------------- */

export const TRUST_POINTS = [
  { title: "Save time creating assessments", text: "Professional question papers, PDFs and reports in minutes — not hours." },
  { title: "Understand student performance", text: "Question-wise analysis and insights that show exactly who needs help." },
  { title: "Generate professional reports", text: "Certificates, CSV exports and class-wide reports teachers can actually use." },
  { title: "Use AI when you need it", text: "Start free, upgrade when your assessments grow, add AI on your schedule." },
];

/* ---------------------------------- FAQ ---------------------------------- */

export interface Faq {
  q: string;
  a: string;
}

export const PRICING_FAQS: Faq[] = [
  {
    q: "What happens if I downgrade?",
    a: "You keep access to your current plan until the end of the paid period. After that, you'll be limited to the features of your new plan.",
  },
  {
    q: "Do unused AI credits expire?",
    a: "The 2M monthly credits included with AI Pro reset each billing month. Purchased credit packs remain available while your subscription stays active.",
  },
  {
    q: "Can I buy additional AI credits?",
    a: "Yes — credit packs can be purchased any time from the AI Credits dashboard or from the packs section on this page.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your subscription at any time and keep access for the remainder of the period you've already paid for.",
  },
  {
    q: "Can I use ByteClash without AI?",
    a: "Absolutely. Free, Teacher and Teacher Pro don't include AI. AI features are only part of the AI Pro plan.",
  },
  {
    q: "What is included in the ₹49 plan?",
    a: "Teacher adds advanced results & rankings, question-wise analysis, a Question Bank, professional PDF question papers, certificates and Excel/CSV exports — plus increased quiz limits and up to 100 students per quiz.",
  },
  {
    q: "What's the difference between ₹49 and ₹99?",
    a: "Teacher Pro adds bigger classes (up to 300 students), email results, bulk student reports and certificates, advanced anti-cheat insights, performance history, quiz-to-quiz comparison, custom branding, collaborators and priority report generation.",
  },
  {
    q: "What's included in AI Pro?",
    a: "Everything in Teacher Pro plus the full AI suite: AI quiz generation from topics, PDF, PPT, Word, Excel and images, AI question improvement and explanations, AI difficulty changes, AI performance analysis, an AI coding assistant, and 2M AI credits per month.",
  },
];
