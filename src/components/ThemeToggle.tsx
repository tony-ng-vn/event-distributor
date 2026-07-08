/**
 * Appearance section of the settings page: dark/light theme switch.
 *
 * The inline script in layout.tsx already resolved and applied data-theme on
 * <html> before this component mounts (OS preference, or a stored explicit
 * choice) -- this component reads that attribute rather than recomputing it,
 * so the switch always reflects what is actually on screen.
 */
"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function readAppliedTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readAppliedTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can throw in private browsing; the choice still applies to
      // this tab via the DOM attribute, it just won't persist across reloads.
    }
  }

  const isDark = theme === "dark";

  return (
    <div className="glass-card rounded-2xl p-6" data-testid="theme-settings">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Dark mode</p>
          <p className="mt-1 text-sm text-muted">
            Matches your device by default until you choose one here.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label="Dark mode"
          onClick={toggle}
          data-testid="theme-toggle"
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
            isDark ? "bg-foreground" : "bg-black/20"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isDark ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
