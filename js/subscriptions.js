/** Offline subscription schedules and explicit renewal recording. No automatic charges. */
const Subscriptions = (() => {
  let busy=false, filter='active', search='', reminderTimer;
  const list=()=>state.subscriptions || [];
  const occurrences=()=>state.subscriptionOccurrences || [];
  const dateObject=value=>new Date(`${value}T00:00:00Z`);
  const frequencies={daily:'Daily',weekly:'Weekly',monthly:'Monthly',quarterly:'Quarterly',semiannually:'Bi-Annual',annually:'Annual'};
  const defaultCategory=()=>state.categories.find(category=>category.toLowerCase()==='subscriptions & memberships')||'';
  const paymentCategory=sub=>getCcPurchaseCategory(sub)||defaultCategory();
  const categoryOptions=(selected,optional=false)=>{
    const valid=getCcPurchaseCategory({category:selected});
    return `<option value=""${valid?'':' selected'}${optional?'':' disabled'}>---- Select Category ----</option>`+ccPurchaseCategoryOptions(valid,false).replace('<option value="">Select Category</option>','');
  };
  function validDate(value) {
    return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(dateObject(value).getTime()) && dateObject(value).toISOString().slice(0,10)===value;
  }
  function nextDate(subscription,due=subscription.nextDueDate) {
    const date=dateObject(due);
    if(subscription.frequency==='daily'||subscription.frequency==='weekly') date.setUTCDate(date.getUTCDate()+(subscription.frequency==='daily'?1:7));
    else {
      const step={monthly:1,quarterly:3,semiannually:6,annually:12}[subscription.frequency];
      if(!step) throw new Error('Choose a supported renewal frequency.');
      const month=date.getUTCMonth()+step,year=date.getUTCFullYear();
      date.setUTCDate(1);date.setUTCMonth(month);
      const day=subscription.anchorDay || Number(due.slice(8));
      date.setUTCDate(Math.min(day,new Date(Date.UTC(year,month+1,0)).getUTCDate()));
    }
    const result=date.toISOString().slice(0,10);
    if(!validDate(result))throw new Error('Choose a renewal date within the supported calendar range.');
    return result;
  }
  function firstUpcomingDate(due,frequency,anchorDay=Number(due.slice(8)),today=getCurrentDateString()) {
    if(due>=today)return due;
    const start=dateObject(due),target=dateObject(today),period={daily:1,weekly:7}[frequency];
    if(period){start.setUTCDate(start.getUTCDate()+Math.ceil((target-start)/86400000/period)*period);return start.toISOString().slice(0,10);}
    const step={monthly:1,quarterly:3,semiannually:6,annually:12}[frequency];
    if(!step)throw new Error('Choose a supported renewal frequency.');
    const months=(target.getUTCFullYear()-start.getUTCFullYear())*12+target.getUTCMonth()-start.getUTCMonth();
    const count=Math.max(1,Math.floor(months/step));
    start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()+count*step);
    const end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
    start.setUTCDate(Math.min(anchorDay,end.getUTCDate()));
    const result=start.toISOString().slice(0,10);
    return result<today?nextDate({frequency,anchorDay,nextDueDate:result}):result;
  }
  const occurrenceId=(id,due)=>`${id}_${due.replace(/-/g,'')}`;
  const find=id=>list().find(row=>row.id===id);
  const fingerprint=row=>JSON.stringify(row);
  const occurrence=(id,due)=>occurrences().find(row=>row.id===occurrenceId(id,due));
  const daysUntil=due=>Math.round((dateObject(due)-dateObject(getCurrentDateString()))/86400000);
  const formatDate=due=>dateObject(due).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  function dueLabel(due) {
    const days=daysUntil(due);
    return days<0?`${Math.abs(days)} ${days===-1?'day':'days'} overdue`:days===0?'Due today':days===1?'Due tomorrow':`Due in ${days} days`;
  }
  function assertOpen() {
    if(isAppLocked()) throw new Error('Unlock Kaasi first.');
    if(busy || storageOperationPending) throw new Error('Wait for the current save to finish.');
    if(KaasiStorage.mode!=='indexeddb') throw new Error('Upgrade local storage before saving subscriptions.');
  }
  function assertCurrent(id,due,expected) {
    const sub=find(id);
    if(!sub || sub.status!=='active' || sub.nextDueDate!==due || (expected && fingerprint(sub)!==expected)) throw new Error('This subscription changed. Close this form and reopen it.');
    const prior=occurrence(id,due);
    if(prior && ['paid','skipped'].includes(prior.status)) throw new Error('This renewal has already been handled.');
    return sub;
  }
  async function change(action) {
    assertOpen();busy=true;
    try {action();await saveData();}
    finally {busy=false;}
    renderDashboard();render();
  }
  function upsertOccurrence(sub,due,fields) {
    state.subscriptionOccurrences ||= [];
    const id=occurrenceId(sub.id,due), prior=occurrence(sub.id,due);
    const row={id,subscriptionId:sub.id,dueDate:due,...(prior || {}),...fields};
    if(prior) Object.assign(prior,row);else state.subscriptionOccurrences.push(row);
    return row;
  }
  async function saveDefinition(values,id,expected) {
    const amount=parseAmountValue(values.amount),name=String(values.name || '').trim();
    if(!name || name.length>160) throw new Error('Enter a subscription name up to 160 characters.');
    if(!Number.isFinite(amount)||amount<=0) throw new Error('Enter a valid subscription amount.');
    if(!validDate(values.nextDueDate)||!Object.hasOwn(frequencies,values.frequency)) throw new Error('Choose a renewal date and frequency.');
    const existing=id?find(id):null;
    const anchorDay=Number.isInteger(values.anchorDay)&&values.anchorDay>=1&&values.anchorDay<=31?values.anchorDay:Number(values.nextDueDate.slice(8));
    const unchangedDate=existing && existing.nextDueDate===values.nextDueDate && existing.frequency===values.frequency;
    const nextDueDate=unchangedDate?existing.nextDueDate:firstUpcomingDate(values.nextDueDate,values.frequency,anchorDay);
    if(!['bank','cc'].includes(values.method)) throw new Error('Choose a payment method.');
    if(values.method==='bank' && !state.accounts.some(a=>a.id===values.account && !a.hidden)) throw new Error('Choose an available account.');
    const category=getCcPurchaseCategory({category:values.category});
    if(values.method==='bank'&&!category) throw new Error('Choose a category for bank/cash expenses.');
    if(id && (!existing || fingerprint(existing)!==expected)) throw new Error('This subscription changed. Reopen the form.');
    const serviceId=values.serviceId && (values.serviceId==='custom'||SubscriptionServices.services.some(row=>row.id===values.serviceId)||existing?.serviceId===values.serviceId)?values.serviceId:SubscriptionServices.match(name)?.id||'';
    const definition={...(existing || {}),id:id||generateId(),name,amount,method:values.method,
      account:values.method==='bank'?values.account:'',category,frequency:values.frequency,nextDueDate,
      anchorDay:unchangedDate?existing.anchorDay:anchorDay,
      serviceId,icon:Object.hasOwn(SubscriptionServices.generics,values.icon)||existing?.icon===values.icon?values.icon:'letter',status:existing?.status||'active',timestamp:existing?.timestamp||Date.now()};
    await change(()=>{
      state.subscriptions ||= [];
      if(existing) Object.assign(existing,definition);else state.subscriptions.push(definition);
    });
    return definition.id;
  }
  async function record(id,due,values,expected) {
    const sub=assertCurrent(id,due,expected);
    const link=String(values.link || '');
    let transaction,amount,date,account,category;
    if(link) {
      transaction=(sub.method==='cc'?state.creditCard.transactions:state.transactions).find(row=>row.id===link);
      if(!transaction || (sub.method==='bank' && (transaction.type!=='expense'||transaction.account!==sub.account)) || transaction.subscriptionOccurrenceId || occurrences().some(row=>row.transactionId===link && row.kind===sub.method)) throw new Error('Choose an unlinked expense or CC purchase from the correct account.');
      amount=transaction.amount;date=transaction.date;
    } else {
      amount=parseAmountValue(values.amount);date=values.date;
      if(!Number.isFinite(amount)||amount<=0||!validDate(date)) throw new Error('Enter a valid amount and payment date.');
      category=getCcPurchaseCategory({category:values.category});
      if(sub.method==='bank') {
        account=state.accounts.find(row=>row.id===values.account && !row.hidden);
        if(!account||!category) throw new Error('Choose an account and category.');
        if(account.balance<amount) throw new Error(`Insufficient funds in ${account.name}.`);
      }
    }
    const next=nextDate(sub,due),key=occurrenceId(id,due);
    await change(()=>{
      assertCurrent(id,due,expected);
      if(!transaction) {
        transaction={id:generateId(),amount,description:sub.name,date,timestamp:Date.now()};
        if(sub.method==='cc') {
          state.settings.enableCreditCard=true;
          transaction.paidAmount=0;transaction.paidOff=false;
          if(category) transaction.category=category;
          state.creditCard.transactions.push(transaction);
        } else {
          Object.assign(transaction,{type:'expense',account:account.id,category});
          account.balance=roundToTwoDecimals(account.balance-amount);state.transactions.push(transaction);
        }
      }
      transaction.subscriptionId=id;transaction.subscriptionOccurrenceId=key;
      upsertOccurrence(sub,due,{status:'paid',transactionId:transaction.id,kind:sub.method,amount,date,handledAt:Date.now(),snoozedUntil:0});
      sub.nextDueDate=next;
    });
  }
  async function resolve(id,due,action,expected) {
    const sub=assertCurrent(id,due,expected);
    if(!['snooze','skip'].includes(action)) throw new Error('Choose a supported reminder action.');
    await change(()=>{
      assertCurrent(id,due,expected);
      upsertOccurrence(sub,due,action==='snooze'?{status:'snoozed',snoozedUntil:Date.now()+6*3600000}:{status:'skipped',handledAt:Date.now(),snoozedUntil:0});
      if(action!=='snooze') sub.nextDueDate=nextDate(sub,due);
    });
  }
  async function setStatus(id,status,expected) {
    const sub=find(id);
    if(!sub||fingerprint(sub)!==expected||!['active','paused','cancelled'].includes(status)) throw new Error('This subscription changed. Reopen its options.');
    await change(()=>{sub.status=status;});
  }
  async function deleteDefinition(id,expected) {
    const sub=find(id);
    if(!sub||fingerprint(sub)!==expected)throw new Error('This subscription changed. Reopen its options.');
    await change(()=>{state.subscriptions=state.subscriptions.filter(row=>row.id!==id);});
  }
  function upcoming() {
    const subscriptions=list().filter(row=>row.status==='active' && daysUntil(row.nextDueDate)<=7).map(sub=>({kind:'subscription',id:sub.id,name:sub.name,due:sub.nextDueDate,amount:sub.amount,sub}));
    const debts=(state.debts||[]).filter(row=>row.remainingAmount>0 && validDate(row.dueDate) && daysUntil(row.dueDate)<=7)
      .map(row=>({kind:'debt',id:row.id,name:row.who,due:row.dueDate,amount:row.remainingAmount}));
    return [...subscriptions,...debts].sort((a,b)=>a.due.localeCompare(b.due)||a.name.localeCompare(b.name));
  }
  function renderNotice() {
    const bar=document.getElementById('upcomingPaymentsNotice');if(!bar)return;
    const items=upcoming();bar.hidden=items.length===0;
    if(!items.length){bar.innerHTML='';return;}
    bar.innerHTML=items.slice(0,3).map(item=>`<button type="button" class="upcoming-notice-item" data-sub-action="upcoming">${item.sub?SubscriptionServices.icon(item.sub):'<span class="subscription-icon"><i class="fas fa-hand-holding-usd" aria-hidden="true"></i></span>'}<span class="upcoming-notice-copy"><strong>${escapeHTML(item.name)}</strong><small class="${daysUntil(item.due)<0?'text-expense':''}">${item.kind==='debt'?'Debt · ':''}${escapeHTML(dueLabel(item.due))}</small></span><span class="upcoming-notice-amount">${formatCurrency(item.amount)}</span><i class="fas fa-chevron-right upcoming-notice-chevron" aria-hidden="true"></i></button>`).join('')+(items.length>3?`<button type="button" class="upcoming-notice-more" data-sub-action="upcoming">and ${items.length-3} more…</button>`:'');
  }
  function render() {
    renderNotice();
    renderDashboardEntry();
    if(document.getElementById('upcomingPaymentsModal')?.style.display==='block')renderUpcoming();
    if(document.getElementById('subscriptionReminderModal')?.style.display==='block')renderReminder();
    const host=document.getElementById('subscriptionList');if(!host)return;
    let rows=list().filter(sub=>filter==='due'?sub.status==='active'&&daysUntil(sub.nextDueDate)<=7:filter==='paused'?sub.status!=='active':sub.status==='active');
    rows=rows.filter(sub=>sub.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.nextDueDate.localeCompare(b.nextDueDate));
    host.innerHTML=rows.length?rows.map(sub=>{
      const snoozed=occurrence(sub.id,sub.nextDueDate)?.snoozedUntil>Date.now();
      return `<article class="subscription-row">${SubscriptionServices.icon(sub)}<div class="subscription-row-copy"><strong>${escapeHTML(sub.name)}</strong><span class="${daysUntil(sub.nextDueDate)<0?'text-expense':''}">${sub.status==='active'?escapeHTML(dueLabel(sub.nextDueDate)):'Paused'} · ${escapeHTML(formatDate(sub.nextDueDate))}</span><small>${escapeHTML(frequencies[sub.frequency])}${snoozed?' · Reminder snoozed':''}</small></div><div class="subscription-row-actions"><strong class="tabular-nums">${formatCurrency(sub.amount)}</strong><div>${sub.status==='active'?`<button class="btn btn-primary" data-sub-action="paid" data-sub-id="${escapeHTML(sub.id)}">${sub.method==='cc'?'Charged':'Paid'}</button>`:''}<button class="btn btn-secondary" data-sub-action="manage" data-sub-id="${escapeHTML(sub.id)}" aria-label="Manage ${escapeHTML(sub.name)}"><i class="fas fa-ellipsis-h" aria-hidden="true"></i></button></div></div></article>`;
    }).join(''):`<div class="subscription-empty"><i class="far fa-calendar-check" aria-hidden="true"></i><p>${search?'No matching subscriptions.':filter==='paused'?'No paused subscriptions.':'No subscriptions here yet.'}</p>${filter!=='paused'?'<button class="btn btn-primary" data-sub-action="add">Add Subscription</button>':''}</div>`;
  }
  function renderDashboardEntry() {
    const hidden=!!state.settings?.hideDebts;
    const label=document.getElementById('oweSectionLabel');if(!label)return;
    label.textContent=hidden?'Subscriptions':'I Owe';
    document.getElementById('totalOwed').hidden=hidden;
    const summary=document.getElementById('subscriptionActiveSummary');summary.hidden=!hidden;
    summary.textContent=`${list().filter(sub=>sub.status==='active').length} active`;
    document.getElementById('receivablesDashboardSection').hidden=hidden;
    document.getElementById('addDebtBtn').hidden=hidden;
    document.getElementById('viewDebtsBtn').hidden=hidden;
    document.getElementById('addSubscriptionDashboardBtn').hidden=!hidden;
    document.getElementById('owedViewActions').classList?.toggle('subscriptions-only',hidden);
    const container=document.getElementById('debtsReceivablesContainer');
    container.classList?.toggle('subscriptions-only',hidden);
    if(hidden){
      container.style.display='grid';document.getElementById('debtsInstallmentsCard').style.display='block';
      const title=document.getElementById('debtsInstallmentsTitle');title.style.display='block';
      title.textContent=state.settings.hideInstallments?'Subscriptions':'Subscriptions & Installments';
    }
  }
  function openManager(view='active') {
    if(isAppLocked())return;
    filter=view;search='';document.getElementById('subscriptionSearch').value='';
    document.getElementById('subscriptionFilter').value=view;
    render();if(document.getElementById('subscriptionsModal').style.display!=='block')openModalHelper('subscriptionsModal');
  }
  function renderUpcoming() {
    const host=document.getElementById('upcomingPaymentList');
    host.innerHTML=upcoming().map(item=>`<article class="subscription-row">${item.sub?SubscriptionServices.icon(item.sub):'<span class="subscription-icon"><i class="fas fa-hand-holding-usd" aria-hidden="true"></i></span>'}<div class="subscription-row-copy"><strong>${escapeHTML(item.name)}</strong><span class="${daysUntil(item.due)<0?'text-expense':''}">${escapeHTML(dueLabel(item.due))}</span><small>${item.kind==='debt'?'Debt':escapeHTML(frequencies[item.sub.frequency])}</small></div><div class="subscription-row-actions"><strong>${formatCurrency(item.amount)}</strong><button class="btn btn-primary" ${item.kind==='debt'?`data-record-action="payDebt" data-record-id="${escapeHTML(item.id)}"`:`data-sub-action="paid" data-sub-id="${escapeHTML(item.id)}"`}>${item.kind==='debt'?'Pay':'Review'}</button></div></article>`).join('')||'<p class="subscription-empty">Nothing due within seven days.</p>';
  }
  function openUpcoming() {
    if(isAppLocked())return;
    renderUpcoming();openModalHelper('upcomingPaymentsModal');
  }
  function openEditor(id,seed={}) {
    if(isAppLocked())return;
    const existing=find(id),sub=existing||{name:'',amount:'',method:'bank',account:state.accounts.find(a=>!a.hidden)?.id||'',category:defaultCategory(),frequency:'monthly',nextDueDate:getCurrentDateString(),icon:'letter',serviceId:'',...seed};
    const expected=existing?fingerprint(existing):null;
    const options=state.accounts.filter(a=>!a.hidden||a.id===sub.account).map(a=>`<option value="${escapeHTML(a.id)}"${a.id===sub.account?' selected':''}>${escapeHTML(a.name)}</option>`).join('');
    const selectedService=SubscriptionServices.get(sub.serviceId);
    openFormModal(existing?'Edit Subscription':'Add Subscription',`
      <div class="subscription-editor">
      <label class="subscription-field">Subscription Name<input type="text" id="subName" name="name" value="${escapeHTML(sub.name)}" placeholder="e.g., Spotify or Gym Membership" autocomplete="off" maxlength="160" required></label>
      <input type="hidden" id="subServiceId" name="serviceId" value="${escapeHTML(sub.serviceId)}">
      <div id="subBrandArea" class="subscription-brand-area"><div id="subServiceChoice" class="subscription-service-choice"><span id="subIconPreview">${SubscriptionServices.icon(sub)}</span><span id="subServiceLabel"${selectedService?'':' hidden'}>${escapeHTML(selectedService?.name||'')}</span>
      <select name="icon" id="subIcon" aria-label="Subscription Icon"${selectedService?' hidden':''}>${sub.icon&&!Object.hasOwn(SubscriptionServices.generics,sub.icon)?`<option value="${escapeHTML(sub.icon)}" selected>Custom Icon</option>`:''}${Object.entries(SubscriptionServices.generics).map(([key,[name]])=>`<option value="${key}"${key===sub.icon?' selected':''}>${name}</option>`).join('')}</select></div>
      <div id="subServiceResults" class="subscription-service-results" role="region" aria-label="Service suggestions" hidden></div></div>
      <div class="subscription-form-grid"><label class="subscription-field">Amount (LKR)<div class="relative flex items-center w-full"><input class="calc-amount pr-8" type="text" inputmode="decimal" name="amount" value="${escapeHTML(String(sub.amount))}" required><button type="button" class="calc-toggle-btn absolute right-2" aria-label="Toggle Calculator"><i class="fas fa-calculator" aria-hidden="true"></i></button></div></label>
      <label class="subscription-field">Frequency<select name="frequency">${Object.entries(frequencies).map(([key,label])=>`<option value="${key}"${sub.frequency===key?' selected':''}>${label}</option>`).join('')}</select></label></div>
      <label class="subscription-field">Last Paid / Next Due Date<input type="date" id="subDate" name="nextDueDate" value="${escapeHTML(sub.nextDueDate)}" required><small id="subNextDatePreview" class="subscription-date-preview" hidden></small></label>
      <label class="subscription-field">Payment Method<select name="method" id="subMethod"><option value="bank">Bank / Cash</option><option value="cc"${sub.method==='cc'?' selected':''}>Credit Card</option></select></label>
      <label class="subscription-field" id="subAccountGroup">Account<select name="account" id="subAccount">${options}</select></label>
      <label class="subscription-field">Category<select name="category" id="subCategory">${categoryOptions(sub.category,sub.method==='cc')}</select></label>
      <button class="btn btn-primary w-full" type="submit"><i class="fas fa-save" aria-hidden="true"></i> Save Subscription</button></div>`,async event=>{
        event.preventDefault();await perform(async()=>{
          const form=new FormData(event.target),values=Object.fromEntries(['name','amount','frequency','nextDueDate','method','account','category','serviceId','icon'].map(key=>[key,form.get(key)]));
          if(values.nextDueDate===sub.nextDueDate)values.anchorDay=sub.anchorDay;
          await saveDefinition(values,id,expected);closeModal('formModal');openManager();showNotification('Subscription saved.','success');
        });
      });
    const name=document.getElementById('subName'),results=document.getElementById('subServiceResults');
    const matchMarkup=query=>SubscriptionServices.search(query).map(service=>`<button type="button" class="subscription-service-option" data-service-id="${service.id}">${SubscriptionServices.icon({name:service.name,serviceId:service.id})}<span>${escapeHTML(service.name)}</span></button>`).join('')+'<button type="button" class="subscription-service-option" data-service-id=""><i class="fas fa-font" aria-hidden="true"></i><span>Use a Custom Icon</span></button>';
    const drawSuggestions=()=>{
      if(SubscriptionServices.match(name.value)||!SubscriptionServices.search(name.value).length){results.hidden=true;return;}
      results.hidden=false;
      results.innerHTML=matchMarkup(name.value);
    };
    const showServiceChoice=()=>{
      const serviceId=document.getElementById('subServiceId').value,service=SubscriptionServices.get(serviceId);
      const icon=document.getElementById('subIcon');icon.hidden=!!service;
      const label=document.getElementById('subServiceLabel');label.hidden=!service;label.textContent=service?.name||'';
      document.getElementById('subIconPreview').innerHTML=SubscriptionServices.icon({name:name.value,serviceId:serviceId||'custom',icon:icon.value});
    };
    name.oninput=()=>{
      const service=SubscriptionServices.match(name.value);
      document.getElementById('subServiceId').value=service?.id||'';
      showServiceChoice();
      drawSuggestions();
    };
    results.onclick=event=>{
      const button=event.target.closest('[data-service-id]');if(!button)return;
      const service=SubscriptionServices.services.find(row=>row.id===button.dataset.serviceId);
      document.getElementById('subServiceId').value=service?.id||'custom';
      // Choosing artwork must preserve personal labels such as Work ChatGPT.
      if(service && SubscriptionServices.match(name.value)?.id!==service.id)name.value=service.name;
      results.hidden=true;
      showServiceChoice();
    };
    const updateMethod=()=>{
      const cc=document.getElementById('subMethod').value==='cc';
      document.getElementById('subAccountGroup').hidden=cc;document.getElementById('subAccount').required=!cc;
      document.getElementById('subCategory').required=!cc;
      if(document.getElementById('subCategory').options?.[0])document.getElementById('subCategory').options[0].disabled=!cc;
    };
    document.getElementById('subMethod').onchange=updateMethod;updateMethod();
    document.getElementById('subIcon').onchange=()=>{document.getElementById('subServiceId').value='custom';results.hidden=true;showServiceChoice();};
    const updateDatePreview=()=>{
      const date=document.getElementById('subDate').value,frequency=document.querySelector('#dynamicForm [name="frequency"]').value,preview=document.getElementById('subNextDatePreview');
      const keepOverdue=existing&&date===existing.nextDueDate&&frequency===existing.frequency;
      preview.hidden=!validDate(date)||date>=getCurrentDateString()||keepOverdue;
      if(!preview.hidden)preview.textContent=`Next renewal: ${formatDate(firstUpcomingDate(date,frequency,date===sub.nextDueDate?sub.anchorDay||Number(date.slice(8)):Number(date.slice(8))))}`;
    };
    document.getElementById('subDate').onchange=updateDatePreview;
    document.querySelector('#dynamicForm [name="frequency"]').onchange=updateDatePreview;updateDatePreview();
  }
  function fromTransaction(kind,id) {
    if(isAppLocked())return;
    const transaction=(kind==='cc'?state.creditCard.transactions:state.transactions).find(row=>row.id===id);
    if(!transaction || (kind!=='cc'&&transaction.type!=='expense'))return;
    const anchorDay=Number(transaction.date.slice(8));
    openEditor(undefined,{name:transaction.description,amount:transaction.amount,method:kind==='cc'?'cc':'bank',account:transaction.account||'',category:getCcPurchaseCategory(transaction),
      nextDueDate:nextDate({nextDueDate:transaction.date,frequency:'monthly',anchorDay}),anchorDay,serviceId:SubscriptionServices.match(transaction.description)?.id||''});
  }
  function openPayment(id) {
    if(isAppLocked())return;
    const sub=find(id);if(!sub||sub.status!=='active')return;
    const expected=fingerprint(sub),due=sub.nextDueDate;
    const candidates=(sub.method==='cc'?state.creditCard.transactions:state.transactions.filter(t=>t.type==='expense'&&t.account===sub.account))
      .filter(t=>!t.subscriptionOccurrenceId&&!occurrences().some(o=>o.transactionId===t.id&&o.kind===sub.method)).slice().sort((a,b)=>b.date.localeCompare(a.date));
    let visibleCount=5;
    openFormModal(sub.method==='cc'?'Record Subscription Charge':'Record Subscription Payment',`
      <p class="subscription-payment-heading">${SubscriptionServices.icon(sub)}<span>${escapeHTML(sub.name)}<small>Renewal: ${escapeHTML(formatDate(due))}</small></span></p>
      <label class="subscription-field">Entry<select id="subPaymentMode" name="mode"><option value="new">${sub.method==='cc'?'Add CC Charge':'Add Expense'}</option><option value="existing">Already Recorded</option></select></label>
      <div id="subRecordedFields" class="subscription-recorded-fields" hidden><label class="subscription-field">Find ${sub.method==='cc'?'CC Charge':'Expense'}<input type="search" id="subRecordedSearch" placeholder="Search description, date or amount" autocomplete="off"></label><fieldset id="subRecordedList" class="subscription-recorded-list"><legend class="sr-only">Choose a recorded entry</legend></fieldset><button type="button" class="btn btn-secondary w-full" id="subRecordedMore" hidden>Show More</button></div>
      <div id="subNewPaymentFields" class="subscription-fields">
      <label class="subscription-field">Amount (LKR)<div class="relative flex items-center w-full"><input class="calc-amount pr-8" type="text" inputmode="decimal" name="amount" value="${sub.amount.toFixed(2)}" required><button type="button" class="calc-toggle-btn absolute right-2" aria-label="Toggle Calculator"><i class="fas fa-calculator" aria-hidden="true"></i></button></div></label>
      ${sub.method==='bank'?`<label class="subscription-field">Account<select name="account" required>${state.accounts.filter(a=>!a.hidden).map(a=>`<option value="${escapeHTML(a.id)}"${a.id===sub.account?' selected':''}>${escapeHTML(a.name)} (${formatCurrency(a.balance)})</option>`).join('')}</select></label>`:''}
      <label class="subscription-field">Category${sub.method==='cc'?' (Optional)':''}<select name="category" id="subPaymentCategory" ${sub.method==='bank'?'required':''}>${categoryOptions(paymentCategory(sub),sub.method==='cc')}</select></label>
      <label class="subscription-field">Payment Date<input type="date" name="date" value="${getCurrentDateString()}" required></label>
      </div>${sub.method==='cc'?'<p id="subCardPaymentNote" class="subscription-payment-note">Added to your card balance. Settle it later in View &amp; Pay.</p>':''}<button type="submit" id="subPaymentSubmit" class="btn btn-primary w-full">${sub.method==='cc'?'Add CC Charge':'Add Expense'}</button>`,async event=>{
        event.preventDefault();await perform(async()=>{
          const form=new FormData(event.target);
          const linking=form.get('mode')==='existing';
          if(linking&&!form.get('link'))throw new Error('Choose the entry you already recorded.');
          await record(id,due,{link:linking?form.get('link'):'',amount:form.get('amount'),account:form.get('account'),category:form.get('category'),date:form.get('date')},expected);
          closeModal('formModal');
          render();
          refreshMonthlyViewIfRelevant(getCurrentDateString());showNotification(linking?'Recorded entry linked.':sub.method==='cc'?'Subscription charge recorded.':'Subscription payment recorded.','success');
        });
      });
    const renderRecorded=()=>{
      const host=document.getElementById('subRecordedList'),selected=host.querySelector('input:checked')?.value;
      const query=document.getElementById('subRecordedSearch').value.trim().toLowerCase();
      const matches=candidates.filter(t=>`${t.description} ${t.date} ${formatDate(t.date)} ${t.amount} ${t.amount.toFixed(2)} ${formatCurrency(t.amount)}`.toLowerCase().includes(query));
      host.innerHTML='<legend class="sr-only">Choose a recorded entry</legend>'+matches.slice(0,visibleCount).map(t=>`<label class="subscription-recorded-option"><input type="radio" name="link" value="${escapeHTML(t.id)}"${t.id===selected?' checked':''}><span><strong>${escapeHTML(t.description)}</strong><small>${escapeHTML(formatDate(t.date))} · ${formatCurrency(t.amount)}</small></span></label>`).join('')+(matches.length?'':'<p class="subscription-payment-note">No matching recorded entries.</p>');
      const existing=document.getElementById('subPaymentMode').value==='existing';
      host.querySelectorAll('input').forEach(input=>{input.disabled=!existing;});
      document.getElementById('subRecordedMore').hidden=matches.length<=visibleCount;
    };
    document.getElementById('subRecordedSearch').oninput=()=>{visibleCount=5;renderRecorded();};
    document.getElementById('subRecordedMore').onclick=()=>{visibleCount+=5;renderRecorded();};
    document.getElementById('subPaymentMode').onchange=event=>{
      const linked=event.target.value==='existing',fields=document.getElementById('subNewPaymentFields');fields.hidden=linked;
      fields.querySelectorAll('input,select').forEach(input=>{input.disabled=linked;});
      document.getElementById('subRecordedFields').hidden=!linked;
      document.getElementById('subPaymentSubmit').textContent=linked?'Link Recorded Entry':sub.method==='cc'?'Add CC Charge':'Add Expense';
      const note=document.getElementById('subCardPaymentNote');if(note)note.hidden=linked;
      renderRecorded();
    };
    renderRecorded();
  }
  function openOptions(id) {
    if(isAppLocked())return;
    const sub=find(id);if(!sub)return;
    const expected=fingerprint(sub),due=sub.nextDueDate;
    openFormModal('Manage Subscription',`<p class="subscription-payment-heading">${SubscriptionServices.icon(sub)}<span>${escapeHTML(sub.name)}</span></p><div class="subscription-option-list">
      <button type="button" class="btn btn-secondary" id="subEdit">Edit Subscription</button>
      ${sub.status==='active'?'<button type="button" class="btn btn-secondary" id="subSkip">Skip Next Renewal</button><button type="button" class="btn btn-secondary" id="subPause">Pause Subscription</button>':'<button type="button" class="btn btn-primary" id="subResume">Resume Subscription</button>'}
      <button type="button" class="btn btn-secondary text-expense" id="subDelete">Delete Subscription</button></div>`,event=>event.preventDefault());
    document.getElementById('subEdit').onclick=()=>openEditor(id);
    const bind=(element,action)=>{const button=document.getElementById(element);if(button)button.onclick=()=>perform(async()=>{await action();closeModal('formModal');render();});};
    const confirmAction=(title,message,action)=>showConfirmationModal(title,message,'Confirm','Cancel',()=>perform(async()=>{await action();closeModal('formModal');render();}));
    const skip=document.getElementById('subSkip');if(skip)skip.onclick=()=>confirmAction('Skip Next Renewal?',`Skip ${escapeHTML(formatDate(due))} without recording a payment?`,()=>resolve(id,due,'skip',expected));
    bind('subPause',()=>setStatus(id,'paused',expected));bind('subResume',()=>setStatus(id,'active',expected));
    document.getElementById('subDelete').onclick=()=>confirmAction('Delete Subscription?',`Delete ${escapeHTML(sub.name)} and stop its reminders? Past transactions will be kept.`,()=>deleteDefinition(id,expected));
  }
  async function perform(action) {
    try {if(isAppLocked())return;await action();}
    catch(error){if(!error.kaasiSaveFailure)showNotification(error.message||'The subscription could not be updated.','error');}
  }
  const dueSubscriptions=()=>list().filter(sub=>sub.status==='active'&&daysUntil(sub.nextDueDate)<=0&&!(occurrence(sub.id,sub.nextDueDate)?.snoozedUntil>Date.now()));
  function renderReminder(due=dueSubscriptions()) {
    document.getElementById('subscriptionReminderList').innerHTML=due.map(sub=>`<article class="subscription-row">${SubscriptionServices.icon(sub)}<div class="subscription-row-copy"><strong>${escapeHTML(sub.name)}</strong><span>${escapeHTML(dueLabel(sub.nextDueDate))}</span><small>${formatCurrency(sub.amount)}</small></div><div class="subscription-row-actions subscription-reminder-actions"><button class="btn btn-primary" data-sub-action="paid" data-sub-id="${escapeHTML(sub.id)}">${sub.method==='cc'?'Charged':'Paid'}</button><button class="btn btn-secondary" data-sub-action="snooze" data-sub-id="${escapeHTML(sub.id)}">Remind Me Later</button><button class="btn btn-secondary" data-sub-action="manage" data-sub-id="${escapeHTML(sub.id)}" aria-label="Manage ${escapeHTML(sub.name)}"><i class="fas fa-ellipsis-h" aria-hidden="true"></i></button></div></article>`).join('')||'<p class="subscription-empty">All caught up for now.</p>';
  }
  async function reminder() {
    if(isAppLocked()||!state.settings?.initialSetupDone||document.visibilityState==='hidden'||busy||storageOperationPending)return;
    if([...document.querySelectorAll('.modal')].some(modal=>getComputedStyle(modal).display!=='none'))return;
    if(document.activeElement?.matches?.('input,select,textarea'))return;
    let seen;
    try{seen=JSON.parse(appPreferences.getItem('kaasi_subscription_prompt_seen'));}catch(_){/* Older prompt marker. */}
    const today=getCurrentDateString(),tokens=new Set(seen?.date===today&&Array.isArray(seen.tokens)?seen.tokens:[]);
    const token=sub=>`${occurrenceId(sub.id,sub.nextDueDate)}:${occurrence(sub.id,sub.nextDueDate)?.snoozedUntil||0}`;
    const due=dueSubscriptions().filter(sub=>!tokens.has(token(sub)));
    if(!due.length)return;
    const previous=appPreferences.getItem('kaasi_subscription_prompt_seen');
    due.forEach(sub=>tokens.add(token(sub)));
    appPreferences.setItem('kaasi_subscription_prompt_seen',JSON.stringify({date:today,tokens:[...tokens]}));await appPreferences.flush();
    if(isAppLocked()||[...document.querySelectorAll('.modal')].some(modal=>getComputedStyle(modal).display!=='none')||document.activeElement?.matches?.('input,select,textarea')){
      if(previous)appPreferences.setItem('kaasi_subscription_prompt_seen',previous);else appPreferences.removeItem('kaasi_subscription_prompt_seen');return;
    }
    renderReminder(dueSubscriptions());
    openModalHelper('subscriptionReminderModal');
  }
  function scheduleReminder() {
    clearTimeout(reminderTimer);reminderTimer=setTimeout(()=>perform(reminder),1800);
  }
  document.addEventListener('click',event=>{
    const results=document.getElementById('subServiceResults');
    if(results && event.target.id!=='subName' && !event.target.closest('#subBrandArea'))results.hidden=true;
    const button=event.target.closest('[data-sub-action]');if(!button||isAppLocked())return;
    event.preventDefault();
    const action=button.dataset.subAction,id=button.dataset.subId;
    if(action==='snooze'){const sub=find(id);if(sub)perform(()=>resolve(id,sub.nextDueDate,'snooze',fingerprint(sub)));return;}
    if(action==='open')openManager();else if(action==='add')openEditor();else if(action==='paid')openPayment(id);else if(action==='manage')openOptions(id);else if(action==='upcoming')openUpcoming();else if(action==='from-expense')fromTransaction('bank',id);else if(action==='from-cc')fromTransaction('cc',id);
  });
  window.addEventListener('focus',()=>{renderNotice();scheduleReminder();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){renderNotice();scheduleReminder();}});
  // Recalculate calendar-day boundaries while the app stays open; never auto-charge.
  window.setInterval?.(()=>{if(document.visibilityState==='visible'&&!isAppLocked()){renderNotice();scheduleReminder();}},60000);
  return {validDate,nextDate,firstUpcomingDate,occurrenceId,upcoming,saveDefinition,record,resolve,setStatus,deleteDefinition,render,renderNotice,openManager,openEditor,openPayment,scheduleReminder,
    onSearch:value=>{search=value;render();},onFilter:value=>{filter=value;render();}};
})();
