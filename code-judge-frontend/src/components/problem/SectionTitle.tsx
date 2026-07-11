"use client";

interface SectionTitleProps {
  children: React.ReactNode;
}

export default function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h2 className="mb-4 text-lg font-semibold text-zinc-100">{children}</h2>
  );
}