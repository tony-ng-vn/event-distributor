/**
 * GET /api/admin/waitlist — everyone still waiting for approval (admin only).
 */
import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth-user";
import { listWaitlistUsers } from "@/lib/access-service";

export async function GET(request: Request) {
  try {
    const { isAdmin } = await requireViewer(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 },
      );
    }

    const users = await listWaitlistUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = /sign in required/i.test(message) ? 401 : 400;
    return NextResponse.json(
      { error: message, code: "AUTH_REQUIRED" },
      { status },
    );
  }
}
