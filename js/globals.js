/**
 * globals.js
 * Defines global variables, helper functions, utility methods, and default state structures.
 */
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const formatCurrency = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) amount = 0;
  return `LKR\u00A0${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
};
const generateId = () => "_" + Math.random().toString(36).substr(2, 9);
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

// --- NEW: SUPABASE CLIENT INITIALIZATION ---
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
    // console.warn(`Attempted to round non-number: ${num}. Returning 0.`);
    return 0; // Default to 0 if not a valid number
  }
  return parseFloat(num.toFixed(2));
};

function getCurrentDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getFormattedLocalStorageSize(key) {
  const item = localStorage.getItem(key);
  if (item === null) {
    return "N/A (No data found)";
  }

  const sizeInBytes = item.length;

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
          name: "Genie",
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
        theme: "dark",
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
        collapseCategoryBudgets: false,
        lastDismissedBudgetTipMonth: ""
      },
    })
  );
}

function openInitialSetupWizard() {
  const modal = $("#initialSetupModal");
  if (!modal) {
    console.error("Initial Setup Modal not found in HTML.");
    return;
  }
  console.log("Opening Initial Setup Wizard...");

  const accountsContainer = $("#setupAccountBalances");
  const defaultAccounts = getDefaultState().accounts;

  // Create a temporary state for setup that can be modified without saving
  let tempSetupAccounts = JSON.parse(JSON.stringify(defaultAccounts));

  const updateTempStateFromDOM = () => {
    tempSetupAccounts.forEach((acc) => {
      const nameInput = accountsContainer.querySelector(`#setupName-${acc.id}`);
      const balanceInput = accountsContainer.querySelector(
        `#setupBalance-${acc.id}`
      );

      if (nameInput && !nameInput.readOnly) {
        acc.name = nameInput.value.trim() || acc.name;
      }
      if (balanceInput) {
        const balanceValue = parseFloat(balanceInput.value);
        // Only update if it's a valid number, otherwise keep the old value
        if (!isNaN(balanceValue)) {
          // We don't round here, just store what the user typed. Rounding happens on final save.
          acc.balance = balanceValue;
        }
      }
    });
  };

  const renderSetupAccounts = () => {
    accountsContainer.innerHTML = "";
    tempSetupAccounts.forEach((acc) => {
      const accRow = document.createElement("div");
      // A consistent 3-column grid for all rows: Icon, Name, Balance
      accRow.className = `grid grid-cols-[auto,2fr,3fr] gap-x-3 items-center mb-2 account-row`;
      if (acc.hidden) {
        accRow.classList.add("account-row-hidden");
      }

      const inputStyle = `style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"`;

      // 1. Hide/Show Button
      const hideButton = document.createElement("button");
      hideButton.type = "button";
      hideButton.className = "btn-icon-hide justify-self-center";
      hideButton.dataset.accountId = acc.id;
      hideButton.innerHTML = `<i class="fas ${
        acc.hidden ? "fa-eye-slash" : "fa-eye"
      }"></i>`;

      hideButton.onclick = () => {
        updateTempStateFromDOM(); // Save current input values before re-rendering
        const accountToToggle = tempSetupAccounts.find(
          (a) => a.id === acc.id
        );
        if (accountToToggle) {
          accountToToggle.hidden = !accountToToggle.hidden;
          renderSetupAccounts(); // Re-render the list to reflect the change
        }
      };
      accRow.appendChild(hideButton);

      // 2. Name field (Label for Cash, Input for others)
      const nameWrapper = document.createElement("div");
      if (acc.id === "cash") {
        nameWrapper.innerHTML = `<label for="setupBalance-${acc.id}" class="text-sm font-medium text-gray-300 justify-self-start">${acc.name}</label>`;
      } else {
        nameWrapper.innerHTML = `<input type="text" id="setupName-${acc.id}" name="setupName-${acc.id}" value="${acc.name}" data-account-id="${acc.id}" class="!py-1.5 !px-2 text-sm w-full rounded placeholder-gray-400" ${inputStyle} placeholder="Account Name">`;
      }
      accRow.appendChild(nameWrapper);

      // 3. Balance field (Input for all)
      const balanceWrapper = document.createElement("div");
      const balanceValue =
        acc.balance !== 0 || acc.id === "cash" ? acc.balance.toString() : "";
      balanceWrapper.innerHTML = `<input type="text" inputmode="decimal" class="calc-amount" id="setupBalance-${acc.id}" name="setupBalance-${acc.id}" value="${balanceValue}" data-account-id="${acc.id}" step="0.01" placeholder="0.00 (Optional)" class="!py-1.5 !px-2 text-sm w-full rounded placeholder-gray-400" ${inputStyle}>`;
      accRow.appendChild(balanceWrapper);

      accountsContainer.appendChild(accRow);
    });
  };

  renderSetupAccounts();

  const setupEnableCcToggle = $("#setupEnableCc");
  const setupCcLimitGroup = $("#setupCcLimitGroup");
  const setupCcLimitInput = $("#setupCcLimit");
  if (setupEnableCcToggle && setupCcLimitGroup && setupCcLimitInput) {
    setupEnableCcToggle.checked = true;
    setupCcLimitGroup.style.display = "block";
    setupCcLimitInput.required = true;
    setupCcLimitInput.style.backgroundColor = "var(--bg-secondary)";
    setupCcLimitInput.style.borderColor = "var(--border-color)";
    setupCcLimitInput.style.color = "var(--text-primary)";

    setupEnableCcToggle.onchange = () => {
      if (setupEnableCcToggle.checked) {
        setupCcLimitGroup.style.display = "block";
        setupCcLimitInput.required = true;
      } else {
        setupCcLimitGroup.style.display = "none";
        setupCcLimitInput.required = false;
        setupCcLimitInput.value = "";
      }
    };
  }

  const categoriesContainer = $("#setupCategoriesList");
  const newCategoryInputForSetup = $("#setupNewCategoryName");
  const addCategoryBtn = $("#setupAddCategoryBtn");
  let currentSetupCategories = [...getDefaultState().categories];

  if (newCategoryInputForSetup) {
    newCategoryInputForSetup.style.backgroundColor = "var(--bg-secondary)";
    newCategoryInputForSetup.style.borderColor = "var(--border-color)";
    newCategoryInputForSetup.style.color = "var(--text-primary)";
  }

  const renderSetupCategories = () => {
    if (!categoriesContainer) return;
    categoriesContainer.innerHTML = "";
    currentSetupCategories
      .sort((a, b) => a.localeCompare(b))
      .forEach((cat) => {
        const div = document.createElement("div");

        div.className = "flex justify-between items-center p-2 rounded text-sm";
        div.style.backgroundColor = "var(--bg-secondary)";
        div.style.borderColor = "var(--border-color)";
        div.style.borderWidth = "1px";

        div.innerHTML = `
              <span>${cat}</span>
              <button type="button" class="text-red-400 hover:text-red-300 text-xs ml-2" data-category-name="${cat}" title="Remove">
                  <i class="fas fa-times"></i>
              </button>
          `;
        div.querySelector("button").onclick = (e) => {
          const catNameToRemove = e.currentTarget.dataset.categoryName;
          currentSetupCategories = currentSetupCategories.filter(
            (c) => c !== catNameToRemove
          );
          renderSetupCategories();
        };
        categoriesContainer.appendChild(div);
      });
  };

  if (addCategoryBtn) {
    addCategoryBtn.onclick = () => {
      const newCat = newCategoryInputForSetup.value.trim();
      if (
        newCat &&
        !currentSetupCategories.some(
          (c) => c.toLowerCase() === newCat.toLowerCase()
        )
      ) {
        currentSetupCategories.push(newCat);
        renderSetupCategories();
        newCategoryInputForSetup.value = "";
      } else if (newCat) {
        showNotification(`Category "${newCat}" already exists.`, "warning");
      }
      newCategoryInputForSetup.focus();
    };
  }
  if (newCategoryInputForSetup) {
    newCategoryInputForSetup.onkeypress = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (addCategoryBtn) addCategoryBtn.click();
      }
    };
  }
  renderSetupCategories();

  $("#initialSetupForm").onsubmit = (event) => {
    updateTempStateFromDOM(); // Final save of values before submitting
    handleInitialSetupSubmit(event, tempSetupAccounts);
  };
  $("#setupImportInput").onchange = handleSetupImport;

  const cloudLoginBtn = $("#setupCloudLoginBtn");
  if (cloudLoginBtn) {
    cloudLoginBtn.onclick = () => {
      if (typeof signInWithGoogle === "function") {
        signInWithGoogle();
      }
    };
  }

  modal.style.display = "block";
  displayAppVersion();
}

