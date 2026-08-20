import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { TicketPercent } from "lucide-react";

export default function CouponsRoute() {
  return (
    <ComingSoon
      title="Coupons & Discounts"
      description="Create promo codes and flash discounts to drive more test purchases."
      icon={TicketPercent}
      accent="#F59E0B"
      features={[
        "Create and track promo codes",
        "Percent or flat discounts",
        "Usage limits and expiry",
        "Redemption analytics",
      ]}
    />
  );
}