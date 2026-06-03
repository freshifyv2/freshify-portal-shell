"use client";

/**
 * ThemeToggle — topbar control for theme mode.
 *
 * Deploy 5.3 upgrades the toggle from a binary light↔dark switch to a
 * three-state cycle:
 *
 *   light  → dark  → system  → light …
 *
 * The icon reflects the *stored mode* (sun / moon / monitor) rather than
 * the resolved effective theme, so the user can always tell whether
 * they've pinned a preference or deferred to the OS.
 *
 * When `allowOverride` is false (operator locked theme), the toggle hides
 * itself entirely.
 */

import { useTheme, type ThemeMode } from "./ThemeProvider";

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

const IconMonitor = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
    <path d="M12 16v4" />
  </svg>
);

function iconFor(mode: ThemeMode) {
  if (mode === "light") return IconSun;
  if (mode === "dark") return IconMoon;
  return IconMonitor;
}

function nextMode(mode: ThemeMode): ThemeMode {
  if (mode === "light") return "dark";
  if (mode === "dark") return "system";
  return "light";
}

function labelFor(mode: ThemeMode): string {
  if (mode === "light") return "Theme: light. Click to switch to dark.";
  if (mode === "dark") return "Theme: dark. Click to follow system.";
  return "Theme: follow system. Click to switch to light.";
}

export function ThemeToggle() {
  const { mode, allowOverride, setMode } = useTheme();
  if (!allowOverride) return null;
  return (
    <button
      type="button"
      className="topbar-theme-toggle"
      aria-label={labelFor(mode)}
      title={labelFor(mode)}
      onClick={() => setMode(nextMode(mode))}
    >
      {iconFor(mode)}
    </button>
  );
}
