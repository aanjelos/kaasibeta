const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/history-suggestions.js','utf8').split('(() => {')[0],context);
const find = (...args)=>JSON.parse(JSON.stringify(context.findHistorySuggestions(...args)));

test('placement reserves two results when narrowing to one and responds to actual space changes',()=>{
  const source=fs.readFileSync('js/history-suggestions.js','utf8');
  const start=source.indexOf('    function position() {'),end=source.indexOf('\n    position();',start);
  const popup={style:{},scrollHeight:128,offsetHeight:128,offsetWidth:280};
  const viewport={height:450,width:390,offsetLeft:0,offsetTop:0};
  const rect={top:300,bottom:344,left:20,width:280};
  const c=vm.createContext({popup,list:popup,el:{getBoundingClientRect:()=>rect},window:{visualViewport:viewport},sourceFloatingLayer:()=>100,
    performance:{now:()=>1000},started:0,Math,close(){throw Error('Unexpected close');}});
  vm.runInContext(source.slice(start,end),c);c.position();
  assert.equal(popup.style.top,'164px','two results appear above');
  popup.scrollHeight=64;popup.offsetHeight=64;c.position();
  assert.equal(popup.style.top,'228px','one result remains above instead of flipping below');
  viewport.height=600;c.position();assert.equal(popup.style.top,'352px','below is allowed once two results fit');
  viewport.height=180;rect.top=60;rect.bottom=104;c.position();
  assert.equal(popup.style.top,'112px','when neither side fits, use the roomier side');
  assert.equal(popup.style.maxHeight,'64px');
});
test('history suggestions require typing, isolate types, rank prefixes and deduplicate newest entries',()=>{
  const rows=[
    {description:'Weekly groceries',category:'Old',timestamp:1,type:'expense'},
    {description:'Weekly groceries',category:'Groceries',timestamp:2,type:'expense'},
    {description:'Groceries delivery',timestamp:0,type:'expense'},
    {description:'Groceries refund',timestamp:9,type:'income'},
    {description:'Other groceries',timestamp:3,type:'expense'}
  ];
  assert.deepEqual(find(rows,'g','description','expense'),[]);
  const results=find(rows,'gro','description','expense');
  assert.equal(results.length,2);
  assert.equal(results[0].description,'Groceries delivery');
  assert.equal(results[1].description,'Other groceries');
  assert.equal(find(rows,'weekly','description','expense')[0].category,'Groceries');
  assert.equal(find(rows,'gro','description','income')[0].description,'Groceries refund');
  assert.equal(rows.length,5);
});
test('person suggestions trim and deduplicate names without modifying records',()=>{
  const rows=[{who:' Alice ',timestamp:1},{who:'alice',timestamp:2},{who:'Alison',timestamp:3}];
  assert.equal(find(rows,'ali','who').length,2);
  assert.equal(find(rows,'a','who').length,2);
  assert.deepEqual(find(rows,' ','who'),[]);
  assert.equal(rows[0].who,' Alice ');
  assert.deepEqual(find(rows,'missing','who'),[]);
});
test('incremental limits preserve match order and stop at all distinct matches',()=>{
  const rows=Array.from({length:25},(_,i)=>({description:'Market '+i,timestamp:i,type:'expense'}));
  const first=find(rows,'market','description','expense',10);
  const next=find(rows,'market','description','expense',20);
  const all=find(rows,'market','description','expense',30);
  assert.equal(first.length,10); assert.equal(next.length,20); assert.equal(all.length,25);
  assert.deepEqual(next.slice(0,10),first); assert.deepEqual(all.slice(0,20),next);
});
