"use client";

import { use } from "react";
import RoomDetailsView from "@/components/rooms/RoomDetailsView";

export default function RoomDetailsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
      <RoomDetailsView roomId={roomId} basePath="/creator/rooms" />
    </div>
  );
}
