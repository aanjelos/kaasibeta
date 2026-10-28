/** Validate backups without mutating the current state or the supplied object. */
function prepareImportedData(input) {
  const fail = (field) => { throw new Error(`Invalid backup: ${field}. Existing data was not replaced.`); };
  const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const inspect = (value, depth = 0) => {
    if (depth > 50) fail("data is nested too deeply");
    if (value && typeof value === "object") {
      Object.keys(value).forEach(key => {
        if (["__proto__", "constructor", "prototype"].includes(key)) fail("unsafe object key");
        inspect(value[key], depth + 1);
      });
    }
  };
  if (!object(input)) fail("expected a Kaasi backup object");
  inspect(input);
  ["accounts", "transactions", "categories"].forEach(key => {
    if (!Array.isArray(input[key])) fail(`${key} must be a list`);
  });
  ["debts", "receivables", "installments", "budgets", "hiddenCategories"].forEach(key => {
    if (key in input && !Array.isArray(input[key])) fail(`${key} must be a list`);
  });
  if ("settings" in input && !object(input.settings)) fail("settings must be an object");
  if ("creditCard" in input && !object(input.creditCard)) fail("creditCard must be an object");
  if (input.creditCard && "transactions" in input.creditCard && !Array.isArray(input.creditCard.transactions)) {
    fail("credit card transactions must be a list");
  }

  const candidate = deepMerge(getDefaultState(), JSON.parse(JSON.stringify(input)));
  const text = (value, field, allowEmpty = false) => {
    if (typeof value !== "string" || (!allowEmpty && !value.trim())) fail(`${field} must contain text`);
  };
  const identifier = (value, field) => {
    if (typeof value !== "string" || !/^[a-zA-Z0-9_-]+$/.test(value)) fail(`${field} has an invalid ID`);
  };
  const number = (record, field, fallback, min = 0, integer = false) => {
    if (record[field] === undefined && fallback !== undefined) record[field] = fallback;
    if (typeof record[field] !== "number" || !Number.isFinite(record[field]) ||
        Math.abs(record[field]) > Number.MAX_SAFE_INTEGER / 100 ||
        record[field] < min || (integer && !Number.isInteger(record[field]))) fail(`${field} is not a valid number`);
    const rounded = integer ? record[field] : roundToTwoDecimals(record[field]);
    if (!Number.isFinite(rounded)) fail(`${field} is too large`);
    record[field] = rounded;
  };
  const date = (value, field) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${field} is not a valid date`);
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`${field} is not a valid date`);
  };
  const records = (items, label, validate) => {
    const ids = new Set();
    items.forEach(item => {
      if (!object(item)) fail(`${label} contains an invalid record`);
      identifier(item.id, label);
      if (ids.has(item.id)) fail(`${label} contains duplicate IDs`);
      ids.add(item.id);
      validate(item);
    });
  };
  const timestamp = (item, dateField) => {
    if (item.timestamp === undefined) item.timestamp = new Date(`${item[dateField]}T00:00:00Z`).getTime();
    if (typeof item.timestamp !== "number" || !Number.isFinite(item.timestamp)) fail("invalid record timestamp");
  };

  candidate.categories.forEach(cat => text(cat, "category"));
  candidate.hiddenCategories.forEach(cat => text(cat, "hidden category"));
  records(candidate.accounts, "accounts", account => {
    text(account.name, "account name");
    number(account, "balance", undefined, -Infinity);
    if (account.hidden === undefined) account.hidden = false;
    if (typeof account.hidden !== "boolean") fail("account visibility must be true or false");
  });
  ensureDefaultAccounts(candidate);
  ensureDefaultCategories(candidate);
  const accountIds = new Set(candidate.accounts.map(account => account.id));
  const accountReference = (id) => {
    identifier(id, "account reference");
    if (!accountIds.has(id)) fail("transaction references a missing account");
  };
  records(candidate.transactions, "transactions", transaction => {
    if (!["income", "expense"].includes(transaction.type)) fail("unsupported transaction type");
    number(transaction, "amount");
    accountReference(transaction.account);
    if (transaction.ccPurchaseId !== undefined) identifier(transaction.ccPurchaseId, "CC purchase link");
    text(transaction.description, "transaction description", true);
    if (transaction.category !== null && transaction.category !== undefined) text(transaction.category, "transaction category");
    date(transaction.date, "transaction date");
    timestamp(transaction, "date");
  });
  for (const group of ["debts", "receivables"]) {
    records(candidate[group], group, item => {
      text(item.who, "person");
      text(item.why, "reason", true);
      number(item, "originalAmount", item.amount);
      number(item, "amount", item.originalAmount);
      number(item, "remainingAmount", item.amount);
      if (item.remainingAmount > item.originalAmount) fail("remaining amount exceeds original amount");
      const field = group === "debts" ? "dueDate" : "dateGiven";
      date(item[field], field);
      timestamp(item, field);
      if (group === "receivables") {
        if (item.type === undefined) item.type = "cash";
        if (!["cash", "cc"].includes(item.type)) fail("unsupported receivable type");
        if (item.sourceAccount) accountReference(item.sourceAccount);
      }
    });
  }
  records(candidate.installments, "installments", item => {
    text(item.description, "installment description", true);
    number(item, "monthlyAmount");
    number(item, "totalMonths", undefined, 1, true);
    number(item, "monthsLeft", undefined, 0, true);
    if (item.monthsLeft > item.totalMonths) fail("months left exceeds total months");
    if (item.originalFullAmount !== undefined) number(item, "originalFullAmount");
    date(item.startDate, "installment start date");
    timestamp(item, "startDate");
  });
  number(candidate.creditCard, "limit");
  records(candidate.creditCard.transactions, "credit card transactions", item => {
    text(item.description, "credit card description", true);
    if (item.category !== undefined && item.category !== null) text(item.category, "credit card category", true);
    if (!candidate.categories.includes(item.category) || item.category?.toLowerCase() === "income") delete item.category;
    date(item.date, "credit card date");
    timestamp(item, "date");
    number(item, "amount");
    number(item, "paidAmount", item.paidOff === true ? item.amount : 0);
    if (item.paidAmount > item.amount) fail("credit card paid amount exceeds purchase amount");
    item.paidOff = item.paidAmount >= roundToTwoDecimals(item.amount - 0.005);
    if (item.paidOff) item.paidAmount = item.amount;
  });
  records(candidate.budgets, "budgets", budget => {
    text(budget.name, "budget name");
    number(budget, "limit");
    if (!Array.isArray(budget.categories)) fail("budget categories must be a list");
    budget.categories.forEach(cat => text(cat, "budget category"));
  });
  const settings = candidate.settings;
  const defaults = getDefaultState().settings;
  Object.keys(defaults).forEach(key => {
    if (typeof defaults[key] !== "object" && typeof settings[key] !== typeof defaults[key]) fail(`invalid setting ${key}`);
  });
  number(settings, "defaultTransferFee");
  if (!object(settings.hiddenCategoryRules)) fail("invalid hidden category rules");
  Object.values(settings.hiddenCategoryRules).forEach(value => {
    if (typeof value !== "boolean") fail("hidden category rules must be true or false");
  });
  ["hideCashCounter", "hideTotalPotential", "hideDebts", "hideInstallments"].forEach(key => {
    if (key in settings && typeof settings[key] !== "boolean") fail(`invalid setting ${key}`);
  });
  if (settings.appPin !== undefined) {
    if (!object(settings.appPin) || typeof settings.appPin.enabled !== "boolean") fail("invalid PIN settings");
    if (settings.appPin.enabled) {
      if (!/^[a-f0-9]{64}$/i.test(settings.appPin.pin) || !/^[a-f0-9]{64}$/i.test(settings.appPin.answer)) fail("invalid PIN hashes");
      text(settings.appPin.question, "security question");
    }
  }
  // Optional additions: preserve absent fields in legacy backups and retain
  // unknown compatible properties inside schedules/renewal records.
  if ('subscriptions' in candidate) {
    if(!Array.isArray(candidate.subscriptions))fail('subscriptions must be a list');
    records(candidate.subscriptions,'subscriptions',sub=>{
      text(sub.name,'subscription name');number(sub,'amount');
      if(sub.amount<=0)fail('subscription amount must be positive');
      if(sub.renewalRevision!==undefined && (!Number.isSafeInteger(sub.renewalRevision)||sub.renewalRevision<0))fail('invalid subscription renewal revision');
      if(!['bank','cc'].includes(sub.method)||!['daily','weekly','monthly','quarterly','semiannually','annually'].includes(sub.frequency)||!['active','paused','cancelled'].includes(sub.status))fail('unsupported subscription format');
      date(sub.nextDueDate,'subscription renewal date');
      number(sub,'anchorDay',Number(sub.nextDueDate.slice(8)),1,true);
      if(sub.anchorDay>31)fail('subscription anchor day');
      if(sub.account)identifier(sub.account,'subscription account');
      if(sub.category)text(sub.category,'subscription category');
      if(sub.serviceId)identifier(sub.serviceId,'subscription service');
      if(sub.icon)identifier(sub.icon,'subscription icon');
    });
  }
  if ('subscriptionOccurrences' in candidate) {
    if(!Array.isArray(candidate.subscriptionOccurrences))fail('subscription renewals must be a list');
    records(candidate.subscriptionOccurrences,'subscription renewals',row=>{
      identifier(row.subscriptionId,'subscription renewal reference');date(row.dueDate,'subscription occurrence date');
      if(!['paid','skipped','snoozed'].includes(row.status))fail('unsupported renewal status');
      if(row.status==='paid') {
        if(row.recordedExternally!==true || row.transactionId!==undefined)identifier(row.transactionId,'renewal transaction reference');
        number(row,'amount');date(row.date,'renewal payment date');
        if(!['bank','cc'].includes(row.kind))fail('renewal transaction kind');
      }
      if(row.recordedExternally!==undefined && typeof row.recordedExternally!=='boolean')fail('invalid external renewal confirmation');
      if(row.snoozedUntil!==undefined)number(row,'snoozedUntil');
      if(row.reminderDismissed!==undefined && typeof row.reminderDismissed!=='boolean')fail('invalid reminder preference');
      if(row.handledAt!==undefined)number(row,'handledAt');
    });
  }
  settings.initialSetupDone = true;
  return candidate;
}

async function applyImportedData(input, expectedRevision = KaasiStorage.revision) {
  if (isAppLocked()) throw new Error("Unlock the app before importing data.");
  if (storageOperationPending) throw new Error("Wait for the current save before importing.");
  const candidate = portableKaasiData(sanitizeAndMergeImportedData(input));
  const previousState = JSON.parse(lastPersistedStateJson);
  const previousSyncStatus = window.currentCloudSyncStatus;
  storageOperationPending = true;
  let activated = false;
  try {
    await KaasiStorage.replace(candidate, expectedRevision);
    activated = true;
    state = candidate;
    lastPersistedStateJson = JSON.stringify(candidate);
    initializeUI(true);
    appPreferences.setItem("lastLocalDataModification", Date.now().toString());
    window.currentCloudSyncStatus = "local_newer";
  } catch (error) {
    if (activated) {
      try {
        await KaasiStorage.replace(previousState);
        state = previousState;
        lastPersistedStateJson = JSON.stringify(previousState);
        window.currentCloudSyncStatus = previousSyncStatus;
        try { initializeUI(true); } catch (_) { /* Recovery screen remains available. */ }
      } catch (rollbackError) {
        showStorageFailure(new Error("Import could not finish. The previous dataset is retained in recovery. Do not reset storage."));
      }
    }
    throw error;
  } finally {
    storageOperationPending = false;
    if (activated && typeof scheduleAutomaticCloudSync === 'function') scheduleAutomaticCloudSync();
  }
}
