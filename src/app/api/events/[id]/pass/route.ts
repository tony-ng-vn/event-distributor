/**
 * POST /api/events/[id]/pass — hide event from the viewer's feed (cross-device).
 *
 * Requires sign-in (Clerk → InsForge User). Anonymous users should use
 * client sessionStorage via FeedApp fallback.
 */
import { NextResponse } from "next/server";
import { resolveViewerUserId } from "@/lib/auth-user";
import { passEvent, unpassEvent } from "@/lib/events-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const userId = await resolveViewerUserId(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in required to sync passes", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    await passEvent(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pass failed";
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
        { error: "Sign in required to undo pass", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    await unpassEvent(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unpass failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
