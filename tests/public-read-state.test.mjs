import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const apiUrl = 'https://api.test';
const root = new URL('../src/', import.meta.url);

async function loadModule(path, imports, globals = {}) {
    const source = await readFile(new URL(path, root), 'utf8');
    const context = createContext({ Headers, FormData, Response, Promise, console: { log() {} }, ...globals });
    const module = new SourceTextModule(source, {
        context,
        initializeImportMeta(meta) {
            meta.env = { VITE_API_URL: apiUrl };
        }
    });
    await module.link(specifier => {
        const exports = imports[specifier];
        assert.ok(exports, `Unexpected import ${specifier}`);
        return new SyntheticModule(Object.keys(exports), function () {
            for (const [key, value] of Object.entries(exports)) {
                this.setExport(key, value);
            }
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

function storeFactory(options) {
    return () => Object.assign(options.state(), options.actions);
}

test('403 rejects and leaves a signed-in session intact', async () => {
    let logouts = 0;
    let authorization;
    const auth = {
        user: { id: 1 },
        auth: { accessToken: 'test-token' },
        logout() { logouts += 1; }
    };
    const { fetchWrapper } = await loadModule('helpers/fetch-wrapper.js', {
        '@/stores': { useAuthStore: () => auth }
    }, {
        fetch: async (url, options) => {
            authorization = options.headers.get('Authorization');
            assert.equal(url, `${apiUrl}/api/volunteer-days/public`);
            return new Response(JSON.stringify({ error: { message: 'Forbidden', status: 403 } }), { status: 403 });
        }
    });
    await assert.rejects(fetchWrapper.get(`${apiUrl}/api/volunteer-days/public`), error => {
        assert.equal(error.message, 'Forbidden');
        assert.equal(error.status, 403);
        return true;
    });
    assert.equal(authorization, 'Bearer test-token');
    assert.equal(logouts, 0);
});

test('401 still expires a signed-in session', async () => {
    let logouts = 0;
    const auth = {
        user: { id: 1 },
        auth: { accessToken: 'test-token' },
        logout() { logouts += 1; }
    };
    const { fetchWrapper } = await loadModule('helpers/fetch-wrapper.js', {
        '@/stores': { useAuthStore: () => auth }
    }, {
        fetch: async () => new Response(JSON.stringify({ error: { message: 'Expired', status: 401 } }), { status: 401 })
    });
    await assert.rejects(fetchWrapper.get(`${apiUrl}/api/blogs`), error => {
        assert.equal(error.message, 'Expired');
        return true;
    });
    assert.equal(logouts, 1);
});

test('signed-out 403 does not change auth and 500 preserves its error', async () => {
    let logouts = 0;
    let status = 403;
    const auth = {
        user: null,
        auth: { accessToken: null },
        logout() { logouts += 1; }
    };
    const { fetchWrapper } = await loadModule('helpers/fetch-wrapper.js', {
        '@/stores': { useAuthStore: () => auth }
    }, {
        fetch: async (url, options) => {
            assert.equal(options.headers.get('Authorization'), null);
            return new Response(JSON.stringify({ error: { message: `HTTP ${status}`, status } }), { status });
        }
    });
    await assert.rejects(fetchWrapper.get(`${apiUrl}/api/blogs`), error => error.status === 403);
    status = 500;
    await assert.rejects(fetchWrapper.get(`${apiUrl}/api/blogs`), error => error.status === 500);
    assert.equal(logouts, 0);
});

test('public Events failure clears loading, stores the error, and rejects', async () => {
    const failure = { message: 'Forbidden', status: 403 };
    const alerts = [];
    const { useEventStore } = await loadModule('stores/event.store.js', {
        pinia: { defineStore: options => storeFactory(options) },
        '@/helpers': { fetchWrapper: { get: async () => { throw failure; } }, stripReadOnly: value => value },
        '@/stores': { useAlertStore: () => ({ error: error => alerts.push(error) }), useGardensStore: () => ({}) }
    });
    const store = useEventStore();
    await assert.rejects(store.fetchPublic(2, 20), error => error === failure);
    assert.equal(store.events.error, failure);
    assert.equal(store.events.loading, undefined);
    assert.equal(store.eventsPagination.pageCount, 0);
    assert.equal(store.eventsPagination.total, 0);
    assert.equal(alerts[0], failure);
});

test('public Events empty response settles as an empty array', async () => {
    const response = { data: [], meta: { pagination: { page: 1, pageSize: 20, pageCount: 0, total: 0 } } };
    const { useEventStore } = await loadModule('stores/event.store.js', {
        pinia: { defineStore: options => storeFactory(options) },
        '@/helpers': { fetchWrapper: { get: async () => response }, stripReadOnly: value => value },
        '@/stores': { useAlertStore: () => ({ error() {} }), useGardensStore: () => ({}) }
    });
    const store = useEventStore();
    assert.equal(await store.fetchPublic(1, 20), response);
    assert.ok(Array.isArray(store.events));
    assert.equal(store.events.length, 0);
    assert.equal(store.eventsPagination.total, 0);
});

test('Blog fetchAll returns the pending request and settles empty data', async () => {
    let release;
    const response = new Promise(resolve => { release = resolve; });
    const { useBlogStore } = await loadModule('stores/blog.store.js', {
        pinia: { defineStore: options => storeFactory(options) },
        '@/helpers': { fetchWrapper: { get: () => response } },
        '@/stores': { useAlertStore: () => ({ error() {} }) }
    });
    const store = useBlogStore();
    const pending = store.fetchAll();
    assert.equal(store.blogs.loading, true);
    release({ data: [] });
    assert.deepEqual(await pending, []);
    assert.ok(Array.isArray(store.blogs));
    assert.equal(store.blogs.length, 0);
    assert.equal(Object.hasOwn(store.blogs, 'loading'), false);
});

test('Blog fetchAll failure settles to error and alerts', async () => {
    const failure = { message: 'Unavailable', status: 500 };
    const alerts = [];
    const { useBlogStore } = await loadModule('stores/blog.store.js', {
        pinia: { defineStore: options => storeFactory(options) },
        '@/helpers': { fetchWrapper: { get: async () => { throw failure; } } },
        '@/stores': { useAlertStore: () => ({ error: error => alerts.push(error) }) }
    });
    const store = useBlogStore();
    await store.fetchAll();
    assert.equal(store.blogs.error, failure);
    assert.equal(store.blogs.loading, undefined);
    assert.equal(alerts[0], failure);
});
