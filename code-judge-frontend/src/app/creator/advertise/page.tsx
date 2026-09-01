import { AdvertisePage } from "@/components/creator/advertise/AdvertisePage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function AdvertiseRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <AdvertisePage demoState={demoStateFromParams(state)} />;
}
