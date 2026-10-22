export interface CreatorPlan {
  id: "free" | "basic" | "pro";
  name: string;
  price: number;
  quizzes: number;
  credits: number;
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
    quizzes: 5,
    credits: 0,
    tagline: "For trying your first quiz.",
    features: [
      "Up to 5 quiz creations",
      "Access codes and instant results",
      "Question bank and practice sets",
    ],
    cta: "Start free",
  },
  {
    id: "basic",
    name: "Basic",
    price: 99,
    quizzes: 30,
    credits: 20,
    tagline: "For regular classroom quizzes.",
    features: [
      "Up to 30 quiz creations",
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
    quizzes: 50,
    credits: 50,
    tagline: "For creators who run quizzes every week.",
    features: [
      "Up to 50 quiz creations",
      "Everything in Basic",
      "Live and scheduled quizzes",
      "Advanced analytics and priority support",
    ],
    cta: "Choose Pro",
  },
];

export function getCreatorPlan(planId: string): CreatorPlan | undefined {
  return CREATOR_PLANS.find((plan) => plan.id === planId);
}
