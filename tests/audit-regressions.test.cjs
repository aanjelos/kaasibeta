const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');

class Element {
  constructor() {
    this.style = {}; this.dataset = {}; this.children = []; this.value = '';
    this.textContent = ''; this.events = new Map(); this.attributes = new Map();
    this.classes = new Set(); this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
      toggle: (name, force) => {
        const add = force === undefined ? !this.classes.has(name) : force;
        if (add) this.classes.add(name); else this.classes.delete(name);
        return add;
      }
    };
    this.form = { elements: {} };
    this.options = []; this.scrollTop = 0; this.offsetHeight = 100; this.scrollHeight = 200;
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  addEventListener(type, callback) {
    if (!this.events.has(type)) this.events.set(type, []);
    this.events.get(type).push(callback);
  }
  removeEventListener() {}
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  replaceChildren(...children) { this.children = children; }
  querySelector() { return new Element(); }
  querySelectorAll() { return []; }
  setAttribute(key, value) { this.attributes.set(key, value); }
  getAttribute(key) { return this.attributes.get(key) ?? null; }
  removeAttribute(key) { this.attributes.delete(key); }
  focus() { this.focused = true; }
  blur() { this.focused = false; }
  dispatchEvent() {}
  getClientRects() { return [{}]; }
  scrollIntoView() {}
  getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100, bottom: 100 }; }
  remove() {}
}

