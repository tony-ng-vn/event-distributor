/**
 * GET/PATCH /api/me/notification-preferences — read or update the signed-in
 * user's email notification preference. Authenticated; the route stays unaware
 * of delivery mechanics.
 *
 * GET   -> { preference: { emailEnabled, hasResponded } }
 * PATCH { emailEnabled: boolean } -> updated preference (marks hasResponded).
 */
import { NextResponse } from "next/server";
import { requireViewerUserId } from "@/lib/auth-user";
import {
  getNotificationPreference,
  upsertNotificationPreference,
} from "@/lib/notifications/preferences";

function authErrorResponse(message: string) {
  return NextResponse.json(
    { error: message, code: "AUTH_REQUIRED" },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  try {
    const userId = await requireViewerUserId(request);
    const preference = await getNotificationPreference(userId);
    return NextResponse.json({ preference });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load preferences";
    if (/sign in required/i.test(message)) return authErrorResponse(message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireViewerUserId(request);
    const body = (await request.json()) as { emailEnabled?: unknown };

    if (typeof body.emailEnabled !== "boolean") {
      return NextResponse.json(
        { error: "emailEnabled (boolean) is required" },
        { status: 400 },
      );
    }

    // hasResponded is server-controlled: any PATCH is a user response, so we
    // force it true. Ignoring a client-sent false prevents forcing the opt-in
    // prompt to re-trigger.
    const preference = await upsertNotificationPreference(userId, {
      emailEnabled: body.emailEnabled,
      hasResponded: true,
    });

    return NextResponse.json({ preference });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update preferences";
    if (/sign in required/i.test(message)) return authErrorResponse(message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
