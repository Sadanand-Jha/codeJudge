import GuestGuard from "@/components/guards/GuestGuard";
import ContestsLanding from "./ContestsLanding";

export default function ContestsPage() {
  return (
    <GuestGuard action="join-contest">
      <ContestsLanding />
    </GuestGuard>
  );
}