function runtime() {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  const documentEvents = new Map(); const windowEvents = new Map(); const timers = [];
  const register = map => (type, callback) => {
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(callback);
  };
  const storage = new Map();
  const localStorage = {
    failMain: false, failMetadata: false,
    getItem: key => storage.get(key) ?? null,
    setItem(key, value) {
      if ((this.failMain && key === 'KaasiData') || (this.failMetadata && key !== 'KaasiData')) {
        const error = new Error('Simulated full storage'); error.name = 'QuotaExceededError'; throw error;
      }
      storage.set(key, String(value));
    },
    removeItem: key => storage.delete(key), key: index => [...storage.keys()][index],
    get length() { return storage.size; }
  };
  const document = {
    querySelector: element, querySelectorAll: () => [], getElementById: id => element(`#${id}`),
    createElement: () => new Element(), body: new Element(), documentElement: new Element(),
    activeElement: new Element(), addEventListener: register(documentEvents), removeEventListener() {}
  };
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} }, document, localStorage,
    navigator: { onLine: true }, history: { back() {}, pushState() {}, go() {} },
    crypto: webcrypto, TextEncoder, URL, Blob,
    performance: { now: () => 0 },
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {},
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    addEventListener: register(windowEvents), removeEventListener() {},
    matchMedia: () => ({ matches: false }), scrollTo() {}, focus() {},
    supabase: { createClient: () => null },
    storageOperationPending: false, storageStartupReady: true,
    appPreferences: { ...localStorage, flush: async () => {} },
    showStorageFailure() {},
    getComputedStyle: () => ({ getPropertyValue: () => '', position: 'relative' }),
    FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values[key] ?? null; } },
    Event: class { constructor(type) { this.type = type; } }
  });
  context.window = context;
  // Financial-domain tests inject a controllable async backend; indexeddb.test.cjs
  // separately exercises the native IndexedDB boundary and transaction failures.
  let revision=0;
  const canonical=value=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`:JSON.stringify(value);
  context.KaasiStorage={ready:true,mode:'indexeddb',get revision(){return revision;},
    canonical,
    async digest(value){return Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))).toString('hex');},
    get current(){return JSON.parse(storage.get('KaasiData')||'{}');},
    async commit(value,metadata={}){
      if(localStorage.failMain)throw new Error('Changes were not saved');
      if(localStorage.failMetadata&&Object.keys(metadata).length)throw new Error('Transaction metadata failed');
      storage.set('KaasiData',JSON.stringify(value));revision++;
      if(!localStorage.failMetadata)Object.entries(metadata).forEach(([key,entry])=>storage.set(key,String(entry)));
    },
    async replace(value,expected=revision){if(expected!==revision)throw new Error('Revision changed');return this.commit(value);},
    async snapshot(){return this.current;}};
  for (const file of ['globals', 'import-validation', 'animations', 'data-sync', 'cloud-sync', 'math-tool', 'settings', 'charts', 'ui', 'features', 'security', 'app']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context, { filename: `${file}.js` });
  }
  const run = source => vm.runInContext(source, context);
  const notices = []; context.showNotification = (...args) => notices.push(args);
  for (const name of ['renderDashboard', 'populateDropdowns', 'updateHeaderShortcutButtons']) context[name] = () => {};
  run('state=getDefaultState();state.settings.initialSetupDone=true;state.accounts[0].balance=1000;lastPersistedStateJson=JSON.stringify(state);');
  storage.set('KaasiData',run('JSON.stringify(state)'));
  notices.length = 0;
  return { context, run, element, documentEvents, windowEvents, storage, localStorage, notices, timers };
}

test('all application scripts parse', () => {
  for (const name of fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'))) {
    new vm.Script(fs.readFileSync(path.join(root, 'js', name), 'utf8'), { filename: name });
  }
});

test('storage protection retains its backup reminder on reopen and ignores an outdated permission check', async () => {
  const r = runtime(); const c = r.context;
  for (const name of ['renderSettingsForm','setupSettingsTabs','setupAppearanceListeners','renderBudgetsSettingsList','buildBudgetCategoryCheckboxes','openModalHelper','cancelDeleteAllData','displayAppVersion']) c[name] = () => {};
  c.navigator.storage = { persisted: async () => true, persist: async () => true };
  for (let attempt = 0; attempt < 2; attempt++) {
    c.openSettingsModal(); await new Promise(setImmediate);
    assert.equal(r.element('#persistenceStatus').textContent, 'Persistent storage is enabled. External backups are still important.');
    assert.equal(r.element('#requestPersistenceBtn').disabled, true);
    assert.equal(r.element('#requestPersistenceBtn').textContent, 'Protection Enabled');
  }
  assert.match(r.element('#storageSizeInfo').textContent, /^Approx\. Storage Used: .+ \(IndexedDB\)$/);
  let finishCheck;
  c.navigator.storage.persisted = () => new Promise(resolve => finishCheck = resolve);
  c.openSettingsModal(); await r.element('#requestPersistenceBtn').onclick();
  finishCheck(false); await new Promise(setImmediate);
  assert.match(r.element('#persistenceStatus').textContent, /enabled\. External backups are still important\./);
  assert.equal(r.element('#requestPersistenceBtn').disabled, true);
  c.KaasiStorage.mode = 'legacy'; c.openSettingsModal();
  assert.match(r.element('#storageSizeInfo').textContent, /\(localStorage\)$/);
  assert.equal(r.element('#storageProtectionSection').hidden, true);
});

test('storage protection refreshes after revocation on focus, visibility, Data tab, and modal reopen', async () => {
  const r = runtime(); const c = r.context;
  for (const name of ['renderSettingsForm','setupSettingsTabs','setupAppearanceListeners','renderBudgetsSettingsList','buildBudgetCategoryCheckboxes','openModalHelper','cancelDeleteAllData','displayAppVersion']) c[name] = () => {};
  let granted=true, requests=0, checks=0;
  c.navigator.storage={persisted:async()=>{checks++;return granted;},persist:async()=>{requests++;return true;}};
  r.element('#settingsModal').style.display='block';c.document.visibilityState='visible';
  c.openSettingsModal();await new Promise(setImmediate);
  assert.equal(r.element('#requestPersistenceBtn').textContent,'Protection Enabled');
  granted=false;
  for(const fn of r.windowEvents.get('focus'))fn();await new Promise(setImmediate);
  assert.equal(r.element('#requestPersistenceBtn').disabled,false);
  assert.equal(r.element('#requestPersistenceBtn').textContent,'Protect Local Storage');
  assert.equal(r.element('#persistenceStatus').textContent,'Persistent storage is not enabled.');
  granted=true;
  for(const fn of r.documentEvents.get('visibilitychange'))fn();await new Promise(setImmediate);
  assert.equal(r.element('#requestPersistenceBtn').disabled,true);
  granted=false;c.switchSettingsTab(new Element(),'settingsDataManagementPanel');await new Promise(setImmediate);
  assert.equal(r.element('#requestPersistenceBtn').disabled,false);
  granted=true;c.openSettingsModal();await new Promise(setImmediate);
  assert.equal(r.element('#requestPersistenceBtn').textContent,'Protection Enabled');
  assert.equal(requests,0,'status checks never request permission');
  const count=checks;r.element('#settingsModal').style.display='none';
  for(const fn of r.windowEvents.get('focus'))fn();assert.equal(checks,count);
  r.element('#settingsModal').style.display='block';c.document.visibilityState='hidden';
  c.refreshVisibleStorageProtection();assert.equal(checks,count);
});

test('a delayed protection check cannot overwrite a newer refresh result', async () => {
  const r=runtime(),c=r.context;let finish;
  c.navigator.storage={persist:async()=>true,persisted:()=>new Promise(resolve=>finish=resolve)};
  const old=c.refreshStorageProtection();
  c.navigator.storage.persisted=async()=>false;await c.refreshStorageProtection();
  finish(true);await old;
  assert.equal(r.element('#requestPersistenceBtn').textContent,'Protect Local Storage');
  assert.equal(r.element('#requestPersistenceBtn').disabled,false);
});

test('startup requests storage protection once, remembers refusal, and allows a manual retry',async()=>{
  const r=runtime(),c=r.context;let requests=0,granted=false;
  c.navigator.storage={persisted:async()=>granted,persist:async()=>{requests++;return granted;}};
  await c.requestStartupStorageProtection();await c.requestStartupStorageProtection();assert.equal(requests,1);
  assert.equal(r.storage.get('kaasi_storage_protection_denied'),'true');
  r.run('storageProtectionLaunchChecked=false');await c.requestStartupStorageProtection();assert.equal(requests,1);
  granted=true;await r.element('#requestPersistenceBtn').onclick();assert.equal(requests,2);
  assert.equal(r.storage.has('kaasi_storage_protection_denied'),false);
  assert.equal(r.element('#requestPersistenceBtn').textContent,'Protection Enabled');
});

test('startup respects browser denial, existing grants, unsupported APIs, PIN lock, and legacy mode',async()=>{
  for(const scenario of ['denied','granted','unsupported','locked','legacy']){
    const r=runtime(),c=r.context;let requests=0;
    c.navigator.storage={persisted:async()=>scenario==='granted',persist:async()=>{requests++;return true;}};
    if(scenario==='denied')c.navigator.permissions={query:async()=>({state:'denied'})};
    if(scenario==='unsupported')c.navigator.storage={};
    if(scenario==='locked')c.kaasiAppLocked=true;
    if(scenario==='legacy')c.KaasiStorage.mode='legacy';
    await c.requestStartupStorageProtection();assert.equal(requests,0,scenario);
  }
});

test('migration persistence decision is reused instead of immediately requesting again',async()=>{
  const r=runtime(),c=r.context;let requests=0;c.storagePersistenceDecision=false;
  c.navigator.storage={persisted:async()=>false,persist:async()=>{requests++;return false;}};
  await c.requestStartupStorageProtection();assert.equal(requests,0);
  assert.equal(r.storage.get('kaasi_storage_protection_denied'),'true');
});

test('strict calculator evaluates supported operations and rejects partial/invalid expressions', () => {
  const { context: c } = runtime();
  for (const [input, expected] of [['(1500*2)+350', 3350], ['1,000+250', 1250], ['-.5+1', .5], ['10/4', 2.5], ['25', 25]]) {
    assert.equal(c.evaluateMathExpression(input), expected, input);
  }
  for (const input of ['1000/0', '2(3+4)', '1.2.3+4', '100abc', '1+', '1 2+3', '(1+2', '1+2)', 'Infinity', '1e309']) {
    assert.equal(c.evaluateMathExpression(input), null, input);
    assert.ok(Number.isNaN(c.parseAmountValue(input)), input);
  }
  const plain = { value: '25' };
  assert.equal(c.processCalculation(plain), false, 'Enter can submit an ordinary numeric value');
});

test('failed financial save retains previous data and form input without a success message', async () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  const form = { values: { transactionType: 'expense', amount: '100', account: 'cash', category: 'Other', description: 'Lunch', date: '2026-10-20' }, reset() { this.resetCalled = true; }, querySelector() { return null; } };
  r.localStorage.failMain = true;
  await assert.rejects(r.context.handleTransactionSubmit({ preventDefault() {}, target: form }), /not saved/);
  assert.equal(r.storage.get('KaasiData'), before);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
  assert.equal(r.run('state.transactions.length'), 0);
  assert.equal(form.resetCalled, undefined);
  assert.ok(!r.notices.some(([, type]) => type === 'success'));
  r.localStorage.failMain = false;
  await r.context.handleTransactionSubmit({ preventDefault() {}, target: form });
  assert.equal(r.run('state.accounts[0].balance'), 900);
  assert.equal(r.run('state.transactions.length'), 1);
});

test('save rollback preserves captured account references for retrying a confirmation', async () => {
  const r = runtime(); r.run('var capturedAccount = state.accounts[0]; capturedAccount.balance -= 100;');
  r.localStorage.failMain = true;
  await assert.rejects(r.context.saveData());
  assert.equal(r.run('capturedAccount === state.accounts[0]'), true);
  assert.equal(r.run('capturedAccount.balance'), 1000);
});

test('financial forms wait for commit completion before clearing inputs or announcing success',async()=>{
  const r=runtime();const commit=r.context.KaasiStorage.commit.bind(r.context.KaasiStorage);let complete;
  r.context.KaasiStorage.commit=(value,metadata)=>new Promise((resolve,reject)=>{complete=()=>commit(value,metadata).then(resolve,reject);});
  const form={values:{transactionType:'expense',amount:'10',account:'cash',category:'Other',description:'Wait for commit',date:'2026-10-21'},reset(){this.cleared=true;},querySelector(){return null;}};
  const pending=r.context.handleTransactionSubmit({preventDefault(){},target:form});
  assert.equal(form.cleared,undefined);assert.ok(!r.notices.some(([,type])=>type==='success'));
  assert.equal(r.context.storageOperationPending,true);
  complete();await pending;assert.equal(form.cleared,true);
  assert.equal(JSON.parse(r.storage.get('KaasiData')).accounts[0].balance,990);
});

test('transaction metadata failure rolls back the financial save atomically', async () => {
  const r = runtime(); r.localStorage.failMetadata = true;
  await assert.rejects(r.run('state.accounts[0].balance = 500; saveData();'),/not saved/);
  assert.equal(JSON.parse(r.storage.get('KaasiData')).accounts[0].balance, 1000);
  assert.equal(r.run('state.accounts[0].balance'),1000);
});

test('invalid backups never modify state or storage, including unsafe keys and record IDs', async () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  const corruptions = [
    'backup.transactions = null', 'backup.debts = null', 'backup.budgets = [{}]',
    'backup.accounts[0].balance = "100"', 'backup.creditCard.transactions = null',
    'backup.settings.hiddenCategoryRules = null', 'backup.categories = [null]',
    'backup.accounts[0].id = "cash\\\" onclick=evil()"',
    'backup.accounts.push({...backup.accounts[0]})',
    'backup.transactions = [{id:"t1",type:"expense",amount:10,account:"cash",date:"2026-02-30",description:"X"}]',
    'backup.settings.appPin = {enabled:true,pin:"bad",answer:"bad",question:"Q"}'
  ];
  for (const corruption of corruptions) {
    r.run(`var backup = getDefaultState(); ${corruption};`);
    await assert.rejects(r.run('applyImportedData(backup)'), /Invalid backup/, corruption);
    assert.equal(r.storage.get('KaasiData'), before);
    assert.equal(r.run('state.accounts[0].balance'), 1000);
  }
  await assert.rejects(r.run('applyImportedData(JSON.parse(\'{"accounts":[],"transactions":[],"categories":[],"__proto__":{"polluted":true}}\'))'), /unsafe object key/);
  assert.equal(r.run('({}).polluted'), undefined);
});

test('valid legacy backup fills optional defaults without mutating the source', () => {
  const r = runtime();
  r.run('var backup = {accounts:[{id:"cash",name:"Cash",balance:12.345}],transactions:[],categories:["Other"]}; var prepared = prepareImportedData(backup);');
  assert.equal(r.run('prepared.accounts[0].balance'), 12.35);
  assert.equal(r.run('backup.accounts[0].balance'), 12.345);
  assert.equal(r.run('prepared.settings.initialSetupDone'), true);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
});

test('import rollback covers failed writes and rendering failures', async () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  r.localStorage.failMain = true;
  await assert.rejects(r.run('applyImportedData(getDefaultState())'), /not saved/);
  assert.equal(r.storage.get('KaasiData'), before);
  r.localStorage.failMain = false;
  r.context.initializeUI = () => { throw new Error('Simulated rendering failure'); };
  await assert.rejects(r.run('applyImportedData(getDefaultState())'), /rendering failure/);
  assert.equal(r.storage.get('KaasiData'), before);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
});

test('cloud restore validates before replacing the local backup', async () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  r.run('supabaseUser = {id:"test-user"};');
  const query = { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: { data: { accounts: [], transactions: null, categories: [] }, updated_at: '2026-10-20T00:00:00Z' } }) };
  r.context.testClient = { from: () => query }; r.run('supabaseClient = testClient;');
  await r.context.restoreFromSupabase(true);
  assert.equal(r.storage.get('KaasiData'), before);
  assert.ok(r.notices.some(([message]) => message.includes('Invalid backup')));
});

test('PIN lock blocks shortcuts and export/restore entry points, then restores interaction', () => {
  const r = runtime(); let exports = 0; const exportData = r.context.exportData;
  r.context.exportData = () => exports++;
  r.run('state.settings.appPin = { enabled:true, pin:"hash" };');
  r.context.showPinLockScreen();
  assert.equal(r.element('#app-content').inert, true);
  let prevented = false;
  r.context.handleKeyboardShortcuts({ ctrlKey: true, key: 'e', preventDefault() { prevented = true; } });
  assert.equal(exports, 0); assert.equal(prevented, true);
  exportData(); // Would require Blob/download DOM support if the guard were absent.
  r.context.checkAndTriggerBackupReminder = () => {};
  r.context.uiInitialized = true;
  r.context.onAppUnlocked();
  assert.equal(r.element('#app-content').inert, false);
  assert.equal(r.context.isAppLocked(), false);
});

test('monthly refresh redraws other-month date-range results and preserves expansion/search/scroll', () => {
  const r = runtime();
  r.element('#monthlyViewModal').style.display = 'block'; r.element('#monthlyViewModal').scrollTop = 120;
  const active = r.element("#monthTabs .tab-button[data-logically-active='true']"); active.dataset = { month: '9', year: '2026' };
  r.element('#monthlyTransactionsListContainer').scrollTop = 75;
  r.element('#monthlySearchInput').value = 'Lunch';
  const header = new Element(); header.dataset.dayKey = '2026-10-20';
  const group = new Element(); group.querySelector = () => ({ style: { maxHeight: '200px' } }); header.closest = () => group;
  r.context.document.querySelectorAll = selector => selector.includes('monthly-view-day-header') ? [header] : [];
  let captured;
  r.context.renderMonthlyDetails = (...args) => { captured = args; r.element('#monthlyTransactionsListContainer').scrollTop = 0; };
  r.context.refreshMonthlyViewIfRelevant('2026-09-15');
  assert.equal(captured[0], 9); assert.equal(captured[1], 2026);
  assert.ok(captured[2].has('2026-10-20')); assert.equal(captured[4], 'Lunch');
  assert.equal(r.element('#monthlyTransactionsListContainer').scrollTop, 75);
});

test('first-time setup binds filters and CC search exactly once', () => {
  const r = runtime();
  for (const name of ['applyAppearance', 'openInitialSetupWizard', 'setupMonthlyView', 'setupMobileDropdown', 'setupDeleteSlider', 'displayAppVersion', 'updateCcDashboardSectionVisibility']) r.context[name] = () => {};
  r.storage.set('KaasiData',r.run('JSON.stringify(getDefaultState())'));r.run('window.uiInitialized = false;');
  r.context.initializeUI();
  assert.equal(r.context.uiListenersInitialized, undefined);
  r.run('state.settings.initialSetupDone = true;'); r.context.initializeUI(true);
  const filter = r.element('#toggleAdvancedFiltersBtn'); const search = r.element('#ccHistorySearchInput');
  assert.equal(filter.events.get('click').length, 1); assert.equal(search.events.get('input').length, 1);
  r.context.initializeUI(true);
  assert.equal(filter.events.get('click').length, 1); assert.equal(search.events.get('input').length, 1);
});

test('renaming a hidden category preserves exclusions, budgets, and transfer defaults', async () => {
  const r = runtime();
  r.run('state.categories.push("Old"); state.hiddenCategories=["Old"]; state.budgets=[{id:"b1",name:"B",limit:100,categories:["Old"]}]; state.settings.defaultTransferFeeCategory="Old"; state.transactions=[{id:"t1",category:"Old"}];');
  for (const name of ['renderCategorySettingsList', 'refreshMonthlyViewIfRelevant', 'renderBudgetsSettingsList', 'buildBudgetCategoryCheckboxes']) r.context[name] = () => {};
  const input = { value: 'New', dataset: { originalName: 'Old' } };
  await r.context.renameCategory({ closest: () => ({ querySelector: () => input }) });
  assert.equal(r.run('state.hiddenCategories[0]'), 'New');
  assert.equal(r.run('isCategoryExcluded("New", "excludeFromMonthlyTotals")'), true);
  assert.equal(r.run('state.budgets[0].categories[0]'), 'New');
  assert.equal(r.run('state.settings.defaultTransferFeeCategory'), 'New');
});

test('user labels and record IDs render as data rather than HTML or inline JavaScript', () => {
  const r = runtime();
  r.run('state.accounts[0].name = \'<img src=x onerror="evil()">\'; state.transactions=[{id:"t1",type:"expense",amount:1,description:"<script>evil()</script>",account:"cash",category:"Other",date:"2026-10-20",timestamp:1}];');
  r.context.renderRecentTransactions();
  const html = r.element('#recentTransactionsList').children[0].innerHTML;
  assert.ok(!html.includes('<img')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;img')); assert.ok(html.includes('data-record-action="editTransaction"'));
  assert.ok(!html.includes('onclick='));
});

test('date defaults are today on launch while visibility changes preserve unfinished dates', () => {
  const r = runtime();
  for (const name of ['applyAppearance', 'setupMonthlyView', 'setupMobileDropdown', 'setupDeleteSlider', 'displayAppVersion', 'updateCcDashboardSectionVisibility']) r.context[name] = () => {};
  r.context.initializeUI();
  assert.equal(r.element('#date').value, r.context.getCurrentDateString());
  r.element('#date').value = '2026-01-15'; r.element('#ccDate').value = '2026-02-20';
  r.context.document.visibilityState = 'visible';
  for (const callback of r.documentEvents.get('visibilitychange') || []) callback();
  assert.equal(r.element('#date').value, '2026-01-15'); assert.equal(r.element('#ccDate').value, '2026-02-20');
  r.context.initializeUI(true);
  assert.equal(r.element('#date').value, r.context.getCurrentDateString());
});

function receivableEdit(values = {}) {
  return { preventDefault() {}, target: { values: {
    editReceivableId: 'r1', recOriginalAmount: '2000', recRemainingAmount: '2000',
    recType: 'cash', receivableSourceAccount: 'cash', recWho: 'Changed',
    recWhy: 'Changed reason', recDateGiven: '2026-10-20', ...values
  } } };
}

async function seedReceivable(r) {
  await r.run(`state.receivables = [{id:'r1',who:'Original',why:'Loan',dateGiven:'2026-10-01',
    type:'cash',sourceAccount:'cash',originalAmount:100,amount:100,remainingAmount:80,timestamp:1}];
    state.accounts[0].balance=900; saveData();`);
  r.context.renderCreditCardSection = () => {};
}

test('rejected receivable edit leaves every field and stored balance unchanged; retry uses original amount', async () => {
  const r = runtime(); await seedReceivable(r);
  const before = r.run('JSON.stringify(state)'); const saved = r.storage.get('KaasiData');
  await r.context.handleEditReceivableSubmit(receivableEdit());
  assert.equal(r.run('JSON.stringify(state)'), before);
  assert.equal(r.storage.get('KaasiData'), saved);
  await r.context.handleEditReceivableSubmit(receivableEdit({recOriginalAmount:'200',recRemainingAmount:'180'}));
  assert.equal(r.run('state.accounts[0].balance'), 800);
  assert.equal(r.run('state.receivables[0].originalAmount'), 200);
  assert.equal(r.run('state.receivables[0].remainingAmount'), 180);
});

test('receivable account/type switches validate first and financial save failure rolls back the whole edit', async () => {
  const r = runtime(); await seedReceivable(r);
  await r.run('state.accounts.push({id:"other",name:"Other bank",balance:50});saveData();');
  const before = r.run('JSON.stringify(state)');
  await r.context.handleEditReceivableSubmit(receivableEdit({receivableSourceAccount:'other'}));
  assert.equal(r.run('JSON.stringify(state)'), before);
  await r.context.handleEditReceivableSubmit(receivableEdit({receivableSourceAccount:'missing'}));
  assert.equal(r.run('JSON.stringify(state)'), before);
  r.localStorage.failMain = true;
  await assert.rejects(r.context.handleEditReceivableSubmit(receivableEdit({recOriginalAmount:'200',recRemainingAmount:'180'})), /not saved/);
  assert.equal(r.run('JSON.stringify(state)'), before);
  r.localStorage.failMain = false;
  await r.context.handleEditReceivableSubmit(receivableEdit({recType:'cc',recOriginalAmount:'100',recRemainingAmount:'80'}));
  assert.equal(r.run('state.accounts[0].balance'), 1000);
  assert.equal(r.run('state.receivables[0].sourceAccount'), null);
  await r.context.handleEditReceivableSubmit(receivableEdit({recOriginalAmount:'100',recRemainingAmount:'80',receivableSourceAccount:'other'}));
  assert.equal(r.run('state.receivables[0].type'), 'cc');
  assert.equal(r.run('state.accounts.find(a=>a.id==="other").balance'), 50);
});

async function seedCards(r) {
  await r.run(`state.creditCard.limit=10000;state.creditCard.transactions=[
    {id:'c1',amount:100,paidAmount:0,paidOff:false,description:'Online shopping shoes',date:'2026-10-20',timestamp:1},
    {id:'c2',amount:100,paidAmount:0,paidOff:false,description:'Online shopping groceries',date:'2026-10-20',timestamp:2}
  ];saveData();`);
  for (const name of ['renderCreditCardSection','refreshMonthlyViewIfRelevant','openCcHistoryModal']) r.context[name]=()=>{};
}

function cardPayment(r, id, amount = '20') {
  return r.context.handlePayCcItemSubmit({preventDefault(){},target:{values:{
    ccItemId:id,ccItemPayAmount:amount,ccPayFromAccount:'cash',logCcPaymentAsExpense:'on',ccPayCategory:'Groceries'
  }}});
}

test('CC payment links survive renaming/import; deleting a purchase preserves all recorded payments', async () => {
  const r = runtime(); await seedCards(r);
  await cardPayment(r,'c1'); await cardPayment(r,'c2');
  assert.equal(r.run('state.transactions[0].ccPurchaseId'), 'c1');
  assert.equal(r.run('prepareImportedData(JSON.parse(JSON.stringify(state))).transactions[0].ccPurchaseId'), 'c1');
  await r.run(`state.transactions.push({id:'legacy',type:'expense',amount:20,account:'cash',category:'Credit Card Payment',
    description:'Credit Card Payment: Online shopping shoes',date:'2026-10-20',timestamp:3});
    state.creditCard.transactions[0].description='Renamed purchase';saveData();`);
  const balance = r.run('state.accounts[0].balance');
  const payments = r.run('JSON.stringify(state.transactions)');
  let confirmed; r.context.showConfirmationModal = (...args) => { confirmed=args[4](); };
  r.context.deleteCcTransaction('c1'); await confirmed;
  assert.equal(r.run('state.transactions.length'), 3);
  assert.equal(r.run('JSON.stringify(state.transactions)'), payments);
  assert.equal(r.run('state.transactions.some(t=>t.ccPurchaseId==="c1")'), true);
  assert.equal(r.run('state.transactions.some(t=>t.ccPurchaseId==="c2")'), true);
  assert.equal(r.run('state.transactions.some(t=>t.id==="legacy")'), true);
  assert.equal(r.run('state.accounts[0].balance'), balance);
  assert.equal(r.run('state.creditCard.transactions.some(t=>t.id==="c1")'), false);
  assert.equal(JSON.parse(r.storage.get('KaasiData')).transactions.length, 3);
});

test('deleting a fully paid CC purchase keeps its payments, bank balance and other purchases intact', async () => {
  const r=runtime();await seedCards(r);await cardPayment(r,'c1','100');await cardPayment(r,'c2','20');
  const before=r.run('JSON.stringify({payments:state.transactions,accounts:state.accounts,other:state.creditCard.transactions[1]})');
  let confirmed;r.context.showConfirmationModal=(...args)=>{confirmed=args[4]();};
  r.context.deleteCcTransaction('c1');await confirmed;
  assert.equal(r.run('JSON.stringify({payments:state.transactions,accounts:state.accounts,other:state.creditCard.transactions[0]})'),before);
  assert.equal(r.run('state.creditCard.transactions.length'),1);
  assert.equal(r.run('prepareImportedData(JSON.parse(JSON.stringify(state))).transactions.length'),2);
});

test('deleting a payment expense continues to leave the CC purchase paid as requested', async () => {
  const r = runtime(); await seedCards(r); await cardPayment(r,'c1','100');
  let confirmed;r.context.showConfirmationModal = (...args) => {confirmed=args[4]();};
  const id=r.run('state.transactions[0].id'); r.context.deleteTransaction(id);await confirmed;
  assert.equal(r.run('state.creditCard.transactions[0].paidOff'), true);
  assert.equal(r.run('state.creditCard.transactions[0].paidAmount'), 100);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
});

function delayedBackup(r) {
  let finish, payload, uploads=0,row=null;
  const refresh=r.context.fetchAndUpdateLastCloudSyncTime;
  r.context.testClient={from:()=>{let write=false;return {
    insert(value){payload=value;uploads++;write=true;return this;},update(value){payload=value;uploads++;write=true;return this;},select(){return this;},eq(){return this;},
    maybeSingle(){return write?new Promise(resolve=>{finish=resolve;}):Promise.resolve({data:row&&{updated_at:row.updated_at},error:null});}};}};
  r.run('supabaseUser={id:"test-user"};supabaseClient=testClient;');
  r.context.fetchAndUpdateLastCloudSyncTime=()=>{};
  return {refresh,async ready(count=1){for(let i=0;i<100&&uploads<count;i++)await new Promise(setImmediate);assert.equal(uploads,count,'upload started');},
    complete(error=null){if(!error)row={...payload,updated_at:'2026-10-20T01:00:00Z'};finish({data:error?null:{updated_at:row.updated_at},error});},
    get payload(){return payload;},get uploads(){return uploads;}};
}

test('editing during upload leaves the uploaded snapshot fixed and new local edits pending, even inside two seconds', async () => {
  const r=runtime();const cloud=delayedBackup(r);const pending=r.context.executeBackupToSupabase();
  await cloud.ready();
  const uploaded=JSON.stringify(cloud.payload.data);
  await r.context.executeBackupToSupabase();assert.equal(cloud.uploads,1);
  await r.run('state.accounts[0].balance=990;saveData();');
  const editTime=r.storage.get('lastLocalDataModification');
  assert.equal(JSON.stringify(cloud.payload.data),uploaded);
  cloud.complete();await pending;
  assert.equal(r.storage.get('lastLocalDataModification'),editTime);
  assert.equal(r.storage.get('kaasi_synced_state_hash'),r.context.generateDataHash(uploaded));
  assert.equal(r.context.currentCloudSyncStatus,'local_newer');
  assert.ok(r.notices.some(([msg])=>msg.includes('still need syncing')));
  // Run the real cloud-status refresh to cover the former two-second blind spot.
  r.context.statusClient={from:()=>({select(){return this;},eq(){return this;},
    maybeSingle:async()=>({data:{updated_at:'2026-10-20T01:00:00Z'},error:null})})};
  r.run('supabaseClient=statusClient;');
  await cloud.refresh();
  assert.equal(r.context.currentCloudSyncStatus,'local_newer');
});

test('unchanged upload marks only its snapshot synced; failed uploads preserve sync metadata and allow retry', async () => {
  const r=runtime();const cloud=delayedBackup(r);const pending=r.context.executeBackupToSupabase();
  await cloud.ready();
  cloud.complete();await pending;
  assert.equal(r.context.currentCloudSyncStatus,'synced');assert.equal(r.context.cloudBackupInProgress,false);
  const hash=r.storage.get('kaasi_synced_state_hash');
  await r.run('state.accounts[0].balance=950;saveData();');
  const retry=r.context.executeBackupToSupabase();await cloud.ready(2);cloud.complete({message:'Simulated network failure'});await retry;
  assert.equal(r.storage.get('kaasi_synced_state_hash'),hash);assert.equal(r.context.cloudBackupInProgress,false);
  assert.ok(r.notices.some(([msg])=>msg.includes('Sync stopped')));
  const successfulRetry=r.context.executeBackupToSupabase();await cloud.ready(3);cloud.complete();await successfulRetry;
  assert.equal(r.context.currentCloudSyncStatus,'synced');
  assert.equal(r.storage.get('kaasi_synced_state_hash'),r.context.generateDataHash(r.run('JSON.stringify(state)')));
});

function syncCloud(r, initial) {
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const cloud={row:clone(initial),calls:[],beforeRead:null,beforeWrite:null,error:null};
  r.context.initializeUI=()=>{};
  r.context.openModalHelper=id=>{r.element(`#${id}`).style.display='block';};
  r.context.closeModal=id=>{r.element(`#${id}`).style.display='none';};
  r.context.showConfirmationModal=(...args)=>{cloud.confirm=args[4];};
  r.context.testClient={from:()=>{
    const call={type:'read',fields:null,filters:{},payload:null};
    return {select(fields){call.fields=fields;return this;},eq(key,value){call.filters[key]=value;return this;},
      update(value){call.type='update';call.payload=clone(value);return this;},insert(value){call.type='insert';call.payload=clone(value);return this;},
      async maybeSingle(){
        cloud.calls.push(clone(call));
        if(cloud.error)return {data:null,error:cloud.error};
        if(call.type==='read'){
          if(cloud.beforeRead)await cloud.beforeRead(call);
          return {data:cloud.row?(call.fields==='updated_at'?{updated_at:cloud.row.updated_at}:clone(cloud.row)):null,error:null};
        }
        if(cloud.beforeWrite)await cloud.beforeWrite(call);
        if(call.type==='insert'&&cloud.row)return {data:null,error:{code:'23505',message:'duplicate'}};
        if(call.type==='update'&&(!cloud.row||call.filters.updated_at!==cloud.row.updated_at))return {data:null,error:null};
        cloud.row={...clone(call.payload)};return {data:{updated_at:cloud.row.updated_at},error:null};
      }};
  }};
  r.run('supabaseUser={id:"sync-user"};supabaseClient=testClient;');
  cloud.baseline=async(data=JSON.parse(r.storage.get('KaasiData')),updated='2026-10-21T00:00:00Z')=>{
    await r.context.recordCloudSync('sync-user',data,updated,false);
  };
  return cloud;
}

