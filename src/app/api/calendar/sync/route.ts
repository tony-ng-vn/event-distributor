/**
 * POST /api/calendar/sync -- pull the signed-in member's Luma calendar into the
 * shared feed.
 *
 * Body: { force?: boolean }
 *   force omitted/false -> skip if the last sync is still fresh (feed-load path)
 *   force true          -> always sync now ("Sync now" button)
 *
 * Returns the sync outcome (added / skipped / failed counts). Failure-isolated:
 * an unreachable Luma feed comes back as a 200 with an `error` field, never a
 * thrown 500, so a feed load that triggered it is never broken by it.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { syncCalendarForUser } from "@/lib/calendar-service";

// Each new event triggers a live lu.ma scrape; give the initial batch room
// (Vercel Hobby allows up to 60s). The per-run cap keeps us within this.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const userId = await requireApprovedViewerUserId(request);
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
    };

    const outcome = await syncCalendarForUser(userId, { force: body.force });
    return NextResponse.json({ outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
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
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
