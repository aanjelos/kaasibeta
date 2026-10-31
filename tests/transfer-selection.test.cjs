const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(accounts) {
  const makeSelect = () => ({ options: [], dataset: {}, listeners: {}, _value: '',
    get value() { return this._value; }, set value(value) { this._value = this.options.some(o => o.value === value) ? value : ''; },
    set innerHTML(value) { this.options = []; this._value = ''; },
    appendChild(option) { this.options.push(option); if (this.options.length === 1) this._value = option.value; },
    addEventListener(name, fn) { this.listeners[name] = fn; } });
  const transferOption = {};
  const type = { value: 'expense', querySelector: () => transferOption, onchange() { this.changed = true; } };
  const elements = { transferFrom: makeSelect(), transferTo: makeSelect(), transactionType: type };
  const source = fs.readFileSync('js/globals.js', 'utf8').split('function updateTransferAccountOptions')[1].split('\nfunction populateDropdowns')[0];
  const context = vm.createContext({ state: { accounts }, document: { getElementById: id => elements[id], createElement: () => ({}) }, formatCurrency: value => String(value) });
  vm.runInContext('function updateTransferAccountOptions' + source + '\nthis.update = updateTransferAccountOptions;', context);
  return { ...elements, transferOption, update: context.update, state: context.state };
}
const accounts = ['cash', 'bank', 'wallet'].map(id => ({ id, name: id, balance: 10 }));
test('transfer defaults to bank to cash and prevents same-account selections', () => {
  const f = fixture(accounts); f.update();
  assert.equal(f.transferFrom.value, 'bank'); assert.equal(f.transferTo.value, 'cash');
  assert.equal(f.transferFrom.options.find(o => o.value === 'cash').disabled, true);
  assert.equal(f.transferTo.options.length, 3);
  f.transferFrom.value = 'wallet'; f.transferFrom.listeners.change();
  f.transferTo.value = 'wallet'; f.transferTo.listeners.change();
  assert.equal(f.transferTo.value, 'wallet'); assert.equal(f.transferFrom.value, 'bank');
  assert.equal(f.transferFrom.options.find(o => o.value === 'wallet').disabled, true);
  f.update(); assert.equal(f.transferFrom.value, 'bank'); assert.equal(f.transferTo.value, 'wallet');
});
test('fewer than two visible accounts hides transfer and returns an active transfer to expense', () => {
  const f = fixture([accounts[0], { ...accounts[1], hidden: true }]); f.update();
  assert.equal(f.transferFrom.value, ''); assert.equal(f.transferTo.value, 'cash');
  assert.equal(f.transferOption.hidden, true); assert.equal(f.transferOption.disabled, true);
  f.transactionType.value = 'transfer'; f.update(); assert.equal(f.transactionType.value, 'expense'); assert.equal(f.transactionType.changed, true);
  f.state.accounts = []; f.update(); assert.equal(f.transferFrom.value, ''); assert.equal(f.transferTo.value, '');
  f.state.accounts = accounts; f.update(); assert.equal(f.transferOption.hidden, false);
});
