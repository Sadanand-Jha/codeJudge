import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { UserPlus } from "lucide-react";

export default function CreatorInvitationsRoute() {
  return (
    <ComingSoon
      title="Invitations"
      description="Invite students to your tests and series with shareable links and promotional codes."
      icon={UserPlus}
      accent="#10B981"
      features={[
        "Shareable test links",
        "Promotional coupon codes",
        "Invite by email",
        "Track invite conversions",
      ]}
    />
  );
}