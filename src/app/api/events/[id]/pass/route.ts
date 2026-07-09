/**
 * POST /api/events/[id]/pass — hide event from the viewer's feed (cross-device).
 *
 * Requires an approved (past-waitlist) viewer. Anonymous users should use
 * client sessionStorage via FeedApp fallback.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { passEvent, unpassEvent } from "@/lib/events-service";

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

    await passEvent(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pass failed";
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

    await unpassEvent(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unpass failed";
    return gateResponse(message) ?? NextResponse.json({ error: message }, { status: 400 });
  }
}
