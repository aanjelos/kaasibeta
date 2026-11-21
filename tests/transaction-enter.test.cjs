const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(id,{locked=false,dialog=null,disabled=false,dashboard=false}={}) {
  let submitted=0,prevented=0;
  const field={id,tagName:'SELECT',disabled,form:{requestSubmit(){submitted++;}},matches(selector){return selector.includes('#'+id+',')||selector.includes('#'+id+')');}};
  const typeSelect={value:'expense',querySelector:()=>({}),dispatchEvent(event){if(event.type==='change')submitted++;}};
  const context=vm.createContext({Event,$:selector=>selector==='#transactionType'?typeSelect:null,isAppLocked:()=>locked,topVisibleModal:()=>dialog,document:{activeElement:dashboard?null:field}});
  const source=fs.readFileSync('js/ui.js','utf8').replace(/\r\n/g,'\n'),start=source.indexOf('function handleKeyboardShortcuts('),end=source.indexOf('\n}\n',start)+2;
  vm.runInContext(source.slice(start,end),context);
  return {typeSelect,fire(overrides={}){const event={key:'Enter',target:field,preventDefault(){prevented++;},...overrides};context.handleKeyboardShortcuts(event);return {submitted,prevented};}};
}
test('Enter submits account and category selects for income/expense and both transfer accounts',()=>{
  for(const id of ['account','category','transferFrom','transferTo','ccPurchaseCategory','modalCategory','modalCcPurchaseCategory'])assert.deepEqual(fixture(id).fire(),{submitted:1,prevented:1},id);
});
test('Enter preserves modal isolation, locked/disabled fields and consumed or composing keys',()=>{
  for(const options of [{locked:true},{disabled:true},{dialog:{contains:()=>false}}])assert.equal(fixture('transferTo',options).fire().submitted,0);
  for(const event of [{defaultPrevented:true},{isComposing:true},{repeat:true},{ctrlKey:true},{altKey:true},{metaKey:true},{shiftKey:true}])assert.equal(fixture('transferFrom').fire(event).submitted,0);
  assert.equal(fixture('transferTo',{dialog:{contains:()=>true}}).fire().submitted,1);
});

test('N selects Daily Note on the dashboard and respects shortcut guards',()=>{
  for(const key of ['n','N']){
    const app=fixture('body',{dashboard:true});
    assert.deepEqual(app.fire({key}),{submitted:1,prevented:1});
    assert.equal(app.typeSelect.value,'note');
  }
  for(const options of [{dashboard:false},{dashboard:true,locked:true},{dashboard:true,dialog:{id:'monthlyViewModal'}}]){
    assert.equal(fixture('body',options).fire({key:'n'}).submitted,0);
  }
  for(const event of [{ctrlKey:true},{isComposing:true},{repeat:true},{defaultPrevented:true}]){
    assert.equal(fixture('body',{dashboard:true}).fire({key:'n',...event}).submitted,0);
  }
});
