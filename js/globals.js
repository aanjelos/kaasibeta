/**
 * globals.js
 * Contains global state, generic utilities, and shared constants.
 */

// --- GLOBAL ERROR SAFETY NET ---
window.addEventListener('error', function(event) {
  if (event.error?.kaasiSaveFailure) { event.preventDefault(); return; }
  console.error("Global Error Caught:", event.error);
  if (typeof showNotification === 'function') {
    showNotification("An unexpected error occurred. Please refresh if the app stops responding.", "error");
  }
});

window.addEventListener('unhandledrejection', function(event) {
  if (event.reason?.kaasiSaveFailure) { event.preventDefault(); return; }
  console.error("Unhandled Promise Rejection:", event.reason);
  if (typeof showNotification === 'function') {
    showNotification("An unexpected error occurred. Please refresh if the app stops responding.", "error");
  }
});
// --- END ERROR SAFETY NET ---
// Defines global variables, helper functions, utility methods, and default state structures.
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const formatCurrency = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) amount = 0;
  return `LKR\u00A0${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 4);

const escapeHTML = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
const getDaysLeft = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

// Analytics Helper
function trackEvent(action, category = "Engagement", label = "") {
  if (typeof gtag !== "undefined") {
    gtag("event", action, {
      event_category: category,
      event_label: label,
    });
  }
}

// Device-Specific Settings
function getDeviceTheme() {
  return appPreferences.getItem("kaasi_device_theme") || "dark";
}

function setDeviceTheme(theme) {
  appPreferences.setItem("kaasi_device_theme", theme);
}


const SUPABASE_URL = "https://xcnirqsctkyyrvildqtm.supabase.co";
const SUPABASE_KEY = "sb_publishable_cLW_C5L7xmIinyzSaKSmBQ_EFnjbntg"; // Your publishable key

let supabaseClient = null;
try {
  // Use window.supabase.createClient, as the library is from a CDN
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase client initialized.");
  } else {
    throw new Error("Supabase client library not found on window object.");
  }
} catch (e) {
  console.error("Error initializing Supabase client:", e);
  showNotification(
    "Could not initialize cloud features. Please refresh.",
    "error"
  );
}
// --- END NEW ---

const roundToTwoDecimals = (num) => {
  if (typeof num !== "number" || isNaN(num)) {
    return 0; // Default to 0 if not a valid number
  }
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

function getCurrentDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFormattedLocalStorageSize(key) {
  const item = lastPersistedStateJson;
  if (item === null) {
    return "N/A (No data found)";
  }

  const sizeInBytes = new TextEncoder().encode(item).length;

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} Bytes`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

function displayAppVersion() {
  let version = "N/A";
  try {
    const versionMetaTag = document.querySelector(
      'meta[name="application-version"]'
    );
    if (versionMetaTag) {
      version = versionMetaTag.getAttribute("content");
    } else {
      console.warn("Application version meta tag not found.");
    }
  } catch (error) {
    console.error("Error reading application version:", error);
  }

  const versionElementSettings = document.getElementById("appVersionSettings");
  if (versionElementSettings) {
    versionElementSettings.textContent = `Version: ${version}`;
  }

  const versionElementSetup = document.getElementById("appVersionSetup");
  if (versionElementSetup) {
    versionElementSetup.textContent = `Version: ${version}`;
  }
}



let state = {};
let dashboardChartState = "yearly";
// Removed monthlyViewSearchScope as we use advanced filters now
let supabaseUser = null;
let ccHistoryFilter = "unpaid";
let ccSelectedMonth = new Date().getMonth();
let ccSelectedYear = new Date().getFullYear();
let ccHistorySearchDebounceTimer;
let ccHistoryOpenMonthKeys = new Set();

