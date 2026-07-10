/**
 * POST /api/events/[id]/star — pin the event to the viewer's personal Starred
 * section. DELETE removes the pin. Both require an approved (past-waitlist) viewer.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { starEvent, unstarEvent } from "@/lib/events-service";

function gateResponse(message: string) {
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
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await requireApprovedViewerUserId(request);

    await starEvent(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Star failed";
    return gateResponse(message) ?? NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await requireApprovedViewerUserId(request);

    await unstarEvent(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unstar failed";
    return gateResponse(message) ?? NextResponse.json({ error: message }, { status: 400 });
  }
}
