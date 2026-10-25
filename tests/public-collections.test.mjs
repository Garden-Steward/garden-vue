import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { setImmediate } from 'node:timers';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { computed, ref } from 'vue';
import { createPinia, defineStore, setActivePinia } from 'pinia';

const root = new URL('../src/', import.meta.url);
const api = 'https://api.test';

function envelope(data, total = data.length, page = 1, pageSize = 100) {
    return { data, meta: { pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total } } };
}

function row(id) {
    return { id, documentId: `document-${id}`, title: `Project ${id}`, interested: [] };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

async function harness(get, auth = { user: { id: 7 } }, post = async () => ({}), globals = {}) {
    const options = {};
    const fetchWrapper = { get, post };
    const context = createContext({
        Headers, Promise, console: { log() {}, error() {} },
        window: { clearInterval() {} }, document: { removeEventListener() {} }, ...globals
    });
    const modules = new Map();
    const mocks = {
        pinia: { defineStore(definition) { options[definition.id] = definition; return () => Object.assign(definition.state(), definition.actions); }, storeToRefs: store => Object.fromEntries(Object.keys(store).map(key => [key, { get value() { return store[key]; } }])) },
        '@/helpers': { fetchWrapper, stripReadOnly: value => value },
        '@/helpers/fetch-wrapper': { fetchWrapper },
        '@/stores': { useAlertStore: () => ({ error() {} }), useGardensStore: () => ({}), useAuthStore: () => auth },
        '@/_config/GardenConfig': { normalizeReviewStatus: value => value, isProjectPubliclyVisible: () => true },
        vue: { computed, ref, onMounted() {}, onBeforeUnmount() {} },
        '@/components/ManageLayout.vue': { default: null },
        '@/components/EmailLink.vue': { default: null }
    };
    async function moduleFor(file, extra = '') {
        if (modules.has(file)) return modules.get(file);
        let source = await readFile(new URL(file, root), 'utf8');
        if (file.endsWith('.vue')) source = source.match(/<script setup>([\s\S]*?)<\/script>/)[1];
        const module = new SourceTextModule(source + extra, {
            context,
            initializeImportMeta(meta) { meta.env = { VITE_API_URL: api }; }
        });
        modules.set(file, module);
        await module.link(async specifier => {
            if (specifier === '@/helpers/public-collection') return moduleFor('helpers/public-collection.js');
            if (specifier === '@/helpers/schedule-calendar') return moduleFor('helpers/schedule-calendar.js');
            const exports = mocks[specifier];
            assert.ok(exports, `Unexpected source import ${specifier}`);
            return new SyntheticModule(Object.keys(exports), function () {
                for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
            }, { context });
        });
        await module.evaluate();
        return module;
    }
    return { moduleFor, mocks, options };
}

test('complete directories include a match beyond page1 and publish only after the last page', async () => {
    const second = deferred();
    const requested = [];
    const { moduleFor } = await harness(async url => {
        requested.push(url);
        if (new URL(url).searchParams.get('pagination[page]') === '2') return second.promise;
        return envelope(Array.from({ length: 100 }, (_, index) => row(index + 1)), 101);
    });
    const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
    const store = useProjectsStore();
    const pending = store.getPublicProjects();
    await new Promise(setImmediate);
    assert.equal(store.publicProjects.loading, true);
    assert.equal(requested.length, 2);
    second.resolve(envelope([row(101)], 101, 2));
    await pending;
    assert.equal(store.publicProjects.length, 101);
    assert.equal(store.publicProjects[100].id, 101);
    assert.match(requested[0], /\/api\/public\/projects\?/);
    assert.equal(new URL(requested[0]).searchParams.get('populate'), null);
});

test('a later-page failure cannot publish a partial directory as a complete result', async () => {
    const failure = new Error('Second page unavailable');
    const { moduleFor } = await harness(async url => {
        if (new URL(url).searchParams.get('pagination[page]') === '2') throw failure;
        return envelope(Array.from({ length: 100 }, (_, index) => row(index + 1)), 101);
    });
    const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
    const store = useProjectsStore();
    await store.getPublicProjects();
    assert.equal(store.publicProjects.error, failure);
    assert.equal(Array.isArray(store.publicProjects), false);
});

test('malformed or oversized complete-collection metadata fails instead of truncating', async () => {
    for (const response of [
        { data: [] },
        envelope([], 1),
        envelope([], 100001),
        { data: [], meta: { pagination: { page: 1, pageSize: 100, total: 1, pageCount: 1.5 } } }
    ]) {
        const { moduleFor } = await harness(async () => response);
        const { readPublicCollection } = (await moduleFor('helpers/public-collection.js')).namespace;
        await assert.rejects(readPublicCollection(`${api}/api/public/projects`));
    }
});

test('stale public reload success and failure cannot replace the latest request', async () => {
    for (const staleFailure of [false, true]) {
        const requests = [];
        const { moduleFor } = await harness(() => {
            const request = deferred();
            requests.push(request);
            return request.promise;
        });
        const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
        const store = useProjectsStore();
        const old = store.getPublicProjects();
        const latest = store.getPublicProjects();
        requests[1].resolve(envelope([row(2)]));
        await latest;
        if (staleFailure) requests[0].reject(new Error('Old request failed'));
        else requests[0].resolve(envelope([row(1)]));
        await old;
        assert.equal(store.publicProjects[0].id, 2);
    }
});

test('actual Home setup and directory requests remain independent in both completion orders', async () => {
    for (const homeFirst of [true, false]) {
        const requests = [];
        const { moduleFor, mocks } = await harness(url => {
            if (new URL(url).pathname === '/api/volunteer-days/public') return Promise.resolve(envelope([]));
            const request = deferred();
            requests.push({ ...request, url });
            return request.promise;
        });
        const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
        const store = useProjectsStore();
        mocks['@/stores'].useProjectsStore = () => store;
        const home = (await moduleFor('views/PublicHomeView.vue', '\nexport { featured, featuredProjects };')).namespace;
        const directory = store.getPublicProjects();
        const first = requests.find(request => new URL(request.url).searchParams.get('pagination[pageSize]') === '3');
        const full = requests.find(request => new URL(request.url).searchParams.get('pagination[pageSize]') === '100');
        assert.ok(first && full);
        if (homeFirst) {
            first.resolve(envelope([row(10)], 1, 1, 3));
            await new Promise(setImmediate);
            assert.equal(store.publicProjects.loading, true);
            full.resolve(envelope([row(20)]));
        } else {
            full.resolve(envelope([row(20)]));
            await directory;
            assert.equal(home.featured.value.loading, true);
            first.resolve(envelope([row(10)], 1, 1, 3));
        }
        await directory;
        await new Promise(setImmediate);
        assert.equal(home.featuredProjects.value[0].id, 10);
        assert.equal(store.publicProjects[0].id, 20);
        assert.equal(store.communityProjects.loading, undefined);
    }
});

test('Home waits for every event page and shows the first three eligible future gatherings', async () => {
    const later = deferred();
    const now = Date.now();
    const event = (id, offset, extra = {}) => ({ id, documentId: `event-${id}`, title: `Gathering ${id}`, startDatetime: new Date(now + offset).toISOString(), ...extra });
    const pageOne = Array.from({ length: 100 }, (_, index) => event(index + 1, 30 * 86400000));
    const pageTwo = [
        event(501, -86400000), event(502, 3600000, { startDatetime: 'invalid date' }),
        event(503, 3600000, { canceled: true }), event(504, 3600000, { disabled: true }),
        event(505, 3600000, { documentId: 'tie-b' }), event(506, 3600000, { documentId: 'tie-a' }),
        event(507, 7200000), event(508, 3600000, { id: null })
    ];
    const { moduleFor, mocks } = await harness(url => {
        assert.equal(new URL(url).pathname, '/api/volunteer-days/public');
        if (new URL(url).searchParams.get('pagination[page]') === '2') return later.promise;
        return Promise.resolve(envelope(pageOne, 108));
    });
    const directory = [row(80)];
    const store = { publicProjects: directory, getPublicProjectPage: async () => envelope([row(10)], 1, 1, 3) };
    mocks['@/stores'].useProjectsStore = () => store;
    const home = (await moduleFor('views/PublicHomeView.vue', '\nexport { gatherings, upcomingEvents, featuredProjects };')).namespace;
    await new Promise(setImmediate);
    assert.equal(home.gatherings.value.loading, true);
    assert.equal(home.upcomingEvents.value.length, 0);
    assert.equal(home.featuredProjects.value[0].id, 10);
    later.resolve(envelope(pageTwo, 108, 2));
    await new Promise(setImmediate);
    assert.deepEqual(Array.from(home.upcomingEvents.value, item => item.id), [506, 505, 507]);
    assert.equal(store.publicProjects, directory);
});

test('a Home event page failure leaves successful project stories intact without partial gatherings', async () => {
    const failure = new Error('Later events unavailable');
    const { moduleFor, mocks } = await harness(async url => {
        if (new URL(url).searchParams.get('pagination[page]') === '2') throw failure;
        return envelope(Array.from({ length: 100 }, (_, index) => ({ ...row(index + 1), startDatetime: new Date(Date.now() + 86400000).toISOString() })), 101);
    });
    mocks['@/stores'].useProjectsStore = () => ({ getPublicProjectPage: async () => envelope([row(10)], 1, 1, 3) });
    const home = (await moduleFor('views/PublicHomeView.vue', '\nexport { gatherings, upcomingEvents, featuredProjects };')).namespace;
    await new Promise(setImmediate);
    assert.equal(home.gatherings.value.error, failure);
    assert.equal(home.upcomingEvents.value.length, 0);
    assert.equal(home.featuredProjects.value[0].id, 10);
});

test('failed Home project reads do not hide actual upcoming gatherings', async () => {
    const failure = new Error('Projects unavailable');
    const { moduleFor, mocks } = await harness(async () => envelope([{ ...row(20), startDatetime: new Date(Date.now() + 86400000).toISOString() }]));
    mocks['@/stores'].useProjectsStore = () => ({ getPublicProjectPage: async () => { throw failure; } });
    const home = (await moduleFor('views/PublicHomeView.vue', '\nexport { gatherings, upcomingEvents, featured };')).namespace;
    await new Promise(setImmediate);
    assert.equal(home.featured.value.error, failure);
    assert.equal(home.upcomingEvents.value[0].id, 20);
});

test('an unmounted Home ignores late event success and failure', async () => {
    for (const rejected of [false, true]) {
        const response = deferred();
        let unmount;
        const { moduleFor, mocks } = await harness(() => response.promise);
        mocks.vue.onBeforeUnmount = callback => { unmount = callback; };
        mocks['@/stores'].useProjectsStore = () => ({ getPublicProjectPage: async () => envelope([], 0, 1, 3) });
        const home = (await moduleFor('views/PublicHomeView.vue', '\nexport { gatherings, upcomingEvents };')).namespace;
        unmount();
        if (rejected) response.reject(new Error('Late failure'));
        else response.resolve(envelope([{ ...row(1), startDatetime: new Date(Date.now() + 86400000).toISOString() }]));
        await new Promise(setImmediate);
        assert.equal(home.gatherings.value.loading, true);
        assert.equal(home.upcomingEvents.value.length, 0);
    }
});

test('mounted Home removes started gatherings without another read and releases its clock on unmount', async () => {
    const base = Date.parse('2026-10-25T09:00:00Z');
    let now = base;
    class ClockDate extends Date {
        static now() { return now; }
    }
    const timers = new Map();
    const visibility = new Set();
    const events = Array.from({ length: 4 }, (_, index) => ({
        id: index + 801, documentId: `clock-${index}`, title: `Clock gathering ${index}`,
        startDatetime: new Date(base + (index + 1) * 60000).toISOString()
    }));
    let reads = 0;
    const { moduleFor, mocks } = await harness(async () => {
        reads += 1;
        return envelope(events);
    }, { user: null }, async () => ({}), {
        Date: ClockDate,
        window: {
            setInterval(callback, delay) { timers.set(1, callback); assert.ok(delay > 0 && delay <= 60000); return 1; },
            clearInterval(id) { timers.delete(id); }
        },
        document: {
            addEventListener(event, callback) { assert.equal(event, 'visibilitychange'); visibility.add(callback); },
            removeEventListener(event, callback) { assert.equal(event, 'visibilitychange'); visibility.delete(callback); }
        }
    });
    let mount = () => {};
    let unmount = () => {};
    mocks.vue.onMounted = callback => { mount = callback; };
    mocks.vue.onBeforeUnmount = callback => { unmount = callback; };
    mocks['@/stores'].useProjectsStore = () => ({ getPublicProjectPage: async () => envelope([], 0, 1, 3) });
    const home = (await moduleFor('views/PublicHomeView.vue', '\nexport { upcomingEvents };')).namespace;
    mount();
    await new Promise(setImmediate);
    assert.deepEqual(Array.from(home.upcomingEvents.value, event => event.id), [801, 802, 803]);
    now = base + 61000;
    for (const callback of timers.values()) callback();
    assert.deepEqual(Array.from(home.upcomingEvents.value, event => event.id), [802, 803, 804]);
    assert.equal(reads, 1);
    now = base + 181000;
    for (const callback of visibility) callback();
    assert.deepEqual(Array.from(home.upcomingEvents.value, event => event.id), [804]);
    unmount();
    assert.equal(timers.size, 0);
    assert.equal(visibility.size, 0);
    now = base + 300000;
    for (const callback of timers.values()) callback();
    for (const callback of visibility) callback();
    assert.deepEqual(Array.from(home.upcomingEvents.value, event => event.id), [804]);
    assert.equal(reads, 1);
});

test('interest uses returned count and state and keeps public cached users id-only', async () => {
    const auth = { user: { id: 7, email: 'private@example.test', firstName: 'Verbatim Name' } };
    const { moduleFor } = await harness(async () => ({}), auth, async () => ({ count: 45, isInterested: true }));
    const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
    const store = useProjectsStore();
    store.publicProjects = [row(1)];
    store.userProjects = [{ ...row(1), interested: [{ id: 8, firstName: 'Known private name' }] }];
    await store.toggleInterest(1);
    assert.equal(store.interestState(store.publicProjects[0]).count, 45);
    assert.equal(store.interestState(store.publicProjects[0]).isInterested, true);
    assert.equal(store.interestState(store.userProjects[0]).count, 45);
    assert.deepEqual(Object.keys(store.publicProjects[0].interested[0]), ['id']);
    assert.equal(JSON.stringify(store.publicProjects).includes('private@example.test'), false);
    assert.equal(JSON.stringify(store.publicProjects).includes('interestStatus'), false);
    store.patchInterest(1, { count: 44, isInterested: false });
    assert.equal(store.interestState(store.publicProjects[0]).isInterested, false);
    assert.equal(store.publicProjects[0].interested.length, 0);
    store.patchInterest(1, { count: 44, isInterested: false });
    assert.equal(store.publicProjects[0].interested.length, 0, 'repeated server state is idempotent');
    assert.throws(() => store.patchInterest(1, { success: true }));
});

test('an interest response from a previous account cannot set the current account membership', async () => {
    const response = deferred();
    const auth = { user: { id: 7 } };
    const { moduleFor } = await harness(async () => ({}), auth, () => response.promise);
    const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
    const store = useProjectsStore();
    store.publicProjects = [row(1)];
    const pending = store.toggleInterest(1);
    auth.user = { id: 8 };
    response.resolve({ count: 12, isInterested: true });
    await pending;
    assert.equal(store.interestState(store.publicProjects[0]).isInterested, false);
    assert.equal(store.publicProjects[0].interested.length, 0);
});

test('fresh project data does not inherit stale interest counts and auth changes do not inherit another user state', async () => {
    const auth = { user: { id: 7 } };
    const { moduleFor } = await harness(async () => envelope([row(1)]), auth);
    const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
    const store = useProjectsStore();
    store.publicProjects = [row(1)];
    store.patchInterest(1, { count: 45, isInterested: true });
    auth.user = { id: 8 };
    assert.equal(store.interestState(store.publicProjects[0]).isInterested, false);
    await store.getPublicProjects();
    assert.equal(store.interestState(store.publicProjects[0]).count, 0);
});

test('Blog pagination preserves loaded stories after a later error and detail404 clears stale content', async () => {
    let detail = false;
    const failure = { status: 404, message: 'Not found' };
    const { moduleFor } = await harness(async url => {
        const target = new URL(url);
        if (target.pathname.endsWith('/missing')) { detail = true; throw failure; }
        if (target.searchParams.get('pagination[page]') === '2') throw new Error('Later outage');
        return envelope(Array.from({ length: 24 }, (_, index) => row(index)), 25, 1, 24);
    });
    const { useBlogStore } = (await moduleFor('stores/blog.store.js')).namespace;
    const store = useBlogStore();
    await store.fetchAll();
    await store.loadMore();
    assert.equal(store.blogs.length, 24);
    assert.ok(store.moreError);
    assert.equal(store.loadingMore, false);
    store.blog = { documentId: 'old', title: 'Stale title', content: [] };
    await store.findSlug('missing');
    assert.equal(detail, true);
    assert.equal(store.blog.error, failure);
    assert.equal(store.blog.title, undefined);
});


test('Blog Load more rejects missing, repeated or changed pages without hiding missing stories', async () => {
    const first = Array.from({ length: 24 }, (_, index) => row(index));
    for (const later of [envelope([], 25, 2, 24), envelope([row(0)], 25, 2, 24), envelope([row(24), row(25)], 26, 2, 24)]) {
        const { moduleFor } = await harness(async url => {
            if (new URL(url).searchParams.get('pagination[page]') === '2') return later;
            return envelope(first, 25, 1, 24);
        });
        const { useBlogStore } = (await moduleFor('stores/blog.store.js')).namespace;
        const store = useBlogStore();
        await store.fetchAll();
        await store.loadMore();
        assert.equal(store.blogs.length, 24);
        assert.equal(store.blogsPagination.page, 1);
        assert.ok(store.moreError);
    }
});

test('actual Pinia tracks interest state without adding writable DTO fields', async () => {
    const { moduleFor, mocks } = await harness(async () => ({}), { user: { id: 7 } });
    mocks.pinia.defineStore = defineStore;
    setActivePinia(createPinia());
    const { useProjectsStore } = (await moduleFor('stores/projects.store.js')).namespace;
    const store = useProjectsStore();
    store.publicProjects = [row(1)];
    const interest = computed(() => store.interestState(store.publicProjects[0]));
    assert.equal(interest.value.count, 0);
    store.patchInterest(1, { count: 12, isInterested: true });
    assert.equal(interest.value.count, 12);
    assert.equal(interest.value.isInterested, true);
    assert.equal(Object.keys(store.publicProjects[0]).includes('interestStatus'), false);
    store.publicProjects = [row(1)];
    assert.equal(interest.value.count, 0);
});
