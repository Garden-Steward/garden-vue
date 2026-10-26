export const scheduleTimeZone = 'America/Los_Angeles';
const dayMilliseconds = 86400000;
const pacificParts = new Intl.DateTimeFormat('en-US', {
    timeZone: scheduleTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

export function pacificDateKey(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('An event has an invalid date.');
    const parts = Object.fromEntries(pacificParts.formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function civilDate(key) {
    if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Invalid calendar date.');
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (civilKey(date) !== key) throw new Error('Invalid calendar date.');
    return date;
}

export function civilKey(date) {
    return date.toISOString().slice(0, 10);
}

export function shiftCalendar(key, view, direction) {
    const date = civilDate(key);
    if (view === 'week') return civilKey(new Date(date.getTime() + direction * 7 * dayMilliseconds));
    return civilKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + direction, 1, 12)));
}

export function calendarDays(key, view) {
    const anchor = civilDate(key);
    let first = anchor;
    let count = 7;
    if (view === 'month') {
        first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1, 12));
        const length = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 12)).getUTCDate();
        const offset = (first.getUTCDay() + 6) % 7;
        count = Math.ceil((offset + length) / 7) * 7;
    }
    const offset = (first.getUTCDay() + 6) % 7;
    const start = first.getTime() - offset * dayMilliseconds;
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(start + index * dayMilliseconds);
        return {
            key: civilKey(date),
            day: date.getUTCDate(),
            date,
            outside: date.getUTCMonth() !== anchor.getUTCMonth()
        };
    });
}

async function readSchedulePages(requestPage, isCurrent) {
    const entries = new Map();
    let expectedTotal;
    let expectedPages;
    for (let page = 1; page <= 1000; page += 1) {
        const result = await requestPage(page, 100);
        if (!isCurrent()) return null;
        const pagination = result?.meta?.pagination;
        if (!Array.isArray(result?.data) || !pagination) throw new Error('The event feed returned an invalid response.');
        const { page: returnedPage, pageSize, pageCount, total } = pagination;
        if (!Number.isInteger(returnedPage) || returnedPage !== page || pageSize !== 100 ||
            !Number.isInteger(pageCount) || !Number.isInteger(total) || total < 0 || total > 100000 ||
            pageCount !== Math.ceil(total / 100) || result.data.length > 100) {
            throw new Error('The event feed returned invalid pagination.');
        }
        if (page === 1) {
            expectedTotal = total;
            expectedPages = pageCount;
        }
        if (total !== expectedTotal || pageCount !== expectedPages) throw new Error('Events changed while loading. Try again.');
        if (page < pageCount && result.data.length !== 100) throw new Error('The event feed is incomplete. Try again.');
        for (const event of result.data) {
            if (!event || !Number.isInteger(event.id) || event.id < 1 || typeof event.documentId !== 'string' || !event.documentId) {
                throw new Error('The event feed contains an invalid event.');
            }
            entries.set(event.documentId, event);
        }
        if (page >= pageCount) {
            if (entries.size !== total) throw new Error('The event feed is incomplete. Try again.');
            return [...entries.values()];
        }
    }
    throw new Error('There are too many events to load.');
}

export async function readScheduleEvents(requestPage, isCurrent = () => true) {
    const events = await readSchedulePages(requestPage, isCurrent);
    if (!events) return null;
    return events.map(event => {
        if (typeof event.title !== 'string' || !event.title.trim() || typeof event.startDatetime !== 'string') throw new Error('The event feed contains an invalid event.');
        return { ...event, dateKey: pacificDateKey(event.startDatetime) };
    }).sort((first, second) => new Date(first.startDatetime) - new Date(second.startDatetime));
}

export async function readConfirmedEventKeys(requestPage, isCurrent = () => true) {
    const events = await readSchedulePages(requestPage, isCurrent);
    if (!events) return null;
    return new Set(events.map(event => event.documentId));
}
