/**
 * POST /api/events/ingest — add an event URL to the shared feed (signed-in only).
 *
 * Body: { lumaUrl: string, preview?: boolean }
 *   preview: true  → fetch metadata only, don't save
 *   preview: false → create Event row in database
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { ingestLumaEvent, previewLumaIngest } from "@/lib/events-service";

export async function POST(request: Request) {
  try {
    const viewerUserId = await requireApprovedViewerUserId(request);
    const body = (await request.json()) as {
      lumaUrl?: string;
      preview?: boolean;
    };

    if (!body.lumaUrl?.trim()) {
      return NextResponse.json({ error: "lumaUrl is required" }, { status: 400 });
    }

    if (body.preview) {
      const preview = await previewLumaIngest(body.lumaUrl.trim());
      return NextResponse.json({
        preview: {
          ...preview,
          startAt: preview.startAt.toISOString(),
          endAt: preview.endAt.toISOString(),
        },
      });
    }

    const event = await ingestLumaEvent(body.lumaUrl.trim(), viewerUserId);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
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
    const status = message.includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
