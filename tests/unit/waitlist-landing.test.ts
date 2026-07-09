/**
 * The default page for a signed-out visitor is the waitlist signup: it leads
 * with a "Join the waitlist" call to action (Clerk sign-up, which captures the
 * person's info as a pending user), and offers sign-in as the secondary path
 * for members who have already been approved.
 *
 * Clerk's auth components mount client-side, so we mock @clerk/nextjs and just
 * assert the landing's own markup renders.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WaitlistLanding } from "@/components/AuthControls";

vi.mock("@clerk/nextjs", async () => {
  const { createElement: h } = await import("react");

  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);

  const Show = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);

  const UserButton = ({ children }: { children?: React.ReactNode }) =>
    h("div", null, children);
  UserButton.MenuItems = Passthrough;
  UserButton.Action = Passthrough;
  UserButton.Link = ({ href, label }: { href: string; label: string }) =>
    h("a", { href }, label);

  const useUser = () => ({ isLoaded: false, isSignedIn: false });

  return { Show, SignInButton: Passthrough, SignUpButton: Passthrough, UserButton, useUser };
});

describe("waitlist landing (signed-out default page)", () => {
  it("leads with joining the waitlist", () => {
    const html = renderToStaticMarkup(createElement(WaitlistLanding));
    expect(html).toContain('data-testid="waitlist-landing"');
    expect(html).toContain('data-testid="waitlist-join-button"');
    expect(html).toContain("Join the waitlist");
  });

  it("still offers sign-in for already-approved members", () => {
    const html = renderToStaticMarkup(createElement(WaitlistLanding));
    expect(html).toContain('data-testid="waitlist-signin-button"');
  });
});
