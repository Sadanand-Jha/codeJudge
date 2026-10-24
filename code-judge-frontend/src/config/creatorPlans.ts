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
    id: "free",
    name: "Free",
    price: 0,
    quizzes: 2,
    rooms: 1,
    credits: 0,
    trialDays: 7,
    tagline: "Try the full quiz builder for 7 days.",
    features: [
      "Up to 2 quiz creations",
      "7-day free trial",
      "1 room",
      "Access codes and instant results",
      "Question bank and practice sets",
    ],
    cta: "Start free trial",
  },
  {
    id: "basic",
    name: "Basic",
    price: 99,
    originalPrice: 149,
    quizzes: 30,
    rooms: 5,
    credits: 20,
    offer: "Limited 2026 offer price",
    tagline: "For regular quizzes and assessments.",
    features: [
      "Up to 30 quiz creations",
      "Up to 5 rooms",
      "Everything in Free",
      "PDF and Word exports",
      "Email results to creator",
    ],
    cta: "Choose Basic",
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