test('manual Sync with an unchanged baseline checks metadata only and never transfers the dataset',async()=>{
  const r=runtime();const local=JSON.parse(r.storage.get('KaasiData'));
  const cloud=syncCloud(r,{data:local,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
  await r.context.syncCloudData();assert.equal(cloud.calls.length,1);
  assert.equal(cloud.calls[0].fields,'updated_at');assert.equal(cloud.calls[0].type,'read');
  assert.equal(r.context.currentCloudSyncStatus,'synced');assert.ok(r.notices.some(([m])=>m==='Already synced.'));
});

test('local-only changes use a conditional upload and return only metadata',async()=>{
  const r=runtime();const original=JSON.parse(r.storage.get('KaasiData'));
  const cloud=syncCloud(r,{data:original,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
  await r.run('state.accounts[0].balance=900;saveData();');await r.context.syncCloudData();
  const write=cloud.calls.find(c=>c.type==='update');assert.equal(write.filters.updated_at,'2026-10-21T00:00:00Z');
  assert.equal(write.filters.user_id,'sync-user');assert.equal(write.fields,'updated_at');
  assert.equal(cloud.row.data.accounts[0].balance,900);assert.equal(r.context.currentCloudSyncStatus,'synced');
});

test('cloud-only changes download and apply while preserving the compatible JSON format',async()=>{
  const r=runtime();const original=JSON.parse(r.storage.get('KaasiData'));
  const cloud=syncCloud(r,{data:original,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
  cloud.row.data.accounts[0].balance=750;cloud.row.updated_at='2026-10-22T00:00:00Z';
  await r.context.syncCloudData();assert.equal(r.run('state.accounts[0].balance'),750);
  assert.equal(cloud.calls.filter(c=>c.type!=='read').length,0);assert.equal(r.context.currentCloudSyncStatus,'synced');
});

test('without an account-specific baseline, unequal copies open review without writing either copy',async()=>{
  const r=runtime(),before=r.storage.get('KaasiData');const remote=JSON.parse(before);remote.accounts[0].balance=444;
  const cloud=syncCloud(r,{data:remote,updated_at:'2026-10-21T00:00:00Z'});
  // Legacy metadata from another account is deliberately not trusted.
  r.storage.set('kaasi_synced_state_hash',r.context.generateDataHash(before));r.storage.set('lastSyncedCloudUpdatedAt',cloud.row.updated_at);
  await r.context.syncCloudData();assert.equal(r.element('#cloudSyncModal').style.display,'block');
  assert.equal(r.storage.get('KaasiData'),before);assert.equal(cloud.calls.filter(c=>c.type!=='read').length,0);
  assert.equal(r.element('#cloudSyncChangedCount').textContent,'1');
});

test('first Sync recognizes equal copies despite object-key ordering without uploading',async()=>{
  const r=runtime();const local=JSON.parse(r.storage.get('KaasiData'));const reversed=Object.fromEntries(Object.entries(local).reverse());
  const cloud=syncCloud(r,{data:reversed,updated_at:'2026-10-21T00:00:00Z'});
  await r.context.syncCloudData();assert.equal(r.context.currentCloudSyncStatus,'synced');
  assert.ok(r.context.cloudSyncBaseline('sync-user'));assert.equal(cloud.calls.filter(c=>c.type!=='read').length,0);
});

test('both-changed status survives local edits and review replacement requires explicit confirmation',async()=>{
  const r=runtime();const original=JSON.parse(r.storage.get('KaasiData'));
  const cloud=syncCloud(r,{data:original,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
  cloud.row.data.accounts[0].balance=700;cloud.row.updated_at='2026-10-22T00:00:00Z';
  await r.context.refreshCloudSyncStatus();await r.run('state.accounts[0].balance=800;saveData();');
  assert.equal(r.context.currentCloudSyncStatus,'conflict');
  await r.context.syncCloudData();r.context.chooseCloudSyncCopy('local');
  assert.equal(cloud.calls.filter(c=>c.type!=='read').length,0);
  await cloud.confirm();assert.equal(cloud.row.data.accounts[0].balance,800);
  assert.equal(r.element('#cloudSyncModal').style.display,'none');
});

test('review rejects a local change made after comparison without replacing cloud',async()=>{
  const r=runtime();const remote=JSON.parse(r.storage.get('KaasiData'));remote.accounts[0].balance=444;
  const cloud=syncCloud(r,{data:remote,updated_at:'2026-10-21T00:00:00Z'});
  await r.context.syncCloudData();r.context.chooseCloudSyncCopy('local');
  await r.run('state.accounts[0].balance=999;saveData();');await cloud.confirm();
  assert.equal(cloud.calls.filter(c=>c.type!=='read').length,0);assert.equal(cloud.row.data.accounts[0].balance,444);
  assert.ok(r.notices.some(([m])=>m.includes('Local data changed')));
});

test('review rejects an account switch and cloud edits after comparison',async()=>{
  const r=runtime();const before=r.storage.get('KaasiData'),remote=JSON.parse(before);remote.accounts[0].balance=444;
  const cloud=syncCloud(r,{data:remote,updated_at:'2026-10-21T00:00:00Z'});
  await r.context.syncCloudData();r.context.chooseCloudSyncCopy('cloud');
  cloud.row.updated_at='2026-10-22T00:00:00Z';await cloud.confirm();assert.equal(r.storage.get('KaasiData'),before);
  r.run('supabaseUser={id:"other-user"};');r.context.chooseCloudSyncCopy('local');await cloud.confirm();
  assert.equal(cloud.calls.filter(c=>c.type!=='read').length,0);assert.equal(r.storage.get('KaasiData'),before);
});

test('conditional upload cannot overwrite a cloud change between check and write',async()=>{
  const r=runtime();const remote=JSON.parse(r.storage.get('KaasiData'));const cloud=syncCloud(r,{data:remote,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
  await r.run('state.accounts[0].balance=900;saveData();');
  cloud.beforeWrite=()=>{cloud.row.updated_at='2026-10-22T00:00:00Z';cloud.row.data.accounts[0].balance=500;};
  await r.context.syncCloudData();assert.equal(cloud.row.data.accounts[0].balance,500);
  assert.equal(r.run('state.accounts[0].balance'),900);assert.ok(r.notices.some(([m])=>m.includes('Nothing was overwritten')));
  assert.equal(r.context.cloudSyncBaseline('sync-user').updatedAt,'2026-10-21T00:00:00Z');
});

test('first-upload collision preserves the existing cloud row',async()=>{
  const r=runtime();const cloud=syncCloud(r,null);
  cloud.beforeWrite=()=>{cloud.row={data:{keep:true},updated_at:'2026-10-22T00:00:00Z'};};
  await r.context.syncCloudData();assert.equal(cloud.row.data.keep,true);assert.equal(r.context.cloudSyncBaseline('sync-user'),null);
});

test('local edits during cloud download prevent replacement',async()=>{
  const r=runtime();const original=JSON.parse(r.storage.get('KaasiData'));
  const cloud=syncCloud(r,{data:original,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
  cloud.row.data.accounts[0].balance=500;cloud.row.updated_at='2026-10-22T00:00:00Z';
  cloud.beforeRead=async call=>{if(call.fields.includes('data'))await r.run('state.accounts[0].balance=600;saveData();');};
  await r.context.syncCloudData();assert.equal(r.run('state.accounts[0].balance'),600);
  assert.ok(r.notices.some(([m])=>m.includes('Local data changed')));
});

test('failed downloads, invalid backups, and failed local writes preserve saved data',async()=>{
  for(const failure of ['network','invalid','storage']){
    const r=runtime();const before=r.storage.get('KaasiData'),original=JSON.parse(before);
    const cloud=syncCloud(r,{data:original,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline();
    cloud.row.updated_at='2026-10-22T00:00:00Z';cloud.row.data.accounts[0].balance=500;
    if(failure==='network')cloud.error={message:'Network failed'};
    if(failure==='invalid')cloud.row.data.transactions=null;
    if(failure==='storage')r.localStorage.failMain=true;
    await r.context.syncCloudData();assert.equal(r.storage.get('KaasiData'),before,failure);
    assert.equal(r.context.cloudSyncBaseline('sync-user').updatedAt,'2026-10-21T00:00:00Z');
  }
});

test('offline status is unknown and Sync does not upload or download',async()=>{
  const r=runtime();const cloud=syncCloud(r,null);r.context.navigator.onLine=false;
  await r.context.refreshCloudSyncStatus();assert.equal(r.context.currentCloudSyncStatus,'unknown');
  await r.context.syncCloudData();assert.equal(cloud.calls.length,0);
});

test('comparison labels missing records accurately, redacts security values, and paginates safely',async()=>{
  const r=runtime();const local=JSON.parse(r.storage.get('KaasiData')),remote=JSON.parse(JSON.stringify(local));
  local.transactions=Array.from({length:31},(_,i)=>({id:`local_${i}`,amount:1,description:'<img src=x onerror=alert(1)>',date:'2026-10-21',type:'expense',account:'cash',category:'Other',timestamp:i}));
  remote.transactions=[{...local.transactions[0],id:'remote_1'}];
  local.settings.appPin={enabled:true,pin:'private-pin-hash',answer:'private-answer-hash'};
  const changes=r.context.cloudSyncDifferences(local,remote);
  assert.equal(changes.filter(c=>c.kind==='Only on this device').length,31);
  assert.equal(changes.filter(c=>c.kind==='Only in cloud').length,1);
  assert.ok(!JSON.stringify(changes).includes('private-pin-hash'));assert.ok(!JSON.stringify(changes).includes('private-answer-hash'));
  const cloud=syncCloud(r,{data:remote,updated_at:'2026-10-21T00:00:00Z'});
  r.context.reviewLocal=local;r.context.reviewRemote=remote;
  r.run('cloudSyncReview={userId:"sync-user",local:reviewLocal,cloud:reviewRemote};');
  r.context.renderCloudSyncReview();assert.equal(r.element('#cloudSyncDifferences').children.length,25);
  assert.equal(r.element('#cloudSyncPage').textContent,'1 / 2');
  const first=r.element('#cloudSyncDifferences').children[0];const title=first.children[0].children[0];assert.match(title.textContent,/<img/);assert.equal(title.innerHTML,'');
  assert.equal(first.children[1].children[0].textContent,'Present');assert.equal(first.children[2].children[0].textContent,'Absent');
  r.element('#cloudSyncNext').onclick();assert.equal(r.element('#cloudSyncPage').textContent,'2 / 2');
  const remoteRow=r.element('#cloudSyncDifferences').children.find(row=>row.children[1]?.children[0]?.textContent==='Absent');
  assert.equal(remoteRow.children[2].children[0].textContent,'Present');assert.equal(cloud.calls.length,0);
});

test('long comparison descriptions and values stay complete, escaped, and separate from dates',()=>{
  const r=runtime();const local=JSON.parse(r.storage.get('KaasiData')),remote=JSON.parse(JSON.stringify(local));
  const description='<img src=x onerror=alert(1)> '+ 'Long household grocery description. '.repeat(100);
  const entry={id:'long-description',amount:2000,description,date:'2026-10-22',type:'expense',account:'cash',category:'Groceries',timestamp:1};
  local.transactions=[entry];remote.transactions=[{...entry,description:description+'Extra cloud note.',amount:1500}];
  r.context.reviewLocal=local;r.context.reviewRemote=remote;
  r.run('cloudSyncReview={userId:"sync-user",local:reviewLocal,cloud:reviewRemote};');
  r.context.renderCloudSyncReview();
  const row=r.element('#cloudSyncDifferences').children[0];
  const title=row.children[0].children[0],toggle=row.children[0].children[1];
  assert.equal(title.textContent,description.trim());assert.equal(title.innerHTML,'');assert.equal(toggle.textContent,'Show More');
  assert.match(row.children[0].children[2].textContent,/22/);
  assert.equal(row.children[1].children[0].children[0].textContent,'2,000.00');
  assert.equal(row.children[2].children[0].children[0].textContent,'1,500.00');
  assert.equal(row.children[1].children.length,1);assert.equal(row.children[2].children.length,1);
  assert.match(row.children[0].children[2].textContent,/Description Changed/);
  const detailRow=r.element('#cloudSyncDifferences').children[1];assert.equal(detailRow.hidden,true);
  assert.equal(detailRow.children[0].getAttribute('colspan'),'3');
  toggle.onclick();assert.equal(detailRow.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');
  assert.equal(toggle.textContent,'Show Less');
  const sections=detailRow.children[0].children[0].children;
  assert.equal(sections.length,2);assert.equal(sections[0].children[1].textContent,description);
  assert.equal(sections[0].children[0].textContent,'This Device · Description');
  assert.equal(sections[1].children[1].textContent,description+'Extra cloud note.');
  toggle.onclick();assert.equal(detailRow.hidden,true);assert.equal(toggle.textContent,'Show More');
  assert.equal(local.transactions[0].description,description);assert.equal(remote.transactions[0].description,description+'Extra cloud note.');
  local.transactions[0].description='Lunch';remote.transactions[0].description='Lunch with team';remote.transactions[0].amount=2000;
  r.context.renderCloudSyncReview();
  const descriptionOnly=r.element('#cloudSyncDifferences').children[0],descriptionDetails=r.element('#cloudSyncDifferences').children[1];
  assert.equal(descriptionOnly.children[1].textContent,'—');assert.equal(descriptionOnly.children[2].textContent,'—');
  assert.match(descriptionOnly.children[0].children[2].textContent,/Description Changed/);
  descriptionOnly.children[0].children[1].onclick();assert.equal(descriptionDetails.hidden,false);
  const wording=descriptionDetails.children[0].children[0].children;
  assert.equal(wording[0].children[1].textContent,'Lunch');assert.equal(wording[1].children[1].textContent,'Lunch with team');
});

test('single cloud shortcut uses upload/download/conflict colours and local shortcuts remain available',()=>{
  const r=runtime();r.context.updateHeaderShortcutButtons=vm.runInContext('updateHeaderShortcutButtons',r.context);
  // runtime substitutes a rendering stub; load the actual function for this UI check.
  const source=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
  vm.runInContext(source.slice(source.indexOf('function updateHeaderShortcutButtons()'),source.indexOf('let lastCloudSyncTimeString')),r.context);
  r.element('#shortcutCloud').checked=true;r.element('#shortcutCloud').disabled=false;
  for(const [status,colour] of [['local_newer','pulse-orange'],['cloud_newer','pulse-green'],['conflict','pulse-sync-conflict']]){
    r.element('#syncCloudBtn').classList.add('pulse-orange','pulse-green','pulse-sync-conflict');
    r.context.currentCloudSyncStatus=status;r.context.updateHeaderShortcutButtons();
    assert.equal(r.element('#headerBackupBtn').classList.contains(colour),true);
    for(const pulse of ['pulse-orange','pulse-green','pulse-sync-conflict']) assert.equal(r.element('#syncCloudBtn').classList.contains(pulse),false);
    assert.match(r.element('#headerBackupBtn').dataset.tooltip,/Ctrl\+S/);
    assert.equal(r.element('#headerRestoreBtn').hidden,true);assert.equal(r.element('#headerBackupBtn').onclick,r.context.syncCloudData);
  }
  r.element('#shortcutCloud').checked=false;r.context.updateHeaderShortcutButtons();
  assert.equal(r.element('#headerRestoreBtn').hidden,false);assert.equal(r.element('#headerBackupBtn').onclick,r.context.exportData);
});

test('cloud backup times use calendar-relative days and readable local times',()=>{
  const r=runtime(),format=(date,now)=>r.context.formatCloudBackupTime(date.toISOString(),now).replace(/\s+/g,' ');
  assert.equal(format(new Date(2026,9,23,19,30),new Date(2026,9,23,20,0)),'Today at 7:30 PM');
  assert.equal(format(new Date(2026,9,22,19,30),new Date(2026,9,23,0,5)),'Yesterday at 7:30 PM');
  assert.equal(format(new Date(2026,11,31,23,59),new Date(2027,0,1,0,5)),'Yesterday at 11:59 PM');
  assert.equal(format(new Date(2026,9,20,7,5),new Date(2026,9,23,12,0)),'20 Oct at 7:05 AM');
  assert.equal(format(new Date(2025,9,20,7,5),new Date(2026,9,23,12,0)),'20 Oct 2025 at 7:05 AM');
  assert.equal(r.context.formatCloudBackupTime('invalid'),'Unavailable');
});

test('Ctrl+S syncs and Ctrl+E/I remain local in either dashboard mode, with input and lock guards',()=>{
  const r=runtime(),calls=[];
  r.context.syncCloudData=()=>calls.push('sync');r.context.exportData=()=>calls.push('export');r.context.triggerDataImport=()=>calls.push('import');
  const press=(key,extra={})=>{let prevented=false;r.context.handleKeyboardShortcuts({key,ctrlKey:true,altKey:false,metaKey:false,shiftKey:false,repeat:false,preventDefault(){prevented=true;},...extra});return prevented;};
  for(const mode of [false,true]){
    r.element('#shortcutCloud').checked=mode;r.element('#shortcutCloud').disabled=false;
    for(const key of ['s','e','i'])assert.equal(press(key),true);
  }
  assert.deepEqual(calls,['sync','export','import','sync','export','import']);calls.length=0;
  assert.equal(press('s',{repeat:true}),true);assert.equal(press('S',{shiftKey:true}),false);
  r.context.document.activeElement.tagName='INPUT';assert.equal(press('s'),true);press('e');press('i');
  r.context.document.activeElement.tagName='DIV';
  r.run('state.settings.appPin={enabled:true,pin:"hash"};');r.context.showPinLockScreen();
  for(const key of ['s','e','i'])assert.equal(press(key),true);
  assert.deepEqual(calls,[]);
});

test('focus checks transfer metadata only; account changes clear the previous comparison',async()=>{
  const r=runtime();const original=JSON.parse(r.storage.get('KaasiData'));const cloud=syncCloud(r,{data:original,updated_at:'2026-10-21T00:00:00Z'});
  r.context.uiInitialized=true;r.context.document.visibilityState='visible';
  r.context.checkVisibleCloudSync();await new Promise(setImmediate);await new Promise(setImmediate);
  assert.equal(cloud.calls.length,1);assert.equal(cloud.calls[0].fields,'updated_at');
  assert.equal(cloud.calls[0].type,'read');
  r.context.reviewLocal=original;r.run('cloudSyncReview={userId:"sync-user",local:reviewLocal,cloud:reviewLocal};');
  r.context.renderCloudSyncReview();r.element('#cloudSyncModal').style.display='block';
  r.context.resetCloudSyncAccount({id:'different-user'});
  assert.equal(r.element('#cloudSyncDifferences').children.length,0);
  assert.equal(r.element('#cloudSyncModal').style.display,'none');assert.equal(r.run('cloudSyncReview'),null);
});

test('legacy mode cannot replace data without recovery protection',async()=>{
  const r=runtime();const original=JSON.parse(r.storage.get('KaasiData')),remote=JSON.parse(JSON.stringify(original));remote.accounts[0].balance=500;
  const cloud=syncCloud(r,{data:remote,updated_at:'2026-10-21T00:00:00Z'});
  await r.context.syncCloudData();
  r.context.KaasiStorage.mode='legacy';r.context.chooseCloudSyncCopy('cloud');await cloud.confirm();
  assert.equal(r.run('state.accounts[0].balance'),1000);assert.ok(r.notices.some(([m])=>m.includes('Complete the local storage upgrade')));
});

test('bulk CC payments save a separate purchase ID for each payment', async () => {
  const r=runtime(); const openHistory=r.context.openCcHistoryModal; await seedCards(r);
  r.context.openModalHelper=()=>{};
  openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);
  let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;};
  r.context.openBulkPayCcItemForm();
  await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'100',payAmount_c2:'100',logBulkCcPaymentAsExpense:'on',payCategory_c1:'Groceries',payCategory_c2:'Other'}}});
  assert.equal(r.run('state.transactions.length'),2);
  assert.equal(r.run('state.transactions[0].ccPurchaseId'),'c1');
  assert.equal(r.run('state.transactions[1].ccPurchaseId'),'c2');
  assert.equal(r.run('state.accounts[0].balance'),800);
});

test('partial multiple payments use explicit amounts, retain unpaid balances, and skip zero entries', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);r.context.openModalHelper=()=>{};openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;};r.context.openBulkPayCcItemForm();
  r.context.ccSelectedItems.clear(); // The form owns its selection even if the list changes.
  await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'20+5.15',payAmount_c2:'0',logBulkCcPaymentAsExpense:'on',payCategory_c1:'Groceries'}}});
  assert.equal(r.run('state.accounts[0].balance'),974.85);
  assert.equal(r.run('state.creditCard.transactions[0].paidAmount'),25.15);
  assert.equal(r.run('state.creditCard.transactions[0].paidOff'),false);
  assert.equal(r.run('state.creditCard.transactions[1].paidAmount'),0);
  assert.equal(r.run('state.transactions.length'),1);
  assert.equal(r.run('state.transactions[0].amount'),25.15);
  assert.equal(JSON.parse(r.storage.get('KaasiData')).accounts[0].balance,974.85);
});

test('invalid or outdated multiple-payment amounts never mutate financial data', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);r.context.openModalHelper=()=>{};openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;};r.context.openBulkPayCcItemForm();
  for(const amount of ['', '-1', '101', 'Infinity', 'nope', '0']){
    const before=r.run('JSON.stringify(state)');
    await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:amount,payAmount_c2:'0'}}});
    assert.equal(r.run('JSON.stringify(state)'),before);
  }
  r.run('state.creditCard.transactions[0].paidAmount=95;');
  const before=r.run('JSON.stringify(state)');
  await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'25',payAmount_c2:'20'}}});
  assert.equal(r.run('JSON.stringify(state)'),before);
});

