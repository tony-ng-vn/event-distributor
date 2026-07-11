# Feed type pills, labels, admin select

**Commit:** `6ccb67f` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Friends get a second filter-pill row for event types; cards show a tag when classified; admins can fix types from the admin tab.

---

## Intuition

Filtering is client-side via partitionFeedEvents(typeFilter). Other excludes untyped so pending classify does not inflate Other.

---

## Code

EventTypeLabel returns null while typeSource is untyped.

---

## Quiz (2 questions)

### 1. Does Other show untyped events?

- [ ] Yes — <details><summary>Reveal</summary>❌</details>
- [ ] No — only classified-as-other — <details><summary>Reveal</summary>✅</details>
- [ ] Only on mobile — <details><summary>Reveal</summary>❌</details>
- [ ] Only for admins — <details><summary>Reveal</summary>❌</details>

### 2. Where do admins correct a type?

- [ ] Settings — <details><summary>Reveal</summary>❌</details>
- [ ] Admin event card select — <details><summary>Reveal</summary>✅</details>
- [ ] Clerk dashboard — <details><summary>Reveal</summary>❌</details>
- [ ] InsForge console only — <details><summary>Reveal</summary>❌</details>

