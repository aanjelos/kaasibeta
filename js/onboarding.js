/* First-run setup and replayable, data-free tutorial. No draft is persisted. */
const Onboarding = (() => {
  const steps = ['welcome', 'accounts', 'card', 'categories', 'finish'];
  const lessons = [
    { icon: 'receipt', title: 'Record an expense', body: 'Choose Expense, enter an amount, pick the account and category, then add a short description. The amount comes out of that account.', practice: 'expense' },
    { icon: 'coins', title: 'Record income', body: 'Choose Income for money you receive. Pick the account that received it. Your balance updates when you save.', practice: 'income' },
    { icon: 'calculator', title: 'Calculate as you type', body: 'The calculator beside an amount can work out a total before you save. Try 120 + 80 in the practice field. Nothing here changes your real data.', calculator: true },
    { icon: 'calendar-alt', title: 'Find your transactions', body: 'All Transactions shows earlier months, search, filters and monthly totals. Tap a transaction to see its full details.' },
    { icon: 'hand-holding-usd', title: 'Track what is owed', body: 'Debts track what you owe. Receivables track money owed to you. Record a payment when money actually changes hands.' },
    { icon: 'compass', title: 'Explore when you are ready', body: 'You can also set budgets, track installments and subscriptions, and add a PIN in Settings. Your data stays on this device until you export or connect cloud sync.' }
  ];
  let step = 0, lesson = 0, draft = null, saving = false, tutorialFromSetup = false, returning = false, pendingCloudSetup = false;
  const $o = id => document.getElementById(id);
  const modal = () => $o('initialSetupModal');
  const shell = () => modal().querySelector('.modal-content');
  const safe = value => escapeHTML(String(value ?? ''));
  function hasSavedRecords(data) {
    const defaults = getDefaultState();
    return ['transactions','debts','receivables','installments','budgets','subscriptions'].some(key => data[key]?.length) ||
      data.creditCard?.transactions?.length || data.accounts?.some((account, index) =>
        account.id !== defaults.accounts[index]?.id || Number(account.balance) !== 0 || account.name !== defaults.accounts[index]?.name || !!account.hidden) ||
      Number(data.creditCard?.limit) > 0 || data.settings?.appPin?.enabled || data.hiddenCategories?.length ||
      data.categories?.length !== defaults.categories.length ||
      data.categories?.some(category => !defaults.categories.includes(category));
  }
  function freshDraft() {
    const base = getDefaultState();
    return { accounts: structuredClone(base.accounts), categories: [...base.categories].sort(compareCategoryNames), ccEnabled: false, limit: '', unpaid: '', pinEnabled: false, pin: '', pinConfirm: '', question: '', answer: '', connectCloud: false };
  }
  function header(title, detail, current = step, count = steps.length) {
    return `<header class="onboard-heading"><img src="img/LogoType.svg" alt="Kaasi" class="onboard-logo"><span class="onboard-counter">${current + 1} of ${count}</span></header><div class="onboard-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${count}" aria-valuenow="${current + 1}" aria-label="Setup progress"><span style="width:${(current + 1) / count * 100}%"></span></div><div class="onboard-title"><h1>${title}</h1><p>${detail}</p></div>`;
  }
  function choice(icon, title, description, action, emphasis = false) {
    return `<button type="button" class="onboard-choice ${emphasis ? 'featured' : ''}" data-action="${action}"><span class="onboard-choice-icon"><i class="fas fa-${icon}" aria-hidden="true"></i></span><span><strong>${title}</strong><small>${description}</small></span><i class="fas fa-chevron-right onboard-chevron" aria-hidden="true"></i></button>`;
  }
  function input(label, id, value = '', placeholder = '', extra = '') {
    return `<label class="onboard-field"><span>${label}</span><input id="${id}" value="${safe(value)}" placeholder="${placeholder}" ${extra}></label>`;
  }
  function render() {
    if (!draft) draft = freshDraft();
    const current = steps[step];
    let content = '';
    if (current === 'welcome') {
      content = header('Your money, in one place.', 'A quick setup for a fresh start, or bring your existing Kaasi data back.') +
        `<div class="onboard-choices">${choice('plus','I’m new to Kaasi','Set up accounts and categories in a few steps.','new',true)}${choice('cloud-download-alt','I already have data','Restore a local file or review your cloud copy.','return')}</div>` +
        `<div id="onboardRestore" class="onboard-restore" ${returning || supabaseUser ? '' : 'hidden'}><p>Your saved data will replace this empty setup only after you choose a copy.</p><div class="onboard-restore-actions"><button type="button" class="btn btn-secondary" data-action="file"><i class="fas fa-file-import" aria-hidden="true"></i> Import Local File</button><button type="button" class="btn btn-secondary" id="setupCloudLoginBtn" data-action="signin"><i class="fab fa-google" aria-hidden="true"></i> Sign In</button><button type="button" class="btn btn-primary" id="setupCloudSyncBtn" data-action="cloud" hidden>Review Cloud Copy</button></div><input type="file" id="setupImportInput" accept=".json,application/json" hidden></div>`;
    } else if (current === 'accounts') {
      content = header('Set up your accounts', 'Enter starting balances. Cash keeps its name; you can rename or hide a bank account later.') +
        `<div class="onboard-account-grid">${draft.accounts.map((a,i) => `<div class="onboard-account-card ${a.hidden ? 'muted' : ''}" data-account="${i}"><div class="onboard-account-top"><span class="onboard-account-icon"><i class="fas fa-${i ? 'university' : 'wallet'}" aria-hidden="true"></i></span><span>${i ? `Bank account ${i}` : 'Cash account'}</span>${i ? `<button type="button" class="onboard-visibility" data-action="visibility" data-index="${i}" aria-label="${a.hidden ? 'Show' : 'Hide'} ${safe(a.name)}" aria-pressed="${a.hidden}"><i class="fas fa-eye${a.hidden ? '-slash' : ''}" aria-hidden="true"></i></button>` : ''}</div><div class="onboard-account-fields">${i ? input('Account name',`onboardName${i}`,a.name,'Account name','maxlength="60"') : `<div class="onboard-field"><span>Account name</span><strong>Cash</strong></div>`}${input('Starting balance (LKR)',`onboardBalance${i}`,a.balance || '','0.00','inputmode="decimal" autocomplete="off"')}</div></div>`).join('')}</div>`;
    } else if (current === 'card') {
      content = header('Do you use a credit card?', 'Keep purchases and repayments separate from your bank transactions.') +
        `<label class="onboard-switch-row"><span><strong>Track a credit card</strong><small>You can turn this on later in Settings.</small></span><input type="checkbox" id="onboardCcEnabled" ${draft.ccEnabled ? 'checked' : ''}><span class="onboard-switch" aria-hidden="true"></span></label><div id="onboardCcFields" ${draft.ccEnabled ? '' : 'hidden'} class="onboard-card-fields">${input('Credit limit (LKR)','onboardCcLimit',draft.limit,'e.g. 100,000','inputmode="decimal" autocomplete="off"')}${input('Already unpaid (LKR) · optional','onboardCcUnpaid',draft.unpaid,'0.00','inputmode="decimal" autocomplete="off"')}<p class="onboard-hint">An unpaid starting balance becomes one credit card purchase. It won’t deduct money from a bank account or count as a new expense.</p></div>`;
    } else if (current === 'categories') {
      content = header('Choose your categories', 'Keep the ones you use. You can add or change categories later in Settings.') +
        `<div class="onboard-category-add"><label class="onboard-field"><span>New category</span><input id="onboardNewCategory" placeholder="e.g. Pet care" maxlength="60"></label><button type="button" class="btn btn-secondary" data-action="add-category">Add</button></div><div class="onboard-category-list">${draft.categories.slice().sort(compareCategoryNames).map(cat => `<div class="onboard-category"><span>${safe(cat)}</span>${cat.toLowerCase() === 'other' ? '<span class="onboard-hint">Always available</span>' : `<button type="button" data-action="remove-category" data-category="${safe(cat)}" aria-label="Remove ${safe(cat)}"><i class="fas fa-times" aria-hidden="true"></i></button>`}</div>`).join('')}</div>`;
    } else {
      content = header('Ready to start', 'Your accounts and categories will be saved together when you finish.') +
        `<div class="onboard-summary"><strong>Local data comes first</strong><p>Kaasi saves changes on this device. Export a local backup anytime from Data & Backups.</p></div><label class="onboard-switch-row"><span><strong>Add a PIN</strong><small>Optional. You can set one later in Settings.</small></span><input type="checkbox" id="onboardPinEnabled" ${draft.pinEnabled ? 'checked' : ''}><span class="onboard-switch" aria-hidden="true"></span></label><div id="onboardPinFields" ${draft.pinEnabled ? '' : 'hidden'} class="onboard-pin-fields">${input('4-digit PIN','onboardPin',draft.pin,'••••','inputmode="numeric" maxlength="4" type="password" autocomplete="new-password"')}${input('Confirm PIN','onboardPinConfirm',draft.pinConfirm,'••••','inputmode="numeric" maxlength="4" type="password" autocomplete="new-password"')}<label class="onboard-field"><span>Recovery question</span><select id="onboardQuestion"><option value="">Choose a question</option><option>What was the name of your first pet?</option><option>What city were you born in?</option><option>What was your childhood nickname?</option><option>What is the name of your favorite teacher?</option></select></label>${input('Answer','onboardAnswer',draft.answer,'Your answer','autocomplete="off"')}</div><label class="onboard-switch-row onboard-cloud-choice"><span><strong>Connect cloud sync</strong><small>After the tour, open Data & Backups to sign in. Your data will stay here until you choose to sync.</small></span><input type="checkbox" id="onboardConnectCloud" ${draft.connectCloud ? 'checked' : ''}><span class="onboard-switch" aria-hidden="true"></span></label>`;
    }
    shell().innerHTML = `<div class="onboard-layout"><aside class="onboard-rail"><img src="img/FullLogo.svg" alt="Kaasi"><div class="onboard-rail-text"><span>MAKE ROOM FOR WHAT MATTERS</span><h2>Every step adds up.</h2><p>Set a clear starting point for your money. You can adjust these choices anytime.</p></div><small>Earn well. Spend responsibly.</small></aside><main class="onboard-main"><div class="onboard-panel" id="onboardPanel">${content}${step ? `<nav class="onboard-footer"><button type="button" class="btn btn-secondary" data-action="back">Back</button><button type="button" class="btn btn-primary" data-action="${step === steps.length-1 ? 'save' : 'next'}">${step === steps.length-1 ? 'Finish Setup' : 'Continue'} <i class="fas fa-arrow-right" aria-hidden="true"></i></button></nav>` : ''}</div></main></div>`;
    if (current === 'welcome') {
      $o('setupCloudSyncBtn').hidden = !supabaseUser;
      $o('setupCloudLoginBtn').hidden = !!supabaseUser;
      const file = $o('setupImportInput'); file.addEventListener('change', handleImport);
    }
    if (current === 'finish') $o('onboardQuestion').value = draft.question;
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
        if (unpaid && (!limit || unpaid > limit)) throw new Error('The unpaid balance must fit within the credit limit.');
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
    const previews = {
      3: '<div class="onboard-demo"><span>All Transactions</span><div>October <strong>Search · Filter · Review</strong></div><div>September <strong>Earlier records</strong></div></div>',
      4: '<div class="onboard-demo"><span>Money between people</span><div>I Owe <strong>Track a debt</strong></div><div>Owes Me <strong>Track a receivable</strong></div></div>',
      5: '<div class="onboard-demo"><span>Explore more</span><div>Budgets <strong>Set a monthly limit</strong></div><div>Subscriptions <strong>Know what is due</strong></div></div>'
    };
    return header(item.title,item.body,lesson+1,lessons.length+1) + `<div class="onboard-lesson"><span class="onboard-lesson-icon"><i class="fas fa-${item.icon}" aria-hidden="true"></i></span>${item.practice ? `<div class="onboard-practice"><span>Practice only · No record will be saved</span><div class="onboard-segment"><button type="button" class="${item.practice === 'expense' ? 'selected' : ''}" data-demo="expense">Expense</button><button type="button" class="${item.practice === 'income' ? 'selected' : ''}" data-demo="income">Income</button></div><label class="onboard-field"><span>Example amount (LKR)</span><input inputmode="decimal" placeholder="e.g. 250.00"></label></div>` : item.calculator ? '<div class="onboard-practice"><span>Practice only · No record will be saved</span><div class="onboard-calc"><input id="onboardCalc" placeholder="120 + 80" inputmode="decimal"><button type="button" class="btn btn-secondary" data-action="calculate">Calculate</button></div><output id="onboardCalcResult" aria-live="polite"></output></div>' : previews[lesson]}</div><nav class="onboard-footer"><button type="button" class="btn btn-secondary" data-action="tour-back">Back</button><button type="button" class="btn btn-primary" data-action="tour-next">${lesson === lessons.length-1 ? 'Finish Tour' : 'Next'} <i class="fas fa-arrow-right" aria-hidden="true"></i></button></nav><button type="button" class="onboard-skip" data-action="tour-close">Skip tour</button>`;
  }
  function renderTutorial() {
    const root = tutorialFromSetup ? shell() : $o('kaasiTutorialModal').querySelector('.modal-content');
    root.innerHTML = `<div class="onboard-layout"><aside class="onboard-rail"><img src="img/FullLogo.svg" alt="Kaasi"><div class="onboard-rail-text"><span>A LITTLE GUIDANCE</span><h2>Make yourself at home.</h2><p>Discover the essentials at your own pace.</p></div><small>Practice stays in the tour.</small></aside><main class="onboard-main"><div class="onboard-panel">${tutorialMarkup()}</div></main></div>`;
    root.querySelector('.onboard-main').scrollTop=0;
    root.focus({preventScroll:true});
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
    if (completed) showNotification('Tour complete. Welcome to Kaasi!','success');
    if (openCloud && !history.state?.modalOpen) openCloudSyncSettings();
  }
  function onClick(event) {
    const target = event.target.closest('[data-action],[data-demo]'); if (!target) return;
    if (target.dataset.demo) { target.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('selected',b===target)); return; }
    const action = target.dataset.action;
    if (action === 'return') { returning=true; $o('onboardRestore').hidden=false; $o('onboardRestore').scrollIntoView({block:'nearest'}); }
    else if (action === 'new') { if (hasSavedRecords(state)) return showNotification('This device already has saved data. Restore or protect it before starting again.','error'); step=1; render(); }
    else if (action === 'back') { collect(); step=Math.max(0,step-1); render(); }
    else if (action === 'next') { collect(); if (validateCurrent()) { step++; render(); } }
    else if (action === 'save') { collect(); finish(); }
    else if (action === 'visibility') { collect(); const a=draft.accounts[Number(target.dataset.index)]; a.hidden=!a.hidden; render(); }
    else if (action === 'add-category') { const field=$o('onboardNewCategory'); const name=field.value.trim(); if (!name) return; if(draft.categories.some(c=>c.toLowerCase()===name.toLowerCase())) return showNotification('That category already exists.','info'); draft.categories.push(name);render(); }
    else if (action === 'remove-category') { if(target.dataset.category?.toLowerCase()==='other')return; draft.categories=draft.categories.filter(c=>c!==target.dataset.category);render(); }
    else if (action === 'file') $o('setupImportInput').click();
    else if (action === 'signin') signInWithGoogle();
    else if (action === 'cloud') syncCloudData({reviewOnly:true});
    else if (action === 'tour-start') {lesson=0;renderTutorial();}
    else if (action === 'tour-close') closeTour(false);
    else if (action === 'tour-next') {if(lesson===lessons.length-1)closeTour(true);else {lesson++;renderTutorial();}}
    else if (action === 'tour-back') {lesson=Math.max(0,lesson-1);renderTutorial();}
    else if (action === 'calculate') { const expression=$o('onboardCalc').value.trim(); const output=$o('onboardCalcResult'); if(!/^\s*\d+(?:\.\d+)?\s*[+\-*/]\s*\d+(?:\.\d+)?\s*$/.test(expression)) {output.textContent='Try two numbers with +, −, × or ÷.';return;} const match=expression.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);const [a,b]=[Number(match[1]),Number(match[3])];const result=match[2]==='+'?a+b:match[2]==='-'?a-b:match[2]==='*'?a*b:b?a/b:NaN;output.textContent=Number.isFinite(result)?`Result: LKR ${result.toFixed(2)}`:'Cannot divide by zero.'; }
  }
  function open() {
    if (state?.settings?.initialSetupDone) return;
    if (!draft) draft=freshDraft();
    const root=modal();
    if(!root.dataset.onboardingBound) {
      root.addEventListener('click',onClick);
      root.addEventListener('change',event=>{
        if(event.target.id==='onboardCcEnabled') {collect();$o('onboardCcFields').hidden=!draft.ccEnabled;}
        if(event.target.id==='onboardPinEnabled') {collect();$o('onboardPinFields').hidden=!draft.pinEnabled;}
      });
      root.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='onboardNewCategory'){event.preventDefault();root.querySelector('[data-action="add-category"]').click();}});
      root.dataset.onboardingBound='true';
    }
    render();root.style.display='block';updateBodyScrollState();displayAppVersion();
  }
  function openTutorial() {
    if(!state?.settings?.initialSetupDone) return;
    const root=$o('kaasiTutorialModal');
    if(!root.dataset.onboardingBound){root.addEventListener('click',onClick);root.dataset.onboardingBound='true';}
    tutorialFromSetup=false;lesson=-1;renderTutorial();openModalHelper('kaasiTutorialModal');
  }
  return {open,openTutorial};
})();
