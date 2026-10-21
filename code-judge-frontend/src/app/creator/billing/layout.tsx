import { BillingSubnav } from "@/components/creator/billing/BillingSubnav";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 pb-20 sm:px-6">
      <BillingSubnav />
      <div className="space-y-5 pt-3">{children}</div>
    </div>
  );
}