function handleInitialSetupSubmit(event, tempSetupAccounts) {
  event.preventDefault();
  console.log("Handling initial setup form submission...");
  let newState = getDefaultState();

  newState.accounts = tempSetupAccounts.map((acc) => {
    const nameInput = $(`#setupName-${acc.id}`);
    const balanceInput = $(`#setupBalance-${acc.id}`);

    let finalName = acc.name;
    if (acc.id !== "cash" && nameInput) {
      const enteredName = nameInput.value.trim();
      if (enteredName) {
        finalName = enteredName;
      }
    }

    let balance = 0;
    if (balanceInput) {
      const balanceStr = balanceInput.value.trim();
      if (balanceStr !== "" && balanceStr !== null) {
        const parsedBalance = parseFloat(balanceStr);
        balance = isNaN(parsedBalance) ? 0 : parsedBalance;
      }
    }

    return {
      id: acc.id,
      name: finalName,
      balance: roundToTwoDecimals(balance),
      hidden: acc.hidden, // Capture the hidden state
    };
  });

  const ccEnabled = $("#setupEnableCc").checked;
  newState.settings.showCcDashboardSection = ccEnabled;
  if (ccEnabled) {
    const ccLimitStr = $("#setupCcLimit").value.trim();
    if (ccLimitStr === "" || ccLimitStr === null) {
      newState.creditCard.limit = 0;
    } else {
      const limit = parseFloat(ccLimitStr);
      newState.creditCard.limit = roundToTwoDecimals(
        isNaN(limit) || limit < 0 ? 0 : limit
      );
    }
  } else {
    newState.creditCard.limit = 0;
  }

  const finalCategories = [];
  $$("#setupCategoriesList span").forEach((span) =>
    finalCategories.push(span.textContent)
  );
  newState.categories =
    finalCategories.length > 0
      ? finalCategories.sort((a, b) => a.localeCompare(b))
      : getDefaultState().categories;
  newState.settings.initialSetupDone = true;
  state = newState;
  saveData();
  closeModal("initialSetupModal");
  initializeUI(true);
  showNotification("Setup complete! Welcome to Kaasi.", "success", 5000);
}

function handleSetupImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("Importing data from setup wizard...");
  const reader = new FileReader();
  reader.onload = (e) => {
    let importedData;
    try {
      importedData = JSON.parse(e.target.result);
      if (importedData && typeof importedData === "object") {
        // Sanitize and round all monetary values in importedData
        if (Array.isArray(importedData.transactions)) {
          importedData.transactions.forEach((t) => {
            if (typeof t.amount === "number")
              t.amount = roundToTwoDecimals(t.amount);
          });
        }
        if (Array.isArray(importedData.accounts)) {
          importedData.accounts.forEach((acc) => {
            if (typeof acc.balance === "number")
              acc.balance = roundToTwoDecimals(acc.balance);
          });
        }
        if (Array.isArray(importedData.debts)) {
          importedData.debts.forEach((d) => {
            if (typeof d.amount === "number")
              d.amount = roundToTwoDecimals(d.amount);
            if (typeof d.originalAmount === "number")
              d.originalAmount = roundToTwoDecimals(d.originalAmount);
            if (typeof d.remainingAmount === "number")
              d.remainingAmount = roundToTwoDecimals(d.remainingAmount);
          });
        }
        if (Array.isArray(importedData.receivables)) {
          importedData.receivables.forEach((r) => {
            if (typeof r.amount === "number")
              r.amount = roundToTwoDecimals(r.amount);
            if (typeof r.originalAmount === "number")
              r.originalAmount = roundToTwoDecimals(r.originalAmount);
            if (typeof r.remainingAmount === "number")
              r.remainingAmount = roundToTwoDecimals(r.remainingAmount);
          });
        }
        if (Array.isArray(importedData.installments)) {
          importedData.installments.forEach((i) => {
            if (typeof i.monthlyAmount === "number")
              i.monthlyAmount = roundToTwoDecimals(i.monthlyAmount);
            if (typeof i.originalFullAmount === "number")
              i.originalFullAmount = roundToTwoDecimals(i.originalFullAmount);
          });
        }
        if (
          importedData.creditCard &&
          typeof importedData.creditCard === "object"
        ) {
          if (typeof importedData.creditCard.limit === "number") {
            importedData.creditCard.limit = roundToTwoDecimals(
              importedData.creditCard.limit
            );
          }
          if (Array.isArray(importedData.creditCard.transactions)) {
            importedData.creditCard.transactions.forEach((ccTrans) => {
              if (typeof ccTrans.amount === "number")
                ccTrans.amount = roundToTwoDecimals(ccTrans.amount);
              if (typeof ccTrans.paidAmount === "number")
                ccTrans.paidAmount = roundToTwoDecimals(ccTrans.paidAmount);
            });
          }
        }

        // Merge sanitized data
        state = getDefaultState(); // Start with a fresh default structure
        state = deepMerge(state, importedData); // Merge sanitized imported data

        // Ensure essential structures and perform final rounding post-merge
        ensureDefaultAccounts();
        ensureDefaultCategories();
        state.accounts.forEach((acc) => {
          if (isNaN(acc.balance) || typeof acc.balance !== "number")
            acc.balance = 0;
          else acc.balance = roundToTwoDecimals(acc.balance);
        });
        if (state.creditCard) {
          if (
            isNaN(state.creditCard.limit) ||
            typeof state.creditCard.limit !== "number"
          )
            state.creditCard.limit = 0;
          else
            state.creditCard.limit = roundToTwoDecimals(state.creditCard.limit);
          if (Array.isArray(state.creditCard.transactions)) {
            state.creditCard.transactions.forEach((t) => {
              if (typeof t.amount === "number")
                t.amount = roundToTwoDecimals(t.amount);
              if (typeof t.paidAmount === "number")
                t.paidAmount = roundToTwoDecimals(t.paidAmount);
              else t.paidAmount = 0;
            });
          } else {
            state.creditCard.transactions = [];
          }
        } else {
          state.creditCard = { limit: 0, transactions: [] };
        }

        if (!state.settings) state.settings = getDefaultState().settings;
        state.settings.initialSetupDone = true; // Mark setup as done

        saveData();
        closeModal("initialSetupModal");
        initializeUI(true); // Full refresh
        showNotification(
          "Data imported and sanitized successfully from setup wizard!",
          "success"
        );
      } else {
        throw new Error("Invalid data structure in imported file.");
      }
    } catch (error) {
      console.error("Import failed during setup:", error);
      showNotification(
        `Import failed: ${error.message}. Please try manual setup or a valid file.`,
        "error",
        10000
      );
    } finally {
      event.target.value = null; // Clear the file input
    }
  };
  reader.onerror = () => {
    showNotification("Failed to read the import file.", "error");
    event.target.value = null;
  };
  reader.readAsText(file);
}

