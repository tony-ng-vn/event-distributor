/**
 * The settings page must render a discoverable, accessible theme switch.
 * ThemeToggle reads document.documentElement on mount (useEffect), which does
 * not run during a static server render -- renderToStaticMarkup only proves
 * the switch exists with its default (light) state and correct a11y wiring,
 * not the toggle interaction, which needs a real DOM.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "@/app/settings/page";

vi.mock("@clerk/nextjs", async () => {
  const { createElement: h } = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);
  // Unresolved auth keeps NotificationSettings in its loading state, which
  // still renders -- this test only cares about the sibling ThemeToggle.
  const useUser = () => ({ isLoaded: false, isSignedIn: false });
  return { SignInButton: Passthrough, useUser };
});

describe("theme toggle on the settings page", () => {
  it("renders an Appearance section with an accessible switch", () => {
    const html = renderToStaticMarkup(createElement(SettingsPage));

    expect(html).toContain('data-testid="theme-settings"');
    expect(html).toContain("Appearance");
    expect(html).toContain('data-testid="theme-toggle"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Dark mode"');
  });
});
