"use client";

import { use } from "react";
import RoomJoinedView from "@/components/rooms/public/RoomJoinedView";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <RoomJoinedView roomId={id} />
    </div>
  );
}
