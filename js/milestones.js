/** Achievement metadata uses the verified dataset settings store, avoiding a database
 * version upgrade. Earned awards and their dates are portable. */
const Milestones = (() => {
  const definitions = [
    ['first_record','First Record','Record an income or expense.','receipt','Getting Started',1,'records'],
    ['first_income','Money In','Record your first income.','coins','Getting Started',1,'income'],
    ['first_expense','First Expense','Record your first expense.','shopping-bag','Getting Started',1,'expense'],
    ['first_debt','Keeping Track','Add your first debt.','hand-holding-usd','Getting Started',1,'debts'],
    ['first_receivable','Owed to You','Add your first receivable.','handshake','Getting Started',1,'receivables'],
    ['first_installment','One Step at a Time','Add your first installment plan.','calendar-check','Getting Started',1,'installments'],
    ...[100,250,500,1000,2500,5000,10000].map(n=>['records_'+n,n.toLocaleString()+' Records','Record '+n.toLocaleString()+' income or expense entries.','layer-group','Building a Habit',n,'records']),
    ...[7,14,28].map((n,i)=>['days_'+n,['A Week Captured','Half a Month','A Month Captured'][i],'Record income or expenses on '+n+' distinct days in one calendar month.','calendar-alt','Building a Habit',n,'days']),
    ...[3,6].map(n=>['months_'+n,n+' Months in View','Have recorded transactions spanning '+n+' calendar months.','history','Your Journey',n,'months']),
    ...[1,2,3,4,5].map(n=>['years_'+n,n===1?'A Year in View':n+' Years in View','Have recorded transactions spanning '+n+' calendar year'+(n===1?'':'s')+'.','history','Your Journey',n,'years']),
    ['first_budget','A Plan for Spending','Create your first budget.','chart-pie','Discover Kaasi',1,'budgets'],
    ['search_filters','Find Your Way','Use a transaction search filter.','filter','Discover Kaasi',1,'search_filters'],
    ['calculator','Quick Calculation','Calculate an amount using an expression.','calculator','Discover Kaasi',1,'calculator'],
    ['local_backup','A Copy to Keep','Export a local backup.','file-export','Discover Kaasi',1,'local_backup'],
    ['cloud_backup','Backed Up','Successfully upload a cloud backup.','cloud','Optional Features',1,'cloud_backup'],
    ['pin_lock','A Little Privacy','Enable the app PIN lock.','lock','Optional Features',1,'pin']
  ].map(([id,name,description,icon,group,target,metric])=>({id,name,description,icon,group,target,metric}));
  const known = new Set(definitions.map(d=>d.id));
  let pending = new Set(), timer, historical = {};
  function anniversary(first,months) {
    const offset=Number(first.slice(5,7))-1+months,y=Number(first.slice(0,4))+Math.floor(offset/12),m=offset%12+1;
    const day=Math.min(Number(first.slice(8)),new Date(y,m,0).getDate());
    return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function metrics(data) {
    const rows=(data.transactions||[]).filter(t=>['income','expense'].includes(t.type));
    const dates=[...new Set(rows.map(t=>t.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')))].sort();
    const monthDays=new Map(); dates.forEach(d=>monthDays.set(d.slice(0,7),(monthDays.get(d.slice(0,7))||0)+1));
    let years=0;
    let months=0;
    if(dates.length) {
      const first=dates[0],last=dates[dates.length-1];
      months=(Number(last.slice(0,4))-Number(first.slice(0,4)))*12+Number(last.slice(5,7))-Number(first.slice(5,7));
      if(last<anniversary(first,months))months--;
      for(let n=1;n<=5;n++) {
        const y=Number(first.slice(0,4))+n,m=Number(first.slice(5,7)),day=Math.min(Number(first.slice(8)),new Date(y,m,0).getDate());
        if(last>=`${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`)years=n;
      }
    }
    return {records:rows.length,income:rows.filter(t=>t.type==='income').length,expense:rows.filter(t=>t.type==='expense').length,
      debts:(data.debts||[]).length,receivables:(data.receivables||[]).length,installments:(data.installments||[]).length,
      budgets:(data.budgets||[]).length,days:Math.max(0,...monthDays.values()),years,months,pin:data.settings?.appPin?.enabled?1:0};
  }
  function evaluate(data, quiet=false, events=[]) {
    const counts=metrics(data), earned={...(data.achievements||{})}, unlocked=[];
    if(quiet) for(const d of definitions) {
      if(earned[d.id]?.earnedAt===0)earned[d.id]={...earned[d.id],...historicalDate(data,d)};
    }
    for(const d of definitions)if(!earned[d.id] && ((counts[d.metric]||0)>=d.target || events.includes(d.metric))) {
      earned[d.id]=quiet?historicalDate(data,d):{earnedAt:Date.now()}; unlocked.push(d.id);
    }
    if(Object.keys(earned).length)data.achievements=earned;
    return quiet?[]:unlocked;
  }
  function historicalDate(data,d) {
    const valid=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
    const rows=(data.transactions||[]).filter(t=>['income','expense'].includes(t.type)&&valid(t.date)).sort((a,b)=>a.date.localeCompare(b.date));
    let date;
    if(d.metric==='records')date=rows[d.target-1]?.date;
    if(['income','expense'].includes(d.metric))date=rows.find(t=>t.type===d.metric)?.date;
    const dates=[...new Set(rows.map(t=>t.date))];
    if(d.metric==='days') {
      const months=new Map();
      date=dates.find(day=>{const m=day.slice(0,7);months.set(m,(months.get(m)||0)+1);return months.get(m)===d.target;});
    }
    if(['years','months'].includes(d.metric) && dates.length) {
      const threshold=anniversary(dates[0],d.target*(d.metric==='years'?12:1));
      date=dates.find(day=>day>=threshold);
    }
    if(['debts','receivables','installments'].includes(d.metric)) {
      const timestamps=(data[d.metric]||[]).map(r=>r.timestamp).filter(t=>Number.isFinite(t)&&t>0&&t<=Date.now()).sort((a,b)=>a-b);
      if(timestamps.length)return {earnedAt:timestamps[0]};
    }
    return date?{earnedAt:Date.parse(date+'T12:00:00Z'),achievedDate:date}:{earnedAt:0};
  }
  function status(item) {
    if(!item)return '';
    const date=item.achievedDate?new Date(item.achievedDate+'T12:00:00Z'):item.earnedAt>0?new Date(item.earnedAt):null;
    return date?'Achieved '+date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',...(item.achievedDate?{timeZone:'UTC'}:{})}):'Achieved';
  }
  function baseline(data) {
    const copy=JSON.parse(JSON.stringify(data)); evaluate(copy,true);
    historical=copy.achievements||{}; pending.clear(); clearTimeout(timer);
  }
  function prepare(data) {
    data.achievements=withHistoricalDates(data.achievements);
    return {events:[...pending],ids:evaluate(data,false,[...pending])};
  }
  function withHistoricalDates(saved={}) {
    const merged={...historical,...saved};
    for(const id of Object.keys(merged))if(merged[id]?.earnedAt===0 && historical[id]?.earnedAt>0)merged[id]={...merged[id],...historical[id]};
    return merged;
  }
  function committed(result) { result.events.forEach(e=>pending.delete(e)); if(result.ids.length)celebrate(result.ids); }
  function track(event) {
    pending.add(event); clearTimeout(timer);
    timer=setTimeout(async()=>{
      if(typeof storageOperationPending!=='undefined' && storageOperationPending){track(event);return;}
      try { await saveData(); } catch (_) { /* Standard save handling retains the last committed state. */ }
    },800);
  }
  function celebrate(ids) {
    const names=ids.map(id=>definitions.find(d=>d.id===id)?.name).filter(Boolean);
    if(!names.length)return;
    // Never steal focus or interrupt a locked screen or active dialog.
    const notify=()=>{
      if(document.querySelector('.modal[style*="display: block"], body.cloud-restoring') || document.querySelector('#pinLockOverlay:not(.hidden)') || document.activeElement?.matches('input,select,textarea')){setTimeout(notify,2000);return;}
      showNotification(names.length===1?'Milestone unlocked: '+names[0]:names.length+' milestones unlocked','achievement',5000);
    }; setTimeout(notify,1000);
  }
  function render() {
    const host=document.getElementById('milestoneCards'); if(!host)return;
    const earned=withHistoricalDates(state.achievements), counts=metrics(state);
    host.innerHTML=[...new Set(definitions.map(d=>d.group))].map(group=>`<section class="milestone-group"><h3>${group}</h3><div class="milestone-grid">${definitions.filter(d=>d.group===group).map(d=>{
      const item=earned[d.id];
      const progress=Math.min(d.target,counts[d.metric]||0);
      const measurable=['records','days','months','years'].includes(d.metric)&&d.id!=='first_record';
      const target=d.metric==='years'?d.target*12:d.target, value=Math.min(target,d.metric==='years'?counts.months:progress);
      const label=measurable?`${value.toLocaleString()} / ${target.toLocaleString()} ${['months','years'].includes(d.metric)?'months':d.metric==='days'?'days':'records'}`:'Not Yet';
      return `<article class="milestone-card ${item?'is-earned':''}"><i class="fas fa-${d.icon}" aria-hidden="true"></i><h4>${d.name}</h4><p>${d.description}</p><div class="milestone-footer">${!item&&measurable?`<progress class="milestone-progress" max="${target}" value="${value}" aria-label="${d.name}">${label}</progress>`:''}<span class="milestone-status">${item?status(item):label}</span></div></article>`;
    }).join('')}</div></section>`).join('');
  }
  function open() { openSettingsModal(); SettingsWorkspace.navigate('settingsMilestonesPanel'); }
  function forget(id) { delete historical[id]; }
  return {definitions,metrics,evaluate,baseline,prepare,committed,track,open,known,forget,historicalDate,status,render};
})();
