import { BillingSubnav } from "@/components/creator/billing/BillingSubnav";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-20 sm:px-6">
      <BillingSubnav />
      <div className="space-y-6 pt-4">{children}</div>
    </div>
  );
}
