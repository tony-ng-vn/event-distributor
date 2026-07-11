/**
 * PATCH /api/events/[id]/type — admin sets primary_type (type_source=human).
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { setEventPrimaryType } from "@/lib/events-service";
import { isEventTypeId } from "@/lib/event-type-taxonomy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await requireApprovedViewerUserId(request);
    const { id } = await context.params;
    const body = (await request.json()) as { primaryType?: string };

    if (!isEventTypeId(body.primaryType)) {
      return NextResponse.json(
        { error: "primaryType must be a valid event type id" },
        { status: 400 },
      );
    }

    const event = await setEventPrimaryType(id, userId, body.primaryType);
    return NextResponse.json({ event });
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
    if (/admin privileges required/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (/not found/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