test('bulk CC settlement without expense logging deducts funds without changing existing payment records', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);await cardPayment(r,'c1','20');r.context.openModalHelper=()=>{};openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;assert.match(html,/Log as Expense/);};
  r.context.openBulkPayCcItemForm();
  const before=r.run('JSON.stringify(state.transactions)');
  await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'80',payAmount_c2:'100'}}});
  assert.equal(r.run('state.accounts[0].balance'),800);
  assert.equal(r.run('state.creditCard.transactions.every(item=>item.paidOff && item.paidAmount===item.amount)'),true);
  assert.equal(r.run('JSON.stringify(state.transactions)'),before);
  assert.equal(JSON.parse(r.storage.get('KaasiData')).accounts[0].balance,800);
});

test('bulk CC expense validation and insufficient funds leave all purchases and balances untouched', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);r.context.openModalHelper=()=>{};openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;};r.context.openBulkPayCcItemForm();
  const before=r.run('JSON.stringify(state)');
  await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'100',payAmount_c2:'100',logBulkCcPaymentAsExpense:'on',payCategory_c1:'Groceries'}}});
  assert.equal(r.run('JSON.stringify(state)'),before);
  r.run('state.accounts[0].balance=1;');const insufficient=r.run('JSON.stringify(state)');
  await submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'100',payAmount_c2:'100'}}});
  assert.equal(r.run('JSON.stringify(state)'),insufficient);
});

