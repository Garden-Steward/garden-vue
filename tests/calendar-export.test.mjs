import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { buildCalendarFile, buildCalendarLinks } from '../src/helpers/calendar-export.js';

const options = { origin: 'https://steward.garden', generatedAt: new Date('2026-10-25T09:00:01.123Z') };
const event = {
    id: 17, documentId: 'published-event-identity', title: 'A garden gathering',
    startDatetime: '2026-11-01T01:30:00-07:00', blurb: 'Come garden with us.',
    garden: { title: 'Oakland garden' }
};
const unfold = text => text.replace(/\r\n /g, '');
const property = (text, name) => unfold(text).split('\r\n').find(line => line.startsWith(name + ':'));

test('calendar snapshot has one start-only event, exact public fields and canonical event URL', () => {
    const file = buildCalendarFile(event, options);
    const content = unfold(file.calendarText);
    assert.equal(file.filename, 'garden-event-17.ics');
    assert.equal(file.startOnly, true);
    assert.equal(property(content, 'DTSTART'), 'DTSTART:20261101T083000Z');
    assert.equal(property(content, 'DTSTAMP'), 'DTSTAMP:20261025T090001Z');
    assert.equal(property(content, 'SUMMARY'), 'SUMMARY:A garden gathering');
    assert.equal(property(content, 'LOCATION'), 'LOCATION:Oakland garden');
    assert.equal(property(content, 'URL'), 'URL:https://steward.garden/d/17');
    assert.equal(property(content, 'DESCRIPTION'), 'DESCRIPTION:Come garden with us.\\n\\nhttps://steward.garden/d/17');
    assert.ok(!content.includes('Start time only'));
    assert.equal(content.split('BEGIN:VEVENT').length, 2);
    assert.equal(content.split('END:VEVENT').length, 2);
    assert.ok(content.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:'));
    assert.ok(content.endsWith('END:VCALENDAR\r\n'));
    assert.ok(!/(?:^|\r\n)(?:DTEND|DURATION|METHOD|ATTENDEE|ORGANIZER):/.test(content));
});

test('stable UID survives title, start, numeric row and export-time changes, but separates origins and documents', () => {
    const first = property(buildCalendarFile(event, options).calendarText, 'UID');
    const edited = { ...event, id: 300, title: 'Edited title', startDatetime: '2027-03-14T09:30:00Z' };
    const later = { ...options, generatedAt: new Date('2026-10-26T09:00:00Z') };
    assert.equal(property(buildCalendarFile(edited, later).calendarText, 'UID'), first);
    assert.notEqual(property(buildCalendarFile(event, { ...options, origin: 'http://127.0.0.1:3031' }).calendarText, 'UID'), first);
    assert.notEqual(property(buildCalendarFile({ ...event, documentId: 'another-event' }, options).calendarText, 'UID'), first);
});

test('both repeated Pacific hours and the spring transition retain their distinct UTC starts', () => {
    const cases = [
        ['2026-11-01T01:30:00-07:00', '20261101T083000Z'],
        ['2026-11-01T01:30:00-08:00', '20261101T093000Z'],
        ['2027-03-14T01:30:00-08:00', '20270314T093000Z'],
        ['2027-03-14T03:30:00-07:00', '20270314T103000Z']
    ];
    for (const [startDatetime, expected] of cases) {
        assert.equal(property(buildCalendarFile({ ...event, startDatetime }, options).calendarText, 'DTSTART'), 'DTSTART:' + expected);
    }
});

test('calendar text preserves spaces and escapes text so newlines cannot inject another property or event', () => {
    const file = buildCalendarFile({
        ...event, title: '  Ana, seeds; paths\\friends\r\nATTENDEE:private@example.test  ',
        blurb: 'First line\rSecond line\nBEGIN:VEVENT\r\nThird line',
        garden: { title: ' Garden, north; plot\\ ' }
    }, options);
    const content = unfold(file.calendarText);
    assert.equal(property(content, 'SUMMARY'), 'SUMMARY:  Ana\\, seeds\\; paths\\\\friends\\nATTENDEE:private@example.test  ');
    assert.equal(property(content, 'LOCATION'), 'LOCATION: Garden\\, north\\; plot\\\\ ');
    assert.equal(content.split('\r\nBEGIN:VEVENT\r\n').length, 2);
    assert.equal(property(content, 'ATTENDEE'), undefined);
    assert.match(property(content, 'DESCRIPTION'), /First line\\nSecond line\\nBEGIN:VEVENT\\nThird line/);
});

test('every physical UTF8 line fits75octets and unfolding preserves complete Unicode text', () => {
    const title = '🌻é邻'.repeat(40);
    const file = buildCalendarFile({ ...event, title, blurb: 'Unicode 🌱\n'.repeat(50) }, options);
    for (const line of file.calendarText.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
    assert.equal(property(file.calendarText, 'SUMMARY'), 'SUMMARY:' + title);
    assert.equal(new TextDecoder('utf-8', { fatal: true }).decode(new TextEncoder().encode(file.calendarText)), file.calendarText);
    assert.ok(!file.calendarText.replace(/\r\n/g, '').includes('\n'));
    assert.ok(!file.calendarText.replace(/\r\n/g, '').includes('\r'));
});

test('export ignores unapproved fields even when the detail object contains private or guessed values', () => {
    const file = buildCalendarFile({
        ...event, email: 'PRIVATE_SENTINEL', confirmed: [{ email: 'PRIVATE_SENTINEL' }],
        location_address: 'PRIVATE_SENTINEL', resolved_visit: { meeting_spot: 'PRIVATE_SENTINEL' },
        endText: '2pm', resolved_brief: { duration_text: '2 hours', private: 'PRIVATE_SENTINEL' },
        managers: [{ phoneNumber: 'PRIVATE_SENTINEL' }]
    }, options);
    assert.ok(!file.calendarText.includes('PRIVATE_SENTINEL'));
    assert.ok(!file.calendarText.includes('2pm'));
    assert.ok(!file.calendarText.includes('2 hours'));
});

test('location name is a public fallback and empty optional fields do not fabricate content', () => {
    const file = buildCalendarFile({ ...event, garden: null, blurb: null, location_name: ' Community hall ' }, options);
    assert.equal(property(file.calendarText, 'LOCATION'), 'LOCATION: Community hall ');
    const empty = buildCalendarFile({ ...event, garden: null, blurb: null, location_name: null }, options);
    assert.equal(property(empty.calendarText, 'LOCATION'), undefined);
    assert.equal(property(empty.calendarText, 'DESCRIPTION'), 'DESCRIPTION:https://steward.garden/d/17');
});

test('invalid identity, text, civil dates, offsets and generation time cannot create a file', () => {
    const changes = [
        { id: 0 }, { id: 1.2 }, { id: '17' }, { documentId: null }, { documentId: ' ' },
        { title: '' }, { title: ' ' }, { title: 'bad\u0000title' }, { title: 'bad\ud800title' },
        { blurb: { email: 'private@example.test' } }, { garden: { title: ['private'] } },
        { startDatetime: '2026-02-30T10:00:00Z' }, { startDatetime: '2026-13-01T10:00:00Z' },
        { startDatetime: '2026-11-01T24:00:00Z' }, { startDatetime: '2026-11-01T01:30:60Z' },
        { startDatetime: '2026-11-01T01:30:00+25:00' }, { startDatetime: '2026-11-01T01:30:00+01:60' },
        { startDatetime: '2026-11-01T01:30:00' }, { startDatetime: 'not a date' }
    ];
    for (const change of changes) assert.throws(() => buildCalendarFile({ ...event, ...change }, options));
    for (const generatedAt of [new Date('invalid'), '2026-01-01', new Date('10000-01-01T00:00:00Z')]) {
        assert.throws(() => buildCalendarFile(event, { ...options, generatedAt }));
    }
});

test('origins cannot smuggle a capability, credentials, path, query or nonweb scheme into the file', () => {
    for (const origin of ['javascript:alert(1)', 'file:///tmp/', 'https://user:secret@example.test', 'https://example.test/private', 'https://example.test/?secret=token', 'https://example.test/#private', 'https://example.test\n']) {
        assert.throws(() => buildCalendarFile(event, { ...options, origin }));
    }
});

test('provider links preserve actual UTC start and public text without private fields or an invented ending', () => {
    const input = { ...event, title: 'Garden & friends', blurb: 'Meet, plant; share\nTogether.', garden: { title: 'Garden', address: 'Private address', managers: [{ email: 'private@example.com' }] } };
    const links = buildCalendarLinks(input, options);
    const entry = new URL(links.google);
    assert.equal(entry.origin + entry.pathname, 'https://accounts.google.com/ServiceLogin');
    assert.equal(entry.searchParams.get('service'), 'cl');
    const google = new URL(entry.searchParams.get('continue'));
    assert.equal(google.origin + google.pathname, 'https://calendar.google.com/calendar/r/eventedit');
    assert.equal(google.searchParams.get('action'), 'TEMPLATE');
    assert.equal(google.searchParams.get('dates'), '20261101T083000Z/20261101T083000Z');
    assert.equal(google.searchParams.get('text'), input.title);
    assert.equal(google.searchParams.get('details'), input.blurb + '\n\nhttps://steward.garden/d/17');
    assert.equal(google.searchParams.get('location'), 'Garden');
    const outlook = new URL(links.outlook);
    assert.equal(outlook.origin + outlook.pathname, 'https://outlook.office.com/calendar/0/deeplink/compose');
    assert.equal(outlook.searchParams.get('startdt'), '2026-11-01T08:30:00.000Z');
    assert.equal(outlook.searchParams.get('subject'), input.title);
    assert.equal(outlook.searchParams.has('enddt'), false);
    assert.equal(outlook.searchParams.get('body'), input.blurb + '\n\nhttps://steward.garden/d/17');
    assert.ok(!JSON.stringify(links).includes('Private'));
    assert.ok(!JSON.stringify(links).includes('private%40'));
});

test('provider links reject missing identity, invalid starts and non-origin sites before navigation', () => {
    assert.throws(() => buildCalendarLinks({ ...event, documentId: '' }, options));
    assert.throws(() => buildCalendarLinks({ ...event, startDatetime: '2026-02-30T10:00:00Z' }, options));
    assert.throws(() => buildCalendarLinks(event, { origin: 'https://steward.garden/account?token=private' }));
});
