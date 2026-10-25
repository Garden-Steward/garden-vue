import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { setImmediate } from 'node:timers';

const require = createRequire(import.meta.url);
const { defineStore, createPinia, setActivePinia } = require('pinia');
const storePath = fileURLToPath(new URL('../src/stores/gardens.store.js', import.meta.url));
const original = readFileSync(storePath, 'utf8');
const source = original
  .replace("import { defineStore } from 'pinia';", '')
  .replace("import { fetchWrapper, stripReadOnly } from '@/helpers';", '')
  .replace("import { readPublicCollection } from '@/helpers/public-collection';", '')
  .replaceAll('import.meta.env.VITE_API_URL', "'http://example.test'")
  .replace('export const useGardensStore', 'const useGardensStore');

const pending = [];
const fetchWrapper = {
  get(url) {
    let resolve;
    const promise = new Promise(res => { resolve = res; });
    pending.push({ url, resolve });
    return promise;
  }
};
const helperContext = { fetchWrapper };
const helperSource = readFileSync(new URL('../src/helpers/public-collection.js', import.meta.url), 'utf8')
  .replace("import { fetchWrapper } from '@/helpers/fetch-wrapper';", '')
  .replaceAll('export async function', 'async function');
vm.runInNewContext(`${helperSource}\nthis.readPublicCollection = readPublicCollection;`, helperContext);
const context = { defineStore, fetchWrapper, stripReadOnly: value => value, readPublicCollection: helperContext.readPublicCollection };
vm.runInNewContext(`${source}\nthis.useGardensStore = useGardensStore;`, context, { filename: storePath });

async function checkCompletionOrder(first) {
  pending.length = 0;
  setActivePinia(createPinia());
  const store = context.useGardensStore();
  store.getAll();
  store.getAllPublic();

  assert.equal(pending.length, 2);
  assert.match(pending[0].url, /populate\[0\]=managers/);
  assert.match(pending[1].url, /pagination\[pageSize\]=100/);
  assert.equal(store.gardens.loading, true);
  assert.equal(store.publicGardens.loading, true);

  const finish = index => {
    let id = 'public';
    if (index === 0) id = 'private';
    const response = { data: [{ id, documentId: id }] };
    if (index === 1) response.meta = { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } };
    pending[index].resolve(response);
  };
  finish(first);
  await new Promise(setImmediate);
  finish(1 - first);
  await new Promise(setImmediate);

  assert.equal(store.gardens[0].id, 'private');
  assert.equal(store.publicGardens[0].id, 'public');
}

await checkCompletionOrder(0);
await checkCompletionOrder(1);
console.log('Private-first and public-first responses kept separate.');
