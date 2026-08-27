/**
 * Strapi v5 rejects system-managed keys in a create/update body with
 * `ValidationError: Invalid key <key>`. When a write payload is built by
 * spreading a loaded entity (which is now flat in v5), those keys leak in.
 * Strip them before sending.
 */
const READ_ONLY_KEYS = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale'];

/**
 * Keys that only ever exist on an entry Strapi returned. Their presence is what
 * separates a populated relation (which must be sent back as an id) from a plain
 * object a form built by hand, such as the `{ id }` a media picker produces.
 */
const ENTRY_MARKER_KEYS = ['documentId', 'createdAt', 'updatedAt', 'publishedAt'];

function isPopulatedEntry(value) {
    return !!value
        && typeof value === 'object'
        && !Array.isArray(value)
        && value.id != null
        && ENTRY_MARKER_KEYS.some(key => key in value);
}

/**
 * Reduce populated relations to the id form Strapi accepts on write. A populated
 * relation carries `documentId`/`createdAt`/... and v5 refuses those keys inside a
 * write body, so a payload that spreads a loaded entry fails with
 * `Invalid key documentId` even though only the relation is at fault.
 *
 * Both to-one and to-many relations become `{ id }` — the shape the media and
 * gallery payloads in these stores already use — so callers can keep reading
 * `value.id` off a normalized relation.
 */
export function normalizeRelations(value) {
    if (Array.isArray(value)) return value.map(normalizeRelations);
    if (isPopulatedEntry(value)) return { id: value.id };
    if (value && typeof value === 'object') {
        const out = {};
        for (const [key, nested] of Object.entries(value)) out[key] = normalizeRelations(nested);
        return out;
    }
    return value;
}

export function stripReadOnly(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const out = {};
    for (const [key, value] of Object.entries(data)) {
        if (READ_ONLY_KEYS.includes(key)) continue;
        out[key] = normalizeRelations(value);
    }
    return out;
}
