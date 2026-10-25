# Current Home, account dialog and calendar download

These clips record frontend `6ae0729` and reviewed backend runtime `b05393f` against a copy of the disposable local PostgreSQL database. They supersede the recovery-17 clips for the Home cards, account dialog and calendar-file action. Backend PR #3's final `c3dd97a` adds comment markers only.

- [Desktop recording](desktop.mp4)
- [Phone recording](phone.mp4)

Both recordings show the real local Home cards, the four requested top tabs, the phone and email sign-in entry, public Gardens and Projects, keyboard photo cycling, Month/Week Schedule, a saved calendar download, Newsletter entry, About and footer. No credentials are entered. Every observed resource completed without an error response, and neither recording produced a page exception.

The calendar file includes the event's actual start, title and public details. It has no guessed end or duration. The button says “Calendar file · start time only.” Separate live browser checks saved and inspected nine downloads across mouse, Enter and Space at 1440, 390 and 320 pixels. Provider import and calendar-account writes remain unverified.

The required clean-checkout gate passed build, lint and all 38 behavior tests on `6ae0729`. Run the behavior tests with Node 22 and `npm test`. Independent review covered calendar encoding, download cleanup, keyboard focus and the five private-page style changes. Separate browser checks covered 15 real signed-in page/width combinations. Those private screenshots stay local because they can include account data. A read-only duplicate-garden count bug remains open.

## Feature map

The public Home `/` uses real upcoming event records and advances its clock while mounted. `/gardens` and `/projects` use separate public collections. Project photo stacks keep their mouse and keyboard controls. `/events` and `/schedule` use the bounded public event feed. The Schedule dialog preserves keyboard focus after a download. `/d/:id` shares the calendar-file action. `/blog` and `/blog/:slug` use safe public entries. `/newsletter` links to the existing Beehiiv signup. `/about` follows the supplied community reference. The header has Find your garden, Schedule, Newsletter and About. There is no sidebar, workspace breadcrumb or theme control.

Actual account authentication and persisted Confirmed badges have separate local browser proof. Opening Get involved in these clips does not create an account or confirm an RSVP. Public output and old-token compatibility have separate backend HTTP checks. Backend PR https://github.com/Garden-Steward/steward-bank-hack/pull/3 must deploy before the new public frontend callers.

## Remaining work

The full event signup and profile flow, consent, QR attendance, timed follow-up and in-app newsletter publication/archive/admin remain open. Their new contracts have not been enabled. The existing account dialog and Beehiiv link are partial entry points. No subscription, delivery, attendance, new account or production deployment is claimed. Buddy is canceled. The exact Fields Display webfont remains unavailable, so the disclosed Georgia fallback remains.
