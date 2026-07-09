/**
 * E2E test-only API — disabled unless E2E_TEST=true (Playwright sets this).
 */
import { NextResponse } from "next/server";
import { assertDestructiveWritesAllowed } from "@/lib/db-safety";
import { createUser, resetDatabase, seedDemoEvent } from "@/lib/events-service";
import { getInsforgeAdmin } from "@/lib/db";

function assertE2E() {
  if (process.env.E2E_TEST !== "true") {
    throw new Error("E2E routes disabled");
  }
}

function assertE2EDatabase() {
  assertDestructiveWritesAllowed("e2e seed");
}

export async function POST(request: Request) {
  try {
    assertE2E();
    assertE2EDatabase();
    const secret = request.headers.get("x-e2e-secret");
    if (secret !== process.env.E2E_TEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await resetDatabase();
    const event = await seedDemoEvent();
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seed failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertE2E();
    assertE2EDatabase();
    const secret = request.headers.get("x-e2e-secret");
    if (secret !== process.env.E2E_TEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await resetDatabase();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    assertE2E();
    assertE2EDatabase();
    const secret = request.headers.get("x-e2e-secret");
    if (secret !== process.env.E2E_TEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
    };

    const email = body.email ?? "e2e@test.local";
    const name = body.name ?? "E2E Tester";
    const db = getInsforgeAdmin();

    const { data: existing, error: existingError } = await db.database
      .from("users")
      .select("id, email, name, image")
      .eq("email", email)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing) {
      const { data: updated, error: updateError } = await db.database
        .from("users")
        .update({ name, approved: true })
        .eq("id", existing.id)
        .select("id, email, name, image")
        .single();

      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ user: updated });
    }

    const user = await createUser({ email, name, approved: true });
    return NextResponse.json({ user: { ...user, image: null, id: user.id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth seed failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