const STORAGE_KEY = "KaasiData";

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem("lastLocalDataModification", Date.now().toString());
    
    // --- NEW: Refresh cloud sync UI status when local data is modified ---
    // Update window.currentCloudSyncStatus to local_newer immediately
    const lastLocalCloudSync = parseInt(localStorage.getItem("lastLocalCloudSync") || "0", 10);
    const lastLocalDataModification = Date.now();
    if (lastLocalDataModification > lastLocalCloudSync + 2000) {
      if (window.currentCloudSyncStatus === "synced") {
         window.currentCloudSyncStatus = "local_newer";
      }
    }
    if (typeof updateHeaderShortcutButtons === "function") {
      updateHeaderShortcutButtons();
    }
    // --- END NEW ---
    
    console.log("Data saved successfully.");
  } catch (e) {
    console.error("Error saving data to localStorage:", e);
    if (e.name === "QuotaExceededError") {
      showNotification(
        "Error: Local storage quota exceeded. Data is too large to save.",
        "error",
        10000
      );
    } else {
      showNotification("Error saving data. Check console.", "error", 10000);
    }
  }
}

function loadData() {
  const d = localStorage.getItem(STORAGE_KEY);
  let parsedData = null;

  if (d) {
    console.log("Uncompressed data found. Attempting to parse...");
    try {
      parsedData = JSON.parse(d);
    } catch (e) {
      console.error("Error parsing data from localStorage:", e);

      showNotification(
        "Error loading data. Data might be corrupted. Starting fresh.",
        "error",
        8000
      );
    }
  }

  state = getDefaultState();

  if (parsedData && typeof parsedData === "object") {
    console.log("Merging loaded data into default state structure...");

    state = deepMerge(state, parsedData);
    console.log("Data merged successfully.");
  } else if (d && !parsedData) {
    console.log(
      "Previous data existed but was unparsable. Using fresh default state."
    );
  } else {
    console.log(
      "No saved data found or data was null/invalid. Starting with fresh default state."
    );
  }

  const defaultStateTemplate = getDefaultState();

  if (!state.settings || typeof state.settings !== "object") {
    console.warn(
      "State.settings was missing or invalid after merge. Resetting to default settings structure."
    );
    state.settings = { ...defaultStateTemplate.settings };
  } else {
    for (const settingKey in defaultStateTemplate.settings) {
      if (state.settings[settingKey] === undefined) {
        state.settings[settingKey] = defaultStateTemplate.settings[settingKey];
      }
    }
    
    // Ensure hiddenCategoryRules is initialized
    if (!state.settings.hiddenCategoryRules || typeof state.settings.hiddenCategoryRules !== "object") {
      state.settings.hiddenCategoryRules = { ...defaultStateTemplate.settings.hiddenCategoryRules };
    } else {
      for (const rule in defaultStateTemplate.settings.hiddenCategoryRules) {
        if (state.settings.hiddenCategoryRules[rule] === undefined) {
          state.settings.hiddenCategoryRules[rule] = defaultStateTemplate.settings.hiddenCategoryRules[rule];
        }
      }
    }
  }

  if (!state.creditCard || typeof state.creditCard !== "object") {
    console.warn(
      "State.creditCard was missing or invalid after merge. Resetting to default creditCard structure."
    );
    state.creditCard = { ...defaultStateTemplate.creditCard };
    if (!Array.isArray(state.creditCard.transactions)) {
      state.creditCard.transactions = [];
    }
  } else {
    for (const ccKey in defaultStateTemplate.creditCard) {
      if (state.creditCard[ccKey] === undefined) {
        state.creditCard[ccKey] = defaultStateTemplate.creditCard[ccKey];
      }
    }
    if (!Array.isArray(state.creditCard.transactions)) {
      state.creditCard.transactions = [];
    }
  }

  if (!Array.isArray(state.hiddenCategories)) {
    state.hiddenCategories = [];
  }
  
  if (state.categorySettings !== undefined) {
    delete state.categorySettings; // Cleanup old state structure
  }

  if (!Array.isArray(state.transactions)) state.transactions = [];
  if (!Array.isArray(state.accounts)) state.accounts = [];
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!Array.isArray(state.debts)) state.debts = [];
  if (!Array.isArray(state.receivables)) state.receivables = [];
  if (!Array.isArray(state.installments)) state.installments = [];
  if (!Array.isArray(state.budgets)) state.budgets = [];

  ensureDefaultAccounts();
  ensureDefaultCategories();

  state.accounts.forEach((a) => {
    if (isNaN(a.balance) || typeof a.balance !== "number") a.balance = 0;
  });

  if (
    isNaN(state.creditCard.limit) ||
    typeof state.creditCard.limit !== "number"
  )
    state.creditCard.limit = 0;
  state.creditCard.transactions.forEach((t) => {
    if (t.paidAmount === undefined || typeof t.paidAmount !== "number")
      t.paidAmount = 0;
    if (t.paidOff === undefined) t.paidOff = t.paidAmount >= t.amount - 0.005;
    if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
  });

  state.transactions.forEach((t) => {
    if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
  });

  state.debts.forEach((item) => {
    if (!item.timestamp) item.timestamp = new Date(item.dueDate).getTime();
    if (item.originalAmount === undefined) item.originalAmount = item.amount;
  });

  state.receivables.forEach((item) => {
    if (!item.timestamp) item.timestamp = new Date(item.dateGiven).getTime();
    if (item.originalAmount === undefined) item.originalAmount = item.amount;
  });

  state.installments.forEach((item) => {
    if (!item.timestamp) item.timestamp = new Date(item.startDate).getTime();
  });

  console.log(
    "Final state after loadData and integrity checks:",
    JSON.parse(JSON.stringify(state))
  );
}

