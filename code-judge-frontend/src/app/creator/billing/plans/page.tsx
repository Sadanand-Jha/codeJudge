import { MonthlyPlansPage } from "@/components/creator/billing/MonthlyPlansPage";

export default async function MonthlyPlansRoute({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  return <MonthlyPlansPage initialPlanSlug={plan ?? null} />;
}
