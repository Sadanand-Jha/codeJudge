"use client";

import HtmlRenderer from "@/components/common/HtmlRenderer";

interface ProblemDescriptionCardProps {
  title: string;
  content: string;
}

export default function ProblemDescriptionCard({ title, content }: ProblemDescriptionCardProps) {
  return (
    <div className="card-premium p-10">
      <h2 className="mb-6 text-2xl font-bold text-[#111827]">{title}</h2>
      <HtmlRenderer html={content} />
    </div>
  );
}