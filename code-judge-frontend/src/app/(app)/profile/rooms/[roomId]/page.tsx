import RoomDetailsView from "@/components/rooms/RoomDetailsView";

export const metadata = { title: "Room · ByteClash" };

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <RoomDetailsView roomId={roomId} />;
}