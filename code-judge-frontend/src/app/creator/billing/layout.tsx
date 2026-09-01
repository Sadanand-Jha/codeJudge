import { BillingSubnav } from "@/components/creator/billing/BillingSubnav";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <BillingSubnav />
      <div className="space-y-6 pt-4">{children}</div>
    </div>
  );
}
