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
    if(name==='storage'&&testVersion)source=source.replace('const VERSION = 2;',`const VERSION = ${testVersion};`);
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
  const db=await new Promise((resolve,reject)=>{const req=e.factory.open('kaasi-finances');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  try {return await new Promise((resolve,reject)=>{const tx=db.transaction(store);const req=tx.objectStore(store).get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  finally {db.close();}
}

function recoveryCloud(e, backup=e.defaults()) {
  const cloud={user:{id:'recovery-user',email:'qa@example.invalid'},row:{data:copy(backup),updated_at:'2026-10-24T10:00:00Z'},reads:[],signIns:[],downloads:[],reloads:0};
  vm.runInContext(fs.readFileSync(path.join(root,'js/cloud-sync.js'),'utf8'),e.context);
  e.context.navigator.onLine=true;e.context.location={origin:'https://beta.example.invalid',pathname:'/index.html',reload(){assert.equal(e.run('storageOperationPending'),false);assert.equal(e.run('storageActionPending'),false);cloud.reloads++;}};
  e.context.downloadKaasiSnapshot=(data,name)=>cloud.downloads.push({data:copy(data),name});
  e.context.showNotification=()=>{};
  const client={auth:{getSession:async()=>({data:{session:cloud.user?{user:copy(cloud.user)}:null},error:cloud.authError}),
    signInWithOAuth:async options=>{cloud.signIns.push(copy(options));return {error:null};}},
    from(table){assert.equal(table,'user_data');let fields,userId;return {
      select(value){fields=value;return this;},eq(key,value){assert.equal(key,'user_id');userId=value;return this;},
      async maybeSingle(){cloud.reads.push({fields,userId});if(cloud.beforeRead)await cloud.beforeRead();
        return {data:cloud.row?(fields==='updated_at'?{updated_at:cloud.row.updated_at}:copy(cloud.row)):null,error:cloud.readError};}
    };}};
  e.context.client=client;e.run('supabaseClient=client;');
  cloud.button=text=>{const button=e.element('storageActions').children.find(child=>child.textContent===text);assert.ok(button,`Missing recovery action: ${text}`);return button;};
  cloud.open=async()=>{await e.context.showStorageFailure(new Error('Saved data failed its integrity check.'));await cloud.button('Restore From Cloud').onclick();};
  return cloud;
}

test('cloud recovery validates and downloads without writes, then explicitly repairs a damaged database while retaining history',async()=>{
  const e=environment(),original=legacy(e);await e.initialize();
  const connection=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances');req.onsuccess=()=>resolve(req.result);});
  await new Promise(resolve=>{const tx=connection.transaction('transactions','readwrite');tx.objectStore('transactions').clear();tx.oncomplete=resolve;});connection.close();
  const reopen=environment(e);await assert.rejects(reopen.initialize(),/integrity/);
  const cloud=recoveryCloud(reopen,original);await cloud.open();
  assert.equal(reopen.element('storageTitle').textContent,'Restore cloud backup?');
  assert.equal(cloud.reads.length,1);assert.deepEqual(cloud.reads[0],{fields:'data, updated_at',userId:'recovery-user'});
  assert.equal(cloud.reloads,0);assert.equal((await rawStore(reopen,'datasets','local')).revision,1);
  await cloud.button('Download Cloud Backup').onclick();assert.deepEqual(cloud.downloads[0].data,original);
  assert.equal(cloud.reloads,0);assert.equal((await rawStore(reopen,'datasets','local')).revision,1);
  await cloud.button('Restore Cloud Backup').onclick();assert.equal(cloud.reloads,1);
  assert.deepEqual(copy(await reopen.db.snapshot()),original);
  assert.equal((await rawStore(reopen,'recovery','previous')).value.transactions.length,0);
  assert.deepEqual(cloud.row.data,original);assert.equal(cloud.reads[1].fields,'updated_at');
  const baseline=JSON.parse(reopen.run('appPreferences.getItem("kaasi_cloud_sync_baseline_recovery-user")'));
  assert.equal(baseline.hash,await reopen.db.digest(original));assert.equal(baseline.updatedAt,cloud.row.updated_at);
});

test('cloud recovery offers explicit sign-in on the current beta URL without touching financial preferences or backups',async()=>{
  const e=environment();await e.initialize();const before=copy(await e.db.snapshot()),cloud=recoveryCloud(e);cloud.user=null;
  await cloud.open();assert.deepEqual(e.element('storageActions').children.map(button=>button.textContent),['Sign In With Google','Back']);
  await cloud.button('Sign In With Google').onclick();assert.equal(cloud.reads.length,0);
  assert.deepEqual(cloud.signIns,[{provider:'google',options:{redirectTo:'https://beta.example.invalid/index.html'}}]);
  assert.deepEqual(copy(await e.db.snapshot()),before);assert.equal(e.run('appPreferences.getItem("pendingCloudRestore")'),null);
});

test('offline, missing, invalid and unavailable cloud backups never replace local data',async()=>{
  for(const failure of ['offline','missing','invalid','invalid-json','timestamp','network','auth']){
    const e=environment();await e.initialize();const before=copy(await e.db.snapshot()),cloud=recoveryCloud(e);
    if(failure==='offline')e.context.navigator.onLine=false;
    if(failure==='missing')cloud.row=null;
    if(failure==='invalid')cloud.row.data.accounts=null;
    if(failure==='invalid-json')cloud.row.data='{bad';
    if(failure==='timestamp')cloud.row.updated_at='invalid';
    if(failure==='network')cloud.readError={message:'Network unavailable'};
    if(failure==='auth')cloud.authError={message:'Session unavailable'};
    await cloud.open();assert.notEqual(e.element('storageTitle').textContent,'Restore cloud backup?',failure);
    assert.ok(!e.element('storageActions').children.some(button=>button.textContent==='Restore Cloud Backup'),failure);
    assert.deepEqual(copy(await e.db.snapshot()),before,failure);assert.equal(cloud.downloads.length,0);assert.equal(cloud.reloads,0);
  }
});

test('cloud recovery enforces both the current local PIN and the selected cloud copy PIN',async()=>{
  const e=environment(),original=legacy(e);original.settings.appPin={enabled:true,pin:await e.context.hashString('1111'),question:'Test question',answer:await e.context.hashString('test answer')};e.data.set('KaasiData',JSON.stringify(original));await e.initialize();
  const remote=copy(original);remote.settings.appPin.pin=await e.context.hashString('2222');const cloud=recoveryCloud(e,remote);
  e.element('storageRecoveryPin').value='0000';await cloud.open();assert.equal(cloud.reads.length,0);
  e.element('storageRecoveryPin').value='1111';await cloud.button('Restore From Cloud').onclick();assert.equal(cloud.reads.length,1);
  e.element('storageCloudRecoveryPin').value='1111';await cloud.button('Download Cloud Backup').onclick();await cloud.button('Restore Cloud Backup').onclick();
  assert.equal(cloud.downloads.length,0);assert.equal(cloud.reloads,0);assert.deepEqual(copy(await e.db.snapshot()),original);
  e.element('storageCloudRecoveryPin').value='2222';await cloud.button('Download Cloud Backup').onclick();assert.equal(cloud.downloads.length,1);
  await cloud.button('Restore Cloud Backup').onclick();assert.equal(cloud.reloads,1);assert.deepEqual(copy(await e.db.snapshot()),remote);
});

test('account changes, cloud updates, concurrent local saves and failed commits abort cloud recovery without replacing data',async()=>{
  for(const failure of ['account','cloud','local','write']){
    const e=environment();await e.initialize();const remote=e.defaults();remote.accounts[0].balance=500;const cloud=recoveryCloud(e,remote);await cloud.open();
    let before=copy(await e.db.snapshot());
    if(failure==='account')cloud.user={id:'another-user'};
    if(failure==='cloud')cloud.row.updated_at='2026-10-24T11:00:00Z';
    if(failure==='local'){const next=copy(before);next.accounts[0].balance=7777;const other=environment(e);await other.initialize();await other.db.commit(next);before=next;}
    const put=IDBObjectStore.prototype.put;
    if(failure==='write')IDBObjectStore.prototype.put=function(...args){if(this.name==='settings')throw new DOMException('Full disk','QuotaExceededError');return put.apply(this,args);};
    try{await cloud.button('Restore Cloud Backup').onclick();}finally{IDBObjectStore.prototype.put=put;}
    const check=environment(e);await check.initialize();assert.deepEqual(copy(await check.db.snapshot()),before,failure);assert.equal(cloud.reloads,0,failure);assert.deepEqual(cloud.row.data,remote);
  }
});

test('leaving recovery while a cloud read is pending discards its response; unreadable local sources still allow cloud recovery',async()=>{
  const e=environment();await e.initialize();const cloud=recoveryCloud(e);let finish,started;
  const reading=new Promise(resolve=>started=resolve);cloud.beforeRead=()=>{started();return new Promise(resolve=>finish=resolve);};
  await e.context.showStorageFailure(new Error('Integrity check failed.'));const opening=cloud.button('Restore From Cloud').onclick();await reading;
  await cloud.button('Back').onclick();finish();await opening;assert.equal(e.element('storageTitle').textContent,'Your data needs attention');assert.equal(cloud.reloads,0);
  cloud.beforeRead=null;e.db.recoverySources=async()=>{throw new Error('Unreadable local copy');};await cloud.open();
  assert.equal(e.element('storageTitle').textContent,'Restore cloud backup?');assert.equal(cloud.reloads,0);
});

test('failed cloud-recovery status metadata never reverses or misreports a committed restore',async()=>{
  const e=environment();await e.initialize();const remote=e.defaults();remote.settings.initialSetupDone=true;remote.accounts[0].balance=500;const cloud=recoveryCloud(e,remote);await cloud.open();
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args){if(this.name==='deviceSettings')throw new DOMException('Metadata unavailable','QuotaExceededError');return put.apply(this,args);};
  try{await cloud.button('Restore Cloud Backup').onclick();}finally{IDBObjectStore.prototype.put=put;}
  assert.equal(cloud.reloads,1);assert.deepEqual(copy(await e.db.snapshot()),remote);assert.deepEqual(cloud.row.data,remote);
});

test('blocked storage shows actionable guidance without offering an unusable restore or touching data',()=>{
  const e=environment();legacy(e);const before=JSON.stringify([...e.data]);let recoveryReads=0;
  e.db.recoverySources=()=>{recoveryReads++;return Promise.resolve([]);};
  e.context.showStorageFailure(new DOMException('Access is denied for this document.','SecurityError'));
  assert.equal(e.element('storageTitle').textContent,'Browser storage is blocked');
  assert.match(e.element('storageStatus').textContent,/site settings/);
  assert.ok(!e.element('storageStatus').textContent.includes('Access is denied'));
  assert.deepEqual(e.element('storageActions').children.map(button=>button.textContent),['Reload Kaasi']);
  assert.equal(recoveryReads,0);assert.equal(JSON.stringify([...e.data]),before);
});

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

test('upgrade-screen export downloads the original data without starting migration or requesting persistence',async()=>{
  const e=environment();const original=legacy(e);const raw=e.data.get('KaasiData');
  let requests=0,downloaded,shown;
  e.context.navigator.storage={persist:async()=>{requests++;return false;}};
  e.context.downloadKaasiSnapshot=(value,prefix)=>{downloaded={value:copy(value),prefix};};
  const visible=new Promise(resolve=>shown=resolve);
  const initialization=e.initialize(value=>{const decision=e.context.chooseStorageMigration(value);shown();return decision;});
  await visible;
  const click=label=>e.element('storageActions').children.find(child=>child.textContent===label).onclick();
  await click('Export Existing Data');
  assert.deepEqual(downloaded.value,original);assert.equal(downloaded.prefix,'kaasi-before-upgrade');
  assert.equal(requests,0);assert.equal(e.db.ready,false);assert.equal(await rawStore(e,'datasets','local'),undefined);
  assert.equal(e.data.get('KaasiData'),raw);assert.match(e.element('storageStatus').textContent,/Check that the JSON file was saved/);
  await click('Not Now');await initialization;assert.equal(e.db.mode,'legacy');
});

test('pre-upgrade exports of PIN-protected data require the correct existing PIN and allow cancelling',async()=>{
  const e=environment();const original=legacy(e);original.settings.appPin={enabled:true,pin:await e.context.hashString('1234')};
  let downloads=0;e.context.downloadKaasiSnapshot=value=>{downloads++;assert.deepEqual(copy(value),original);};
  const decision=e.context.chooseStorageMigration(original);
  const click=label=>e.element('storageActions').children.find(child=>child.textContent===label).onclick();
  await click('Export Existing Data');await click('Back');assert.equal(downloads,0);
  await click('Export Existing Data');
  const pin=e.element('storageActions').children[0].children[0];pin.value='9999';
  await click('Download Backup');assert.equal(downloads,0);assert.match(e.element('storageStatus').textContent,/Incorrect PIN/);
  pin.value='1234';await click('Download Backup');assert.equal(downloads,1);assert.equal(pin.value,'');
  await click('Not Now');assert.equal(await decision,'later');
});

test('export remains available after persistence denial and download failures can be retried',async()=>{
  const e=environment();const original=legacy(e);let attempts=0;
  e.context.navigator.storage={persist:async()=>false};
  e.context.downloadKaasiSnapshot=()=>{if(++attempts===1)throw new Error('Download unavailable');};
  const decision=e.context.chooseStorageMigration(original);
  const click=label=>e.element('storageActions').children.find(child=>child.textContent===label).onclick();
  await click('Continue');await click('Export Existing Data');assert.match(e.element('storageStatus').textContent,/could not be started/);
  await click('Export Existing Data');assert.equal(attempts,2);
  assert.equal(e.element('storageTitle').textContent,'Persistent storage is not enabled');
  await click('Continue With IndexedDB');assert.equal(await decision,'migrate');
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
  const connection=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances');req.onsuccess=()=>resolve(req.result);});
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
  const connection=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances');req.onsuccess=()=>resolve(req.result);});
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
  vm.runInContext(fs.readFileSync(path.join(root,'js/cloud-sync.js'),'utf8'),e.context);
  e.context.navigator.onLine=true;e.context.updateHeaderShortcutButtons=()=>{};
  const notices=[];e.context.showNotification=(...args)=>notices.push(args);
  e.context.fetchAndUpdateLastCloudSyncTime=()=>{};
  let payload;
  e.context.client={from:()=>{let write=false;return {insert(value){payload=value;write=true;return this;},select(){return this;},eq(){return this;},maybeSingle:async()=>({data:write?{updated_at:'2026-10-21T01:00:00Z'}:null,error:null})};}};e.run('supabaseClient=client;');
  await e.context.executeBackupToSupabase();
  assert.equal(typeof payload.data,'object');assert.deepEqual(copy(payload.data),original);
  assert.equal(e.context.currentCloudSyncStatus,'synced');
  assert.ok(!notices.some(([message])=>message.includes('still need backing up')));
  assert.equal(e.run('appPreferences.getItem("kaasi_synced_state_hash")'),e.context.generateDataHash(e.run('lastPersistedStateJson')));
});

test('recovery offers changed legacy data separately and enforces its own PIN',async()=>{
  const e=environment();const original=legacy(e);await e.initialize();
  assert.equal((await e.db.recoverySources()).filter(s=>s.raw).length,1);
  const changed=copy(original);changed.accounts[0].balance=7777;
  changed.settings.appPin={enabled:true,pin:await e.context.hashString('1234')};
  const raw=JSON.stringify(changed);e.data.set('KaasiData',raw);
  const sources=await e.db.recoverySources();
  const extra=sources.find(s=>s.label==='Changed localStorage copy');
  assert.deepEqual(copy(extra.value),changed);assert.equal(extra.raw,raw);
  assert.deepEqual(copy(sources.find(s=>s.label==='Original migration copy').value),original);
  e.element('storageRecoveryPin').value='0000';assert.equal(await e.context.authorizeStorageRecovery(extra.value),false);
  e.element('storageRecoveryPin').value='1234';assert.equal(await e.context.authorizeStorageRecovery(extra.value),true);
  assert.deepEqual(copy(await e.db.snapshot()),original);assert.equal(e.data.get('KaasiData'),raw);
});

test('stale reset rejects without deleting newer records, preferences, or recovery copies',async()=>{
  const a=environment();legacy(a);await a.initialize();const b=environment(a);await b.initialize();
  const next=await b.db.snapshot();next.accounts[0].balance=999;
  await b.db.commit(next,{lastLocalDataModification:'new'});
  const raw=a.data.get('KaasiData');
  await assert.rejects(a.db.clear(),/Reload before deleting/);
  assert.deepEqual(copy(await b.db.snapshot()),copy(next));assert.equal(a.data.get('KaasiData'),raw);
  assert.equal((await rawStore(b,'deviceSettings','lastLocalDataModification')).value,'new');
  assert.ok(await rawStore(b,'recovery','legacy'));
  await b.db.clear();assert.equal(await rawStore(b,'datasets','local'),undefined);
});

test('postponed migration serializes simultaneous tab saves and rejects stale reset',async()=>{
  const a=environment();legacy(a);await a.initialize(()=> 'later');
  const b=environment(a);await b.initialize(()=> 'later');
  const first=await a.db.snapshot(),second=await b.db.snapshot();
  first.accounts[0].balance=100;second.accounts[0].balance=200;
  const results=await Promise.allSettled([a.db.commit(first),b.db.commit(second)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const loser=results[0].status==='rejected'?a:b;
  const saved=a.data.get('KaasiData');
  await assert.rejects(loser.db.clear(),/Reload before retrying/);assert.equal(a.data.get('KaasiData'),saved);
  const reopen=environment(a);await reopen.initialize(()=> 'later');
  const next=await reopen.db.snapshot();next.accounts[0].balance=300;
  await reopen.db.commit(next);assert.equal(JSON.parse(a.data.get('KaasiData')).accounts[0].balance,300);
  await reopen.db.clear();assert.equal(a.data.has('KaasiData'),false);
});

test('postponed tabs cannot save or reset after another tab migrates',async()=>{
  const a=environment();legacy(a);await a.initialize(()=> 'later');
  const b=environment(a);await b.initialize();const migrated=await b.db.snapshot();
  await assert.rejects(a.db.commit(a.db.current),/changed or upgraded/);
  await assert.rejects(a.db.clear(),/changed or upgraded/);
  assert.deepEqual(copy(await b.db.snapshot()),copy(migrated));
});

test('legacy saves preserve data on quota failure and reject an outdated restore revision',async()=>{
  const e=environment();legacy(e);await e.initialize(()=> 'later');
  const before=e.data.get('KaasiData');const next=await e.db.snapshot();next.accounts[0].balance=123;
  const set=e.localStorage.setItem;
  e.localStorage.setItem=()=>{throw new DOMException('Full disk','QuotaExceededError');};
  await assert.rejects(e.db.commit(next),/Full disk/);assert.equal(e.data.get('KaasiData'),before);
  e.localStorage.setItem=set;
  const revision=e.db.revision;await e.db.commit(next);
  await assert.rejects(e.db.replace(JSON.parse(before),revision),/Reload before restoring/);
  assert.equal(JSON.parse(e.data.get('KaasiData')).accounts[0].balance,123);
});

test('repeated replacements retain one previous dataset instead of an accumulating history',async()=>{
  const e=environment();legacy(e);await e.initialize();
  let previous;
  for(let i=0;i<4;i++){
    previous=await e.db.snapshot();const next=copy(previous);next.accounts[0].balance=100+i;
    await e.db.replace(next);
    assert.deepEqual(copy((await rawStore(e,'recovery','previous')).value),copy(previous));
  }
  const sources=await e.db.recoverySources();
  assert.equal(sources.filter(s=>s.label==='Previous saved dataset').length,1);
  assert.equal(sources.length,3,'active, one previous, and frozen migration copy only');
});

test('a blocked schema upgrade reports recovery instead of waiting silently or deleting the database',async()=>{
  const e=environment();await e.initialize();
  const foreign=await new Promise(resolve=>{const req=e.factory.open('kaasi-finances');req.onsuccess=()=>resolve(req.result);});
  foreign.onversionchange=()=>{}; // Represents an older tab that refuses to close.
  const upgrade=environment({...e,testVersion:3});
  await assert.rejects(upgrade.initialize(),/Close other Kaasi/);
  foreign.close();
});

for(const transferred of [false,true])test(`version-one database upgrade preserves ${transferred?'transferred subscription fields':'legacy snapshots'} before the next save`,async()=>{
  const e=environment(),value=e.defaults();value.settings.initialSetupDone=true;
  value.futureData={preserve:'yes'};const generation='original_generation';
  if(transferred){value.subscriptions=[{id:'transferred',name:'Spotify',amount:100,method:'cc',frequency:'monthly',status:'active',nextDueDate:'2026-10-24',anchorDay:24}];value.subscriptionOccurrences=[];}
  const groups=['accounts','transactions','ccTransactions','debts','receivables','installments','budgets','categories'];
  const base=copy(value),hash=await e.db.digest(value);
  const connection=await new Promise((resolve,reject)=>{const opening=e.factory.open('kaasi-finances',1);
    opening.onupgradeneeded=()=>{
      const db=opening.result;db.createObjectStore('datasets',{keyPath:'id'});db.createObjectStore('settings',{keyPath:['dataset','generation']});
      db.createObjectStore('recovery',{keyPath:'id'});db.createObjectStore('deviceSettings',{keyPath:'key'});
      groups.forEach(group=>{const store=db.createObjectStore(group,{keyPath:['dataset','generation','id']});store.createIndex('generation',['dataset','generation']);});
    };opening.onsuccess=()=>resolve(opening.result);opening.onerror=()=>reject(opening.error);});
  await new Promise((resolve,reject)=>{const tx=connection.transaction(['datasets','settings',...groups],'readwrite');
    groups.forEach(group=>{const rows=group==='ccTransactions'?base.creditCard.transactions:base[group];
      rows.forEach((item,position)=>tx.objectStore(group).put({dataset:'local',generation,id:group==='categories'?String(position):item.id,position,value:item}));
      if(group==='ccTransactions')delete base.creditCard.transactions;else delete base[group];});
    tx.objectStore('settings').put({dataset:'local',generation,value:base});
    tx.objectStore('datasets').put({id:'local',formatVersion:1,generation,revision:1,hash,legacyRaw:null,migrated:true});
    tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});connection.close();
  assert.deepEqual(copy(await e.initialize()),value);assert.deepEqual(copy(await e.db.snapshot()),value);
  const next=copy(value);next.subscriptions=[{id:'sub1',name:'Netflix',amount:100,nextDueDate:'2026-10-24',frequency:'monthly',anchorDay:24,method:'bank',account:'cash',category:'Other',status:'active',unknownAndroidField:{keep:true}}];
  next.subscriptionOccurrences=[];await e.db.commit(next);
  assert.deepEqual(copy(await e.db.snapshot()),next);
  const row=await rawStore(e,'subscriptions',['local',generation,'sub1']);assert.equal(row.value.unknownAndroidField.keep,true);
});
