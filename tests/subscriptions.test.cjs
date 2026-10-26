const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');const root=path.resolve(__dirname,'..');
function env(){
  const elements=new Map(),preferences=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{style:{},attributes:{},setAttribute(k,v){this.attributes[k]=String(v);},removeAttribute(k){delete this.attributes[k];},hidden:true,innerHTML:'',value:'',getClientRects:()=>[{}],querySelector:()=>null,querySelectorAll:()=>[]});return elements.get(id);};
  let timer;const c={console,crypto:webcrypto,TextEncoder,document:{getElementById:el,querySelector:selector=>el(selector),querySelectorAll:()=>[],addEventListener(){},visibilityState:'visible'},addEventListener(){},setTimeout:action=>{timer=action;},clearTimeout(){},
    supabase:{createClient:()=>null},isAppLocked:()=>false,storageOperationPending:false,KaasiStorage:{mode:'indexeddb'},renderDashboard(){},showNotification(){},getCurrentDateString:()=> '2026-10-24',
    appPreferences:{getItem:k=>preferences.get(k),setItem:(k,v)=>preferences.set(k,v),removeItem:k=>preferences.delete(k),flush:async()=>{}},getComputedStyle:()=>({display:'none'}),openModalHelper:id=>{el(id).style.display='block';},
    closeModal:id=>{el(id).style.display='none';}};
  c.window=c;vm.createContext(c);
  for(const file of ['globals','import-validation','math-tool','features','subscription-assets','subscription-services','subscriptions'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),c);
  // globals defines this helper; freeze the fixture date after loading it.
  c.getCurrentDateString=()=> '2026-10-24';
  const run=s=>vm.runInContext(s,c);run('state=getDefaultState();state.settings.initialSetupDone=true;state.accounts[0].balance=1000;');
  c.renderDashboard=()=>{};c.isAppLocked=()=>false;c.showNotification=()=>{};
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
  assert.equal(e.saved().accounts[0].balance,900);assert.equal(e.saved().transactions[0].subscriptionId,undefined);assert.equal(e.saved().transactions[0].subscriptionOccurrenceId,undefined);assert.equal(e.saved().subscriptionOccurrences,undefined);
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-11-24');
  await assert.rejects(e.api.record(id,'2026-10-24',payment()),/changed|handled/);
  assert.equal(e.saved().transactions.length,1);
});
test('CC renewals create uncategorized purchases without deducting bank money or settling the card',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition({method:'cc',category:''}));
  await e.api.record(id,'2026-10-24',payment({category:''}));
  assert.equal(e.saved().accounts[0].balance,1000);assert.equal(e.saved().transactions.length,0);
  const purchase=e.saved().creditCard.transactions[0];assert.equal(purchase.paidOff,false);assert.equal(purchase.paidAmount,0);assert.equal(purchase.category,undefined);
  assert.equal(purchase.subscriptionId,undefined);assert.equal(purchase.subscriptionOccurrenceId,undefined);assert.equal(e.saved().subscriptionOccurrences,undefined);
  assert.equal(e.saved().settings.enableCreditCard,true);
});
test('paying a snoozed renewal clears only its reminder and creates an independent expense',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());
  await e.api.resolve(id,'2026-10-24','snooze');await e.api.record(id,'2026-10-24',payment());
  assert.equal(e.saved().transactions.length,1);assert.equal(e.saved().accounts[0].balance,900);assert.equal(e.saved().subscriptionOccurrences.length,0);
  assert.equal(e.saved().transactions[0].subscriptionId,undefined);
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
  assert.equal(e.api.upcoming().length,1);assert.equal(e.saved().subscriptionOccurrences,undefined);
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
  assert.equal(e.run('SubscriptionServices.search("light")[0].id'),'lightroommobile');
  assert.equal(e.run('SubscriptionServices.search("lightroom").some(s=>s.id==="adobe")'),false);
  assert.equal(e.run('SubscriptionServices.search("ea")[0].id'),'ea');
  assert.equal(e.run('SubscriptionServices.search("ea").some(s=>["adobe","uberone"].includes(s.id))'),false);
  assert.equal(e.run('SubscriptionServices.search("ea").some(s=>s.id==="namecheap")'),true);
  for(const query of ['', 'fa', 'on', 'onl', 'lonely'])assert.equal(e.run('SubscriptionServices.search('+JSON.stringify(query)+').some(s=>["onlyfans","fansly"].includes(s.id))'),false,query);
  for(const query of ['Only','onlyf','OnlyFans','only fans','Personal OnlyFans','fan','fans','FAN'])assert.equal(e.run('SubscriptionServices.search('+JSON.stringify(query)+').some(s=>s.id==="onlyfans")'),true,query);
  for(const query of ['fan','fans','fansl','Fansly'])assert.equal(e.run('SubscriptionServices.search('+JSON.stringify(query)+').some(s=>s.id==="fansly")'),true,query);
  assert.equal(e.run('SubscriptionServices.search("pass")[0].id'),'passes');
  assert.equal(e.run('SubscriptionServices.search("fa")[0].id'),'facebook');
  assert.equal(e.run('SubscriptionServices.match("Personal OnlyFans").id'),'onlyfans');
  for(const [name,id] of [['Work DeepSeek','deepseek'],['Personal YouTube Music','youtubemusic'],['Amazon Prime','amazonprime'],['Snapchat Plus','snapchat'],['Work WhatsApp Business','whatsapp'],['Instagram Verified','instagram'],['Google Health','fitbit'],['Fitbit Premium','fitbit'],['AutoCAD','autodesk'],['Minecraft Realms Plus','minecraft'],['LinkedIn Premium','linkedin'],['Telegram Premium','telegram'],['AWS','aws'],['QuillBot','quillbot']])assert.equal(e.run('SubscriptionServices.match('+JSON.stringify(name)+')?.id'),id,name);
  for(const [name,id] of [['Work ChatGPT','openai'],['Personal ChatGPT','openai'],['PickMe renewal for my girlfriend','pickmepass'],['Annual Uber One membership','uberone'],['Work Photoshop','adobe'],['Creative Cloud for work','adobe'],['Personal Lightroom Mobile','lightroommobile'],['Work Adobe Lightroom Mobile','lightroommobile'],['Work Lightroom','lightroommobile'],['Freepik for work','magnific'],['Personal Magnific AI','magnific'],['Family Google Play Pass','googleplaypass'],['Lyfta Pro','lyfta']])assert.equal(e.run('SubscriptionServices.match('+JSON.stringify(name)+')?.id'),id);
  assert.equal(e.run('SubscriptionServices.match("Boxing club")'),null);
  assert.equal(e.run('SubscriptionServices.match("Spotify Netflix")'),null);
  assert.ok(e.run('SubscriptionServices.icon({name:"Photoshop",serviceId:"adobe"})').includes('/adobe.svg'));
  assert.ok(!e.run('SubscriptionServices.icon({name:"Work ChatGPT",serviceId:"custom",icon:"gym"})').includes('<img'));
  await e.api.saveDefinition(definition({name:'Work ChatGPT',serviceId:''}));assert.equal(e.saved().subscriptions[0].serviceId,'openai');
  await e.api.saveDefinition(definition({name:'Personal ChatGPT',serviceId:'custom',icon:'gym'}));assert.equal(e.saved().subscriptions[1].serviceId,'custom');
});
test('every listed service has real local artwork and provenance, with no orphan images and complete offline coverage',()=>{
  const e=env(),files=fs.readdirSync(path.join(root,'img/subscriptions')).filter(name=>/\.(svg|webp)$/.test(name));
  const bundled=JSON.parse(e.run('JSON.stringify(SUBSCRIPTION_LOGOS)'));
  const raster=JSON.parse(e.run('JSON.stringify(SUBSCRIPTION_LOGO_FILES)'));
  assert.deepEqual(files.sort(),bundled.map(id=>raster[id]||id+'.svg').sort());
  assert.equal(bundled.length,156);assert.equal(new Set(bundled).size,bundled.length);
  for(const name of files.filter(file=>file.endsWith('.svg'))){const svg=fs.readFileSync(path.join(root,'img/subscriptions',name),'utf8');assert.match(svg,/<svg[\s>]/);assert.doesNotMatch(svg,/<script|<foreignObject|\son\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i);}
  const sources=JSON.parse(fs.readFileSync(path.join(root,'img/subscriptions/sources.json'),'utf8'));
  assert.equal(sources.length,156);
  for(const id of bundled){const source=sources.find(row=>row.id===id);assert.ok(source?.source);assert.equal(source.file,raster[id]||id+'.svg');assert.equal(source.bytes,fs.statSync(path.join(root,'img/subscriptions',source.file)).size);}
  assert.doesNotMatch(sources.find(row=>row.id==='hulu').source,/disney|bamgrid/);
  assert.equal(e.run('SubscriptionServices.get("peotv").logoId'),'sltmobitel');
  assert.match(e.run('SubscriptionServices.icon({name:"PEO TV",serviceId:"peotv"})'),/sltmobitel.webp/);
  const services=JSON.parse(e.run('JSON.stringify(SubscriptionServices.services)'));
  for(const service of services){const html=e.run('SubscriptionServices.icon('+JSON.stringify({serviceId:service.id,name:service.name})+')');assert.match(html,/<img src="img\/subscriptions\/[a-z0-9]+\.(svg|webp)\?v=[^"]+"/);assert.match(html,/loading="lazy"/);}
  const worker={importScripts(){},self:{addEventListener(){}}};vm.createContext(worker);
  vm.runInContext(fs.readFileSync(path.join(root,'js/subscription-assets.js'),'utf8'),worker);
  vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8')+';this.assets=STATIC_ASSETS;',worker);
  for(const file of files)assert.ok(!worker.assets.includes('./img/subscriptions/'+file),'Logos must not download during installation');
});

test('service worker fetches logos on demand and reuses the cached response',async()=>{
  const handlers=new Map(),stored=new Map();let downloads=0,installed;
  const response={ok:true,clone(){return this;}};
  const cache={match:async request=>stored.get(request.url),put:async(request,value)=>stored.set(request.url,value),addAll:async assets=>{installed=assets;}};
  const context={URL,importScripts(){},self:{location:{origin:'https://beta.example'},addEventListener:(name,handler)=>handlers.set(name,handler)},caches:{open:async()=>cache},fetch:async()=>{downloads++;return response;}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
  let waiting;handlers.get('install')({waitUntil:p=>waiting=p});await waiting;
  assert.ok(installed.every(url=>!url.includes('img/subscriptions/')));
  const request={method:'GET',url:'https://beta.example/img/subscriptions/adobe.svg?v=test',destination:'image'};
  const load=async()=>{let result;handlers.get('fetch')({request,respondWith:p=>result=p});return result;};
  assert.equal(await load(),response);assert.equal(downloads,1);
  assert.equal(await load(),response);assert.equal(downloads,1);
});

test('removed catalogue choices stay absent while current service IDs and saved financial data remain intact',async()=>{
  const e=env();
  for(const id of ['applearcade','pocketcasts','nebula','curiositystream','sketch','spline','linear','pcloud','sync','1password','bitwarden','dashlane','expressvpn','mullvad','digitalocean','linode','vultr','hetzner','heroku','render','railway','postman','sentry','datadog','newrelic','brevo','kit','brilliant','datacamp','codecademy','frontendmasters','peloton','tradingview','ynab'])assert.equal(e.run('SubscriptionServices.services.some(service=>service.id==='+JSON.stringify(id)+')'),false);
  assert.equal(e.run('SubscriptionServices.services.filter(service=>service.id.startsWith("adobe")).length'),1);
  assert.equal(e.run('SubscriptionServices.get("adobe").id'),'adobe');
  assert.equal(e.run('SubscriptionServices.get("adobephotoshop")'),undefined);
  assert.match(e.run('SubscriptionServices.icon({name:"Work Freepik",serviceId:"magnific"})'),/magnific.webp/);
  assert.match(e.run('SubscriptionServices.icon({name:"Lightroom Mobile",serviceId:"lightroommobile"})'),/lightroommobile.webp/);
  await e.api.saveDefinition(definition());
  e.run('state.subscriptions[0].serviceId="adobe";state.subscriptions[0].futureField={keep:true};');await e.c.saveData();
  const before=e.saved(),copy=e.c.prepareImportedData(before),sub=before.subscriptions[0];
  assert.deepEqual(JSON.parse(JSON.stringify(copy.subscriptions)),before.subscriptions);
  e.run('SubscriptionServices.icon(state.subscriptions[0]);');assert.deepEqual(e.saved(),before);
  await e.api.saveDefinition({...sub,amount:'100'},sub.id,JSON.stringify(sub));
  assert.equal(e.saved().subscriptions[0].serviceId,'adobe');assert.equal(e.saved().subscriptions[0].futureField.keep,true);
  assert.deepEqual(e.saved().accounts,before.accounts);assert.deepEqual(e.saved().transactions,before.transactions);
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
test('past payment dates advance one period and remain overdue without creating past charges',async()=>{
  const e=env();await e.api.saveDefinition(definition({nextDueDate:'2026-01-31'}));
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-02-28');assert.equal(e.saved().subscriptions[0].anchorDay,31);
  assert.equal(e.saved().transactions.length,0);assert.equal(e.saved().accounts[0].balance,1000);
  await e.api.saveDefinition(definition({frequency:'daily',nextDueDate:'2026-10-23'}));assert.equal(e.saved().subscriptions[1].nextDueDate,'2026-10-24');
  const backup=e.c.prepareImportedData(e.saved());assert.equal(backup.subscriptions[1].frequency,'daily');
});
test('past-date calculation retains missed renewals across frequencies and preserves existing overdue schedules',async()=>{
  const e=env();assert.equal(e.api.firstUpcomingDate('2026-01-31','semiannually',31),'2026-07-31');
  assert.equal(e.api.firstUpcomingDate('2024-02-29','annually',29),'2025-02-28');
  assert.equal(e.api.firstUpcomingDate('2026-10-01','weekly',1),'2026-10-08');
  assert.equal(e.api.firstUpcomingDate('2026-09-08','monthly',8),'2026-10-08');
  assert.equal(e.api.firstUpcomingDate('2026-10-08','monthly',8),'2026-11-08');
  assert.equal(e.api.firstUpcomingDate('2026-01-31','quarterly',31),'2026-04-30');
  assert.equal(e.api.firstUpcomingDate('2026-10-01','daily',1),'2026-10-02');
  assert.equal(e.api.firstUpcomingDate('2026-11-08','monthly',8),'2026-11-08');
  assert.equal(e.api.firstUpcomingDate('2026-10-24','monthly',24),'2026-10-24');
  const id=await e.api.saveDefinition(definition({frequency:'semiannually'}));e.run('state.subscriptions[0].nextDueDate="2026-09-24";');await e.c.saveData();
  const old=e.saved().subscriptions[0];await e.api.saveDefinition({...old,name:'Renamed',amount:'100'},id,JSON.stringify(old));
  assert.equal(e.saved().subscriptions[0].nextDueDate,'2026-09-24');assert.equal(e.saved().transactions.length,0);
  assert.equal(e.c.prepareImportedData(e.saved()).subscriptions[0].frequency,'semiannually');
});
test('saved last-paid schedules stay overdue in reminders and can be skipped or paused',async()=>{
  const e=env();
  for(const [frequency,date,expected] of [['daily','2026-10-01','2026-10-02'],['weekly','2026-10-01','2026-10-08'],['monthly','2026-09-08','2026-10-08'],['quarterly','2026-01-31','2026-04-30'],['semiannually','2026-01-31','2026-07-31'],['annually','2024-02-29','2025-02-28']]){
    const id=await e.api.saveDefinition(definition({name:frequency,frequency,nextDueDate:date}));
    const sub=e.saved().subscriptions.find(s=>s.id===id);assert.equal(sub.nextDueDate,expected);
    assert.ok(e.api.upcoming().some(row=>row.id===id&&row.due===expected));
  }
  assert.equal(e.saved().transactions.length,0);assert.equal(e.saved().accounts[0].balance,1000);
  const monthly=e.saved().subscriptions.find(s=>s.frequency==='monthly');
  await e.api.resolve(monthly.id,monthly.nextDueDate,'skip');
  assert.equal(e.saved().subscriptions.find(s=>s.id===monthly.id).nextDueDate,'2026-11-08');
  assert.equal(e.saved().transactions.length,0);
  await e.api.setStatus(monthly.id,'paused',JSON.stringify(e.saved().subscriptions.find(s=>s.id===monthly.id)));
  assert.ok(!e.api.upcoming().some(row=>row.id===monthly.id));
});

test('generic icon changes refresh the preview and editor uses the normal text input with no date-mode selector',()=>{
  const e=env();let html;e.c.openFormModal=(title,content)=>{html=content;};
  e.api.openEditor();assert.match(html,/input type="text" id="subName"/);assert.doesNotMatch(html,/Start From|subDateMode|subChangeService|Find Service/);assert.match(html,/Bi-Annual/);
  e.el('#dynamicForm [name="frequency"]').value='monthly';
  e.el('subDate').value='2026-09-08';e.el('subDate').onchange();
  assert.equal(Boolean(e.el('subNextDatePreview').hidden),false);assert.match(e.el('subNextDatePreview').textContent,/16 days overdue/);
  e.el('subDate').value='2026-10-08';e.el('subDate').onchange();assert.match(e.el('subNextDatePreview').textContent,/Due in 15 days/);
  e.el('subName').value='Gym membership';e.el('subIcon').value='gym';e.el('subIcon').onchange();assert.match(e.el('subIconPreview').innerHTML,/fa-dumbbell/);
  e.el('subName').value='Work ChatGPT';e.el('subName').oninput();assert.match(e.el('subIconPreview').innerHTML,/fa-dumbbell/);
  e.el('subIcon').value='auto';e.el('subIcon').onchange();assert.match(e.el('subIconPreview').innerHTML,/openai.svg/);assert.equal(e.el('subServiceResults').hidden,true);
  assert.doesNotMatch(html,/subServiceLabel/);assert.match(html,/subscription-name-control/);assert.match(html,/aria-label="Subscription Icon"/);assert.doesNotMatch(html,/id="subCustomIconField"[^>]*hidden/);
  e.el('subIcon').value='internet';e.el('subIcon').onchange();assert.match(e.el('subIconPreview').innerHTML,/fa-wifi/);assert.doesNotMatch(e.el('subIconPreview').innerHTML,/<img/);
});
test('dashboard notices show three identifiable payments at most, with accurate overflow and no writes',async()=>{
  const e=env();for(let i=0;i<4;i++)await e.api.saveDefinition(definition({name:i===0?'Personal Spotify <test>':'Subscription '+i,nextDueDate:'2026-10-'+(24+i),serviceId:i===0?'spotify':'custom'}));
  const before=JSON.stringify(e.saved());e.api.renderNotice();const html=e.el('upcomingPaymentsNotice').innerHTML;
  assert.equal((html.match(/class="upcoming-notice-item"/g)||[]).length,3);assert.match(html,/spotify.svg/);assert.match(html,/Personal Spotify &lt;test&gt;/);assert.match(html,/Due today/);assert.match(html,/Due tomorrow/);assert.match(html,/Due in 2 days/);assert.match(html,/100\.00/);assert.match(html,/and 1 more…/);assert.doesNotMatch(html,/Subscription 3/);assert.equal(JSON.stringify(e.saved()),before);
  e.run('state.subscriptions=state.subscriptions.slice(0,1);');e.api.renderNotice();assert.doesNotMatch(e.el('upcomingPaymentsNotice').innerHTML,/more…/);
  e.run('state.subscriptions=[];');e.api.renderNotice();assert.equal(e.el('upcomingPaymentsNotice').hidden,true);
});
test('subscription navigation remains accessible when debt and installment widgets are hidden',()=>{
  const e=env();e.run('state.settings.hideDebts=true;state.settings.hideInstallments=true;');e.api.render();
  assert.equal(e.el('debtsInstallmentsCard').style.display,'block');assert.equal(e.el('oweSectionLabel').textContent,'Subscriptions');
  assert.equal(e.el('receivablesDashboardSection').hidden,true);assert.equal(e.el('addDebtBtn').hidden,true);assert.equal(e.el('addSubscriptionDashboardBtn').hidden,false);
  e.run('state.settings.hideDebts=false;');e.api.render();assert.equal(e.el('oweSectionLabel').textContent,'I Owe');assert.equal(e.el('receivablesDashboardSection').hidden,false);assert.equal(e.el('addDebtBtn').hidden,false);
  assert.equal(e.run('state.transactions.length'),0);assert.equal(e.run('state.accounts[0].balance'),1000);
});
test('payment choices simplify already-recorded confirmation, and category defaults respect saved choices and removal',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());let html;e.c.openFormModal=(title,content)=>{html=content;};
  e.run('state.subscriptions[0].category="";');e.api.openPayment(id);
  assert.match(html,/<option value="new">Add Expense<\/option><option value="existing">Already Recorded<\/option>/);
  assert.match(html,/value="Subscriptions &amp; Memberships" selected/);assert.doesNotMatch(html,/Already recorded:/);
  e.run('state.subscriptions[0].category="Groceries";');e.api.openPayment(id);assert.match(html,/value="Groceries" selected/);
  e.run('state.subscriptions[0].category="";state.categories=state.categories.filter(c=>c!=="Subscriptions & Memberships");');e.api.openPayment(id);
  assert.match(html,/<option value="" selected disabled>---- Select Category ----<\/option>/);
  const controls=[{},{}];e.el('subNewPaymentFields').querySelectorAll=()=>controls;e.el('subPaymentMode').value='existing';e.el('subPaymentMode').onchange({target:{value:'existing'}});
  assert.equal(e.el('subNewPaymentFields').hidden,true);assert.ok(controls.every(c=>c.disabled));assert.equal(e.el('subPaymentSubmit').textContent,'Update Renewal');
  assert.doesNotMatch(html,/Find Expense|subRecordedList|Link Recorded Entry/);
});

test('already-recorded renewals advance bank and CC schedules without linking or changing financial records',async()=>{
  for(const method of ['bank','cc']){
    const e=env(),id=await e.api.saveDefinition(definition({method}));
    e.run('state.transactions.push({id:"independent",type:"expense",account:"cash",category:"Other",amount:100,date:"2026-10-24",description:"Already paid"});');await e.c.saveData();
    const before=e.saved();await e.api.record(id,'2026-10-24',{alreadyRecorded:true});const after=e.saved();
    assert.deepEqual(after.transactions,before.transactions);assert.deepEqual(after.creditCard,before.creditCard);assert.deepEqual(after.accounts,before.accounts);
    assert.equal(after.subscriptions[0].nextDueDate,'2026-11-24');assert.equal(after.subscriptionOccurrences,undefined);
    assert.equal(e.c.prepareImportedData(after).subscriptionOccurrences,undefined);
    await assert.rejects(e.api.record(id,'2026-10-24',{alreadyRecorded:true}),/changed|recorded/);
  }
});

test('an accidental payment can be deleted and its date reset without reopening or changing financial data',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());await e.api.record(id,'2026-10-24',payment());
  e.run('state.transactions=[];state.accounts[0].balance=1000;');await e.c.saveData();
  const sub=e.saved().subscriptions[0],values={...sub,amount:'100',nextDueDate:'2026-10-24'};
  const before=e.saved();await e.api.saveDefinition(values,id,JSON.stringify(sub));
  assert.equal(e.saved().subscriptionOccurrences,undefined);assert.equal(e.saved().subscriptions[0].renewalRevision,1);assert.deepEqual(e.saved().transactions,before.transactions);assert.deepEqual(e.saved().accounts,before.accounts);
  e.run('appPreferences.setItem("kaasi_subscription_prompt_seen",JSON.stringify({date:"2026-10-24",tokens:[Subscriptions.occurrenceId(state.subscriptions[0].id,"2026-10-24")+":0"]}));');
  e.api.scheduleReminder();await e.tick();assert.equal(e.el('subscriptionReminderModal').style.display,'block');e.el('subscriptionReminderModal').style.display='none';
  assert.equal(e.api.upcoming().length,1);await e.api.record(id,'2026-10-24',payment());assert.equal(e.saved().transactions.length,1);assert.equal(e.saved().accounts[0].balance,900);
});

