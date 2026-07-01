/**
 * DELETE /api/events/[id] — remove event from shared feed (admin only).
 */
import { NextResponse } from "next/server";
import { resolveViewerUserId } from "@/lib/auth-user";
import { deleteEvent } from "@/lib/events-service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await resolveViewerUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required to delete events", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const result = await deleteEvent(id, userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    const status = /admin privileges/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
