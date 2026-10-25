export interface CreatorPlan {
  id: "free" | "basic" | "pro";
  name: string;
  price: number;
  originalPrice?: number;
  quizzes: number;
  rooms: number;
  credits: number;
  trialDays?: number;
  offer?: string;
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

export const CREATOR_PLANS: CreatorPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 99,
    originalPrice: 149,
    quizzes: 30,
    rooms: 5,
    credits: 20,
    trialDays: 7,
    offer: "Limited 2026 offer price",
    tagline: "For regular quizzes and assessments.",
    features: [
      "7-day quiz-only trial",
      "Up to 30 quiz creations",
      "Up to 5 rooms",
      "PDF and Word exports",
      "Email results to creator",
    ],
    cta: "Start 7-day free trial",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 199,
    originalPrice: 249,
    quizzes: 50,
    rooms: 5,
    credits: 50,
    offer: "Limited 2026 offer price",
    tagline: "For creators who run quizzes every week.",
    features: [
      "Up to 50 quiz creations",
      "Up to 5 rooms",
      "Everything in Basic",
      "No watermark or custom watermark",
      "Priority support",
    ],
    cta: "Choose Pro",
  },
];

export function getCreatorPlan(planId: string): CreatorPlan | undefined {
  return CREATOR_PLANS.find((plan) => plan.id === planId);
}

export function getCreatorPlanDiscount(plan: CreatorPlan): number {
  if (!plan.originalPrice || plan.originalPrice <= plan.price) return 0;
  return Math.round((1 - plan.price / plan.originalPrice) * 100);
}
