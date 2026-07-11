/**
 * Guards destructive InsForge operations so tests and agents cannot wipe production.
 *
 * Destructive helpers fail closed. They require a configured production URL,
 * an explicit opt-in, and an exact match to a separately allowlisted test URL.
 */

export function normalizeInsforgeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

function resolveInsforgeBaseUrl(): string | null {
  const url =
    process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL ?? null;
  return url ? normalizeInsforgeUrl(url) : null;
}

function resolveProductionInsforgeUrl(): string | null {
  const url = process.env.INSFORGE_PRODUCTION_URL;
  return url ? normalizeInsforgeUrl(url) : null;
}

function resolveDestructiveTestInsforgeUrl(): string | null {
  const url = process.env.INSFORGE_DESTRUCTIVE_TEST_URL;
  return url ? normalizeInsforgeUrl(url) : null;
}

export function isProductionInsforgeDatabase(): boolean {
  const current = resolveInsforgeBaseUrl();
  const production = resolveProductionInsforgeUrl();
  if (!current || !production) return false;
  return current === production;
}

export function assertDestructiveWritesAllowed(context: string): void {
  const current = resolveInsforgeBaseUrl();
  const production = resolveProductionInsforgeUrl();

  if (!current) {
    throw new Error(
      `Blocked ${context}: INSFORGE_URL (or NEXT_PUBLIC_INSFORGE_URL) is required.`,
    );
  }

  if (!production) {
    throw new Error(
      `Blocked ${context}: INSFORGE_PRODUCTION_URL must be configured so destructive helpers can fail closed.`,
    );
  }

  if (current === production) {
    throw new Error(
      `Blocked ${context}: destructive writes are not allowed against the production InsForge database (${current}). ` +
        "Use a temporary InsForge branch for tests. See AGENTS.md (Database safety).",
    );
  }

  if (process.env.INSFORGE_ALLOW_DESTRUCTIVE_WRITES !== "true") {
    throw new Error(
      `Blocked ${context}: set INSFORGE_ALLOW_DESTRUCTIVE_WRITES=true only when INSFORGE_URL points at an explicitly allowlisted temporary InsForge branch — never production.`,
    );
  }

  const testTarget = resolveDestructiveTestInsforgeUrl();
  if (!testTarget || current !== testTarget) {
    throw new Error(
      `Blocked ${context}: INSFORGE_URL must exactly match INSFORGE_DESTRUCTIVE_TEST_URL before destructive helpers can run.`,
    );
  }
}

export function assertIntegrationTestsAllowed(): void {
  const current = resolveInsforgeBaseUrl();
  const production = resolveProductionInsforgeUrl();

  if (!current) {
    throw new Error(
      "Integration tests require INSFORGE_URL (or NEXT_PUBLIC_INSFORGE_URL).",
    );
  }

  if (production && current === production) {
    throw new Error(
      `Integration tests cannot run against the production InsForge database (${current}). ` +
        "Create a branch with `npx @insforge/cli branch create dev-test`, switch to it, and point INSFORGE_URL at the branch URL.",
    );
  }

  assertDestructiveWritesAllowed("integration tests");
}
