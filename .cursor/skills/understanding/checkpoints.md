# Checkpoints (module)

Part of the **understanding** skill bundle. Controls when the agent pauses vs
keeps running after an understanding task.

## Modes

| Mode | When | Agent behavior |
|------|------|----------------|
| **pause** | Default after a PR understanding pass; human said "review" or "wait for me" | Run understanding task → hand off reading order → **stop** |
| **continue** | Human said "keep going" after reading | **Resume** next task — do not re-run understanding mid-feature |
| **pr** | **Primary trigger** — PR created/updated and feature is green | Full understanding task including PR roll-up → **pause** |

Infer mode from the human's message. After a PR understanding pass, default to **pause**.

---

## Per-PR rhythm (default)

Understanding runs **once per pull request**, not per commit:

```
implement → review loop (sub-agent) → PR → understanding task → pause for human
```

During implementation, **skip** understanding docs. Commit code and tests only.

---

## Pause handoff script

After running the understanding task in **pause** mode, tell the human:

```markdown
## Checkpoint — ready for your review

**Read next:** docs/understanding/branches/<branch>/reading-order.md
**Start at entry #1** (or the first new entry since last PR).

| # | Tier | Summary |
|---|------|---------|
| 1 | full | … |
| 2 | skip | index sync — no doc |

Open full-tier docs in a browser for the interactive quiz.

**Phone:** Run `npm run understanding:serve` and open the LAN URL on your phone.

Reply **continue** when ready for me to proceed, or give feedback on any entry.
```

---

## Continue mode

- Use when the human finished reading and wants more work.
- Do **not** re-run understanding until the **next PR** is ready.

---

## Linking checkpoints to PRs

| Work style | Pattern |
|------------|---------|
| **Default (goal method)** | feature → review loop → PR → understanding → **pause** |
| Human asks mid-branch | Run understanding on current branch → **pause** |
| Long multi-PR project | One understanding pass **per PR**, not per commit |

---

## State (optional)

You may write `docs/understanding/branches/<branch>/checkpoint.json`:

```json
{
  "lastCheckpointAt": "2026-07-06T22:00:00Z",
  "lastReadEntry": 1,
  "mode": "pause",
  "prNumber": 3
}
```

Update when the human says they finished reading through entry N.
