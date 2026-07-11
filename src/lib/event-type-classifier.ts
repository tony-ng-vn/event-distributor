/**
 * Classify an event into the closed taxonomy (PRD #46).
 *
 * Modes (EVENT_TYPE_CLASSIFIER):
 *   off      — no-op; leave type_source=untyped
 *   mock     — deterministic rules (tests / offline)
 *   rules    — keyword heuristics only
 *   insforge — InsForge AI chat completions, then rules/fallback on failure
 *
 * Never throws to callers of scheduleClassifyEvent — soft-fail only.
 */
import { getInsforgeAdmin } from "@/lib/db";
import {
  EVENT_TYPE_IDS,
  isEventTypeId,
  parseEventTypeId,
  taxonomyPromptList,
  type EventTypeId,
  type EventTypeSource,
} from "@/lib/event-type-taxonomy";

export const DEFAULT_MIN_CONFIDENCE = 0.55;

export type ClassifierMode = "off" | "mock" | "rules" | "insforge";

export type EventTypeInput = {
  title: string;
  description: string;
  location: string;
  hostName: string | null;
  isOnline: boolean;
};

export type ClassificationResult = {
  primaryType: EventTypeId;
  secondaryTypes: EventTypeId[];
  confidence: number | null;
  rationale: string | null;
  source: Exclude<EventTypeSource, "untyped" | "human">;
};

export type ChatCompletionFn = (params: {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
}) => Promise<{ choices?: Array<{ message?: { content?: string | null } }> }>;

export type ClassifyDeps = {
  mode?: ClassifierMode;
  minConfidence?: number;
  model?: string;
  chatCompletion?: ChatCompletionFn;
  now?: () => Date;
};

type RuleHit = { type: EventTypeId; weight: number };

const RULES: Array<{ type: EventTypeId; pattern: RegExp; weight: number }> = [
  {
    type: "builders",
    pattern:
      /\b(ai|llm|ml|hackathon|buildathon|builders?|demo\s*day|agents?|startup|founder|hack|codex|gtm|ship\s*night)\b/i,
    weight: 3,
  },
  {
    type: "talks",
    pattern:
      /\b(workshop|talk|panel|lecture|fireside|office\s*hours|paper\s*discussion|seminar|conversation with)\b/i,
    weight: 3,
  },
  {
    type: "sports",
    pattern:
      /\b(volley|tennis|paddle|run\s*club|yoga|fitness|athletic|hike|climb|gym|sports?|ping\s*pong)\b/i,
    weight: 3,
  },
  {
    type: "arts",
    pattern:
      /\b(art|museum|sfmoma|gallery|music|concert|film|theater|theatre|comedy|creative)\b/i,
    weight: 3,
  },
  {
    type: "social",
    pattern:
      /\b(hangout|vibes|mixer|social|party|nightlife|drinks|happy\s*hour|dinner|brunch|chai|coffee|cafe|poker|watch\s*party|board\s*games?)\b/i,
    weight: 2,
  },
];

export function resolveClassifierMode(
  raw: string | undefined = process.env.EVENT_TYPE_CLASSIFIER,
): ClassifierMode {
  const value = (raw ?? "rules").trim().toLowerCase();
  if (
    value === "off" ||
    value === "mock" ||
    value === "rules" ||
    value === "insforge"
  ) {
    return value;
  }
  return "rules";
}

function resolveMinConfidence(raw?: string): number {
  const parsed = Number(raw ?? process.env.EVENT_TYPE_CLASSIFIER_MIN_CONFIDENCE);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  return DEFAULT_MIN_CONFIDENCE;
}

function packetText(input: EventTypeInput): string {
  return [
    input.title,
    input.description,
    input.location,
    input.hostName ?? "",
    input.isOnline ? "online" : "in-person",
  ]
    .join("\n")
    .toLowerCase();
}