test('legacy linked payments and handled markers are preserved without constraining schedule edits or payments',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());await e.api.record(id,'2026-10-24',payment());
  e.run('state.transactions[0].subscriptionId=state.subscriptions[0].id;state.transactions[0].subscriptionOccurrenceId=Subscriptions.occurrenceId(state.subscriptions[0].id,"2026-10-24");state.subscriptionOccurrences=[{id:state.transactions[0].subscriptionOccurrenceId,subscriptionId:state.subscriptions[0].id,dueDate:"2026-10-24",status:"paid",transactionId:state.transactions[0].id,amount:100,date:"2026-10-24",kind:"bank"}];');await e.c.saveData();
  const previous=e.saved(),sub=previous.subscriptions[0];await e.api.saveDefinition({...sub,amount:'100',nextDueDate:'2026-10-24'},id,JSON.stringify(sub));
  assert.equal(e.api.upcoming().length,1);let title;e.c.openFormModal=value=>{title=value;};e.api.openPayment(id);assert.equal(title,'Pay Subscription');
  await e.api.record(id,'2026-10-24',payment());assert.deepEqual(e.saved().transactions[0],previous.transactions[0]);assert.deepEqual(e.saved().subscriptionOccurrences,previous.subscriptionOccurrences);assert.equal(e.saved().transactions[1].subscriptionId,undefined);
});

