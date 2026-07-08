/**
 * Login-free unsubscribe.
 *
 * GET renders a confirmation page only -- it never mutates. This matters because
 * email security scanners and clients (Outlook SafeLinks, Gmail/AV prefetch)
 * auto-fetch links in message bodies; a state-changing GET would silently
 * unsubscribe real recipients who never clicked. The actual flip happens in
 * POST (RFC 8058 semantics). Both handlers gate on a valid HMAC-signed token.
 */
import { NextResponse } from "next/server";
import { getUnsubscribeSecret } from "@/lib/notifications/config";
import { disableEmailForUser } from "@/lib/notifications/preferences";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

function htmlPage(title: string, bodyHtml: string, status: number) {
  const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #fafafa; color: #0a0a0a; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
      .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      p { font-size: 14px; color: #555; margin: 0 0 16px; }
      button { background: #0a0a0a; color: #fff; border: none; border-radius: 9999px; padding: 10px 24px; font-size: 14px; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      ${bodyHtml}
    </div>
  </body>
</html>`;
  return new NextResponse(page, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function invalidLinkPage() {
  return htmlPage(
    "Invalid unsubscribe link",
    "<p>This link is invalid or has expired. Update your notification settings in the app instead.</p>",
    400,
  );
}

/** Confirmation page. Does NOT mutate -- the flip is in POST. */
export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const secret = getUnsubscribeSecret();

  if (!verifyUnsubscribeToken(token, secret)) return invalidLinkPage();

  const action = `/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  return htmlPage(
    "Unsubscribe from Event Radar emails?",
    `<p>You will stop getting emails when new events are added. You can re-enable them anytime in Settings.</p>
     <form method="post" action="${action}">
       <button type="submit">Confirm unsubscribe</button>
     </form>`,
    200,
  );
}

/** Performs the opt-out after the user confirms. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const secret = getUnsubscribeSecret();

  const userId = verifyUnsubscribeToken(token, secret);
  if (!userId) return invalidLinkPage();

  try {
    await disableEmailForUser(userId);
  } catch {
    return htmlPage(
      "Something went wrong",
      "<p>We could not update your preferences right now. Please try again, or turn emails off in the app settings.</p>",
      500,
    );
  }

  return htmlPage(
    "You are unsubscribed",
    "<p>You will no longer get emails when new events are added. You can re-enable them anytime in Event Radar settings.</p>",
    200,
  );
}
