# Garden Steward — Design Guide

The design system for garden-vue, written so any person or coding agent (Claude, Codex,
Cursor, Copilot, whoever) can build screens that look like they belong. The source of truth
for values is `tailwind.config.js`; this file explains how to use them.

**The one-line brief:** earthy, grounded, warm, purposeful. The brand steps back and lets the
land, the people and the content speak. Nothing should feel like marketing.

---

## Color

Use the Tailwind tokens below. **Don't introduce new hex values or arbitrary classes like
`bg-[#2d3e26]`** — if you need a color that isn't here, that's a design conversation, not a
code change.

| Role | Hex | Tailwind class | Use it for |
|---|---|---|---|
| Sage (primary) | `#8aa37c` | `bg-primary` / `bg-custom-green` | Light-mode page background, borders, accents |
| Sage dark | `#6c8a6a` | `bg-darker-green` | Hover states, muted elements, secondary borders |
| Forest (logo green) | `#376451` | `bg-darkest-green`, `forest-hero` | Display headings, text on cream, title bands |
| Deep emerald | `#064e3b` | `bg-emerald-900` | Primary buttons, active nav, links, interactive elements |
| Forest page | `#344a34` | `bg-forest-page` | Dark-mode page background, feature/media blocks |
| Forest panel | `#2d3e26` | `bg-forest-panel` | Dark-mode cards and surfaces |
| Forest border | `#3d4d36` | `border-forest-border` | Borders on dark surfaces |
| Cream | `#f7f1e3` | `bg-custom-light` | Cards, nav bar, light surfaces (nav stays cream in dark mode) |
| Cream light | `#f3ece0` | `bg-custom-lighter` | Inner panels, alternating rows |
| Peach | `#F9E2D1` | `bg-custom-peach` | Soft callouts, warm highlights |
| Burnt orange | `#C2410C` | `bg-dark-orange` | The single most urgent action on a view — **max one per view** |
| Lemon gold | `#F5C430` | — | Logo only. Not a UI color. |
| Body gray | `#4b5563` | `text-gray-600` | Body copy, captions, meta text |

**Text on dark surfaces** (`forest-panel` / `forest-page`) uses the ink ramp, all of which
pass WCAG AA:

| Class | Hex | Use |
|---|---|---|
| `text-forest-ink` | `#f5f5f5` | Headings, primary text |
| `text-forest-ink-muted` | `#d0d0d0` | Body copy, secondary labels |
| `text-forest-ink-subtle` | `#a8b89e` | Captions, helper text |

**Background rhythm**

- Light mode: page = sage, cards = cream, nav = cream.
- Dark mode: page = forest-panel (or forest-page), cards = forest-panel, nav = cream.
- Dark mode is class-based (`darkMode: 'class'` → `.dark` on `<html>`). Write both:
  `bg-custom-light dark:bg-forest-panel text-gray-800 dark:text-forest-ink`.

**Contrast:** any text must clear 4.5:1 (3:1 for large display type). White on sage fails —
don't put white text on `bg-primary`. For a white-text title band use `forest-hero` →
`forest-hero-end`.

---

## Typography

Both fonts are loaded in `index.html` from Google Fonts.

| Role | Font | Size | Weight | Color |
|---|---|---|---|---|
| Hero / cover | Playfair Display | 36–42px | 800 | Cream on sage or forest |
| H1 page title | Playfair Display | 28–32px | 700 | `#064e3b` |
| H2 section | Playfair Display | 20–24px | 700 | `#376451` |
| H3 sub-section | Roboto | 16px | 700 | `#064e3b` |
| Body | Roboto | 15–16px | 400 | `#1a1a1a` or `#4b5563` |
| Nav links | Roboto | 16px | 400 | `#376451` |
| Labels (uppercase) | Roboto | 11–12px | 700 | `#064e3b` |
| Captions | Roboto | 12px | 400 italic | `#4b5563` |
| Button text | Roboto | 15–16px | 700 | White |

- Playfair is a display face: headings, pull quotes, manifesto text. Never body copy, never
  below 14px.
