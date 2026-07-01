/**
 * POST /api/events/ingest — add a Luma URL to the shared feed.
 *
 * Body: { lumaUrl: string, preview?: boolean }
 *   preview: true  → fetch metadata only, don't save
 *   preview: false → create Event row in database
 *
 * Anyone can ingest today; addedByUserId is set when signed in.
 */
import { NextResponse } from "next/server";
import { resolveViewerUserId } from "@/lib/auth-user";
import { ingestLumaEvent, previewLumaIngest } from "@/lib/events-service";

export async function POST(request: Request) {
  try {
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

    const viewerUserId = await resolveViewerUserId(request);
    const event = await ingestLumaEvent(
      body.lumaUrl.trim(),
      viewerUserId ?? undefined,
    );

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    const status = message.includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
