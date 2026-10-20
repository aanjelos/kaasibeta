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
    getComputedStyle: () => ({ getPropertyValue: () => '', position: 'relative' }),
    FormData: class { constructor(form) { this.values = form.values; } get(key) { return this.values[key] ?? null; } },
    Event: class { constructor(type) { this.type = type; } }
  });
  context.window = context;
  for (const file of ['globals', 'import-validation', 'animations', 'data-sync', 'math-tool', 'settings', 'charts', 'ui', 'features', 'security', 'app']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'js', `${file}.js`), 'utf8'), context, { filename: `${file}.js` });
  }
  const run = source => vm.runInContext(source, context);
  const notices = []; context.showNotification = (...args) => notices.push(args);
  for (const name of ['renderDashboard', 'populateDropdowns', 'updateHeaderShortcutButtons']) context[name] = () => {};
  run('loadData(); state.settings.initialSetupDone = true; state.accounts[0].balance = 1000; saveData();');
  notices.length = 0;
  return { context, run, element, documentEvents, windowEvents, storage, localStorage, notices, timers };
}

test('all application scripts parse', () => {
  for (const name of fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'))) {
    new vm.Script(fs.readFileSync(path.join(root, 'js', name), 'utf8'), { filename: name });
  }
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

test('failed financial save retains previous data and form input without a success message', () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  const form = { values: { transactionType: 'expense', amount: '100', account: 'cash', category: 'Other', description: 'Lunch', date: '2026-10-20' }, reset() { this.resetCalled = true; }, querySelector() { return null; } };
  r.localStorage.failMain = true;
  assert.throws(() => r.context.handleTransactionSubmit({ preventDefault() {}, target: form }), /not saved/);
  assert.equal(r.storage.get('KaasiData'), before);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
  assert.equal(r.run('state.transactions.length'), 0);
  assert.equal(form.resetCalled, undefined);
  assert.ok(!r.notices.some(([, type]) => type === 'success'));
  r.localStorage.failMain = false;
  r.context.handleTransactionSubmit({ preventDefault() {}, target: form });
  assert.equal(r.run('state.accounts[0].balance'), 900);
  assert.equal(r.run('state.transactions.length'), 1);
});

test('save rollback preserves captured account references for retrying a confirmation', () => {
  const r = runtime(); r.run('var capturedAccount = state.accounts[0]; capturedAccount.balance -= 100;');
  r.localStorage.failMain = true;
  assert.throws(() => r.context.saveData());
  assert.equal(r.run('capturedAccount === state.accounts[0]'), true);
  assert.equal(r.run('capturedAccount.balance'), 1000);
});

test('optional metadata failure does not undo a successful financial save', () => {
  const r = runtime(); r.localStorage.failMetadata = true;
  r.run('state.accounts[0].balance = 500; saveData();');
  assert.equal(JSON.parse(r.storage.get('KaasiData')).accounts[0].balance, 500);
});

test('invalid backups never modify state or storage, including unsafe keys and record IDs', () => {
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
    assert.throws(() => r.run('applyImportedData(backup)'), /Invalid backup/, corruption);
    assert.equal(r.storage.get('KaasiData'), before);
    assert.equal(r.run('state.accounts[0].balance'), 1000);
  }
  assert.throws(() => r.run('applyImportedData(JSON.parse(\'{"accounts":[],"transactions":[],"categories":[],"__proto__":{"polluted":true}}\'))'), /unsafe object key/);
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

test('import rollback covers failed writes and rendering failures', () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  r.localStorage.failMain = true;
  assert.throws(() => r.run('applyImportedData(getDefaultState())'), /not saved/);
  assert.equal(r.storage.get('KaasiData'), before);
  r.localStorage.failMain = false;
  r.context.initializeUI = () => { throw new Error('Simulated rendering failure'); };
  assert.throws(() => r.run('applyImportedData(getDefaultState())'), /rendering failure/);
  assert.equal(r.storage.get('KaasiData'), before);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
});

test('cloud restore validates before replacing the local backup', async () => {
  const r = runtime(); const before = r.storage.get('KaasiData');
  r.run('supabaseUser = {id:"test-user"};');
  const query = { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
    single: async () => ({ data: { data: { accounts: [], transactions: null, categories: [] }, updated_at: '2026-10-20T00:00:00Z' } }) };
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
  r.run('localStorage.removeItem("KaasiData"); window.uiInitialized = false;');
  r.context.initializeUI();
  assert.equal(r.context.uiListenersInitialized, undefined);
  r.run('state.settings.initialSetupDone = true;'); r.context.initializeUI(true);
  const filter = r.element('#toggleAdvancedFiltersBtn'); const search = r.element('#ccHistorySearchInput');
  assert.equal(filter.events.get('click').length, 1); assert.equal(search.events.get('input').length, 1);
  r.context.initializeUI(true);
  assert.equal(filter.events.get('click').length, 1); assert.equal(search.events.get('input').length, 1);
});

test('renaming a hidden category preserves exclusions, budgets, and transfer defaults', () => {
  const r = runtime();
  r.run('state.categories.push("Old"); state.hiddenCategories=["Old"]; state.budgets=[{id:"b1",name:"B",limit:100,categories:["Old"]}]; state.settings.defaultTransferFeeCategory="Old"; state.transactions=[{id:"t1",category:"Old"}];');
  for (const name of ['renderCategorySettingsList', 'refreshMonthlyViewIfRelevant', 'renderBudgetsSettingsList', 'buildBudgetCategoryCheckboxes']) r.context[name] = () => {};
  const input = { value: 'New', dataset: { originalName: 'Old' } };
  r.context.renameCategory({ closest: () => ({ querySelector: () => input }) });
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

function seedReceivable(r) {
  r.run(`state.receivables = [{id:'r1',who:'Original',why:'Loan',dateGiven:'2026-10-01',
    type:'cash',sourceAccount:'cash',originalAmount:100,amount:100,remainingAmount:80,timestamp:1}];
    state.accounts[0].balance=900; saveData();`);
  r.context.renderCreditCardSection = () => {};
}

test('rejected receivable edit leaves every field and stored balance unchanged; retry uses original amount', () => {
  const r = runtime(); seedReceivable(r);
  const before = r.run('JSON.stringify(state)'); const saved = r.storage.get('KaasiData');
  r.context.handleEditReceivableSubmit(receivableEdit());
  assert.equal(r.run('JSON.stringify(state)'), before);
  assert.equal(r.storage.get('KaasiData'), saved);
  r.context.handleEditReceivableSubmit(receivableEdit({recOriginalAmount:'200',recRemainingAmount:'180'}));
  assert.equal(r.run('state.accounts[0].balance'), 800);
  assert.equal(r.run('state.receivables[0].originalAmount'), 200);
  assert.equal(r.run('state.receivables[0].remainingAmount'), 180);
});

test('receivable account/type switches validate first and financial save failure rolls back the whole edit', () => {
  const r = runtime(); seedReceivable(r);
  r.run('state.accounts.push({id:"other",name:"Other bank",balance:50});saveData();');
  const before = r.run('JSON.stringify(state)');
  r.context.handleEditReceivableSubmit(receivableEdit({receivableSourceAccount:'other'}));
  assert.equal(r.run('JSON.stringify(state)'), before);
  r.context.handleEditReceivableSubmit(receivableEdit({receivableSourceAccount:'missing'}));
  assert.equal(r.run('JSON.stringify(state)'), before);
  r.localStorage.failMain = true;
  assert.throws(() => r.context.handleEditReceivableSubmit(receivableEdit({recOriginalAmount:'200',recRemainingAmount:'180'})), /not saved/);
  assert.equal(r.run('JSON.stringify(state)'), before);
  r.localStorage.failMain = false;
  r.context.handleEditReceivableSubmit(receivableEdit({recType:'cc',recOriginalAmount:'100',recRemainingAmount:'80'}));
  assert.equal(r.run('state.accounts[0].balance'), 1000);
  assert.equal(r.run('state.receivables[0].sourceAccount'), null);
  r.context.handleEditReceivableSubmit(receivableEdit({recOriginalAmount:'100',recRemainingAmount:'80',receivableSourceAccount:'other'}));
  assert.equal(r.run('state.receivables[0].type'), 'cc');
  assert.equal(r.run('state.accounts.find(a=>a.id==="other").balance'), 50);
});

function seedCards(r) {
  r.run(`state.creditCard.limit=10000;state.creditCard.transactions=[
    {id:'c1',amount:100,paidAmount:0,paidOff:false,description:'Online shopping shoes',date:'2026-10-20',timestamp:1},
    {id:'c2',amount:100,paidAmount:0,paidOff:false,description:'Online shopping groceries',date:'2026-10-20',timestamp:2}
  ];saveData();`);
  for (const name of ['renderCreditCardSection','refreshMonthlyViewIfRelevant','openCcHistoryModal']) r.context[name]=()=>{};
}

function cardPayment(r, id, amount = '20') {
  r.context.handlePayCcItemSubmit({preventDefault(){},target:{values:{
    ccItemId:id,ccItemPayAmount:amount,ccPayFromAccount:'cash',logCcPaymentAsExpense:'on',ccPayCategory:'Groceries'
  }}});
}

test('CC payment links survive renaming/import; deleting a purchase never matches descriptions/categories', () => {
  const r = runtime(); seedCards(r);
  cardPayment(r,'c1'); cardPayment(r,'c2');
  assert.equal(r.run('state.transactions[0].ccPurchaseId'), 'c1');
  assert.equal(r.run('prepareImportedData(JSON.parse(JSON.stringify(state))).transactions[0].ccPurchaseId'), 'c1');
  r.run(`state.transactions.push({id:'legacy',type:'expense',amount:20,account:'cash',category:'Credit Card Payment',
    description:'Credit Card Payment: Online shopping shoes',date:'2026-10-20',timestamp:3});
    state.creditCard.transactions[0].description='Renamed purchase';saveData();`);
  const balance = r.run('state.accounts[0].balance');
  r.context.showConfirmationModal = (...args) => args[4]();
  r.context.deleteCcTransaction('c1');
  assert.equal(r.run('state.transactions.length'), 2);
  assert.equal(r.run('state.transactions.some(t=>t.ccPurchaseId==="c1")'), false);
  assert.equal(r.run('state.transactions.some(t=>t.ccPurchaseId==="c2")'), true);
  assert.equal(r.run('state.transactions.some(t=>t.id==="legacy")'), true);
  assert.equal(r.run('state.accounts[0].balance'), balance);
});

test('deleting a payment expense continues to leave the CC purchase paid as requested', () => {
  const r = runtime(); seedCards(r); cardPayment(r,'c1','100');
  r.context.showConfirmationModal = (...args) => args[4]();
  const id=r.run('state.transactions[0].id'); r.context.deleteTransaction(id);
  assert.equal(r.run('state.creditCard.transactions[0].paidOff'), true);
  assert.equal(r.run('state.creditCard.transactions[0].paidAmount'), 100);
  assert.equal(r.run('state.accounts[0].balance'), 1000);
});

function delayedBackup(r) {
  let finish, payload, uploads=0;
  const refresh=r.context.fetchAndUpdateLastCloudSyncTime;
  const query={upsert(value){payload=value;uploads++;return this;},select(){return this;},eq(){return this;},
    single(){return new Promise(resolve=>{finish=resolve;});}};
  r.context.testClient={from:()=>query};r.run('supabaseUser={id:"test-user"};supabaseClient=testClient;');
  r.context.fetchAndUpdateLastCloudSyncTime=()=>{};
  return {refresh,complete(error=null){finish({data:error?null:{updated_at:'2026-10-20T01:00:00Z'},error});},
    get payload(){return payload;},get uploads(){return uploads;}};
}

test('editing during upload leaves the uploaded snapshot fixed and new local edits pending, even inside two seconds', async () => {
  const r=runtime();const cloud=delayedBackup(r);const pending=r.context.executeBackupToSupabase();
  const uploaded=JSON.stringify(cloud.payload.data);
  await r.context.executeBackupToSupabase();assert.equal(cloud.uploads,1);
  r.run('state.accounts[0].balance=990;saveData();');
  const editTime=r.storage.get('lastLocalDataModification');
  assert.equal(JSON.stringify(cloud.payload.data),uploaded);
  cloud.complete();await pending;
  assert.equal(r.storage.get('lastLocalDataModification'),editTime);
  assert.equal(r.storage.get('kaasi_synced_state_hash'),r.context.generateDataHash(uploaded));
  assert.equal(r.context.currentCloudSyncStatus,'local_newer');
  assert.ok(r.notices.some(([msg])=>msg.includes('still need backing up')));
  // Run the real cloud-status refresh to cover the former two-second blind spot.
  r.context.statusClient={from:()=>({select(){return this;},eq(){return this;},
    single:async()=>({data:{updated_at:'2026-10-20T01:00:00Z'},error:null})})};
  r.run('supabaseClient=statusClient;');
  await cloud.refresh();
  assert.equal(r.context.currentCloudSyncStatus,'local_newer');
});

test('unchanged upload marks only its snapshot synced; failed uploads preserve sync metadata and allow retry', async () => {
  const r=runtime();const cloud=delayedBackup(r);const pending=r.context.executeBackupToSupabase();
  cloud.complete();await pending;
  assert.equal(r.context.currentCloudSyncStatus,'synced');assert.equal(r.context.cloudBackupInProgress,false);
  const hash=r.storage.get('kaasi_synced_state_hash');
  r.run('state.accounts[0].balance=950;saveData();');
  const retry=r.context.executeBackupToSupabase();cloud.complete({message:'Simulated network failure'});await retry;
  assert.equal(r.storage.get('kaasi_synced_state_hash'),hash);assert.equal(r.context.cloudBackupInProgress,false);
  assert.ok(r.notices.some(([msg])=>msg.includes('Cloud backup failed')));
  const successfulRetry=r.context.executeBackupToSupabase();cloud.complete();await successfulRetry;
  assert.equal(r.context.currentCloudSyncStatus,'synced');
  assert.equal(r.storage.get('kaasi_synced_state_hash'),r.context.generateDataHash(r.run('JSON.stringify(state)')));
});

test('bulk CC payments save a separate purchase ID for each payment', () => {
  const r=runtime(); const openHistory=r.context.openCcHistoryModal; seedCards(r);
  r.context.openModalHelper=()=>{};
  openHistory();
  r.context.ccSelectedItems=new Set(['c1','c2']);
  let submit;
  r.context.openFormModal=(title,html,callback)=>{submit=callback;};
  r.context.openBulkPayCcItemForm();
  submit({preventDefault(){},target:{values:{payFromAccount:'cash',payCategory_c1:'Groceries',payCategory_c2:'Other'}}});
  assert.equal(r.run('state.transactions.length'),2);
  assert.equal(r.run('state.transactions[0].ccPurchaseId'),'c1');
  assert.equal(r.run('state.transactions[1].ccPurchaseId'),'c2');
  assert.equal(r.run('state.accounts[0].balance'),800);
});