/** Keyword heuristic — used for rules/mock and as LLM hints. */
export function classifyWithRules(input: EventTypeInput): ClassificationResult {
  const text = packetText(input);
  const scores = new Map<EventTypeId, number>();

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      scores.set(rule.type, (scores.get(rule.type) ?? 0) + rule.weight);
    }
  }

  const ranked: RuleHit[] = [...scores.entries()]
    .map(([type, weight]) => ({ type, weight }))
    .sort((a, b) => b.weight - a.weight);

  if (ranked.length === 0) {
    return {
      primaryType: "other",
      secondaryTypes: [],
      confidence: 0.4,
      rationale: "No keyword rule matched",
      source: "rules",
    };
  }

  const primary = ranked[0]!;
  const secondaryTypes = ranked
    .slice(1)
    .filter((hit) => hit.weight >= primary.weight - 1)
    .map((hit) => hit.type)
    .slice(0, 2);

  return {
    primaryType: primary.type,
    secondaryTypes,
    confidence: Math.min(0.85, 0.5 + primary.weight * 0.1),
    rationale: `Matched rules favoring ${primary.type}`,
    source: "rules",
  };
}

export function buildClassificationPrompt(input: EventTypeInput): {
  system: string;
  user: string;
} {
  const hints = classifyWithRules(input);
  const system = [
    "You classify Bay Area / SF social events into a closed taxonomy.",
    "Respond with JSON only — no markdown fences.",
    "Schema: {\"primary_type\":\"...\",\"secondary_types\":[],\"confidence\":0.0,\"rationale\":\"...\"}",
    "primary_type must be one of:",
    taxonomyPromptList(),
    "Prefer a single primary. secondary_types: 0–2 other ids, no duplicates of primary.",
    "If unsure, use primary_type \"other\" with low confidence.",
  ].join("\n");

  const user = [
    `Title: ${input.title}`,
    `Description: ${input.description || "(none)"}`,
    `Location: ${input.location || "(none)"}`,
    `Host: ${input.hostName ?? "(none)"}`,
    `Online: ${input.isOnline ? "yes" : "no"}`,
    `Keyword hints (not authoritative): primary=${hints.primaryType}, secondary=${hints.secondaryTypes.join(",") || "none"}`,
  ].join("\n");

  return { system, user };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model response was not JSON");
  }
}

/** Parse and validate model JSON into a ClassificationResult (source=model). */
export function parseModelClassification(
  raw: unknown,
  minConfidence: number,
): ClassificationResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Classification payload must be an object");
  }

  const record = raw as Record<string, unknown>;
  const primary = parseEventTypeId(record.primary_type);
  if (!primary) {
    throw new Error("Invalid primary_type");
  }

  const secondaryRaw = Array.isArray(record.secondary_types)
    ? record.secondary_types
    : [];
  const secondaryTypes = secondaryRaw
    .map((value) => parseEventTypeId(value))
    .filter((value): value is EventTypeId => value !== null)
    .filter((value) => value !== primary)
    .slice(0, 2);

  const confidenceRaw = record.confidence;
  const confidence =
    typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : null;

  const rationale =
    typeof record.rationale === "string" ? record.rationale.slice(0, 500) : null;

  if (confidence !== null && confidence < minConfidence) {
    return {
      primaryType: "other",
      secondaryTypes: [],
      confidence,
      rationale: rationale ?? "Below confidence threshold",
      source: "fallback",
    };
  }

  return {
    primaryType: primary,
    secondaryTypes,
    confidence,
    rationale,
    source: "model",
  };
}

