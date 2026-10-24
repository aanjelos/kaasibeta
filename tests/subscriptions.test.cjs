const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');const root=path.resolve(__dirname,'..');
function env(){
  const elements=new Map(),preferences=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{style:{},hidden:true,innerHTML:'',value:'',getClientRects:()=>[{}]});return elements.get(id);};
  let timer;const c={console,crypto:webcrypto,TextEncoder,document:{getElementById:el,querySelector:selector=>el(selector),querySelectorAll:()=>[],addEventListener(){},visibilityState:'visible'},addEventListener(){},setTimeout:action=>{timer=action;},clearTimeout(){},
    supabase:{createClient:()=>null},isAppLocked:()=>false,storageOperationPending:false,KaasiStorage:{mode:'indexeddb'},renderDashboard(){},showNotification(){},getCurrentDateString:()=> '2026-10-24',
    appPreferences:{getItem:k=>preferences.get(k),setItem:(k,v)=>preferences.set(k,v),removeItem:k=>preferences.delete(k),flush:async()=>{}},getComputedStyle:()=>({display:'none'}),openModalHelper:id=>{el(id).style.display='block';},
    closeModal:id=>{el(id).style.display='none';}};
  c.window=c;vm.createContext(c);
  for(const file of ['globals','import-validation','math-tool','features','subscription-assets','subscription-services','subscriptions'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),c);
  const run=s=>vm.runInContext(s,c);run('state=getDefaultState();state.settings.initialSetupDone=true;state.accounts[0].balance=1000;');
  c.renderDashboard=()=>{};c.isAppLocked=()=>false;
  let saved=run('JSON.stringify(state)'),fail=false;
  c.saveData=async()=>{if(fail){run('state=JSON.parse('+JSON.stringify(saved)+')');throw new Error('Failed save');}saved=run('JSON.stringify(state)');};
  return {c,run,el,api:run('Subscriptions'),tick:async()=>{await timer();},fail:()=>{fail=true;},saved:()=>JSON.parse(saved)};
}
const definition=overrides=>({name:'Netflix',amount:'100',method:'bank',account:'cash',category:'Other',frequency:'monthly',nextDueDate:'2026-10-24',serviceId:'netflix',icon:'letter',...overrides});
const payment=overrides=>({amount:'100',date:'2026-10-24',account:'cash',category:'Other',...overrides});
test('recurrence preserves monthly/quarterly/leap-year anchors instead of drifting',()=>{
  const {api}=env();
  assert.equal(api.nextDate({frequency:'monthly',nextDueDate:'2026-01-31',anchorDay:31}),'2026-02-28');
  assert.equal(api.nextDate({frequency:'monthly',nextDueDate:'2026-02-28',anchorDay:31}),'2026-03-31');
  assert.equal(api.nextDate({frequency:'quarterly',nextDueDate:'2026-11-30',anchorDay:31}),'2027-02-28');
  assert.equal(api.nextDate({frequency:'annually',nextDueDate:'2024-02-29',anchorDay:29}),'2025-02-28');
  assert.equal(api.nextDate({frequency:'annually',nextDueDate:'2027-02-28',anchorDay:29}),'2028-02-29');
  assert.equal(api.nextDate({frequency:'weekly',nextDueDate:'2026-12-28'}),'2027-01-04');
  assert.equal(api.nextDate({frequency:'daily',nextDueDate:'2026-12-31'}),'2027-01-01');
  assert.equal(api.nextDate({frequency:'semiannually',nextDueDate:'2026-08-31',anchorDay:31}),'2027-02-28');
  assert.equal(api.nextDate({frequency:'semiannually',nextDueDate:'2027-02-28',anchorDay:31}),'2027-08-31');
});
test('saving schedules never deducts funds; confirmed bank payment and renewal commit together',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());
  assert.equal(e.run('state.accounts[0].balance'),1000);assert.equal(e.run('state.transactions.length'),0);
  await e.api.record(id,'2026-10-24',payment());
  assert.equal(e.saved().accounts[0].balance,900);assert.equal(e.saved().transactions[0].subscriptionId,id);
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-11-24');
  await assert.rejects(e.api.record(id,'2026-10-24',payment()),/changed|handled/);
  assert.equal(e.saved().transactions.length,1);
});
test('CC renewals create uncategorized purchases without deducting bank money or settling the card',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition({method:'cc',category:''}));
  await e.api.record(id,'2026-10-24',payment({category:''}));
  assert.equal(e.saved().accounts[0].balance,1000);assert.equal(e.saved().transactions.length,0);
  const purchase=e.saved().creditCard.transactions[0];assert.equal(purchase.paidOff,false);assert.equal(purchase.paidAmount,0);assert.equal(purchase.category,undefined);
  assert.equal(e.saved().settings.enableCreditCard,true);
});
test('linking existing expense advances renewal without another expense or deduction',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());
  e.run('state.transactions.push({id:"existing",type:"expense",account:"cash",category:"Other",amount:100,date:"2026-10-23",description:"Netflix"});');
  await e.api.record(id,'2026-10-24',{link:'existing'});
  assert.equal(e.saved().transactions.length,1);assert.equal(e.saved().accounts[0].balance,1000);
  const id2=await e.api.saveDefinition(definition());await assert.rejects(e.api.record(id2,'2026-10-24',{link:'existing'}),/unlinked/);
});
test('snoozing leaves due date intact; skipping advances without any financial record',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());const before=Date.now();
  await e.api.resolve(id,'2026-10-24','snooze');
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-10-24');
  assert.ok(e.saved().subscriptionOccurrences[0].snoozedUntil>=before+6*3600000);
  await e.api.resolve(id,'2026-10-24','skip');assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-11-24');
  assert.equal(e.saved().transactions.length,0);assert.equal(e.saved().accounts[0].balance,1000);
});
test('invalid/insufficient payments, stale drafts, paused subscriptions and lock do not change financial data',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());const before=JSON.stringify(e.saved());
  for(const values of [payment({amount:'2000'}),payment({amount:'1/0'}),payment({category:''}),payment({date:'2026-02-30'})])await assert.rejects(e.api.record(id,'2026-10-24',values));
  await assert.rejects(e.api.record(id,'2026-10-24',payment(),'old draft'),/changed/);
  assert.equal(JSON.stringify(e.saved()),before);
  const sub=e.saved().subscriptions[0];await e.api.setStatus(id,'paused',JSON.stringify(sub));
  await assert.rejects(e.api.record(id,'2026-10-24',payment()),/changed/);
  e.c.isAppLocked=()=>true;await assert.rejects(e.api.saveDefinition(definition()),/Unlock/);
});
test('failed renewal save rolls back transaction, balance, next date and occurrence',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());e.fail();
  await assert.rejects(e.api.record(id,'2026-10-24',payment()),/Failed save/);
  assert.equal(e.run('state.transactions.length'),0);assert.equal(e.run('state.accounts[0].balance'),1000);
  assert.equal(e.run('state.subscriptions[0].nextDueDate'),'2026-10-24');assert.equal(e.run('(state.subscriptionOccurrences||[]).length'),0);
});
test('backup validation preserves schedules and unknown fields and rejects malformed new records',async()=>{
  const e=env();await e.api.saveDefinition(definition());e.run('state.subscriptions[0].futureAndroidField={keep:true};');
  const value=JSON.parse(e.run('JSON.stringify(state)')),result=e.c.prepareImportedData(value);
  assert.equal(result.subscriptions[0].futureAndroidField.keep,true);
  const old=e.run('getDefaultState()');assert.equal(e.c.prepareImportedData(old).subscriptions,undefined);
  value.subscriptions[0].amount=-1;assert.throws(()=>e.c.prepareImportedData(value),/Invalid backup/);
  value.subscriptions={bad:true};assert.throws(()=>e.c.prepareImportedData(value),/Invalid backup/);
});
test('due area includes seven-day subscriptions and debts, excludes paused/settled and survives deleted linked expense',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition({nextDueDate:'2026-10-31'}));
  await e.api.saveDefinition(definition({nextDueDate:'2026-11-01'}));
  e.run('state.debts=[{id:"d1",who:"Friend",dueDate:"2026-10-23",remainingAmount:50},{id:"d2",who:"Paid",dueDate:"2026-10-24",remainingAmount:0}];');
  assert.equal(e.api.upcoming().length,2);
  await e.api.record(id,'2026-10-31',payment());e.run('state.transactions=[];');
  assert.equal(e.api.upcoming().length,1);assert.equal(e.saved().subscriptionOccurrences[0].status,'paid');
});
test('service search keeps related Google subscriptions distinct and unknown brands use local fallbacks',()=>{
  const {run}=env();assert.equal(run('SubscriptionServices.search("chat gpt")[0].id'),'openai');
  assert.equal(run('SubscriptionServices.search("google").some(s=>s.id==="googleone")'),true);
  assert.equal(run('SubscriptionServices.search("google").some(s=>s.id==="googlegemini")'),true);
  assert.ok(run('SubscriptionServices.icon({name:"Gym",icon:"gym"})').includes('fa-dumbbell'));
  assert.ok(!run('SubscriptionServices.icon({name:"<Bad>",serviceId:"unknown"})').includes('<Bad>'));
});
test('brand matching finds whole keywords within personal names and shares Adobe artwork',async()=>{
  const e=env();
  for(const [name,id] of [['Work ChatGPT','openai'],['Personal ChatGPT','openai'],['PickMe renewal for my girlfriend','pickmepass'],['Annual Uber One membership','uberone'],['Work Photoshop','adobephotoshop'],['Creative Cloud for work','adobecreativecloud']])assert.equal(e.run('SubscriptionServices.match('+JSON.stringify(name)+')?.id'),id);
  assert.equal(e.run('SubscriptionServices.match("Boxing club")'),null);
  assert.equal(e.run('SubscriptionServices.match("Spotify Netflix")'),null);
  assert.ok(e.run('SubscriptionServices.icon({name:"Photoshop",serviceId:"adobephotoshop"})').includes('/adobe.svg'));
  assert.ok(!e.run('SubscriptionServices.icon({name:"Work ChatGPT",serviceId:"custom",icon:"gym"})').includes('<img'));
  await e.api.saveDefinition(definition({name:'Work ChatGPT',serviceId:''}));assert.equal(e.saved().subscriptions[0].serviceId,'openai');
  await e.api.saveDefinition(definition({name:'Personal ChatGPT',serviceId:'custom',icon:'gym'}));assert.equal(e.saved().subscriptions[1].serviceId,'custom');
});
test('every bundled SVG is safe, unique by filename and present in the offline manifest',()=>{
  const e=env(),files=fs.readdirSync(path.join(root,'img/subscriptions')).filter(name=>name.endsWith('.svg'));
  const bundled=JSON.parse(e.run('JSON.stringify(SUBSCRIPTION_LOGOS)'));
  assert.deepEqual(files.sort(),bundled.map(id=>id+'.svg').sort());
  for(const name of files){const svg=fs.readFileSync(path.join(root,'img/subscriptions',name),'utf8');assert.match(svg,/<svg[\s>]/);assert.doesNotMatch(svg,/<script|<foreignObject|\son\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i);}
  assert.match(fs.readFileSync(path.join(root,'sw.js'),'utf8'),/SUBSCRIPTION_LOGOS\.map/);
});
test('due reminders are grouped, not repeated on focus, and respect snooze, locks and open forms',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());await e.api.saveDefinition(definition({name:'Overdue',nextDueDate:'2026-10-23'}));
  e.run('state.subscriptions[1].nextDueDate="2026-10-23";');await e.c.saveData();
  e.api.scheduleReminder();await e.tick();assert.match(e.el('subscriptionReminderList').innerHTML,/Netflix/);assert.match(e.el('subscriptionReminderList').innerHTML,/Overdue/);
  e.el('subscriptionReminderModal').style.display='none';e.api.scheduleReminder();await e.tick();assert.equal(e.el('subscriptionReminderModal').style.display,'none');
  await e.api.resolve(id,'2026-10-24','snooze');e.api.scheduleReminder();await e.tick();assert.equal(e.el('subscriptionReminderModal').style.display,'none');
  const snoozeUntil=e.saved().subscriptionOccurrences[0].snoozedUntil;e.c.Date=class extends Date{static now(){return snoozeUntil+1;}};
  e.api.scheduleReminder();await e.tick();assert.equal(e.el('subscriptionReminderModal').style.display,'block');assert.match(e.el('subscriptionReminderList').innerHTML,/Netflix/);
  e.el('subscriptionReminderModal').style.display='none';e.c.isAppLocked=()=>true;e.api.scheduleReminder();await e.tick();assert.equal(e.el('subscriptionReminderModal').style.display,'none');
  e.c.isAppLocked=()=>false;e.c.document.querySelectorAll=()=>[{}];e.c.getComputedStyle=()=>({display:'block'});e.api.scheduleReminder();await e.tick();assert.equal(e.el('subscriptionReminderModal').style.display,'none');
});
test('one date field advances old reference dates to the next renewal without creating past charges',async()=>{
  const e=env();await e.api.saveDefinition(definition({nextDueDate:'2026-01-31'}));
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-10-31');assert.equal(e.saved().subscriptions[0].anchorDay,31);
  assert.equal(e.saved().transactions.length,0);assert.equal(e.saved().accounts[0].balance,1000);
  await e.api.saveDefinition(definition({frequency:'daily',nextDueDate:'2026-10-23'}));assert.equal(e.saved().subscriptions[1].nextDueDate,'2026-10-24');
  const backup=e.c.prepareImportedData(e.saved());assert.equal(backup.subscriptions[1].frequency,'daily');
});
test('past-date calculation skips missed periods, supports six-month renewals, and preserves existing overdue schedules',async()=>{
  const e=env();assert.equal(e.api.firstUpcomingDate('2026-01-31','semiannually',31),'2027-01-31');
  assert.equal(e.api.firstUpcomingDate('2024-02-29','annually',29),'2027-02-28');
  assert.equal(e.api.firstUpcomingDate('2026-10-01','weekly',1),'2026-10-29');
  assert.equal(e.api.firstUpcomingDate('2026-10-24','monthly',24),'2026-10-24');
  const id=await e.api.saveDefinition(definition({frequency:'semiannually'}));e.run('state.subscriptions[0].nextDueDate="2026-09-24";');await e.c.saveData();
  const old=e.saved().subscriptions[0];await e.api.saveDefinition({...old,name:'Renamed',amount:'100'},id,JSON.stringify(old));
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-09-24');assert.equal(e.saved().transactions.length,0);
  assert.equal(e.c.prepareImportedData(e.saved()).subscriptions[0].frequency,'semiannually');
});
test('generic icon changes refresh the preview and editor uses the normal text input with no date-mode selector',()=>{
  const e=env();let html;e.c.openFormModal=(title,content)=>{html=content;};
  e.api.openEditor();assert.match(html,/input type="text" id="subName"/);assert.doesNotMatch(html,/Start From|subDateMode/);
  e.el('subName').value='Gym membership';e.el('subIcon').value='gym';e.el('subIcon').onchange();assert.match(e.el('subIconPreview').innerHTML,/fa-dumbbell/);
  e.el('subName').value='Work ChatGPT';e.el('subName').oninput();assert.match(e.el('subIconPreview').innerHTML,/openai.svg/);
  e.el('subIcon').value='internet';e.el('subIcon').onchange();assert.match(e.el('subIconPreview').innerHTML,/fa-wifi/);assert.doesNotMatch(e.el('subIconPreview').innerHTML,/<img/);
});
test('subscription navigation remains accessible when debt and installment widgets are hidden',()=>{
  const e=env();e.run('state.settings.hideDebts=true;state.settings.hideInstallments=true;');e.api.render();
  assert.equal(e.el('debtsInstallmentsCard').style.display,'block');assert.equal(e.el('oweSectionLabel').textContent,'Subscriptions');
  assert.equal(e.el('receivablesDashboardSection').hidden,true);assert.equal(e.el('addDebtBtn').hidden,true);assert.equal(e.el('addSubscriptionDashboardBtn').hidden,false);
  e.run('state.settings.hideDebts=false;');e.api.render();assert.equal(e.el('oweSectionLabel').textContent,'I Owe');assert.equal(e.el('receivablesDashboardSection').hidden,false);assert.equal(e.el('addDebtBtn').hidden,false);
  assert.equal(e.run('state.transactions.length'),0);assert.equal(e.run('state.accounts[0].balance'),1000);
});
test('subscription fields survive the existing public web import, save and JSON export path',{skip:!fs.existsSync(path.join(root,'../kaasiapp/js/globals.js'))},async()=>{
  const e=env();await e.api.saveDefinition(definition());await e.api.record(e.saved().subscriptions[0].id,'2026-10-24',payment());
  const backup=e.saved();backup.subscriptions[0].androidFuture={preserve:true};
  const data=new Map(),legacy={console:{log(){},warn(){},error(){}},window:{addEventListener(){},supabase:{createClient:()=>null}},localStorage:{setItem:(key,value)=>data.set(key,value),getItem:key=>data.get(key)||null},input:backup};
  vm.createContext(legacy);vm.runInContext(fs.readFileSync(path.join(root,'../kaasiapp/js/globals.js'),'utf8'),legacy);
  vm.runInContext('sanitizeAndMergeImportedData(input); saveData();',legacy);
  const exported=JSON.parse(data.get('KaasiData'));assert.deepEqual(exported.subscriptions,backup.subscriptions);assert.deepEqual(exported.subscriptionOccurrences,backup.subscriptionOccurrences);
  assert.equal(e.c.prepareImportedData(exported).subscriptions[0].androidFuture.preserve,true);
});
