/**
 * A signed-in user must have a discoverable way to reach /settings, and the
 * page there must render the notification settings.
 *
 * Clerk's UserButton mounts client-side, so we mock @clerk/nextjs. The mock
 * makes UserButton.Link emit a real anchor: this proves AuthButton wires
 * href="/settings" into the user menu (the entry point). Live rendering of the
 * dropdown by Clerk is not exercised here -- it is verified separately.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AuthButton } from "@/components/AuthControls";
import SettingsPage from "@/app/settings/page";

vi.mock("@clerk/nextjs", async () => {
  const { createElement: h } = await import("react");

  // Show renders its children only for the matching auth state.
  const Show = ({
    when,
    children,
  }: {
    when: string;
    children: React.ReactNode;
  }) => (when === "signed-in" ? h("div", null, children) : null);

  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);

  const UserButton = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);
  UserButton.MenuItems = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);
  UserButton.Action = Passthrough;
  UserButton.Link = ({ href, label }: { href: string; label: string }) =>
    h("a", { href }, label);

  // NotificationSettings reads useUser; unresolved auth keeps it in its
  // loading state, which still renders the notif-settings card.
  const useUser = () => ({ isLoaded: false, isSignedIn: false });

  return { Show, SignInButton: Passthrough, SignUpButton: Passthrough, UserButton, useUser };
});

describe("settings entry point", () => {
  it("gives a signed-in user a Settings control that targets /settings", () => {
    const html = renderToStaticMarkup(createElement(AuthButton));
    expect(html).toContain('href="/settings"');
    expect(html).toContain("Settings");
  });

  it("renders the notification settings on the /settings page", () => {
    const html = renderToStaticMarkup(createElement(SettingsPage));
    expect(html).toContain('data-testid="notif-settings"');
  });
});
