/**
 * DELETE /api/events/[id] — remove event from shared feed (admin only).
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { deleteEvent } from "@/lib/events-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await requireApprovedViewerUserId(request);

    const result = await deleteEvent(id, userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
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
