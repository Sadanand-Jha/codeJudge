import type { Metadata } from "next";
import StudentRoomsPage from "@/components/rooms/student/StudentRoomsPage";

export const metadata: Metadata = {
  title: "My Rooms",
  robots: { index: false, follow: false },
};

export default function MyRoomsPage() {
  return <StudentRoomsPage />;
}
