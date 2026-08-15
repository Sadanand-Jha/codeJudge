import AppLayout from "@/components/layout/AppLayout";
import AchievementsPage from "@/components/profile/AchievementsPage";

export const metadata = {
  title: "Achievements · ByteClash",
  description: "Milestones you've unlocked along your journey.",
};

export default function AchievementsRoute() {
  return (
    <AppLayout>
      <AchievementsPage />
    </AppLayout>
  );
}