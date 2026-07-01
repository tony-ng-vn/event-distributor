/**
 * GET/PATCH /api/me — viewer profile (display name friends see).
 */
import { NextResponse } from "next/server";
import {
  getViewerProfile,
  requireViewerUserId,
  updateViewerDisplayName,
} from "@/lib/auth-user";

export async function GET(request: Request) {
  try {
    const userId = await requireViewerUserId(request);
    const profile = await getViewerProfile(userId);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = /sign in required/i.test(message) ? 401 : 400;
    return NextResponse.json({ error: message, code: "AUTH_REQUIRED" }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireViewerUserId(request);
    const body = (await request.json()) as { name?: string };
    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const profile = await updateViewerDisplayName(userId, body.name);
    return NextResponse.json({ name: profile.name, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (/sign in required/i.test(message)) {
      return NextResponse.json(
        { error: message, code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    const status = /empty|too long/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
