#!/usr/bin/env node
/**
 * Dump production (or configured) Event Radar events for type-classifier research.
 *
 * Requires INSFORGE_URL + INSFORGE_API_KEY (from .env.local).
 * Read-only: SELECT only. Never writes or deletes.
 *
 * Usage:
 *   node --env-file=.env.local scripts/dump-event-type-corpus.mjs
 *   node --env-file=.env.local scripts/dump-event-type-corpus.mjs --out docs/prd/research/prod-events-corpus.json
 */

import { createAdminClient } from "@insforge/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const outPath = resolve(
  argValue("--out", "docs/prd/research/prod-events-corpus.json"),
);

const baseUrl = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.error(
    "Missing INSFORGE_URL / INSFORGE_API_KEY. Copy .env.local and re-run.",
  );
  process.exit(1);
}

const productionUrl =
  process.env.INSFORGE_PRODUCTION_URL ??
  "https://yy57ijjh.us-east.insforge.app";

const db = createAdminClient({ baseUrl, apiKey });

const { data, error } = await db.database
  .from("events")
  .select(
    "id, title, description, location, is_online, host_name, start_at, end_at, luma_url, created_at",
  )
  .order("start_at", { ascending: false });

if (error) {
  console.error("Query failed:", error.message);
  process.exit(1);
}

const events = data ?? [];
const payload = {
  dumpedAt: new Date().toISOString(),
  baseUrl,
  isProductionTarget: baseUrl.replace(/\/$/, "") === productionUrl.replace(/\/$/, ""),
  count: events.length,
  events,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`Wrote ${events.length} events to ${outPath}`);
console.log(
  payload.isProductionTarget
    ? "Target looks like production — dump is read-only; do not commit secrets."
    : "Target does not match INSFORGE_PRODUCTION_URL.",
);