test('bulk expense toggle removes category requirements and restores them when re-enabled', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);r.context.openModalHelper=()=>{};openHistory();
  r.context.ccSelectedItems=new Set(['c1']);r.context.openFormModal=()=>{};r.context.openBulkPayCcItemForm();
  const select=new Element();r.element('#dynamicForm').querySelectorAll=()=>[select];
  const input=new Element();input.value='50';select.parentElement=new Element();
  r.element('#dynamicForm').elements={namedItem:name=>name.startsWith('payAmount_')?input:select};
  const toggle=r.element('#logBulkCcPaymentAsExpense');toggle.checked=false;toggle.onchange();
  assert.equal(select.required,false);assert.equal(select.disabled,true);assert.equal(select.hidden,true);
  toggle.checked=true;toggle.onchange();assert.equal(select.required,true);assert.equal(select.disabled,false);assert.equal(select.hidden,false);
  assert.equal(r.element('#ccPaymentRemainingGroup').hidden,false);
  input.value='100';r.element('#dynamicForm').oninput();
  assert.equal(r.element('#ccPaymentRemainingGroup').hidden,true);
});

test('single payment remaining preview is shown only for a valid partial payment', async () => {
  const r=runtime();await seedCards(r);let html;
  r.context.openFormModal=(title,markup)=>{html=markup;};r.context.populateDropdowns=()=>{};
  r.context.openPayCcItemForm('c1');
  assert.match(html,/id="ccSinglePaymentRemainingGroup"[^>]*hidden/);
  assert.ok(!html.includes('Pay in full or enter a smaller amount.'));
  const input=r.element('#ccItemPayAmount');
  for(const [value,hidden] of [['50',false],['100',true],['0',true],['150',true],['',true]]){
    input.oninput({target:{value}});
    assert.equal(r.element('#ccSinglePaymentRemainingGroup').hidden,hidden);
  }
});

