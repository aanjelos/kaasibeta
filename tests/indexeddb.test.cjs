const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { IDBFactory, IDBObjectStore } = require('fake-indexeddb');
const root = path.resolve(__dirname, '..');
const copy = value => JSON.parse(JSON.stringify(value));

function environment({ factory = new IDBFactory(), data = new Map(), testVersion } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { style:{}, hidden:true, children:[], textContent:'',
      appendChild(child){this.children.push(child);},replaceChildren(){this.children=[];},classList:{add(){},remove(){},contains(){return false;}} });
    return elements.get(id);
  };
  const localStorage = { getItem:key=>data.get(key)??null, setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key),key:index=>[...data.keys()][index],get length(){return data.size;} };
  const context = vm.createContext({ console:{log(){},warn(){},error(){}}, crypto:webcrypto,TextEncoder,Uint8Array,DOMException,Map,Set,
    indexedDB:factory,localStorage,navigator:{},supabase:{createClient:()=>null},addEventListener(){},setTimeout,clearTimeout,
    document:{addEventListener(){},querySelector:element,getElementById:element,createElement:()=>element(webcrypto.randomUUID()),createTextNode:text=>text},
    isAppLocked:()=>false,downloadKaasiSnapshot(){},location:{reload(){}} });
  context.window=context;
  for (const name of ['globals','import-validation','storage','storage-ui']) {
    let source=fs.readFileSync(path.join(root,'js',`${name}.js`),'utf8');
    if(name==='storage'&&testVersion)source=source.replace('const VERSION = 1;',`const VERSION = ${testVersion};`);
    vm.runInContext(source,context,{filename:name+'.js'});
  }
  const run=source=>vm.runInContext(source,context);
  return {factory,data,localStorage,context,run,element,db:run('KaasiStorage'),
    defaults:()=>copy(run('getDefaultState()')),
    initialize:choose=>run('KaasiStorage').initialize(()=>run('getDefaultState()'),value=>context.validateMigrationData(value),choose||(()=>Promise.resolve('migrate')))};
}

function legacy(e) {
  const value=e.defaults();value.settings.initialSetupDone=true;value.accounts[0].balance=4930;
  value.transactions=[{id:'t1',amount:70,type:'expense',account:'cash',category:'Other',date:'2026-10-20',description:'Literal <b>text</b>',timestamp:1,ccPurchaseId:'deleted_purchase'}];
  value.hiddenCategories=['Other'];value.customFutureField={keep:true};
  e.data.set('KaasiData',JSON.stringify(value));e.data.set('kaasi_device_theme','light');
  e.data.set('lastBackupReminderDismissedDate','2026-10-20');e.data.set('sb-test-auth-token','do-not-migrate');
  return value;
}