export async function classifyEventInput(
  input: EventTypeInput,
  deps: ClassifyDeps = {},
): Promise<ClassificationResult | null> {
  const mode = deps.mode ?? resolveClassifierMode();
  const minConfidence = deps.minConfidence ?? resolveMinConfidence();

  if (mode === "off") return null;

  if (mode === "mock" || mode === "rules") {
    return classifyWithRules(input);
  }

  // insforge
  try {
    const chat =
      deps.chatCompletion ??
      (async (params) => {
        const client = getInsforgeAdmin();
        return client.ai.chat.completions.create(params);
      });

    const { system, user } = buildClassificationPrompt(input);
    const model =
      deps.model ??
      process.env.EVENT_TYPE_CLASSIFIER_MODEL ??
      "openai/gpt-4o-mini";

    const completion = await chat({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      maxTokens: 400,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error("Empty model response");
    }

    const parsed = extractJsonObject(content);
    return parseModelClassification(parsed, minConfidence);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`[event-type] insforge classify failed: ${reason}`);
    const rules = classifyWithRules(input);
    if (rules.primaryType === "other") {
      return {
        ...rules,
        source: "fallback",
        rationale: `Model failed (${reason}); rules also unsure`,
      };
    }
    return {
      ...rules,
      rationale: `Model failed (${reason}); used rules`,
    };
  }
}

export async function persistEventClassification(
  eventId: string,
  result: ClassificationResult,
  options: { force?: boolean; now?: () => Date } = {},
): Promise<boolean> {
  const db = getInsforgeAdmin();
  const now = (options.now ?? (() => new Date))().toISOString();

  const { data: existing, error: readError } = await db.database
    .from("events")
    .select("id, type_source")
    .eq("id", eventId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!existing) return false;

  const source = (existing as { type_source?: string }).type_source;
  if (source === "human" && !options.force) {
    return false;
  }

  const { error } = await db.database
    .from("events")
    .update({
      primary_type: result.primaryType,
      secondary_types: result.secondaryTypes,
      type_confidence: result.confidence,
      type_source: result.source,
      type_rationale: result.rationale,
      typed_at: now,
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  return true;
}

/** Load event fields, classify, persist. No-op when mode=off. */
export async function classifyAndPersistEvent(
  eventId: string,
  deps: ClassifyDeps = {},
): Promise<ClassificationResult | null> {
  const mode = deps.mode ?? resolveClassifierMode();
  if (mode === "off") return null;

  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("events")
    .select(
      "id, title, description, location, host_name, is_online, type_source",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as {
    id: string;
    title: string;
    description: string;
    location: string;
    host_name: string | null;
    is_online: boolean;
    type_source: string;
  };

  if (row.type_source === "human") return null;

  const result = await classifyEventInput(
    {
      title: row.title,
      description: row.description,
      location: row.location,
      hostName: row.host_name,
      isOnline: row.is_online,
    },
    deps,
  );

  if (!result) return null;
  await persistEventClassification(eventId, result, { now: deps.now });
  return result;
}

/** Admin override — always type_source=human. */
export async function setEventTypeHuman(
  eventId: string,
  primaryType: EventTypeId,
  adminUserId: string,
): Promise<void> {
  void adminUserId;
  if (!isEventTypeId(primaryType)) {
    throw new Error("Invalid primary type");
  }

  const db = getInsforgeAdmin();
  const { data: existing, error: readError } = await db.database
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error("Event not found");

  const { error } = await db.database
    .from("events")
    .update({
      primary_type: primaryType,
      secondary_types: [],
      type_confidence: null,
      type_source: "human",
      type_rationale: "Admin override",
      typed_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
}

/** Backfill untyped rows. Returns counts. */
export async function backfillUntypedEventTypes(
  deps: ClassifyDeps & { limit?: number } = {},
): Promise<{ scanned: number; updated: number; skipped: number }> {
  const db = getInsforgeAdmin();
  const limit = deps.limit ?? 100;

  const { data, error } = await db.database
    .from("events")
    .select("id")
    .eq("type_source", "untyped")
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ id: string }>;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const result = await classifyAndPersistEvent(row.id, deps);
    if (result) updated += 1;
    else skipped += 1;
  }

  return { scanned: rows.length, updated, skipped };
}

/** Exported for tests — closed id list used in prompts. */
export function closedTypeIds(): readonly EventTypeId[] {
  return EVENT_TYPE_IDS;
}
