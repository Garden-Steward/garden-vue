import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankJoinDraft, isConfirmedJoin, participationRequest, readOwnConfirmedKeys } from '../src/helpers/participation.js';

test('pending or simulated delivery never proves a confirmed RSVP', () => {
    assert.equal(isConfirmedJoin({ kind: 'pending_verification', verification: 'simulated' }), false);
    assert.equal(isConfirmedJoin({ kind: 'confirmed', receipt: { rsvp: 'cancelled' } }), false);
    assert.equal(isConfirmedJoin({ kind: 'already_confirmed', receipt: { rsvp: 'confirmed' } }), true);
});

test('editing one new registration does not alter another registration', () => {
    const first = blankJoinDraft(); const next = blankJoinDraft();
    first.preferences.interestIds.push('synthetic');
    assert.deepEqual(next.preferences.interestIds, []);
});

test('request preserves typed contact values and returns resumable legacy sign-in state', async () => {
    const native = globalThis.fetch;
    const raw = { preferredNameRaw: '  A Neighbor  ', emailRaw: '  Person+garden@EXAMPLE.COM  ', phoneRaw: '  +44 (20) 1234-5678  ' };
    globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://example.test/api/join-intents/synthetic/resume');
        assert.deepEqual(JSON.parse(options.body), raw);
        assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
        return { ok: false, status: 428, json: async () => ({ data: { kind: 'sign_in_required', intentId: 'synthetic' } }) };
    };
    try {
        const result = await participationRequest('https://example.test', '/join-intents/synthetic/resume', { method: 'POST', token: 'synthetic-token', body: raw });
        assert.equal(result.data.kind, 'sign_in_required');
    } finally { globalThis.fetch = native; }
});

const receipt = (index, rsvp = 'confirmed') => ({ receiptId: index.toString(16).padStart(64, '0'), eventDocumentId: 'syntheticevent' + index, rsvp });
function page(data, number, total) { return { data, meta: { pagination: { page: number, pageSize: 100, pageCount: Math.ceil(total / 100), total } } }; }

test('schedule status reads every own page and excludes canceled RSVP receipts', async () => {
    const first = Array.from({ length: 100 }, (_, index) => receipt(index + 1));
    const calls = [];
    const keys = await readOwnConfirmedKeys(async number => {
        calls.push(number);
        if (number === 1) return page(first, number, 102);
        return page([receipt(101, 'cancelled'), receipt(102)], number, 102);
    });
    assert.deepEqual(calls, [1, 2]); assert.equal(keys.size, 101);
    assert.equal(keys.has('syntheticevent101'), false); assert.equal(keys.has('syntheticevent102'), true);
});

test('a failed later page or repeated receipt cannot become a partial schedule confirmation', async () => {
    const first = Array.from({ length: 100 }, (_, index) => receipt(index + 1));
    await assert.rejects(readOwnConfirmedKeys(async number => {
        if (number === 1) return page(first, number, 101);
        throw new Error('later page failed');
    }), /later page failed/);
    await assert.rejects(readOwnConfirmedKeys(async number => {
        if (number === 1) return page(first, number, 101);
        return page([receipt(1)], number, 101);
    }), /repeated receipt/);
});

test('switching accounts while loading discards the old own-status result', async () => {
    assert.equal(await readOwnConfirmedKeys(async () => page([receipt(1)], 1, 1), () => false), null);
});
