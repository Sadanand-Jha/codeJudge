import { buildPublicPageMetadata } from "@/lib/seo/site";
import { getPricingCatalogServer } from "@/services/pricing";

export async function generateMetadata() {
  const catalog = await getPricingCatalogServer();
  const paidPlans = catalog.plans.filter((plan) => plan.price > 0);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const planNames = paidPlans.map((plan) => plan.name).join(" and ");
  const offer = paidPlans.find((plan) => plan.offer)?.offer;
  const trialCopy = trialPlan
    ? ` Start with a ${trialPlan.trialDays}-day quiz-only ${trialPlan.name} trial.`
    : "";
  const planCopy = planNames
    ? ` ${planNames} include monthly AI credits${offer ? ` at the ${offer.toLowerCase()}` : ""}.`
    : "";

  return buildPublicPageMetadata({
    title: "Pricing",
    description: `Compare QuizSupport monthly plans for creating, hosting and organising online quizzes.${trialCopy}${planCopy}`,
    path: "/pricing",
  });
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
