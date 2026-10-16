
/*
 * Event brief: what to expect, how the day goes, what to bring.
 *
 * The backend stores it as an `events.brief` component on a recurring
 * template (the series) and optionally on a single event (an override, field
 * by field). These helpers convert between the component as Strapi returns it
 * and the plain state the editors work on, and back into a write payload.
 */

export const BRIEF_TEXT_FIELDS = ['what_to_expect', 'good_for', 'food', 'duration_text'];
export const BRIEF_LIST_FIELDS = ['agenda', 'bring_items'];

const str = (v) => (v == null ? '' : String(v));
const blankToNull = (v) => {
  const s = str(v).trim();
  return s === '' ? null : s;
};

export function emptyBrief() {
  return { what_to_expect: '', agenda: [], bring_items: [], good_for: '', food: '', duration_text: '' };
}

/** Editable state from a component row (or a resolved brief, or null). */
export function briefToState(row) {
  const b = row || {};
  return {
    what_to_expect: str(b.what_to_expect),
    agenda: (Array.isArray(b.agenda) ? b.agenda : []).map((s) => ({
      time_text: str(s.time_text), label: str(s.label), detail: str(s.detail),
    })),
    bring_items: (Array.isArray(b.bring_items) ? b.bring_items : []).map((i) => ({
      label: str(i.label), provided_by: i.provided_by === 'garden' ? 'garden' : 'volunteer',
    })),
    good_for: str(b.good_for),
    food: str(b.food),
    duration_text: str(b.duration_text),
  };
}

/**
 * Write payload for the `brief` component: blanks become null, rows without
 * a label are dropped, component ids are never sent (so lists are replaced).
 * Returns null when nothing is filled in, which clears the component.
 */
export function briefToPayload(state) {
  if (!state) return null;
  const out = {
    what_to_expect: blankToNull(state.what_to_expect),
    agenda: (state.agenda || [])
      .filter((s) => blankToNull(s.label))
      .map((s) => ({ time_text: blankToNull(s.time_text), label: blankToNull(s.label), detail: blankToNull(s.detail) })),
    bring_items: (state.bring_items || [])
      .filter((i) => blankToNull(i.label))
      .map((i) => ({ label: blankToNull(i.label), provided_by: i.provided_by === 'garden' ? 'garden' : 'volunteer' })),
    good_for: blankToNull(state.good_for),
    food: blankToNull(state.food),
    duration_text: blankToNull(state.duration_text),
  };
  return briefHasContent(out) ? out : null;
}

export function briefHasContent(brief) {
  if (!brief) return false;
  return BRIEF_TEXT_FIELDS.some((f) => blankToNull(brief[f]) != null)
    || (brief.agenda || []).some((s) => blankToNull(s.label))
    || (brief.bring_items || []).some((i) => blankToNull(i.label));
}

/** Same content, ignoring whitespace, ids and empty rows. */
export function briefEquals(a, b) {
  return JSON.stringify(briefToPayload(a)) === JSON.stringify(briefToPayload(b));
}

/* ---------- Garden visit info ---------- */

export const VISIT_FIELDS = [
  { key: 'meeting_spot', label: 'Where to meet', placeholder: 'e.g. The front gate', short: true },
  { key: 'meeting_note', label: 'Finding us', placeholder: "e.g. Look for the windmill. Late? Follow the voices to the back beds." },
  { key: 'parking_transit', label: 'Parking & transit', placeholder: 'e.g. Street parking is easy on Sunday mornings. Bike rack inside the gate.' },
  { key: 'restroom', label: 'Restroom', placeholder: 'e.g. None on site. The café on the corner lets volunteers use theirs.' },
  { key: 'accessibility', label: 'Accessibility', placeholder: 'e.g. Main paths are level mulch. Seated tasks are always available.' },
  { key: 'kids_pets', label: 'Kids & pets', placeholder: 'e.g. Kids welcome with a grown-up. Dogs on leash, please.' },
];

export function visitToState(row) {
  const v = row || {};
  return Object.fromEntries(VISIT_FIELDS.map((f) => [f.key, str(v[f.key])]));
}

export function visitToPayload(state) {
  const out = Object.fromEntries(VISIT_FIELDS.map((f) => [f.key, blankToNull(state?.[f.key])]));
  return Object.values(out).some((v) => v != null) ? out : null;
}

/* ---------- Starter briefs ---------- */

let startersPromise = null;

/**
 * Garden Steward's starter brief per event type, from the backend. Cached for
 * the session; resolves to {} if the backend doesn't have the route yet.
 *
 * Plain fetch, not fetchWrapper: on an older backend this path falls through
 * to the core findOne route and can 403, and fetchWrapper logs the user out
 * on any 403. A missing starter list should never sign a manager out.
 */
export function fetchBriefStarters() {
  if (!startersPromise) {
    startersPromise = fetch(`${import.meta.env.VITE_API_URL}/api/volunteer-days/brief-starters`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((res) => res?.data || {})
      .catch(() => {
        startersPromise = null;
        return {};
      });
  }
  return startersPromise;
}

export const EVENT_TYPE_OPTIONS = [
  { value: 'general', label: 'Workday' },
  { value: 'land_work', label: 'Land work' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'art', label: 'Art day' },
  { value: 'workshop', label: 'Workshop' },
];
