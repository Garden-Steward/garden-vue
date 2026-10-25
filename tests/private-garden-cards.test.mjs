import assert from 'node:assert/strict';
import { test } from 'node:test';
import { privateGardenCards } from '../src/helpers/private-garden-cards.js';

const actor = 7;
const garden = (id, documentId, managers = [], volunteers = [], publishedAt = null) => ({
    id, documentId, title: 'Garden row ' + id, managers, volunteers, publishedAt
});

test('two physical versions show one management card with the first eligible row and draft state', () => {
    const draft = garden(41, 'garden-a', [{ id: actor }]);
    const published = garden(42, 'garden-a', [actor], [], '2026-10-01T00:00:00Z');
    const result = privateGardenCards([draft, published], actor);
    assert.deepEqual(result, { managed: [draft], joined: [], membershipCount: 1 });
    assert.equal(result.managed[0], draft);
    assert.equal(result.managed[0].id, 41);
    assert.equal(result.managed[0].publishedAt, null);
});

test('management on either version excludes the same document from volunteer cards', () => {
    const volunteerVersion = garden(41, 'garden-a', [], [actor]);
    const managerVersion = garden(42, 'garden-a', [actor]);
    const volunteerOnly = garden(51, 'garden-b', [], [{ id: actor }]);
    const otherVersion = garden(52, 'garden-b', [], [actor], '2026-10-01T00:00:00Z');
    const rows = [volunteerVersion, volunteerOnly, managerVersion, otherVersion];
    const snapshot = structuredClone(rows);
    const result = privateGardenCards(rows, actor);
    assert.deepEqual(result, { managed: [managerVersion], joined: [volunteerOnly], membershipCount: 2 });
    assert.equal(result.managed[0], managerVersion);
    assert.equal(result.joined[0], volunteerOnly);
    assert.deepEqual(rows, snapshot);
});

test('unrelated gardens and another actor do not count as memberships', () => {
    const own = garden(41, 'garden-a', [actor]);
    const other = garden(51, 'garden-b', [9], [11]);
    assert.deepEqual(privateGardenCards([own, other], actor), { managed: [own], joined: [], membershipCount: 1 });
    assert.deepEqual(privateGardenCards([own, other], 11), { managed: [], joined: [other], membershipCount: 1 });
    assert.deepEqual(privateGardenCards([own, other], String(actor)), { managed: [], joined: [], membershipCount: 0 });
});

test('published-only, draft-only and first already-eligible volunteer rows retain their original objects', () => {
    const unrelatedDraft = garden(41, 'garden-a', [9]);
    const published = garden(42, 'garden-a', [], [actor], '2026-10-01T00:00:00Z');
    const draft = garden(51, 'garden-b', [], [actor]);
    assert.deepEqual(privateGardenCards([unrelatedDraft, published, draft], actor), { managed: [], joined: [published, draft], membershipCount: 2 });
});

test('missing document identity does not combine distinct physical or unidentified gardens', () => {
    const first = garden(41, '', [actor]);
    const second = garden(42, undefined, [actor]);
    const unknownA = garden(undefined, undefined, [], [actor]);
    const unknownB = garden(undefined, undefined, [], [actor]);
    assert.deepEqual(privateGardenCards([first, second, unknownA, unknownB], actor), {
        managed: [first, second], joined: [unknownA, unknownB], membershipCount: 4
    });
});

test('loading, errors, empty data and absent actor have no visible memberships', () => {
    for (const rows of [{ loading: true }, { error: 'Unavailable' }, undefined, []]) {
        assert.deepEqual(privateGardenCards(rows, actor), { managed: [], joined: [], membershipCount: 0 });
    }
    assert.deepEqual(privateGardenCards([garden(41, 'a', [actor])], undefined), { managed: [], joined: [], membershipCount: 0 });
});
