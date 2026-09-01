"use client";

import { use } from "react";
import RoomDetailsView from "@/components/rooms/RoomDetailsView";

export default function RoomDetailsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <RoomDetailsView roomId={roomId} basePath="/creator/rooms" />
    </div>
  );
}
