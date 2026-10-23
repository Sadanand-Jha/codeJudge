"use client";

import { use } from "react";
import StudentRoomView from "@/components/rooms/student/StudentRoomView";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudentRoomView roomId={id} />;
}
