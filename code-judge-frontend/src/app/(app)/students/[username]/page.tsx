import type { Metadata } from "next";
import PublicStudentProfile from "@/components/profile/PublicStudentProfile";

export const metadata: Metadata = {
  title: "Student Profile",
  description: "View a QuizSupport student's public profile.",
};

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicStudentProfile username={username} />;
}
