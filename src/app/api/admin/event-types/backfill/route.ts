/**
 * POST /api/admin/event-types/backfill — classify untyped events (admin only).
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  requireViewer,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { backfillUntypedEventTypes } from "@/lib/event-type-classifier";

export async function POST(request: Request) {
  try {
    const { isAdmin, approved } = await requireViewer(request);
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

    // Ensure approved admin id resolves (same gate as other admin mutations).
    await requireApprovedViewerUserId(request);

    const body = (await request.json().catch(() => ({}))) as {
      limit?: number;
    };
    const limit =
      typeof body.limit === "number" && body.limit > 0
        ? Math.min(200, Math.floor(body.limit))
        : 100;

    const result = await backfillUntypedEventTypes({ limit });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backfill failed";
    if (/sign in required/i.test(message)) {
      return NextResponse.json(
        { error: message, code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