function getDefaultState() {
  return JSON.parse(
    JSON.stringify({
      transactions: [],
      accounts: [
        {
          id: "cash",
          name: "Cash",
          balance: 0,
          hidden: false, // Cannot be hidden
        },
        {
          id: "bank_1",
          name: "Commercial",
          balance: 0,
          hidden: false,
        },
        {
          id: "bank_2",
          name: "HNB",
          balance: 0,
          hidden: false,
        },
        {
          id: "bank_3",
          name: "Sampath",
          balance: 0,
          hidden: false,
        },
      ],
      categories: [
        "Food & Dining",
        "Groceries",
        "Transportation",
        "Healthcare",
        "Personal Care",
        "Shopping",
        "Entertainment",
        "Education",
        "Gifts & Donations",
        "Subscriptions & Memberships",
        "Bank Charges",
        "Other",
      ].sort((a, b) => a.localeCompare(b)),
      debts: [],
      receivables: [],
      installments: [],
      creditCard: {
        limit: 0,
        transactions: [],
      },
      budgets: [],
      hiddenCategories: [], // List of categories marked as hidden
      settings: {
        initialSetupDone: false,
        showCcDashboardSection: true,
        showMathToolbar: true,
        defaultTransferFee: 25,
        defaultTransferFeeCategory: "Bank Charges",
        theme: "dark", // DEPRECATED: Moved to device_settings. Kept for legacy struct validation.
        accent: "orange",
        backupReminderFrequency: "default",
        hiddenCategoryRules: {
          excludeFromDashboardCharts: true,
          excludeFromReports: false,
          excludeFromMonthlyTotals: true,
          excludeFromPieChart: true,
          excludeFromQuickStats: true,
          excludeFromYearlyTotals: true,
          dimInTransactionLists: true
        },
        lastDismissedBudgetTipMonth: "",
        budgetSortOrder: "added"
      },
    })
  );
}

function openInitialSetupWizard() { Onboarding.open(); }

function sanitizeAndMergeImportedData(importedData) {
  return prepareImportedData(importedData);
}

const STORAGE_KEY = "KaasiData";
let lastPersistedStateJson = null;

function restoreStateSnapshot(current, saved) {
  if (Array.isArray(saved)) {
    if (!Array.isArray(current)) return saved;
    const byId = new Map(current.filter(item => item && typeof item === "object" && item.id).map(item => [item.id, item]));
    const restored = saved.map(value => {
      const existing = value && typeof value === "object" && value.id
        ? byId.get(value.id) : undefined;
      return restoreStateSnapshot(existing, value);
    });
    current.splice(0, current.length, ...restored);
    return current;
  }
  if (saved && typeof saved === "object") {
    if (!current || typeof current !== "object" || Array.isArray(current)) return saved;
    Object.keys(current).forEach(key => { if (!Object.prototype.hasOwnProperty.call(saved, key)) delete current[key]; });
    Object.keys(saved).forEach(key => {
      if (!["__proto__", "constructor", "prototype"].includes(key)) current[key] = restoreStateSnapshot(current[key], saved[key]);
    });
    return current;
  }
  return saved;
}

// Portable data excludes device-only prompt state; never mutate the saved source.
function portableKaasiData(value) {
  const copy = JSON.parse(JSON.stringify(value));
  if (Array.isArray(copy.subscriptionOccurrences)) {
    copy.subscriptionOccurrences = copy.subscriptionOccurrences.filter(row => row.status !== 'snoozed').map(row => {
      delete row.snoozedUntil;
      delete row.reminderDismissed;
      return row;
    });
    if (!copy.subscriptionOccurrences.length) delete copy.subscriptionOccurrences;
  }
  if (copy.settings) {
    delete copy.settings.lastDismissedBudgetTipMonth;
    delete copy.settings.hideCashCounter;
  }
  return copy;
}

