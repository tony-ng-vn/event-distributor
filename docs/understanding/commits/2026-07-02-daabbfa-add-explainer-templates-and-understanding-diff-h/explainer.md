# Templates and diff helper: the machinery behind explainers

**Commit:** `daabbfa` · **Tier:** full · **Files:** 6  
**Series:** entry #3 — [reading-order](../../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md)

---

## At a glance

Skills say *what* to write; this commit adds *how to start*: HTML/Markdown scaffolds with an interactive quiz, plus a Node script that gathers git diff context for the agent.

---

## Background

Writing an explainer from scratch every time is slow and inconsistent. Templates give shared structure; the script gives facts (files changed, patch, suggested folder).

### What mattered before

Commits #1–#2 had instructions and rules but no templates or `npm run` helper.

---

## Intuition

**Goal:** One command produces `diff-context.json`; the agent fills in the template.

```
npm run understanding:diff -- --commit HEAD
        ↓
diff-context.json  +  suggested folder path
        ↓
agent writes explainer.html / explainer.md from _templates/
```

The HTML template includes CSS, table of contents, callout styles, and **working quiz JavaScript** (click answer → feedback).

---

## Code walkthrough

### Step 1 — `scripts/understanding-diff.mjs`

- Accepts `--commit <ref>` or `--branch <name> --base main`
- Runs `git diff`, collects file list, stat, patch (truncated if huge)
- Writes `diff-context.json` into the suggested output directory
- Prints JSON summary to stdout for the agent

### Step 2 — Templates

| File | Purpose |
|------|---------|
| `_templates/explainer.html` | Full interactive page with quiz JS |
| `_templates/explainer.md` | Markdown twin with toggle-style quiz |
| `_templates/pr-index.md` | PR index scaffold |

**Important HTML detail:** code blocks use `<pre>` with `white-space: pre-wrap` so newlines don't collapse.

### Step 3 — Registration

- `package.json`: `"understanding:diff": "node scripts/understanding-diff.mjs"`
- `AGENTS.md`: lists skills and helper command

---

## Quiz

### 1. What does `understanding-diff.mjs` *not* do?

- [ ] Write the explainer prose automatically  
  <details><summary>Reveal</summary>✅ Agent writes the lesson; script only gathers diff.</details>
- [ ] Run git diff  
  <details><summary>Reveal</summary>❌ It does run git diff.</details>
- [ ] Suggest output folder  
  <details><summary>Reveal</summary>❌ It does suggest paths.</details>
- [ ] Write diff-context.json  
  <details><summary>Reveal</summary>❌ It does write that file.</details>

### 2. Why both explainer.html and explainer.md?

- [ ] HTML is for agents; MD is for humans  
  <details><summary>Reveal</summary>❌ Both are for humans — HTML for interactive quiz, MD for git/search.</details>
- [ ] HTML for interactive quiz; MD for git-friendly reading  
  <details><summary>Reveal</summary>✅ Correct.</details>
- [ ] Duplicate is a mistake  
  <details><summary>Reveal</summary>❌ Intentional twins.</details>
- [ ] MD replaces HTML in production  
  <details><summary>Reveal</summary>❌ HTML preferred for reading.</details>

### 3. What npm command runs the diff helper?

- [ ] `npm run understanding:index`  
  <details><summary>Reveal</summary>❌ That's the index script (commit #6).</details>
- [ ] `npm run understanding:diff`  
  <details><summary>Reveal</summary>✅ Added in this commit.</details>
- [ ] `npm run explain`  
  <details><summary>Reveal</summary>❌ Not defined.</details>
- [ ] `npm run docs`  
  <details><summary>Reveal</summary>❌ Not defined.</details>

### 4. Why must code blocks in HTML use pre-wrap?

- [ ] Faster loading  
  <details><summary>Reveal</summary>❌ Browsers collapse newlines without it.</details>
- [ ] Browsers collapse newlines otherwise  
  <details><summary>Reveal</summary>✅ Code would become one line.</details>
- [ ] SEO  
  <details><summary>Reveal</summary>❌ Not the reason.</details>
- [ ] Accessibility only  
  <details><summary>Reveal</summary>❌ Rendering issue for everyone.</details>

### 5. What's in diff-context.json?

- [ ] Only commit message  
  <details><summary>Reveal</summary>❌ Files, stat, patch, paths, SHAs.</details>
- [ ] Files, stat, patch, and suggested paths  
  <details><summary>Reveal</summary>✅ Machine-readable context for agents.</details>
- [ ] The finished quiz  
  <details><summary>Reveal</summary>❌ Agent writes quiz content.</details>
- [ ] User credentials  
  <details><summary>Reveal</summary>❌ Never commit secrets.</details>
