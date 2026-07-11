#!/usr/bin/env node
/**
 * List or classify untyped events via InsForge admin SDK (rules mode).
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-event-types.mjs
 *   node --env-file=.env.local scripts/backfill-event-types.mjs --apply --limit 50
 *
 * Prefer POST /api/admin/event-types/backfill from an admin session when the
 * app is running (supports insforge mode). This script only applies keyword rules.
 */

import { createAdminClient } from "@insforge/sdk";

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const apply = process.argv.includes("--apply");
const limit = Number(argValue("--limit", "100"));
const baseUrl = process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL;
const apiKey = process.env.INSFORGE_API_KEY;

if (!baseUrl || !apiKey) {
  console.error("Missing INSFORGE_URL / INSFORGE_API_KEY");
  process.exit(1);
}

const RULES = [
  {
    type: "builders",
    pattern:
      /\b(ai|llm|ml|hackathon|buildathon|builders?|demo\s*day|agents?|startup|founder|hack|codex|gtm|ship\s*night)\b/i,
  },
  {
    type: "talks",
    pattern:
      /\b(workshop|talk|panel|lecture|fireside|office\s*hours|paper\s*discussion|seminar|conversation with)\b/i,
  },
  {
    type: "sports",
    pattern:
      /\b(volley|tennis|paddle|run\s*club|yoga|fitness|athletic|hike|climb|gym|sports?|ping\s*pong)\b/i,
  },
  {
    type: "arts",
    pattern:
      /\b(art|museum|sfmoma|gallery|music|concert|film|theater|theatre|comedy|creative)\b/i,
  },
  {
    type: "social",
    pattern:
      /\b(hangout|vibes|mixer|social|party|nightlife|drinks|happy\s*hour|dinner|brunch|chai|coffee|cafe|poker|watch\s*party|board\s*games?)\b/i,
  },
];

function classify(row) {
  const text = [row.title, row.description, row.location, row.host_name]
    .filter(Boolean)
    .join("\n");
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.type;
  }
  return "other";
}

const db = createAdminClient({ baseUrl, apiKey });
const { data, error } = await db.database
  .from("events")
  .select("id, title, description, location, host_name, type_source, primary_type")
  .eq("type_source", "untyped")
  .limit(Number.isFinite(limit) ? limit : 100);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data ?? [];
console.log(`Untyped events: ${rows.length}`);

let updated = 0;
for (const row of rows) {
  const primary = classify(row);
  console.log(`- ${row.id}  [${primary}]  ${row.title}`);
  if (!apply) continue;

  const { error: updateError } = await db.database
    .from("events")
    .update({
      primary_type: primary,
      secondary_types: [],
      type_confidence: 0.6,
      type_source: primary === "other" ? "fallback" : "rules",
      type_rationale: "backfill-event-types.mjs rules",
      typed_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("type_source", "untyped");

  if (updateError) {
    console.error(`  failed: ${updateError.message}`);
  } else {
    updated += 1;
  }
}

if (apply) {
  console.log(`Updated ${updated}/${rows.length}`);
} else {
  console.log("Dry run. Pass --apply to write rules classifications.");
}
