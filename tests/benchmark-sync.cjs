// Synthetic local benchmark. No network or production user data is accessed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const baseline = process.argv.includes('--baseline');
const baselineFiles = new Map();
if (baseline) for (const file of ['storage','cloud-sync']) {
  baselineFiles.set(path.join(__dirname,'..','js',`${file}.js`),require('node:child_process').execFileSync('git',['show',`67999e3:js/${file}.js`],{cwd:path.join(__dirname,'..'),encoding:'utf8'}));
}
const sourceFs = {...fs,readFileSync(file,...args){return baselineFiles.get(String(file)) ?? fs.readFileSync(file,...args);}};
const load = (file, names) => {
  const scope = { require: name => name === 'node:test' ? () => {} : name==='node:fs'?sourceFs:require(name), __dirname: __dirname, console, setTimeout, clearTimeout, setImmediate, Buffer, TextEncoder, DOMException, URL, Blob };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8') + `\nglobalThis.helpers={${names}};`, scope);
  return scope.helpers;
};
const { environment } = load('indexeddb.test.cjs','environment');
const { runtime, syncCloud } = load('audit-regressions.test.cjs','runtime,syncCloud');
(async () => {
  for (const direction of ['unchanged','upload','download']) {
    const runs=[];
    for(let iteration=0;iteration<3;iteration++) {
      const e=environment(), data=e.defaults(); data.settings.initialSetupDone=true;
      data.transactions=Array.from({length:300},(_,i)=>({id:`bench-${i}`,type:'expense',amount:12.5,account:'cash',category:'Other',date:'2026-10-20',timestamp:i,description:'Synthetic benchmark transaction '.repeat(70)}));
      e.data.set('KaasiData',JSON.stringify(data)); if(process.argv.includes('--debug'))console.error('initialize',direction,iteration); await e.initialize();
      const counts={snapshots:0,checkpoints:0};
      const r=runtime(); r.context.KaasiStorage=new Proxy(e.db,{get(target,key){const value=target[key];if(['snapshot','assertSnapshotCurrent'].includes(key))return(...args)=>{counts[key==='snapshot'?'snapshots':'checkpoints']++;return value(...args);};return value;}});r.context.seed=data;
      r.run('state=seed;lastPersistedStateJson=JSON.stringify(state);');
      const cloud=syncCloud(r,{data,updated_at:'2026-10-21T00:00:00Z'});await cloud.baseline(data);
      r.context.initializeUI=()=>{};
      if(direction==='upload') {r.run('state.accounts[0].balance=987;');await e.db.commit(r.run('state'));r.run('lastPersistedStateJson=JSON.stringify(state);');}
      if(direction==='download') {cloud.row.data.accounts[0].balance=876;cloud.row.updated_at='2026-10-22T00:00:00Z';}
      if(process.argv.includes('--debug'))console.error('sync',direction,iteration);
      const start=performance.now(); await r.context.syncCloudData(); const ms=performance.now()-start;
      if(r.notices.some(([text])=>text.startsWith('Sync stopped')))throw Error(JSON.stringify(r.notices));
      runs.push({ms:Math.round(ms),...counts});
    }
    console.log(JSON.stringify({baseline,direction,runs,medianMs:runs.map(run=>run.ms).sort((a,b)=>a-b)[1],records:300,note:'fake-indexeddb, mocked cloud; excludes real network latency and browser rendering'}));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
