/**
 * Display helpers for the manage Projects tab and its review drawer
 * (Claude Design "Projects Admin", boards 1a–1i).
 */
import { normalizeReviewStatus, resolveProjectStatus } from '@/_config/GardenConfig';

/** Category colours from the design: pill bg/fg, plus a tint and dot pattern for projects with no photo. */
const CATEGORY_LOOK = {
  infrastructure: { bg: '#fed7aa', fg: '#7c2d12', tint: '#fdeedb', dot: '#fdc98f', letterFg: '#7c2d12' },
  art:            { bg: '#fb923c', fg: '#ffffff', tint: '#feeadb', dot: '#fdba8c', letterFg: '#c2410c' },
  event:          { bg: '#fcd34d', fg: '#451a03', tint: '#fdf3d3', dot: '#fbd96f', letterFg: '#451a03' },
  education:      { bg: '#14b8a6', fg: '#ffffff', tint: '#d5f3ef', dot: '#7fd8cc', letterFg: '#0f766e' },
  planting:       { bg: '#86efac', fg: '#052e16', tint: '#dcf5e3', dot: '#86efac', letterFg: '#052e16' },
  community:      { bg: '#0ea5e9', fg: '#ffffff', tint: '#dbf0fb', dot: '#8fd3f5', letterFg: '#0369a1' },
  default:        { bg: '#e7e5e4', fg: '#292524', tint: '#f3ece0', dot: '#dcd3c0', letterFg: '#57534e' }
};

export function categoryLook(category) {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_LOOK[key] || CATEGORY_LOOK.default;
}

/** Background for a thumbnail or hero: the photo if there is one, else the category's dot pattern. */
export function imageStyle(project, { hero = false } = {}) {
  const look = categoryLook(project?.category);
  const img = project?.hero_image;
  const url = hero
    ? (img?.formats?.large?.url || img?.formats?.medium?.url || img?.url)
    : (img?.formats?.thumbnail?.url || img?.formats?.small?.url || img?.url);
  if (url) {
    return { backgroundColor: look.tint, backgroundImage: `url("${url}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  const r = hero ? 2.5 : 2;
  return {
    backgroundColor: look.tint,
    backgroundImage: `radial-gradient(circle, ${look.dot} 0 ${r}px, transparent ${r + 0.5}px)`,
    backgroundSize: hero ? '22px 22px' : '10px 10px'
  };
}

export const hasPhoto = (project) => !!project?.hero_image?.url;

const AVATAR_COLORS = [
  ['#c8dbbf', '#064e3b'],
  ['#F9E2D1', '#7c3a12'],
  ['#8aa37c', '#14281a'],
  ['#fed7aa', '#7c2d12'],
  ['#f3ece0', '#376451'],
  ['#376451', '#f7f1e3']
];

export function personName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || '';
}

export function firstName(user) {
  return user?.firstName || personName(user).split(' ')[0] || 'the pitcher';
}

export function initials(user) {
  const name = personName(user);
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Stable avatar colours per person, so the same pitcher looks the same everywhere. */
export function avatarStyle(user) {
  const key = String(user?.id ?? personName(user));
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR_COLORS[h % AVATAR_COLORS.length];
  return { backgroundColor: bg, color: fg };
}

const DAY = 24 * 60 * 60 * 1000;

/** "just now", "3 days ago", "2 weeks ago". */
export function timeAgo(value) {
  if (!value) return '';
  const ms = Date.now() - new Date(value).getTime();
  if (ms < 60 * 1000) return 'just now';
  if (ms < 60 * 60 * 1000) {
    const m = Math.round(ms / 60000);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (ms < DAY) {
    const h = Math.round(ms / 3600000);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(ms / DAY);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? '1 week ago' : `${w} weeks ago`;
  }
  return shortDate(value);
}

export function daysWaiting(value) {
  if (!value) return 0;
  return Math.floor((Date.now() - new Date(value).getTime()) / DAY);
}

/** "Waiting 3 days" / "Waiting 2 weeks". */
export function waitingLabel(value) {
  const days = daysWaiting(value);
  if (days < 1) return 'New today';
  if (days < 14) return `Waiting ${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `Waiting ${Math.floor(days / 7)} weeks`;
  return `Waiting ${Math.floor(days / 30)} months`;
}

export function shortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', year: 'numeric' });
}

/** "Sat Oct 10" for a linked volunteer day. */
export function dayChip(event) {
  const when = event?.startDatetime;
  if (!when) return event?.title || 'Volunteer day';
  return new Date(when).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');
}

/** Which tab of the Projects list a project belongs to. */
export function reviewTab(project) {
  switch (normalizeReviewStatus(project?.review_status)) {
    case 'CREATED': return 'review';
    case 'CHANGES_REQUESTED': return 'waiting';
    case 'APPROVED': return 'active';
    case 'COMPLETED': return 'completed';
    default: return 'archived';
  }
}

const STAGE_COLORS = {
  Planning:  ['#F9E2D1', '#7c3a12'],
  Building:  ['#F5C430', '#3d2c00'],
  Tending:   ['#8aa37c', '#14281a'],
  Completed: ['#c8dbbf', '#064e3b'],
  Archived:  ['#3d4d36', '#d0d0d0'],
  Denied:    ['#3d4d36', '#d0d0d0']
};

/** Stage pill for the non-pending tabs. */
export function stageOf(project) {
  const status = normalizeReviewStatus(project?.review_status);
  const label = status === 'COMPLETED' ? 'Completed'
    : status === 'ARCHIVED' ? 'Archived'
    : status === 'REJECTED' ? 'Denied'
    : resolveProjectStatus(project) || 'Planning';
  const [bg, fg] = STAGE_COLORS[label] || STAGE_COLORS.Planning;
  return { label, style: { backgroundColor: bg, color: fg } };
}