function generateDataHash(str) {
  if (!str) return null;
  // Object-store reconstruction may change object-key order without changing data.
  if (typeof KaasiStorage !== "undefined" && KaasiStorage.canonical) {
    try { str = KaasiStorage.canonical(portableKaasiData(JSON.parse(str))); } catch (_) { /* Non-JSON metadata retains its original representation. */ }
  }
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

async function saveData(nextState = state, options = {}) {
  if (storageOperationPending) throw new Error("A save is already in progress. Please wait.");
  storageOperationPending = true;
  let serialized;
  let milestoneResult;
  try {
    if (nextState.settings) delete nextState.settings.hideCashCounter;
    if (typeof Milestones !== 'undefined' && !options.skipMilestones) milestoneResult = Milestones.prepare(nextState, options.milestoneEvent);
    serialized = JSON.stringify(nextState);
    await KaasiStorage.commit(JSON.parse(serialized), { lastLocalDataModification: Date.now().toString() });
  } catch (cause) {
    if (lastPersistedStateJson !== null) state = restoreStateSnapshot(state, JSON.parse(lastPersistedStateJson));
    const error = new Error(cause.name === "QuotaExceededError"
      ? "Changes were not saved: device storage is full. Your last saved data is unchanged. Export a backup and free space before retrying."
      : cause.name === "KaasiConflictError" ? cause.message : "Changes were not saved. Your last saved data is unchanged. Please retry or export a backup.");
    error.kaasiSaveFailure = true;
    showNotification(error.message, "error", 10000);
    if (cause.name === "KaasiConflictError") showStorageFailure(cause);
    throw error;
  } finally {
    storageOperationPending = false;
  }
  state = nextState;
  lastPersistedStateJson = serialized;
  if (milestoneResult) Milestones.committed(milestoneResult);
  if (typeof noteCloudSyncSave === 'function') noteCloudSyncSave(options.syncSettings === true);
  const syncedHash = appPreferences.getItem("kaasi_synced_state_hash");
  window.currentCloudSyncStatus = syncedHash && generateDataHash(serialized) === syncedHash ? "synced" : "local_newer";
  if (typeof updateLocalCloudSyncStatus === "function") await updateLocalCloudSyncStatus();
  if (typeof updateHeaderShortcutButtons === "function") updateHeaderShortcutButtons();
  if (typeof scheduleAutomaticCloudSync === 'function') scheduleAutomaticCloudSync();
  return true;
}

function loadData() {
  if (!KaasiStorage.ready) throw new Error("Local data is not ready. Complete storage initialization first.");
  state = KaasiStorage.current;
  if (typeof Milestones !== 'undefined') Milestones.baseline(state);
  lastPersistedStateJson = JSON.stringify(state);
}

function deepMerge(target, source) {
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key) &&
        !["__proto__", "constructor", "prototype"].includes(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue)
      ) {
        if (
          !targetValue ||
          typeof targetValue !== "object" ||
          Array.isArray(targetValue)
        ) {
          target[key] = {};
        }
        deepMerge(target[key], sourceValue);
      } else if (sourceValue !== undefined) {
        target[key] = sourceValue;
      }
    }
  }

  return target;
}

function ensureDefaultAccounts(targetState = state) {
  const defaultAccounts = getDefaultState().accounts;
  if (!Array.isArray(targetState.accounts)) {
    console.warn(
      "state.accounts was not an array. Resetting to default accounts structure."
    );
    targetState.accounts = JSON.parse(JSON.stringify(defaultAccounts));

    targetState.accounts.forEach((acc) => (acc.balance = 0));
    return;
  }

  defaultAccounts.forEach((defaultAcc) => {
    const existingAccount = targetState.accounts.find(
      (acc) => acc.id === defaultAcc.id
    );
    if (!existingAccount) {
      console.warn(
        `Default account '${defaultAcc.name}' (ID: ${defaultAcc.id}) was missing. Adding it.`
      );
      targetState.accounts.push({
        ...defaultAcc,
        balance: 0,
      });
    } else {
      if (typeof existingAccount.name !== "string")
        existingAccount.name = defaultAcc.name;
      if (
        typeof existingAccount.balance !== "number" ||
        isNaN(existingAccount.balance)
      ) {
        console.warn(
          `Balance for account '${existingAccount.name}' was invalid. Resetting to 0.`
        );
        existingAccount.balance = 0;
      }
    }
  });
}

