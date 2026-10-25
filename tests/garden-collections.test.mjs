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
const context = { defineStore, fetchWrapper, stripReadOnly: value => value };
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
    pending[index].resolve({ data: [{ id }] });
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