test('multiple selection makes rows select purchases without attaching action drawers', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);r.context.openModalHelper=()=>{};openHistory();
  r.element('#ccSelectMultipleBtn').onclick();
  const row=r.element('#ccHistoryListContainer').children[1];
  assert.equal(row.children.length,1);
  let selected;r.context.toggleCcItemSelection=id=>{selected=id;};
  row.children[0].onclick();assert.equal(selected,undefined);
  row.onclick();assert.equal(selected,'c2');
});

test('modal backdrop dismisses only clicks that start and end on the backdrop', () => {
  const r=runtime();const modal=new Element();const content=new Element();
  const pointer=(type,target)=>r.windowEvents.get(type).forEach(fn=>fn({target}));
  pointer('pointerdown',content);pointer('pointerup',modal);
  assert.equal(r.context.isModalBackdropClick({target:modal,detail:1},modal),false);
  pointer('pointerdown',modal);pointer('pointerup',content);
  assert.equal(r.context.isModalBackdropClick({target:modal,detail:1},modal),false);
  pointer('pointerdown',modal);pointer('pointerup',modal);
  assert.equal(r.context.isModalBackdropClick({target:modal,detail:1},modal),true);
  pointer('pointercancel',modal);assert.equal(r.context.isModalBackdropClick({target:modal,detail:1},modal),false);
  assert.equal(r.context.isModalBackdropClick({target:modal,detail:0},modal),true);
});