test('new subscriptions due today stay independently payable, use Pay actions, and do not create handled records on save',async()=>{
  const e=env(),first=await e.api.saveDefinition(definition()),second=await e.api.saveDefinition(definition({name:'Envato',method:'cc'}));
  assert.equal(e.saved().subscriptionOccurrences,undefined);assert.equal(e.api.upcoming().length,2);e.api.render();
  assert.match(e.el('subscriptionList').innerHTML,/>Pay<\/button>/);assert.doesNotMatch(e.el('subscriptionList').innerHTML,/>Charged<|>Paid</);
  await e.api.record(first,'2026-10-24',payment());await e.api.record(second,'2026-10-24',payment());
  assert.equal(e.saved().transactions.length,1);assert.equal(e.saved().creditCard.transactions.length,1);assert.equal(e.saved().subscriptionOccurrences,undefined);
});

test('failed already-recorded and date-correction saves restore schedules and reminder state atomically',async()=>{
  const first=env(),firstId=await first.api.saveDefinition(definition()),before=first.saved();first.fail();
  await assert.rejects(first.api.record(firstId,'2026-10-24',{alreadyRecorded:true}),/Failed save/);assert.equal(first.run('JSON.stringify(state)'),JSON.stringify(before));
  const e=env(),id=await e.api.saveDefinition(definition());await e.api.resolve(id,'2026-10-24','skip');const sub=e.saved().subscriptions[0],previous=e.saved();e.fail();
  await assert.rejects(e.api.saveDefinition({...sub,amount:'100',nextDueDate:'2026-10-24'},id,JSON.stringify(sub)),/Failed save/);
  assert.equal(e.run('JSON.stringify(state)'),JSON.stringify(previous));
});
test('all services use dark frames and Adobe uses explicit red artwork',()=>{
  const e=env();
  for(const id of e.run('SubscriptionServices.services.map(s=>s.id)'))assert.doesNotMatch(e.run('SubscriptionServices.icon({name:"Service",serviceId:'+JSON.stringify(id)+'})'),/subscription-icon-light/);
  assert.match(fs.readFileSync(path.join(root,'img/subscriptions/adobe.svg'),'utf8'),/fill="#FF0000"/);
});
test('deleting a schedule retains independent expenses, CC purchases and balances and clears its temporary snooze',async()=>{
  const e=env(),id=await e.api.saveDefinition(definition());await e.api.record(id,'2026-10-24',payment());
  const ccId=await e.api.saveDefinition(definition({method:'cc'}));await e.api.record(ccId,'2026-10-24',payment());
  await e.api.resolve(id,e.saved().subscriptions[0].nextDueDate,'snooze');
  const before=e.saved();await assert.rejects(e.api.deleteDefinition(id,'stale'),/changed/);
  await e.api.deleteDefinition(id,JSON.stringify(before.subscriptions[0]));await e.api.deleteDefinition(ccId,JSON.stringify(e.saved().subscriptions[0]));
  assert.equal(e.saved().subscriptions.length,0);assert.deepEqual(e.saved().transactions,before.transactions);assert.deepEqual(e.saved().creditCard,before.creditCard);assert.deepEqual(e.saved().accounts,before.accounts);assert.deepEqual(e.saved().subscriptionOccurrences,[]);
  assert.equal(e.c.prepareImportedData(e.saved()).subscriptionOccurrences.length,0);
});
test('subscription fields survive the existing public web import, save and JSON export path',{skip:!fs.existsSync(path.join(root,'../kaasiapp/js/globals.js'))},async()=>{
  const e=env();await e.api.saveDefinition(definition());await e.api.record(e.saved().subscriptions[0].id,'2026-10-24',payment());
  const external=await e.api.saveDefinition(definition({name:'Already recorded elsewhere'}));await e.api.record(external,'2026-10-24',{alreadyRecorded:true});
  const backup=e.saved();backup.subscriptions[0].androidFuture={preserve:true};
  const data=new Map(),legacy={console:{log(){},warn(){},error(){}},window:{addEventListener(){},supabase:{createClient:()=>null}},localStorage:{setItem:(key,value)=>data.set(key,value),getItem:key=>data.get(key)||null},input:backup};
  vm.createContext(legacy);vm.runInContext(fs.readFileSync(path.join(root,'../kaasiapp/js/globals.js'),'utf8'),legacy);
  vm.runInContext('sanitizeAndMergeImportedData(input); saveData();',legacy);
  const exported=JSON.parse(data.get('KaasiData'));assert.deepEqual(exported.subscriptions,backup.subscriptions);assert.deepEqual(exported.subscriptionOccurrences,backup.subscriptionOccurrences);
  assert.equal(e.c.prepareImportedData(exported).subscriptions[0].androidFuture.preserve,true);
});
