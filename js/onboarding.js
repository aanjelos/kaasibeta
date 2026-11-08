/* First-run setup and replayable, data-free tutorial. No draft is persisted. */
const Onboarding = (() => {
  const steps = ['welcome', 'accounts', 'card', 'categories', 'finish'];
  const lessons = [
    { icon: 'receipt', title: 'Record a transaction', body: 'Try an expense, income or transfer. Transfers move money between your own accounts, including ATM withdrawals and cash deposits.', practice: 'transaction' },
    { icon: 'calculator', title: 'Calculate in the amount field', body: 'Tap the calculator icon, enter a calculation and press =. You can also type an expression and press Enter or Tab.', calculator: true },
    { icon: 'calendar-alt', title: 'Look back at your money', body: 'Open All Transactions to move between months, search, and see the details behind each entry.' },
    { icon: 'hand-holding-usd', title: 'Keep track of what is owed', body: 'I Owe is for money you need to pay back. Owes Me is for money someone needs to return to you.' },
    { icon: 'compass', title: 'Explore when you are ready', body: 'Set budgets, track installments and subscriptions, or add a PIN in Settings. Milestones show what you have yet to discover. Your data stays on this device until you export or connect cloud sync.' }
  ];
  let step = 0, lesson = 0, draft = null, saving = false, tutorialFromSetup = false, returning = false, pendingCloudSetup = false, welcomeAnimated = false;
  const $o = id => document.getElementById(id);
  const modal = () => $o('initialSetupModal');
  const shell = () => modal().querySelector('.modal-content');
  const safe = value => escapeHTML(String(value ?? ''));
  function hasSavedRecords(data) {
    const defaults = getDefaultState();
    const legacyCategories = defaults.categories.filter(category => !['Housing & Utilities', 'Phone & Internet'].includes(category));
    const hasDefaultCategories = [defaults.categories, legacyCategories].some(categories =>
      data.categories?.length === categories.length && data.categories.every(category => categories.includes(category)));
    return ['transactions','debts','receivables','installments','budgets','subscriptions'].some(key => data[key]?.length) ||
      data.creditCard?.transactions?.length || data.accounts?.some((account, index) =>
        account.id !== defaults.accounts[index]?.id || Number(account.balance) !== 0 ||
        (account.name !== defaults.accounts[index]?.name && !(account.id === 'bank_3' && account.name === 'Genie')) || !!account.hidden) ||
      Number(data.creditCard?.limit) > 0 || data.settings?.appPin?.enabled || data.hiddenCategories?.length ||
      !hasDefaultCategories;
  }
  function freshDraft() {
    const base = getDefaultState();
    return { accounts: structuredClone(base.accounts), categories: [...base.categories].sort(compareCategoryNames), ccEnabled: false, limit: '', unpaid: '', pinEnabled: false, pin: '', pinConfirm: '', question: '', answer: '', connectCloud: false };
  }
  function header(title, detail, current = step, count = steps.length) {
    return `<header class="onboard-heading"><img src="img/LogoType.svg" alt="Kaasi" class="onboard-logo"><span class="onboard-counter">${current + 1} of ${count}</span></header><div class="onboard-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${count}" aria-valuenow="${current + 1}" aria-label="Setup progress"><span style="width:${(current + 1) / count * 100}%"></span></div><div class="onboard-title"><h1>${title}</h1><p>${detail}</p></div>`;
  }
  function choice(icon, title, description, action) {
    return `<button type="button" class="onboard-choice" data-action="${action}"><span class="onboard-choice-icon"><i class="fas fa-${icon}" aria-hidden="true"></i></span><span><strong>${title}</strong><small>${description}</small></span><i class="fas fa-chevron-right onboard-chevron" aria-hidden="true"></i></button>`;
  }
  function input(label, id, value = '', placeholder = '', extra = '') {
    return `<label class="onboard-field"><span>${label}</span><input id="${id}" value="${safe(value)}" placeholder="${placeholder}" ${extra}></label>`;
  }
  function render(animate = false) {
    if (!draft) draft = freshDraft();
    const current = steps[step];
    let content = '';
    if (current === 'welcome') {
      content = returning
        ? `<div class="onboard-welcome"><img class="onboard-mark" src="img/LogoIcon.svg" alt="Kaasi"><span class="onboard-eyebrow">WELCOME BACK</span><h1>Bring your data back.</h1><p>Choose where you saved your Kaasi backup.</p><div class="onboard-return-actions"><button type="button" class="btn btn-secondary" data-action="file"><i class="fas fa-file-import" aria-hidden="true"></i> Import Local File</button><button type="button" class="btn btn-primary" id="setupCloudLoginBtn" data-action="signin"><i class="fab fa-google" aria-hidden="true"></i> Sign In to Restore</button><button type="button" class="btn btn-primary" id="setupCloudSyncBtn" data-action="cloud" hidden><i class="fas fa-cloud-download-alt" aria-hidden="true"></i> Restore From Cloud</button></div><button type="button" class="onboard-text-back" data-action="welcome-back"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button><input type="file" id="setupImportInput" accept=".json,application/json" hidden></div>`
        : `<div class="onboard-welcome ${welcomeAnimated ? '' : 'is-first-visit'}"><img class="onboard-mark" src="img/LogoIcon.svg" alt="Kaasi"><span class="onboard-eyebrow">YOUR MONEY, YOUR WAY</span><h1>Welcome to Kaasi.</h1><p>A clearer picture of your money starts here.</p><div class="onboard-choices">${choice('plus','I’m new to Kaasi','Set up your own space.','new')}${choice('cloud-download-alt','I already have data','Bring back an existing backup.','return')}</div></div>`;
    } else if (current === 'accounts') {
      content = header('Set up your accounts', 'Enter starting balances. Cash keeps its name; you can rename or hide a bank account later.') +
        `<div class="onboard-account-grid">${draft.accounts.map((a,i) => `<div class="onboard-account-card ${a.hidden ? 'muted' : ''}" data-account="${i}"><div class="onboard-account-top"><span class="onboard-account-icon"><i class="fas fa-${i ? 'university' : 'wallet'}" aria-hidden="true"></i></span><span>${i ? `Bank account ${i}` : 'Cash account'}</span>${i ? `<button type="button" class="onboard-visibility" data-action="visibility" data-index="${i}" aria-label="${a.hidden ? 'Show' : 'Hide'} ${safe(a.name)}" aria-pressed="${a.hidden}"><i class="fas fa-eye${a.hidden ? '-slash' : ''}" aria-hidden="true"></i></button>` : ''}</div><div class="onboard-account-fields">${i ? input('Account name',`onboardName${i}`,a.name,'Account name','maxlength="60"') : `<div class="onboard-field"><span>Account name</span><strong>Cash</strong></div>`}${input('Starting balance (LKR)',`onboardBalance${i}`,a.balance || '','0.00','inputmode="decimal" autocomplete="off"')}</div></div>`).join('')}</div>`;
    } else if (current === 'card') {
      content = header('Do you use a credit card?', 'Track card purchases and payments separately.') +
        `<label class="onboard-switch-row"><span><strong>Track a credit card</strong><small>You can turn this on later in Settings.</small></span><input type="checkbox" id="onboardCcEnabled" ${draft.ccEnabled ? 'checked' : ''}><span class="onboard-switch" aria-hidden="true"></span></label><div id="onboardCcFields" ${draft.ccEnabled ? '' : 'hidden'} class="onboard-card-fields">${input('Credit limit (LKR)','onboardCcLimit',draft.limit,'e.g. 100,000','inputmode="decimal" autocomplete="off"')}${input('Amount you still owe (LKR) · optional','onboardCcUnpaid',draft.unpaid,'0.00','inputmode="decimal" autocomplete="off"')}<p class="onboard-hint">Enter card purchases you have not paid off yet. Leave this at zero if your card is fully paid. This will not change your bank balance.</p></div>`;
    } else if (current === 'categories') {
      content = header('Choose your categories', 'Keep the ones you use. You can add or change categories later in Settings.') +
        `<div class="onboard-category-add"><label class="onboard-field"><span>New category</span><input id="onboardNewCategory" placeholder="e.g. Pet care" maxlength="60"></label><button type="button" class="btn btn-secondary" data-action="add-category">Add</button></div><div class="onboard-category-list">${draft.categories.slice().sort(compareCategoryNames).map(cat => `<div class="onboard-category"><span>${safe(cat)}</span>${['other','bank charges'].includes(cat.toLowerCase()) ? '<span class="onboard-hint">Always available</span>' : `<button type="button" data-action="remove-category" data-category="${safe(cat)}" aria-label="Remove ${safe(cat)}"><i class="fas fa-times" aria-hidden="true"></i></button>`}</div>`).join('')}</div>`;
    } else {
      content = header('Ready to start', 'Your accounts and categories will be saved together when you finish.') +
        `<div class="onboard-summary"><strong>Local data comes first</strong><p>Kaasi saves changes on this device. Export a local backup anytime from Data & Backups.</p></div><label class="onboard-switch-row"><span><strong>Add a PIN</strong><small>Optional. You can set one later in Settings.</small></span><input type="checkbox" id="onboardPinEnabled" ${draft.pinEnabled ? 'checked' : ''}><span class="onboard-switch" aria-hidden="true"></span></label><div id="onboardPinFields" ${draft.pinEnabled ? '' : 'hidden'} class="onboard-pin-fields">${input('4-digit PIN','onboardPin',draft.pin,'••••','inputmode="numeric" maxlength="4" type="password" autocomplete="new-password"')}${input('Confirm PIN','onboardPinConfirm',draft.pinConfirm,'••••','inputmode="numeric" maxlength="4" type="password" autocomplete="new-password"')}<label class="onboard-field"><span>Recovery question</span><select id="onboardQuestion"><option value="">Choose a question</option><option>What was the name of your first pet?</option><option>What city were you born in?</option><option>What was your childhood nickname?</option><option>What is the name of your favorite teacher?</option></select></label>${input('Answer','onboardAnswer',draft.answer,'Your answer','autocomplete="off"')}</div><label class="onboard-switch-row onboard-cloud-choice"><span><strong>Connect cloud sync</strong><small>After the tour, open Data & Backups to sign in. Once connected, Kaasi syncs automatically when you’re online.</small></span><input type="checkbox" id="onboardConnectCloud" ${draft.connectCloud ? 'checked' : ''}><span class="onboard-switch" aria-hidden="true"></span></label>`;
    }
    shell().innerHTML = `<div class="onboard-layout"><main class="onboard-main"><div class="onboard-panel ${current === 'welcome' ? 'onboard-panel-welcome' : ''}" id="onboardPanel">${current !== 'welcome' ? `<div class="onboard-step-brand"><img src="img/LogoType.svg" alt="Kaasi"><span>Earn well. Spend responsibly.</span></div>` : ''}${content}${step ? `<nav class="onboard-footer"><button type="button" class="btn btn-secondary" data-action="back">Back</button><button type="button" class="btn btn-primary" data-action="${step === steps.length-1 ? 'save' : 'next'}">${step === steps.length-1 ? 'Finish Setup' : 'Continue'} <i class="fas fa-arrow-right" aria-hidden="true"></i></button></nav>` : ''}</div></main></div>`;
    if (current === 'welcome') { welcomeAnimated = true; if(returning){ $o('setupCloudSyncBtn').hidden = !supabaseUser; $o('setupCloudLoginBtn').hidden = !!supabaseUser; $o('setupImportInput').addEventListener('change', handleImport); } }
    if (current === 'finish') $o('onboardQuestion').value = draft.question;
    if (animate) shell().querySelector('.onboard-panel').classList.add('is-entering');
    shell().querySelector('.onboard-main').scrollTop = 0;
    shell().focus({preventScroll:true});
  }
  function collect() {
    if (!draft) return;
    if (steps[step] === 'accounts') draft.accounts.forEach((a,i) => {
      if (i) a.name = $o(`onboardName${i}`)?.value.trim() || a.name;
      a.balance = $o(`onboardBalance${i}`)?.value.trim() || '';
    });
    if (steps[step] === 'card') { draft.ccEnabled = $o('onboardCcEnabled').checked; draft.limit = $o('onboardCcLimit')?.value || ''; draft.unpaid = $o('onboardCcUnpaid')?.value || ''; }
    if (steps[step] === 'finish') { draft.pinEnabled = $o('onboardPinEnabled').checked; draft.pin = $o('onboardPin')?.value || ''; draft.pinConfirm = $o('onboardPinConfirm')?.value || ''; draft.question = $o('onboardQuestion')?.value || ''; draft.answer = $o('onboardAnswer')?.value || ''; draft.connectCloud = $o('onboardConnectCloud').checked; }
  }
  function validAmount(value, label, allowZero = true) {
    if (!String(value).trim()) return 0;
    const raw = String(value).trim();
    const amount = Number(raw.replaceAll(',', ''));
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(raw)) throw new Error(`Enter a valid ${label} with up to two decimal places.`);
    if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0) || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) throw new Error(`Enter a valid ${label} with up to two decimal places.`);
    return roundToTwoDecimals(amount);
  }
  function validateCurrent() {
    try {
      if (steps[step] === 'accounts') {
        for (const a of draft.accounts) validAmount(a.balance,'starting balance');
        const names = draft.accounts.map(a => a.name.trim().toLowerCase());
        if (names.some(name => !name) || new Set(names).size !== names.length) throw new Error('Give each account a different name.');
      }
      if (steps[step] === 'card' && draft.ccEnabled) {
        const limit = validAmount(draft.limit,'credit limit');
        const unpaid = validAmount(draft.unpaid,'unpaid balance');
        if (unpaid && (!limit || unpaid > limit)) throw new Error('The outstanding balance must fit within the credit limit.');
      }
      if (steps[step] === 'finish' && draft.pinEnabled) {
        if (!/^\d{4}$/.test(draft.pin)) throw new Error('Your PIN must have four digits.');
        if (draft.pin !== draft.pinConfirm) throw new Error('The PINs do not match.');
        if (!draft.question || !draft.answer.trim()) throw new Error('Choose a recovery question and enter an answer.');
      }
      return true;
    } catch(error) { showNotification(error.message,'error'); return false; }
  }
  async function finish() {
    if (saving || !validateCurrent()) return;
    if (state.settings?.initialSetupDone || hasSavedRecords(state)) { showNotification('Saved data is already on this device. Setup was not applied.','error'); return; }
    saving = true;
    const button = shell().querySelector('[data-action="save"]');
    if (button) { button.disabled = true; button.textContent = 'Saving…'; }
    try {
      const candidate = getDefaultState();
      candidate.accounts = draft.accounts.map((a,i) => ({ id:a.id, name:i ? a.name.trim() : 'Cash', balance:validAmount(a.balance,'starting balance'), hidden:i ? !!a.hidden : false }));
      candidate.categories = draft.categories.slice().sort(compareCategoryNames);
      candidate.settings.showCcDashboardSection = draft.ccEnabled;
      candidate.creditCard.limit = draft.ccEnabled ? validAmount(draft.limit,'credit limit') : 0;
      const unpaid = draft.ccEnabled ? validAmount(draft.unpaid,'unpaid balance') : 0;
      if (unpaid) candidate.creditCard.transactions.push({ id:generateId(), amount:unpaid, description:'Starting unpaid balance', date:getCurrentDateString(), paidAmount:0, paidOff:false, timestamp:Date.now() });
      if (draft.pinEnabled) candidate.settings.appPin = { enabled:true, pin:await hashString(draft.pin), question:draft.question, answer:await hashString(draft.answer.trim().toLowerCase()) };
      candidate.settings.initialSetupDone = true;
      const before = state;
      try { await saveData(candidate,{skipMilestones:true}); }
      catch(error) { state = before; throw error; }
      trackFeatureEvent('setup_completed');
      if (typeof Milestones !== 'undefined') Milestones.baseline(state);
      initializeUI(true);
      pendingCloudSetup = draft.connectCloud;
      tutorialFromSetup = true;
      lesson = -1;
      renderTutorial();
    } catch(error) { if (!error.kaasiSaveFailure) showNotification(`Setup could not be saved: ${error.message}`,'error'); if (button) {button.disabled=false;button.textContent='Finish Setup';} }
    finally { saving = false; }
  }
  async function handleImport(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      await applyImportedData(imported,KaasiStorage.revision);
      closeModal('initialSetupModal');
      showNotification('Backup restored. Automatic sync is paused.','success');
    } catch(error) { showNotification(`Import failed: ${error.message}`,'error',10000); }
    finally { event.target.value = ''; }
  }
  function tutorialMarkup() {
    const item = lessons[lesson];
    if (lesson < 0) return header('Would you like a quick tour?', 'A few short examples to help you find your way. Nothing in the tour is saved.',0,lessons.length+1) + `<div class="onboard-tour-choice">${choice('play-circle','Show Me Around','A short guided tour with safe practice examples.','tour-start',true)}${choice('forward','I’ll Explore Myself','Open the dashboard now. You can replay this later in About & Support.','tour-close')}</div>`;
    const demoMonths = Array.from({length:3},(_,index)=>{ const date=new Date(); date.setDate(1); date.setMonth(date.getMonth()-index); return date.toLocaleString('en-US',{month:'long'}); });
    const accounts=state.accounts.filter(a=>!a.hidden);
    const amountField=`<label class="onboard-field"><span>Amount (LKR)</span><div class="onboard-amount"><input id="onboardCalc" class="calc-amount" inputmode="decimal" placeholder="e.g. 250.00"><button type="button" class="calc-toggle-btn" tabindex="-1" aria-label="Show calculator"><i class="fas fa-calculator"></i></button></div></label>`;
    const accountOptions=accounts.map(a=>`<option value="${safe(a.id)}">${safe(a.name)}</option>`).join('');
    const practice=item.calculator
      ? `<div class="onboard-practice onboard-calculator-practice">${amountField}<output id="onboardCalcResult" aria-live="polite"></output></div>`
      : `<div class="onboard-practice"><span>Practice only · Nothing here is saved</span><label class="onboard-field"><span>Type</span><select id="tourType"><option value="expense">Expense</option><option value="income">Income</option>${accounts.length>1?'<option value="transfer">Transfer</option>':''}</select></label>${amountField}<label class="onboard-field" id="tourFromLabel"><span>Account</span><select id="tourAccount">${accountOptions}</select></label><label class="onboard-field" id="tourToLabel" hidden><span>To Account</span><select id="tourToAccount">${accountOptions}</select></label><label class="onboard-field"><span>Description</span><input id="tourDescription" placeholder="e.g. Lunch"></label><label class="onboard-field" id="tourCategoryLabel"><span>Category</span><select id="tourCategory"><option value="">Select Category</option>${state.categories.slice().sort(compareCategoryNames).map(c=>`<option>${safe(c)}</option>`).join('')}</select></label><label class="onboard-field"><span>Date</span><input id="tourDate" type="date" value="${getCurrentDateString()}"></label><button type="button" class="btn btn-primary" data-action="practice-save">Try Adding Transaction</button><output id="onboardCalcResult" aria-live="polite"></output></div>`;
    const previews = {
      2: `<div class="onboard-demo"><div class="onboard-demo-title">All Transactions <small>Example only</small></div><div class="onboard-demo-tabs">${demoMonths.map((month,index)=>`<button type="button" class="${index===0?'selected':''}" data-demo="month" data-index="${index}">${month}</button>`).join('')}</div><label class="onboard-field"><span>Search this month</span><input id="onboardDemoSearch" placeholder="Search description or amount…"></label><div id="onboardDemoRows"><div class="onboard-demo-row expense" data-search="lunch"><span>Lunch<small>Cash · Food</small></span><strong>−LKR 500.00</strong></div><div class="onboard-demo-row income" data-search="salary"><span>Salary<small>Bank · Income</small></span><strong>+LKR 45,000.00</strong></div></div></div>`,
      3: '<div class="onboard-demo"><div class="onboard-demo-title">Debts & Receivables</div><div class="onboard-demo-tabs"><button type="button" class="selected" data-demo="owed" data-kind="debt">I Owe</button><button type="button" data-demo="owed" data-kind="receivable">Owes Me</button></div><div class="onboard-demo-row" id="onboardOwedRow"><span>Friend · Dinner<small>Money to pay back</small></span><strong>Pay</strong></div></div>',
      4: '<div class="onboard-demo"><div class="onboard-demo-title">More when you need it</div><div class="onboard-demo-row"><span>Budgets<small>Set monthly spending limits</small></span><i class="fas fa-chart-pie" aria-hidden="true"></i></div><div class="onboard-demo-row"><span>Subscriptions<small>Keep an eye on renewals</small></span><i class="fas fa-calendar-check" aria-hidden="true"></i></div><div class="onboard-demo-row"><span>Settings<small>Backups, PIN and appearance</small></span><i class="fas fa-cog" aria-hidden="true"></i></div></div>'
    };
    return header(item.title,item.body,lesson+1,lessons.length+1) + `<div class="onboard-lesson">${item.practice||item.calculator?practice:previews[lesson]}</div><nav class="onboard-footer"><button type="button" class="btn btn-secondary" data-action="tour-back">Back</button><button type="button" class="btn btn-primary" data-action="tour-next">${lesson === lessons.length-1 ? 'Finish Tour' : 'Next'} <i class="fas fa-arrow-right" aria-hidden="true"></i></button></nav><button type="button" class="onboard-skip" data-action="tour-close">Skip tour</button>`;
  }
  function renderTutorial() {
    const root = tutorialFromSetup ? shell() : $o('kaasiTutorialModal').querySelector('.modal-content');
    root.innerHTML = `<div class="onboard-layout"><main class="onboard-main"><div class="onboard-panel ${lesson >= 0 ? 'is-entering' : ''}"><div class="onboard-step-brand"><img src="img/LogoType.svg" alt="Kaasi"><span>Practice stays in the tour.</span></div>${tutorialMarkup()}</div></main></div>`;
    root.querySelector('.onboard-main').scrollTop=0;
    root.focus({preventScroll:true});
  }
  function updateTourType() {
    const type=$o('tourType')?.value;
    if (!type) return;
    $o('tourCategoryLabel').hidden=type!=='expense';
    $o('tourToLabel').hidden=type!=='transfer';
    $o('tourFromLabel').querySelector('span').textContent=type==='transfer'?'From Account':'Account';
    const to=$o('tourToAccount');
    if (to) [...to.options].forEach(option=>{option.disabled=option.value===$o('tourAccount').value;});
    if (type==='transfer' && to?.selectedOptions[0]?.disabled) to.selectedIndex=[...to.options].findIndex(option=>!option.disabled);
  }
  function closeTour(completed = false) {
    const id = tutorialFromSetup ? 'initialSetupModal' : 'kaasiTutorialModal';
    tutorialFromSetup = false; lesson = 0;
    const openCloud = pendingCloudSetup;
    pendingCloudSetup = false;
    // closeModal moves back through modal history; wait until that finishes
    // before opening Settings so its new history entry is not undone.
    if (openCloud && history.state?.modalOpen) {
      window.addEventListener('popstate', () => openCloudSyncSettings(), {once:true});
    }
    closeModal(id);
    if (completed) {
      trackFeatureEvent('tutorial_completed');
      showNotification('Tour complete. Welcome to Kaasi!','success');
    }
    if (openCloud && !history.state?.modalOpen) openCloudSyncSettings();
  }
  function onClick(event) {
    const target = event.target.closest('[data-action],[data-demo]'); if (!target) return;
    if (target.dataset.demo) {
      target.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('selected',b===target));
      if (target.dataset.demo === 'owed') {
        const row = $o('onboardOwedRow');
        row.innerHTML = target.dataset.kind === 'debt' ? '<span>Friend · Dinner<small>Money to pay back</small></span><strong>Pay</strong>' : '<span>Shared purchase<small>Money owed to you</small></span><strong>Receive</strong>';
      }
      if (target.dataset.demo === 'month') {
        const examples = [
          [['Lunch','Cash · Food','−LKR 500.00'],['Salary','Bank · Income','+LKR 45,000.00']],
          [['Groceries','Cash · Food','−LKR 1,200.00'],['Income','Bank · Income','+LKR 35,000.00']],
          [['Coffee','Cash · Food','−LKR 450.00'],['Refund','Bank · Income','+LKR 1,000.00']]
        ];
        $o('onboardDemoRows').innerHTML = examples[Number(target.dataset.index)].map(([name,detail,amount])=>`<div class="onboard-demo-row ${amount.startsWith('+') ? 'income' : 'expense'}" data-search="${name.toLowerCase()}"><span>${name}<small>${detail}</small></span><strong>${amount}</strong></div>`).join('');
        const query=$o('onboardDemoSearch').value.trim().toLowerCase();
        target.closest('.onboard-demo').querySelectorAll('[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(query);});
      }
      return;
    }
    const action = target.dataset.action;
    if (action === 'return') { returning=true; render(true); }
    else if (action === 'welcome-back') { returning=false; render(true); }
    else if (action === 'new') { if (hasSavedRecords(state)) return showNotification('This device already has saved data. Restore or protect it before starting again.','error'); step=1; render(true); }
    else if (action === 'back') { collect(); step=Math.max(0,step-1); render(true); }
    else if (action === 'next') { collect(); if (validateCurrent()) { step++; render(true); } }
    else if (action === 'save') { collect(); finish(); }
    else if (action === 'visibility') { collect(); const a=draft.accounts[Number(target.dataset.index)]; a.hidden=!a.hidden; render(); }
    else if (action === 'add-category') { const field=$o('onboardNewCategory'); const name=field.value.trim(); if (!name) return; if(draft.categories.some(c=>c.toLowerCase()===name.toLowerCase())) return showNotification('That category already exists.','info'); draft.categories.push(name);render(); }
    else if (action === 'remove-category') { if(['other','bank charges'].includes(target.dataset.category?.toLowerCase()))return; draft.categories=draft.categories.filter(c=>c!==target.dataset.category);render(); }
    else if (action === 'file') $o('setupImportInput').click();
    else if (action === 'signin') { appPreferences.setItem('onboardingCloudRestoreIntent','true'); signInWithGoogle(); }
    else if (action === 'cloud') manualCloudTransfer('cloud',{initialRestore:true});
    else if (action === 'tour-start') {lesson=0;renderTutorial();}
    else if (action === 'tour-close') closeTour(false);
    else if (action === 'tour-next') {if(lesson===lessons.length-1)closeTour(true);else {lesson++;renderTutorial();}}
    else if (action === 'tour-back') {lesson=Math.max(0,lesson-1);renderTutorial();}
    else if (action === 'practice-save') {
      const amount=$o('onboardCalc'); calculatePractice();
      const type=$o('tourType').value, feedback=$o('onboardCalcResult');
      if(!Number.isFinite(parseAmountValue(amount.value))||parseAmountValue(amount.value)<=0) feedback.textContent='Enter an amount to try this.';
      else if(type==='expense'&&!$o('tourCategory').value) feedback.textContent='Choose a category for this expense.';
      else if(!$o('tourDescription').value.trim()) feedback.textContent='Add a short description to try this.';
      else if(type==='transfer'&&$o('tourAccount').value===$o('tourToAccount').value) feedback.textContent='Choose two different accounts.';
      else feedback.textContent='Nice work! This practice entry was not saved.';
    }
  }
  function calculatePractice() { const field=$o('onboardCalc'); if(!field)return; const result=evaluateMathExpression(field.value); if(result!==null) { field.value=formatAmountInputResult(result,field.value); $o('onboardCalcResult').textContent=''; } }
  function open() {
    if (state?.settings?.initialSetupDone) return;
    if (modal().style.display !== 'block') { step=0; returning=false; draft=freshDraft(); welcomeAnimated=false; }
    const root=modal();
    if(!root.dataset.onboardingBound) {
      root.addEventListener('click',onClick);
      root.addEventListener('change',event=>{
        if(event.target.id==='onboardCcEnabled') {collect();$o('onboardCcFields').hidden=!draft.ccEnabled;}
        if(event.target.id==='onboardPinEnabled') {collect();$o('onboardPinFields').hidden=!draft.pinEnabled;}
        if(['tourType','tourAccount'].includes(event.target.id)) updateTourType();
      });
      root.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='onboardNewCategory'){event.preventDefault();root.querySelector('[data-action="add-category"]').click();}else if(event.target.id==='onboardCalc'&&['Tab','Enter','='].includes(event.key)){if(event.key!=='Tab')event.preventDefault();calculatePractice();}});
      root.addEventListener('input',event=>{if(event.target.id==='onboardDemoSearch'){const query=event.target.value.trim().toLowerCase();root.querySelectorAll('[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(query);});}});
      root.dataset.onboardingBound='true';
    }
    render();root.style.display='block';updateBodyScrollState();displayAppVersion();
  }
  function openTutorial() {
    if(!state?.settings?.initialSetupDone) return;
    const root=$o('kaasiTutorialModal');
    if(!root.dataset.onboardingBound){root.addEventListener('click',onClick);root.addEventListener('change',event=>{if(['tourType','tourAccount'].includes(event.target.id))updateTourType();});root.addEventListener('keydown',event=>{if(event.target.id==='onboardCalc'&&['Tab','Enter','='].includes(event.key)){if(event.key!=='Tab')event.preventDefault();calculatePractice();}});root.addEventListener('input',event=>{if(event.target.id==='onboardDemoSearch'){const query=event.target.value.trim().toLowerCase();root.querySelectorAll('[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(query);});}});root.dataset.onboardingBound='true';}
    tutorialFromSetup=false;lesson=-1;renderTutorial();openModalHelper('kaasiTutorialModal');
  }
  function openReturning() { open(); step = 0; returning = true; render(); }
  return {open,openReturning,openTutorial,hasSavedRecords:() => hasSavedRecords(state)};
})();
