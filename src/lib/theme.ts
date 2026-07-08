/**
 * Light/dark theme resolution (pure logic; DOM/localStorage access lives in
 * ThemeToggle and the inline no-FOUC script in layout.tsx).
 *
 * An explicit user choice always wins over the OS preference. Until the user
 * makes a choice, the app follows prefers-color-scheme on every load.
 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "event-distributor-theme";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveInitialTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? "dark" : "light";
}
