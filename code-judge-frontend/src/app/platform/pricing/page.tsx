"use client";

import { PageHeader } from "@/components/platform/subpage-blocks";
import { PricingAdmin } from "@/components/platform/pricing/PricingAdmin";

export default function PlatformPricingPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Catalog"
        title="Pricing"
        detail="Manage monthly plans, credit packs, coupons and the public pricing copy. Drafts stay private until you publish."
      />
      <PricingAdmin />
    </div>
  );
}
