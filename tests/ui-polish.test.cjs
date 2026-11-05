const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function counters() {
  let now = 0, next = 0;
  const frames = new Map();
  const context = vm.createContext({
    window: { matchMedia: () => ({matches:false}), addEventListener(){} },
    document: { createTextNode: value => ({nodeValue:value}) },
    performance: {now:()=>now},
    formatCurrency: value => `LKR ${value.toFixed(2)}`,
    requestAnimationFrame: fn => {frames.set(++next,fn);return next;},
    cancelAnimationFrame: id => frames.delete(id)
  });
  vm.runInContext(fs.readFileSync('js/animations.js','utf8'),context);
  const element = {id:'balance',dataset:{},textContent:'',isConnected:true,attributes:new Map(),writes:0,
    setAttribute(key,value){this.attributes.set(key,value);},removeAttribute(key){this.attributes.delete(key);},
    set innerHTML(value){this.writes++;this.markup=value;this.lastElementChild={appendChild:node=>{this.node=node;}};}
  };
  return {context,element,frames,tick(time){now=time;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));}};
}

test('a newer balance cancels the previous counter and retains the latest exact value',()=>{
  const r=counters();
  r.context.animateValue(r.element,100);
  r.tick(100);
  const firstNode=r.element.node;
  assert.equal(r.element.writes,1);
  r.tick(200);
  assert.equal(r.element.node,firstNode,'animation reuses the same text node');
  assert.equal(r.element.writes,1,'frames do not replace HTML');
  r.context.animateValue(r.element,25);
  assert.equal(r.frames.size,1,'only the replacement counter remains scheduled');
  r.tick(800);
  assert.equal(r.element.node.nodeValue,'LKR 25.00');
  assert.equal(r.frames.size,0);
  assert.equal(r.element.attributes.has('data-balance-animating'),false);
});

test('detached balance elements stop scheduling animation frames',()=>{
  const r=counters();r.context.animateValue(r.element,100);r.element.isConnected=false;r.tick(50);
  assert.equal(r.frames.size,0);
  assert.equal(r.element.attributes.has('data-balance-animating'),false);
});

function notification(reduced,type) {
  const timers=[];
  const node={style:{},attributes:{},classList:{add(){},remove(){}},setAttribute(k,v){this.attributes[k]=v;},
    addEventListener(){},remove(){this.removed=true;}};
  const context=vm.createContext({window:{matchMedia:()=>({matches:reduced})},document:{createElement:()=>node},
    $:()=>({appendChild(){}}),requestAnimationFrame:fn=>fn(),setTimeout:fn=>timers.push(fn)});
  const source=fs.readFileSync('js/globals.js','utf8');
  vm.runInContext(source.slice(source.indexOf('function showNotification('),source.indexOf('function compareCategoryNames(')),context);
  context.showNotification('Test notice',type,1);
  return {node,timers};
}

test('routine notifications are polite and removed immediately with reduced motion',()=>{
  const r=notification(true,'success');
  assert.equal(r.node.attributes.role,'status');assert.equal(r.node.attributes['aria-live'],'polite');
  r.timers.shift()();assert.equal(r.node.removed,true);
});

test('error notifications remain assertive and clean up without transitionend',()=>{
  const r=notification(false,'error');
  assert.equal(r.node.attributes.role,'alert');assert.equal(r.node.attributes['aria-live'],'assertive');
  r.timers.shift()();assert.equal(r.node.removed,undefined);
  r.timers.shift()();assert.equal(r.node.removed,true);
});
