/**
 * Integration tests for the waitlist access gate (InsForge).
 *
 * The gate is a single boolean on the user row: new sign-ups are pending and
 * see no event data until an admin approves them. The "waitlist" is just the
 * set of users still pending.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createUser, resetDatabase } from "@/lib/events-service";
import {
  approveUser,
  isUserApproved,
  listWaitlistUsers,
} from "@/lib/access-service";

describe("access service (waitlist gate)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("treats new users as pending and grandfathered users as approved", async () => {
    const pending = await createUser({
      email: "stranger@example.com",
      name: "Stranger",
    });
    const friend = await createUser({
      email: "friend@example.com",
      name: "Friend",
      approved: true,
    });

    expect(await isUserApproved(pending.id)).toBe(false);
    expect(await isUserApproved(friend.id)).toBe(true);
  });

  it("lists only pending users for admin review, oldest request first", async () => {
    await createUser({ email: "first@example.com", name: "First" });
    await createUser({
      email: "approved@example.com",
      name: "Approved",
      approved: true,
    });
    await createUser({ email: "second@example.com", name: "Second" });

    const waitlist = await listWaitlistUsers();
    expect(waitlist.map((u) => u.email)).toEqual([
      "first@example.com",
      "second@example.com",
    ]);
  });

  it("lets an admin approve a pending user and blocks non-admins", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const regular = await createUser({
      email: "regular@example.com",
      name: "Regular",
      approved: true,
    });
    const pending = await createUser({
      email: "pending@example.com",
      name: "Pending",
    });

    await expect(approveUser(regular.id, pending.id)).rejects.toThrow(/admin/i);
    expect(await isUserApproved(pending.id)).toBe(false);

    await approveUser(admin.id, pending.id);
    expect(await isUserApproved(pending.id)).toBe(true);
  });

  it("treats approving an already-approved user as a harmless no-op", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const member = await createUser({
      email: "member@example.com",
      name: "Member",
      approved: true,
    });

    await approveUser(admin.id, member.id);
    expect(await isUserApproved(member.id)).toBe(true);
  });
});
