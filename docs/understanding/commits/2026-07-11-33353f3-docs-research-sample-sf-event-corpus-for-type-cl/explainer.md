# Research: SF event corpus for type classification

**Commit:** `33353f3` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

This commit does not change the app. It records *why* keyword-only event typing fails, saves a 20-event public Luma SF sample, and adds a read-only script to dump real production events when InsForge credentials exist.

---

## Intuition

Event Radar stores title, description, location, and host — but **no category**. Friends will soon want filters like “Social” vs “Builders.” Before designing a classifier, we needed examples of what Luma titles actually look like.

Production DB access was blocked in the cloud agent (no API key), so research used Luma’s public SF discover page as a **proxy corpus** — same city/culture, not the friend-group table. A dump script is included so a human can pull the real rows locally later.

---

## Code

The dump script is intentionally boring: admin InsForge client, `SELECT` only, write JSON.

```javascript
// scripts/dump-event-type-corpus.mjs
const { data, error } = await query; // events: title, description, location, …
writeFileSync(outPath, JSON.stringify({ count, events }, null, 2));
```

Research notes call out failure cases like “Battle of the Paddles: AI Builders Edition” — keywords say AI; the event is mostly sports/social.

---

## Quiz (2 questions)

### 1. Why wasn’t the production `events` table used for this research commit?

- [ ] The table has no title column — <details><summary>Reveal</summary>❌ Titles exist; credentials were missing.</details>
- [ ] Cloud agent lacked InsForge admin credentials — <details><summary>Reveal</summary>✅ `.env.local` / `INSFORGE_API_KEY` were not available.</details>
- [ ] RLS blocks all selects forever — <details><summary>Reveal</summary>❌ App can read with the admin key; this run had no key.</details>
- [ ] Production has zero events — <details><summary>Reveal</summary>❌ Unknown; dump was not possible.</details>

### 2. What is the proxy corpus?

- [ ] Synthetic fixture titles from unit tests — <details><summary>Reveal</summary>❌ It’s public Luma SF discover JSON-LD.</details>
- [ ] 20 popular public Luma SF events — <details><summary>Reveal</summary>✅ Saved as `luma-sf-proxy-corpus.json`.</details>
- [ ] The user’s private iCal feed — <details><summary>Reveal</summary>❌ That was referenced elsewhere; not dumped here.</details>
- [ ] Eventbrite Bay Area API dump — <details><summary>Reveal</summary>❌ Luma only.</details>
