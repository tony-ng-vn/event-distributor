/**
 * Signed, login-free unsubscribe tokens.
 *
 * A token carries a user id plus an HMAC-SHA256 signature over that id. The
 * unsubscribe endpoint verifies the signature server-side, so anyone with the
 * link can turn their own email off without signing in, but nobody can forge a
 * token for another user without the secret.
 *
 * Format: base64url(userId) + "." + base64url(hmac). Both halves are ASCII.
 *
 * Note: tokens intentionally never expire. An unsubscribe link should keep
 * working no matter how old the email is; the worst case is a user unsubscribing
 * themselves, which they can undo in Settings. Rotate the secret to invalidate
 * all outstanding tokens if ever needed.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SEPARATOR = ".";

function toBase64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function sign(userId: string, secret: string): string {
  return toBase64Url(createHmac("sha256", secret).update(userId).digest());
}

/** Build the opaque token embedded in unsubscribe URLs. */
export function signUnsubscribeToken(userId: string, secret: string): string {
  if (!userId) throw new Error("userId is required to sign an unsubscribe token");
  if (!secret) throw new Error("unsubscribe secret is not configured");

  const payload = toBase64Url(Buffer.from(userId, "utf8"));
  return `${payload}${SEPARATOR}${sign(userId, secret)}`;
}

/**
 * Return the user id when the token is authentic, otherwise null.
 * Never throws on malformed input so the endpoint can respond with a clean 400.
 */
export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): string | null {
  if (!token || !secret) return null;

  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  let userId: string;
  try {
    userId = fromBase64Url(payload).toString("utf8");
  } catch {
    return null;
  }
  if (!userId) return null;

  const expected = Buffer.from(sign(userId, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  return userId;
}