function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
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

function ensureDefaultAccounts() {
  const defaultAccounts = getDefaultState().accounts;
  if (!Array.isArray(state.accounts)) {
    console.warn(
      "state.accounts was not an array. Resetting to default accounts structure."
    );
    state.accounts = JSON.parse(JSON.stringify(defaultAccounts));

    state.accounts.forEach((acc) => (acc.balance = 0));
    return;
  }

  defaultAccounts.forEach((defaultAcc) => {
    const existingAccount = state.accounts.find(
      (acc) => acc.id === defaultAcc.id
    );
    if (!existingAccount) {
      console.warn(
        `Default account '${defaultAcc.name}' (ID: ${defaultAcc.id}) was missing. Adding it.`
      );
      state.accounts.push({
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

function ensureDefaultCategories() {
  const defaultCategories = getDefaultState().categories;

  if (!state.categories || !Array.isArray(state.categories)) {
    console.warn(
      "state.categories was missing or not an array. Initializing as empty array."
    );
    state.categories = [];
  }

  if (state.categories.length === 0) {
    console.warn(
      "state.categories is empty. Populating with default categories."
    );
    state.categories = JSON.parse(JSON.stringify(defaultCategories));
  }

  state.categories.sort((a, b) => a.localeCompare(b));

  const otherCategory = "Other";
  if (
    !state.categories.some(
      (cat) => cat.toLowerCase() === otherCategory.toLowerCase()
    )
  ) {
    console.warn("'Other' category was missing. Adding it back.");
    state.categories.push(otherCategory);
    state.categories.sort((a, b) => a.localeCompare(b));
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
  let bg, tc;
  switch (type) {
    case "error":
      bg = "bg-red-600";
      tc = "text-white";
      break;
    case "warning":
      bg = "bg-yellow-500";
      tc = "text-black";
      break;
    case "info":
      bg = "bg-blue-500";
      tc = "text-white";
      break;
    default:
      bg = "bg-green-600";
      tc = "text-white";
      break;
  }

  // Add the new class along with existing classes
  n.className = `p-3 rounded-md shadow-lg text-sm font-medium transition-all duration-300 ease-in-out transform translate-x-full opacity-0 force-word-wrap ${bg} ${tc}`;

  n.textContent = message;
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

function populateDropdowns() {
  const accountSelects = $$(
    'select[name="account"], select[name="transferFrom"], select[name="transferTo"], select[name="receivableSourceAccount"], select[name="payDebtAccount"], select[name="recPaymentAccount"], select[name="instPayAccount"], select[name="ccPayFromAccount"], #modalAccount, #recSourceAccountAdd, #recSourceAccountEdit, #modalCcPayFromAccount, #modalInstPayAccount, #modalPayDebtAccount, #modalTransferFrom, #modalTransferTo'
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
      // If previous selection is now hidden, default to first visible account
      s.value = s.options[0].value;
    }
  });

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
    allLabel.className = "group flex items-center gap-3 px-2 py-2 hover:bg-white/5 cursor-pointer rounded text-sm text-gray-200 border-b border-gray-700/50 pb-2 mb-1 transition-colors";
    
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
    ).sort((a, b) => a.localeCompare(b));

    generalCategories.forEach((c) => {
      const label = document.createElement("label");
      label.className = "group flex items-center gap-3 px-2 py-1.5 hover:bg-white/5 cursor-pointer rounded text-sm text-gray-300 transition-colors";
      const isChecked = checkedCategories.has(c);
      label.innerHTML = `
        <input type="checkbox" value="${c}" class="peer sr-only filter-category-checkbox" ${isChecked ? "checked" : ""}>
        <div class="w-4 h-4 rounded border border-gray-500 peer-checked:border-accent-500 flex items-center justify-center transition-colors text-transparent peer-checked:text-accent-500">
          <svg class="w-3 h-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <span>${c}</span>
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


