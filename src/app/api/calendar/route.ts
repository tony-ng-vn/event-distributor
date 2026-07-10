/**
 * /api/calendar -- manage the signed-in member's Luma calendar connection.
 *
 *   GET    -> { connection: { connected, syncedAt } }   (never returns the URL)
 *   POST   -> connect a Luma iCal subscription URL       body: { icalUrl }
 *   DELETE -> disconnect (nulls the stored URL)
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import {
  connectCalendar,
  disconnectCalendar,
  getCalendarConnection,
} from "@/lib/calendar-service";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
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
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    const userId = await requireApprovedViewerUserId(request);
    const connection = await getCalendarConnection(userId);
    return NextResponse.json({ connection });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireApprovedViewerUserId(request);
    const body = (await request.json()) as { icalUrl?: string };
    if (!body.icalUrl?.trim()) {
      return NextResponse.json({ error: "icalUrl is required" }, { status: 400 });
    }

    await connectCalendar(userId, body.icalUrl);
    const connection = await getCalendarConnection(userId);
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireApprovedViewerUserId(request);
    await disconnectCalendar(userId);
    return NextResponse.json({ connection: { connected: false, syncedAt: null } });
  } catch (error) {
    return errorResponse(error);
  }
}
