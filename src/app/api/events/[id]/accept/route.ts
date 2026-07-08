/**
 * POST /api/events/[id]/accept — mark "I'm going" on the in-app guest list.
 *
 * Requires sign-in (Clerk -> InsForge User). Does NOT RSVP on Luma — that's separate.
 * Returns updated event JSON with the viewer in attendees.
 */
import { NextResponse } from "next/server";
import { resolveViewerUserId } from "@/lib/auth-user";
import { acceptEvent, unacceptEvent } from "@/lib/events-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await resolveViewerUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required to accept events", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const event = await acceptEvent(id, userId);
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Accept failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await resolveViewerUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required to remove interest", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const event = await unacceptEvent(id, userId);
    return NextResponse.json({ event });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Remove interest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
