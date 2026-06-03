"use client";

/**
 * ThemeProvider \u2014 Portal v3 Deploy 4 theme system.
 *
 * Three modes: "light" | "dark" | "system" (default).
 *
 * Source of truth, in order:
 *   1. localStorage "portal-theme" key (user override)
 *   2. cookie "portal-theme" (server-readable fallback)
 *   3. portal_settings.branding.defaultTheme (from operator config)
 *   4. system: media query (prefers-color-scheme: dark)
 *
 * The applied value is set on <html data-theme="..."> attribute. To avoid
 * a flash of wrong theme on first paint, we inject a tiny inline script via
 * the root layout that reads the cookie/localStorage before React hydrates.
 *
 * See lib/themeBootScript.ts for the inline bootstrap.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's stored preference (may be "system"). */
  mode: ThemeMode;
  /** The actually-applied theme after resolving "system". */
  effective: EffectiveTheme;
  /** Whether the operator allows individual users to override the default. */
  allowOverride: boolean;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystem(): EffectiveTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const ls = window.localStorage.getItem("portal-theme");
    if (ls === "light" || ls === "dark" || ls === "system") return ls;
  } catch {
    // localStorage unavailable (Safari private mode etc.)
  }
  // Cookie fallback
  const m = document.cookie.match(/(?:^|; )portal-theme=([^;]+)/);
  const v = m?.[1];
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function applyTheme(effective: EffectiveTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", effective);
}

interface ProviderProps {
  /** Server-resolved default from portal_settings (optional). */
  defaultMode?: ThemeMode;
  /** From portal_settings.branding.allowUserThemeOverride. */
  allowOverride?: boolean;
  children: React.ReactNode;
}

export function ThemeProvider({
  defaultMode = "system",
  allowOverride = true,
  children,
}: ProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [effective, setEffective] = useState<EffectiveTheme>("light");

  // Hydrate from storage on mount, then attach system-pref listener if mode==="system".
  useEffect(() => {
    const initial = allowOverride ? readStoredMode() : defaultMode;
    setModeState(initial);

    const resolve = () => {
      const next: EffectiveTheme = initial === "system" ? resolveSystem() : initial;
      setEffective(next);
      applyTheme(next);
    };
    resolve();

    if (initial === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const next: EffectiveTheme = mq.matches ? "dark" : "light";
        setEffective(next);
        applyTheme(next);
      };
      mq.addEventListener?.("change", handler);
      return () => mq.removeEventListener?.("change", handler);
    }
  }, [defaultMode, allowOverride]);

  const setMode = useCallback(
    (m: ThemeMode) => {
      if (!allowOverride) return;
      setModeState(m);
      try {
        window.localStorage.setItem("portal-theme", m);
      } catch {
        /* ignore */
      }
      // Cookie for SSR readability \u2014 1 year, lax-site.
      document.cookie = `portal-theme=${m}; path=/; max-age=31536000; SameSite=Lax`;
      const next: EffectiveTheme = m === "system" ? resolveSystem() : m;
      setEffective(next);
      applyTheme(next);
    },
    [allowOverride],
  );

  const toggle = useCallback(() => {
    setMode(effective === "dark" ? "light" : "dark");
  }, [effective, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, effective, allowOverride, setMode, toggle }),
    [mode, effective, allowOverride, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback no-op so consumers in non-provider contexts (tests) don't crash.
    return {
      mode: "system",
      effective: "light",
      allowOverride: false,
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Inline boot script to inject in <head> before hydration to prevent FOUC.
 * Place via <script dangerouslySetInnerHTML={{__html: THEME_BOOT_SCRIPT}} />.
 */
export const THEME_BOOT_SCRIPT = `
(function(){try{
  var ls=null;try{ls=localStorage.getItem('portal-theme')}catch(e){}
  var m=document.cookie.match(/(?:^|; )portal-theme=([^;]+)/);
  var v=ls||(m&&m[1])||'system';
  var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  var t=v==='dark'?'dark':v==='light'?'light':(d?'dark':'light');
  document.documentElement.setAttribute('data-theme',t);
}catch(e){}})();
`;
