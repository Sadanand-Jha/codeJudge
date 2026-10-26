"use client";

import "../platform/platform.css";
import { PageHeader } from "@/components/platform/subpage-blocks";
import { PricingAdmin } from "@/components/platform/pricing/PricingAdmin";

export default function DesignPreviewPage() {
  return (
    <div className="platform-shell qs-ui min-h-screen bg-[var(--qs-bg)] p-4 sm:p-6">
      <div className="mx-auto max-w-[1480px] space-y-4">
        <PageHeader
          eyebrow="Catalog"
          title="Pricing"
          detail="Manage monthly plans, credit packs, coupons and the public pricing copy. Drafts stay private until you publish."
        />
        <PricingAdmin />
      </div>
    </div>
  );
}
