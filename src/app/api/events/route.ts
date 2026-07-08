/**
 * GET /api/events — returns all persisted shared feed events as JSON (signed-in friends only).
 */
import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth-user";
import { listFeedEvents } from "@/lib/events-service";

export async function GET(request: Request) {
  try {
    const { userId, isAdmin } = await requireViewer(request);
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
