"use client";

import { use } from "react";
import { TeacherProfile } from "@/components/tests/TeacherProfile";

export default function TeacherProfilePage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = use(params);
  return <TeacherProfile teacherId={teacherId} />;
}