test('calculator leaves drafts unchanged on blur and evaluates explicitly on Tab, Enter, or equals', () => {
  const r=runtime();const input=new Element();input.classList.add('calc-amount');input.value='10+5';
  r.documentEvents.get('focusout').forEach(fn=>fn({target:input}));assert.equal(input.value,'10+5');
  const key=key=>{let prevented=false;const event={key,target:input,preventDefault(){prevented=true;}};
    r.documentEvents.get('keydown').forEach(fn=>fn(event));return prevented;};
  assert.equal(key('Tab'),false);assert.equal(Number(input.value),15);
  input.value='20+5';assert.equal(key('Enter'),true);assert.equal(Number(input.value),25);
  input.value='25';assert.equal(key('Enter'),false);
  input.value='20/0';key('Tab');assert.equal(input.value,'20/0');
  input.value='30+5=';r.documentEvents.get('input').forEach(fn=>fn({target:input}));assert.equal(Number(input.value),35);
});

test('failed bulk CC settlement restores the balance and all purchase payment states', async () => {
  const r=runtime();const openHistory=r.context.openCcHistoryModal;await seedCards(r);r.context.openModalHelper=()=>{};openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;};r.context.openBulkPayCcItemForm();
  const before=r.run('JSON.stringify(state)');r.localStorage.failMain=true;
  await assert.rejects(submit({preventDefault(){},target:{values:{payFromAccount:'cash',payAmount_c1:'100',payAmount_c2:'100'}}}),/not saved/);
  assert.equal(r.run('JSON.stringify(state)'),before);
  assert.equal(r.notices.some(([message])=>message.includes('Settled')),false);
});
