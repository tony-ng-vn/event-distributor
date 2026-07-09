/**
 * Route tests for GET/PATCH /api/admin/users. Auth + service layers mocked.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const requireViewer = vi.fn();
const requireApprovedViewerUserId = vi.fn();
const listProgramUsers = vi.fn();
const setUserAdmin = vi.fn();

vi.mock("@/lib/auth-user", () => ({
  requireViewer: (...args: unknown[]) => requireViewer(...args),
  requireApprovedViewerUserId: (...args: unknown[]) =>
    requireApprovedViewerUserId(...args),
  WAITLIST_PENDING_MESSAGE: "Your account is waiting for approval",
}));
vi.mock("@/lib/access-service", () => ({
  listProgramUsers: (...args: unknown[]) => listProgramUsers(...args),
  setUserAdmin: (...args: unknown[]) => setUserAdmin(...args),
}));

import { GET, PATCH } from "@/app/api/admin/users/route";

function req(method: string, body?: unknown) {
  return new Request("https://app.example.com/api/admin/users", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    requireViewer.mockReset();
    listProgramUsers.mockReset();
  });

  it("returns 403 for a signed-in non-admin", async () => {
    requireViewer.mockResolvedValue({ userId: "u1", isAdmin: false, approved: true });
    const response = await GET(req("GET"));
    expect(response.status).toBe(403);
    expect(listProgramUsers).not.toHaveBeenCalled();
  });

  it("returns 401 when signed out", async () => {
    requireViewer.mockRejectedValue(new Error("Sign in required to view events"));
    const response = await GET(req("GET"));
    expect(response.status).toBe(401);
  });

  it("returns 403 with WAITLIST_PENDING for an unapproved admin, without exposing the roster", async () => {
    requireViewer.mockResolvedValue({ userId: "u1", isAdmin: true, approved: false });
    const response = await GET(req("GET"));
    const data = await response.json();
    expect(response.status).toBe(403);
    expect(data.code).toBe("WAITLIST_PENDING");
    expect(listProgramUsers).not.toHaveBeenCalled();
  });

  it("returns the roster and viewer id for an admin", async () => {
    requireViewer.mockResolvedValue({ userId: "admin-1", isAdmin: true, approved: true });
    listProgramUsers.mockResolvedValue([{ id: "u1", email: "a@example.com" }]);
    const response = await GET(req("GET"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.viewerUserId).toBe("admin-1");
  });

  it("omits the AUTH_REQUIRED code for non-auth errors", async () => {
    requireViewer.mockResolvedValue({ userId: "admin-1", isAdmin: true, approved: true });
    listProgramUsers.mockRejectedValue(new Error("database unavailable"));
    const response = await GET(req("GET"));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.code).toBeUndefined();
  });
});

describe("PATCH /api/admin/users", () => {
  beforeEach(() => {
    requireApprovedViewerUserId.mockReset();
    setUserAdmin.mockReset();
  });

  it("returns 400 when userId is missing", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    const response = await PATCH(req("PATCH", { isAdmin: true }));
    expect(response.status).toBe(400);
    expect(setUserAdmin).not.toHaveBeenCalled();
  });

  it("returns 400 when isAdmin is not a boolean", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    const response = await PATCH(req("PATCH", { userId: "u2" }));
    expect(response.status).toBe(400);
    expect(setUserAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 when setUserAdmin rejects a self-demotion", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    setUserAdmin.mockRejectedValue(new Error("Cannot change your own admin status"));
    const response = await PATCH(req("PATCH", { userId: "admin-1", isAdmin: false }));
    expect(response.status).toBe(403);
  });

  it("promotes a user on the happy path", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    setUserAdmin.mockResolvedValue(undefined);
    const response = await PATCH(req("PATCH", { userId: "u2", isAdmin: true }));
    expect(response.status).toBe(200);
    expect(setUserAdmin).toHaveBeenCalledWith("admin-1", "u2", true);
  });
});
