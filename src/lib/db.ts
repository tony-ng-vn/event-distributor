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
  if (globalForInsforge.insforgeAdmin) {
    return globalForInsforge.insforgeAdmin;
  }

  const client = createAdminClient(resolveInsforgeConfig());

  if (process.env.NODE_ENV !== "production") {
    globalForInsforge.insforgeAdmin = client;
  }

  return client;
}
