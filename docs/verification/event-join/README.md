# Verified event registration and project interest

Watch the actual [desktop registration](desktop.mp4), [phone registration](phone.mp4) and [project-interest retry](project-interest.mp4) recordings. Only synthetic contacts and events appear. Email delivery uses a captured dry-run transport. No real email or text was sent.

The registration clips use frontend application source `d6b3d60`. The project clip uses `21ae67d`, which adds the project caller closure. Both use backend `e9fdd65`, reviewed in [backend PR10](https://github.com/Garden-Steward/steward-bank-hack/pull/10). The [manifest](manifest.json) records exact commits and video hashes. The subsequent evidence commit changes documentation and recordings only.

The required clean-source gate passed the build, lint and 52 tests at `21ae67d`. Independent source and comments reviews passed for registration and the project caller closure. Real browser checks covered required phone, exact raw contact round trips, all three pages, wrong-code refusal, verified account creation and saved Schedule confirmation at 1440px and 390px. Separate checks covered explicit saved-profile reuse, email recovery, Escape focus, canceling a delayed successful login, retrying a lost resend response with the same command, and clearing the token on logout/reload.

Backend verification separately passed the build and 1,042 tests. Actual PostgreSQL checks covered 50 simultaneous completions, native COMMIT rollback, profile conflict handling, the final eligibility fence, restart persistence and the legacy-authority rollback guard. These are database and source checks, not a claim of live delivery.

The mapped flows are:

- `/d/:id`, `/gardens/:slug` and `/manage` open the same registration dialog for guests and signed-in people. Name, email and phone are required. A saved profile is loaded only after sign-in and an explicit reuse action.
- Page two uses current server choices and an event-only private access request. Page three reviews the answers, offers reusable-profile saving and discloses automatic account newsletter enrollment. Existing newsletter opt-outs remain authoritative.
- Email verification remains pending until the server confirms the receipt. Joining grants no general text permission. A repeated successful command does not create another session.
- `/schedule` reads the current account’s own participation receipts. A confirmed RSVP gives a badge; it does not prove attendance. Get involved opens Schedule to choose an actual event.
- Header Sign in supports verified-email codes and existing phone/password accounts. Closing or replacing a dialog fences late responses. Logout removes both the user snapshot and token.
- `/gardens/:gardenSlug/p/:projectSlug` and `/projects` use an explicit project-interest confirmation. Guests sign in first. The request contains no typed contact fields. Retrying a committed response adds interest idempotently, and the existing count is patched without a full-list reload.
- `/manage/events/:id/edit` shows the canonical registration count. It does not render the retired full confirmed-user relation.

This checkpoint does not finish QR check-in, verified phone consent, follow-up texts, newsletter publishing, the unified discovery page or the remaining layout work. The garden detail loader still has legacy protected-context requests to replace. No deployment or merge occurred. Existing calendar/provider and ladybug recordings remain in [calendar-23](../calendar-23/README.md).
