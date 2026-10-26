const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const handler = source.slice(source.indexOf('async function applyKaasiUpdate('), source.indexOf('if ("serviceWorker" in navigator)'));

function fixture() {
  const listeners = new Map(), notices = [], timers = new Map(); let reloads = 0;
  const target = prefix => ({
    addEventListener(name, fn) { listeners.set(prefix + name, fn); },
    removeEventListener(name) { listeners.delete(prefix + name); }
  });
  const worker = { ...target('worker:'), state: 'installed', messages: [], postMessage(message) { this.messages.push(message); } };
  const context = vm.createContext({
    storageOperationPending: false, appPreferences: { flush: async () => {} },
    navigator: { serviceWorker: target('controller:') },
    location: { reload() { reloads++; } }, console: { error() {} },
    showNotification: (...args) => notices.push(args),
    setTimeout(fn) { timers.set(1, fn); return 1; }, clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(handler, context);
  return { context, worker, reg: { waiting: worker }, button: { disabled: false, textContent: 'Update Kaasi' },
    listeners, notices, timers, get reloads() { return reloads; },
    apply(reg, button) { return context.applyKaasiUpdate(reg || this.reg, button || this.button); } };
}

test('update waits for settings, blocks duplicate taps, and reloads after activation without controllerchange', async () => {
  const f = fixture(); let release;
  f.context.appPreferences.flush = () => new Promise(resolve => { release = resolve; });
  const pending = f.apply(); await f.apply();
  assert.equal(f.button.disabled, true); assert.equal(f.worker.messages.length, 0);
  release(); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(f.worker.messages, ['KAASI_APPLY_UPDATE']); assert.equal(f.reloads, 0);
  f.worker.state = 'activated'; f.listeners.get('worker:statechange')();
  await pending;
  assert.equal(f.reloads, 1); assert.equal(f.listeners.size, 0); assert.equal(f.timers.size, 0);
});

test('controller change reloads once and removes activation listeners', async () => {
  const f = fixture(), pending = f.apply(); await new Promise(setImmediate);
  f.listeners.get('controller:controllerchange')(); await pending;
  assert.equal(f.reloads, 1); assert.equal(f.listeners.size, 0);
});

test('an update activated by another tab while flushing safely reloads', async () => {
  const f = fixture(); f.context.appPreferences.flush = async () => { f.reg.waiting = null; };
  await f.apply(); assert.equal(f.reloads, 1); assert.equal(f.worker.messages.length, 0);
});

test('pending financial writes prevent update before and after preference flush', async () => {
  const f = fixture(); f.context.storageOperationPending = true;
  await f.apply(); assert.equal(f.reloads, 0); assert.equal(f.worker.messages.length, 0);
  f.context.storageOperationPending = false;
  f.context.appPreferences.flush = async () => { f.context.storageOperationPending = true; };
  await f.apply(); assert.equal(f.worker.messages.length, 0); assert.equal(f.button.disabled, false);
});

test('failed flush, post, activation and timeout show a useful error and permit retry', async () => {
  for (const failure of ['flush', 'post', 'redundant', 'timeout']) {
    const f = fixture();
    if (failure === 'flush') f.context.appPreferences.flush = async () => { throw Error('write failed'); };
    if (failure === 'post') f.worker.postMessage = () => { throw Error('worker unavailable'); };
    const pending = f.apply(); await new Promise(setImmediate);
    if (failure === 'redundant') { f.worker.state = 'redundant'; f.listeners.get('worker:statechange')(); }
    if (failure === 'timeout') f.timers.get(1)();
    await pending;
    assert.equal(f.reloads, 0, failure); assert.equal(f.button.disabled, false, failure);
    assert.match(f.notices.at(-1)[0], /refresh and retry/); assert.equal(f.listeners.size, 0);
  }
});