async function rawStore(e,store,key) {
  const db=await new Promise((resolve,reject)=>{const req=e.factory.open('kaasi-finances',1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  try {return await new Promise((resolve,reject)=>{const tx=db.transaction(store);const req=tx.objectStore(store).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  finally {db.close();}
}

test('new users create IndexedDB immediately without creating a financial localStorage copy',async()=>{
  const e=environment();let asked=0;const value=await e.initialize(()=>{asked++;return 'migrate';});
  assert.equal(asked,0);assert.equal(e.db.mode,'indexeddb');assert.equal(e.data.has('KaasiData'),false);
  assert.equal(value.settings.initialSetupDone,false);assert.deepEqual(copy(await e.db.snapshot()),copy(value));
});

test('migration copies and verifies all fields; original text and authentication session remain untouched',async()=>{
  const e=environment();const original=legacy(e);const raw=e.data.get('KaasiData');
  await e.initialize();assert.equal(e.data.get('KaasiData'),raw);
  assert.deepEqual(copy(await e.db.snapshot()),original);
  assert.equal(e.run('appPreferences.getItem("kaasi_device_theme")'),'light');
  assert.equal(e.run('appPreferences.getItem("sb-test-auth-token")'),null);
  assert.equal((await rawStore(e,'recovery','legacy')).raw,raw);
  const reopen=environment(e);let prompts=0;await reopen.initialize(()=>{prompts++;return 'migrate';});
  assert.equal(prompts,0);assert.deepEqual(copy(await reopen.db.snapshot()),original);
});

test('migration waits for a decision; postponement uses legacy storage and permits a later upgrade',async()=>{
  const e=environment();const original=legacy(e);let choose;let prompted;
  const shown=new Promise(resolve=>prompted=resolve);
  const initialization=e.initialize(()=>{prompted();return new Promise(resolve=>choose=resolve);});
  await shown;assert.equal(await rawStore(e,'datasets','local'),undefined);
  choose('later');await initialization;assert.equal(e.db.mode,'legacy');
  original.accounts[0].balance=4800;await e.db.commit(original);
  assert.equal(JSON.parse(e.data.get('KaasiData')).accounts[0].balance,4800);
  const reopen=environment(e);await reopen.initialize();assert.equal(reopen.db.mode,'indexeddb');
  assert.equal((await reopen.db.snapshot()).accounts[0].balance,4800);
});

test('corrupt or incompatible legacy data never becomes an empty fresh dataset',async()=>{
  for (const raw of ['{bad json','null','{"accounts":[],"transactions":null,"categories":[]}']) {
    const e=environment();e.data.set('KaasiData',raw);
    await assert.rejects(e.initialize());assert.equal(e.data.get('KaasiData'),raw);
    assert.equal(await rawStore(e,'datasets','local'),undefined);
  }
  const e=environment();const value=legacy(e);value.accounts[0].balance=12.345;e.data.set('KaasiData',JSON.stringify(value));
  await assert.rejects(e.initialize(),/compatibility/);assert.equal(JSON.parse(e.data.get('KaasiData')).accounts[0].balance,12.345);
});

test('account and expense changes commit together; synchronous write failures abort all writes',async()=>{
  const e=environment();await e.initialize();const before=copy(await e.db.snapshot());
  const next=copy(before);next.accounts[0].balance=90;next.transactions=[{id:'t1',amount:10,date:'2026-10-20'}];
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){if(this.name==='settings')throw new DOMException('Full disk','QuotaExceededError');return put.call(this,value,...args);};
  try {await assert.rejects(e.db.commit(next),/Full disk/);}finally{IDBObjectStore.prototype.put=put;}
  assert.deepEqual(copy(await e.db.snapshot()),before);
  await e.db.commit(next);assert.deepEqual(copy(await e.db.snapshot()),next);
});

test('aborted migration can restart without losing or duplicating records',async()=>{
  const e=environment();const original=legacy(e);const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){if(this.name==='settings')throw new DOMException('Interrupted write','AbortError');return put.call(this,value,...args);};
  try {await assert.rejects(e.initialize(),/Interrupted/);}finally{IDBObjectStore.prototype.put=put;}
  assert.equal(await rawStore(e,'datasets','local'),undefined);
  const reopen=environment(e);await reopen.initialize();assert.deepEqual(copy(await reopen.db.snapshot()),original);
});

test('interrupted activation preserves staged data and safely retries using the original source',async()=>{
  const e=environment();const original=legacy(e);const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,...args){if(this.name==='datasets'&&value.id==='local')throw new DOMException('Activation interrupted','AbortError');return put.call(this,value,...args);};
  try {await assert.rejects(e.initialize(),/Activation/);}finally{IDBObjectStore.prototype.put=put;}
  assert.ok(await rawStore(e,'datasets','staging'));assert.equal(await rawStore(e,'datasets','local'),undefined);
  const reopen=environment(e);await reopen.initialize();assert.deepEqual(copy(await reopen.db.snapshot()),original);
});

test('imports switch verified generations; previous data is retained and stale restore revisions are rejected',async()=>{
  const e=environment();await e.initialize();const before=copy(await e.db.snapshot());const revision=e.db.revision;
  const next=copy(before);next.accounts[0].balance=500;await e.db.replace(next,revision);
  assert.deepEqual(copy((await rawStore(e,'recovery','previous')).value),before);
  await assert.rejects(e.db.replace(before,revision),/changed/);
  assert.deepEqual(copy(await e.db.snapshot()),next);
});

test('two tabs cannot overwrite a newer committed revision',async()=>{
  const a=environment();await a.initialize();const b=environment(a);await b.initialize();
  const one=copy(await a.db.snapshot());one.accounts[0].balance=10;await a.db.commit(one);
  const two=copy(b.db.current);two.accounts[0].balance=20;
  await assert.rejects(b.db.commit(two),/Another Kaasi window/);
  assert.equal((await a.db.snapshot()).accounts[0].balance,10);
});

test('writes from an older localStorage tab are detected and both copies are retained',async()=>{
  const e=environment();legacy(e);await e.initialize();const dbCopy=copy(await e.db.snapshot());
  const old=copy(dbCopy);old.accounts[0].balance=999;e.data.set('KaasiData',JSON.stringify(old));
  await assert.rejects(e.db.commit(dbCopy),/older Kaasi/);
  assert.equal((await e.db.snapshot()).accounts[0].balance,4930);
  const reopen=environment(e);await assert.rejects(reopen.initialize(),/legacy copy/);
});

test('missing migrated database does not automatically resurrect the outdated legacy snapshot',async()=>{
  const e=environment();legacy(e);e.data.set('kaasi_indexeddb_migrated','true');
  await assert.rejects(e.initialize(),/database is missing/);
  assert.equal(await rawStore(e,'datasets','local'),undefined);
});

test('explicit data deletion removes recovery data and cannot re-import the frozen source',async()=>{
  const e=environment();legacy(e);await e.initialize();await e.db.clear();
  assert.equal(e.data.has('KaasiData'),false);assert.equal(await rawStore(e,'recovery','legacy'),undefined);
  const reopened=environment(e);const value=await reopened.initialize();
  assert.equal(value.transactions.length,0);assert.equal(value.settings.initialSetupDone,false);
  assert.equal(e.data.get('sb-test-auth-token'),'do-not-migrate');
});

test('20,000 financial records preserve IDs, ordering, and balances through migration and export',async()=>{
  const e=environment();const value=legacy(e);
  value.transactions=Array.from({length:20000},(_,i)=>({id:'t'+i,amount:1,type:'expense',account:'cash',category:'Other',date:'2026-10-20',description:'Record '+i,timestamp:i+1}));
  e.data.set('KaasiData',JSON.stringify(value));await e.initialize();
  assert.deepEqual(copy(await e.db.snapshot()),value);
});

test('persistence is requested only after Continue; denial offers explicit continuation or postponement',async()=>{
  const e=environment();let requests=0;
  e.context.navigator.storage={persist:async()=>{requests++;return false;}};
  const decision=e.context.chooseStorageMigration();
  assert.equal(requests,0);
  await e.element('storageActions').children[0].onclick();
  assert.equal(requests,1);assert.match(e.element('storageStatus').textContent,/did not grant/);
  await e.element('storageActions').children[1].onclick();assert.equal(await decision,'later');
  e.context.navigator.storage.persist=async()=>true;
  const accepted=e.context.chooseStorageMigration();await e.element('storageActions').children[0].onclick();
  assert.equal(await accepted,'migrate');
});

test('concurrent saves within one tab reject a stale snapshot rather than combining inconsistent writes',async()=>{
  const e=environment();await e.initialize();const a=copy(e.db.current),b=copy(e.db.current);
  a.accounts[0].balance=10;b.accounts[1].balance=20;
  const results=await Promise.allSettled([e.db.commit(a),e.db.commit(b)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  const saved=copy(await e.db.snapshot());assert.ok(saved.accounts[0].balance===10||saved.accounts[1].balance===20);
  assert.ok(!(saved.accounts[0].balance===10&&saved.accounts[1].balance===20));
});

test('integrity failure preserves the damaged copy and supports explicit recovery from a valid backup',async()=>{
  const e=environment();const original=legacy(e);await e.initialize();
  const connection=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances',1);req.onsuccess=()=>resolve(req.result);});
  await new Promise((resolve,reject)=>{
    const tx=connection.transaction('accounts','readwrite');
    const req=tx.objectStore('accounts').openCursor();req.onsuccess=()=>{const row=req.result;if(row){if(row.value.id==='cash')row.update({...row.value,value:{...row.value.value,balance:99}});else row.continue();}};
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
  });connection.close();
  const reopen=environment(e);await assert.rejects(reopen.initialize(),/integrity/);
  const sources=await reopen.db.recoverySources();assert.ok(sources.some(source=>source.label==='Original migration copy'));
  await reopen.db.recover(original,reopen.db.revision);assert.deepEqual(copy(await reopen.db.snapshot()),original);
  assert.equal((await rawStore(e,'recovery','previous')).value.accounts[0].balance,99);
});

test('PIN recovery exports require the correct PIN for the selected saved copy',async()=>{
  const e=environment();const value=e.defaults();value.settings.appPin={enabled:true,pin:await e.context.hashString('1234')};
  e.element('storageRecoveryPin').value='9999';assert.equal(await e.context.authorizeStorageRecovery(value),false);
  e.element('storageRecoveryPin').value='1234';assert.equal(await e.context.authorizeStorageRecovery(value),true);
});

test('unknown future database formats are rejected without clearing records',async()=>{
  const e=environment();legacy(e);await e.initialize();
  const connection=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances',1);req.onsuccess=()=>resolve(req.result);});
  await new Promise(resolve=>{const tx=connection.transaction('datasets','readwrite');const req=tx.objectStore('datasets').get('local');req.onsuccess=()=>tx.objectStore('datasets').put({...req.result,formatVersion:99});tx.oncomplete=resolve;});connection.close();
  const reopen=environment(e);await assert.rejects(reopen.initialize(),/newer version/);
  assert.equal((await rawStore(e,'datasets','local')).formatVersion,99);
});

test('a failed migration marker write does not cause successful migration to run again',async()=>{
  const e=environment();legacy(e);const set=e.localStorage.setItem;
  e.localStorage.setItem=(key,value)=>{if(key==='kaasi_indexeddb_migrated')throw new DOMException('Full legacy storage','QuotaExceededError');set(key,value);};
  await e.initialize();assert.equal(e.data.has('kaasi_indexeddb_migrated'),false);
  const reopen=environment(e);let asked=0;await reopen.initialize(()=>{asked++;return 'migrate';});assert.equal(asked,0);
  assert.equal((await reopen.db.snapshot()).transactions.length,1);
});

test('cloud backup keeps the existing JSON object shape and recognizes unchanged IndexedDB data',async()=>{
  const e=environment();const original=legacy(e);await e.initialize();
  e.run('state=KaasiStorage.current;lastPersistedStateJson=JSON.stringify(state);supabaseUser={id:"qa-user"};');
  vm.runInContext(fs.readFileSync(path.join(root,'js/data-sync.js'),'utf8'),e.context);
  const notices=[];e.context.showNotification=(...args)=>notices.push(args);
  e.context.fetchAndUpdateLastCloudSyncTime=()=>{};
  let payload;
  const query={upsert(value){payload=value;return this;},select(){return this;},single:async()=>({data:{updated_at:'2026-10-21T01:00:00Z'},error:null})};
  e.context.client={from:()=>query};e.run('supabaseClient=client;');
  await e.context.executeBackupToSupabase();
  assert.equal(typeof payload.data,'object');assert.deepEqual(copy(payload.data),original);
  assert.equal(e.context.currentCloudSyncStatus,'synced');
  assert.ok(!notices.some(([message])=>message.includes('still need backing up')));
  assert.equal(e.run('appPreferences.getItem("kaasi_synced_state_hash")'),e.context.generateDataHash(e.run('lastPersistedStateJson')));
});

test('a blocked schema upgrade reports recovery instead of waiting silently or deleting the database',async()=>{
  const e=environment();await e.initialize();
  const foreign=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances',1);req.onsuccess=()=>resolve(req.result);});
  foreign.onversionchange=()=>{}; // Represents an older tab that refuses to close.
  const upgrade=environment({...e,testVersion:2});
  await assert.rejects(upgrade.initialize(),/Close other Kaasi/);
  foreign.close();
});
