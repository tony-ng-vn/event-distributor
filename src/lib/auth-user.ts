/**
 * Auth bridge: Clerk (who you are) → InsForge users row (Postgres).
 *
 * Clerk handles sign-in UI and sessions. We store users in InsForge so Accept
 * records can link event_id + user_id.
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdminEmail, isUserAdmin } from "@/lib/admin";
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";

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
  const isAdmin = isAdminEmail(email);
  const db = getInsforgeAdmin();

  const { data: existing, error: existingError } = await db.database
    .from("users")
    .select("id, clerk_id, email, name, image, is_admin")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const name = clerkName ?? existing.name;

    // Skip the write when nothing changed -- this runs on every authed request.
    if (
      existing.email === email &&
      existing.name === name &&
      existing.image === image &&
      existing.is_admin === isAdmin
    ) {
      return existing;
    }

    const { data: updated, error: updateError } = await db.database
      .from("users")
      .update({ email, name, image, is_admin: isAdmin })
      .eq("id", existing.id)
      .select("id, clerk_id, email, name, image, is_admin")
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
        is_admin: isAdmin,
      },
    ])
    .select("id, clerk_id, email, name, image, is_admin")
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
 * Viewer id + admin flag from ONE Clerk sync. Separate id/admin resolvers each
 * ran their own sync (two Clerk fetches + two users-table round-trips per request).
 */
export async function requireViewer(
  request?: Request,
): Promise<{ userId: string; isAdmin: boolean }> {
  if (request) {
    const e2eUserId = resolveE2EUserId(request);
    if (e2eUserId) {
      return { userId: e2eUserId, isAdmin: await isUserAdmin(e2eUserId) };
    }
  }

  const user = await syncClerkUser();
  if (!user) {
    throw new Error("Sign in required to view events");
  }
  return { userId: user.id, isAdmin: user.is_admin === true };
}

