/**
 * GET /api/events — returns the shared feed as JSON.
 *
 * Optional: if viewer is signed in (Clerk), each event includes viewerAccepted.
 * Anonymous users still see the feed; they just can't Accept without signing in.
 */
import { NextResponse } from "next/server";
import { resolveViewerIsAdmin, resolveViewerUserId } from "@/lib/auth-user";
import { listAllFeedEvents, listFeedEvents } from "@/lib/events-service";

export async function GET(request: Request) {
  const viewerUserId = await resolveViewerUserId(request);
  const viewerIsAdmin = await resolveViewerIsAdmin(request);
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  const events =
    scope === "all"
      ? await listAllFeedEvents(viewerUserId)
      : await listFeedEvents(viewerUserId);

  return NextResponse.json({ events, viewerIsAdmin });
}
