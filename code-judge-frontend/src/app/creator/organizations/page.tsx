import { OrganizationsPage } from "@/components/creator/audience/OrganizationsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function OrganizationsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <OrganizationsPage demoState={demoStateFromParams(state)} />;
}