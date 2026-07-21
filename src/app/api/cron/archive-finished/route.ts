/**
 * POST /api/cron/archive-finished -- daily housekeeping that stamps archived_at
 * on events whose end time has passed. Triggered by the Vercel cron (see
 * vercel.json).
 *
 * Auth: a shared bearer token from CRON_SECRET.
 *   - CRON_SECRET unset            -> 503 (job not configured; fail closed)
 *   - Authorization header missing
 *     or mismatched                -> 401
 *   - matches                      -> archive and return { archived: count }
 *
 * The read-time feed filter already hides ended events, so this job is only
 * bookkeeping -- a missed run has no user-visible effect.
 */
import { NextResponse } from "next/server";
import { archiveFinishedEvents } from "@/lib/events-service";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Cron is not configured" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const archived = await archiveFinishedEvents();
    return NextResponse.json({ archived });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Archive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
