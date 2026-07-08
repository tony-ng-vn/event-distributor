/**
 * InsForge admin client for server-side database access.
 *
 * API routes use the admin client after Clerk verifies the session.
 * Env: INSFORGE_URL + INSFORGE_API_KEY (server-only). See .env.example.
 */
import { createAdminClient, type InsForgeClient } from "@insforge/sdk";

const globalForInsforge = globalThis as unknown as {
  insforgeAdmin: InsForgeClient | undefined;
};

function resolveInsforgeConfig() {
  const baseUrl =
    process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "InsForge is not configured. Set INSFORGE_URL and INSFORGE_API_KEY in .env.local",
    );
  }

  return { baseUrl, apiKey };
}

export function getInsforgeAdmin(): InsForgeClient {
  // Cached on globalThis so dev hot-reload and prod both reuse one client
  // instead of constructing a new one per call site.
  if (!globalForInsforge.insforgeAdmin) {
    globalForInsforge.insforgeAdmin = createAdminClient(resolveInsforgeConfig());
  }

  return globalForInsforge.insforgeAdmin;
}
