# Understanding layer — full PR story

**PR:** #2 · **Branch:** `cursor/explain-diff-understanding-layer-d250` · **27 files** vs `main`

---

## How to read this PR

1. **Start:** [reading-order.md](../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md) — entries **#1 → #6** (oldest first).
2. Open each **explainer.html** in a browser for the interactive quiz.
3. **Then** read this roll-up for the whole arc (optional).

---

## At a glance

Adds a human-in-the-loop **understanding layer**: literate diffs, embedded quizzes, optional micro-worlds, and numbered **reading order** for incremental review of agent-written code.

---

## Background

Long agent sessions → many commits → overwhelming diffs. This PR teaches *alongside* the code using the **`understanding` skill bundle** (`.cursor/skills/understanding/SKILL.md`) — invoked at checkpoints, not on every git commit.

---

## Intuition

**Goal:** One understanding task classifies commits (skip / light / full), writes explainers for substantive ones, maintains `reading-order.md`, and produces a PR roll-up.

```
#1 skills → #2 rule → #3 templates → #4 sample → #5 bundle → #6 reading order
```

---

## Six commits (read in order)

| # | SHA | Chapter |
|---|-----|---------|
| 1 | `64f3c9a` | [Two agent skills](../commits/2026-07-02-64f3c9a-add-explain-diff-and-explain-micro-world-agent-s/explainer.html) |
| 2 | `cc1f952` | [Workflow rule v1](../commits/2026-07-02-cc1f952-add-understanding-layer-workflow-rule-and-docume/explainer.html) |
| 3 | `daabbfa` | [Templates + diff script](../commits/2026-07-02-daabbfa-add-explainer-templates-and-understanding-diff-h/explainer.html) |
| 4 | `b744660` | [Dogfood sample](../commits/2026-07-02-b744660-add-sample-pr-explainer-demonstrating-the-unders/explainer.html) |
| 5 | `c8de06c` | [Skill bundle](../commits/2026-07-02-c8de06c-replace-per-commit-rule-with-unified-understandi/explainer.html) |
| 6 | `16922f7` | [Reading order script](../commits/2026-07-02-16922f7-add-reading-order-index-script-and-remove-mandat/explainer.html) |

---

## Quiz

### 1. How do you read this PR incrementally?

- [ ] Random commit folders  
  <details><summary>Reveal</summary>❌ Use reading-order.md #1→#6.</details>
- [ ] reading-order.md entries in order  
  <details><summary>Reveal</summary>✅ Chronological table.</details>
- [ ] Only this roll-up  
  <details><summary>Reveal</summary>❌ Per-commit docs teach each slice.</details>
- [ ] git diff only  
  <details><summary>Reveal</summary>❌ Literate diffs are the point.</details>

### 2. What triggers the understanding task?

- [ ] Git hook on every commit  
  <details><summary>Reveal</summary>❌ Deliberate skill bundle invocation.</details>
- [ ] Checkpoints / when human asks  
  <details><summary>Reveal</summary>✅</details>
- [ ] CI only  
  <details><summary>Reveal</summary>❌</details>
- [ ] Never  
  <details><summary>Reveal</summary>❌</details>

### 3. Trivial commits use which tier?

- [ ] skip  
  <details><summary>Reveal</summary>✅ Listed in reading order, no explainer.</details>
- [ ] full always  
  <details><summary>Reveal</summary>❌</details>
- [ ] delete from git  
  <details><summary>Reveal</summary>❌</details>
- [ ] hide  
  <details><summary>Reveal</summary>❌</details>

### 4. Primary navigation file?

- [ ] AGENTS.md  
  <details><summary>Reveal</summary>❌ branches/.../reading-order.md</details>
- [ ] reading-order.md per branch  
  <details><summary>Reveal</summary>✅</details>
- [ ] package-lock.json  
  <details><summary>Reveal</summary>❌</details>
- [ ] page.tsx  
  <details><summary>Reveal</summary>❌</details>

### 5. Key npm commands?

- [ ] npm test only  
  <details><summary>Reveal</summary>❌ understanding:index + understanding:diff</details>
- [ ] understanding:index and understanding:diff  
  <details><summary>Reveal</summary>✅</details>
- [ ] git push only  
  <details><summary>Reveal</summary>❌</details>
- [ ] docker compose  
  <details><summary>Reveal</summary>❌</details>
