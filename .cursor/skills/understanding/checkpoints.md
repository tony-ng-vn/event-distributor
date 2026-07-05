# Checkpoints (module)

Part of the **understanding** skill bundle. Controls when the agent pauses vs
keeps running after an understanding task.

## Modes

| Mode | When | Agent behavior |
|------|------|----------------|
| **pause** | Human said "checkpoint", "review", "wait for me", or default at end of a session slice | Run understanding task → hand off reading order → **stop** |
| **continue** | Long autonomous run; human said "keep going" | Run understanding task → update reading order → **resume coding** |
| **pr** | Branch ready to merge | Full understanding task including PR roll-up |

Infer mode from the human's message. When unsure, **pause** — understanding is the goal.

---

## Pause handoff script

After running the understanding task in **pause** mode, tell the human:

```markdown
## Checkpoint — ready for your review

**Read next:** docs/understanding/branches/<branch>/reading-order.md
**Start at entry #<N>** (new since last checkpoint) — or #1 if first time.

| # | Tier | Summary |
|---|------|---------|
| 4 | full | … |
| 5 | skip | typo fix — no doc |
| 6 | light | … |

Open full-tier docs in a browser for the interactive quiz.

**Phone:** GitHub links won't run the quiz. Run `npm run understanding:serve` and open the
LAN URL on your phone (same Wi‑Fi), e.g. `http://192.168.x.x:3456/branches/<slug>/hub.html`

Reply **continue** when ready for me to proceed, or give feedback on any entry.
```

---

## Continue mode

- Still run classify + explain + index — do not skip documentation entirely.
- Do **not** wait for human reply.
- At the end of a long run, suggest: *"12 entries in reading-order.md — want a checkpoint?"*

---

## Linking checkpoints to commits

**Not** every commit triggers a checkpoint.

Typical rhythms:

| Work style | Pattern |
|------------|---------|
| Human-in-the-loop | `substantive commit` → understanding task → **pause** |
| Autonomous burst | several commits → understanding task → **continue** |
| PR | understanding task with roll-up → **pause** |

A substantive commit is one classified **light** or **full** per commit-policy.
After such a commit in pause mode, run the understanding task before more code.

---

## State (optional)

You may write `docs/understanding/branches/<branch>/checkpoint.json`:

```json
{
  "lastCheckpointAt": "2026-07-02T12:00:00Z",
  "lastReadEntry": 3,
  "mode": "pause"
}
```

Update when the human says they finished reading through entry N.
