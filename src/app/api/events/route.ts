/**
 * GET /api/events — returns all persisted shared feed events as JSON (approved friends only).
 */
import { NextResponse } from "next/server";
import { requireViewer, WAITLIST_PENDING_MESSAGE } from "@/lib/auth-user";
import { listFeedEvents } from "@/lib/events-service";

export async function GET(request: Request) {
  try {
    const { userId, isAdmin, approved } = await requireViewer(request);
    if (!approved) {
      return NextResponse.json(
        { error: WAITLIST_PENDING_MESSAGE, code: "WAITLIST_PENDING" },
        { status: 403 },
      );
    }

    const events = await listFeedEvents(userId);
    return NextResponse.json({ events, viewerIsAdmin: isAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const unauthorized = /sign in required/i.test(message);
    return NextResponse.json(
      unauthorized ? { error: message, code: "AUTH_REQUIRED" } : { error: message },
      { status: unauthorized ? 401 : 400 },
    );
  }
}
