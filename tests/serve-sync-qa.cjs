// Local-only disposable QA: fake account/cloud, synthetic financial data, no Supabase requests.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={window:{addEventListener(){},supabase:{createClient:()=>null}},console:{log(){},error(){}}};
const fixture=JSON.parse(vm.runInNewContext(fs.readFileSync(path.join(root,'js/globals.js'),'utf8')+'\nJSON.stringify(getDefaultState())',context));
fixture.settings.initialSetupDone=true;fixture.settings.backupReminderFrequency='off';fixture.accounts[0].balance=4000;
if(process.env.KAASI_CC_QA==='1'){
  fixture.settings.enableCreditCard=true;
  fixture.creditCard={limit:100000,transactions:[
    {id:'qa_cc1',description:'Weekly groceries for the household — vegetables, pantry essentials and supplies',amount:2500,paidAmount:500,paidOff:false,date:'2026-10-22',timestamp:1},
    {id:'qa_cc2',description:'Lunch with friends',amount:1500,paidAmount:0,paidOff:false,date:'2026-10-21',timestamp:2},
    {id:'qa_cc3',description:'Settled purchase',amount:200,paidAmount:200,paidOff:true,date:'2026-10-20',timestamp:3}
  ]};
}
fixture.transactions=[{id:'qa_groceries',type:'expense',amount:2000,account:'cash',category:'Groceries',description:'Groceries',date:'2026-10-22',timestamp:1},
  {id:'qa_lunch',type:'expense',amount:500,account:'cash',category:'Food & Dining',description:'Lunch',date:'2026-10-22',timestamp:2}];