- Use `font-family: 'Playfair Display', Georgia, serif` (that's the pattern in
  `src/assets/garden-public.css`). Roboto is the default body face.
- `tailwind.config.js` also defines Pacifico, Montserrat, Righteous, Lato and Raleway. Those
  are legacy — don't use them in new work.

---

## Components

Reuse what exists before building new. Look in:

- `src/components/` — shared pieces (`PageHeader`, `LoadingSpinner`, `Alert`, `Toggle`,
  `LeafletMap`, `GardenSidebar`, `ManageLayout`, etc.)
- `src/components/form/` — `TextInput`, `DropDown`, `Switch`, `ImageUpload`, `MediaSelector`
- `src/components/modals/` — modal patterns; copy the structure of an existing one
- `src/components/icons/` — SVG icons; Font Awesome 6 is also available (`fa-solid fa-…`)

### Patterns

**Primary button** — deep emerald, pill, white bold text.

```html
<button class="bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-full px-5 py-2">
  RSVP for Saturday
</button>
```

**Urgent button** — burnt orange, same shape. One per view at most.

```html
<button class="bg-dark-orange hover:bg-orange-800 text-white font-bold rounded-full px-5 py-2">
  Water today
</button>
```

**Card**

```html
<div class="bg-custom-light dark:bg-forest-panel border border-[#c8d0c0] dark:border-forest-border
            rounded-lg p-5 text-gray-900 dark:text-forest-ink-muted">
  …
</div>
```

**Feature / media block** — the dark forest block used for audio players and CTAs.

```html
<div class="bg-forest-page rounded-lg p-6 text-center text-custom-light">…</div>
```

**Section heading**

```html
<h2 class="text-2xl font-bold text-darkest-green mb-2" style="font-family:'Playfair Display',Georgia,serif">
  Steward the land
</h2>
```

**Divider:** `border-t border-primary`.

### Layout and interaction

- Mobile first. Most volunteers arrive from an SMS link on a phone; every screen must work at
  375px wide with no horizontal scroll.
- Tap targets at least 44×44px.
- Rounded corners: `rounded-lg` (8px) for cards, `rounded-full` for buttons and chips.
- Every async view needs a loading state (`LoadingSpinner`), an empty state, and an error
  state.

---

## Logo

Files in `public/`: `gs-logo-name.png` (mark + wordmark), `gs-logo.png` (mark only),
`gs-twitter-card.png`, favicons.

Two colorways: cream line art on sage, or forest-green line art on cream. Don't recolor,
stretch, or put it on a busy photo.

---

## Voice

Every string — headlines, buttons, empty states, errors — should sound like one community.

**Do**

- Be specific and physical: "this garden", "Ivy Hill", "14 native plants".
- Say "we". It's a community voice, not a founder's brand.
- Lead with action: "Come get your hands dirty Saturday."
- Let the land be the subject.

**Don't**

| Instead of | Write |
|---|---|
| "Excited to announce…" | Just announce it |
| "Seamless", "frictionless" | Say what it does |
| "Sustainable" | Regenerative, restorative, biodiverse |
| "Impact" | What happened: land restored, volunteers fed, species returned |
| "Community" on its own | Which community, on which land |

**By surface**

- UI labels: clear and brief — "RSVP · Mark complete · 3 volunteers"
- Event copy: welcoming — "Come get your hands dirty Saturday. All skill levels."
- Errors: warm, not alarming, and say what to do — "Couldn't load that garden. Try refreshing."
- Empty states: an invitation — "No tasks yet. Add the first one."

---

## Before you call a screen done

- [ ] Colors come only from the tokens above; no new hex values or arbitrary color classes
- [ ] Headings in Playfair Display, body in Roboto
- [ ] Primary actions are emerald pills with white text; at most one burnt-orange button
- [ ] Works in light **and** dark mode
- [ ] Text passes contrast (no white on sage)
- [ ] Works at 375px wide; tap targets ≥ 44px
- [ ] Loading, empty and error states exist
- [ ] Copy is specific and grounded; no corporate filler
