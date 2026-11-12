# AGENTS.md — garden-vue

Instructions for coding agents (Codex, Claude Code, Cursor, Copilot, Aider…) and the humans
driving them. `CLAUDE.md` just points here, so this is the one file to keep current.

**Read `DESIGN.md` before touching anything visual.** It has the color tokens, type,
component patterns and copy voice.

## What this is

garden-vue is the web frontend for **Garden Steward** (steward.garden): SMS-first software
for running public, foragable community gardens — volunteer days, watering schedules,
tasks, projects, plants. It's been in use with the Oakland Urban Farming Project since 2022.

The backend is **steward-bank** (Strapi v5), a separate repo:
`Garden-Steward/steward-bank` (hackathon fork `steward-bank-hack`). Most volunteers reach the app from a
text message link on their phone, so mobile matters more than desktop.

## Setup

```bash
nvm use            # Node 22 (see .nvmrc)
yarn install       # yarn.lock is the lockfile; don't add a package-lock.json
echo "VITE_API_URL=http://localhost:1337" > .env.local
yarn dev           # http://localhost:3030
```

To run against a local backend, start steward-bank first (see its AGENTS.md). Its seed
scripts create test gardens, users and permissions.

## Commands

| Task | Command |
|---|---|
| Dev server | `yarn dev` (port 3030) |
| Production build | `yarn build` — run it before opening a PR |
| Lint | `npx eslint <changed files> --no-fix` (`yarn lint` auto-fixes the whole repo; prefer targeted) |
| Preview build | `yarn preview` |

There's no frontend test suite. "Done" means: it builds, lints clean, and you looked at it in
a browser in light and dark mode at phone width.

**Don't run `yarn deploy`.** Deploys go through the maintainer.

## Stack and layout

Vue 3 (mostly Composition API, `<script setup>`), Pinia, Vue Router 4, Vite, Tailwind 3,
plain JavaScript (no TypeScript). `@/` aliases `src/`.

```
src/
  views/        route-level pages (router in helpers/router.js)
  components/   shared components; form/, modals/, icons/, auth/
  stores/       one Pinia store per domain (gardens, event, garden-task, projects, …)
  helpers/      fetch-wrapper.js (API calls), strapi.js, router.js, utils
  assets/       base.css, garden-public.css (public garden pages)
public/         logos, favicons, podcast.xml
```

## Conventions

- **API calls go through stores, and stores use `fetchWrapper`** (`src/helpers/fetch-wrapper.js`).
  Don't call `fetch` from components. Copy the shape of a neighboring store.
- `fetchWrapper` **logs the user out on any 401 or 403**. If your feature hits an endpoint a
  user may not have permission for, the backend should return 404, not 403, or you'll boot
  people out of the app.
- Strapi v5 uses `documentId` (string) as the public ID, not numeric `id`. Populate params are
  validated strictly; an invalid `populate[...]` breaks the whole request.
- New page → add a view in `src/views/` and a route in `src/helpers/router.js`.
- Styling: Tailwind utility classes with the tokens in `tailwind.config.js` (see
  `DESIGN.md`). No new hex values, no arbitrary color classes, no new fonts.
- Dark mode is class-based: always pair light classes with `dark:` variants.
- Keep components small; if a view passes ~400 lines, pull pieces into `components/`.
- Match the existing code style of the file you're in (some older files use Options API —
  don't rewrite them unless that's the task).

## Privacy

Volunteers' phone numbers, emails and exact locations are sensitive.

- Never render a phone number or email to anyone but managers of that garden.
- Approximate-location logic lives in `src/helpers/location-privacy.js`; use it, don't
  bypass it.
- Never commit `.env*` files, tokens or real user data.

## Working in the hackathon

- Branch from `main`: `feat/<short-name>` or `fix/<short-name>`. One feature per PR.
- Small commits, imperative messages: `feat: add RSVP count to event card`.
- If a feature needs backend changes, write down the API contract (endpoint, method, request
  and response JSON, error codes) in the PR description **before** building either side,
  and link the matching steward-bank PR.
- PR description: what changed, a screenshot (phone width, light + dark if visual), how you
  tested, anything you skipped.
- Don't refactor code outside your feature, and don't bump dependencies unless that's the
  task.

## When you're unsure

Pick the smallest change that does the job, say what you assumed in the PR, and keep going.
Ask a maintainer before: changing auth or login flows, anything touching SMS sending, schema
changes, or deleting files you didn't create.