if(process.env.KAASI_SUBS_QA==='1'){
  fixture.subscriptions=[
    {id:'qa_spotify',name:'Personal Spotify',amount:299,method:'bank',account:'cash',category:'Other',frequency:'monthly',nextDueDate:'2026-10-24',anchorDay:24,status:'active',serviceId:'spotify',icon:'letter'},
    {id:'qa_chatgpt',name:'Work ChatGPT',amount:6500,method:'cc',account:'',category:'Other',frequency:'monthly',nextDueDate:'2026-10-27',anchorDay:27,status:'active',serviceId:'openai',icon:'letter'},
    {id:'qa_pickme',name:'PickMe renewal for my girlfriend',amount:399,method:'bank',account:'cash',category:'Other',frequency:'monthly',nextDueDate:'2026-10-30',anchorDay:30,status:'active',serviceId:'pickmepass',icon:'letter'},
    {id:'qa_gym',name:'Gym membership',amount:2000,method:'bank',account:'cash',category:'Other',frequency:'monthly',nextDueDate:'2026-10-31',anchorDay:31,status:'active',serviceId:'custom',icon:'gym'}
  ];fixture.subscriptionOccurrences=[];
}
if(process.env.KAASI_RESPONSIVE_QA==='1'){
  fixture.accounts[0].balance=1028379.43;
  fixture.installments=[{id:'qa_plan',description:'Glasses and accessories',monthlyAmount:1333.33,totalMonths:12,monthsLeft:3,startDate:'2026-01-01'}];
  fixture.receivables=[{id:'qa_receivable',type:'cash',who:'Mello',why:'Shared dinner and household supplies',amount:1317,originalAmount:1317,remainingAmount:1317,sourceAccount:'cash',dateGiven:'2026-10-18'}];
  fixture.budgets=[{id:'qa_budget',name:'Transport and Maintenance for the household',categories:['Groceries'],limit:1200}];
}
if(process.env.KAASI_HISTORY_QA==='1'){
  fixture.transactions.push(...Array.from({length:25},(_,i)=>({id:'history_'+i,type:'expense',amount:10,account:'cash',category:'Groceries',description:'Market visit '+i,date:'2026-10-22',timestamp:100+i})));
}
if(process.env.KAASI_MIXED_PAYMENTS_QA==='1'){
  const day=offset=>{const date=new Date();date.setDate(date.getDate()+offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
  fixture.debts=[{id:'qa_kasun',who:'Kasun',why:'Test loan',amount:3500,remainingAmount:3500,dueDate:day(-2)}];
  fixture.subscriptions=[['netflix','Netflix',1800,1],['spotify','Spotify',749,5]].map(([serviceId,name,amount,offset])=>({id:'qa_'+serviceId,name,amount,method:'bank',account:'cash',category:'Other',frequency:'monthly',nextDueDate:day(offset),anchorDay:Number(day(offset).slice(8)),status:'active',serviceId,icon:'letter'}));
}
const remote=JSON.parse(JSON.stringify(fixture));remote.accounts[0].balance=4300;remote.transactions[0].amount=1500;
remote.transactions[1]={...remote.transactions[1],id:'qa_taxi',amount:200,description:'Taxi',category:'Transportation'};
if(process.env.KAASI_SYNC_QA_LONG_TEXT==='1'){
  fixture.transactions[0].description='Weekly groceries for the household — vegetables, fresh fruit, pantry essentials and supplies for the family gathering this weekend, including the extra items collected from the second supermarket. '+ 'Additional items for the household. '.repeat(12);
  remote.transactions[0].description='Weekly groceries for the household — vegetables, fresh fruit and pantry essentials for the family gathering this weekend. '+ 'Items collected from the first supermarket. '.repeat(10);
  fixture.transactions[1].description='LunchWithTheTeamAfterTheQuarterlyPlanningSession'.repeat(8);
}
const bootstrap=`<script>
${process.env.KAASI_ANALYTICS_QA==='1'?`window.gtag=(...args)=>{let output=document.getElementById('qaAnalyticsEvents');if(!output){output=document.createElement('output');output.id='qaAnalyticsEvents';output.hidden=true;output.textContent='[]';document.body.append(output);}const events=JSON.parse(output.textContent);events.push(args);output.textContent=JSON.stringify(events);};`:''}
if(!localStorage.getItem('syncQaSeeded')){localStorage.setItem('KaasiData',${JSON.stringify(process.env.KAASI_STORAGE_RECOVERY_QA==='1'?'{invalid synthetic backup':JSON.stringify(fixture))});localStorage.setItem('syncQaSeeded','true');}
navigator.storage.persist=async()=>true;
${process.env.KAASI_RESTORE_OVERLAY_QA==='1'?"localStorage.setItem('kaasi_auto_sync_paused','true');":''}
window.supabase={createClient(){let row=${JSON.stringify({data:remote,updated_at:'2026-10-22T10:00:00Z'})};return {
auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{user:{id:'qa-sync-only',email:'qa@example.invalid'}}}})},
from(){let fields,method='read',payload,expected;return {
select(value){fields=value;return this;},eq(key,value){if(key==='updated_at')expected=value;return this;},
insert(value){method='insert';payload=value;return this;},update(value){method='update';payload=value;return this;},
async maybeSingle(){${process.env.KAASI_RESTORE_OVERLAY_QA==='1'?"if(method==='read'&&fields.includes('data'))await new Promise(resolve=>setTimeout(resolve,12000));":''}if(method==='insert'&&row)return{data:null,error:{code:'23505'}};if(method==='update'&&row.updated_at!==expected)return{data:null,error:null};
if(method!=='read')row=payload;return{data:fields==='updated_at'?{updated_at:row.updated_at}:row,error:null};}}
}}}};
</script>`;
const accountQa = process.env.KAASI_ACCOUNT_QA === '1' ? `<script>
window.supabase={createClient(){
  let user={id:'qa-account-a',email:'alex@example.invalid'},row=${JSON.stringify({data:remote,updated_at:'2026-11-13T10:00:00Z'})},writes=0;
  const report=()=>{const output=document.getElementById('qaAccountState');if(output)output.textContent=JSON.stringify({user:user?.id,writes,cloudBalance:row?.data.accounts[0].balance??null,deviceBalance:state?.accounts?.[0]?.balance??null,owner:appPreferences.getItem('kaasi_cloud_data_owner')});};
  document.addEventListener('DOMContentLoaded',()=>{
    const panel=document.createElement('aside');panel.id='qaAccountTools';panel.style.cssText='position:fixed;bottom:0;left:0;z-index:200;background:#333;padding:4px;font:11px sans-serif;color:white';
    const add=(label,action)=>{const button=document.createElement('button');button.textContent=label;button.style.cssText='margin:2px;padding:3px;border:1px solid white';button.onclick=async()=>{await action();report();};panel.append(button);};
    const reset=empty=>{user={id:empty?'qa-account-b':'qa-account-a',email:empty?'blair@example.invalid':'alex@example.invalid'};row=empty?null:${JSON.stringify({data:remote,updated_at:'2026-11-13T10:00:00Z'})};supabaseUser=user;updateSupabaseUI(user);};
    add('QA Other Account',()=>reset(false));add('QA Empty Account',()=>reset(true));
    add('QA Check Sync',()=>syncCloudData());add('QA Read State',()=>{});
    const output=document.createElement('output');output.id='qaAccountState';output.style.display='block';panel.append(output);document.body.append(panel);report();
  });
  return {auth:{onAuthStateChange(){},getSession:async()=>({data:{session:user?{user}:null}}),signOut:async()=>{user=null;report();return{error:null};}},
    from(){let fields,method='read',payload,expected;return{select(value){fields=value;return this;},eq(key,value){if(key==='updated_at')expected=value;return this;},insert(value){method='insert';payload=value;return this;},update(value){method='update';payload=value;return this;},async maybeSingle(){
      if(method==='insert'&&row)return{data:null,error:{code:'23505'}};
      if(method==='update'&&row?.updated_at!==expected)return{data:null,error:null};
      if(method!=='read'){row=payload;writes++;}report();
      return{data:row?(fields==='updated_at'?{updated_at:row.updated_at}:row):null,error:null};
    }}}};
}};
</script>` : '';
new vm.Script(bootstrap.slice(8,-9));
if(accountQa)new vm.Script(accountQa.slice(8,-9));
http.createServer((req,res)=>{
  let name=new URL(req.url,'http://127.0.0.1').pathname;if(name==='/')name='/index.html';
  if(!(/^\/(index\.html|style\.css|settings-workspace\.css|onboarding\.css|tailwind\.css|manifest\.json)$/.test(name)||/^\/(js|img|fonts|licenses)\/[a-zA-Z0-9_./-]+$/.test(name))||name.split('/').includes('..')){res.writeHead(404).end();return;}
  try{
    let body=fs.readFileSync(path.join(root,name));
    if(name==='/index.html')body=body.toString().replace('<script src="js/globals.js',bootstrap+accountQa+'<script src="js/globals.js');
    const type={'.txt':'text/plain; charset=utf-8','.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
    res.writeHead(200,{'Content-Type':type[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end();}
}).listen(Number(process.env.KAASI_SYNC_QA_PORT||8768),'127.0.0.1',()=>console.log('Synthetic sync QA server ready (default port 8768).'));
