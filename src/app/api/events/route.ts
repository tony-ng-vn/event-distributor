/**
 * GET /api/events — returns the shared feed as JSON (signed-in friends only).
 */
import { NextResponse } from "next/server";
import {
  requireViewerUserId,
  resolveViewerIsAdmin,
} from "@/lib/auth-user";
import { listAllFeedEvents, listFeedEvents } from "@/lib/events-service";

export async function GET(request: Request) {
  try {
    const viewerUserId = await requireViewerUserId(request);
    const viewerIsAdmin = await resolveViewerIsAdmin(request);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    const events =
      scope === "all"
        ? await listAllFeedEvents(viewerUserId)
        : await listFeedEvents(viewerUserId);

    return NextResponse.json({ events, viewerIsAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = /sign in required/i.test(message) ? 401 : 400;
    return NextResponse.json({ error: message, code: "AUTH_REQUIRED" }, { status });
  }
}