function ensureDefaultCategories(targetState = state) {
  const defaultCategories = getDefaultState().categories;

  if (!targetState.categories || !Array.isArray(targetState.categories)) {
    console.warn(
      "state.categories was missing or not an array. Initializing as empty array."
    );
    targetState.categories = [];
  }

  if (targetState.categories.length === 0) {
    console.warn(
      "state.categories is empty. Populating with default categories."
    );
    targetState.categories = JSON.parse(JSON.stringify(defaultCategories));
  }

  targetState.categories.sort((a, b) => a.localeCompare(b));

  const otherCategory = "Other";
  if (
    !targetState.categories.some(
      (cat) => cat.toLowerCase() === otherCategory.toLowerCase()
    )
  ) {
    console.warn("'Other' category was missing. Adding it back.");
    targetState.categories.push(otherCategory);
    targetState.categories.sort((a, b) => a.localeCompare(b));
  }
}
window.triggerHapticFeedback = function(duration = 55) {
  if (navigator.vibrate) {
    // Only vibrate if the user hasn't explicitly disabled haptics in their OS
    try {
      navigator.vibrate(duration);
      console.log(`Haptic feedback triggered: ${duration}ms`);
    } catch (e) {
      console.error("Haptic feedback error:", e);
    }
  } else {
    console.log("Haptic feedback (navigator.vibrate) not supported on this device/browser.");
  }
};

function showNotification(message, type = "success", duration = 4000) {
  if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback(55);
  const area = $("#notificationArea");
  if (!area) return;
  const n = document.createElement("div");

  let bgColor, textColor, borderStyle;
  switch (type) {
    case "achievement":
      bgColor = "var(--bg-tertiary)";
      textColor = "var(--text-primary)";
      borderStyle = "1px solid var(--accent-primary)";
      break;
    case "error":
      bgColor = "var(--expense-color)";
      textColor = "#ffffff";
      borderStyle = "none";
      break;
    case "warning":
      bgColor = "var(--accent-hover)";
      textColor = "#ffffff";
      borderStyle = "none";
      break;
    case "info":
      bgColor = "var(--bg-tertiary)";
      textColor = "var(--text-primary)";
      borderStyle = "1px solid var(--border-light)";
      break;
    default: // success
      bgColor = "var(--income-color)";
      textColor = "#ffffff";
      borderStyle = "none";
      break;
  }

  n.className = `p-3 rounded-md shadow-lg text-sm font-medium transition-all duration-300 ease-in-out transform translate-x-full opacity-0 force-word-wrap`;
  n.style.backgroundColor = bgColor;
  n.style.color = textColor;
  n.style.border = borderStyle;
  
  n.setAttribute("role", "alert");
  n.setAttribute("aria-live", "assertive");

  n.textContent = message;
  if (type === 'achievement') {
    const icon=document.createElement('i'); icon.className='fas fa-award'; icon.setAttribute('aria-hidden','true');
    icon.style.color='var(--accent-primary)'; icon.style.marginRight='8px'; n.prepend(icon);
    n.setAttribute('role','status'); n.setAttribute('aria-live','polite');
  }
  area.appendChild(n);
  void n.offsetWidth;
  requestAnimationFrame(() => {
    n.classList.remove("translate-x-full", "opacity-0");
    n.classList.add("translate-x-0", "opacity-100");
  });
  setTimeout(() => {
    n.classList.remove("translate-x-0", "opacity-100");
    n.classList.add("translate-x-full", "opacity-0");
    n.addEventListener("transitionend", () => n.remove(), {
      once: true,
    });
  }, duration);
}

function compareCategoryNames(a, b) {
  const aOther = a.toLowerCase() === "other", bOther = b.toLowerCase() === "other";
  return aOther === bOther ? a.localeCompare(b) : aOther ? 1 : -1;
}

function updateTransferAccountOptions() {
  const from = document.getElementById("transferFrom");
  const to = document.getElementById("transferTo");
  if (!from || !to) return;
  const accounts = state.accounts.filter((account) => !account.hidden);
  const valid = (value) => accounts.some((account) => account.id === value);
  const fromValue = valid(from.value) ? from.value : (accounts.find((account) => account.id !== 'cash')?.id || accounts[0]?.id || "");
  const toValue = valid(to.value) && to.value !== fromValue ? to.value : (accounts.find((account) => account.id === 'cash' && account.id !== fromValue)?.id || accounts.find((account) => account.id !== fromValue)?.id || "");
  const fill = (select, selected, disabledId) => {
    select.innerHTML = "";
    if (!selected) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No other account available";
      select.appendChild(option);
    }
    accounts.forEach((account) => {
      const option = document.createElement("option");
      option.value = account.id;
      option.textContent = `${account.name} (${formatCurrency(account.balance)})`;
      option.disabled = account.id === disabledId;
      select.appendChild(option);
    });
    select.value = selected;
  };
  fill(from, fromValue, null);
  fill(to, toValue, fromValue);
  const type = document.getElementById("transactionType");
  const transferOption = type?.querySelector('option[value="transfer"]');
  if (transferOption) {
    transferOption.hidden = accounts.length < 2;
    transferOption.disabled = accounts.length < 2;
    if (accounts.length < 2 && type.value === "transfer") {
      type.value = "expense";
      if (typeof type.onchange === "function") type.onchange();
    }
  }
  if (!from.dataset.transferBound) {
    from.addEventListener("change", updateTransferAccountOptions);
    to.addEventListener("change", updateTransferAccountOptions);
    from.dataset.transferBound = "true";
  }
}

