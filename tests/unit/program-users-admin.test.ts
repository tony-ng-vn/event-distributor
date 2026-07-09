import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgramUsersAdmin, type ProgramUserView } from "@/components/ProgramUsersAdmin";

const ADMIN: ProgramUserView = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Ada Admin",
  image: null,
  isAdmin: true,
  approved: true,
  createdAt: "2026-01-05T00:00:00.000Z",
  eventsCreatedCount: 3,
  rsvpCount: 5,
};

const PENDING: ProgramUserView = {
  id: "pending-1",
  email: "pending@example.com",
  name: null,
  image: null,
  isAdmin: false,
  approved: false,
  createdAt: "2026-02-10T00:00:00.000Z",
  eventsCreatedCount: 0,
  rsvpCount: 0,
};

function render(props: Partial<Parameters<typeof ProgramUsersAdmin>[0]>) {
  return renderToStaticMarkup(
    createElement(ProgramUsersAdmin, {
      users: [ADMIN, PENDING],
      loading: false,
      viewerUserId: null,
      pendingToggleId: null,
      pendingApproveId: null,
      onToggleAdmin: () => undefined,
      onApprove: () => undefined,
      ...props,
    }),
  );
}

/** Extract a specific <button>'s own opening tag by its data-testid, so
 * disabled-state assertions check the real attribute instead of a
 * substring window that can drift as nearby classes change. */
function buttonTag(html: string, testId: string): string {
  const marker = `data-testid="${testId}"`;
  const markerIndex = html.indexOf(marker);
  const tagStart = html.lastIndexOf("<button", markerIndex);
  const tagEnd = html.indexOf(">", markerIndex);
  return html.slice(tagStart, tagEnd + 1);
}

describe("ProgramUsersAdmin", () => {
  it("shows an Admin badge for admins and a Pending badge for unapproved users", () => {
    const html = render({});
    expect(html).toContain("Admin");
    expect(html).toContain("Pending");
  });

  it("falls back to email when name is null", () => {
    const html = render({});
    expect(html).toContain("pending@example.com");
  });

  it("shows event and RSVP counts", () => {
    const html = render({});
    expect(html).toContain("3 events");
    expect(html).toContain("5 RSVPs");
  });

  it("disables the toggle on the viewer's own row", () => {
    const html = render({ viewerUserId: "admin-1" });
    expect(buttonTag(html, "toggle-admin-admin-1")).toContain('disabled=""');
  });

  it("does not disable the toggle on other rows", () => {
    const html = render({ viewerUserId: "admin-1" });
    expect(buttonTag(html, "toggle-admin-pending-1")).not.toContain('disabled=""');
  });

  it("shows an Approve button on pending rows only", () => {
    const html = render({});
    expect(html).toContain('data-testid="approve-user-pending-1"');
    expect(html).not.toContain('data-testid="approve-user-admin-1"');
  });

  it("disables the Approve button while its approval is in flight", () => {
    const html = render({ pendingApproveId: "pending-1" });
    expect(buttonTag(html, "approve-user-pending-1")).toContain('disabled=""');
  });

  it("shows a loading state", () => {
    const html = render({ loading: true, users: null });
    expect(html).toContain("Loading users");
  });

  it("shows an empty state", () => {
    const html = render({ users: [] });
    expect(html).toContain("No users yet");
  });
});
