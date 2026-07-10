# Changelog

Notable changes to Event Radar.
Add an entry when a PR merges. Newest first.
Format: `## vX.Y.Z` heading, date below it, one `**Category**` subheading per area touched, plain-language bullets, then `---` before the older entry.
Categories: Feed, Events API, Notifications, Auth, Infrastructure, Docs (see AGENTS.md).

## v0.4.0

2026-07-09

**Events API**

- You can connect your Luma calendar to Event Radar. Every event you RSVP to on Luma (or host) now flows into the shared feed on its own, so nobody has to paste links to add events. Connect it once in Settings.
- Syncing is safe to run repeatedly: an event already in the feed is skipped, not duplicated, and a Luma feed that is briefly unreachable is reported without breaking anything.

**Feed**

- When you open the app, Event Radar quietly checks your connected Luma calendar for anything new and slips new events into the feed without a reload. It only checks when your last sync is stale, so opening the app often costs nothing extra.

**Infrastructure**

- Added storage for each member's Luma calendar link. The link is treated as a private credential: it is only ever read on the server and never sent back to the browser.

---

## v0.3.1

2026-07-09

**Feed**

- Fixed "Add link" and other dark-filled buttons/pills rendering with invisible white-on-white text in dark mode; their text color now always follows the opposite theme surface, so it stays legible whether the button itself is light or dark.

---

## v0.3.0

2026-07-08

**Feed**

- The Admin tab now has a Users view listing everyone in the program with their admin/pending status and how many events they've added and RSVP'd to.
- Pending sign-ups can be approved straight from the Users view, so admins no longer have to jump to the separate waitlist page to let someone in.

**Auth**

- Admins can promote or demote another user's admin access from the new Users view (you can't change your own).
- A manual admin promotion now survives the next sign-in instead of being silently reverted by the ADMIN_EMAILS allowlist sync.

---

## v0.2.0

2026-07-08

**Auth**

- The app is now invite-only. The signed-out landing page leads with joining the waitlist: signing up saves your spot, and until an admin approves you the app shows a "you're on the list" screen with no events, attendees, or member names. The gate is enforced server-side, so it holds even against direct API calls.
- Everyone already using the app was let in automatically, so no one's feed went dark.
- Once approved, members sign back in with the same account and go straight to the feed -- no second signup.
- Admins get a Waitlist page (linked from Settings) to see who is waiting and approve people one tap.

---

## v0.1.1

2026-07-08

**Feed**

- The Admin tab now reads from the same event list as the rest of the app, so opening it no longer triggers a second identical download and every action refreshes the feed once instead of twice.

**Events API**

- The "did I pass this event" check reuses data the main feed query already fetched instead of running a second query.
- Accept and remove-interest responses now report your pass state correctly instead of always saying "not passed".

**Auth**

- The viewer is looked up once per request instead of twice, and an unchanged Clerk profile no longer rewrites its database row on every request.

**Notifications**

- Removed the temporary self-notify test toggle (NOTIFICATIONS_TEST_INCLUDE_SELF); the person who adds an event is always excluded from its announcement email, as designed.

**Infrastructure**

- Deep cleanup pass: deleted the unused Google Calendar module and two heavyweight unused dependencies (googleapis, cheerio), the leftover card-layout comparison page, an orphaned prisma/ folder, and a few hundred lines of dead helpers, duplicate types, and deprecated aliases.
- Event titles from Luma now have the site suffix stripped consistently for every separator style Luma uses.

**Docs**

- Fixed pointers that led nowhere: a database-safety error message referenced a deleted README section, and AGENTS.md referenced a deleted cursor rule.

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
