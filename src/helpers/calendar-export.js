const encoder = new TextEncoder();

function calendarText(value, required = false) {
    if (value == null && !required) return '';
    if (typeof value !== 'string' || (required && !value.trim())) {
        throw new Error('Invalid calendar text.');
    }
    for (const character of value) {
        const point = character.codePointAt(0);
        if ((point < 32 && ![9, 10, 13].includes(point)) || point === 127) throw new Error('Invalid calendar text.');
        if (point >= 0xd800 && point <= 0xdfff) throw new Error('Invalid calendar text.');
    }
    return value;
}

function escapeText(value) {
    return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function foldLine(value) {
    const lines = [];
    let line = '';
    let length = 0;
    for (const character of value) {
        const size = encoder.encode(character).length;
        if (length + size > 75) {
            lines.push(line);
            line = ' ';
            length = 1;
        }
        line += character;
        length += size;
    }
    lines.push(line);
    return lines.join('\r\n');
}

function startDate(value) {
    if (typeof value !== 'string') throw new Error('Invalid calendar start.');
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/);
    if (!parts) throw new Error('Invalid calendar start.');
    const [year, month, day, hour, minute, second] = parts.slice(1, 7).map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
        hour > 23 || minute > 59 || second > 59 || Number(parts[8]) > 23 || Number(parts[9]) > 59) {
        throw new Error('Invalid calendar start.');
    }
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) throw new Error('Invalid calendar start.');
    return date;
}

function timestamp(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
        throw new Error('Invalid calendar timestamp.');
    }
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function calendarSnapshot(event, origin) {
    if (!Number.isSafeInteger(event?.id) || event.id < 1) throw new Error('Invalid calendar event.');
    const identity = calendarText(event.documentId, true);
    const title = calendarText(event.title, true);
    const blurb = calendarText(event.blurb);
    const garden = calendarText(event.garden?.title);
    const locationName = calendarText(event.location_name);
    const start = startDate(event.startDatetime);
    calendarText(origin, true);
    if (/\s/u.test(origin)) throw new Error('Invalid calendar origin.');
    const site = new URL(origin);
    if (!['http:', 'https:'].includes(site.protocol) || site.username || site.password || site.href !== site.origin + '/') {
        throw new Error('Invalid calendar origin.');
    }
    const eventUrl = new URL(`/d/${event.id}`, site.origin).href;
    let description = eventUrl;
    if (blurb) description = blurb + '\n\n' + description;
    let location = locationName;
    if (garden.trim()) location = garden;
    return { identity, title, description, location, start, eventUrl, siteOrigin: site.origin };
}

export function buildCalendarFile(event, { origin, generatedAt }) {
    const { identity, title, description, location, start, eventUrl, siteOrigin } = calendarSnapshot(event, origin);
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Garden Steward//Events//EN',
        'BEGIN:VEVENT',
        `UID:garden-steward-${encodeURIComponent(identity)}@${encodeURIComponent(siteOrigin)}`,
        `DTSTAMP:${timestamp(generatedAt)}`,
        `DTSTART:${timestamp(start)}`,
        `SUMMARY:${escapeText(title)}`,
        `DESCRIPTION:${escapeText(description)}`,
        `URL:${eventUrl}`
    ];
    if (location) lines.push(`LOCATION:${escapeText(location)}`);
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return {
        filename: `garden-event-${event.id}.ics`,
        calendarText: lines.map(foldLine).join('\r\n') + '\r\n',
        startOnly: true
    };
}

export function buildCalendarLinks(event, { origin }) {
    const { title, description, location, start } = calendarSnapshot(event, origin);
    const google = new URL('https://calendar.google.com/calendar/r/eventedit');
    google.searchParams.set('action', 'TEMPLATE');
    google.searchParams.set('text', title);
    google.searchParams.set('dates', timestamp(start) + '/' + timestamp(start));
    google.searchParams.set('details', description);
    const outlook = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
    outlook.searchParams.set('path', '/calendar/action/compose');
    outlook.searchParams.set('rru', 'addevent');
    outlook.searchParams.set('subject', title);
    outlook.searchParams.set('startdt', start.toISOString());
    outlook.searchParams.set('body', description);
    if (location) {
        google.searchParams.set('location', location);
        outlook.searchParams.set('location', location);
    }
    const googleEntry = new URL('https://accounts.google.com/ServiceLogin');
    googleEntry.searchParams.set('service', 'cl');
    googleEntry.searchParams.set('continue', google.href);
    return { google: googleEntry.href, outlook: outlook.href };
}
