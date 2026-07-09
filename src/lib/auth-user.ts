/**
 * Auth bridge: Clerk (who you are) → InsForge users row (Postgres).
 *
 * Clerk handles sign-in UI and sessions. We store users in InsForge so Accept
 * records can link event_id + user_id.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdminEmail, isUserAdmin, resolveAdminFlag } from "@/lib/admin";
import { isEmailPreapproved, isUserApproved } from "@/lib/access-service";
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";

/** Thrown when a signed-in but unapproved user hits a gated endpoint. */
export const WAITLIST_PENDING_MESSAGE =
  "Your account is waiting for approval";

function resolveE2EUserId(request: Request): string | null {
  if (process.env.E2E_TEST !== "true") return null;

  const secret = request.headers.get("x-e2e-secret");
  const userId = request.headers.get("x-e2e-user-id");
  if (secret === process.env.E2E_TEST_SECRET && userId) return userId;

  return null;
}

async function syncClerkUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const clerkName = clerkUser.fullName ?? clerkUser.firstName ?? null;
  const image = clerkUser.imageUrl ?? null;
  // Admins and anyone on the preapproval list skip the waitlist automatically;
  // this also lets the owner grant access to a pending user by adding their
  // email to APPROVED_EMAILS -- they clear the gate on their next sign-in.
  const preapproved = isEmailPreapproved(email);
  const db = getInsforgeAdmin();

  const { data: existing, error: existingError } = await db.database
    .from("users")
    .select("id, clerk_id, email, name, image, is_admin, approved")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const name = clerkName ?? existing.name;
    // ADMIN_EMAILS only ever grants admin here; a manual promotion (or
    // demotion of a non-allowlisted admin) made via the admin Users tab
    // persists across future syncs instead of being silently reverted.
    const isAdmin = resolveAdminFlag(email, existing.is_admin === true);
    // Approval only ever moves false -> true (preapproval); admin approvals
    // write the column directly, so never downgrade here.
    const approved = existing.approved === true || preapproved;

    // Skip the write when nothing changed -- this runs on every authed request.
    if (
      existing.email === email &&
      existing.name === name &&
      existing.image === image &&
      existing.is_admin === isAdmin &&
      existing.approved === approved
    ) {
      return existing;
    }

    const { data: updated, error: updateError } = await db.database
      .from("users")
      .update({ email, name, image, is_admin: isAdmin, approved })
      .eq("id", existing.id)
      .select("id, clerk_id, email, name, image, is_admin, approved")
      .single();

    if (updateError) throw new Error(updateError.message);
    return updated;
  }

  const { data: created, error: createError } = await db.database
    .from("users")
    .insert([
      {
        id: newId(),
        clerk_id: clerkId,
        email,
        name: clerkName,
        image,
        is_admin: isAdminEmail(email),
        approved: preapproved,
      },
    ])
    .select("id, clerk_id, email, name, image, is_admin, approved")
    .single();

  if (createError) throw new Error(createError.message);
  return created;
}

export async function resolveViewerUserId(
  request?: Request,
): Promise<string | null> {
  if (request) {
    const e2eUserId = resolveE2EUserId(request);
    if (e2eUserId) return e2eUserId;
  }

  const user = await syncClerkUser();
  return user?.id ?? null;
}

/** Requires a signed-in viewer (Clerk or E2E). Throws when missing. */
export async function requireViewerUserId(request?: Request): Promise<string> {
  const userId = await resolveViewerUserId(request);
  if (!userId) {
    throw new Error("Sign in required to view events");
  }
  return userId;
}

/**
 * Viewer id + admin flag + waitlist approval from ONE Clerk sync. Separate
 * resolvers each ran their own sync (two Clerk fetches + two users-table
 * round-trips per request).
 */
export async function requireViewer(
  request?: Request,
): Promise<{ userId: string; isAdmin: boolean; approved: boolean }> {
  if (request) {
    const e2eUserId = resolveE2EUserId(request);
    if (e2eUserId) {
      const [isAdmin, approved] = await Promise.all([
        isUserAdmin(e2eUserId),
        isUserApproved(e2eUserId),
      ]);
      return { userId: e2eUserId, isAdmin, approved };
    }
  }

  const user = await syncClerkUser();
  if (!user) {
    throw new Error("Sign in required to view events");
  }
  return {
    userId: user.id,
    isAdmin: user.is_admin === true,
    approved: user.approved === true,
  };
}

/**
 * Requires a signed-in AND approved viewer. Throws "Sign in required..." when
 * signed out, or WAITLIST_PENDING_MESSAGE when still on the waitlist, so routes
 * can map the two to 401 vs 403.
 */
export async function requireApprovedViewerUserId(
  request?: Request,
): Promise<string> {
  const { userId, approved } = await requireViewer(request);
  if (!approved) {
    throw new Error(WAITLIST_PENDING_MESSAGE);
  }
  return userId;
}
