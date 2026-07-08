/**
 * GET /api/notifications/unsubscribe?token=... — one-click, login-free opt-out.
 *
 * The token is an HMAC-signed user id. We verify it server-side, flip
 * email_enabled to false, and return a small confirmation page. No session is
 * required, which is the whole point: leaving is as easy as a link click.
 */
import { NextResponse } from "next/server";
import { getUnsubscribeSecret } from "@/lib/notifications/config";
import { disableEmailForUser } from "@/lib/notifications/preferences";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

function htmlPage(title: string, message: string, status: number) {
  const body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #fafafa; color: #0a0a0a; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
      .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      p { font-size: 14px; color: #555; margin: 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
</html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const secret = getUnsubscribeSecret();

  const userId = verifyUnsubscribeToken(token, secret);
  if (!userId) {
    return htmlPage(
      "Invalid unsubscribe link",
      "This link is invalid or has expired. Update your notification settings in the app instead.",
      400,
    );
  }

  try {
    await disableEmailForUser(userId);
  } catch {
    return htmlPage(
      "Something went wrong",
      "We could not update your preferences right now. Please try again, or turn emails off in the app settings.",
      500,
    );
  }

  return htmlPage(
    "You are unsubscribed",
    "You will no longer get emails when new events are added. You can re-enable them anytime in Event Radar settings.",
    200,
  );
}
