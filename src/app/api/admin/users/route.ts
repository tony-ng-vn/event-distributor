/**
 * GET /api/admin/users -- full user roster with admin/approval status and
 * activity counts (admin only).
 * PATCH /api/admin/users -- promote or demote a user's admin flag (admin only).
 * Approving pending sign-ups stays on /api/admin/waitlist -- this route does
 * not touch the `approved` column.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  requireViewer,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { listProgramUsers, setUserAdmin } from "@/lib/access-service";

export async function GET(request: Request) {
  try {
    const { userId, isAdmin, approved } = await requireViewer(request);
    if (!approved) {
      return NextResponse.json(
        { error: WAITLIST_PENDING_MESSAGE, code: "WAITLIST_PENDING" },
        { status: 403 },
      );
    }
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 },
      );
    }

    const users = await listProgramUsers();
    return NextResponse.json({ users, viewerUserId: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = /sign in required/i.test(message) ? 401 : 400;
    if (status === 401) {
      return NextResponse.json(
        { error: message, code: "AUTH_REQUIRED" },
        { status },
      );
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUserId = await requireApprovedViewerUserId(request);
    const body = (await request.json()) as {
      userId?: string;
      isAdmin?: boolean;
    };

    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (typeof body.isAdmin !== "boolean") {
      return NextResponse.json(
        { error: "isAdmin must be a boolean" },
        { status: 400 },
      );
    }

    await setUserAdmin(adminUserId, body.userId.trim(), body.isAdmin);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (message === WAITLIST_PENDING_MESSAGE) {
      return NextResponse.json(
        { error: message, code: "WAITLIST_PENDING" },
        { status: 403 },
      );
    }
    if (/sign in required/i.test(message)) {
      return NextResponse.json(
        { error: message, code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    const status = /admin privileges|own admin status/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
