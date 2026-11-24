const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const summarize = vm.runInNewContext(fs.readFileSync(require.resolve('../js/stats.js'),'utf8')+'\nKaasiStats.summarize');

test('Stats uses saved entries, counts card purchases once, and sums only logged money', () => {
  const expense = {date:'2026-02-10', type:'expense',amount:19.95};
  const data = {transactions:[expense,{...expense,amount:0.05},{...expense,type:'income',amount:12},
    {...expense,date:'2025-10-01'}, {...expense,date:'2026-12-01'}, {...expense,type:'transfer'}],
    creditCard:{transactions:[{date:'2026-02-11',amount:100,paidAmount:50}]}};
  const snapshot = JSON.stringify(data);
  const result = summarize(data,'2026','2026-11-24');
  assert.deepEqual(Array.from(result.counts),[2,1,1]);
  assert.deepEqual(Array.from(result.totals),[2000,1200]);
  assert.equal(result.top[0][0],expense);
  assert.deepEqual(Array.from(result.day),['2026-02-10',2000]);
  assert.equal(result.days,2);
  assert.equal(result.months,1);
  assert.equal(result.last,'2026-02-11');
  assert.equal(summarize(data,'all','2026-11-24').first,'2025-10-01');
  assert.equal(JSON.stringify(data),snapshot);
});

test('Empty and legacy datasets need no tracking metadata', () => {
  assert.deepEqual(Array.from(summarize({},'all','2026-11-24').counts),[0,0,0]);
  const transactions = Array.from({length:12000},()=>({date:'2020-01-01',type:'income',amount:1}));
  const result = summarize({transactions},'all','2026-11-24');
  assert.equal(result.counts[1],12000);
  assert.equal(result.top[1].length,5);
});

test('Stats exclusions are opt-in and filter rankings, days, totals and card counts together', () => {
  const data = {
    hiddenCategories: ['Savings'],
    transactions: [
      {type:'expense', date:'2026-02-10', amount:500, category:'Savings'},
      {type:'income', date:'2026-02-10', amount:300, category:'Savings'},
      {type:'expense', date:'2026-03-01', amount:10, category:'Groceries'},
      {type:'income', date:'2026-03-01', amount:20, category:'Income'}
    ],
    creditCard: {transactions:[{date:'2026-02-10', amount:100, category:'Savings'}]}
  };
  assert.deepEqual(Array.from(summarize(data,'all','2026-11-24').counts),[2,2,1]);
  data.settings = {hiddenCategoryRules:{excludeFromStats:true}};
  const filtered = summarize(data,'all','2026-11-24');
  assert.deepEqual(Array.from(filtered.counts),[1,1,0]);
  assert.deepEqual(Array.from(filtered.totals),[1000,2000]);
  assert.equal(filtered.top[0][0].category,'Groceries');
  assert.equal(filtered.top[1][0].category,'Income');
  assert.equal(filtered.days,1);
  assert.equal(filtered.months,1);
  assert.equal(filtered.first,'2026-03-01');
  assert.deepEqual(Array.from(filtered.day),['2026-03-01',1000]);
});
