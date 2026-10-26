import { buildPublicPageMetadata } from "@/lib/seo/site";
import { getPricingCatalogServer } from "@/services/pricing";
import { CheckoutView } from "@/components/pricing/CheckoutView";

export const metadata = buildPublicPageMetadata({
  title: "Checkout",
  description:
    "Securely purchase a QuizSupport credit pack. Choose your payment method, apply a coupon, and complete your one-time purchase.",
  path: "/checkout",
});

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { pack: packId } = await searchParams;
  const catalog = await getPricingCatalogServer();
  const packs = catalog.creditPacks;

  // Preselect the pack requested via ?pack=, otherwise fall back inside
  // CheckoutView (which defaults to the first available pack).
  const initialPackId =
    packId && packs.some((p) => p.id === packId) ? packId : packs[0]?.id ?? "";

  return (
    <div className="qs-ui qs-lp qco-page min-h-screen">
      <CheckoutView packs={packs} initialPackId={initialPackId} />
    </div>
  );
}
