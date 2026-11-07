import { CreatorDashboardPage } from "@/components/creator/dashboard/CreatorDashboardPage";

export const metadata = {
  title: "Dashboard — Creator Studio",
};

export default async function CreatorDashboardRoute() {
  return <CreatorDashboardPage />;
}
