const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const globals=fs.readFileSync('js/globals.js','utf8');
const helper=globals.slice(globals.indexOf('function trackFeatureEvent('),globals.indexOf('// Device-Specific Settings'));
function milestones(preferences=new Map()) {
  const events=[];const c=vm.createContext({Date,Set,Map,JSON,Math,String,Number,setTimeout:()=>0,clearTimeout(){},
    appPreferences:{getItem:k=>preferences.get(k),setItem:(k,v)=>preferences.set(k,v)},gtag:(...args)=>events.push(JSON.parse(JSON.stringify(args)))});
  vm.runInContext(helper+'\n'+fs.readFileSync('js/milestones.js','utf8')+'\nthis.m=Milestones;',c);
  return {m:c.m,c,events,preferences};
}
test('feature analytics allowlists events and milestone IDs and discards arbitrary details',()=>{
  const e=milestones();e.c.trackFeatureEvent('subscription_created',{name:'private',amount:999});
  e.c.trackFeatureEvent('private_person');e.c.trackFeatureEvent('milestone_unlocked','private_badge');
  e.c.trackFeatureEvent('milestone_unlocked','calculator');
  assert.deepEqual(e.events,[['event','subscription_created',{event_category:'Feature Usage'}],['event','milestone_unlocked',{event_category:'Feature Usage',milestone_id:'calculator'}]]);
  e.c.gtag=()=>{throw Error('blocked');};assert.doesNotThrow(()=>e.c.trackFeatureEvent('setup_completed'));
  delete e.c.gtag;assert.doesNotThrow(()=>e.c.trackFeatureEvent('tutorial_completed'));
});
test('milestones emit after commit only and receipts prevent replay across restore and reload',()=>{
  const e=milestones(),data={transactions:[]};e.m.baseline(data);
  const result=e.m.prepare(data,'calculator');assert.equal(e.events.length,0);
  e.m.committed(result);e.m.committed(result);assert.equal(e.events.length,1);
  const reload=milestones(e.preferences);reload.m.baseline({transactions:[]});
  reload.m.committed(reload.m.prepare({transactions:[]},'calculator'));assert.equal(reload.events.length,0);
});
test('historical imports and synced achievements remain silent on subsequent saves',()=>{
  const e=milestones(),restored={transactions:[{type:'expense',date:'2026-11-01'}],achievements:{calculator:{earnedAt:123},future_badge:{earnedAt:1}}};
  e.m.baseline(restored);e.m.committed(e.m.prepare(restored));assert.equal(e.events.length,0);
  const synced=JSON.parse(JSON.stringify(restored));synced.achievements.looking_back={earnedAt:456};
  e.m.baseline(synced);e.m.committed(e.m.prepare(synced,'previous_month'));assert.equal(e.events.length,0);
  assert.equal(synced.achievements.future_badge.earnedAt,1);
});
function onboarding(fail=false) {
  const events=[],element={style:{},querySelector(){return this;},focus(){},disabled:false,textContent:''};
  const c={console:{error(){},log(){}},window:{addEventListener(){}},document:{getElementById:()=>element,querySelector:()=>null,addEventListener(){}},
    history:{state:{}},closeModal(){},showNotification(){},initializeUI(){},setTimeout:()=>0,clearTimeout(){},
    appPreferences:{getItem(){},setItem(){}},gtag:(...args)=>events.push(JSON.parse(JSON.stringify(args)))};
  c.navigator={};c.addEventListener=()=>{};c.window=c;vm.createContext(c);vm.runInContext(globals,c);
  c.saveData=async value=>{if(fail)throw Error('save failed');c.candidate=value;vm.runInContext('state=candidate',c);};
  let source=fs.readFileSync('js/onboarding.js','utf8');
  source=source.replace('return {open,openReturning,openTutorial,','return {finish,closeTour,setDraft:value=>{draft=value;},open,openReturning,openTutorial,');
  vm.runInContext(source+'\nthis.o=Onboarding;state=getDefaultState();',c);
  c.o.setDraft({accounts:[{id:'cash',name:'Private account',balance:'123.45'}],categories:['Other'],ccEnabled:false,pinEnabled:false});
  return {c,events};
}
test('setup tracks only a committed new setup and tutorial completion excludes skipping',async()=>{
  const e=onboarding();await e.c.o.finish();await e.c.o.finish();
  assert.deepEqual(e.events,[['event','setup_completed',{event_category:'Feature Usage'}]]);
  e.c.o.closeTour(false);assert.equal(e.events.length,1);e.c.o.closeTour(true);
  assert.deepEqual(e.events[1],['event','tutorial_completed',{event_category:'Feature Usage'}]);
  const failed=onboarding(true);await failed.c.o.finish();assert.equal(failed.events.length,0);
});
