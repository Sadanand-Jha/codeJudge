import { ProductsPage } from "@/components/creator/billing/ProductsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function ProductsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <ProductsPage demoState={demoStateFromParams(state)} />;
}