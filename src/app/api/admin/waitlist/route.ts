/**
 * GET /api/admin/waitlist — everyone still waiting for approval (admin only).
 * DELETE /api/admin/waitlist — remove a pending user from the waitlist (admin only).
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  requireViewer,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { deleteWaitlistUser, listWaitlistUsers } from "@/lib/access-service";

export async function GET(request: Request) {
  try {
    const { isAdmin } = await requireViewer(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 },
      );
    }

    const users = await listWaitlistUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = /sign in required/i.test(message) ? 401 : 400;
    return NextResponse.json(
      { error: message, code: "AUTH_REQUIRED" },
      { status },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUserId = await requireApprovedViewerUserId(request);
    const body = (await request.json()) as { userId?: string };

    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await deleteWaitlistUser(adminUserId, body.userId.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Removal failed";
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
    const status = /admin privileges/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
