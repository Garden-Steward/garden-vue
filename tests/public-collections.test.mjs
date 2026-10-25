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

async function harness(get, auth = { user: { id: 7 } }, post = async () => ({})) {
    const options = {};
    const fetchWrapper = { get, post };
    const context = createContext({ Headers, Promise, console: { log() {}, error() {} } });
    const modules = new Map();
    const mocks = {
        pinia: { defineStore(definition) { options[definition.id] = definition; return () => Object.assign(definition.state(), definition.actions); }, storeToRefs: store => Object.fromEntries(Object.keys(store).map(key => [key, { get value() { return store[key]; } }])) },
        '@/helpers': { fetchWrapper, stripReadOnly: value => value },
        '@/helpers/fetch-wrapper': { fetchWrapper },
        '@/stores': { useAlertStore: () => ({ error() {} }), useGardensStore: () => ({}), useAuthStore: () => auth },
        '@/_config/GardenConfig': { normalizeReviewStatus: value => value, isProjectPubliclyVisible: () => true },
        vue: { computed, ref, onBeforeUnmount() {} },
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
