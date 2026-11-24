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
