"use client";

import { Suspense, use } from "react";
import RoomDetailsView from "@/components/rooms/RoomDetailsView";

export default function RoomDetailsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  return (
    <Suspense fallback={null}>
      <RoomDetailsView roomId={roomId} basePath="/creator/rooms" />
    </Suspense>
  );
}
