# Public access and four-tab checkpoint

These desktop and phone clips show frontend33ca0f0 with reviewed backendb05393f on a copy of the local disposable PostgreSQL database. They show the four top tabs, reference-based home, safe public directories, real project photo cycling, Month/Week Schedule and event dialog, Newsletter entry, About and blended footer logo. There is no sidebar, breadcrumb or theme switch.

The source-only backend follow-up c3dd97a marks two independently verified dependency comments for the PR gate. It changes no runtime behavior. Backend PR is https://github.com/Garden-Steward/steward-bank-hack/pull/3 and must deploy before these new frontend callers.

- [Desktop recording](desktop.mp4)
- [Phone recording](phone.mp4)

Real anonymous routes passed36 browser observations on320/390/1440/2560 with a restrictive zero-grant Public role. The actual3031 preview passed34 desktop/phone observations with anonymous browsing, real UI email sign-in, the same persisted account identity and green badges from its confirmed relation. Separate browser checks cover error/empty/later-page failure, Pacific daylight-saving boundaries and modal focus. Recording responses had no failed resources or page exceptions. Synthetic fixtures are local verification data, not live invitations.

Required pre-PR verification passed build/lint. Run the24 frontend behavior checks with `node --experimental-vm-modules --test tests/*.test.mjs`. The backend required gate passed its build and869tests. Independent review reran58 public-route SQLite checks and two PostgreSQL HTTP regressions. Tests assert safe recursive output, hidden content, exact identities, coarse neighborhood points and finite Blog navigation.

The feature map covers `/`, `/gardens`, `/projects`, `/events`, `/blog`, `/blog/:slug`, `/schedule`, `/newsletter` and `/about`. Public Home owns its featured results. Public and private store collections stay separate. Schedule confirmation reads are authenticated and ask only for id/documentId for the current user. The header's Get involved still opens existing account authentication. Newsletter is the existing Beehiiv entry and Blog link.

Full three-page event signup, private profile/consent, QR attendance, timed SMS follow-up and newsletter publication/archive/admin remain open. No live delivery, account creation, subscription, attendance or production deployment is proved by these clips. Existing detail/private write routes are separate contracts. Buddy matching is canceled. Fields Display's exact webfont is absent; the disclosed heading fallback remains.
