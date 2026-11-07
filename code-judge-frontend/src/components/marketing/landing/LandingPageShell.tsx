import type { PropsWithChildren } from "react";

export function LandingPageShell({ children }: PropsWithChildren) {
  return <div className="qs-ui qs-lp lpx landing-redesign">{children}</div>;
}
