/**
 * POST /api/admin/waitlist/approve — let a pending user into the app (admin only).
 *
 * Body: { userId: string }. approveUser enforces the admin check itself.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { approveUser } from "@/lib/access-service";

export async function POST(request: Request) {
  try {
    const adminUserId = await requireApprovedViewerUserId(request);
    const body = (await request.json()) as { userId?: string };

    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await approveUser(adminUserId, body.userId.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
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
