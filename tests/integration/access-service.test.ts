/**
 * Integration tests for the waitlist access gate (InsForge).
 *
 * The gate is a single boolean on the user row: new sign-ups are pending and
 * see no event data until an admin approves them. The "waitlist" is just the
 * set of users still pending.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { acceptEvent, createUser, ingestLumaEvent, resetDatabase } from "@/lib/events-service";
import {
  approveUser,
  isUserApproved,
  listProgramUsers,
  listWaitlistUsers,
  setUserAdmin,
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

describe("program users roster", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists every user sorted by display name, falling back to email when name is null", async () => {
    await createUser({ email: "zack@example.com", name: "Zack" });
    await createUser({ email: "amy@example.com", name: "Amy" });
    await createUser({ email: "noname@example.com" });

    const users = await listProgramUsers();
    expect(users.map((u) => u.email)).toEqual([
      "amy@example.com",
      "noname@example.com",
      "zack@example.com",
    ]);
  });

  it("counts events created and RSVPs per user", async () => {
    const host = await createUser({ email: "host@example.com", name: "Host", approved: true });
    const guest = await createUser({ email: "guest@example.com", name: "Guest", approved: true });

    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup", host.id);
    await acceptEvent(event.id, guest.id);
    await acceptEvent(event.id, host.id);

    const users = await listProgramUsers();
    const hostRow = users.find((u) => u.id === host.id);
    const guestRow = users.find((u) => u.id === guest.id);

    expect(hostRow?.eventsCreatedCount).toBe(1);
    expect(hostRow?.rsvpCount).toBe(1);
    expect(guestRow?.eventsCreatedCount).toBe(0);
    expect(guestRow?.rsvpCount).toBe(1);
  });

  it("includes admin and approval status on each row", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const pending = await createUser({ email: "pending@example.com", name: "Pending" });

    const users = await listProgramUsers();
    expect(users.find((u) => u.id === admin.id)).toMatchObject({
      isAdmin: true,
      approved: true,
    });
    expect(users.find((u) => u.id === pending.id)).toMatchObject({
      isAdmin: false,
      approved: false,
    });
  });
});

describe("setUserAdmin", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lets an admin promote another user and blocks non-admins", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const regular = await createUser({ email: "regular@example.com", name: "Regular", approved: true });
    const target = await createUser({ email: "target@example.com", name: "Target", approved: true });

    await expect(setUserAdmin(regular.id, target.id, true)).rejects.toThrow(/admin/i);

    await setUserAdmin(admin.id, target.id, true);
    const users = await listProgramUsers();
    expect(users.find((u) => u.id === target.id)?.isAdmin).toBe(true);
  });

  it("lets an admin demote another admin", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const otherAdmin = await createUser({
      email: "other@example.com",
      name: "Other",
      isAdmin: true,
      approved: true,
    });

    await setUserAdmin(admin.id, otherAdmin.id, false);
    const users = await listProgramUsers();
    expect(users.find((u) => u.id === otherAdmin.id)?.isAdmin).toBe(false);
  });

  it("rejects an admin trying to change their own admin status", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });

    await expect(setUserAdmin(admin.id, admin.id, false)).rejects.toThrow(/own admin status/i);
    const users = await listProgramUsers();
    expect(users.find((u) => u.id === admin.id)?.isAdmin).toBe(true);
  });
});
