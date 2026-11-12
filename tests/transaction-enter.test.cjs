const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(id,{locked=false,dialog=null,disabled=false}={}) {
  let submitted=0,prevented=0;
  const field={id,tagName:'SELECT',disabled,form:{requestSubmit(){submitted++;}},matches(selector){return selector.includes('#'+id+',')||selector.includes('#'+id+')');}};
  const context=vm.createContext({$:()=>null,isAppLocked:()=>locked,topVisibleModal:()=>dialog,document:{activeElement:field}});
  const source=fs.readFileSync('js/ui.js','utf8').replace(/\r\n/g,'\n'),start=source.indexOf('function handleKeyboardShortcuts('),end=source.indexOf('\n}\n',start)+2;
  vm.runInContext(source.slice(start,end),context);
  return {fire(overrides={}){const event={key:'Enter',target:field,preventDefault(){prevented++;},...overrides};context.handleKeyboardShortcuts(event);return {submitted,prevented};}};
}
test('Enter submits account and category selects for income/expense and both transfer accounts',()=>{
  for(const id of ['account','category','transferFrom','transferTo','ccPurchaseCategory','modalCategory','modalCcPurchaseCategory'])assert.deepEqual(fixture(id).fire(),{submitted:1,prevented:1},id);
});
test('Enter preserves modal isolation, locked/disabled fields and consumed or composing keys',()=>{
  for(const options of [{locked:true},{disabled:true},{dialog:{contains:()=>false}}])assert.equal(fixture('transferTo',options).fire().submitted,0);
  for(const event of [{defaultPrevented:true},{isComposing:true},{repeat:true},{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true}])assert.equal(fixture('transferFrom').fire(event).submitted,0);
  assert.equal(fixture('transferTo',{dialog:{contains:()=>true}}).fire().submitted,1);
});
