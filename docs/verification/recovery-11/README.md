# Redesign recovery checkpoint

This is a working checkpoint, not the completed redesign. The homepage follows the newer supplied reference. The shared frame, cream and sage palette, real project photo stack, whole flying ladybug, supplied stacked wordmark, and transparent footer logo are integrated. The cursor closes its wings 500ms after movement stops. The top navigation currently combines Gardens, Projects and Events into Find your garden.

## Browser evidence

[Desktop clip](desktop.mp4) and [phone clip](phone.mp4) show the current public homepage, footer, and actual local project gallery. They use synthetic local preview content. They do not demonstrate backend persistence or the remaining flows.

Separate browser replays cover 390, 900, 1440 and 2560px, light-first presentation, Menu/Pitch focus, role branches, equal photo and copy columns, actual gallery media, drag and keyboard controls, image failures, request cancellation, and distinct loading/error/empty states. The scoped runs recorded no browser exceptions. Eight local store/transport tests also passed. The footer image was checked for actual transparent pixels and rendered against the sage band.

Anonymous Gardens, Events and Blog still return 403 in the local stack. Those are open backend defects, not successful reads. Authenticated gallery and workspace checks must not be treated as proof of anonymous access. The requested Fields Display webfont remains unavailable; the disclosed Georgia fallback remains.

## Still open

- The latest four-tab design, sidebar removal, breadcrumb removal, About reference, and removal of Help, Manifesto and night-mode controls are the next UI unit. They are not included in these clips.
- Calendar, the full three-page RSVP/profile/consent flow, QR attendance and timed Sunday Loop follow-ups remain unfinished.
- Newsletter publication, timeline/archive and organizer tools remain unfinished. Existing provider access is not proof of a completed newsletter workflow.
- The safe public-read contract is reviewed but not implemented. No role permissions, backend schema or live messaging changed in this checkpoint.

Buddy matching is cancelled. No merge, deployment or production visual sign-off is claimed. The earlier clips under `../checkpoint-01/` remain evidence of the first checkpoint before these corrections.