function populateDropdowns() {
  const ccPurchaseCategory = document.getElementById("ccPurchaseCategory");
  if (ccPurchaseCategory) {
    ccPurchaseCategory.innerHTML = ccPurchaseCategoryOptions(getCcPurchaseCategory({category: ccPurchaseCategory.value}));
  }
  const accountSelects = $$(
    'select[name="account"], select[name="receivableSourceAccount"], select[name="payDebtAccount"], select[name="recPaymentAccount"], select[name="instPayAccount"], select[name="ccPayFromAccount"], #modalAccount, #recSourceAccountAdd, #recSourceAccountEdit, #modalCcPayFromAccount, #modalInstPayAccount, #modalPayDebtAccount, #modalTransferFrom, #modalTransferTo'
  );
  const categorySelects = $$(
    "#category, #modalCategory, #modalPayDebtCategory, #modalInstPayCategory, #modalCcPayCategory"
  );

  const visibleAccounts = state.accounts.filter((acc) => !acc.hidden);

  accountSelects.forEach((s) => {
    if (!s) return;
    const currentValue = s.value;
    s.innerHTML = "";
    visibleAccounts.forEach((a) => {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = `${a.name} (${formatCurrency(a.balance)})`;
      s.appendChild(o);
    });

    if (Array.from(s.options).some((opt) => opt.value === currentValue)) {
      s.value = currentValue;
    } else if (s.options.length > 0) {
      if (s.id === "transferFrom" && s.options.length > 1) {
        s.value = s.options[1].value;
      } else {
        s.value = s.options[0].value;
      }
    }
  });
  updateTransferAccountOptions();

  const populateCategorySelect = (selectEl) => {
    if (!selectEl) return;
    const currentValue = selectEl.value;
    selectEl.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "---- Select Category ----";
    placeholderOption.disabled = true;

    selectEl.appendChild(placeholderOption);

    const otherCategoryName = "Other";
    let generalCategories = state.categories.filter(
      (c) =>
        c.toLowerCase() !== "income" &&
        c.toLowerCase() !== "credit card payment" &&
        c.toLowerCase() !== otherCategoryName.toLowerCase()
    );

    generalCategories.sort((a, b) => a.localeCompare(b));

    generalCategories.forEach((c) => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      selectEl.appendChild(o);
    });

    if (
      state.categories.some(
        (c) => c.toLowerCase() === otherCategoryName.toLowerCase()
      )
    ) {
      const otherOption = document.createElement("option");
      otherOption.value = otherCategoryName;
      otherOption.textContent = otherCategoryName;
      selectEl.appendChild(otherOption);
    }

    if (
      currentValue &&
      Array.from(selectEl.options).some(
        (opt) => opt.value === currentValue && opt.value !== ""
      )
    ) {
      selectEl.value = currentValue;
    } else if (
      selectEl.id === "modalPayDebtCategory" &&
      state.categories.includes("Debt Repayment")
    ) {
      selectEl.value = "Debt Repayment";
    } else {
      selectEl.value = "";
    }
  };

  categorySelects.forEach(populateCategorySelect);

  // Populate custom multi-select for Advanced Filters
  const filterDropdownMenu = $("#filterCategoryDropdown");
  if (filterDropdownMenu) {
    // Preserve previously checked categories
    const existingCheckboxes = filterDropdownMenu.querySelectorAll('input[type="checkbox"]:not([value="all"])');
    const checkedCategories = new Set(Array.from(existingCheckboxes).filter(cb => cb.checked).map(cb => cb.value));
    
    filterDropdownMenu.innerHTML = "";

    // Add "All Categories" option at the top
    const allLabel = document.createElement("label");
    allLabel.className = "group flex items-center gap-3 px-2 py-2 hover:bg-white/5 focus:bg-white/10 focus:outline-none cursor-pointer rounded text-sm text-gray-200 border-b border-gray-700/50 pb-2 mb-1 transition-colors";
    allLabel.tabIndex = 0;
    allLabel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const cb = allLabel.querySelector('input[type="checkbox"]');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Determine if "All" should be checked: if no specific categories were previously checked
    const isAllChecked = checkedCategories.size === 0;
    allLabel.innerHTML = `
      <input type="checkbox" id="filterCategoryAll" value="all" class="peer sr-only" ${isAllChecked ? "checked" : ""}>
      <div class="w-4 h-4 rounded border border-gray-500 peer-checked:border-accent-500 flex items-center justify-center transition-colors text-transparent peer-checked:text-accent-500">
          <svg class="w-3 h-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <span>All Categories</span>
    `;
    filterDropdownMenu.appendChild(allLabel);

    const generalCategories = state.categories.filter(
      (c) =>
        c.toLowerCase() !== "income" &&
        c.toLowerCase() !== "credit card payment"
    ).sort(compareCategoryNames);

    generalCategories.forEach((c) => {
      const label = document.createElement("label");
      label.className = "group flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 focus:bg-white/10 focus:outline-none cursor-pointer rounded text-sm text-gray-300 transition-colors";
      label.tabIndex = 0;
      label.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const cb = label.querySelector('input[type="checkbox"]');
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      const isChecked = checkedCategories.has(c);
      label.innerHTML = `
        <input type="checkbox" value="${escapeHTML(c)}" class="peer sr-only filter-category-checkbox" ${isChecked ? "checked" : ""}>
        <div class="w-4 h-4 rounded border border-gray-500 peer-checked:border-accent-500 flex items-center justify-center transition-colors text-transparent peer-checked:text-accent-500">
          <svg class="w-3 h-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <span>${escapeHTML(c)}</span>
      `;
      filterDropdownMenu.appendChild(label);
    });
  }
}

