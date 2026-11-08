"use client";

import { useEffect, type PropsWithChildren } from "react";
import { useTheme } from "@/context/ThemeContext";

export function LandingPageShell({ children }: PropsWithChildren) {
  const { lockTheme, unlockTheme } = useTheme();

  useEffect(() => {
    lockTheme("light");
    return () => unlockTheme();
  }, [lockTheme, unlockTheme]);

  return (
    <div className="qs-ui qs-lp lpx landing-redesign">{children}</div>
  );
}
