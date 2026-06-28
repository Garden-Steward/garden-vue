/**
 * Strapi v5 rejects system-managed keys in a create/update body with
 * `ValidationError: Invalid key <key>`. When a write payload is built by
 * spreading a loaded entity (which is now flat in v5), those keys leak in.
 * Strip them before sending.
 */
const READ_ONLY_KEYS = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale'];

export function stripReadOnly(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
    const out = { ...data };
    for (const key of READ_ONLY_KEYS) delete out[key];
    return out;
}
