"use client";

/**
 * ThemeToggle \u2014 topbar button that flips between light and dark.
 *
 * Cycles light \u2192 dark on click. If user wants "system", they can use the
 * Portal Settings UI (operator) or browser dev tools \u2014 we keep the topbar
 * binary for speed. Long-press / shift-click is not handled.
 *
 * When `allowOverride` is false (operator locked theme), the toggle hides
 * itself entirely.
 */

import { useTheme } from "./ThemeProvider";

const IconSun = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const IconMoon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export function ThemeToggle() {
  const { effective, allowOverride, toggle } = useTheme();
  if (!allowOverride) return null;
  const isDark = effective === "dark";
  return (
    <button
      type="button"
      className="topbar-theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      onClick={toggle}
    >
      {isDark ? IconSun : IconMoon}
    </button>
  );
}
