/**
 * POST /api/events/[id]/accept — mark "I'm going" on the in-app guest list.
 *
 * Requires an approved (past-waitlist) viewer. Does NOT RSVP on Luma -- that's
 * separate. Returns updated event JSON with the viewer in attendees.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { acceptEvent, unacceptEvent } from "@/lib/events-service";

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

    const event = await acceptEvent(id, userId);
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Accept failed";
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

    const event = await unacceptEvent(id, userId);
    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Remove interest failed";
    return gateResponse(message) ?? NextResponse.json({ error: message }, { status: 400 });
  }
}
