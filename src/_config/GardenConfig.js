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
 *     recurringTasks,   // garden-task store: recurring templates only (not used for Tasks stat)
 *     gardenTasks,      // garden-task store: `/api/garden-tasks` for this garden (active task rows)
 *     smsCampaigns      // sms campaign store: [...]
 *   }
 */

/** Statuses counted on the General "Tasks" stat (garden-task rows, not recurring templates). */
export const gardenTaskStatActiveStatuses = [
  'INITIALIZED',
  'PENDING',
  'INTERESTED',
  'STARTED',
  'IN_PROGRESS'
];

/** Count `/api/garden-tasks` rows in any of the “active work” statuses above. */
export function countGardenTasksForStatCard(gardenTasks) {
  const list = Array.isArray(gardenTasks) ? gardenTasks : [];
  const allowed = new Set(gardenTaskStatActiveStatuses.map((s) => s.toUpperCase()));
  return list.filter((t) => {
    const s = String(t?.status ?? '').trim().toUpperCase();
    return allowed.has(s);
  }).length;
}

export const gardenStatCards = [
  {
    key: 'volunteers',
    label: 'Volunteers',
    hash: '#volunteers',
    numberClass: 'text-blue-700 dark:text-blue-300',
    count: (ctx) => ctx.garden?.volunteers?.length || 0
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
    count: (ctx) => countGardenTasksForStatCard(ctx.gardenTasks)
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
  poll: {
    label: 'Poll',
    classes:
      'bg-amber-500 text-white border border-amber-700/40 ' +
      'dark:bg-amber-600 dark:text-amber-50 dark:border-amber-800/50'
  },
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

/** Normalize recurring task type string → config key (`Water` → `water`). */
export function normalizeRecurringTaskType(type) {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

/**
 * Recurring task type pills (GardenTaskList cards, etc.)
 *
 * Keys match `taskTypes` in GardenTask.vue (`General`, `Water`, …).
 * Uses standard Tailwind palettes with explicit `dark:` variants.
 */
export const recurringTaskTypeBadgeBaseClasses =
  'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold leading-tight shadow-sm border';

export const recurringTaskTypeBadges = {
  general: {
    label: 'General',
    classes:
      'bg-stone-100 text-stone-800 border-stone-300/70 ' +
      'dark:bg-stone-700 dark:text-stone-100 dark:border-stone-600/70'
  },
  water: {
    label: 'Water',
    classes:
      'bg-sky-100 text-sky-900 border-sky-300/70 ' +
      'dark:bg-sky-900 dark:text-sky-50 dark:border-sky-700/70'
  },
  weeding: {
    label: 'Weeding',
    classes:
      'bg-lime-100 text-lime-900 border-lime-300/70 ' +
      'dark:bg-lime-900 dark:text-lime-50 dark:border-lime-700/70'
  },
  planting: {
    label: 'Planting',
    classes:
      'bg-emerald-100 text-emerald-900 border-emerald-300/70 ' +
      'dark:bg-emerald-900 dark:text-emerald-50 dark:border-emerald-700/70'
  },
  harvest: {
    label: 'Harvest',
    classes:
      'bg-amber-100 text-amber-900 border-amber-300/70 ' +
      'dark:bg-amber-900 dark:text-amber-50 dark:border-amber-700/70'
  },
  default: {
    label: '',
    classes:
      'bg-teal-100 text-teal-900 border-teal-300/70 ' +
      'dark:bg-teal-900 dark:text-teal-50 dark:border-teal-700/70'
  }
};

/** Resolve API type string → badge classes (base + light/dark palette). */
export function getRecurringTaskTypeBadgeClasses(type) {
  const normalized = normalizeRecurringTaskType(type);
  const key =
    normalized && recurringTaskTypeBadges[normalized]
      ? normalized
      : normalized
        ? 'default'
        : 'general';
  const variant = recurringTaskTypeBadges[key];
  return `${recurringTaskTypeBadgeBaseClasses} ${variant.classes}`;
}

/** Label shown in the pill (matches configured types or title-cases unknown values). */
export function getRecurringTaskTypeDisplayLabel(type) {
  const normalized = normalizeRecurringTaskType(type);
  const configured =
    normalized && recurringTaskTypeBadges[normalized]?.label;
  if (configured) return configured;
  const raw = String(type ?? '').trim();
  if (!raw) return recurringTaskTypeBadges.general.label;
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Normalize a raw type ("recurring_task", "RSVP", …) → "recurring-task". */
export function normalizeCampaignType(type) {
  return (type || '').toLowerCase().replace(/_/g, '-');
}

/**
 * Project category badges
 *
 * Pills shown on project cards (dashboard "My projects", Pitch a Project
 * category picker). Keys match the `categoryOptions` in Project.vue
 * (`Infrastructure`, `Art`, …). Colors follow the Pitch a Project mockup.
 */
export const projectCategoryBadgeBaseClasses =
  'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-semibold leading-tight shadow-sm border';

export const projectCategoryBadges = {
  infrastructure: {
    label: 'Infrastructure',
    classes:
      'bg-orange-200 text-orange-900 border-orange-300/70 ' +
      'dark:bg-orange-900/70 dark:text-orange-50 dark:border-orange-700/70'
  },
  art: {
    label: 'Art',
    classes:
      'bg-orange-400 text-white border-orange-500/70 ' +
      'dark:bg-orange-700 dark:text-orange-50 dark:border-orange-600/70'
  },
  event: {
    label: 'Event',
    classes:
      'bg-amber-300 text-amber-950 border-amber-400/70 ' +
      'dark:bg-amber-700 dark:text-amber-50 dark:border-amber-600/70'
  },
  education: {
    label: 'Education',
    classes:
      'bg-teal-500 text-white border-teal-600/70 ' +
      'dark:bg-teal-800 dark:text-teal-50 dark:border-teal-700/70'
  },
  planting: {
    label: 'Planting',
    classes:
      'bg-green-400 text-green-950 border-green-500/70 ' +
      'dark:bg-green-800 dark:text-green-50 dark:border-green-700/70'
  },
  community: {
    label: 'Community',
    classes:
      'bg-sky-500 text-white border-sky-600/70 ' +
      'dark:bg-sky-800 dark:text-sky-50 dark:border-sky-700/70'
  },
  default: {
    label: '',
    classes:
      'bg-stone-200 text-stone-800 border-stone-300/70 ' +
      'dark:bg-stone-700 dark:text-stone-100 dark:border-stone-600/70'
  }
};

/** Project category options (value/label), shared by the pitch form + filters. */
export const projectCategoryOptions = [
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Art', label: 'Art' },
  { value: 'Event', label: 'Event' },
  { value: 'Education', label: 'Education' },
  { value: 'Planting', label: 'Planting' },
  { value: 'Community', label: 'Community' }
];

/** Resolve a project category string → badge classes (base + light/dark palette). */
export function getProjectCategoryBadgeClasses(category) {
  const key = String(category || '').trim().toLowerCase();
  const variant = projectCategoryBadges[key] || projectCategoryBadges.default;
  return `${projectCategoryBadgeBaseClasses} ${variant.classes}`;
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

/** Strapi `recurring-task.scheduler_type` enum values (extend if the API adds more). */
export const recurringSchedulerTypes = [
  'No Schedule',
  'Weekly Shuffle'
];

/** Strapi `recurring-task.week_start_date` — first day of the scheduling week. */
export const weekStartDayOptions = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

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