function isCategoryExcluded(categoryName, ruleKey) {
  if (!state.hiddenCategories?.includes(categoryName)) return false;
  return state.settings?.hiddenCategoryRules?.[ruleKey] === true;
}





// -------------
// --- KEYBOARD SHORTCUTS ---
// -------------

// --- BUDGET SORTING HELPERS ---
function getSortedBudgets() {
  if (!state.budgets || state.budgets.length === 0) return [];
  
  const sortOrder = state.settings?.budgetSortOrder || "added";
  const budgetsCopy = [...state.budgets];
  
  if (sortOrder === "added") {
    return budgetsCopy;
  }
  
  if (sortOrder === "alpha_asc") {
    return budgetsCopy.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  if (sortOrder === "limit_desc") {
    return budgetsCopy.sort((a, b) => b.limit - a.limit);
  }
  
  if (sortOrder === "limit_asc") {
    return budgetsCopy.sort((a, b) => a.limit - b.limit);
  }
  
  if (sortOrder === "percent_desc") {
    const currentMonthStr = getCurrentDateString().substring(0, 7);
    const spentMap = new Map();
    
    // Calculate spent amount for each budget in the current month
    budgetsCopy.forEach(b => {
      let spent = 0;
      if (b.categories && b.categories.length > 0) {
        state.transactions.forEach((t) => {
          if (t.type === "expense" && t.date.substring(0, 7) === currentMonthStr) {
            if (b.categories.includes(t.category)) {
              spent += t.amount;
            }
          }
        });
      }
      const percent = b.limit > 0 ? (spent / b.limit) * 100 : (spent > 0 ? 100 : 0);
      spentMap.set(b.id, percent);
    });
    
    return budgetsCopy.sort((a, b) => spentMap.get(b.id) - spentMap.get(a.id));
  }
  
  return budgetsCopy;
}
