import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { Trophy } from "lucide-react";

export default function CreatorLeaderboardRoute() {
  return (
    <ComingSoon
      title="Creator Leaderboard"
      description="See how your tests rank among other creators on ByteClash by earnings, students and engagement."
      icon={Trophy}
      accent="#F59E0B"
      features={[
        "Weekly & monthly rankings",
        "Earnings and engagement leaderboards",
        "Compare with top creators",
        "Rewards for top performers",
      ]}
    />
  );
}