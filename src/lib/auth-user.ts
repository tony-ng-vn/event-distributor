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

export async function resolveViewerIsAdmin(
  request?: Request,
): Promise<boolean> {
  if (request) {
    const e2eUserId = resolveE2EUserId(request);
    if (e2eUserId) {
      return isUserAdmin(e2eUserId);
    }
  }

  const user = await syncClerkUser();
  return user?.is_admin === true;
}

/** Requires a signed-in viewer (Clerk or E2E). Throws when missing. */
export async function requireViewerUserId(request?: Request): Promise<string> {
  const userId = await resolveViewerUserId(request);
  if (!userId) {
    throw new Error("Sign in required to view events");
  }
  return userId;
}

