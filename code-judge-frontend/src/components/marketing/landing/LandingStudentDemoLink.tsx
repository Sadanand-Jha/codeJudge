"use client";

import type { ReactNode } from "react";

export default function LandingStudentDemoLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      className={className}
      href="#student-demo"
      onClick={() => window.dispatchEvent(new Event("landing-student-demo"))}
    >
      {children}
    </a>
  );
}
