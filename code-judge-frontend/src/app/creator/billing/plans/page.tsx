import { MonthlyPlansPage } from "@/components/creator/billing/MonthlyPlansPage";

export const metadata = {
  title: "Plans — Creator Studio",
};

export default async function MonthlyPlansRoute({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; price_id?: string }>;
}) {
  const { plan, price_id: priceId } = await searchParams;
  const parsedPriceId = priceId ? Number(priceId) : null;
  return (
    <MonthlyPlansPage
      initialPlanSlug={plan ?? null}
      initialPriceId={
        parsedPriceId !== null && Number.isSafeInteger(parsedPriceId) && parsedPriceId > 0
          ? parsedPriceId
          : null
      }
    />
  );
}
