# Tighten event-type classifier contract

**Commit:** `9cf0d60` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Review feedback tightened the PRD so a future implementer will not guess wrong: **untyped ≠ Other**, classify **async after insert**, one shared `type_source` enum, and no fake “reclassify on metadata refresh” path.

---

## Intuition

Calendar sync can ingest many events in one request. Waiting on an LLM inside `ingestLumaEvent` would risk timeouts. So: insert with `type_source = untyped`, classify in the background. The Other filter must not show unfinished rows, or friends will think “Other” means “still loading.”

---

## Code

Docs-only. Key semantic table:

| `type_source` | Other pill? |
|---------------|-------------|
| `untyped` | No — All only |
| `fallback` / model-chosen `other` | Yes |

Dump script gained `--limit` for safer local sampling.

---

## Quiz (2 questions)

### 1. When should classification run relative to ingest?

- [ ] Synchronously before INSERT — <details><summary>Reveal</summary>❌ Blocks calendar sync.</details>
- [ ] Async after successful insert — <details><summary>Reveal</summary>✅ Insert first, classify later.</details>
- [ ] Only on Sundays via cron — <details><summary>Reveal</summary>❌ Post-ingest + backfill.</details>
- [ ] Never — humans tag everything — <details><summary>Reveal</summary>❌ Auto classify is the goal; humans override.</details>

### 2. Should untyped events appear under the Other filter?

- [ ] Yes — <details><summary>Reveal</summary>❌ That conflates “not yet classified” with “could not classify.”</details>
- [ ] No — only All until typed — <details><summary>Reveal</summary>✅ Other is for classified-as-other / fallback.</details>
- [ ] Only on mobile — <details><summary>Reveal</summary>❌ Same rules everywhere.</details>
- [ ] Only for admins — <details><summary>Reveal</summary>❌ Filter semantics are global.</details>
