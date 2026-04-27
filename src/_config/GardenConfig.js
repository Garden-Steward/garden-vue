/**
 * GardenConfig
 *
 * Centralized configuration for the manage-garden views.
 * Add, remove, or reorder entries here to update the corresponding UI.
 *
 * Conventions for color classes
 * ─────────────────────────────
 *  - ALWAYS use Tailwind utility classes (e.g. `text-blue-700`,
 *    `bg-violet-600`). Avoid arbitrary values like `text-[#f5f5f5]` —
 *    those are caught by the dark-arbitrary-color override in
 *    `GardenDetail.vue` and will be repainted in light mode.
 *  - ALWAYS provide a `dark:` variant so light + dark themes both look
 *    intentional (mid-tone color in light, washed/pastel in dark).
 *
 * Stat cards (`gardenStatCards`)
 * ──────────────────────────────
 * Each entry is rendered as a clickable summary card on the garden
 * General view. `count(ctx)` receives a context object with the raw
 * reactive data and returns the number to display.
 *
 *   ctx = {
 *     garden,           // gardens store: { attributes: { volunteers: { data: [...] }, ... } }
 *     volunteerDays,    // event store:   { days: [...] }
 *     recurringTasks,   // garden-task store: [...]
 *     smsCampaigns      // sms campaign store: [...]
 *   }
 */
export const gardenStatCards = [
  {
    key: 'volunteers',
    label: 'Volunteers',
    hash: '#volunteers',
    numberClass: 'text-blue-700 dark:text-blue-300',
    count: (ctx) => ctx.garden?.attributes?.volunteers?.data?.length || 0
  },
  {
    key: 'events',
    label: 'Events',
    hash: '#events',
    numberClass: 'text-purple-700 dark:text-purple-300',
    count: (ctx) => ctx.volunteerDays?.days?.length || 0
  },
  {
    key: 'tasks',
    label: 'Tasks',
    hash: '#tasks',
    numberClass: 'text-amber-700 dark:text-amber-300',
    count: (ctx) => ctx.recurringTasks?.length || 0
  },
  {
    key: 'sms',
    label: 'SMS Campaigns',
    hash: '#sms',
    numberClass: 'text-emerald-700 dark:text-emerald-300',
    count: (ctx) => ctx.smsCampaigns?.length || 0
  }
];

/**
 * Campaign type badges
 *
 * Status pills shown next to SMS campaign cards (and anywhere else a
 * campaign type is surfaced). Keys are the normalized type ids
 * (lowercase, hyphenated). `default` is used as a fallback for unknown
 * types.
 */
export const campaignBadgeBaseClasses =
  'inline-block shrink-0 rounded-full uppercase tracking-wide px-2.5 py-2 text-sm font-semibold leading-tight shadow-sm';

export const campaignTypeBadges = {
  rsvp: {
    label: 'RSVP',
    classes:
      'bg-violet-600 text-white border border-violet-800/40 ' +
      'dark:bg-violet-700 dark:text-violet-50 dark:border-violet-900/50'
  },
  'recurring-task': {
    label: 'Recurring',
    classes:
      'bg-emerald-600 text-white border border-emerald-800/40 ' +
      'dark:bg-emerald-900 dark:text-emerald-50 dark:border-emerald-950/60'
  },
  basic: {
    label: 'Basic',
    classes:
      'bg-slate-600 text-white border border-slate-800/40 ' +
      'dark:bg-slate-700 dark:text-slate-50 dark:border-slate-900/60'
  },
  default: {
    label: '',
    classes:
      'bg-emerald-700 text-white border border-emerald-900/40 ' +
      'dark:bg-emerald-800 dark:text-emerald-50 dark:border-emerald-950/60'
  }
};

/** Normalize a raw type ("recurring_task", "RSVP", …) → "recurring-task". */
export function normalizeCampaignType(type) {
  return (type || '').toLowerCase().replace(/_/g, '-');
}

/**
 * Task status options
 *
 * Drives the status dropdown in the GardenTask edit modal (and any other
 * place that needs the canonical set of statuses). Order here is the order
 * shown in the dropdown. `pillClass` is the css class applied to the
 * status pill background — kept as a plain class name so the styles can
 * live alongside the component that renders them.
 */
export const taskStatusOptions = [
  { value: 'INITIALIZED', label: 'Ready',       pillClass: 'gt-status-initialized', darkPillClass: 'gt-status-initialized-darkforce' },
  { value: 'PENDING',     label: 'Pending',     pillClass: 'gt-status-pending',     darkPillClass: 'gt-status-pending-darkforce'     },
  { value: 'STARTED',     label: 'Started',     pillClass: 'gt-status-started',     darkPillClass: 'gt-status-started-darkforce'     },
  { value: 'IN_PROGRESS', label: 'In Progress', pillClass: 'gt-status-started',     darkPillClass: 'gt-status-started-darkforce'     },
  { value: 'FINISHED',    label: 'Finished',    pillClass: 'gt-status-finished',    darkPillClass: 'gt-status-finished-darkforce'    },
  { value: 'ISSUE',       label: 'Issue',       pillClass: 'gt-status-issue',       darkPillClass: 'gt-status-issue-darkforce'       },
  { value: 'SKIPPED',     label: 'Skipped',     pillClass: 'gt-status-skipped',     darkPillClass: 'gt-status-skipped-darkforce'     },
  { value: 'ABANDONED',   label: 'Abandoned',   pillClass: 'gt-status-issue',       darkPillClass: 'gt-status-issue-darkforce'       }
];

export const DEFAULT_TASK_STATUS = 'INITIALIZED';

/** Resolve a status value (case-insensitive) to a config entry, or fall back. */
export function getTaskStatusOption(status) {
  const key = String(status || '').toUpperCase();
  return (
    taskStatusOptions.find((s) => s.value === key) ||
    taskStatusOptions.find((s) => s.value === DEFAULT_TASK_STATUS)
  );
}

/** Full class string (base + variant) for a campaign-type pill. */
export function getCampaignBadgeClasses(type) {
  const key = normalizeCampaignType(type);
  const variant = campaignTypeBadges[key] || campaignTypeBadges.default;
  return `${campaignBadgeBaseClasses} ${variant.classes}`;
}

/**
 * Display label for a campaign-type pill. Falls back to a Title-Cased
 * version of the raw type string when no explicit label is configured.
 */
export function getCampaignTypeLabel(type) {
  if (!type || typeof type !== 'string') return '';
  const key = normalizeCampaignType(type);
  const configured = campaignTypeBadges[key]?.label;
  if (configured) return configured;
  return type
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
