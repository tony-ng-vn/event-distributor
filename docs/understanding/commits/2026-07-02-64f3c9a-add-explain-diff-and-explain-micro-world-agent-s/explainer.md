# Two agent skills: teach code changes instead of dumping diffs

**Commit:** `64f3c9a` · **Tier:** full · **Files:** 2  
**Read next in series:** entry #2 in [reading-order.md](../../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md)

---

## At a glance

This commit adds the first building blocks: two **agent skills** (instruction files Cursor agents read) that tell an AI how to write teaching documents about code changes — and how to propose hands-on playgrounds.

---

## Background

### Deep background (skip if familiar)

When an AI agent edits your repo, you usually review a **git diff** — a list of files and line changes. Diffs show *what* changed but rarely *why* or *how pieces connect*. That makes long agent sessions hard to trust.

An **agent skill** is a markdown file in `.cursor/skills/` with a name and description. When relevant, the agent reads it and follows the workflow inside — like a playbook.

### What mattered before this change

The repo had rules for incremental commits but nothing that said "after you code, teach the human what you did."

---

## Intuition

**Goal:** Give the agent a repeatable recipe for **literate diffs** (essays that walk through changes) and **micro-worlds** (tiny interactive toys you can play with to build intuition).

Think of two tools in a toolbox:

```
explain-diff     →  "Write me a lesson about this change + quiz"
explain-micro-world  →  "Propose a playground; build after human picks"
```

This commit only adds the instructions — not the templates or automation yet (those land in commit #3).

---

## Code walkthrough

### Step 1 — `explain-diff` skill

Path: `.cursor/skills/explain-diff/SKILL.md`

Defines teaching principles:

- **Plain language** — every jargon word gets a simple explanation
- **Background → intuition → code** — never jump straight to snippets
- **Quiz** — five questions so you can't fake understanding

Also specifies output paths under `docs/understanding/commits/` and `docs/understanding/prs/`.

### Step 2 — `explain-micro-world` skill

Path: `.cursor/skills/explain-micro-world/SKILL.md`

Inspired by Seymour Papert's *Mathland* — learn by living in an environment.

Workflow: **propose** 2–3 options → human picks → **build** smallest useful toy.

Form factors include step-through debuggers, migration command centers, and toy API playgrounds.

---

## Quiz

### 1. What is an agent skill in this repo?

- [ ] A npm package  
  <details><summary>Reveal</summary>❌ Skills are markdown playbooks in `.cursor/skills/`.</details>
- [ ] A markdown instruction file agents read when relevant  
  <details><summary>Reveal</summary>✅ Correct — it guides agent behavior.</details>
- [ ] A git hook  
  <details><summary>Reveal</summary>❌ Nothing here runs automatically on commit.</details>
- [ ] A unit test  
  <details><summary>Reveal</summary>❌ Skills teach process, not assert code.</details>

### 2. What is a literate diff?

- [ ] Raw `git diff` output  
  <details><summary>Reveal</summary>❌ That's the problem we're solving.</details>
- [ ] Prose that explains changes in a sensible narrative order  
  <details><summary>Reveal</summary>✅ Background, intuition, then code walkthrough.</details>
- [ ] A linter rule  
  <details><summary>Reveal</summary>❌ It's a teaching document.</details>
- [ ] A PR template only  
  <details><summary>Reveal</summary>❌ It's per-change documentation.</details>

### 3. What section order does `explain-diff` require?

- [ ] Code → Quiz → Background  
  <details><summary>Reveal</summary>❌ Intuition must come before code.</details>
- [ ] Background → Intuition → Code → Quiz  
  <details><summary>Reveal</summary>✅ Catch up, build mental model, details, verify.</details>
- [ ] Quiz first  
  <details><summary>Reveal</summary>❌ Teach before testing.</details>
- [ ] Alphabetical by filename  
  <details><summary>Reveal</summary>❌ Narrative order, not git order.</details>

### 4. When should an agent build a micro-world?

- [ ] Automatically for every commit  
  <details><summary>Reveal</summary>❌ Propose first; human chooses.</details>
- [ ] After the human picks from a proposal  
  <details><summary>Reveal</summary>✅ Collaboration loop.</details>
- [ ] Never  
  <details><summary>Reveal</summary>❌ Optional but supported.</details>
- [ ] Only for CSS changes  
  <details><summary>Reveal</summary>❌ APIs, migrations, parsers too.</details>

### 5. Does this commit add HTML templates or scripts?

- [ ] Yes, full pipeline  
  <details><summary>Reveal</summary>❌ Only the two skill files — templates come in commit #3.</details>
- [ ] No — only skill definitions  
  <details><summary>Reveal</summary>✅ This commit is instructions only.</details>
- [ ] Yes, git hooks  
  <details><summary>Reveal</summary>❌ No automation yet.</details>
- [ ] Yes, reading order  
  <details><summary>Reveal</summary>❌ Reading order lands in commit #6.</details>
