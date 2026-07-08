import { describe, expect, it, afterEach, beforeEach } from "vitest";
import {
  assertDestructiveWritesAllowed,
  isProductionInsforgeDatabase,
  normalizeInsforgeUrl,
} from "@/lib/db-safety";

const ENV_KEYS = [
  "INSFORGE_URL",
  "NEXT_PUBLIC_INSFORGE_URL",
  "INSFORGE_PRODUCTION_URL",
  "INSFORGE_ALLOW_DESTRUCTIVE_WRITES",
] as const;

function saveEnv() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("db-safety", () => {
  let envSnapshot: Record<string, string | undefined>;

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  beforeEach(() => {
    envSnapshot = saveEnv();
    delete process.env.INSFORGE_URL;
    delete process.env.NEXT_PUBLIC_INSFORGE_URL;
    delete process.env.INSFORGE_PRODUCTION_URL;
    delete process.env.INSFORGE_ALLOW_DESTRUCTIVE_WRITES;
  });

  it("normalizes InsForge URLs for comparison", () => {
    expect(normalizeInsforgeUrl("https://yy57ijjh.us-east.insforge.app/")).toBe(
      "https://yy57ijjh.us-east.insforge.app",
    );
  });

  it("detects when the active database is production", () => {
    process.env.INSFORGE_URL = "https://yy57ijjh.us-east.insforge.app";
    process.env.INSFORGE_PRODUCTION_URL =
      "https://yy57ijjh.us-east.insforge.app";

    expect(isProductionInsforgeDatabase()).toBe(true);
  });

  it("allows destructive writes only on non-production with explicit opt-in", () => {
    process.env.INSFORGE_URL = "https://dev-branch.us-east.insforge.app";
    process.env.INSFORGE_PRODUCTION_URL =
      "https://yy57ijjh.us-east.insforge.app";
    process.env.INSFORGE_ALLOW_DESTRUCTIVE_WRITES = "true";

    expect(() =>
      assertDestructiveWritesAllowed("resetDatabase"),
    ).not.toThrow();
  });

  it("blocks destructive writes against production even with opt-in", () => {
    process.env.INSFORGE_URL = "https://yy57ijjh.us-east.insforge.app";
    process.env.INSFORGE_PRODUCTION_URL =
      "https://yy57ijjh.us-east.insforge.app";
    process.env.INSFORGE_ALLOW_DESTRUCTIVE_WRITES = "true";

    expect(() => assertDestructiveWritesAllowed("resetDatabase")).toThrow(
      /production InsForge database/i,
    );
  });

  it("blocks destructive writes without opt-in on a dev database", () => {
    process.env.INSFORGE_URL = "https://dev-branch.us-east.insforge.app";
    process.env.INSFORGE_PRODUCTION_URL =
      "https://yy57ijjh.us-east.insforge.app";

    expect(() => assertDestructiveWritesAllowed("resetDatabase")).toThrow(
      /INSFORGE_ALLOW_DESTRUCTIVE_WRITES=true/i,
    );
  });
});
