/**
 * POST /api/feedback — submit in-app feedback (signed-in only).
 *
 * Body: { message: string }
 */
import { NextResponse } from "next/server";
import { requireViewerUserId } from "@/lib/auth-user";
import { submitFeedback } from "@/lib/feedback-service";

export async function POST(request: Request) {
  try {
    const viewerUserId = await requireViewerUserId(request);
    const body = (await request.json()) as { message?: string };

    if (typeof body.message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const feedback = await submitFeedback(viewerUserId, body.message);

    return NextResponse.json(
      {
        feedback: {
          id: feedback.id,
          createdAt: feedback.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback failed";
    if (/sign in required/i.test(message)) {
      return NextResponse.json(
        { error: message, code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
