const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/history-suggestions.js','utf8').split('(() => {')[0],context);
const find = (...args)=>JSON.parse(JSON.stringify(context.findHistorySuggestions(...args)));
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
