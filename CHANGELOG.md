# Changelog

Notable changes to Event Radar.
Add an entry when a PR merges. Newest first.
Format: `## vX.Y.Z` heading, date below it, one `**Category**` subheading per area touched, plain-language bullets, then `---` before the older entry.
Categories: Feed, Events API, Notifications, Auth, Infrastructure, Docs (see AGENTS.md).

## v0.1.1

2026-07-08

**Feed**

- The Admin tab now reads from the same event list as the rest of the app, so opening it no longer triggers a second identical download and every action refreshes the feed once instead of twice.

**Events API**

- Loading the feed is lighter on the server: the viewer is looked up once per request instead of twice, an unchanged profile no longer rewrites its database row, and the "did I pass this event" check reuses data the main query already fetched.
- Accept and remove-interest responses now report your pass state correctly instead of always saying "not passed".

**Notifications**

- Removed the temporary self-notify test toggle (NOTIFICATIONS_TEST_INCLUDE_SELF); the person who adds an event is always excluded from its announcement email, as designed.

**Infrastructure**

- Deep cleanup pass: deleted the unused Google Calendar module and two heavyweight unused dependencies (googleapis, cheerio), the leftover card-layout comparison page, an orphaned prisma/ folder, and a few hundred lines of dead helpers, duplicate types, and deprecated aliases.
- Event titles from Luma now have the site suffix stripped consistently for every separator style Luma uses.

---

## 2026-07-08

The Your events tab now uses the exact same event card as the main Feed, so the two match: same linked title, same actions, and no more "View on Luma" link (the Feed had already dropped it).

Rewrote the README to explain what Event Radar is and why it exists, written for readers rather than contributors.

The Remove interest button now also shows up on events listed in your Your events tab, so you can back out of an event from there too.

Emails now go out through Brevo (a free email service) instead of the paid one, and there is a testing toggle that lets the event's author get notified.

The feed now stretches to fill the whole window on wide screens instead of sitting in a narrow column.

Added a Settings entry to the account menu and reworded the prompt that asks if you want new-event emails.

The Accept button is now called Interested: it saves your interest and opens the event page so you can finish signing up, and you can remove your interest from any event you are in.

You can now opt in to short emails when a friend adds a new event. Manage it in Settings, and unsubscribe with a single click.

The Your events tab now shows each event's cover image.

Renamed the internal event-page reader so its name reflects that it handles any event page, not just Luma.
