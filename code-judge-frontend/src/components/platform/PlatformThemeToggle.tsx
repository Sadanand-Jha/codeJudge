"use client";

import { useState } from "react";

/* QuizSupport spec: 42px square moon button that sets the data-theme
   attribute on the html element (light or dark). No localStorage —
   state lives in a JS variable for this prototype. */
export function PlatformThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" &&
    (document.documentElement.getAttribute("data-theme") === "light" ||
      window.matchMedia("(prefers-color-scheme: light)").matches)
      ? "light"
      : "dark"
  );

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.querySelector(".platform-shell")?.setAttribute("data-theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="btn sq"
      style={{ width: 42, height: 42 }}
    >
      <span aria-hidden="true">{theme === "dark" ? "◐" : "◑"}</span>
    </button>
  );
}

export function usePlatformThemeToggle() {
  return null;
}
