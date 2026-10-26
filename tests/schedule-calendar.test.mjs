import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDays, civilDate, civilKey, pacificDateKey, readConfirmedEventKeys, readScheduleEvents, shiftCalendar } from '../src/helpers/schedule-calendar.js';

function event(id, startDatetime = '2026-11-01T08:30:00.000Z') {
    return { id, documentId: `calendar-${id}`, title: `Fixture event ${id}`, startDatetime };
}
function response(data, page = 1, total = data.length) {
    return { data, meta: { pagination: { page, pageSize: 100, pageCount: Math.ceil(total / 100), total } } };
}

test('Pacific date keys survive midnight, leap day and both daylight-saving boundaries', () => {
    assert.equal(pacificDateKey('2026-11-01T06:59:00Z'), '2026-10-31');
    assert.equal(pacificDateKey('2026-11-01T08:30:00Z'), '2026-11-01');
    assert.equal(pacificDateKey('2026-11-01T09:30:00Z'), '2026-11-01');
    assert.equal(pacificDateKey('2026-03-08T09:59:00Z'), '2026-03-08');
    assert.equal(pacificDateKey('2026-03-08T10:00:00Z'), '2026-03-08');
    assert.equal(pacificDateKey('2028-03-01T07:30:00Z'), '2028-02-29');
    assert.throws(() => civilDate('2026-02-30'));
});

test('month and week grids use full Monday-to-Sunday civil rows across years', () => {
    const november = calendarDays('2026-11-01', 'month');
    assert.equal(november[0].key, '2026-10-26');
    assert.equal(november.at(-1).key, '2026-12-06');
    assert.equal(november.length, 42);
    const week = calendarDays('2027-01-01', 'week');
    assert.equal(week[0].key, '2026-12-28');
    assert.equal(week[6].key, '2027-01-03');
    assert.equal(shiftCalendar('2026-12-31', 'month', 1), '2027-01-01');
    assert.equal(shiftCalendar('2026-11-01', 'week', 1), '2026-11-08');
    assert.equal(civilKey(civilDate('2028-02-29')), '2028-02-29');
});

test('full paginated feed includes the nearest event beyond the first page', async () => {
    const later = Array.from({ length: 100 }, (_, index) => event(index + 1, '2026-12-01T18:00:00Z'));
    const calls = [];
    const events = await readScheduleEvents(async (page, pageSize) => {
        calls.push([page, pageSize]);
        if (page === 1) return response(later, page, 101);
        return response([event(101)], page, 101);
    });
    assert.deepEqual(calls, [[1, 100], [2, 100]]);
    assert.equal(events.length, 101);
    assert.equal(events[0].id, 101);
    assert.equal(events[0].dateKey, '2026-11-01');
});

test('empty, malformed, failed later pages and stale loads cannot become partial success', async () => {
    assert.deepEqual(await readScheduleEvents(async () => response([])), []);
    await assert.rejects(readScheduleEvents(async () => ({ data: [] })), /invalid response/);
    await assert.rejects(readScheduleEvents(async () => response([event(1)], 1, 101)), /incomplete/);
    await assert.rejects(readScheduleEvents(async () => response([], 1, 100001)), /invalid pagination/);
    await assert.rejects(readScheduleEvents(async page => {
        if (page === 1) return response(Array.from({ length: 100 }, (_, index) => event(index + 1)), 1, 101);
        throw new Error('Labelled later page failure');
    }), /later page failure/);
    let calls = 0;
    const stale = await readScheduleEvents(async () => { calls += 1; return response([event(1)]); }, () => false);
    assert.equal(stale, null);
    assert.equal(calls, 1);
});

test('confirmed identity reads are bounded and never infer status from ordinary event feed membership', async () => {
    const keys = await readConfirmedEventKeys(async () => response([{ id: 1, documentId: 'calendar-1' }]));
    assert.deepEqual([...keys], ['calendar-1']);
    assert.deepEqual([...await readConfirmedEventKeys(async () => response([]))], []);
    await assert.rejects(readConfirmedEventKeys(async () => ({ error: 'Fixture failure' })), /invalid response/);
});
