const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const formatCurrency = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) amount = 0;
  return `LKR ${amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")}`;
};
const generateId = () => "_" + Math.random().toString(36).substr(2, 9);
const getDaysLeft = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

// --- NEW: SUPABASE CLIENT INITIALIZATION ---
const SUPABASE_URL = "https://xcnirqsctkyyrvildqtm.supabase.co";
const SUPABASE_KEY = "sb_publishable_cLW_C5L7xmIinyzSaKSmBQ_EFnjbntg"; // Your publishable key

let supabase = null;
try {
  // Use window.supabase.createClient, as the library is from a CDN
  if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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

function toggleCategoryVisibilityInModal(
  selectElement,
  categoryGroupId,
  categorySelectId
) {
  const categoryGroup = document.getElementById(categoryGroupId);
  const categorySelect = document.getElementById(categorySelectId);

  const descriptionInput =
    selectElement.form.elements["description"] ||
    selectElement.form.elements["modalDescription"] ||
    selectElement.form.elements["ccDescription"] ||
    selectElement.form.elements["modalCcDescription"];

  if (selectElement.value === "income") {
    if (categoryGroup) categoryGroup.style.display = "none";
    if (categorySelect) categorySelect.required = false;
    if (descriptionInput) descriptionInput.placeholder = "e.g., Monthly Salary";
  } else {
    if (categoryGroup) categoryGroup.style.display = "block";
    if (categorySelect) categorySelect.required = true;
    if (descriptionInput)
      descriptionInput.placeholder = "e.g., Lunch, Groceries";
  }
}

let state = {};
let dashboardChartState = "yearly";
let monthlyViewSearchScope = "month";
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
      settings: {
        initialSetupDone: false,
        showCcDashboardSection: true,
        theme: "dark",
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

      if (acc.id === "cash") {
        hideButton.disabled = true;
        hideButton.style.opacity = "0.3";
        hideButton.style.cursor = "not-allowed";
      } else {
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
      }
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
      balanceWrapper.innerHTML = `<input type="number" id="setupBalance-${acc.id}" name="setupBalance-${acc.id}" value="${balanceValue}" data-account-id="${acc.id}" step="0.01" placeholder="0.00 (Optional)" class="!py-1.5 !px-2 text-sm w-full rounded placeholder-gray-400" ${inputStyle}>`;
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

  if (!Array.isArray(state.transactions)) state.transactions = [];
  if (!Array.isArray(state.accounts)) state.accounts = [];
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!Array.isArray(state.debts)) state.debts = [];
  if (!Array.isArray(state.receivables)) state.receivables = [];
  if (!Array.isArray(state.installments)) state.installments = [];

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

function showNotification(message, type = "success", duration = 4000) {
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

    if (selectEl.id === "modalPayDebtCategory") {
      const debtRepaymentCategory = "Debt Repayment";
      if (
        !generalCategories.includes(debtRepaymentCategory) &&
        !state.categories.some(
          (c) => c.toLowerCase() === debtRepaymentCategory.toLowerCase()
        )
      ) {
      }
    }

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
}

function renderDashboard() {
  const visibleAccounts = state.accounts.filter((acc) => !acc.hidden);
  const accountCardsContainer = $("#accountCardsContainer");
  accountCardsContainer.innerHTML = ""; // Clear previous cards

  let totalBalance = 0;
  state.accounts.forEach((acc) => {
    totalBalance += acc.balance; // Calculate total balance from ALL accounts
  });

  // Refined logic for showing/hiding the cash card
  const shouldShowAccountCards = !(
    visibleAccounts.length === 1 &&
    visibleAccounts[0].id === "cash" &&
    Math.abs(visibleAccounts[0].balance - totalBalance) < 0.01
  );

  if (shouldShowAccountCards) {
    accountCardsContainer.style.display = "grid";
    // Dynamically adjust grid columns based on the number of visible accounts
    switch (visibleAccounts.length) {
      case 1:
        accountCardsContainer.className = "grid grid-cols-1 gap-3 text-center";
        break;
      case 2:
        accountCardsContainer.className =
          "grid grid-cols-1 md:grid-cols-2 gap-3 text-center";
        break;
      case 3:
        accountCardsContainer.className =
          "grid grid-cols-1 md:grid-cols-3 gap-3 text-center";
        break;
      case 4:
      default:
        accountCardsContainer.className =
          "grid grid-cols-2 md:grid-cols-4 gap-3 text-center";
        break;
    }

    visibleAccounts.forEach((acc) => {
      const card = document.createElement("div");
      card.id = `accountBalance-${acc.id}`;
      card.className = "bg-gray-600 p-3 rounded";
      card.innerHTML = `
        <p class="text-xs font-medium text-gray-300 truncate">${acc.name}</p>
        <p class="font-semibold text-sm tabular-nums">${formatCurrency(
          acc.balance
        )}</p>
      `;
      accountCardsContainer.appendChild(card);
    });
  } else {
    // Hide the container if the special condition is met
    accountCardsContainer.style.display = "none";
  }

  $("#totalBalance").innerHTML = `<span class="tabular-nums">${formatCurrency(
    totalBalance
  )}</span>`;
  const cashRecTotal = state.receivables
    .filter((r) => r.type === "cash" || (r.type === "cc" && r.sourceAccount))
    .reduce((s, r) => s + r.remainingAmount, 0);
  $(
    "#totalPotentialBalance"
  ).innerHTML = `<span class="tabular-nums">${formatCurrency(
    totalBalance + cashRecTotal
  )}</span>`;
  $(
    "#totalOwedToMe"
  ).innerHTML = `Total: <span class="tabular-nums">${formatCurrency(
    state.receivables.reduce((s, r) => s + r.remainingAmount, 0)
  )}</span>`;
  $(
    "#totalOwed"
  ).innerHTML = `Total: <span class="tabular-nums">${formatCurrency(
    state.debts.reduce((s, d) => s + d.remainingAmount, 0)
  )}</span>`;
  $(
    "#totalInstallmentsLeft"
  ).innerHTML = `Total Left: <span class="tabular-nums">${formatCurrency(
    state.installments.reduce((s, i) => s + i.monthlyAmount * i.monthsLeft, 0)
  )}</span>`;
  renderRecentTransactions();
  renderDebtList();
  renderReceivableList();
  renderInstallmentList();
  renderCreditCardSection();
  renderMonthlyOverviewChart();
  renderYearlyAndQuickStats();
}

function renderYearlyAndQuickStats() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  // --- Logic for Rolling 7-Day Periods ---
  const todayEnd = new Date(now); // Capture current time for today
  todayEnd.setHours(23, 59, 59, 999); // End of today

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0); // Start of today

  // Current 7-day period (Past 7 Days including today)
  const currentPeriodEnd = new Date(todayEnd);
  const currentPeriodStart = new Date(todayEnd);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 6); // Go back 6 days to get a 7-day window
  currentPeriodStart.setHours(0, 0, 0, 0);

  // Previous 7-day period
  const previousPeriodEnd = new Date(currentPeriodStart);
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1); // Day before the current 7-day period starts
  previousPeriodEnd.setHours(23, 59, 59, 999);
  const previousPeriodStart = new Date(previousPeriodEnd);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 6); // Go back 6 days from its end
  previousPeriodStart.setHours(0, 0, 0, 0);

  // --- Logic for "Today" vs "Yesterday" ---
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  // yesterdayEnd is effectively the moment just before todayStart

  let yearlyEarned = 0;
  let yearlySpent = 0;
  let current7DaysSpent = 0;
  let previous7DaysSpent = 0;
  let todaySpent = 0;
  let yesterdaySpent = 0;

  state.transactions.forEach((t) => {
    const transactionDate = new Date(t.date); // Assuming t.date is "YYYY-MM-DD"
    if (isNaN(transactionDate.getTime())) return;

    // To ensure fair date comparison, set time to midday for date-only comparisons
    // or use the start/end of day variables defined above for period checks.
    const tDateForPeriodChecks = new Date(transactionDate);
    tDateForPeriodChecks.setHours(12, 0, 0, 0); // Midday to avoid timezone issues with just date part

    // Yearly totals
    if (
      tDateForPeriodChecks >= startOfYear &&
      tDateForPeriodChecks.getFullYear() === currentYear
    ) {
      if (t.type === "income") yearlyEarned += t.amount;
      if (t.type === "expense") yearlySpent += t.amount;
    }

    if (t.type === "expense") {
      // Current 7-day period spending
      if (
        tDateForPeriodChecks >= currentPeriodStart &&
        tDateForPeriodChecks <= currentPeriodEnd
      ) {
        current7DaysSpent += t.amount;
      }
      // Previous 7-day period spending
      if (
        tDateForPeriodChecks >= previousPeriodStart &&
        tDateForPeriodChecks <= previousPeriodEnd
      ) {
        previous7DaysSpent += t.amount;
      }
      // Today's spending
      if (
        tDateForPeriodChecks >= todayStart &&
        tDateForPeriodChecks <= todayEnd
      ) {
        todaySpent += t.amount;
      }
      // Yesterday's spending
      if (
        tDateForPeriodChecks >= yesterdayStart &&
        tDateForPeriodChecks < todayStart
      ) {
        // up to, but not including, todayStart
        yesterdaySpent += t.amount;
      }
    }
  });

  $("#yearlyTotals").textContent = `Yearly: Earned ${formatCurrency(
    yearlyEarned
  )} / Spent ${formatCurrency(yearlySpent)}`;

  const quickStatsEl = $("#quickStats");
  // Update text to "Past 7 Days"
  quickStatsEl.innerHTML = `Today: ${formatCurrency(
    todaySpent
  )} <span id="todaySpendingIndicator"></span> | Past 7 Days: ${formatCurrency(
    current7DaysSpent
  )} <span id="weekSpendingIndicator"></span>`; // ID "weekSpendingIndicator" is kept for now, but refers to 7-day period

  const todayIndicator = $("#todaySpendingIndicator");
  if (todaySpent > yesterdaySpent && yesterdaySpent >= 0) {
    // Check yesterdaySpent >= 0 to avoid showing arrow if no data for yesterday
    todayIndicator.innerHTML = `<i class="fas fa-arrow-up text-indicator-bad spending-indicator" title="More than yesterday (${formatCurrency(
      yesterdaySpent
    )})"></i>`;
  } else if (todaySpent < yesterdaySpent && yesterdaySpent > 0) {
    // Check yesterdaySpent > 0
    todayIndicator.innerHTML = `<i class="fas fa-arrow-down text-indicator-good spending-indicator" title="Less than yesterday (${formatCurrency(
      yesterdaySpent
    )})"></i>`;
  } else {
    todayIndicator.innerHTML = ""; // No indicator if same or no comparison data
  }

  const sevenDayIndicator = $("#weekSpendingIndicator"); // This now compares rolling 7-day periods
  if (current7DaysSpent > previous7DaysSpent && previous7DaysSpent >= 0) {
    sevenDayIndicator.innerHTML = `<i class="fas fa-arrow-up text-indicator-bad spending-indicator" title="More than previous 7 days (${formatCurrency(
      previous7DaysSpent
    )})"></i>`;
  } else if (current7DaysSpent < previous7DaysSpent && previous7DaysSpent > 0) {
    sevenDayIndicator.innerHTML = `<i class="fas fa-arrow-down text-indicator-good spending-indicator" title="Less than previous 7 days (${formatCurrency(
      previous7DaysSpent
    )})"></i>`;
  } else {
    sevenDayIndicator.innerHTML = "";
  }
}

// -------------
// --- KEYBOARD SHORTCUTS ---
// -------------

function openShortcutsHelpModal() {
  const modal = $("#shortcutsHelpModal");
  const contentList = $("#shortcutsList");

  if (!modal || !contentList) {
    console.error("Shortcut help modal elements not found!");
    showNotification("Could not display shortcuts help.", "error");
    return;
  }

  // Define your shortcuts here.
  const shortcuts = [
    { key: "-", action: "Start an Expense Transaction." },
    { key: "+", action: "Start an Income Transaction." },
    { key: "M", action: "Open Monthly Breakdown." },
    { key: "S", action: "Open Settings (In Dashboard)." },
    { key: "S", action: "Start Search (In Monthly Breakdown)." },
    { key: "C", action: "Start a CC Transaction." },
    { key: "D", action: "View All Debts." },
    { key: "R", action: "View All Receivables." },
    { key: "T", action: "Transfer Money." },
    { key: "Ctrl + E", action: "Export Data." },
    { key: "Ctrl + I", action: "Import Data." },
    { key: "← / →", action: "Navigate Month Tabs in Breakdown." },
  ];

  contentList.innerHTML = ""; // Clear previous list

  shortcuts.forEach((shortcut) => {
    const li = document.createElement("li");
    li.className =
      "flex justify-between items-center py-2 px-1 border-b border-gray-700 last:border-b-0";

    const keySpan = document.createElement("span");
    keySpan.className = "font-semibold text-accent-primary w-1/3"; // Key takes up roughly 1/3
    keySpan.textContent = shortcut.key;

    const actionSpan = document.createElement("span");
    actionSpan.className = "text-gray-300 text-sm text-left flex-grow px-2"; // Action takes up most space
    actionSpan.textContent = shortcut.action;

    const contextSpan = document.createElement("span");
    contextSpan.className = "text-xs text-gray-500 text-right w-1/4 italic"; // Context takes up roughly 1/4
    contextSpan.textContent = shortcut.context || "";

    li.appendChild(keySpan);
    li.appendChild(actionSpan);
    if (shortcut.context) {
      // Only add context if it exists
      li.appendChild(contextSpan);
    }

    contentList.appendChild(li);
  });

  modal.style.display = "block";
}

function handleKeyboardShortcuts(event) {
  const activeElement = document.activeElement;
  const inInputField =
    activeElement &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "SELECT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable);

  // Check for modifier keys for single-character shortcuts
  const modifierKeyPressed = event.ctrlKey || event.altKey || event.metaKey;

  const monthlyViewModalVisible =
    $("#monthlyViewModal")?.style.display === "block";
  const settingsModalVisible = $("#settingsModal")?.style.display === "block";
  const transferModalVisible =
    $("#transferMoneyModal")?.style.display === "block";
  const debtsModalVisible = $("#debtsViewModal")?.style.display === "block";
  const receivablesModalVisible =
    $("#receivablesViewModal")?.style.display === "block";

  // --- MODIFIED: Ctrl+E for Export ---
  if (event.ctrlKey && (event.key === "e" || event.key === "E")) {
    if (!inInputField) {
      event.preventDefault();
      const target =
        $("#shortcutCloud")?.checked && !$("#shortcutCloud")?.disabled
          ? "cloud"
          : "local";

      if (target === "cloud") {
        console.log("Shortcut: Ctrl+E pressed for Cloud Backup");
        backupToSupabase();
      } else {
        console.log("Shortcut: Ctrl+E pressed for Local Export");
        exportData();
      }
    }
    return; // Consume the event
  }

  // --- MODIFIED: Ctrl+I for Import ---
  if (event.ctrlKey && (event.key === "i" || event.key === "I")) {
    if (!inInputField) {
      event.preventDefault();
      const target =
        $("#shortcutCloud")?.checked && !$("#shortcutCloud")?.disabled
          ? "cloud"
          : "local";

      if (target === "cloud") {
        console.log("Shortcut: Ctrl+I pressed for Cloud Restore");
        restoreFromSupabase();
      } else {
        console.log("Shortcut: Ctrl+I pressed for Local Import");
        const importInput = $("#importDataInput");
        if (importInput) {
          // Ensure settings modal is open and on the correct tab
          const settingsModal = $("#settingsModal");
          if (settingsModal && settingsModal.style.display !== "block") {
            openSettingsModal();
            setTimeout(() => {
              const dataTabButton = Array.from(
                $$("#settingsTabsContainer button")
              ).find((btn) => btn.textContent === "Data");
              if (dataTabButton) dataTabButton.click();
              importInput.click();
            }, 100);
          } else if (settingsModal) {
            const dataTabButton = Array.from(
              $$("#settingsTabsContainer button")
            ).find((btn) => btn.textContent === "Data");
            if (dataTabButton) dataTabButton.click();
            importInput.click();
          } else {
            importInput.click(); // Fallback
          }
        }
      }
    }
    return; // Consume the event
  }

  // For other shortcuts, if a modifier key (Ctrl, Alt, Meta) is pressed, generally ignore,
  // unless it's the Escape key or a specifically designed multi-key shortcut.
  if (modifierKeyPressed && event.key !== "Escape") {
    return;
  }

  // Do not trigger other shortcuts if an input field is focused (already checked, but good to be explicit)
  if (inInputField && event.key !== "Escape") {
    return;
  }

  switch (event.key) {
    case "-":
      if (!inInputField) {
        event.preventDefault();
        const typeSelect = $("#transactionType");
        const amountInput = $("#amount");
        if (typeSelect && amountInput) {
          typeSelect.value = "expense";
          typeSelect.dispatchEvent(new Event("change"));
          amountInput.focus();
          console.log("Shortcut: '-' pressed for Expense");
        }
      }
      break;

    case "+":
    case "=":
      if (!inInputField) {
        event.preventDefault();
        const typeSelect = $("#transactionType");
        const amountInput = $("#amount");
        if (typeSelect && amountInput) {
          typeSelect.value = "income";
          typeSelect.dispatchEvent(new Event("change"));
          amountInput.focus();
          console.log("Shortcut: '+' pressed for Income");
        }
      }
      break;

    case "m":
    case "M":
      if (!inInputField) {
        event.preventDefault();
        const monthlyViewBtn = $("#monthlyViewBtn");
        if (monthlyViewBtn) {
          if ($("#monthlyViewModal")?.style.display !== "block") {
            monthlyViewBtn.click();
            console.log("Shortcut: 'm' pressed, opening Monthly View");
          } else {
            closeModal("monthlyViewModal");
            console.log("Shortcut: 'm' pressed, closing Monthly View");
          }
        }
      }
      break;

    case "s":
    case "S":
      if (monthlyViewModalVisible && !inInputField) {
        event.preventDefault();
        const searchInput = $("#monthlySearchInput");
        if (searchInput) {
          searchInput.focus();
          console.log("Shortcut: 's' pressed, focusing Monthly Search");
        }
      } else if (
        !monthlyViewModalVisible &&
        !settingsModalVisible &&
        !inInputField
      ) {
        event.preventDefault();
        const settingsBtn = $("#settingsBtn");
        if (settingsBtn) {
          if ($("#settingsModal")?.style.display !== "block") {
            settingsBtn.click();
            console.log("Shortcut: 's' pressed, opening Settings");
          } else {
            closeModal("settingsModal");
            console.log("Shortcut: 's' pressed, closing Settings");
          }
        }
      }
      break;

    // --- NEW: Shortcut for Help Modal ---
    case "?":
      if (!inInputField) {
        event.preventDefault();
        const shortcutsBtn = $("#shortcutsHelpBtn");
        if (shortcutsBtn) {
          if ($("#shortcutsHelpModal")?.style.display !== "block") {
            shortcutsBtn.click();
            console.log("Shortcut: '?' pressed, opening Shortcuts Help");
          } else {
            closeModal("shortcutsHelpModal");
            console.log("Shortcut: '?' pressed, closing Shortcuts Help");
          }
        }
      }
      break;
    // --- END NEW ---

    case "Escape":
      const monthlySearchInput = $("#monthlySearchInput");
      if (
        monthlySearchInput &&
        document.activeElement === monthlySearchInput &&
        monthlySearchInput.value
      ) {
        event.preventDefault();
        const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
        if (clearMonthlySearchBtn) {
          clearMonthlySearchBtn.click();
          console.log("Shortcut: Escape pressed, clearing Monthly Search");
        }
      } else {
        const modalsToClose = [
          "confirmationModal",
          "formModal",
          "ccHistoryModal",
          "cashCounterModal",
          "debtsViewModal",
          "receivablesViewModal",
          "transferMoneyModal",
          "monthlyViewModal",
          "settingsModal",
          "donateModal",
          "shortcutsHelpModal", // Added shortcuts modal
        ];
        let modalClosed = false;
        for (const modalId of modalsToClose) {
          const modal = $(`#${modalId}`);
          if (modal && modal.style.display === "block") {
            event.preventDefault();
            closeModal(modalId);
            console.log(`Shortcut: Escape pressed, closing modal ${modalId}`);
            modalClosed = true;
            break;
          }
        }
        if (!modalClosed && inInputField) {
          // If no modal was closed but an input had focus
          activeElement.blur();
          console.log("Shortcut: Escape pressed, blurring active input field");
        }
      }
      break;

    case "c":
    case "C":
      if (!inInputField) {
        event.preventDefault();
        const ccSection = $("#creditCardDashboardSection");
        const ccAmountInput = $("#ccAmount");
        if (ccSection && ccSection.style.display !== "none" && ccAmountInput) {
          ccAmountInput.focus();
          console.log("Shortcut: 'c' pressed, focusing CC Amount");
        } else if (ccSection && ccSection.style.display === "none") {
          showNotification(
            "Credit Card section is currently hidden. Enable in Settings.",
            "info"
          );
        }
      }
      break;

    case "d":
    case "D":
      if (!inInputField) {
        event.preventDefault();
        const viewDebtsBtn = $("#viewDebtsBtn");
        if (viewDebtsBtn) {
          if ($("#debtsViewModal")?.style.display !== "block") {
            viewDebtsBtn.click();
            console.log("Shortcut: 'd' pressed, opening Debts View");
          } else {
            closeModal("debtsViewModal");
            console.log("Shortcut: 'd' pressed, closing Debts View");
          }
        }
      }
      break;

    case "r":
    case "R":
      if (!inInputField) {
        event.preventDefault();
        const viewReceivablesBtn = $("#viewReceivablesBtn");
        if (viewReceivablesBtn) {
          if ($("#receivablesViewModal")?.style.display !== "block") {
            viewReceivablesBtn.click();
            console.log("Shortcut: 'r' pressed, opening Receivables View");
          } else {
            closeModal("receivablesViewModal");
            console.log("Shortcut: 'r' pressed, closing Receivables View");
          }
        }
      }
      break;

    case "t":
    case "T":
      if (!inInputField) {
        event.preventDefault();
        const openTransferBtn = $("#openTransferModalBtn");
        if (openTransferBtn) {
          if ($("#transferMoneyModal")?.style.display !== "block") {
            openTransferBtn.click();
            console.log("Shortcut: 't' pressed, opening Transfer Modal");
          } else {
            closeModal("transferMoneyModal");
            console.log("Shortcut: 't' pressed, closing Transfer Modal");
          }
        }
      }
      break;

    case "ArrowLeft":
      if (monthlyViewModalVisible && !inInputField) {
        event.preventDefault();
        navigateMonthTabs(-1); // Navigate to previous month
        console.log("Shortcut: ArrowLeft pressed for previous month");
      }
      break;

    case "ArrowRight":
      if (monthlyViewModalVisible && !inInputField) {
        event.preventDefault();
        navigateMonthTabs(1); // Navigate to next month
        console.log("Shortcut: ArrowRight pressed for next month");
      }
      break;

    default:
      // No action for other keys
      break;
  }
}

// --- Helper function for month tab navigation ---
function navigateMonthTabs(direction) {
  const monthTabs = $$("#monthTabs .tab-button");
  if (monthTabs.length === 0) return;

  let currentIndex = -1;
  monthTabs.forEach((tab, index) => {
    if (tab.classList.contains("active")) {
      currentIndex = index;
    }
  });

  if (currentIndex !== -1) {
    let newIndex = currentIndex + direction;
    if (newIndex < 0) {
      newIndex = monthTabs.length - 1; // Wrap around to last month
    } else if (newIndex >= monthTabs.length) {
      newIndex = 0; // Wrap around to first month
    }
    monthTabs[newIndex].click();
  } else if (monthTabs.length > 0) {
    // If no tab is active, default to current month or first tab
    const currentMonth = new Date().getMonth();
    const yearSelector = $("#yearSelector");
    const currentYearVal = yearSelector
      ? parseInt(yearSelector.value)
      : new Date().getFullYear();
    const targetTab =
      $(
        `#monthTabs .tab-button[data-month="${currentMonth}"][data-year="${currentYearVal}"]`
      ) || monthTabs[0];
    if (targetTab) targetTab.click();
  }
}

function renderRecentTransactions() {
  const list = $("#recentTransactionsList");
  if (!list) return;
  list.innerHTML = "";
  const recent = [...state.transactions]
    .sort(
      (a, b) =>
        new Date(b.date).setHours(0, 0, 0, 0) -
          new Date(a.date).setHours(0, 0, 0, 0) || b.timestamp - a.timestamp
    )
    .slice(0, 10);

  if (recent.length === 0) {
    list.innerHTML =
      '<p class="text-gray-400 text-sm">No transactions yet.</p>';
    return;
  }

  recent.forEach((t) => {
    const div = document.createElement("div");
    div.className = `flex justify-between items-center p-2 rounded bg-gray-700/50 text-sm transition-colors hover:bg-gray-700/80`;

    const account = state.accounts.find((a) => a.id === t.account);
    const accountName = account ? account.name : "Unknown Acct";
    const isIncome = t.type === "income";
    const textColorClass = isIncome ? "text-income" : "text-expense";

    let subDetailText = `${new Date(t.date).toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    })}`; // Date first
    subDetailText += ` - ${accountName}`;
    if (!isIncome && t.category) {
      subDetailText += ` | ${t.category}`;
    } else if (!isIncome && !t.category) {
      subDetailText += ` | Uncategorized`;
    }

    div.innerHTML = `
      <div class="flex-grow mr-2 overflow-hidden">
        <p class="font-medium truncate ${textColorClass}" title="${
      t.description
    }">${t.description}</p>
        <p class="text-xs text-gray-400">${subDetailText}</p>
      </div>
      <span class="font-semibold whitespace-nowrap ${textColorClass} tabular-nums">${
      isIncome ? "+" : "-"
    }${formatCurrency(t.amount)}</span>
      <div class="edit-btn-container flex-shrink-0">
        <button class="text-xs accent-text hover:text-accent-hover focus:outline-none" onclick="openEditTransactionForm('${
          t.id
        }', event)" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="text-xs text-gray-500 hover:text-expense focus:outline-none" onclick="deleteTransaction('${
          t.id
        }',event)" title="Delete"><i class="fas fa-times"></i></button>
      </div>`;
    list.appendChild(div);
  });
}

function renderDebtList() {
  const listContainer = $("#debtModalListContainer");
  if (!listContainer) {
    console.warn(
      "#debtModalListContainer element not found. Debts modal might not be open."
    );
    return;
  }
  listContainer.innerHTML = "";

  if (state.debts.length === 0) {
    listContainer.innerHTML =
      '<p class="text-gray-400 text-sm text-center py-4">No debts recorded.</p>';
    return;
  }

  const totalsByCreditor = state.debts.reduce((acc, d) => {
    const creditorName = d.who.trim();
    if (!acc[creditorName]) {
      acc[creditorName] = {
        totalOwedTo: 0,
        items: [],
      };
    }
    acc[creditorName].totalOwedTo += d.remainingAmount;
    acc[creditorName].items.push(d);
    return acc;
  }, {});

  const sortedCreditors = Object.keys(totalsByCreditor).sort((a, b) =>
    a.localeCompare(b)
  );

  sortedCreditors.forEach((creditorName) => {
    const creditorData = totalsByCreditor[creditorName];
    const creditorId = `modal-debt-creditor-${generateId()}`;

    const creditorWrapper = document.createElement("div");
    creditorWrapper.className =
      "mb-3 border border-gray-700 rounded-md overflow-hidden shadow-sm";

    const creditorHeader = document.createElement("div");
    creditorHeader.className =
      "flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600/50 transition-colors";
    creditorHeader.style.backgroundColor = "var(--bg-tertiary)";

    creditorHeader.innerHTML = ` 
      <h4 class="text-md font-semibold text-gray-100 force-word-wrap">${creditorName}</h4>
      <div class="flex items-center flex-shrink-0 ml-2">
        <span class="text-md font-semibold text-expense mr-3 whitespace-nowrap tabular-nums">${formatCurrency(
          creditorData.totalOwedTo
        )}</span>
        <span class="toggle-icon text-gray-400"><i class="fas fa-chevron-down text-xs"></i></span>
      </div>
    `;
    creditorWrapper.appendChild(creditorHeader);

    const itemsListContainer = document.createElement("div");
    itemsListContainer.className = "day-transactions-container";
    itemsListContainer.id = creditorId;
    itemsListContainer.style.maxHeight = "0px";
    itemsListContainer.style.backgroundColor = "var(--bg-secondary)";

    creditorData.items
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .forEach((d) => {
        const daysLeft = getDaysLeft(d.dueDate);
        let daysText, daysColor;
        if (daysLeft < 0) {
          daysText = `Overdue by ${Math.abs(daysLeft)} day(s)`;
          daysColor = "text-expense font-medium";
        } else if (daysLeft === 0) {
          daysText = `Due Today`;
          daysColor = "text-warning font-medium";
        } else {
          daysText = `${daysLeft} day(s) left`;
          daysColor = "text-gray-300";
        }

        const itemDiv = document.createElement("div");
        itemDiv.className =
          "text-sm py-2 px-3 border-b border-gray-700 last:border-b-0";
        itemDiv.innerHTML = `
          <div class="flex justify-between items-start mb-1 gap-x-2">
            <div class="flex-grow">
              <p class="font-medium text-gray-200 force-word-wrap">${d.why}</p>
              <p class="text-xs ${daysColor}">${daysText}</p>
            </div>
            <span class="font-semibold text-expense whitespace-nowrap tabular-nums">${formatCurrency(
              d.remainingAmount
            )}</span>
          </div>
          <div class="flex justify-between items-center text-xs text-gray-500 mt-1">
            <span>Due: ${new Date(d.dueDate).toLocaleDateString()}</span>
            <div class="edit-btn-container">
              <button class="link-style text-xs mr-2 accent-text hover:text-accent-hover" onclick="openEditDebtForm('${
                d.id
              }')">Edit</button>
              <button class="link-style text-xs mr-2 text-income hover:opacity-80" onclick="openPayDebtForm('${
                d.id
              }')">Pay</button>
              <button class="text-gray-500 hover:text-expense text-xs focus:outline-none" onclick="deleteDebt('${
                d.id
              }')" title="Delete"><i class="fas fa-times"></i></button>
            </div>
          </div>
        `;
        itemsListContainer.appendChild(itemDiv);
      });

    creditorWrapper.appendChild(itemsListContainer);

    creditorHeader.onclick = () => {
      const icon = creditorHeader.querySelector(".toggle-icon i");
      const isCurrentlyCollapsed = itemsListContainer.style.maxHeight === "0px";
      if (isCurrentlyCollapsed) {
        itemsListContainer.style.maxHeight =
          itemsListContainer.scrollHeight + "px";
        if (icon) {
          icon.classList.remove("fa-chevron-down");
          icon.classList.add("fa-chevron-up");
        }
      } else {
        itemsListContainer.style.maxHeight = "0px";
        if (icon) {
          icon.classList.remove("fa-chevron-up");
          icon.classList.add("fa-chevron-down");
        }
      }
    };
    listContainer.appendChild(creditorWrapper);
  });
}

function renderReceivableList() {
  const listContainer = $("#receivableModalListContainer");
  if (!listContainer) {
    return;
  }
  listContainer.innerHTML = "";
  const cashBankReceivables = state.receivables.filter(
    (r) => r.type === "cash" || !r.type
  );
  const ccReceivables = state.receivables.filter((r) => r.type === "cc");
  if (state.receivables.length === 0) {
    listContainer.innerHTML =
      '<p class="text-gray-400 text-sm text-center py-4">No receivables recorded.</p>';
    return;
  }

  const renderGroupInModal = (title, receivablesForGroup) => {
    const sectionWrapper = document.createElement("div");
    sectionWrapper.className = "mb-6";
    const sectionTitleHeader = document.createElement("div");
    sectionTitleHeader.className =
      "flex justify-between items-center border-b border-gray-500 pb-2 mb-3";
    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "text-xl font-semibold text-gray-100";
    sectionTitle.textContent = title;
    sectionTitleHeader.appendChild(sectionTitle);
    const groupTotalAmount = receivablesForGroup.reduce(
      (sum, r) => sum + r.remainingAmount,
      0
    );
    const groupTotalSpan = document.createElement("span");
    groupTotalSpan.className =
      "text-base font-normal text-gray-100 tabular-nums";
    groupTotalSpan.textContent = `Total: ${formatCurrency(groupTotalAmount)}`;
    sectionTitleHeader.appendChild(groupTotalSpan);
    sectionWrapper.appendChild(sectionTitleHeader);

    if (receivablesForGroup.length === 0) {
      return;
    }

    const totalsByPerson = receivablesForGroup.reduce((acc, r) => {
      const personName = r.who.trim();
      if (!acc[personName]) {
        acc[personName] = { totalOwed: 0, items: [] };
      }
      acc[personName].totalOwed += r.remainingAmount;
      acc[personName].items.push(r);
      return acc;
    }, {});

    const sortedPeople = Object.keys(totalsByPerson).sort((a, b) =>
      a.localeCompare(b)
    );
    sortedPeople.forEach((personName) => {
      const personData = totalsByPerson[personName];
      const personId = `modal-receivable-${title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}-${generateId()}`;
      const personWrapper = document.createElement("div");
      personWrapper.className =
        "mb-3 border border-gray-700 rounded-md overflow-hidden shadow-sm";
      const personHeader = document.createElement("div");
      personHeader.className =
        "flex justify-between items-center p-3 cursor-pointer hover:bg-gray-600/50 transition-colors";
      personHeader.style.backgroundColor = "var(--bg-tertiary)";
      personHeader.innerHTML = `
          <h4 class="text-md font-semibold text-gray-100 force-word-wrap">${personName}</h4>
          <div class="flex items-center flex-shrink-0 ml-2">
            <span class="text-md font-semibold text-income mr-3 whitespace-nowrap tabular-nums">${formatCurrency(
              personData.totalOwed
            )}</span>
            <span class="toggle-icon text-gray-400"><i class="fas fa-chevron-down text-xs"></i></span>
          </div>
      `;
      personWrapper.appendChild(personHeader);
      const itemsListContainer = document.createElement("div");
      itemsListContainer.className = "day-transactions-container";
      itemsListContainer.id = personId;
      itemsListContainer.style.maxHeight = "0px";
      itemsListContainer.style.backgroundColor = "var(--bg-secondary)";
      personData.items
        .sort((a, b) => new Date(b.dateGiven) - new Date(a.dateGiven))
        .forEach((r) => {
          const srcAcc = state.accounts.find((a) => a.id === r.sourceAccount);
          let srcTxt =
            r.type === "cash"
              ? `(From: ${srcAcc?.name || "Unknown"})`
              : "(Via CC)";
          const itemDiv = document.createElement("div");
          itemDiv.className =
            "text-sm py-2 px-3 border-b border-gray-700 last:border-b-0";
          itemDiv.innerHTML = `
          <div class="flex justify-between items-start mb-1 gap-x-2">
            <div class="flex-grow">
              <p class="font-medium text-gray-200 force-word-wrap">${r.why}</p>
              <p class="text-xs text-gray-400">${srcTxt}</p>
            </div>
            <span class="font-semibold text-income whitespace-nowrap tabular-nums">${formatCurrency(
              r.remainingAmount
            )}</span>
          </div>
          <div class="flex justify-between items-center text-xs text-gray-500 mt-1">
            <span>Given: ${new Date(r.dateGiven).toLocaleDateString()}</span>
            <div class="edit-btn-container">
              <button class="link-style text-xs mr-2 accent-text hover:text-accent-hover" onclick="openEditReceivableForm('${
                r.id
              }')">Edit</button>
              <button class="link-style text-xs mr-2 text-income hover:opacity-80" onclick="openReceivePaymentForm('${
                r.id
              }')">Receive</button>
              <button class="text-gray-500 hover:text-expense text-xs focus:outline-none" onclick="deleteReceivable('${
                r.id
              }')" title="Delete"><i class="fas fa-times"></i></button>
            </div>
          </div>
        `;
          itemsListContainer.appendChild(itemDiv);
        });
      personWrapper.appendChild(itemsListContainer);
      personHeader.onclick = () => {
        const icon = personHeader.querySelector(".toggle-icon i");
        const isCollapsed = itemsListContainer.style.maxHeight === "0px";
        itemsListContainer.style.maxHeight = isCollapsed
          ? itemsListContainer.scrollHeight + "px"
          : "0px";
        icon.classList.toggle("fa-chevron-down", !isCollapsed);
        icon.classList.toggle("fa-chevron-up", isCollapsed);
      };
      sectionWrapper.appendChild(personWrapper);
    });
    listContainer.appendChild(sectionWrapper);
  };
  renderGroupInModal("Cash/Bank Loans", cashBankReceivables);
  renderGroupInModal("Credit Card Loans", ccReceivables);
}

function renderInstallmentList() {
  const list = $("#installmentList");
  if (!list) return;
  list.innerHTML = "";
  const sortedInstallments = [...state.installments].sort((a, b) => {
    const endDateA = new Date(a.startDate);
    endDateA.setMonth(endDateA.getMonth() + a.totalMonths);
    const endDateB = new Date(b.startDate);
    endDateB.setMonth(endDateB.getMonth() + b.totalMonths);
    return endDateA - endDateB;
  });

  if (sortedInstallments.length === 0) {
    list.innerHTML = '<p class="text-gray-400 text-sm">No installments.</p>';
    return;
  }

  sortedInstallments.forEach((i) => {
    const endDate = new Date(i.startDate);
    endDate.setMonth(endDate.getMonth() + i.totalMonths);
    const daysLeft = getDaysLeft(endDate);
    let daysLeftText =
      daysLeft < 0
        ? `<span class="text-gray-500">Finished</span>`
        : `<span class="text-gray-300">${daysLeft} day(s) left</span>`;
    const totalLeftToPay = i.monthlyAmount * i.monthsLeft;
    const progressPercent =
      i.totalMonths > 0
        ? ((i.totalMonths - i.monthsLeft) / i.totalMonths) * 100
        : 0;

    const div = document.createElement("div");
    div.className =
      "p-3 rounded bg-gray-700/50 text-sm mb-2 flex items-center gap-x-3";

    const ringHtml = `
      <div class="installment-progress-ring-container w-10 h-10 flex-shrink-0" title="${progressPercent.toFixed(
        0
      )}% Paid (${i.monthsLeft} months left)">
          <svg class="w-full h-full" viewBox="0 0 36 36">
              <path class="progress-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3"></path>
              <path class="progress-ring-circle" stroke-dasharray="${progressPercent.toFixed(
                2
              )}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-linecap="round" stroke-width="3"></path>
              <text x="18" y="17.5" class="progress-ring-text" text-anchor="middle" fill="var(--text-primary)">${
                i.monthsLeft
              }</text> 
          </svg>
      </div>
    `;

    const buttonsHtml = `
        <div class="edit-btn-container">
            ${
              i.monthsLeft > 0
                ? `
                <button class="text-xs accent-text hover:text-accent-hover focus:outline-none mr-2" onclick="openEditInstallmentForm('${i.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="text-xs text-income hover:opacity-80 focus:outline-none mr-2" onclick="payInstallmentMonth('${i.id}')" title="Pay Month"><i class="fas fa-credit-card"></i></button>
              `
                : `
                <button class="text-xs accent-text hover:text-accent-hover focus:outline-none mr-2" onclick="openEditInstallmentForm('${i.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              `
            }
            <button class="text-xs text-gray-500 hover:text-expense focus:outline-none" onclick="deleteInstallment('${
              i.id
            }')" title="Delete"><i class="fas fa-times"></i></button>
        </div>
    `;

    div.innerHTML = `
      ${ringHtml}
      <div class="flex-grow">
          <div class="flex justify-between items-start mb-1 gap-x-2">
            <div class="flex-grow">
                <p class="font-medium force-word-wrap">${i.description}</p>
                <p class="text-xs text-gray-400 tabular-nums">${formatCurrency(
                  i.monthlyAmount
                )} / month</p>
            </div>
            <span class="font-semibold text-gray-200 whitespace-nowrap tabular-nums">${formatCurrency(
              totalLeftToPay
            )} Left</span> 
          </div>
          <div class="flex justify-between items-center text-xs text-gray-400 mt-1">
              <span>${i.monthsLeft} of ${
      i.totalMonths
    } months left (${daysLeftText})</span>
              ${buttonsHtml}
          </div>
      </div>
    `;
    list.appendChild(div);
  });
}

let monthlyOverviewChartInstance = null;

function renderMonthlyOverviewChart() {
  const canvas = $("#monthlyOverviewChart");
  if (!canvas) return;

  const chartTitleEl = $("#dashboardChartTitle");
  const toggleBtn = $("#toggleChartBtn");
  const toggleBtnIcon = toggleBtn ? toggleBtn.querySelector("i") : null;

  if (monthlyOverviewChartInstance) {
    monthlyOverviewChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  // Get theme-dependent colors for grid lines, ticks, etc.
  const computedStyle = getComputedStyle(document.documentElement);
  const chartGridColor =
    computedStyle.getPropertyValue("--chart-grid-color").trim() ||
    "rgba(255,255,255,0.1)";
  const chartTickColor =
    computedStyle.getPropertyValue("--chart-tick-color").trim() || "#aaa";
  const chartLegendColor =
    computedStyle.getPropertyValue("--chart-legend-color").trim() || "#e0e0e0";
  const chartTooltipBg =
    computedStyle.getPropertyValue("--chart-tooltip-bg").trim() ||
    "rgba(0,0,0,0.8)";
  const chartTooltipText =
    computedStyle.getPropertyValue("--chart-tooltip-text").trim() || "#fff";

  // --- Using the exact hex codes from your reference code ---
  const incomeColor = "#2a9d8f";
  const expenseColor = "#e74c3c";

  const hexToRgba = (hex, alpha = 0.3) => {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length == 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  let chartLabels, chartDatasets;

  // --- LOGIC FOR MONTHLY (DAILY) EXPENSE VIEW ---
  if (dashboardChartState === "monthly") {
    if (chartTitleEl)
      chartTitleEl.textContent = "Daily Expenses (Current Month)";
    if (toggleBtnIcon) {
      toggleBtnIcon.className = "fas fa-calendar-alt fa-lg";
      toggleBtn.dataset.tooltip = "Switch to Yearly View";
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    chartLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailyExpenseData = new Array(daysInMonth).fill(0);

    state.transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (
        t.type === "expense" &&
        tDate.getMonth() === currentMonth &&
        tDate.getFullYear() === currentYear
      ) {
        const dayOfMonth = tDate.getDate();
        dailyExpenseData[dayOfMonth - 1] += t.amount;
      }
    });

    chartDatasets = [
      {
        label: "Daily Expense",
        data: dailyExpenseData,
        borderColor: expenseColor,
        backgroundColor: hexToRgba(expenseColor, 0.3),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: expenseColor,
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: expenseColor,
      },
    ];

    // --- LOGIC FOR YEARLY (INCOME VS EXPENSE) VIEW ---
  } else {
    if (chartTitleEl)
      chartTitleEl.textContent = "Monthly Income vs Expenses (Last 12 Months)";
    if (toggleBtnIcon) {
      toggleBtnIcon.className = "fas fa-chart-line fa-lg";
      toggleBtn.dataset.tooltip = "Switch to Daily Expense View";
    }

    chartLabels = [];
    const incomeData = [];
    const expenseData = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      chartLabels.push(date.toLocaleString("default", { month: "short" }));

      let monthlyIncome = 0;
      let monthlyExpense = 0;
      state.transactions.forEach((t) => {
        const tDate = new Date(t.date);
        if (isNaN(tDate.getTime())) return;
        if (tDate.getFullYear() === year && tDate.getMonth() === month) {
          if (t.type === "income") monthlyIncome += t.amount;
          else if (t.type === "expense") monthlyExpense += t.amount;
        }
      });
      incomeData.push(monthlyIncome);
      expenseData.push(monthlyExpense);
    }

    chartDatasets = [
      {
        label: "Income",
        data: incomeData,
        borderColor: incomeColor,
        backgroundColor: hexToRgba(incomeColor, 0.3),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: incomeColor,
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: incomeColor,
      },
      {
        label: "Expenses",
        data: expenseData,
        borderColor: expenseColor,
        backgroundColor: hexToRgba(expenseColor, 0.3),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: expenseColor,
        pointBorderColor: "#fff",
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: expenseColor,
      },
    ];
  }

  // --- Create the Chart ---
  monthlyOverviewChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: chartDatasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: chartTickColor,
            callback: (v) =>
              v >= 1000000
                ? `LKR ${(v / 1000000).toFixed(1)}M`
                : v >= 1000
                ? `LKR ${(v / 1000).toFixed(0)}k`
                : formatCurrency(v),
          },
          grid: { color: chartGridColor, drawBorder: false },
        },
        x: {
          ticks: { color: chartTickColor },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: { color: chartLegendColor, usePointStyle: true, boxWidth: 8 },
        },
        tooltip: {
          backgroundColor: chartTooltipBg,
          titleColor: chartTooltipText,
          bodyColor: chartTooltipText,
          padding: 10,
          cornerRadius: 4,
          usePointStyle: true,
          callbacks: {
            label: (c) =>
              `${c.dataset.label || ""}: ${formatCurrency(c.parsed.y)}`,
          },
        },
      },
      interaction: { mode: "index", intersect: false },
    },
  });
}

function handleTransactionSubmit(event) {
  event.preventDefault();
  const form = event.target,
    formData = new FormData(form);
  const type = formData.get("transactionType");
  // Ensure amount from form is parsed and then immediately rounded if needed, though parseFloat is usually fine here.
  // The main rounding will happen during balance calculations.
  const amount = parseFloat(formData.get("amount"));
  const accountId = formData.get("account");
  const category = type === "expense" ? formData.get("category") : null,
    description = formData.get("description").trim(),
    date = formData.get("date");

  if (isNaN(amount) || amount <= 0) {
    showNotification("Valid amount required.", "error");
    return;
  }
  if (!accountId) {
    showNotification("Account required.", "error");
    return;
  }
  if (type === "expense" && !category) {
    showNotification("Category required for expense.", "error");
    return;
  }
  if (!description) {
    showNotification("Description required.", "error");
    return;
  }
  if (!date) {
    showNotification("Date required.", "error");
    return;
  }

  const account = state.accounts.find((acc) => acc.id === accountId);
  if (!account) {
    showNotification("Account not found.", "error");
    return;
  }
  const timestamp = Date.now();

  if (type === "expense" && account.balance < amount) {
    showNotification(
      `Insufficient funds in ${account.name}. Transaction still added.`,
      "warning"
    );
  }
  const newTransaction = {
    id: generateId(),
    type,
    amount: roundToTwoDecimals(amount), // Round the amount being stored in the transaction
    account: accountId,
    category,
    description,
    date,
    timestamp,
  };
  state.transactions.push(newTransaction);

  // Update account balance and round it
  if (type === "income") {
    account.balance = roundToTwoDecimals(
      account.balance + newTransaction.amount
    );
  } else {
    account.balance = roundToTwoDecimals(
      account.balance - newTransaction.amount
    );
  }
  // Fallback if somehow balance becomes NaN (though roundToTwoDecimals handles its input)
  if (isNaN(account.balance)) account.balance = 0;

  showNotification(
    `${type.charAt(0).toUpperCase() + type.slice(1)} added.`,
    "success"
  );

  saveData();
  renderDashboard();
  populateDropdowns();
  form.reset();

  const categorySelect = form.querySelector("#category");
  if (categorySelect) {
    categorySelect.value = "";
  }

  const dateInput = form.querySelector("#date");
  if (dateInput) dateInput.value = getCurrentDateString(); // Use local date

  const transactionTypeSelect = form.querySelector("#transactionType");
  if (transactionTypeSelect) {
    transactionTypeSelect.dispatchEvent(new Event("change"));
  }

  refreshMonthlyViewIfRelevant(date);
}

function openEditTransactionModal(transactionId, event) {
  if (event) event.stopPropagation();
  const transaction = state.transactions.find((tx) => tx.id === transactionId);
  if (!transaction) {
    showNotification("Transaction not found for editing.", "error");
    return;
  }

  const accountOptions = state.accounts
    .map(
      (acc) =>
        `<option value="${acc.id}" ${
          transaction.account === acc.id ? "selected" : ""
        }>${acc.name} (${formatCurrency(acc.balance)})</option>`
    )
    .join("");

  const categoryOptions = state.categories
    .sort((a, b) => a.localeCompare(b))
    .map(
      (cat) =>
        `<option value="${cat}" ${
          transaction.category === cat ? "selected" : ""
        }>${cat}</option>`
    )
    .join("");

  const formHtml = `
            <input type="hidden" name="editTransactionId" value="${
              transaction.id
            }">
            <div>
                <label for="modalTransactionType" class="block text-sm font-medium mb-1">Type</label>
                <select id="modalTransactionType" name="transactionType" required onchange="toggleCategoryVisibilityInModal(this, 'modalCategoryGroup', 'modalCategory')">
                    <option value="expense" ${
                      transaction.type === "expense" ? "selected" : ""
                    }>Expense</option>
                    <option value="income" ${
                      transaction.type === "income" ? "selected" : ""
                    }>Income</option>
                </select>
            </div>
            <div>
                <label for="modalAmount" class="block text-sm font-medium mb-1">Amount (LKR)</label>
                <input type="number" id="modalAmount" name="amount" value="${transaction.amount.toFixed(
                  2
                )}" step="0.01" min="0" placeholder="e.g., 1500.50" required>
            </div>
            <div>
                <label for="modalAccount" class="block text-sm font-medium mb-1">Account</label>
                <select id="modalAccount" name="account" required>${accountOptions}</select>
            </div>
            <div id="modalCategoryGroup" style="display: ${
              transaction.type === "expense" ? "block" : "none"
            };">
                <label for="modalCategory" class="block text-sm font-medium mb-1">Category</label>
                <select id="modalCategory" name="category" ${
                  transaction.type === "expense" ? "required" : ""
                }>${categoryOptions}</select>
            </div>
            <div>
                <label for="modalDescription" class="block text-sm font-medium mb-1">Description</label>
                <input type="text" id="modalDescription" name="description" value="${
                  transaction.description
                }" placeholder="e.g., Lunch with friends" required>
            </div>
            <div>
                <label for="modalDate" class="block text-sm font-medium mb-1">Date</label>
                <input type="date" id="modalDate" name="date" value="${
                  transaction.date
                }" required>
            </div>
            <button type="submit" class="btn btn-primary w-full"><i class="fas fa-save"></i> Update Transaction</button>
        `;

  openFormModal("Edit Transaction", formHtml, handleEditTransactionModalSubmit);
  const typeSelectInModal = document.getElementById("modalTransactionType");
  if (typeSelectInModal) {
    toggleCategoryVisibilityInModal(
      typeSelectInModal,
      "modalCategoryGroup",
      "modalCategory"
    );
  }
}

function handleEditTransactionModalSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const transactionId = formData.get("editTransactionId");

  const transaction = state.transactions.find((t) => t.id === transactionId);
  if (!transaction) {
    showNotification("Transaction to edit not found.", "error");
    closeModal("formModal");
    return;
  }
  const originalDate = transaction.date;

  const newType = formData.get("transactionType");
  const newAmount = parseFloat(formData.get("amount")); // Parsed from form
  const newAccountId = formData.get("account");
  const newCategory = newType === "expense" ? formData.get("category") : null;
  const newDescription = formData.get("description").trim();
  const newDate = formData.get("date");

  if (isNaN(newAmount) || newAmount <= 0) {
    showNotification("Valid amount required.", "error");
    return;
  }
  if (!newAccountId) {
    showNotification("Account required.", "error");
    return;
  }
  if (newType === "expense" && !newCategory) {
    showNotification("Category required for expense.", "error");
    return;
  }
  if (!newDescription) {
    showNotification("Description required.", "error");
    return;
  }
  if (!newDate) {
    showNotification("Date required.", "error");
    return;
  }

  // Store the original amount before updating the transaction for correct balance reversal
  const originalTransactionAmount = transaction.amount;

  // Revert old transaction's effect on account balance
  const oldAccount = state.accounts.find(
    (acc) => acc.id === transaction.account
  );
  if (oldAccount) {
    if (transaction.type === "income") {
      oldAccount.balance = roundToTwoDecimals(
        oldAccount.balance - originalTransactionAmount
      );
    } else {
      oldAccount.balance = roundToTwoDecimals(
        oldAccount.balance + originalTransactionAmount
      );
    }
    if (isNaN(oldAccount.balance)) oldAccount.balance = 0;
  }

  // Update transaction properties
  transaction.type = newType;
  transaction.amount = roundToTwoDecimals(newAmount); // Round the new amount for storage
  transaction.account = newAccountId;
  transaction.category = newCategory;
  transaction.description = newDescription;
  transaction.date = newDate;
  // transaction.timestamp = Date.now(); // Timestamp is NOT updated to preserve original order

  // Apply new transaction's effect on (potentially new) account balance
  const newAccount = state.accounts.find((acc) => acc.id === newAccountId);
  if (newAccount) {
    if (transaction.type === "income") {
      // Use updated transaction.type
      newAccount.balance = roundToTwoDecimals(
        newAccount.balance + transaction.amount
      );
    } else {
      newAccount.balance = roundToTwoDecimals(
        newAccount.balance - transaction.amount
      );
    }
    if (isNaN(newAccount.balance)) newAccount.balance = 0;

    if (
      newAccount.balance < 0 &&
      (oldAccount?.id !== newAccount.id || transaction.type === "expense")
    ) {
      showNotification(
        `Warning: ${newAccount.name} now has a negative balance.`,
        "warning"
      );
    }
  } else {
    showNotification(
      "New account not found. Transaction update may be incomplete.",
      "error"
    );
  }

  saveData();
  renderDashboard();
  populateDropdowns();
  closeModal("formModal");
  showNotification("Transaction updated successfully.", "success");

  refreshMonthlyViewIfRelevant(newDate);
  if (originalDate !== newDate) {
    refreshMonthlyViewIfRelevant(originalDate);
  }
}

function deleteTransaction(id, event) {
  if (event) event.stopPropagation();
  const transactionIndex = state.transactions.findIndex((t) => t.id === id);
  if (transactionIndex === -1) return;
  const transaction = state.transactions[transactionIndex];
  const account = state.accounts.find((acc) => acc.id === transaction.account);

  showConfirmationModal(
    "Delete Transaction",
    `Are you sure you want to delete the transaction: <br><strong>"${
      transaction.description
    }"</strong> (${formatCurrency(transaction.amount)})?`,
    "Delete",
    "Cancel",
    () => {
      // onConfirm
      if (account) {
        if (transaction.type === "income") {
          account.balance = roundToTwoDecimals(
            account.balance - transaction.amount
          );
        } else {
          account.balance = roundToTwoDecimals(
            account.balance + transaction.amount
          );
        }
        if (isNaN(account.balance)) account.balance = 0;
      }
      const deletedDate = transaction.date;
      state.transactions.splice(transactionIndex, 1);
      saveData();
      renderDashboard();
      populateDropdowns();
      showNotification("Transaction deleted.", "success");
      refreshMonthlyViewIfRelevant(deletedDate);
    }
  );
}

function handleTransferSubmit(event) {
  event.preventDefault();
  const form = event.target; // The form element itself
  const formData = new FormData(form);
  const amount = parseFloat(formData.get("transferAmount"));
  const fromAccountId = formData.get("transferFrom");
  const toAccountId = formData.get("transferTo");

  // Use the correct ID for the error message paragraph in the transfer modal
  const modalErrorEl = $("#modalTransferError");
  if (modalErrorEl) {
    modalErrorEl.textContent = ""; // Clear previous error message
    modalErrorEl.classList.add("hidden"); // Hide it initially
  } else {
    console.warn("Modal error element (#modalTransferError) not found!");
    // If the error element isn't found, we can't show modal-specific errors,
    // but toast notifications will still work.
  }

  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    showNotification("Valid amount required for transfer.", "error");
    if (modalErrorEl) {
      modalErrorEl.textContent = "Please enter a valid positive amount.";
      modalErrorEl.classList.remove("hidden");
    }
    return;
  }

  // Check if From and To accounts are the same
  if (fromAccountId === toAccountId) {
    showNotification("Cannot transfer to the same account.", "error"); // Toast notification
    if (modalErrorEl) {
      modalErrorEl.textContent = "From and To accounts cannot be the same.";
      modalErrorEl.classList.remove("hidden");
    }
    return;
  }

  const fromAccount = state.accounts.find((acc) => acc.id === fromAccountId);
  const toAccount = state.accounts.find((acc) => acc.id === toAccountId);

  // Check if accounts are valid
  if (!fromAccount || !toAccount) {
    showNotification("Invalid account selected for transfer.", "error");
    if (modalErrorEl) {
      modalErrorEl.textContent =
        "Invalid source or destination account selected.";
      modalErrorEl.classList.remove("hidden");
    }
    return;
  }

  const roundedAmount = roundToTwoDecimals(amount);

  // Check for sufficient funds
  if (fromAccount.balance < roundedAmount) {
    showNotification(`Insufficient funds in ${fromAccount.name}.`, "warning");
    if (modalErrorEl) {
      modalErrorEl.textContent = `Insufficient funds in ${
        fromAccount.name
      }. Available: ${formatCurrency(fromAccount.balance)}`;
      modalErrorEl.classList.remove("hidden");
    }
    return; // Stop the transfer if funds are insufficient
  }

  // Perform the transfer: Update account balances
  fromAccount.balance = roundToTwoDecimals(fromAccount.balance - roundedAmount);
  toAccount.balance = roundToTwoDecimals(toAccount.balance + roundedAmount);

  // Fallback if somehow balance becomes NaN (though roundToTwoDecimals should prevent this for valid inputs)
  if (isNaN(fromAccount.balance)) fromAccount.balance = 0;
  if (isNaN(toAccount.balance)) toAccount.balance = 0;

  saveData(); // Save the updated state
  renderDashboard(); // Re-render dashboard elements to show new balances
  populateDropdowns(); // Re-populate dropdowns that show account balances

  showNotification(
    `Transferred ${formatCurrency(roundedAmount)} from ${fromAccount.name} to ${
      toAccount.name
    }.`,
    "success"
  );

  // IMPORTANT: Close the modal after a successful transfer
  closeModal("transferMoneyModal");

  // The form is typically reset when the modal is opened next,
  // as handled by the 'openTransferModalBtn' click listener which calls form.reset().
  // So, no explicit form.reset() is needed here if that behavior is desired.
}

function refreshMonthlyViewIfRelevant(dateString) {
  const monthlyViewModal = $("#monthlyViewModal");
  const activeTab = $("#monthTabs .tab-button.active");

  if (monthlyViewModal.style.display === "block" && activeTab) {
    const selectedMonth = parseInt(activeTab.dataset.month);
    const selectedYear = parseInt(activeTab.dataset.year);
    const transactionDate = new Date(dateString + "T00:00:00");

    // Check if the modified transaction's date falls within the currently viewed month
    if (
      !isNaN(transactionDate.getTime()) &&
      transactionDate.getFullYear() === selectedYear &&
      transactionDate.getMonth() === selectedMonth
    ) {
      // --- NEW: Preserve accordion states ---
      const openDayKeys = new Set();
      // Query for all day group headers within the monthly details container
      // Then check which ones have an expanded transaction list.
      // We identify expanded lists if their maxHeight is not "0px".
      // Each day group's unique identifier will be its date string (dayKey).
      const dayHeaders = $$(
        "#monthlyDetailsContainer .monthly-view-day-header"
      );
      dayHeaders.forEach((header) => {
        const dayGroup = header.closest(".monthly-view-day-group");
        if (dayGroup) {
          const transactionsContainer = dayGroup.querySelector(
            ".day-transactions-container"
          );
          // We need a reliable way to get the dayKey. Let's assume we can add it as a dataset attribute
          // to the dayGroup or header when it's rendered in renderMonthlyDetails.
          // For now, let's use the header's first child's text content (the date string) as a proxy,
          // but this should be made more robust in renderMonthlyDetails.
          const dayKey = header.dataset.dayKey; // We will add this dataset attribute in renderMonthlyDetails

          if (
            transactionsContainer &&
            transactionsContainer.style.maxHeight !== "0px"
          ) {
            if (dayKey) {
              openDayKeys.add(dayKey);
            }
          }
        }
      });
      // --- END OF NEW ---

      renderMonthlyDetails(selectedMonth, selectedYear, openDayKeys); // Pass the set of open keys
    }
  }
}

let monthlyPieChartInstance = null;

function setupMonthlyView() {
  const yearSelector = $("#yearSelector");
  const currentYear = new Date().getFullYear();

  if (!yearSelector) {
    console.error(
      "#yearSelector not found in setupMonthlyView. Monthly view cannot be initialized."
    );
    const monthlyViewBtn = $("#monthlyViewBtn");
    if (monthlyViewBtn) {
      monthlyViewBtn.disabled = true;
      monthlyViewBtn.dataset.tooltip = "Monthly View unavailable (Error)";
    }
    return;
  }

  const years = new Set(
    (state.transactions || []).map((t) => {
      const date = new Date(t.date);
      return isNaN(date.getFullYear()) ? currentYear : date.getFullYear();
    })
  );
  years.add(currentYear);

  yearSelector.innerHTML = "";
  [...years]
    .sort((a, b) => b - a)
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      yearSelector.appendChild(option);
    });

  yearSelector.addEventListener("change", () => {
    const monthlySearchInput = $("#monthlySearchInput");
    const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
    if (monthlySearchInput) {
      monthlySearchInput.value = "";
    }
    if (clearMonthlySearchBtn) {
      clearMonthlySearchBtn.style.display = "none"; // Use style.display
      clearMonthlySearchBtn.disabled = true;
    }
    renderMonthTabs(parseInt(yearSelector.value));
    $("#monthlyDetailsContainer").innerHTML =
      '<p class="text-center text-gray-400">Select a month to view details.</p>';
    if (monthlyPieChartInstance) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
  });
  const initialYear = yearSelector.value
    ? parseInt(yearSelector.value)
    : currentYear;
  renderMonthTabs(initialYear);
}

function renderMonthTabs(year) {
  const monthTabsContainer = $("#monthTabs");
  if (!monthTabsContainer) {
    console.error("#monthTabs container not found.");
    return;
  }
  monthTabsContainer.innerHTML = "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  months.forEach((monthName, index) => {
    const button = document.createElement("button");
    button.className = "tab-button !px-3 !py-1.5 !text-sm";
    button.textContent = monthName;
    button.dataset.month = index;
    button.dataset.year = year;
    button.onclick = () => {
      $$("#monthTabs .tab-button").forEach((btn) =>
        btn.classList.remove("active")
      );
      button.classList.add("active");
      const monthlySearchInput = $("#monthlySearchInput");
      const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
      if (monthlySearchInput) {
        monthlySearchInput.value = "";
      }
      if (clearMonthlySearchBtn) {
        clearMonthlySearchBtn.style.display = "none"; // Use style.display
        clearMonthlySearchBtn.disabled = true;
      }
      renderMonthlyDetails(index, year, new Set(), "", false);
    };
    monthTabsContainer.appendChild(button);
  });
}

function renderMonthlyDetails(
  month,
  year,
  openDayKeys = new Set(),
  searchTerm = "",
  isSearchingOrJustCleared = false
) {
  const container = $("#monthlyDetailsContainer");

  if (
    (isSearchingOrJustCleared && !searchTerm) ||
    (!isSearchingOrJustCleared && !searchTerm)
  ) {
    if (monthlyPieChartInstance) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
  }
  container.innerHTML = "";

  // --- NEW: Determine the transaction pool based on search scope ---
  const searchScope = monthlyViewSearchScope;
  let transactionPool = [];

  if (searchScope === "year") {
    transactionPool = state.transactions.filter((t) => {
      const tDate = new Date(t.date + "T00:00:00");
      return !isNaN(tDate.getTime()) && tDate.getFullYear() === year;
    });
  } else {
    // Default to 'month'
    transactionPool = state.transactions.filter((t) => {
      const tDate = new Date(t.date + "T00:00:00");
      return (
        !isNaN(tDate.getTime()) &&
        tDate.getFullYear() === year &&
        tDate.getMonth() === month
      );
    });
  }

  // --- Summary calculations are always based on the selected MONTH, not the search scope ---
  const allTransactionsInMonth = state.transactions.filter((t) => {
    const tDate = new Date(t.date + "T00:00:00");
    return (
      !isNaN(tDate.getTime()) &&
      tDate.getFullYear() === year &&
      tDate.getMonth() === month
    );
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};
  if (state.categories && Array.isArray(state.categories)) {
    state.categories.forEach((cat) => (categoryTotals[cat] = 0));
  }

  let lastMonthTotalExpense = 0;
  const lastMonthDate = new Date(year, month - 1, 1);
  state.transactions
    .filter((t) => {
      const tDate = new Date(t.date + "T00:00:00");
      return (
        t.type === "expense" &&
        !isNaN(tDate.getTime()) &&
        tDate.getFullYear() === lastMonthDate.getFullYear() &&
        tDate.getMonth() === lastMonthDate.getMonth()
      );
    })
    .forEach((t) => (lastMonthTotalExpense += t.amount));

  allTransactionsInMonth.forEach((t) => {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else if (t.type === "expense") {
      totalExpense += t.amount;
      const category = t.category || "Other";
      if (categoryTotals[category] !== undefined) {
        categoryTotals[category] += t.amount;
      } else {
        if (!categoryTotals["Other"]) categoryTotals["Other"] = 0;
        categoryTotals["Other"] += t.amount;
      }
    }
  });

  const summaryGrid = document.createElement("div");
  summaryGrid.className =
    "monthly-view-summary-grid grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6";
  let monthSpendingIndicatorHtml = "";
  if (totalExpense > lastMonthTotalExpense && lastMonthTotalExpense >= 0) {
    monthSpendingIndicatorHtml = `<i class="fas fa-arrow-up text-indicator-bad spending-indicator" title="More than last month (${formatCurrency(
      lastMonthTotalExpense
    )})"></i>`;
  } else if (
    totalExpense < lastMonthTotalExpense &&
    lastMonthTotalExpense > 0
  ) {
    monthSpendingIndicatorHtml = `<i class="fas fa-arrow-down text-indicator-good spending-indicator" title="Less than last month (${formatCurrency(
      lastMonthTotalExpense
    )})"></i>`;
  }
  summaryGrid.innerHTML = `
      <div class="monthly-view-summary-card"><p class="text-sm text-gray-400 mb-1">Total Income</p><p class="text-xl font-semibold text-income tabular-nums">${formatCurrency(
        totalIncome
      )}</p></div>
      <div class="monthly-view-summary-card"><p class="text-sm text-gray-400 mb-1">Total Expenses ${monthSpendingIndicatorHtml}</p><p class="text-xl font-semibold text-expense tabular-nums">${formatCurrency(
    totalExpense
  )}</p></div>
      <div class="monthly-view-summary-card"><p class="text-sm text-gray-400 mb-1">Net Flow</p><p class="text-xl font-semibold ${
        totalIncome - totalExpense >= 0 ? "text-income" : "text-expense"
      } tabular-nums">${formatCurrency(totalIncome - totalExpense)}</p></div>`;
  container.appendChild(summaryGrid);

  // --- NEW: Enhanced Search Logic ---
  const transactionsToDisplay = searchTerm
    ? transactionPool.filter((t) => {
        const account = state.accounts.find((a) => a.id === t.account);
        const accountName = account ? account.name.toLowerCase() : "";
        const descriptionLower = t.description
          ? t.description.toLowerCase()
          : "";
        const categoryLower = t.category ? t.category.toLowerCase() : "";
        const amountStr = t.amount.toFixed(2);
        const typeLower = t.type.toLowerCase();

        const searchLower = searchTerm.toLowerCase();

        return (
          descriptionLower.includes(searchLower) ||
          categoryLower.includes(searchLower) ||
          accountName.includes(searchLower) ||
          amountStr.includes(searchLower) || // Search by amount
          typeLower.includes(searchLower) // Search by 'income' or 'expense'
        );
      })
    : transactionPool;

  transactionsToDisplay.sort(
    (a, b) =>
      new Date(b.date).setHours(0, 0, 0, 0) -
        new Date(a.date).setHours(0, 0, 0, 0) || b.timestamp - a.timestamp
  );

  const contentGrid = document.createElement("div");
  contentGrid.className =
    "monthly-view-content-grid grid grid-cols-1 md:grid-cols-5 gap-6 mt-6";

  const transactionListSection = document.createElement("div");
  transactionListSection.className = "md:col-span-3 space-y-4";

  // --- FIX: Create header and button here ---
  const transactionHeader = document.createElement("div");
  transactionHeader.className = "flex justify-between items-center mb-3";

  const title = document.createElement("h3");
  title.className = "text-lg font-semibold";
  title.textContent = `Transactions ${
    searchTerm ? `(Matching "${searchTerm}")` : ""
  }`;

  const exportButton = document.createElement("button");
  exportButton.id = "exportPdfBtn";
  exportButton.className = "btn btn-secondary btn-sm";
  exportButton.dataset.tooltip = "Export as PDF";
  exportButton.innerHTML = `<i class="fas fa-file-pdf"></i> <span class="hidden md:inline">Export</span>`;
  exportButton.onclick = generateMonthlyPdfReport; // Attach event listener here

  transactionHeader.appendChild(title);
  transactionHeader.appendChild(exportButton);
  transactionListSection.appendChild(transactionHeader);
  // --- END FIX ---

  if (transactionsToDisplay.length === 0) {
    const noTransactionsP = document.createElement("p");
    noTransactionsP.className = "text-gray-400 text-center py-4";
    noTransactionsP.textContent = searchTerm
      ? "No transactions match your search."
      : "No transactions for this period.";
    transactionListSection.appendChild(noTransactionsP);
  } else {
    const transactionsByDay = transactionsToDisplay.reduce((acc, t) => {
      const dayKey = new Date(t.date).toLocaleDateString("en-CA");
      if (!acc[dayKey]) {
        acc[dayKey] = {
          date: new Date(t.date + "T00:00:00"),
          transactions: [],
          dayKey: dayKey,
        };
      }
      acc[dayKey].transactions.push(t);
      return acc;
    }, {});

    const sortedDays = Object.values(transactionsByDay).sort(
      (a, b) => b.date - a.date
    );
    const listContainerElement = document.createElement("div");
    listContainerElement.className = "max-h-[60vh] overflow-y-auto pr-2";

    sortedDays.forEach((dayData) => {
      if (searchTerm && dayData.transactions.length === 0) return;

      const dayGroup = document.createElement("div");
      dayGroup.className = "monthly-view-day-group";
      dayGroup.style.transition =
        "opacity 0.3s ease-out, max-height 0.3s ease-out, margin-bottom 0.3s ease-out, padding-bottom 0.3s ease-out";
      dayGroup.style.overflow = "hidden";

      const dayHeader = document.createElement("div");
      dayHeader.className = "monthly-view-day-header items-center";
      dayHeader.style.cursor = "pointer";
      dayHeader.dataset.dayKey = dayData.dayKey;

      const dateSpan = document.createElement("span");
      dateSpan.textContent = dayData.date.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      // --- FIX: Right-aligned container for amount and icon ---
      const rightSideContainer = document.createElement("div");
      rightSideContainer.className = "flex items-center justify-end flex-grow";

      const dailyTotalExpenseForDisplay = dayData.transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      const spentSpan = document.createElement("span");
      spentSpan.className = "text-sm text-expense mr-2 tabular-nums";
      spentSpan.textContent = `Spent: ${formatCurrency(
        dailyTotalExpenseForDisplay
      )}`;
      const chevronIcon = document.createElement("i");
      chevronIcon.className = "fas text-xs text-gray-400";

      rightSideContainer.appendChild(spentSpan);
      rightSideContainer.appendChild(chevronIcon);
      dayHeader.appendChild(dateSpan);
      dayHeader.appendChild(rightSideContainer);
      dayGroup.appendChild(dayHeader);

      const dayTransactionsContainer = document.createElement("div");
      dayTransactionsContainer.className = "day-transactions-container";

      const shouldBeOpenInitially =
        (isSearchingOrJustCleared &&
          searchTerm &&
          dayData.transactions.length > 0) ||
        (!isSearchingOrJustCleared &&
          !searchTerm &&
          openDayKeys.has(dayData.dayKey));

      if (shouldBeOpenInitially) {
        chevronIcon.classList.add("fa-chevron-up");
      } else {
        dayTransactionsContainer.style.maxHeight = "0px";
        chevronIcon.classList.add("fa-chevron-down");
      }

      dayData.transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .forEach((t) => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "monthly-view-transaction-item";
          const account = state.accounts.find((acc) => acc.id === t.account);
          const accountName = account ? account.name : "Unknown Acct";
          const isIncome = t.type === "income";
          const textColorClass = isIncome ? "text-income" : "text-expense";

          let subDetailText = accountName;
          if (!isIncome && t.category) {
            subDetailText += ` | ${t.category}`;
          } else if (!isIncome && !t.category) {
            subDetailText += ` | Uncategorized`;
          }

          itemDiv.innerHTML = `
              <div class="flex-grow mr-2 overflow-hidden">
                <p class="font-medium truncate ${textColorClass}" title="${
            t.description
          }">${t.description}</p>
                <p class="text-xs text-gray-400 mt-0.5">${subDetailText}</p>
              </div>
              <span class="font-semibold whitespace-nowrap ${textColorClass} ml-2 tabular-nums">${
            isIncome ? "+" : "-"
          }${formatCurrency(t.amount)}</span>
              <div class="edit-btn-container flex-shrink-0 ml-2">
                <button class="text-xs accent-text hover:text-accent-hover focus:outline-none" onclick="openEditTransactionForm('${
                  t.id
                }', event)" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="text-xs text-gray-500 hover:text-expense focus:outline-none" onclick="deleteTransaction('${
                  t.id
                }', event)" title="Delete"><i class="fas fa-times"></i></button>
              </div>`;
          dayTransactionsContainer.appendChild(itemDiv);
        });
      dayGroup.appendChild(dayTransactionsContainer);

      if (shouldBeOpenInitially) {
        setTimeout(() => {
          dayTransactionsContainer.style.maxHeight =
            dayTransactionsContainer.scrollHeight + "px";
        }, 0);
      }

      dayHeader.onclick = () => {
        const isCurrentlyCollapsed =
          dayTransactionsContainer.style.maxHeight === "0px";
        if (isCurrentlyCollapsed) {
          dayTransactionsContainer.style.maxHeight =
            dayTransactionsContainer.scrollHeight + "px";
          chevronIcon.classList.remove("fa-chevron-down");
          chevronIcon.classList.add("fa-chevron-up");
          if (!searchTerm) openDayKeys.add(dayData.dayKey);
        } else {
          dayTransactionsContainer.style.maxHeight = "0px";
          chevronIcon.classList.remove("fa-chevron-up");
          chevronIcon.classList.add("fa-chevron-down");
          if (!searchTerm) openDayKeys.delete(dayData.dayKey);
        }
      };
      listContainerElement.appendChild(dayGroup);
    });
    transactionListSection.appendChild(listContainerElement);
  }
  contentGrid.appendChild(transactionListSection);

  const categorySection = document.createElement("div");
  categorySection.className = "md:col-span-2 space-y-4";
  const summaryCard = document.createElement("div");
  summaryCard.className = "p-4 rounded-lg";
  summaryCard.style.backgroundColor = "var(--bg-tertiary)";
  summaryCard.innerHTML = `<h3 class="text-lg font-semibold mb-3">Category Summary (Full Month)</h3>`;
  const categoryList = document.createElement("ul");
  categoryList.className =
    "monthly-view-category-list space-y-1 text-sm max-h-48 overflow-y-auto pr-2";
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([_, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  if (sortedCategories.length > 0) {
    sortedCategories.forEach(([category, amount]) => {
      const li = document.createElement("li");
      // --- FIX: Added tabular-nums class to the amount span ---
      li.innerHTML = `<span class="truncate pr-2" title="${category}">${category}</span><span class="font-medium whitespace-nowrap tabular-nums">${formatCurrency(
        amount
      )}</span>`;
      categoryList.appendChild(li);
    });
  } else {
    categoryList.innerHTML =
      '<li class="text-gray-400 text-sm">No expenses in any category this month.</li>';
  }
  summaryCard.appendChild(categoryList);
  categorySection.appendChild(summaryCard);

  if (
    sortedCategories.length > 0 &&
    (!monthlyPieChartInstance || (isSearchingOrJustCleared && !searchTerm))
  ) {
    if (monthlyPieChartInstance) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
    const chartCard = document.createElement("div");
    chartCard.className = "p-4 rounded-lg h-96 md:h-[450px] flex flex-col";
    chartCard.style.backgroundColor = "var(--bg-tertiary)";
    const titleEl = document.createElement("h3");
    titleEl.className = "text-lg font-semibold mb-3 text-center";
    titleEl.textContent = "Category Distribution (Full Month)";
    chartCard.appendChild(titleEl);
    const canvasContainer = document.createElement("div");
    canvasContainer.className = "flex-grow relative chart-container";
    const canvas = document.createElement("canvas");
    canvas.id = "monthlyDetailPieChartCanvas";
    canvasContainer.appendChild(canvas);
    chartCard.appendChild(canvasContainer);
    categorySection.appendChild(chartCard);
    const pieData = {
      labels: sortedCategories.map(([c, _]) => c),
      values: sortedCategories.map(([_, a]) => a),
    };
    setTimeout(() => renderMonthlyPieChart(pieData), 100);
  } else if (sortedCategories.length === 0 && monthlyPieChartInstance) {
    monthlyPieChartInstance.destroy();
    monthlyPieChartInstance = null;
  } else if (
    sortedCategories.length === 0 &&
    !document.getElementById("monthlyDetailPieChartCanvas")
  ) {
    const noChartCard = document.createElement("div");
    noChartCard.className =
      "p-4 rounded-lg h-72 md:h-80 flex items-center justify-center";
    noChartCard.style.backgroundColor = "var(--bg-tertiary)";
    noChartCard.innerHTML =
      '<p class="text-gray-400 text-sm">No expense data for chart.</p>';
    categorySection.appendChild(noChartCard);
  }

  contentGrid.appendChild(categorySection);
  container.appendChild(contentGrid);
}
function renderMonthlyPieChart(data) {
  const canvas = document.getElementById("monthlyDetailPieChartCanvas");
  if (!canvas || !canvas.getContext) {
    console.error(
      "Canvas for monthly pie chart (id: monthlyDetailPieChartCanvas) not found or invalid."
    );

    if (monthlyPieChartInstance) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
    return;
  }
  const ctx = canvas.getContext("2d");

  const brandPiePalette = [
    "#e67e26",
    "#2a9d8f",
    "#e74c3c",
    "#3498db",
    "#f1c40f",
    "#9b59b6",
    "#34495e",
    "#1abc9c",
    "#7f8c8d",
    "#2ecc71",
    "#d35400",
    "#27ae60",
    "#c0392b",
  ];
  const backgroundColors = data.labels.map(
    (_, index) => brandPiePalette[index % brandPiePalette.length]
  );

  if (monthlyPieChartInstance) {
    monthlyPieChartInstance.data.labels = data.labels;
    monthlyPieChartInstance.data.datasets[0].data = data.values;
    monthlyPieChartInstance.data.datasets[0].backgroundColor = backgroundColors;
    monthlyPieChartInstance.update();
  } else {
    monthlyPieChartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Expenses by Category",
            data: data.values,
            backgroundColor: backgroundColors,
            borderColor: "var(--bg-secondary)",
            borderWidth: 1,
            hoverOffset: 8,
            hoverBorderColor: "var(--text-primary)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.85)",
            titleColor: "#fff",
            bodyColor: "#fff",
            padding: 12,
            cornerRadius: 4,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                let label = context.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed !== null) {
                  label += formatCurrency(context.parsed);

                  const datasetMeta = context.chart.getDatasetMeta(0);
                  const total =
                    datasetMeta.total ||
                    datasetMeta.data.reduce((sum, el) => sum + el.raw, 0);
                  const percentage =
                    total > 0
                      ? ((context.parsed / total) * 100).toFixed(1) + "%"
                      : "0.0%";
                  label += ` (${percentage})`;
                }
                return label;
              },
            },
          },
        },
      },
    });
  }
}

function renderCreditCardSection() {
  const limit = state.creditCard.limit || 0,
    transactions = state.creditCard.transactions || [];
  $("#ccLimit").innerHTML = `<span class="tabular-nums">${formatCurrency(
    limit
  )}</span>`;
  const spentUnpaid = transactions
    .filter((t) => !t.paidOff)
    .reduce((sum, t) => sum + t.amount - (t.paidAmount || 0), 0);
  const available = limit - spentUnpaid,
    availableEl = $("#ccAvailable");
  availableEl.innerHTML = `<span class="tabular-nums">${formatCurrency(
    available
  )}</span>`;
  availableEl.classList.toggle("text-danger", available < 0);
  availableEl.classList.toggle("accent-text", available >= 0);
}

function openCcHistoryModal() {
  const modal = $("#ccHistoryModal");
  if (!modal) return;

  const currentYear = new Date().getFullYear();
  const yearSelector = $("#ccYearSelector");
  const listContainer = $("#ccHistoryListContainer");
  const searchInput = $("#ccHistorySearchInput");
  const clearSearchBtn = $("#clearCcHistorySearchBtn");

  // --- Reset state on open ---
  ccHistoryFilter = "unpaid"; // Default filter
  if (searchInput) searchInput.value = "";
  if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
  ccHistoryOpenMonthKeys.clear();

  // --- Populate Year Selector ---
  const years = new Set(
    (state.creditCard.transactions || []).map((t) =>
      new Date(t.date).getFullYear()
    )
  );
  years.add(currentYear);
  yearSelector.innerHTML = "";
  [...years]
    .sort((a, b) => b - a)
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      if (year === currentYear) option.selected = true;
      yearSelector.appendChild(option);
    });

  // --- Main Rendering Function ---
  const renderFilteredCcList = () => {
    const selectedYear = parseInt(yearSelector.value);
    const searchTerm = searchInput.value.trim().toLowerCase();

    // 1. Filter by Year, Status, and Search Term
    let filteredTransactions = (state.creditCard.transactions || []).filter(
      (t) => {
        const tDate = new Date(t.date);
        if (tDate.getFullYear() !== selectedYear) return false;

        if (ccHistoryFilter === "unpaid" && t.paidOff) return false;
        if (ccHistoryFilter === "paid" && !t.paidOff) return false;

        if (searchTerm) {
          const descriptionMatch = t.description
            .toLowerCase()
            .includes(searchTerm);
          const amountMatch = t.amount.toFixed(2).includes(searchTerm);
          if (!descriptionMatch && !amountMatch) return false;
        }
        return true;
      }
    );

    // 2. Update Summary Stats (always based on full data, not filters)
    const limit = state.creditCard.limit || 0;
    const allUnpaid = (state.creditCard.transactions || [])
      .filter((t) => !t.paidOff)
      .reduce((sum, t) => sum + t.amount - (t.paidAmount || 0), 0);
    const available = limit - allUnpaid;
    $(
      "#ccHistoryLimit"
    ).innerHTML = `<span class="tabular-nums">${formatCurrency(limit)}</span>`;
    $(
      "#ccHistorySpentUnpaid"
    ).innerHTML = `<span class="tabular-nums">${formatCurrency(
      allUnpaid
    )}</span>`;
    const availableEl = $("#ccHistoryAvailable");
    availableEl.innerHTML = `<span class="tabular-nums">${formatCurrency(
      available
    )}</span>`;
    availableEl.classList.toggle("text-expense", available < 0);
    availableEl.classList.toggle("accent-text", available >= 0);

    // 3. Group by Month and Render
    listContainer.innerHTML = "";
    if (filteredTransactions.length === 0) {
      listContainer.innerHTML = `<p class="text-gray-400 text-sm text-center py-4">No transactions match your criteria.</p>`;
      return;
    }

    const transactionsByMonth = filteredTransactions.reduce((acc, t) => {
      const monthKey = new Date(t.date).getMonth(); // 0-11
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(t);
      return acc;
    }, {});

    Object.keys(transactionsByMonth)
      .sort((a, b) => b - a)
      .forEach((monthKey) => {
        const monthTransactions = transactionsByMonth[monthKey];
        monthTransactions.sort(
          (a, b) =>
            new Date(b.date) - new Date(a.date) || b.timestamp - a.timestamp
        );
        const monthName = new Date(selectedYear, monthKey).toLocaleString(
          "default",
          { month: "long" }
        );

        const monthGroup = document.createElement("div");
        monthGroup.className = "cc-history-month-group";

        const monthHeader = document.createElement("div");
        monthHeader.className = "cc-history-month-header";

        const totalSpentInMonth = monthTransactions.reduce(
          (sum, t) => sum + t.amount,
          0
        );

        monthHeader.innerHTML = `
            <span>${monthName} ${selectedYear}</span>
            <div class="flex items-center">
                <span class="text-sm text-expense mr-3 tabular-nums">${formatCurrency(
                  totalSpentInMonth
                )}</span>
                <i class="fas fa-chevron-down text-xs text-gray-400"></i>
            </div>
        `;

        const transactionsContainer = document.createElement("div");
        transactionsContainer.className = "cc-history-transactions-container";

        monthTransactions.forEach((t) => {
          const itemDiv = document.createElement("div");
          itemDiv.className = `cc-history-transaction-item ${
            t.paidOff ? "opacity-60" : ""
          }`;
          const remainingOnItem = t.amount - (t.paidAmount || 0);

          const buttonsHtml = `
              <div class="edit-btn-container">
                  ${
                    !t.paidOff && remainingOnItem > 0.005
                      ? `<button class="text-xs text-income hover:opacity-80 focus:outline-none mr-2" onclick="openPayCcItemForm('${t.id}')" title="Pay Item"><i class="fas fa-dollar-sign"></i></button>`
                      : ""
                  }
                  <button class="text-xs accent-text hover:text-accent-hover focus:outline-none mr-2" onclick="openEditCcTransactionForm('${
                    t.id
                  }')" title="Edit"><i class="fas fa-edit"></i></button>
                  <button class="text-xs text-gray-500 hover:text-expense focus:outline-none" onclick="deleteCcTransaction('${
                    t.id
                  }')" title="Delete"><i class="fas fa-times"></i></button>
              </div>`;

          itemDiv.innerHTML = `
              <div class="flex-grow mr-3 overflow-hidden">
                  <p class="font-medium truncate ${
                    t.paidOff ? "text-gray-500" : ""
                  }" title="${t.description}">${t.description}</p>
                  <p class="text-xs text-gray-400 mt-0.5">${new Date(
                    t.date
                  ).toLocaleDateString()} ${
            t.paidAmount > 0 && !t.paidOff
              ? `(Paid: <span class="tabular-nums">${formatCurrency(
                  t.paidAmount
                )}</span>)`
              : ""
          }</p>
              </div>
              <div class="flex items-center flex-shrink-0">
                  <span class="font-semibold mr-3 text-sm tabular-nums ${
                    t.paidOff
                      ? "text-gray-500"
                      : remainingOnItem <= 0.005
                      ? "text-income"
                      : "text-expense"
                  }">
                      ${
                        t.paidOff
                          ? formatCurrency(t.amount)
                          : formatCurrency(remainingOnItem)
                      } ${
            t.paidOff ? "" : remainingOnItem <= 0.005 ? " (Settled)" : " Left"
          }
                  </span>
                  ${buttonsHtml}
              </div>`;
          transactionsContainer.appendChild(itemDiv);
        });

        monthGroup.appendChild(monthHeader);
        monthGroup.appendChild(transactionsContainer);
        listContainer.appendChild(monthGroup);

        // Accordion Logic
        const fullMonthKey = `${selectedYear}-${monthKey}`;
        if (ccHistoryOpenMonthKeys.has(fullMonthKey) || searchTerm) {
          // Expand if searching
          transactionsContainer.style.maxHeight =
            transactionsContainer.scrollHeight + "px";
          monthHeader
            .querySelector("i")
            .classList.replace("fa-chevron-down", "fa-chevron-up");
        }

        monthHeader.onclick = () => {
          const icon = monthHeader.querySelector("i");
          const isCollapsed =
            transactionsContainer.style.maxHeight === "0px" ||
            !transactionsContainer.style.maxHeight;
          if (isCollapsed) {
            transactionsContainer.style.maxHeight =
              transactionsContainer.scrollHeight + "px";
            icon.classList.replace("fa-chevron-down", "fa-chevron-up");
            ccHistoryOpenMonthKeys.add(fullMonthKey);
          } else {
            transactionsContainer.style.maxHeight = "0px";
            icon.classList.replace("fa-chevron-up", "fa-chevron-down");
            ccHistoryOpenMonthKeys.delete(fullMonthKey);
          }
        };
      });

    // 4. Update active filter button
    $$("#ccHistoryFilterControls button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === ccHistoryFilter);
    });
  };

  // --- Setup Event Listeners ---
  yearSelector.onchange = () => {
    ccHistoryOpenMonthKeys.clear(); // Reset open accordions when year changes
    renderFilteredCcList();
  };

  $$("#ccHistoryFilterControls button").forEach((btn) => {
    btn.onclick = () => {
      ccHistoryFilter = btn.dataset.filter;
      renderFilteredCcList();
    };
  });

  // Expose the render function for the search listeners
  document.body.renderCcHistoryList = renderFilteredCcList;

  // Initial render
  renderFilteredCcList();
  modal.style.display = "block";
}

function handleCcTransactionSubmit(event) {
  event.preventDefault();
  const form = event.target,
    formData = new FormData(form);
  const amount = parseFloat(formData.get("ccAmount"));
  const description = formData.get("ccDescription").trim();
  const date = formData.get("ccDate");

  if (isNaN(amount) || amount <= 0) {
    showNotification("Valid amount required for CC transaction.", "error");
    return;
  }
  if (!description) {
    showNotification("Description required for CC transaction.", "error");
    return;
  }
  if (!date) {
    showNotification("Date required for CC transaction.", "error");
    return;
  }
  if (!state.creditCard.transactions) state.creditCard.transactions = [];

  const roundedAmount = roundToTwoDecimals(amount);
  const timestamp = Date.now();

  const newCcTransaction = {
    id: generateId(),
    amount: roundedAmount, // Store rounded amount
    description,
    date,
    paidAmount: 0, // Initial paid amount is 0
    paidOff: false,
    timestamp,
  };
  state.creditCard.transactions.push(newCcTransaction);
  showNotification("CC transaction added.", "success");

  saveData();
  renderCreditCardSection(); // This will use the rounded amount
  if ($("#ccHistoryModal").style.display === "block") openCcHistoryModal();
  form.reset();
  const ccDateInput = form.querySelector("#ccDate");
  if (ccDateInput) ccDateInput.value = getCurrentDateString(); // Use local date
}

function openEditCcTransactionModal(ccTransactionId) {
  const transaction = state.creditCard.transactions.find(
    (tx) => tx.id === ccTransactionId
  );
  if (!transaction) {
    showNotification("CC Transaction not found for editing.", "error");
    return;
  }
  if ($("#ccHistoryModal").style.display === "block") {
    closeModal("ccHistoryModal");
  }

  const formHtml = `
            <input type="hidden" name="editCcTransactionId" value="${
              transaction.id
            }">
            <div>
                <label for="modalCcAmount" class="block text-sm font-medium mb-1">Amount (LKR)</label>
                <input type="number" id="modalCcAmount" name="ccAmount" value="${transaction.amount.toFixed(
                  2
                )}" step="0.01" min="0" placeholder="Amount spent" required>
            </div>
            <div>
                <label for="modalCcDescription" class="block text-sm font-medium mb-1">Description</label>
                <input type="text" id="modalCcDescription" name="ccDescription" value="${
                  transaction.description
                }" placeholder="e.g., Online purchase" required>
            </div>
            <div>
                <label for="modalCcDate" class="block text-sm font-medium mb-1">Date</label>
                <input type="date" id="modalCcDate" name="ccDate" value="${
                  transaction.date
                }" required>
            </div>
            <button type="submit" class="btn btn-primary w-full"><i class="fas fa-save"></i> Update CC Transaction</button>
        `;
  openFormModal(
    "Edit CC Transaction",
    formHtml,
    handleEditCcTransactionModalSubmit
  );
}

function handleEditCcTransactionModalSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const ccTransactionId = formData.get("editCcTransactionId");

  const transaction = state.creditCard.transactions.find(
    (t) => t.id === ccTransactionId
  );
  if (!transaction) {
    showNotification("CC Transaction to edit not found.", "error");
    closeModal("formModal");
    return;
  }

  const newAmount = parseFloat(formData.get("ccAmount"));
  const newDescription = formData.get("ccDescription").trim();
  const newDate = formData.get("ccDate");

  if (isNaN(newAmount) || newAmount <= 0) {
    showNotification("Valid amount required for CC transaction.", "error");
    return;
  }
  if (!newDescription) {
    showNotification("Description required for CC transaction.", "error");
    return;
  }
  if (!newDate) {
    showNotification("Date required for CC transaction.", "error");
    return;
  }

  const roundedNewAmount = roundToTwoDecimals(newAmount);

  transaction.amount = roundedNewAmount;
  transaction.description = newDescription;
  transaction.date = newDate;
  // Do not update timestamp on edit to preserve original order in lists

  // Adjust paidAmount and paidOff status if new amount is less than what was already paid
  if (transaction.paidAmount > roundedNewAmount) {
    transaction.paidAmount = roundedNewAmount; // Cap paidAmount at the new transaction amount
  }
  if (roundToTwoDecimals(transaction.paidAmount) >= roundedNewAmount - 0.005) {
    transaction.paidOff = true;
    transaction.paidAmount = roundedNewAmount; // Ensure paidAmount exactly matches if paid off
  } else {
    transaction.paidOff = false;
  }

  saveData();
  renderCreditCardSection();

  // If the history modal is open, just refresh its content
  const renderFunction = document.body.renderCcHistoryList;
  if (renderFunction) {
    renderFunction();
  }

  closeModal("formModal");
  showNotification("CC Transaction updated successfully.", "success");
}

function deleteCcTransaction(transactionId) {
  const transactionIndex = state.creditCard.transactions.findIndex(
    (t) => t.id === transactionId
  );
  if (transactionIndex === -1) return;
  const transaction = state.creditCard.transactions[transactionIndex];

  showConfirmationModal(
    "Delete CC Transaction",
    `Are you sure you want to delete the CC transaction: <br><strong>"${
      transaction.description
    }"</strong> (${formatCurrency(
      transaction.amount
    )})?<br><br><strong class="text-warning">Warning:</strong> This will also remove any associated payment records made through the app for this specific CC item.`,
    "Delete",
    "Cancel",
    () => {
      // onConfirm
      state.transactions = state.transactions.filter(
        (tx) =>
          !(
            (
              tx.category === "Credit Card Payment" &&
              tx.description.includes(transaction.description.substring(0, 15))
            ) // Ensure this matching logic is your intent
          )
      );
      state.creditCard.transactions.splice(transactionIndex, 1);
      saveData();
      renderDashboard();
      renderCreditCardSection();
      if ($("#ccHistoryModal").style.display === "block") openCcHistoryModal();
      showNotification(
        "CC transaction and related payments deleted.",
        "success"
      );
    }
  );
}

function openAddDebtForm() {
  openFormModal(
    "Add New Debt",
    `<div><label for="debtWho" class="block text-sm font-medium mb-1">Who do you owe?</label><input type="text" id="debtWho" name="debtWho" placeholder="e.g., John Doe" required></div><div><label for="debtWhy" class="block text-sm font-medium mb-1">Reason?</label><input type="text" id="debtWhy" name="debtWhy" placeholder="e.g., Loan" required></div><div><label for="debtAmount" class="block text-sm font-medium mb-1">Amount Owed (LKR)</label><input type="number" id="debtAmount" name="debtAmount" step="0.01" min="0.01" required></div><div><label for="debtDueDate" class="block text-sm font-medium mb-1">Due Date</label><input type="date" id="debtDueDate" name="debtDueDate" required></div><button type="submit" class="btn btn-primary w-full">Add Debt</button>`,
    handleAddDebtSubmit
  );
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const debtDueDateInput = $("#debtDueDate");
  if (debtDueDateInput)
    debtDueDateInput.value = nextMonth.toISOString().split("T")[0];
}

function handleAddDebtSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const amount = parseFloat(form.get("debtAmount"));

  if (isNaN(amount) || amount <= 0) {
    showNotification("Invalid amount for debt.", "error");
    return;
  }
  const roundedAmount = roundToTwoDecimals(amount);

  const newDebt = {
    id: generateId(),
    who: form.get("debtWho").trim(),
    why: form.get("debtWhy").trim(),
    amount: roundedAmount, // Store rounded amount
    originalAmount: roundedAmount, // Store rounded original amount
    remainingAmount: roundedAmount, // Store rounded remaining amount
    dueDate: form.get("debtDueDate"),
    timestamp: Date.now(),
  };
  if (!newDebt.who || !newDebt.why || !newDebt.dueDate) {
    showNotification("All fields required for debt.", "error");
    return;
  }
  state.debts.push(newDebt);
  saveData();
  renderDashboard(); // This will call renderDebtList which should use formatted values
  closeModal("formModal");
  showNotification("Debt added.", "success");
}

function openEditDebtForm(id) {
  const d = state.debts.find((item) => item.id === id);
  if (!d) return;
  openFormModal(
    "Edit Debt",
    ` <input type="hidden" name="editDebtId" value="${
      d.id
    }"> <div><label class="block text-sm font-medium mb-1">Who</label><input type="text" name="debtWho" value="${
      d.who
    }" required></div> <div><label class="block text-sm font-medium mb-1">Why</label><input type="text" name="debtWhy" value="${
      d.why
    }" required></div> <div><label class="block text-sm font-medium mb-1">Original Amount</label><input type="number" name="debtOriginalAmount" value="${(
      d.originalAmount || d.amount
    ).toFixed(
      2
    )}" step="0.01" min="0.01" required></div> <div><label class="block text-sm font-medium mb-1">Remaining Amount</label><input type="number" name="debtRemainingAmount" value="${d.remainingAmount.toFixed(
      2
    )}" step="0.01" min="0" required></div> <div><label class="block text-sm font-medium mb-1">Due Date</label><input type="date" name="debtDueDate" value="${
      d.dueDate
    }" required></div> <button type="submit" class="btn btn-primary w-full">Update Debt</button> `,
    handleEditDebtSubmit
  );
}

function handleEditDebtSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const id = form.get("editDebtId");
  const debt = state.debts.find((d) => d.id === id);
  if (!debt) {
    showNotification("Debt not found for editing.", "error");
    return;
  }

  const originalAmount = parseFloat(form.get("debtOriginalAmount"));
  const remainingAmount = parseFloat(form.get("debtRemainingAmount"));

  if (
    isNaN(originalAmount) ||
    originalAmount <= 0 ||
    isNaN(remainingAmount) ||
    remainingAmount < 0 ||
    roundToTwoDecimals(remainingAmount) > roundToTwoDecimals(originalAmount)
  ) {
    showNotification(
      "Invalid amounts for debt. Remaining cannot exceed original, and amounts must be valid numbers.",
      "error"
    );
    return;
  }

  debt.who = form.get("debtWho").trim();
  debt.why = form.get("debtWhy").trim();
  debt.originalAmount = roundToTwoDecimals(originalAmount);
  debt.remainingAmount = roundToTwoDecimals(remainingAmount);
  debt.dueDate = form.get("debtDueDate");
  debt.timestamp = Date.now(); // Timestamp update is fine for edits if it signifies last modification
  debt.amount = debt.originalAmount; // Ensure 'amount' (if used elsewhere) matches originalAmount

  saveData();
  renderDashboard();
  closeModal("formModal");
  showNotification("Debt updated.", "success");
}

function openPayDebtForm(debtId) {
  const debt = state.debts.find((d) => d.id === debtId);
  if (!debt) return;

  const debtRepaymentCategoryName = "Debt Repayment";
  let categoryOptions = "";
  const otherCategories = state.categories
    .filter(
      (c) =>
        c.toLowerCase() !== "income" &&
        c.toLowerCase() !== "credit card payment" &&
        c.toLowerCase() !== debtRepaymentCategoryName.toLowerCase()
    )
    .sort((a, b) => a.localeCompare(b));

  if (
    state.categories.some(
      (c) => c.toLowerCase() === debtRepaymentCategoryName.toLowerCase()
    )
  ) {
    categoryOptions += `<option value="${debtRepaymentCategoryName}" selected>${debtRepaymentCategoryName}</option>`;
  } else {
    categoryOptions += `<option value="${debtRepaymentCategoryName}" selected>${debtRepaymentCategoryName} (Suggested)</option>`;
  }
  otherCategories.forEach((cat) => {
    categoryOptions += `<option value="${cat}">${cat}</option>`;
  });

  const formHtml = `
      <p class="mb-2 force-word-wrap">Owed: <span class="font-semibold tabular-nums">${formatCurrency(
        debt.remainingAmount
      )}</span> to ${debt.who} for ${debt.why}</p>
      <div>
          <label for="payDebtAmount" class="block text-sm font-medium mb-1">Payment Amount (LKR)</label>
          <input type="number" id="payDebtAmount" name="payDebtAmount" step="0.01" min="0.01" max="${debt.remainingAmount.toFixed(
            2
          )}" value="${debt.remainingAmount.toFixed(2)}" required>
      </div>
      <div>
          <label for="modalPayDebtAccount" class="block text-sm font-medium mb-1">Pay From Account</label>
          <select id="modalPayDebtAccount" name="payDebtAccount" required></select>
      </div>
      <div class="flex items-center mt-3 mb-1">
          <input type="checkbox" id="logDebtPaymentAsExpense" name="logDebtPaymentAsExpense" class="h-4 w-4 text-accent-primary border-gray-500 rounded focus:ring-accent-primary mr-2" checked>
          <label for="logDebtPaymentAsExpense" class="text-sm font-medium text-gray-300">Log this payment as an expense?</label>
      </div>
      <div id="debtPaymentCategoryGroup">
          <label for="modalPayDebtCategory" class="block text-sm font-medium mb-1">Category for this Payment</label>
          <select id="modalPayDebtCategory" name="payDebtCategory" required>${categoryOptions}</select>
      </div>
      <input type="hidden" name="debtId" value="${debtId}">
      <button type="submit" class="btn btn-primary w-full mt-3">Make Payment</button>
  `;
  openFormModal(`Pay Debt: ${debt.who}`, formHtml, handlePayDebtSubmit);
  populateDropdowns();

  const logExpenseCheckbox = document.getElementById("logDebtPaymentAsExpense");
  const categoryGroupDiv = document.getElementById("debtPaymentCategoryGroup");
  const categorySelect = document.getElementById("modalPayDebtCategory");

  if (logExpenseCheckbox && categoryGroupDiv && categorySelect) {
    categoryGroupDiv.style.display = logExpenseCheckbox.checked
      ? "block"
      : "none";
    categorySelect.required = logExpenseCheckbox.checked;

    logExpenseCheckbox.onchange = () => {
      if (logExpenseCheckbox.checked) {
        categoryGroupDiv.style.display = "block";
        categorySelect.required = true;
      } else {
        categoryGroupDiv.style.display = "none";
        categorySelect.required = false;
      }
    };
  }
}

function handlePayDebtSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const debtId = form.get("debtId");
  const paymentAmount = parseFloat(form.get("payDebtAmount"));
  const accountId = form.get("payDebtAccount");
  const logAsExpense = form.get("logDebtPaymentAsExpense") === "on";
  const category = logAsExpense ? form.get("payDebtCategory") : null;
  const currentDate = getCurrentDateString(); // Use local date

  const debt = state.debts.find((d) => d.id === debtId);
  const account = state.accounts.find((acc) => acc.id === accountId);

  if (!debt || !account) {
    showNotification("Debt or account not found.", "error");
    return;
  }

  const roundedPaymentAmount = roundToTwoDecimals(paymentAmount);

  if (
    isNaN(roundedPaymentAmount) ||
    roundedPaymentAmount <= 0 ||
    roundedPaymentAmount > roundToTwoDecimals(debt.remainingAmount + 0.005)
  ) {
    showNotification("Invalid payment amount for debt.", "error");
    return;
  }
  if (logAsExpense && !category) {
    showNotification(
      "Please select a category for this payment if logging as an expense.",
      "error"
    );
    return;
  }
  if (account.balance < roundedPaymentAmount) {
    showNotification(`Insufficient funds in ${account.name}.`, "warning");
    return;
  }

  account.balance = roundToTwoDecimals(account.balance - roundedPaymentAmount);
  if (isNaN(account.balance)) account.balance = 0;

  debt.remainingAmount = roundToTwoDecimals(
    debt.remainingAmount - roundedPaymentAmount
  );

  let message = `Payment of ${formatCurrency(roundedPaymentAmount)} made for ${
    debt.who
  }. Remaining: ${formatCurrency(debt.remainingAmount)}.`;

  if (logAsExpense) {
    const expenseTransaction = {
      id: generateId(),
      type: "expense",
      amount: roundedPaymentAmount,
      account: accountId,
      category: category,
      // CORRECTED: Store the full description, not the truncated version.
      description: `Debt Payment: ${debt.who} - ${debt.why}`,
      date: currentDate,
      timestamp: Date.now(),
    };
    state.transactions.push(expenseTransaction);
    message += " Expense logged.";
    refreshMonthlyViewIfRelevant(currentDate);
  } else {
    message += " Not logged as expense.";
  }

  if (debt.remainingAmount <= 0.005) {
    debt.remainingAmount = 0;
    state.debts = state.debts.filter((d) => d.id !== debtId);
    message = `Debt for ${debt.who} fully paid.${
      logAsExpense ? " Expense logged." : " Not logged as expense."
    }`;
  }

  saveData();
  renderDashboard();
  populateDropdowns();
  closeModal("formModal");
  showNotification(message, "success");
}

function deleteDebt(debtId) {
  const debt = state.debts.find((d) => d.id === debtId);
  if (!debt) return;

  showConfirmationModal(
    "Delete Debt",
    `Are you sure you want to delete the debt for <strong>"${
      debt.who
    }"</strong> regarding "${debt.why}" (${formatCurrency(
      debt.remainingAmount
    )})?<br><br>This removes the record only.`,
    "Delete",
    "Cancel",
    () => {
      // onConfirm
      state.debts = state.debts.filter((d) => d.id !== debtId);
      saveData();
      renderDashboard();
      if ($("#debtsViewModal").style.display === "block") renderDebtList();
      showNotification("Debt entry deleted.", "success");
    }
  );
}

function openAddReceivableForm() {
  const formHtml = `
            <div><label for="recWho" class="block text-sm font-medium mb-1">Who owes you?</label><input type="text" id="recWho" name="recWho" placeholder="e.g., Jane Doe" required></div>
            <div><label for="recWhy" class="block text-sm font-medium mb-1">Reason?</label><input type="text" id="recWhy" name="recWhy" placeholder="e.g., Friendly loan" required></div>
            <div><label for="recAmount" class="block text-sm font-medium mb-1">Amount Owed (LKR)</label><input type="number" id="recAmount" name="recAmount" step="0.01" min="0.01" required></div>
            <div><label for="recDateGiven" class="block text-sm font-medium mb-1">Date Given</label><input type="date" id="recDateGiven" name="recDateGiven" required></div>
            <div>
                <label for="recType" class="block text-sm font-medium mb-1">Type</label>
                <select id="recType" name="recType" required onchange="toggleReceivableSourceAccount(this.value, 'recSourceAccountGroupAdd', 'recSourceAccountAdd')">
                    <option value="cash">Cash/Bank Loan</option>
                    <option value="cc">Credit Card Loan</option>
                </select>
            </div>
            <div id="recSourceAccountGroupAdd" style="display: block;"> <label for="recSourceAccountAdd" class="block text-sm font-medium mb-1">Source Account (if Cash/Bank)</label>
                <select id="recSourceAccountAdd" name="receivableSourceAccount" required></select> </div>
                <p id="receivableCcDisclaimer" class="disclaimer-text" style="display: none;">
                <i class="fas fa-info-circle mr-1"></i>
                <strong>Important:</strong> Selecting "Credit Card Loan" means you provided funds from your credit card. This entry tracks the money owed <em>to you</em>. It does not automatically create an expense on your credit card. If you used your credit card for this, please add a separate "CC Expense" manually to reflect the charge on your card.
            </p>
            <button type="submit" class="btn btn-primary w-full"><i class="fas fa-plus"></i> Add Receivable</button>
        `;
  openFormModal("Add New Receivable", formHtml, handleAddReceivableSubmit);

  const dateGivenInput = $("#recDateGiven");
  if (dateGivenInput)
    dateGivenInput.value = new Date().toISOString().split("T")[0];

  const sourceAccountSelect = $("#recSourceAccountAdd");
  if (sourceAccountSelect) {
    sourceAccountSelect.innerHTML = "";
    state.accounts.forEach((a) => {
      const o = document.createElement("option");
      o.value = a.id;
      o.textContent = `${a.name} (${formatCurrency(a.balance)})`;
      sourceAccountSelect.appendChild(o);
    });
  }
  const recTypeSelect = $("#recType");
  if (recTypeSelect) {
    toggleReceivableSourceAccount(
      recTypeSelect.value,
      "recSourceAccountGroupAdd",
      "recSourceAccountAdd"
    );
  }
}

function toggleReceivableSourceAccount(type, groupId, selectId) {
  const group = document.getElementById(groupId);
  const select = document.getElementById(selectId);
  const disclaimerElement = document.getElementById("receivableCcDisclaimer");

  if (group && select) {
    if (type === "cash") {
      group.style.display = "block";
      select.required = true;
      if (disclaimerElement) {
        disclaimerElement.style.display = "none";
      }
    } else {
      group.style.display = "none";
      select.required = false;
      if (disclaimerElement) {
        disclaimerElement.style.display = "block";
      }
    }
  } else {
    if (!group)
      console.warn(
        `toggleReceivableSourceAccount: Group element with ID '${groupId}' not found.`
      );
    if (!select)
      console.warn(
        `toggleReceivableSourceAccount: Select element with ID '${selectId}' not found.`
      );
  }

  if (!disclaimerElement && type === "cc") {
    console.warn(
      "toggleReceivableSourceAccount: Disclaimer element with ID 'receivableCcDisclaimer' not found, but was expected for 'cc' type."
    );
  }
}

function handleAddReceivableSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const amount = parseFloat(form.get("recAmount"));
  const type = form.get("recType");
  const sourceAccountId =
    type === "cash" ? form.get("receivableSourceAccount") : null;

  if (isNaN(amount) || amount <= 0) {
    showNotification("Invalid amount for receivable.", "error");
    return;
  }
  const roundedAmount = roundToTwoDecimals(amount);

  const newRec = {
    id: generateId(),
    who: form.get("recWho").trim(),
    why: form.get("recWhy").trim(),
    amount: roundedAmount,
    originalAmount: roundedAmount,
    remainingAmount: roundedAmount,
    dateGiven: form.get("recDateGiven"),
    type: type,
    sourceAccount: sourceAccountId,
    ccTransactionId: null, // This might be set if type is 'cc' and a CC tx is auto-created
    timestamp: Date.now(),
  };
  if (!newRec.who || !newRec.why || !newRec.dateGiven) {
    showNotification("All fields required for receivable.", "error");
    return;
  }

  if (type === "cash") {
    if (!sourceAccountId) {
      showNotification("Source account required for cash loan.", "error");
      return;
    }
    let srcAcc = state.accounts.find((acc) => acc.id === sourceAccountId);
    if (!srcAcc) {
      showNotification("Source account not found.", "error");
      return;
    }
    if (srcAcc.balance < roundedAmount) {
      showNotification(`Insufficient funds in ${srcAcc.name}.`, "warning");
      // Note: Original code proceeded here. Consider if this should be a hard stop.
      // For now, matching original behavior of allowing it but warning.
      // However, if we deduct, it should be from a valid balance.
      // Let's make it a hard stop if funds are insufficient for cash type.
      return;
    }
    srcAcc.balance = roundToTwoDecimals(srcAcc.balance - roundedAmount);
    if (isNaN(srcAcc.balance)) srcAcc.balance = 0;
  } else if (type === "cc") {
    // If you were to auto-create a CC transaction here, its amount should also be rounded.
    // Currently, no CC transaction is auto-created.
    console.log(
      `Receivable of type 'cc' added for ${newRec.who}. User to manually add CC expense if needed.`
    );
  }

  state.receivables.push(newRec);
  saveData();
  renderDashboard();
  populateDropdowns();
  if (type === "cc") renderCreditCardSection(); // If it affects CC, re-render that section
  closeModal("formModal");
  showNotification(
    `Receivable for ${newRec.who} added.${
      type === "cash" && sourceAccountId
        ? ` ${formatCurrency(roundedAmount)} deducted from account.`
        : ""
    }`,
    "success"
  );
}

function openEditReceivableForm(id) {
  const r = state.receivables.find((item) => item.id === id);
  if (!r) return;
  openFormModal(
    "Edit Receivable",
    ` <input type="hidden" name="editReceivableId" value="${
      r.id
    }"> <div><label class="block text-sm font-medium mb-1">Who</label><input type="text" name="recWho" value="${
      r.who
    }" required></div> <div><label class="block text-sm font-medium mb-1">Why</label><input type="text" name="recWhy" value="${
      r.why
    }" required></div> <div><label class="block text-sm font-medium mb-1">Original Amount</label><input type="number" name="recOriginalAmount" value="${(
      r.originalAmount || r.amount
    ).toFixed(
      2
    )}" step="0.01" min="0.01" required></div> <div><label class="block text-sm font-medium mb-1">Remaining</label><input type="number" name="recRemainingAmount" value="${r.remainingAmount.toFixed(
      2
    )}" step="0.01" min="0" required></div> <div><label class="block text-sm font-medium mb-1">Date Given</label><input type="date" name="recDateGiven" value="${
      r.dateGiven
    }" required></div> <div><label class="block text-sm font-medium mb-1">Type</label><select id="recTypeEdit" name="recType" onchange="toggleReceivableSourceAccount(this.value, 'recSourceAccountGroupEdit', 'recSourceAccountEdit')"><option value="cash" ${
      r.type === "cash" ? "selected" : ""
    }>Cash/Bank</option><option value="cc" ${
      r.type === "cc" ? "selected" : ""
    }>Credit Card</option></select></div> <div id="recSourceAccountGroupEdit" style="display:${
      r.type === "cash" ? "block" : "none"
    }"><label class="block text-sm font-medium mb-1">Source Account</label><select id="recSourceAccountEdit" name="receivableSourceAccount">${state.accounts
      .map(
        (acc) =>
          `<option value="${acc.id}" ${
            r.sourceAccount === acc.id ? "selected" : ""
          }>${acc.name} (${formatCurrency(acc.balance)})</option>`
      )
      .join(
        ""
      )}</select></div> <button type="submit" class="btn btn-primary w-full">Update Receivable</button> `,
    handleEditReceivableSubmit
  );
  const recTypeEditSelect = $("#recTypeEdit");
  if (recTypeEditSelect)
    toggleReceivableSourceAccount(
      recTypeEditSelect.value,
      "recSourceAccountGroupEdit",
      "recSourceAccountEdit"
    );
}

function handleEditReceivableSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const id = form.get("editReceivableId");
  const rec = state.receivables.find((r) => r.id === id);
  if (!rec) {
    showNotification("Receivable not found for editing.", "error");
    return;
  }

  const oldSourceAccountId = rec.sourceAccount;
  const oldOriginalAmount = rec.originalAmount; // Already rounded from previous save
  const oldType = rec.type;
  const oldCcTxId = rec.ccTransactionId;

  const newOriginalAmountForm = parseFloat(form.get("recOriginalAmount"));
  const newRemainingAmountForm = parseFloat(form.get("recRemainingAmount"));
  const newType = form.get("recType");
  const newSourceAccountId =
    newType === "cash" ? form.get("receivableSourceAccount") : null;

  if (
    isNaN(newOriginalAmountForm) ||
    newOriginalAmountForm <= 0 ||
    isNaN(newRemainingAmountForm) ||
    newRemainingAmountForm < 0 ||
    roundToTwoDecimals(newRemainingAmountForm) >
      roundToTwoDecimals(newOriginalAmountForm)
  ) {
    showNotification(
      "Invalid amounts for receivable. Remaining cannot exceed original, and amounts must be valid numbers.",
      "error"
    );
    return;
  }
  if (newType === "cash" && !newSourceAccountId) {
    showNotification("Source account required for cash loan type.", "error");
    return;
  }

  // Round amounts from form
  const roundedNewOriginalAmount = roundToTwoDecimals(newOriginalAmountForm);
  const roundedNewRemainingAmount = roundToTwoDecimals(newRemainingAmountForm);

  // Revert effect of old receivable if type or source account or original amount changed
  if (oldType === "cash" && oldSourceAccountId) {
    const oldSrcAccount = state.accounts.find(
      (acc) => acc.id === oldSourceAccountId
    );
    if (oldSrcAccount) {
      oldSrcAccount.balance = roundToTwoDecimals(
        oldSrcAccount.balance + oldOriginalAmount
      );
      if (isNaN(oldSrcAccount.balance)) oldSrcAccount.balance = 0;
    }
  } else if (oldType === "cc" && oldCcTxId) {
    // If it was a CC type and had an associated CC transaction (if that logic existed)
    // state.creditCard.transactions = state.creditCard.transactions.filter(tx => tx.id !== oldCcTxId);
    // Currently, ccTransactionId is not actively used to link to an auto-created CC expense.
  }

  // Update receivable properties
  rec.who = form.get("recWho").trim();
  rec.why = form.get("recWhy").trim();
  rec.originalAmount = roundedNewOriginalAmount;
  rec.amount = roundedNewOriginalAmount; // Ensure amount also reflects original
  rec.remainingAmount = roundedNewRemainingAmount;
  rec.dateGiven = form.get("recDateGiven");
  rec.type = newType;
  rec.sourceAccount = newSourceAccountId;
  rec.timestamp = Date.now();
  rec.ccTransactionId = null; // Reset if type changed, or if it was never used for auto-creation

  // Apply effect of new receivable
  if (rec.type === "cash" && rec.sourceAccount) {
    const newSrcAccount = state.accounts.find(
      (acc) => acc.id === rec.sourceAccount
    );
    if (newSrcAccount) {
      if (newSrcAccount.balance < rec.originalAmount) {
        showNotification(
          `Insufficient funds in new source account ${newSrcAccount.name}. Reverting changes.`,
          "warning"
        );
        // Re-apply old state (simplified: ideally, store full old rec object and restore)
        if (oldType === "cash" && oldSourceAccountId) {
          const oldSrcAccForRevert = state.accounts.find(
            (acc) => acc.id === oldSourceAccountId
          );
          if (oldSrcAccForRevert)
            oldSrcAccForRevert.balance = roundToTwoDecimals(
              oldSrcAccForRevert.balance - oldOriginalAmount
            );
        }
        // This revert is partial; a full object clone and restore would be safer for complex edits.
        // For now, we'll just stop the update. The form will retain user's bad input.
        return;
      }
      newSrcAccount.balance = roundToTwoDecimals(
        newSrcAccount.balance - rec.originalAmount
      );
      if (isNaN(newSrcAccount.balance)) newSrcAccount.balance = 0;
    }
  } else if (rec.type === "cc") {
    // If auto-creating a CC transaction upon edit to 'cc' type:
    // const ccTx = { id: generateId(), amount: rec.originalAmount, ... };
    // state.creditCard.transactions.push(ccTx);
    // rec.ccTransactionId = ccTx.id;
    // For now, no auto CC transaction creation on edit.
  }

  saveData();
  renderDashboard();
  populateDropdowns();
  if (rec.type === "cc" || oldType === "cc") renderCreditCardSection();
  closeModal("formModal");
  showNotification("Receivable updated.", "success");
}

function openReceivePaymentForm(recId) {
  const receivable = state.receivables.find((r) => r.id === recId);
  if (!receivable) {
    showNotification("Receivable not found.", "error");
    return;
  }

  let disclaimerHtml = "";
  if (receivable.type === "cc") {
    disclaimerHtml = `
      <p id="receivablePaymentCcDisclaimer" class="disclaimer-text mt-3 mb-2">
        <i class="fas fa-info-circle mr-1"></i>
        <strong>Credit Card Receivable:</strong> The amount you receive will be added to the selected account. Remember, this does not pay your credit card bill. You'll need to record a separate 'Credit Card Payment' transaction later.
      </p>
    `;
  }

  const overpaymentInfoHtml = `
    <p id="overpaymentInfo" class="text-xs text-gray-400 mt-1 mb-2" style="display: none;">
      Any amount received over <span class="tabular-nums">${formatCurrency(
        receivable.remainingAmount
      )}</span> will be logged as additional income.
    </p>
  `;

  const formHtml = `
    <p class="mb-2 force-word-wrap">Owed: <span class="font-semibold tabular-nums">${formatCurrency(
      receivable.remainingAmount
    )}</span> by ${receivable.who} for ${receivable.why}</p>
    <div>
      <label for="recPaymentAmount" class="block text-sm font-medium mb-1">Amount Received (LKR)</label>
      <input type="number" id="recPaymentAmount" name="recPaymentAmount" step="0.01" min="0.01" 
             value="${receivable.remainingAmount.toFixed(2)}" required> 
    </div>
    ${overpaymentInfoHtml}
    <div>
      <label for="recPaymentAccount" class="block text-sm font-medium mb-1">Receive Into Account</label>
      <select id="recPaymentAccount" name="recPaymentAccount" required></select>
    </div>
    ${disclaimerHtml} 
    <input type="hidden" name="recId" value="${recId}">
    <button type="submit" class="btn btn-primary w-full mt-3">Record Payment</button>
  `;

  openFormModal(
    `Receive Payment from: ${receivable.who}`,
    formHtml,
    handleReceivePaymentSubmit
  );
  populateDropdowns();

  const amountInput = document.getElementById("recPaymentAmount");
  const overpaymentInfoP = document.getElementById("overpaymentInfo");
  if (amountInput && overpaymentInfoP) {
    const checkOverpayment = () => {
      const enteredAmount = parseFloat(amountInput.value);
      if (
        !isNaN(enteredAmount) &&
        receivable.remainingAmount > 0 &&
        enteredAmount > receivable.remainingAmount
      ) {
        overpaymentInfoP.style.display = "block";
      } else {
        overpaymentInfoP.style.display = "none";
      }
    };
    amountInput.addEventListener("input", checkOverpayment);
    checkOverpayment();
  }
}

function handleReceivePaymentSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const recId = form.get("recId");
  const paymentAmountForm = parseFloat(form.get("recPaymentAmount"));
  const accountId = form.get("recPaymentAccount");
  const currentDate = new Date().toISOString().split("T")[0];

  const receivable = state.receivables.find((r) => r.id === recId);
  const account = state.accounts.find((acc) => acc.id === accountId);

  if (!receivable || !account) {
    showNotification("Receivable or account not found.", "error");
    return;
  }

  if (isNaN(paymentAmountForm) || paymentAmountForm <= 0) {
    showNotification(
      "Invalid payment amount. Must be greater than zero.",
      "error"
    );
    return;
  }

  const roundedPaymentAmount = roundToTwoDecimals(paymentAmountForm);

  account.balance = roundToTwoDecimals(account.balance + roundedPaymentAmount);
  if (isNaN(account.balance)) account.balance = 0;

  let notificationMessage = "";
  let extraIncomeLogged = false;
  const originalRemaining = receivable.remainingAmount; // Already rounded

  if (roundedPaymentAmount > originalRemaining) {
    const extraAmount = roundToTwoDecimals(
      roundedPaymentAmount - originalRemaining
    );
    receivable.remainingAmount = 0;

    const extraIncomeTransaction = {
      id: generateId(),
      type: "income",
      amount: extraAmount,
      account: accountId,
      category: null,
      description: `${receivable.who} Paid Back Extra`, // Capitalized as per user feedback
      date: currentDate,
      timestamp: Date.now(),
    };
    state.transactions.push(extraIncomeTransaction);
    extraIncomeLogged = true;
    console.log(
      `Logged extra income of ${formatCurrency(extraAmount)} from ${
        receivable.who
      }`
    );
  } else {
    receivable.remainingAmount = roundToTwoDecimals(
      originalRemaining - roundedPaymentAmount
    );
  }

  if (receivable.remainingAmount <= 0.005) {
    receivable.remainingAmount = 0;
    state.receivables = state.receivables.filter((r) => r.id !== recId);
    notificationMessage = `Receivable from ${receivable.who} fully paid.`;
    if (extraIncomeLogged) {
      notificationMessage += ` Extra ${formatCurrency(
        roundToTwoDecimals(roundedPaymentAmount - originalRemaining)
      )} logged as income.`;
    }
  } else {
    notificationMessage = `Payment of ${formatCurrency(
      roundedPaymentAmount
    )} received from ${receivable.who}. Remaining: ${formatCurrency(
      receivable.remainingAmount
    )}.`;
  }

  saveData();
  renderDashboard();
  populateDropdowns();
  closeModal("formModal");
  showNotification(notificationMessage, "success");

  if (extraIncomeLogged) {
    refreshMonthlyViewIfRelevant(currentDate);
  }
}

function deleteReceivable(recId) {
  const receivable = state.receivables.find((r) => r.id === recId);
  if (!receivable) {
    showNotification("Receivable not found.", "error");
    return;
  }

  let modalMessage = `Are you sure you want to delete the receivable from <strong>"${
    receivable.who
  }"</strong> for "${receivable.why}" (${formatCurrency(
    receivable.remainingAmount
  )})?<br><br>This action only removes the record of them owing you money.`;

  if (receivable.type === "cash" && receivable.sourceAccount) {
    const sourceAccountName =
      state.accounts.find((acc) => acc.id === receivable.sourceAccount)?.name ||
      "Unknown Account";
    modalMessage += `<br><br><strong class="text-warning">Important:</strong> This will NOT automatically refund the amount to your source account ('${sourceAccountName}'). That adjustment needs to be handled manually if required.`;
  } else if (receivable.type === "cc") {
    modalMessage += `<br><br><strong class="text-warning">Note:</strong> This does NOT affect any separate credit card expense you might have recorded on your own card for giving out this loan.`;
  }

  showConfirmationModal(
    "Delete Receivable",
    modalMessage,
    "Delete",
    "Cancel",
    () => {
      // onConfirm
      state.receivables = state.receivables.filter((r) => r.id !== recId);
      saveData();
      renderDashboard();
      if ($("#receivablesViewModal").style.display === "block") {
        renderReceivableList();
      }
      showNotification("Receivable entry deleted successfully.", "success");
    }
  );
}

function openAddInstallmentForm() {
  const disclaimerHtml = `
    <p class="disclaimer-text mt-3 mb-2">
      <i class="fas fa-info-circle mr-1"></i>
      <strong>Important:</strong> This tracks installment status (months left). Actual payments (especially for CC installments) must be recorded manually via 'Add Transaction' or 'Add CC Expense' to update account balances.
    </p>
  `;

  const formHtml = `
    <div>
      <label for="instDescription" class="block text-sm font-medium mb-1">Description</label>
      <input type="text" id="instDescription" name="instDescription" placeholder="e.g., New Phone" required>
    </div>
    <div>
      <label for="instFullAmount" class="block text-sm font-medium mb-1">Full Original Amount (LKR)</label>
      <input type="number" id="instFullAmount" name="instFullAmount" step="0.01" min="0.01" placeholder="Total original cost" required>
    </div>
    <div>
      <label for="instTotalMonths" class="block text-sm font-medium mb-1">Total Months for Plan</label>
      <input type="number" id="instTotalMonths" name="instTotalMonths" step="1" min="1" placeholder="e.g., 12" required>
    </div>
    <div>
      <label for="instMonthsLeft" class="block text-sm font-medium mb-1">Months Left (if not full term)</label>
      <input type="number" id="instMonthsLeft" name="instMonthsLeft" step="1" min="0" placeholder="Defaults to Total Months">
    </div>
    <div>
      <label for="instStartDate" class="block text-sm font-medium mb-1">Start Date</label>
      <input type="date" id="instStartDate" name="instStartDate" required>
    </div>
    ${disclaimerHtml}
    <button type="submit" class="btn btn-primary w-full mt-3">Add Plan</button>
  `; // Added mt-3 to button for spacing after disclaimer

  openFormModal(
    "Add New Installment Plan",
    formHtml,
    handleAddInstallmentSubmit
  );
  const instStartDateInput = $("#instStartDate");
  if (instStartDateInput)
    instStartDateInput.value = new Date().toISOString().split("T")[0];

  const totalMonthsInput = $("#instTotalMonths");
  const monthsLeftInput = $("#instMonthsLeft");
  if (totalMonthsInput && monthsLeftInput) {
    const setMaxMonthsLeft = () => {
      const total = parseInt(totalMonthsInput.value);
      if (!isNaN(total) && total > 0) {
        monthsLeftInput.max = total;
        if (parseInt(monthsLeftInput.value) > total) {
          monthsLeftInput.value = total;
        }
      } else {
        monthsLeftInput.removeAttribute("max");
      }
    };
    totalMonthsInput.addEventListener("input", setMaxMonthsLeft);
    setMaxMonthsLeft();
  }
}

function handleAddInstallmentSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const fullAmount = parseFloat(formData.get("instFullAmount"));
  const totalMonths = parseInt(formData.get("instTotalMonths"));
  let monthsLeft = parseInt(formData.get("instMonthsLeft"));

  if (
    isNaN(fullAmount) ||
    fullAmount <= 0 ||
    isNaN(totalMonths) ||
    totalMonths <= 0
  ) {
    showNotification(
      "Invalid full amount or total months for installment.",
      "error"
    );
    return;
  }

  if (isNaN(monthsLeft) || monthsLeft > totalMonths || monthsLeft < 0) {
    monthsLeft = totalMonths;
  }

  const roundedFullAmount = roundToTwoDecimals(fullAmount);
  // Calculate monthlyAmount based on roundedFullAmount to avoid compounding rounding errors over months
  const monthlyAmount = roundToTwoDecimals(roundedFullAmount / totalMonths);

  const newInstallment = {
    id: generateId(),
    description: formData.get("instDescription").trim(),
    monthlyAmount: monthlyAmount, // Store rounded monthly amount
    totalMonths: totalMonths,
    monthsLeft: monthsLeft,
    startDate: formData.get("instStartDate"),
    originalFullAmount: roundedFullAmount, // Store rounded full original amount
    timestamp: Date.now(),
  };

  if (!newInstallment.description || !newInstallment.startDate) {
    showNotification(
      "Description and Start Date are required for installment.",
      "error"
    );
    return;
  }

  state.installments.push(newInstallment);
  saveData();
  renderDashboard();
  closeModal("formModal");
  showNotification("Installment plan added.", "success");
}

function openEditInstallmentForm(id) {
  const i = state.installments.find((item) => item.id === id);
  if (!i) {
    showNotification("Installment plan not found for editing.", "error");
    return;
  }

  const disclaimerHtml = `
    <p class="disclaimer-text mt-3 mb-2">
      <i class="fas fa-info-circle mr-1"></i>
      <strong>Important:</strong> This tracks installment status (months left). Actual payments (especially for CC installments) must be recorded manually via 'Add Transaction' or 'Add CC Expense' to update account balances.
    </p>
  `;

  const currentFullAmount =
    i.originalFullAmount || i.monthlyAmount * i.totalMonths;

  const formHtml = `
    <input type="hidden" name="editInstallmentId" value="${i.id}">
    <div>
      <label for="instDescription" class="block text-sm font-medium mb-1">Description</label>
      <input type="text" id="instDescription" name="instDescription" value="${
        i.description
      }" required>
    </div>
    <div>
      <label for="instFullAmount" class="block text-sm font-medium mb-1">Full Original Amount (LKR)</label>
      <input type="number" id="instFullAmount" name="instFullAmount" value="${currentFullAmount.toFixed(
        2
      )}" step="0.01" min="0.01" required>
    </div>
    <div>
      <label for="instTotalMonths" class="block text-sm font-medium mb-1">Total Months for Plan</label>
      <input type="number" id="instTotalMonths" name="instTotalMonths" value="${
        i.totalMonths
      }" step="1" min="1" required>
    </div>
    <div>
      <label for="instMonthsLeft" class="block text-sm font-medium mb-1">Months Left</label>
      <input type="number" id="instMonthsLeft" name="instMonthsLeft" value="${
        i.monthsLeft
      }" step="1" min="0" max="${i.totalMonths}" required>
    </div>
    <div>
      <label for="instStartDate" class="block text-sm font-medium mb-1">Start Date</label>
      <input type="date" id="instStartDate" name="instStartDate" value="${
        i.startDate
      }" required>
    </div>
    ${disclaimerHtml} 
    <button type="submit" class="btn btn-primary w-full mt-3">Update Plan</button>
  `; // Added mt-3 to button for spacing

  openFormModal("Edit Installment Plan", formHtml, handleEditInstallmentSubmit);

  // Add listener to ensure monthsLeft is not greater than totalMonths for edit form
  const totalMonthsInput = document.getElementById("instTotalMonths"); // Use document.getElementById for modals
  const monthsLeftInput = document.getElementById("instMonthsLeft");
  if (totalMonthsInput && monthsLeftInput) {
    const setMaxMonthsLeftEdit = () => {
      const total = parseInt(totalMonthsInput.value);
      if (!isNaN(total) && total > 0) {
        monthsLeftInput.max = total;
        // If current monthsLeft exceeds new totalMonths, adjust it
        if (parseInt(monthsLeftInput.value) > total) {
          monthsLeftInput.value = total;
        }
      } else {
        monthsLeftInput.removeAttribute("max");
      }
    };
    totalMonthsInput.addEventListener("input", setMaxMonthsLeftEdit);
    // Initial call to set max based on current totalMonths value
    setMaxMonthsLeftEdit();
  }
}

function handleEditInstallmentSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const id = form.get("editInstallmentId");
  const inst = state.installments.find((i) => i.id === id);
  if (!inst) {
    showNotification("Installment plan not found for editing.", "error");
    return;
  }

  const fullAmount = parseFloat(form.get("instFullAmount"));
  const totalMonths = parseInt(form.get("instTotalMonths"));
  const monthsLeft = parseInt(form.get("instMonthsLeft"));

  if (
    isNaN(fullAmount) ||
    fullAmount <= 0 ||
    isNaN(totalMonths) ||
    totalMonths <= 0
  ) {
    showNotification(
      "Invalid full amount or total months for installment.",
      "error"
    );
    return;
  }
  if (isNaN(monthsLeft) || monthsLeft < 0 || monthsLeft > totalMonths) {
    showNotification("Invalid months left for installment.", "error");
    return;
  }

  const roundedFullAmount = roundToTwoDecimals(fullAmount);
  const newMonthlyAmount = roundToTwoDecimals(roundedFullAmount / totalMonths);

  inst.description = form.get("instDescription").trim();
  inst.totalMonths = totalMonths;
  inst.monthsLeft = monthsLeft;
  inst.startDate = form.get("instStartDate");
  inst.monthlyAmount = newMonthlyAmount; // Update with newly calculated rounded monthly amount
  inst.originalFullAmount = roundedFullAmount; // Update with new rounded full amount
  inst.timestamp = Date.now();

  saveData();
  renderDashboard();
  closeModal("formModal");
  showNotification("Installment plan updated.", "success");
}

function payInstallmentMonth(installmentId) {
  const installment = state.installments.find((i) => i.id === installmentId);
  if (!installment || installment.monthsLeft <= 0) {
    showNotification(
      "This installment plan is already fully paid or not found.",
      "info"
    );
    return;
  }

  const confirmationMessageHtml = `
    <p class="mb-4 text-center text-gray-300 force-word-wrap">
      Mark one month as paid for "<strong>${installment.description}</strong>"?
    </p>
    <p class="mb-4 text-center text-sm text-gray-400">
      Amount: <span class="tabular-nums">${formatCurrency(
        installment.monthlyAmount
      )}</span><br>
      Months remaining after this: ${installment.monthsLeft - 1}
    </p>
    <p class="disclaimer-text mt-3 mb-4">
      <i class="fas fa-exclamation-triangle mr-1"></i>
      <strong>Note:</strong> This action only updates the installment status. No financial transaction will be recorded, and no account balances will be affected by this step. Remember to record the actual payment manually.
    </p>
    <div class="flex justify-end gap-3 mt-4">
      <button type="button" id="cancelInstallmentConfirmBtn" class="btn btn-secondary">Cancel</button>
      <button type="button" id="confirmInstallmentPayBtn" class="btn btn-primary">Confirm & Update Status</button>
    </div>
  `;

  openFormModal(
    `Confirm Installment Update: ${installment.description}`,
    confirmationMessageHtml,
    null
  );

  const confirmBtn = document.getElementById("confirmInstallmentPayBtn");
  const cancelBtn = document.getElementById("cancelInstallmentConfirmBtn");

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      handleConfirmInstallmentPayment(installmentId);
      closeModal("formModal");
    };
  }
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      closeModal("formModal");
    };
  }
}

function handleConfirmInstallmentPayment(installmentId) {
  const installment = state.installments.find((i) => i.id === installmentId);

  if (!installment) {
    showNotification("Installment plan not found.", "error");
    return;
  }

  if (installment.monthsLeft <= 0) {
    showNotification(
      "This installment plan is already marked as fully paid.",
      "info"
    );
    return;
  }

  installment.monthsLeft -= 1;

  let notificationMessage = "";

  if (installment.monthsLeft <= 0) {
    state.installments = state.installments.filter(
      (i) => i.id !== installmentId
    );
    notificationMessage = `Installment plan "${installment.description}" marked as fully paid and completed.`;
  } else {
    notificationMessage = `Installment status updated for "${installment.description}". ${installment.monthsLeft} months remaining.`;
  }

  saveData();
  renderDashboard();
  showNotification(notificationMessage, "success");
}

function deleteInstallment(installmentId) {
  const installment = state.installments.find((i) => i.id === installmentId);
  if (!installment) return;

  showConfirmationModal(
    "Delete Installment Plan",
    `Are you sure you want to delete the installment plan: <br><strong>"${installment.description}"</strong>?<br><br>This removes the record only.`,
    "Delete",
    "Cancel",
    () => {
      // onConfirm
      state.installments = state.installments.filter(
        (i) => i.id !== installmentId
      );
      saveData();
      renderDashboard();
      showNotification("Installment plan deleted.", "success");
    }
  );
}

function openPayCcItemForm(ccTransactionId) {
  const item = state.creditCard.transactions.find(
    (t) => t.id === ccTransactionId
  );
  if (!item) return;
  const remaining = item.amount - (item.paidAmount || 0);
  if (remaining <= 0.005) {
    showNotification("This item is already fully paid/settled.", "info");
    return;
  }

  const ccPaymentCategoryName = "Credit Card Payment";
  let categoryOptions = "";
  const otherCcCategories = state.categories
    .filter(
      (c) =>
        c.toLowerCase() !== "income" &&
        c.toLowerCase() !== ccPaymentCategoryName.toLowerCase()
    )
    .sort((a, b) => a.localeCompare(b));

  if (
    state.categories.some(
      (c) => c.toLowerCase() === ccPaymentCategoryName.toLowerCase()
    )
  ) {
    categoryOptions += `<option value="${ccPaymentCategoryName}" selected>${ccPaymentCategoryName}</option>`;
  } else {
    categoryOptions += `<option value="${ccPaymentCategoryName}" selected>${ccPaymentCategoryName} (Suggested)</option>`;
  }
  otherCcCategories.forEach((cat) => {
    categoryOptions += `<option value="${cat}">${cat}</option>`;
  });

  const formHtml = `
      <input type="hidden" name="ccItemId" value="${item.id}">
      <p class="mb-2 tabular-nums">Item Amount: ${formatCurrency(
        item.amount
      )}</p>
      <p class="mb-2 tabular-nums">Paid So Far: ${formatCurrency(
        item.paidAmount || 0
      )}</p>
      <p class="mb-2">Remaining on Item: <strong class="text-danger tabular-nums">${formatCurrency(
        remaining
      )}</strong></p>
      <div>
          <label for="ccItemPayAmount" class="block text-sm font-medium mb-1">Payment Amount</label>
          <input type="number" id="ccItemPayAmount" name="ccItemPayAmount" step="0.01" min="0.01" max="${remaining.toFixed(
            2
          )}" value="${remaining.toFixed(2)}" required>
      </div>
      <div>
          <label for="modalCcPayFromAccount" class="block text-sm font-medium mb-1">Pay From Account</label>
          <select id="modalCcPayFromAccount" name="ccPayFromAccount" required></select>
      </div>
      <div class="flex items-center mt-3 mb-1">
          <input type="checkbox" id="logCcPaymentAsExpense" name="logCcPaymentAsExpense" class="h-4 w-4 text-accent-primary border-gray-500 rounded focus:ring-accent-primary mr-2" checked>
          <label for="logCcPaymentAsExpense" class="text-sm font-medium text-gray-300">Log this payment as an expense?</label>
      </div>
      <div id="ccPaymentCategoryGroup">
          <label for="modalCcPayCategory" class="block text-sm font-medium mb-1">Category for this Payment</label>
          <select id="modalCcPayCategory" name="ccPayCategory" required>${categoryOptions}</select>
      </div>
      <button type="submit" class="btn btn-primary w-full mt-3">Make Payment</button>
  `;
  openFormModal(
    `Pay CC Item: ${item.description.substring(0, 30)}...`,
    formHtml,
    handlePayCcItemSubmit
  );
  populateDropdowns();

  const logCcExpenseCheckbox = document.getElementById("logCcPaymentAsExpense");
  const ccCategoryGroupDiv = document.getElementById("ccPaymentCategoryGroup");
  const ccCategorySelect = document.getElementById("modalCcPayCategory");

  if (logCcExpenseCheckbox && ccCategoryGroupDiv && ccCategorySelect) {
    ccCategoryGroupDiv.style.display = logCcExpenseCheckbox.checked
      ? "block"
      : "none";
    ccCategorySelect.required = logCcExpenseCheckbox.checked;

    logCcExpenseCheckbox.onchange = () => {
      if (logCcExpenseCheckbox.checked) {
        ccCategoryGroupDiv.style.display = "block";
        ccCategorySelect.required = true;
      } else {
        ccCategoryGroupDiv.style.display = "none";
        ccCategorySelect.required = false;
      }
    };
  }
}

function handlePayCcItemSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const ccItemId = form.get("ccItemId");
  const paymentAmountForm = parseFloat(form.get("ccItemPayAmount"));
  const accountId = form.get("ccPayFromAccount");
  const logAsExpense = form.get("logCcPaymentAsExpense") === "on";
  const category = logAsExpense ? form.get("ccPayCategory") : null;

  const item = state.creditCard.transactions.find((t) => t.id === ccItemId);
  const account = state.accounts.find((acc) => acc.id === accountId);

  if (!item || !account) {
    showNotification("CC item or account not found.", "error");
    return;
  }

  const roundedPaymentAmount = roundToTwoDecimals(paymentAmountForm);
  const remainingOnItem = roundToTwoDecimals(
    item.amount - (item.paidAmount || 0)
  );

  if (
    isNaN(roundedPaymentAmount) ||
    roundedPaymentAmount <= 0 ||
    roundedPaymentAmount > roundToTwoDecimals(remainingOnItem + 0.005)
  ) {
    showNotification("Invalid payment amount for CC item.", "error");
    return;
  }
  if (logAsExpense && !category) {
    showNotification(
      "Please select a category for this payment if logging as an expense.",
      "error"
    );
    return;
  }
  if (account.balance < roundedPaymentAmount) {
    showNotification(`Insufficient funds in ${account.name}.`, "warning");
    return;
  }

  account.balance = roundToTwoDecimals(account.balance - roundedPaymentAmount);
  if (isNaN(account.balance)) account.balance = 0;

  item.paidAmount = roundToTwoDecimals(
    (item.paidAmount || 0) + roundedPaymentAmount
  );

  if (item.paidAmount >= roundToTwoDecimals(item.amount - 0.005)) {
    item.paidOff = true;
    item.paidAmount = item.amount;
  }

  let notificationMessage = `Payment of ${formatCurrency(
    roundedPaymentAmount
  )} for CC item "${item.description.substring(0, 20)}..." recorded.`;

  const paymentDate = getCurrentDateString();

  if (logAsExpense) {
    const expenseTx = {
      id: generateId(),
      type: "expense",
      amount: roundedPaymentAmount,
      account: accountId,
      category: category,
      // CORRECTED: Store the full description, not the truncated version.
      description: `Credit Card Payment: ${item.description}`,
      date: paymentDate,
      timestamp: Date.now(),
    };
    state.transactions.push(expenseTx);
    notificationMessage += " Expense logged.";
    refreshMonthlyViewIfRelevant(paymentDate);
  } else {
    notificationMessage += " Not logged as expense.";
  }
  if (item.paidOff) {
    notificationMessage = `CC item "${item.description.substring(
      0,
      20
    )}..." fully paid.${
      logAsExpense ? " Expense logged." : " Not logged as expense."
    }`;
  }

  saveData();
  renderDashboard();
  renderCreditCardSection();
  populateDropdowns();
  if ($("#ccHistoryModal").style.display === "block") openCcHistoryModal();
  closeModal("formModal");
  showNotification(notificationMessage, "success");
}

function openSettingsModal() {
  renderSettingsForm();

  setupSettingsTabs();

  const storageInfoElement = $("#storageSizeInfo");
  if (storageInfoElement) {
    storageInfoElement.textContent = `Approx. Storage Used: ${getFormattedLocalStorageSize(
      STORAGE_KEY
    )}`;
  }

  $("#settingsModal").style.display = "block";
  cancelDeleteAllData();
  displayAppVersion();
}

function renderSettingsForm() {
  const accountManagementList = $("#accountManagementList");
  if (!accountManagementList) {
    console.error(
      "#accountManagementList element not found in #settingsAccountsPanel."
    );
  } else {
    accountManagementList.innerHTML = "";
    state.accounts.forEach((acc) => {
      const accRow = document.createElement("div");
      accRow.className =
        "grid grid-cols-[auto,1fr,1fr] gap-x-3 items-center py-1 account-row";
      if (acc.hidden) {
        accRow.classList.add("account-row-hidden");
      }

      // Hide/Show Button
      const hideButton = document.createElement("button");
      hideButton.type = "button";
      hideButton.className = "btn-icon-hide justify-self-center";
      hideButton.dataset.accountId = acc.id;
      hideButton.innerHTML = `<i class="fas ${
        acc.hidden ? "fa-eye-slash" : "fa-eye"
      }"></i>`;

      if (acc.id === "cash") {
        hideButton.disabled = true;
        hideButton.style.opacity = "0.3";
        hideButton.style.cursor = "not-allowed";
      } else {
        hideButton.onclick = () => toggleAccountVisibility(acc.id);
      }
      accRow.appendChild(hideButton);

      // Name Input
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.name = `accountName_${acc.id}`;
      nameInput.value = acc.name;
      nameInput.dataset.accountId = acc.id;
      nameInput.className = "!py-1 !px-2 text-sm rounded placeholder-gray-400";
      nameInput.style.backgroundColor = "var(--bg-secondary)";
      nameInput.style.borderColor = "var(--border-color)";
      nameInput.style.color = "var(--text-primary)";
      if (acc.id === "cash") {
        nameInput.readOnly = true;
        nameInput.classList.add("text-gray-400", "cursor-not-allowed");
      }
      accRow.appendChild(nameInput);

      // Balance Input
      const balanceInput = document.createElement("input");
      balanceInput.type = "number";
      balanceInput.name = `accountBalance_${acc.id}`;
      balanceInput.value = acc.balance.toFixed(2);
      balanceInput.step = "0.01";
      balanceInput.dataset.accountId = acc.id;
      balanceInput.className =
        "!py-1 !px-2 text-sm rounded placeholder-gray-400";
      balanceInput.style.backgroundColor = "var(--bg-secondary)";
      balanceInput.style.borderColor = "var(--border-color)";
      balanceInput.style.color = "var(--text-primary)";
      accRow.appendChild(balanceInput);

      accountManagementList.appendChild(accRow);
    });
  }

  const manageAccountsForm = $("#manageAccountsForm");
  if (manageAccountsForm) {
    manageAccountsForm.onsubmit = handleManageAccountsSubmit;
  }

  const settingsCcLimitAmountInput = $("#settingsCcLimitAmount");
  if (settingsCcLimitAmountInput) {
    settingsCcLimitAmountInput.value = (
      (state.creditCard && state.creditCard.limit) ||
      0
    ).toFixed(2);
    settingsCcLimitAmountInput.style.backgroundColor = "var(--bg-secondary)";
    settingsCcLimitAmountInput.style.borderColor = "var(--border-color)";
    settingsCcLimitAmountInput.style.color = "var(--text-primary)";
  }

  const settingsCcLimitForm = $("#settingsCcLimitForm");
  if (settingsCcLimitForm) {
    settingsCcLimitForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(settingsCcLimitForm);
      const limit = parseFloat(formData.get("ccLimitAmount"));
      if (isNaN(limit) || limit < 0) {
        showNotification("Invalid credit limit amount.", "error");
        return;
      }
      if (!state.creditCard) {
        state.creditCard = { limit: 0, transactions: [] };
      }
      state.creditCard.limit = limit;
      saveData();
      renderCreditCardSection();
      if ($("#ccHistoryModal").style.display === "block") openCcHistoryModal();
      showNotification(
        `Credit limit set to ${formatCurrency(limit)}.`,
        "success"
      );
    };
  }

  const toggleCcSectionElement = $("#toggleCcSection");
  if (toggleCcSectionElement) {
    if (!state.settings) {
      state.settings = {
        initialSetupDone: false,
        showCcDashboardSection: true,
        theme: "dark",
      };
    }
    toggleCcSectionElement.checked =
      state.settings.showCcDashboardSection !== undefined
        ? state.settings.showCcDashboardSection
        : true;

    if (!toggleCcSectionElement.dataset.listenerAttached) {
      toggleCcSectionElement.onchange = () => {
        if (!state.settings) {
          state.settings = {
            initialSetupDone: false,
            showCcDashboardSection: true,
            theme: "dark",
          };
        }
        state.settings.showCcDashboardSection = toggleCcSectionElement.checked;
        saveData();
        updateCcDashboardSectionVisibility();
        showNotification(
          `Credit Card section on dashboard will now be ${
            toggleCcSectionElement.checked ? "shown" : "hidden"
          }.`,
          "info"
        );
      };
      toggleCcSectionElement.dataset.listenerAttached = "true";
    }
  }

  const addCategoryForm = $("#addCategoryForm");
  if (addCategoryForm) {
    addCategoryForm.onsubmit = addCategory;
    const newCategoryNameInput =
      addCategoryForm.querySelector("#newCategoryName");
    if (newCategoryNameInput) {
      newCategoryNameInput.style.backgroundColor = "var(--bg-secondary)";
      newCategoryNameInput.style.borderColor = "var(--border-color)";
      newCategoryNameInput.style.color = "var(--text-primary)";
    }
  }
  renderCategorySettingsList();
}

function toggleAccountVisibility(accountId) {
  const account = state.accounts.find((acc) => acc.id === accountId);
  if (!account || account.id === "cash") return;

  const performToggle = () => {
    account.hidden = !account.hidden;
    saveData();
    renderDashboard();
    populateDropdowns();
    renderSettingsForm(); // Re-render settings to update the button and style
    showNotification(
      `Account "${account.name}" is now ${
        account.hidden ? "hidden" : "visible"
      }.`,
      "info"
    );
  };

  if (!account.hidden && account.balance !== 0) {
    showConfirmationModal(
      "Hide Account?",
      `This account has a balance of <strong>${formatCurrency(
        account.balance
      )}</strong>. Hiding it will remove it from the dashboard, but its balance will still be included in your "Total Available" figure.<br><br>Are you sure you want to hide it?`,
      "Yes, Hide It",
      "Cancel",
      performToggle, // onConfirm
      null, // onCancel
      "btn-primary" // Use a less destructive button color
    );
  } else {
    performToggle(); // Hide if balance is zero or unhide without confirmation
  }
}

function renderCategorySettingsList() {
  const categoryList = $("#categorySettingsList");
  if (!categoryList) {
    console.error("#categorySettingsList element not found.");
    return;
  }
  categoryList.innerHTML = "";

  const sortedCategories = [...state.categories].sort((a, b) =>
    a.localeCompare(b)
  );

  sortedCategories.forEach((cat) => {
    const li = document.createElement("li");

    li.className = "flex justify-between items-center p-2 rounded";
    li.style.backgroundColor = "var(--bg-secondary)";
    li.style.borderColor = "var(--border-color)";
    li.style.borderWidth = "1px";

    const inputElementHTML = `<input type="text" value="${cat}" data-original-name="${cat}" class="bg-transparent border-none focus:ring-0 focus:outline-none p-0 flex-grow mr-2 text-sm">`;

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "flex items-center gap-x-2";

    const saveButtonHTML = `<button class="btn btn-primary btn-sm !py-0.5 !px-2 text-xs" onclick="renameCategory(this)">Save</button>`;
    const deleteButtonHTML = `<button class="text-gray-400 hover:text-expense focus:outline-none" onclick="deleteCategory('${cat}')" title="Delete Category"><i class="fas fa-times"></i></button>`;

    li.innerHTML = inputElementHTML;
    buttonsDiv.innerHTML = saveButtonHTML + deleteButtonHTML;
    li.appendChild(buttonsDiv);

    categoryList.appendChild(li);
  });
}

function renameCategory(buttonElement) {
  const liElement = buttonElement.closest("li");
  const inputElement = liElement.querySelector('input[type="text"]');
  const newName = inputElement.value.trim();
  const originalName = inputElement.dataset.originalName;
  if (!newName) {
    showNotification("Category name cannot be empty.", "error");
    inputElement.value = originalName;
    return;
  }
  if (newName === originalName) return;
  if (
    state.categories.some(
      (cat) =>
        cat.toLowerCase() === newName.toLowerCase() && cat !== originalName
    )
  ) {
    showNotification(`Category name "${newName}" already exists.`, "error");
    inputElement.value = originalName;
    return;
  }
  const index = state.categories.indexOf(originalName);
  if (index > -1) {
    state.categories[index] = newName;
    state.categories.sort((a, b) => a.localeCompare(b));
    let updateCount = 0;
    state.transactions.forEach((t) => {
      if (t.category === originalName) {
        t.category = newName;
        updateCount++;
      }
    });
    saveData();
    populateDropdowns();
    renderCategorySettingsList();
    showNotification(
      `Category "${originalName}" renamed to "${newName}". ${updateCount} transaction(s) updated.`,
      "success"
    );
  } else {
    showNotification(`Original category "${originalName}" not found.`, "error");
    inputElement.value = originalName;
  }
}

function addCategory(event) {
  event.preventDefault();
  const input = $("#newCategoryName");
  const newCategoryName = input.value.trim();
  if (!newCategoryName) {
    showNotification("Category name cannot be empty.", "error");
    return;
  }
  if (
    state.categories.some(
      (cat) => cat.toLowerCase() === newCategoryName.toLowerCase()
    )
  ) {
    showNotification(
      `Category "${newCategoryName}" already exists.`,
      "warning"
    );
    input.value = "";
    return;
  }
  state.categories.push(newCategoryName);
  state.categories.sort((a, b) => a.localeCompare(b));
  saveData();
  populateDropdowns();
  renderCategorySettingsList();
  input.value = "";
  showNotification(`Category "${newCategoryName}" added.`, "success");
}

function deleteCategory(categoryName) {
  if (categoryName === "Other") {
    showNotification("The 'Other' category cannot be deleted.", "warning");
    return;
  }
  const isUsed = state.transactions.some((t) => t.category === categoryName);
  if (isUsed) {
    showNotification(
      `Category "${categoryName}" is in use and cannot be deleted. Reassign transactions first or rename the category.`,
      "error"
    );
    return;
  }
  if (!state.categories.includes(categoryName)) {
    showNotification(`Category "${categoryName}" not found.`, "error");
    return;
  }
  if (
    confirm(
      `Are you sure you want to delete the category "${categoryName}"? This action cannot be undone if the category is not in use.`
    )
  ) {
    state.categories = state.categories.filter((cat) => cat !== categoryName);
    saveData();
    populateDropdowns();
    renderCategorySettingsList();
    showNotification(`Category "${categoryName}" deleted.`, "success");
  }
}

function updateCcDashboardSectionVisibility() {
  const ccDashboardSection = $("#creditCardDashboardSection");
  if (ccDashboardSection) {
    let isVisible = true;
    if (state.settings && state.settings.showCcDashboardSection !== undefined) {
      isVisible = state.settings.showCcDashboardSection;
    } else if (state.settings === undefined) {
      state.settings = {
        initialSetupDone: false,
        showCcDashboardSection: true,
      };
      console.log(
        "state.settings was undefined, initialized showCcDashboardSection to true"
      );
    }

    if (isVisible) {
      ccDashboardSection.style.display = "";
    } else {
      ccDashboardSection.style.display = "none";
    }
  }

  const ccLimitSettingsCard = $("#ccLimitSettingsCard");
  if (ccLimitSettingsCard) {
  }
}

function handleManageAccountsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  let changesMade = false;
  let errors = [];

  state.accounts.forEach((acc) => {
    const newNameInput = formData.get(`accountName_${acc.id}`);
    const newBalanceInput = formData.get(`accountBalance_${acc.id}`);

    if (newNameInput === null || newBalanceInput === null) {
      console.warn(`Inputs for account ${acc.id} not found in form data.`);
      return;
    }

    const newName = newNameInput.trim();
    const newBalance = parseFloat(newBalanceInput);

    if (acc.id !== "cash") {
      if (!newName) {
        errors.push(
          `Account name for "${acc.name}" (ID: ${acc.id}) cannot be empty.`
        );
      } else if (newName !== acc.name) {
        if (
          state.accounts.some(
            (existingAcc) =>
              existingAcc.id !== acc.id &&
              existingAcc.name.toLowerCase() === newName.toLowerCase()
          )
        ) {
          errors.push(
            `Account name "${newName}" already exists. Please choose a unique name.`
          );
        } else {
          acc.name = newName;
          changesMade = true;
        }
      }
    }

    if (isNaN(newBalance)) {
      errors.push(
        `Invalid balance entered for account "${acc.name}". Please enter a valid number.`
      );
    } else {
      const roundedNewBalance = roundToTwoDecimals(newBalance);
      // Check if balance actually changed (comparing rounded values)
      if (Math.abs(acc.balance - roundedNewBalance) > 0.005) {
        acc.balance = roundedNewBalance; // Store rounded balance
        changesMade = true;
      } else if (acc.balance !== roundedNewBalance && changesMade === false) {
        // If the input was like 10.00001 but stored is 10.00, still update to ensure it's clean
        // but only if no other more significant change was made (to avoid multiple notifications for tiny cleanups)
        // This logic might be too nuanced, simpler to just update if toFixed(2) differs.
        // For now, we rely on the > 0.005 check. If the user types "10.0000001" and current is 10.00,
        // it might not register as a change unless the parseFloat(toFixed(2)) differs.
        // Let's ensure it's always set to the rounded value if it was a valid number.
        if (acc.balance !== roundedNewBalance) {
          // If the stored balance isn't already the perfectly rounded one
          acc.balance = roundedNewBalance;
          // Don't mark changesMade = true for this minor cleanup unless it was a real value change.
        }
      }
    }
  });

  if (errors.length > 0) {
    errors.forEach((err) => showNotification(err, "error", 6000));
    renderSettingsForm();
    return;
  }

  if (changesMade) {
    if (state.settings && !state.settings.initialSetupDone) {
      state.settings.initialSetupDone = true;
    }
    saveData();
    renderDashboard();
    populateDropdowns();
    renderSettingsForm();
    showNotification(
      "Account names and/or balances updated successfully.",
      "success"
    );
  } else {
    // Check if any balance was just re-formatted to 2 decimals without changing its value significantly
    let formattingChangeOnly = false;
    state.accounts.forEach((acc) => {
      const newBalanceFromForm = parseFloat(
        formData.get(`accountBalance_${acc.id}`)
      );
      if (
        !isNaN(newBalanceFromForm) &&
        acc.balance !== roundToTwoDecimals(newBalanceFromForm) &&
        Math.abs(acc.balance - roundToTwoDecimals(newBalanceFromForm)) <= 0.005
      ) {
        // This means the value was like 10.001 and became 10.00.
        // We should still save this to ensure clean data.
        acc.balance = roundToTwoDecimals(newBalanceFromForm);
        formattingChangeOnly = true;
      }
    });
    if (formattingChangeOnly && !changesMade) {
      // only save if it was just a formatting cleanup
      saveData();
      renderDashboard();
      populateDropdowns();
      renderSettingsForm();
      showNotification(
        "Account balances formatted to two decimal places.",
        "info"
      );
    } else if (!changesMade) {
      showNotification(
        "No changes detected in account names or balances.",
        "info"
      );
    }
  }
}

function exportData() {
  try {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json",
    });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");
    link.download = `kaasi-backup-${timestamp}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Data exported.", "success");
  } catch (error) {
    console.error("Export failed:", error);
    showNotification("Data export failed.", "error");
  }
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) {
    if (event && event.target) event.target.value = null;
    return;
  }

  showConfirmationModal(
    "Import Data",
    "Importing data will <strong class='text-warning'>OVERWRITE ALL</strong> current data. This action cannot be undone.<br><br>Are you sure you want to proceed?",
    "Import & Overwrite",
    "Cancel",
    () => {
      // onConfirm
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let importedData = JSON.parse(e.target.result);
          if (importedData && typeof importedData === "object") {
            // Sanitization logic from your previous full script.js
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
                  i.originalFullAmount = roundToTwoDecimals(
                    i.originalFullAmount
                  );
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
                  if (
                    ccTrans.paidAmount >=
                    roundToTwoDecimals(ccTrans.amount - 0.005)
                  ) {
                    ccTrans.paidOff = true;
                    ccTrans.paidAmount = ccTrans.amount;
                  } else {
                    ccTrans.paidOff = false;
                  }
                });
              }
            }

            state = deepMerge(getDefaultState(), importedData);
            ensureDefaultAccounts();
            ensureDefaultCategories();

            state.accounts.forEach((acc) => {
              if (isNaN(acc.balance) || typeof acc.balance !== "number")
                acc.balance = 0;
              else acc.balance = roundToTwoDecimals(acc.balance);
            });

            if (!state.creditCard)
              state.creditCard = { limit: 0, transactions: [] };
            if (
              isNaN(state.creditCard.limit) ||
              typeof state.creditCard.limit !== "number"
            )
              state.creditCard.limit = 0;
            else
              state.creditCard.limit = roundToTwoDecimals(
                state.creditCard.limit
              );

            if (!Array.isArray(state.creditCard.transactions))
              state.creditCard.transactions = [];
            state.creditCard.transactions.forEach((t) => {
              if (typeof t.amount !== "number" || isNaN(t.amount)) t.amount = 0;
              else t.amount = roundToTwoDecimals(t.amount);
              if (typeof t.paidAmount !== "number" || isNaN(t.paidAmount))
                t.paidAmount = 0;
              else t.paidAmount = roundToTwoDecimals(t.paidAmount);
              if (t.paidAmount >= roundToTwoDecimals(t.amount - 0.005)) {
                t.paidOff = true;
                t.paidAmount = t.amount;
              } else {
                t.paidOff = false;
              }
              if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
            });
            state.transactions.forEach((t) => {
              if (!t.timestamp) t.timestamp = new Date(t.date).getTime();
            });
            state.debts.forEach((d) => {
              if (!d.timestamp) d.timestamp = new Date(d.dueDate).getTime();
            });
            state.receivables.forEach((r) => {
              if (!r.timestamp) r.timestamp = new Date(r.dateGiven).getTime();
            });
            state.installments.forEach((i) => {
              if (!i.timestamp) i.timestamp = new Date(i.startDate).getTime();
            });

            if (!state.settings) state.settings = getDefaultState().settings;
            state.settings.initialSetupDone = true;

            saveData();
            initializeUI(true);
            showNotification(
              "Data imported and sanitized successfully. Application refreshed.",
              "success"
            );
            closeModal("settingsModal");
          } else {
            throw new Error(
              "Invalid data structure in imported file. Ensure it's a Kaasi backup."
            );
          }
        } catch (error) {
          console.error("Import failed during processing:", error);
          showNotification(`Import failed: ${error.message}`, "error", 7000);
        } finally {
          if (event && event.target) event.target.value = null;
        }
      };
      reader.onerror = () => {
        showNotification("Failed to read the import file.", "error");
        if (event && event.target) event.target.value = null;
      };
      reader.readAsText(file);
    },
    () => {
      // onCancel
      if (event && event.target) event.target.value = null;
      showNotification("Import cancelled.", "info");
    },
    "btn-primary"
  );
}

function generateMonthlyPdfReport() {
  if (typeof window.jspdf === "undefined") {
    showNotification("PDF generation library is not loaded.", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const activeTab = $("#monthTabs .tab-button.active");

  if (!activeTab) {
    showNotification("Please select a month to generate a report.", "info");
    return;
  }

  const month = parseInt(activeTab.dataset.month);
  const year = parseInt(activeTab.dataset.year);
  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  showNotification(`Generating PDF for ${monthName} ${year}...`, "info", 3000);

  // --- 1. Data Preparation ---
  const transactionsInMonth = state.transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};

  transactionsInMonth.forEach((t) => {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      const category = t.category || "Other";
      if (!categoryTotals[category]) {
        categoryTotals[category] = 0;
      }
      categoryTotals[category] += t.amount;
    }
  });
  const netFlow = totalIncome - totalExpense;

  // --- 2. PDF Document Setup ---
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let cursorY = margin;

  // --- Base64 Encoded PNG Logo ---
  const kaasiLogoBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZwAAACNCAMAAAC0YjyBAAAAM1BMVEUAAADmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibmfibz/BTlAAAAEHRSTlMAgMBA8BBgoNAwIOCwcJBQIn4GGAAADw5JREFUeNrsnNnS2yAMRs2+GLDe/2nbSaebFfgA86dNxuc2Cw4HkIRxtlVIItqlLOII281/hqTfeGdvQ/8GY50WLTkPtLNmu3kpMXv6DpTzwOe43bwKm4ioIYeT7HbzAqLQREgOR4t7+nw10dEDLIfjbj2MxWqgnFvPi+BqsJxbz+sxQtN1OaTFnVovR+1EXXIgu9puVmISUa8cTLonz0KUppVySN+TZxmFqFeOTVJ6wpTtpoE5hJTiMBsiegJyGEbZAuaQj1s/Vv6JRUuw/BuxvRtZ0wOd8ZIG5NRQwi9a2gRrtYE7N/R2W+OOfuHag5YaCLx1naiK/RI5mU683bZe6V3/CwE5kJh3EHiWyglvH90U/YUCEwzIgRy1+OOWyzHnkeC3dyOd6g7gBsnBKAnsTMrBN/ver6TSp18A3EA583rcWjmCTrxhQUUnoBssB2M1sHNdzkEn8vZ2sKAZoBssB2MKsHNVTjzrT9sb0jNzCmHEit3TskyOPycD7xdwvnPqox3XN1jO/AaqHZXzsdXnAwdXFkUcj+VgMnHUEjn27avPZ4uzjuAND3QQQE4f4clXxwVygn736vMnFowwz6dN2ICcXsKTL78ux/i3rz6f2bE9yYA326wc3I9E5bKc9P7VJy8KpcLlwsMNkHPRznFRTv6A6vNPghXCho1j9BM3QM5VO9pckhM+oPrsIz1xA+Rct5OuyDEfUX32cFTcADlX7RwX5MiPqD47MDtPdK/Lwcn6bqbllM+oPjFcQdhWyMFhQszKOT6k+sREHlrXyMEJVpyTEz+m+oQ4FlqBnHWJh+uV87HVJyCwSADkrIxuakaO+6Tqs41k/bVMDt5dlRNy7Hz1GZQQRX5HiKzGlEaVhZDfKUKoOPCLrRDp0aJVlydO2ZbKQWlWGJYT9Fz1GbI8rxHu6H1SOZ0a1cl2uA3ltACDT6GIsxsgZ3Ha7kblmH2m+jTZ0zN0ibgKTPSUBGaC3bsfVxLPV5PICkMgZ3XBGwflJFB9ggeNOMWgLq4iA/gcaBDJKSwGADmrY1wZk5Mnqs9jn34AIsq5G8Om9bk9dMrRLLZiOUtzAj0kR01Un4UQGRwfGn7wKIDhcHTJsWziQDmrp44dkGM0KJRGxjD+mkwYb/AtWo6CcnhHqeVy8NSRA3LkePXpqQdbc4NJuJrj6IjlRNZPWM7yqRO75RT+ExGO+lDdp5FwlyTCeCwnsyvEcpZPndwr5xivPg/qZDe1TXRMmGnTQjmeHWaDctYfovN9cvhKvuOAo4njZdf4l8TZpSaObB4RJF+EEMWziwdyIhvCr5GT+bqG5RgPsyx0/frX38EFC46HsLwwZbU9iIfTrRmsKkVnPLVoW3L4qmpeJcfwy8RyHDHgjqdu/FlFTE3TqVHXG1GZOjwwHtUgloCcxN79Gjm8YSzHwhQYhHQf2snCXh8/2oLHZmMtPcz1iksDORoM4DE5prJ9FVAipDvkBJxkcRyYZa4e1y047GCrs44Jr4XA0JQT0KqG5WA3dOB1LUA5tdJBdiceCuYLuTbIHawHZOW+smuNhqMpJ6PfieXgisJ2lDoZyklTz2fDcrVUV1eJCrGjMvdVq7cye7Eqx4EeAnJm3fBx4VDLmjg4JwjwulV1DdpbXnlMiM+/stTaw3I8WFuAnFk3fEX11ZYxoq/YPTqeKau84Dr2ORT2zWnKYVF5Xo4YccNzkRk5+ARPkL8JTTn8m/B/u7jKsoO6C8thjklekWOBGxR01AU5chsDD/+JDhUVOSQm5VjwLUAOdiO6a3d7QQ6p/0uOpL/wdlgO6h8sB7tx/TuSYkCOLmCLDaKUEo8jMXrYclAqC+Gk3KvdktkFOxuH5Th2ZXNyggZu8M60G5BjNzm1a2HU42jT1BRUmbmsXkKkJ+wphyE5EsRkIAe6aQPihmjctFTjt3UOt8+uj6H4sZyx5l9Lobrl+Ck5E26wHN8tx7M5jxuLTs8GLyP24YQ+UgOZI5TDx+6kHLPPuMHzVrRu7xq2Z99UM59ZCGQVH0nlSPsiOcaD9HaxHPX8VQ/+f2dOTtgJgw9zc3Y1Jif1y8FuvNkgaUAOb30HFRXuJyzHUj9i8KPOjMgRU3KqbjBiQk6q3qfUBrrBqFk3vPuChyeqvlqOA+0ulrObekpUZs4T4rvN8zt81iM7LTlqXg52gxHg3A+4axcbR2BwB+vHMxniUL52EUZThR9PgVjlUPepdpJYvkwOdrNejmVvQDnIzief+8beGa3HCQJRmAEERdB9/6dtc5EmDY4/Itv2a/bcu7j8gHAYhuKWFvsm1kCzOAf2TX3sJOuA0hOHtQLxX6OHtQhRTzvaSn5Lrd7aVJXu2FvTAEVYboyHEyBg4DYcmi0HbBZZizlnOKXK0WQYjq4UDmwG/5ypNLO5P5Vmi2am9bHaUBnOXA3VBAc1Bat8JkcvQndgc38RSoMWW2yuYbzVPnwNZyMzw4GAqvAcOIsHNqPhyMUz+o1bIkmB4xpGlZnhwO68tBqf/gocZsPyZHxy00nnFpvwbnZoglOYq/ScV5bhWwa6EQ1surcM2iMXVviqNW+WO7ZVy/ELbvaT1KGY4WSlagGOZkSHGyfscxMcXsgUHDjrqmI4Oxcth4WmfjiivAHAmeZeNv3b1MK/UltsvNNr2+CIUjMIJwCc4QEeHWzuB3hIa/qRqP7ERs6bDmfmmaIc/qY9L3IfHhpl8XQXi0OjGA5bbEXrVJwkNME8fvFta/NyOoVJo4MKfXf0GAcVMhxu/VZt3fNEmeKd9np+AawPUbCGk+2v1ZzBWdvDcVnlxnxgvQIHLLagXkuzOsjp4VTnxxfIzSGab5HTR5nFVwOtDie3B7Kz/NR/8DAzHFVFf49YubLb7n5qF0v7OeEg+My9SY5tZtGfnOXtySC53ZXmGmI4/elpuV0wHLbY3OOanNYhWVLNsVHR6HDqlwc4Q8Ni8cl2OE5vkfZBWvVMcySrvKBrHml0OHUV7TfhrN2po+7ddpjVOcHyAM1OgcNZOHyqXpD2xvXa5gO7EeGApDPJW+6EwxabQAUvGhwGG4yH0Ap4nOAUPup+SanvqHvphcMWWzxnYwxG3+iVayFujdlwkghepw8/KhOA6UU400qBDnraM4xb0ys36y8o16645/QqbNyzduTCxTIcttiqWaoa12drOHxH97x8/WWBq+rqkkcnJmL56VmJiTSxxbbYw07ujCE4ZoqHPS7UlSeQRhKSfLak9IoAh7V15HxN/VfufwD4ot9+0+VqRbkclbO0HFDI4ajQ0Ji4dS78bzdlBZcuwPG+0wBNfz6d+rRv72fRbBZnrsiJnd/TTck+XXw2Wv8ex5jhafo0x3Y4ftmV8zOk+E3uiLityZ92HTmdhtouAzR9m1z3txUxdbHu1STOXskf72he0pQggEVRgHMa7VZYMi+1NuS1CU44c2DdlXuYrXmpvSXLlawp7nIsu/xf90c+W1UEL8IJ4I7I2Q7oq+Pc6TrzBHACnjFKlDCPO46TX/rrnSvJZ3V3gjCi62zncAq7g7Y9HEOTQEcEPbH5mk71/Y+kdw3hDAMWOpdCki/UM/+YHHwfB8PhSzeFJ8rLiQHKV+S/4Pxo71zXHAVhMFxCIBxt7v9q97EjRuq0oYc57K7fn2kZROAtIaDAw/uWZ9fBeWJ/Jxo6K9YdcHT5V44/doODHRf2xu+A84RPwKDAUReUh8F7jMNJ1rUPafkQL3PGxfRd1xxUL0ESLRqYfDefb8ic+1PdCKbzKBxnT84Tbe5ZjO+z4Seg6vZwbEtmn/k0p1qMeuIFqXBEZWSwQ8oknAonIiwtNbd2jQ6YAZl9f6MA3Vse4AID5M0gwcElTnHb/hAhMwzCsRyZAbbJBcbY2wlARn8Nh9h3OcXO/7KMMKmGjWkcTkJ9ApS0R9q6WasfNy8c1zgF50ckMWDc3Gj+uTqSIINwoeCZxAWyLcHGJszxLdIoHCQhC5csxcBJ2OB5jhbYCpwrNnXJqYQYzmZskxhwChxR1SZAHXwCX4HTPxhcsXjJgmlNxuHqW/hWVECJFhqSFissL4uHtS6DWyq9jsHpN2GnxXGdhP55CQoCp2dzZmrFEv+rjG52H5wCR9mg6Kwk/hCcZtASgsRZCVuZioW17HaN5q+rF6jZ+IbUCrYxOOcNnNZvIKy4zNq3CRxhMwsatrgGmtUo6DsO5jgKJ96dAI1ZWdw76q1ZLgGTxJHqQlr4SenZrNFcu1xg9Me1TFnSHIRj97u61gzSJX3mrRHX7vs+p6o/LcKgwWma7rzt4fF2q9Lh9KHdlUZsPMDec5Qi72t0YgYTP/MkH4Yjm00GhDu5Z0OdMb+V0/Fd1RU4ymAn3uJWT0/DsQqcapvSHTinVAsyuNXE2FWPw3EBzcXPh7twkMlsLmO6mVPVKdDh6KfIgewKpzgDw2Yto7tv1nruezgiZ3BqDQkl+HE4hv2uw0t7OHOxQ3bSkvRC63QeXjorqvrcjg6ncwgiF4mzekfiZOWyVr29Ccct41nKq0mP0oE/DAdycwP2DoGVnqX0Dl0IaznsCBwXnoeTkAcV3JNwCtv5H3Vn5FxAd92aiG/DiUy9u+0QZKT7OBxcWDNIUFxqBfqWMm2ckrM0PAXOIB2jd1k6m+fgeDat3C0O4FzUBJuqIrQfkeGOWcsYL99JfFVyH+W3z5i1evmDGaQiMV6lx6a1/jWnZxkK6XCEzjgcUXiFjf6wLWFYfuUyLesCI+R++qZwmKbAwd2BE5HzBBzSZjCAxRSUlB5yCBiJMkaa4cgdCBjttetspQqJM805TRqcJkfvOEto/A378cfU1qT2IUpZfAGYbN/CCID8Nql+sDgrTXA1E5oMALQIO8nV8kXk6se11vdhk3cS0MrhjXhRBFD6nCoiDc74lbovoOuveqzw9TLPwnGo91gHnKel7zCPxafxh3a90J8OOK9J3088F2N3hJI1JfM9hXg64LxBrrCqDGAWAWRWVdzpzfL/6yuJHvmtwmMZzhuVgN8oOBYT/NbGczSb98sRv0V0LF77CkXglwXxdOhrZOFFND++RuCfloUDzS9WJH5KdBi075CrgR9UqIcb8G2KU+Zh5eloNN+sWIEHBPUg8zOyBpBvCuHnV3D+53K2GgDsqYCp9uhlfpPsrKOtvF1/AIm5RsnYih/8AAAAAElFTkSuQmCC";

  // --- 3. PDF Content Drawing Functions ---
  const drawHeader = () => {
    doc.addImage(kaasiLogoBase64, "PNG", margin, cursorY - 12, 80, 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor("#333333");
    doc.text("Monthly Financial Statement", pageWidth / 2, cursorY, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.text(`${monthName} ${year}`, pageWidth - margin, cursorY, {
      align: "right",
    });

    cursorY += 30;
    doc.setDrawColor("#DDDDDD");
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 25;
  };

  const drawFooter = (pageNumber) => {
    const footerY = pageHeight - margin + 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#AAAAAA");
    doc.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: "center" });
    doc.text("All amounts in LKR", pageWidth - margin, footerY, {
      align: "right",
    });
    doc.textWithLink("Generated by Kaasi | kaasi.com.lk", margin, footerY, {
      url: "https://kaasi.com.lk",
    });
  };

  const drawSummary = (yPosition) => {
    const boxWidth = (pageWidth - margin * 2 - 20) / 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#666666");
    doc.text("Total Income", margin + boxWidth / 2, yPosition + 15, {
      align: "center",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#27ae60");
    doc.text(
      formatCurrency(totalIncome),
      margin + boxWidth / 2,
      yPosition + 35,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#666666");
    doc.text(
      "Total Expenses",
      margin + boxWidth + 10 + boxWidth / 2,
      yPosition + 15,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor("#c0392b");
    doc.text(
      formatCurrency(totalExpense),
      margin + boxWidth + 10 + boxWidth / 2,
      yPosition + 35,
      { align: "center" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#666666");
    doc.text(
      "Net Flow",
      margin + (boxWidth + 10) * 2 + boxWidth / 2,
      yPosition + 15,
      { align: "center" }
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(netFlow >= 0 ? "#27ae60" : "#c0392b");
    doc.text(
      formatCurrency(netFlow),
      margin + (boxWidth + 10) * 2 + boxWidth / 2,
      yPosition + 35,
      { align: "center" }
    );
  };

  const formatNumberForPdf = (amount) => {
    if (typeof amount !== "number" || isNaN(amount)) amount = 0;
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  };

  const drawTable = () => {
    // FIXED: Adjusted column widths to fit the page perfectly
    const tableHeaders = ["Date", "Description", "Category", "Debit", "Credit"];
    const colWidths = [60, 215, 100, 70, 70];
    const rowHeight = 20;
    let pageNumber = 1;

    const drawPageContent = () => {
      drawHeader();
      if (pageNumber === 1) {
        drawSummary(cursorY);
        cursorY += 70;
      }
      cursorY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor("#333333");
      let currentX = margin;
      tableHeaders.forEach((header, i) => {
        let align = "left";
        let xPos = currentX;
        if (i >= 3) {
          align = "right";
          xPos = currentX + colWidths[i];
        }
        doc.text(header, xPos, cursorY, { align: align });
        currentX += colWidths[i];
      });
      cursorY += 5;
      doc.setDrawColor("#DDDDDD");
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += rowHeight;
    };

    drawPageContent();

    transactionsInMonth.forEach((t) => {
      const desc = doc.splitTextToSize(t.description, colWidths[1] - 5);
      const category = doc.splitTextToSize(t.category || "-", colWidths[2] - 5);
      const rowLineCount = Math.max(
        Array.isArray(desc) ? desc.length : 1,
        Array.isArray(category) ? category.length : 1
      );
      const requiredSpace = rowHeight * rowLineCount;

      if (cursorY + requiredSpace > pageHeight - margin - 20) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = margin;
        drawPageContent();
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#555555");
      let currentX = margin;
      const date = new Date(t.date).toLocaleDateString("en-GB");
      const debit = t.type === "expense" ? formatNumberForPdf(t.amount) : "";
      const credit = t.type === "income" ? formatNumberForPdf(t.amount) : "";

      doc.text(date, currentX, cursorY);
      currentX += colWidths[0];
      doc.text(desc, currentX, cursorY);
      currentX += colWidths[1];
      doc.text(category, currentX, cursorY);
      currentX += colWidths[2];
      doc.text(debit, currentX + colWidths[3], cursorY, { align: "right" });
      currentX += colWidths[3];
      doc.text(credit, currentX + colWidths[4], cursorY, { align: "right" });
      cursorY += requiredSpace;
    });

    if (cursorY > pageHeight - margin - 60) {
      drawFooter(pageNumber);
      doc.addPage();
      pageNumber++;
      cursorY = margin;
      drawHeader();
    }

    cursorY += 20;
    doc.setDrawColor("#333333");
    doc.line(
      pageWidth - margin - colWidths[3] - colWidths[4],
      cursorY,
      pageWidth - margin,
      cursorY
    );
    cursorY += rowHeight;

    doc.setFont("helvetica", "bold");
    doc.text(
      "Totals:",
      pageWidth - margin - colWidths[3] - colWidths[4] - 50,
      cursorY,
      { align: "right" }
    );

    doc.setTextColor("#c0392b");
    doc.text(
      formatNumberForPdf(totalExpense),
      pageWidth - margin - colWidths[4],
      cursorY,
      { align: "right" }
    );
    doc.setTextColor("#27ae60");
    doc.text(formatNumberForPdf(totalIncome), pageWidth - margin, cursorY, {
      align: "right",
    });

    cursorY += 5;
    doc.setDrawColor("#333333");
    doc.line(
      pageWidth - margin - colWidths[3] - colWidths[4],
      cursorY,
      pageWidth - margin,
      cursorY
    );
    doc.line(
      pageWidth - margin - colWidths[3] - colWidths[4],
      cursorY + 2,
      pageWidth - margin,
      cursorY + 2
    );

    drawFooter(pageNumber);

    if (Object.keys(categoryTotals).length > 0) {
      doc.addPage();
      pageNumber++;
      cursorY = margin;
      drawHeader();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor("#333333");
      doc.text("Category Breakdown", pageWidth / 2, cursorY, {
        align: "center",
      });
      cursorY += 30;

      const catTableHeaders = ["Category", "Total Spent"];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(catTableHeaders[0], margin, cursorY);
      doc.text(catTableHeaders[1], pageWidth - margin, cursorY, {
        align: "right",
      });
      cursorY += 5;
      doc.setDrawColor("#DDDDDD");
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += rowHeight;

      const sortedCategories = Object.entries(categoryTotals).sort(
        ([, a], [, b]) => b - a
      );

      sortedCategories.forEach(([category, amount]) => {
        if (cursorY > pageHeight - margin - rowHeight) {
          drawFooter(pageNumber);
          doc.addPage();
          pageNumber++;
          cursorY = margin;
          drawHeader();
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#555555");

        const categoryText = category;
        const amountText = formatNumberForPdf(amount);

        doc.text(categoryText, margin, cursorY);
        doc.text(amountText, pageWidth - margin, cursorY, { align: "right" });

        // NEW: Add dotted line
        const categoryWidth = doc.getTextWidth(categoryText);
        const amountWidth = doc.getTextWidth(amountText);
        const startX = margin + categoryWidth + 5;
        const endX = pageWidth - margin - amountWidth - 5;

        doc.setLineDashPattern([1, 2], 0);
        doc.setDrawColor("#AAAAAA");
        doc.line(startX, cursorY - 3, endX, cursorY - 3);
        doc.setLineDashPattern([], 0);

        cursorY += rowHeight;
      });
      drawFooter(pageNumber);
    }
  };

  // --- 4. Generate and Save PDF ---
  try {
    drawTable();
    doc.save(`Kaasi-Report-${monthName}-${year}.pdf`);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    showNotification("An error occurred while generating the PDF.", "error");
  }
}

function initiateDeleteAllData() {
  $("#initiateDeleteBtn").classList.add("hidden");
  $("#deleteConfirmationSection").classList.remove("hidden");
  resetDeleteSlider();
}

function cancelDeleteAllData() {
  $("#initiateDeleteBtn").classList.remove("hidden");
  $("#deleteConfirmationSection").classList.add("hidden");
  resetDeleteSlider();
}
let maxTranslateX = 0;
let isDragging = false;
function setupDeleteSlider() {
  const sliderContainer = $("#deleteSliderContainer");
  const handle = $("#deleteSliderHandle");
  const track = sliderContainer.querySelector(".slide-to-confirm-track");
  if (!sliderContainer || !handle || !track) return;

  let startX = 0;
  let currentTranslateX = 0;

  const calculateMaxTranslate = () => {
    maxTranslateX = sliderContainer.offsetWidth - handle.offsetWidth - 4;
  };

  window.resetDeleteSlider = () => {
    isDragging = false;
    currentTranslateX = 0;
    handle.style.transition =
      "transform 0.2s ease-out, background-color 0.2s ease-out";
    track.style.transition =
      "width 0.2s ease-out, background-color 0.2s ease-out";
    handle.style.transform = `translateX(0px)`;
    track.style.width = `0px`;
    track.style.backgroundColor = "var(--button-success-bg)";
    handle.innerHTML = '<i class="fas fa-arrow-right"></i>';
    handle.style.backgroundColor = "var(--accent-primary)";
    handle.style.cursor = "grab";
    sliderContainer.style.cursor = "pointer";
  };

  const startDrag = (clientX) => {
    calculateMaxTranslate();
    isDragging = true;
    startX = clientX - handle.getBoundingClientRect().left;
    handle.style.transition = "none";
    track.style.transition = "none";
    handle.style.cursor = "grabbing";
    sliderContainer.style.cursor = "grabbing";
  };

  const drag = (clientX) => {
    if (!isDragging) return;
    let newTranslateX =
      clientX - sliderContainer.getBoundingClientRect().left - startX;
    currentTranslateX = Math.max(0, Math.min(newTranslateX, maxTranslateX));
    handle.style.transform = `translateX(${currentTranslateX}px)`;
    track.style.width = `${currentTranslateX + handle.offsetWidth / 2}px`;
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = "grab";
    sliderContainer.style.cursor = "pointer";

    handle.style.transition =
      "transform 0.2s ease-out, background-color 0.2s ease-out";
    track.style.transition =
      "width 0.2s ease-out, background-color 0.2s ease-out";

    if (currentTranslateX >= maxTranslateX - 1) {
      completeDeletion();
    } else {
      resetDeleteSlider();
    }
  };

  handle.addEventListener("mousedown", (e) => startDrag(e.clientX));
  document.addEventListener("mousemove", (e) => {
    if (isDragging) drag(e.clientX);
  });
  document.addEventListener("mouseup", endDrag);

  handle.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      startDrag(e.touches[0].clientX);
    },
    {
      passive: false,
    }
  );
  document.addEventListener(
    "touchmove",
    (e) => {
      if (isDragging) {
        e.preventDefault();
        drag(e.touches[0].clientX);
      }
    },
    {
      passive: false,
    }
  );
  document.addEventListener("touchend", endDrag);

  window.addEventListener("resize", () => {
    if (
      $("#deleteConfirmationSection") &&
      !$("#deleteConfirmationSection").classList.contains("hidden")
    ) {
      calculateMaxTranslate();
      resetDeleteSlider();
    }
  });
}

function completeDeletion() {
  const handle = $("#deleteSliderHandle");
  const track = $(".slide-to-confirm-track");
  handle.innerHTML = '<i class="fas fa-check"></i>';
  handle.style.backgroundColor = "var(--button-success-bg)";
  track.style.width = "100%";
  track.style.backgroundColor = "var(--button-success-bg)";
  handle.style.transform = `translateX(${maxTranslateX}px)`;
  isDragging = false;
  handle.style.pointerEvents = "none";
  setTimeout(() => {
    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    ensureDefaultAccounts();
    ensureDefaultCategories();
    initializeUI(true);
    closeModal("settingsModal");
    showNotification("All data deleted.", "success");
    handle.style.pointerEvents = "auto";
  }, 500);
}

function openCashCounter() {
  const form = $("#cashCounterForm");
  const denominations = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];
  const gridContainer = form.querySelector(".grid");
  while (gridContainer.children.length > 3)
    gridContainer.removeChild(gridContainer.lastChild);
  denominations.forEach((denom) => {
    const denomEl = document.createElement("span");
    denomEl.className = "font-medium text-right pr-2 text-sm";
    denomEl.textContent = `Rs. ${denom}`;
    const inputEl = document.createElement("input");
    inputEl.type = "number";
    inputEl.min = "0";
    inputEl.dataset.denom = denom;
    inputEl.className =
      "text-center bg-gray-600 border border-gray-500 rounded px-1 py-0.5 w-16 mx-auto text-sm";
    inputEl.placeholder = "0";
    inputEl.oninput = calculateCashTotal;
    const totalEl = document.createElement("span");
    totalEl.className = "text-right text-gray-400 text-sm";
    totalEl.id = `cashTotal-${denom}`;
    totalEl.textContent = formatCurrency(0);
    gridContainer.appendChild(denomEl);
    gridContainer.appendChild(inputEl);
    gridContainer.appendChild(totalEl);
  });
  calculateCashTotal();
  $("#cashCounterModal").style.display = "block";
  $("#cashCounterComparison").innerHTML = "";
}

function calculateCashTotal() {
  let grandTotal = 0;
  $$('#cashCounterForm input[type="number"]').forEach((input) => {
    const count = parseInt(input.value) || 0;
    const denomination = parseInt(input.dataset.denom);
    const total = count * denomination;
    grandTotal += total;
    const totalEl = $(`#cashTotal-${denomination}`);
    if (totalEl)
      totalEl.innerHTML = `<span class="tabular-nums">${formatCurrency(
        total
      )}</span>`;
  });
  $(
    "#cashCounterTotal"
  ).innerHTML = `<span class="tabular-nums">${formatCurrency(
    grandTotal
  )}</span>`;
  const cashAccount = state.accounts.find((acc) => acc.id === "cash");
  if (cashAccount) {
    const diff = grandTotal - cashAccount.balance;
    const comparisonEl = $("#cashCounterComparison");
    if (Math.abs(diff) < 0.01)
      comparisonEl.innerHTML = `<p class="text-success">Counted cash matches calculated balance: <span class="tabular-nums">${formatCurrency(
        cashAccount.balance
      )}</span></p>`;
    else if (diff > 0)
      comparisonEl.innerHTML = `<p class="text-warning">Counted cash is <span class="tabular-nums">${formatCurrency(
        diff
      )}</span> MORE than calculated balance (<span class="tabular-nums">${formatCurrency(
        cashAccount.balance
      )}</span>)</p>`;
    else
      comparisonEl.innerHTML = `<p class="text-danger">Counted cash is <span class="tabular-nums">${formatCurrency(
        Math.abs(diff)
      )}</span> LESS than calculated balance (<span class="tabular-nums">${formatCurrency(
        cashAccount.balance
      )}</span>)</p>`;
  }
}

function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) modal.style.display = "none";
  if (modalId === "formModal") {
    $("#dynamicForm").innerHTML = "";
    $("#dynamicForm").onsubmit = null;
  }
  if (modalId === "settingsModal") cancelDeleteAllData();
  if (modalId === "ccHistoryModal") {
    document.body.renderCcHistoryList = null; // Cleanup
  }
}

function openFormModal(title, formHtml, submitHandler) {
  const modalTitleEl = $("#formModalTitle");
  if (modalTitleEl) {
    modalTitleEl.textContent = title;
    // Add the class to handle long titles from any form modal
    modalTitleEl.classList.add("force-word-wrap");
  }

  const form = $("#dynamicForm");
  form.innerHTML = formHtml;
  form.onsubmit = submitHandler;
  $("#formModal").style.display = "block";
  const firstInput = form.querySelector(
    'input:not([type="hidden"]), select, textarea'
  );
  if (firstInput) firstInput.focus();
}

window.addEventListener("click", (event) => {
  $$(".modal").forEach((modal) => {
    if (event.target === modal && modal.id !== "initialSetupModal") {
      closeModal(modal.id);
    }
  });
});

let currentConfirmCallback = null;
let currentCancelCallback = null;

function showConfirmationModal(
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  confirmButtonClass = "btn-danger"
) {
  const modal = $("#confirmationModal");
  const modalTitleEl = $("#confirmationModalTitle");
  const messageEl = $("#confirmationMessage");
  const confirmBtn = $("#confirmModalConfirmBtn");
  const cancelBtn = $("#confirmModalCancelBtn");

  if (!modal || !modalTitleEl || !messageEl || !confirmBtn || !cancelBtn) {
    console.error("Confirmation modal elements not found!");
    if (confirm(message.replace(/<br>/g, "\n").replace(/<[^>]+>/g, ""))) {
      // Fallback with cleaned message
      if (typeof onConfirm === "function") onConfirm();
    } else {
      if (typeof onCancel === "function") onCancel();
    }
    return;
  }

  modalTitleEl.textContent = title;
  messageEl.innerHTML = message; // No need to replace \n if CSS has white-space: pre-line

  // Add the class for word wrapping
  messageEl.classList.add("force-word-wrap");

  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  confirmBtn.className = `btn ${confirmButtonClass}`;
  cancelBtn.className = "btn btn-secondary";

  currentConfirmCallback = onConfirm;
  currentCancelCallback = onCancel;

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.onclick = () => {
    if (typeof currentConfirmCallback === "function") {
      currentConfirmCallback();
    }
    closeModal("confirmationModal");
  };

  newCancelBtn.onclick = () => {
    if (typeof currentCancelCallback === "function") {
      currentCancelCallback();
    }
    closeModal("confirmationModal");
  };

  modal.style.display = "block";
}

function openEditTransactionForm(id, event) {
  openEditTransactionModal(id, event);
}

function openEditCcTransactionForm(ccTransactionId) {
  const transaction = state.creditCard.transactions.find(
    (tx) => tx.id === ccTransactionId
  );
  if (!transaction) {
    showNotification("CC Transaction not found for editing.", "error");
    return;
  }

  const formHtml = `
            <input type="hidden" name="editCcTransactionId" value="${
              transaction.id
            }">
            <div>
                <label for="modalCcAmount" class="block text-sm font-medium mb-1">Amount (LKR)</label>
                <input type="number" id="modalCcAmount" name="ccAmount" value="${transaction.amount.toFixed(
                  2
                )}" step="0.01" min="0" placeholder="Amount spent" required>
            </div>
            <div>
                <label for="modalCcDescription" class="block text-sm font-medium mb-1">Description</label>
                <input type="text" id="modalCcDescription" name="ccDescription" value="${
                  transaction.description
                }" placeholder="e.g., Online purchase" required>
            </div>
            <div>
                <label for="modalCcDate" class="block text-sm font-medium mb-1">Date</label>
                <input type="date" id="modalCcDate" name="ccDate" value="${
                  transaction.date
                }" required>
            </div>
            <button type="submit" class="btn btn-primary w-full"><i class="fas fa-save"></i> Update CC Transaction</button>
        `;
  openFormModal(
    "Edit CC Transaction",
    formHtml,
    handleEditCcTransactionModalSubmit
  );
}

function handleBackupReminderDismiss(reminderKey) {
  try {
    localStorage.setItem(reminderKey, getCurrentDateString());
    console.log(
      `Backup reminder dismissed for key: ${reminderKey} on ${getCurrentDateString()}`
    );
  } catch (e) {
    console.error("Error saving backup reminder dismissal state:", e);
  }
  closeModal("confirmationModal"); // Close the correct modal
}

function showBackupReminderPopup(reminderKey) {
  const title = "Backup Reminder";
  const message =
    "It's a good day to back up your data. Regular backups protect you from data loss!";

  // Use the robust confirmation modal for this
  showConfirmationModal(
    title,
    message,
    "Backup Now", // confirmText
    "Dismiss", // cancelText
    () => {
      // onConfirm: This runs when "Backup Now" is clicked
      exportData();
      handleBackupReminderDismiss(reminderKey);
    },
    () => {
      // onCancel: This runs when "Dismiss" is clicked
      handleBackupReminderDismiss(reminderKey);
    },
    "btn-primary" // Use the primary button style for the confirm action
  );
}

function checkAndTriggerBackupReminder() {
  if (!state.settings.initialSetupDone && state.transactions.length === 0) {
    console.log(
      "Skipping backup reminder: Initial setup not done or no transactions."
    );
    return;
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 3 = Wednesday
  const currentDateStr = getCurrentDateString();

  let reminderKey = null;

  if (dayOfWeek === 0) {
    // Sunday
    reminderKey = "lastReminderShownForSunday";
  } else if (dayOfWeek === 3) {
    // Wednesday
    reminderKey = "lastReminderShownForWednesday";
  }

  if (reminderKey) {
    try {
      const lastShownDate = localStorage.getItem(reminderKey);
      if (lastShownDate !== currentDateStr) {
        // Use a timeout to show the reminder after the app has loaded
        setTimeout(() => {
          console.log(
            `Time to show backup reminder for: ${reminderKey}. Last shown: ${lastShownDate}, Current: ${currentDateStr}`
          );
          showBackupReminderPopup(reminderKey);
        }, 500); // 5-second delay
      } else {
        console.log(
          `Backup reminder already shown for ${reminderKey} on ${currentDateStr}`
        );
      }
    } catch (e) {
      console.error(
        "Error checking backup reminder state from localStorage:",
        e
      );
    }
  }
}
let activeSettingsTab = null;

const settingsTabsConfig = [
  { label: "Accounts", targetPanelId: "settingsAccountsPanel" },
  { label: "Credit Card", targetPanelId: "settingsCreditCardPanel" },
  { label: "Categories", targetPanelId: "settingsCategoriesPanel" },
  { label: "Data", targetPanelId: "settingsDataManagementPanel" },
];

function setupSettingsTabs() {
  const tabsContainer = document.getElementById("settingsTabsContainer");
  const tabContentContainer = document.getElementById("settingsTabContent");

  if (!tabsContainer || !tabContentContainer) {
    console.error("Settings tab containers not found!");
    return;
  }

  tabsContainer.innerHTML = "";
  activeSettingsTab = null;

  settingsTabsConfig.forEach((tabConfig, index) => {
    const li = document.createElement("li");

    const button = document.createElement("button");
    button.className =
      "settings-tab-button inline-block p-3 border-b-2 rounded-t-lg";
    button.textContent = tabConfig.label;
    button.dataset.tabTarget = `#${tabConfig.targetPanelId}`;

    button.addEventListener("click", () => {
      switchSettingsTab(button, tabConfig.targetPanelId);
    });

    li.appendChild(button);
    tabsContainer.appendChild(li);

    if (index === 0) {
      switchSettingsTab(button, tabConfig.targetPanelId);
    } else {
      const panel = document.getElementById(tabConfig.targetPanelId);
      if (panel) {
        panel.classList.add("hidden");
      }
    }
  });
}

function switchSettingsTab(clickedButton, targetPanelId) {
  const tabContentContainer = document.getElementById("settingsTabContent");
  if (!tabContentContainer) return;

  if (activeSettingsTab && activeSettingsTab.button !== clickedButton) {
    activeSettingsTab.button.classList.remove("active");

    const oldPanelSelector = activeSettingsTab.button.dataset.tabTarget;
    if (oldPanelSelector) {
      const oldPanel = tabContentContainer.querySelector(oldPanelSelector);
      if (oldPanel) {
        oldPanel.classList.add("hidden");
      }
    }
  }

  clickedButton.classList.add("active");
  const targetPanel = document.getElementById(targetPanelId);
  if (targetPanel) {
    targetPanel.classList.remove("hidden");
  } else {
    console.warn(`Target panel with ID '${targetPanelId}' not found.`);
  }

  activeSettingsTab = { button: clickedButton, panelId: targetPanelId };
}

let monthlySearchDebounceTimer; // Timer for debouncing search input

// Donate Modal logic
document
  .getElementById("footerDonateBtn")
  .addEventListener("click", function () {
    document.getElementById("donateModal").style.display = "block";
  });
document
  .getElementById("closeDonateModal")
  .addEventListener("click", function () {
    document.getElementById("donateModal").style.display = "none";
  });
window.addEventListener("click", function (event) {
  const modal = document.getElementById("donateModal");
  if (event.target === modal) {
    modal.style.display = "none";
  }
});

function initializeUI(isRefresh = false) {
  console.log("Initializing UI...");

  // --- NEW: Initialize Supabase and check auth state ---
  if (!isRefresh && supabase) {
    initializeSupabase(); // This will check for a user session
  }
  // --- END NEW ---

  if (!isRefresh) {
    loadData();
  }

  if (
    !state.settings ||
    state.settings.initialSetupDone === undefined ||
    state.settings.initialSetupDone === false
  ) {
    if (!isRefresh) {
      console.log("Initial setup not done. Opening wizard.");
      openInitialSetupWizard();
      return;
    }
  }

  const mainDateInput = $("#date");
  if (mainDateInput) mainDateInput.value = getCurrentDateString();
  const mainCcDateInput = $("#ccDate");
  if (mainCcDateInput) mainCcDateInput.value = getCurrentDateString();

  populateDropdowns();
  renderDashboard();
  updateCcDashboardSectionVisibility();
  setupMonthlyView();

  // --- NEW: Add new header button listeners ---
  // The onclick logic is now dynamic, so we set it in updateHeaderShortcutButtons()
  // This function will set their initial state (icons, tooltips, onclick)
  updateHeaderShortcutButtons();
  // --- END NEW ---

  if (!window.deleteSliderInitialized) {
    setupDeleteSlider();
    window.deleteSliderInitialized = true;
  }

  displayAppVersion();

  $("#transactionForm").onsubmit = handleTransactionSubmit;
  $("#ccTransactionForm").onsubmit = handleCcTransactionSubmit;

  // --- Header & Footer Button Event Listeners ---
  $("#settingsBtn").onclick = openSettingsModal;

  $("#toggleChartBtn").onclick = () => {
    dashboardChartState =
      dashboardChartState === "yearly" ? "monthly" : "yearly";
    renderMonthlyOverviewChart();
  };

  $("#monthlyViewBtn").onclick = () => {
    const yearSelector = $("#yearSelector");
    const currentYear = new Date().getFullYear();
    const selectedYear =
      yearSelector && yearSelector.value
        ? parseInt(yearSelector.value)
        : currentYear;

    renderMonthTabs(selectedYear);

    const monthlySearchInput = $("#monthlySearchInput");
    const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
    const searchScopeSelect = $("#searchScopeSelect"); // Get the dropdown

    if (monthlySearchInput) {
      monthlySearchInput.value = "";
    }
    if (clearMonthlySearchBtn) {
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
    }
    // FIXED: Reset dropdown to 'month' and update the global scope variable
    if (searchScopeSelect) {
      searchScopeSelect.value = "month";
      monthlyViewSearchScope = "month";
    }

    $("#monthlyViewModal").style.display = "block";

    const currentMonth = new Date().getMonth();
    const currentMonthTab = $(
      `#monthTabs .tab-button[data-month="${currentMonth}"][data-year="${selectedYear}"]`
    );

    if (currentMonthTab) {
      currentMonthTab.click();
    } else if ($$("#monthTabs .tab-button").length > 0) {
      $$("#monthTabs .tab-button")[0].click();
    } else {
      $("#monthlyDetailsContainer").innerHTML =
        '<p class="text-center text-gray-400">Select a month.</p>';
    }
  };

  const shortcutsHelpBtn = $("#shortcutsHelpBtn");
  if (shortcutsHelpBtn) {
    shortcutsHelpBtn.onclick = openShortcutsHelpModal;
  }

  // NEW: Donate Modal Logic moved inside initializeUI for robustness
  const donateModal = document.getElementById("donateModal");
  const footerDonateBtn = document.getElementById("footerDonateBtn");
  const closeDonateModalBtn = document.getElementById("closeDonateModal");

  if (donateModal && footerDonateBtn && closeDonateModalBtn) {
    footerDonateBtn.addEventListener("click", () => {
      donateModal.style.display = "block";
    });
    closeDonateModalBtn.addEventListener("click", () => {
      donateModal.style.display = "none";
    });
    // Close modal if user clicks on the background overlay
    donateModal.addEventListener("click", (e) => {
      if (e.target === donateModal) {
        donateModal.style.display = "none";
      }
    });

    // Handle copy to clipboard functionality for the new modal
    const copyButtons = donateModal.querySelectorAll(".copy-button");
    copyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const textToCopy = button.dataset.copyText;
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          button.textContent = "Copied!";
          setTimeout(() => {
            button.innerHTML = '<i class="far fa-copy"></i>'; // Revert back to icon
          }, 2000);
        } catch (err) {
          console.error("Failed to copy text: ", err);
          button.textContent = "Failed!";
          setTimeout(() => {
            button.innerHTML = '<i class="far fa-copy"></i>';
          }, 2000);
        }
        document.body.removeChild(textArea);
      });
    });
  } else {
    console.warn(
      "One or more elements for the new donate modal were not found."
    );
  }

  const monthlySearchInput = $("#monthlySearchInput");
  const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
  const searchScopeSelect = $("#searchScopeSelect"); // New dropdown

  const triggerSearch = () => {
    clearTimeout(monthlySearchDebounceTimer);
    monthlySearchDebounceTimer = setTimeout(() => {
      const activeTab = $("#monthTabs .tab-button.active");
      if (activeTab) {
        const month = parseInt(activeTab.dataset.month);
        const year = parseInt(activeTab.dataset.year);
        const searchTerm = monthlySearchInput.value.trim();
        renderMonthlyDetails(month, year, new Set(), searchTerm, true);
      }
    }, 400);
  };

  if (monthlySearchInput && clearMonthlySearchBtn && searchScopeSelect) {
    if (!monthlySearchInput.value.trim()) {
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
    }

    monthlySearchInput.addEventListener("input", () => {
      const searchTerm = monthlySearchInput.value.trim();
      if (searchTerm) {
        clearMonthlySearchBtn.style.display = "inline-flex";
        clearMonthlySearchBtn.disabled = false;
      } else {
        clearMonthlySearchBtn.style.display = "none";
        clearMonthlySearchBtn.disabled = true;
      }
      triggerSearch();
    });

    clearMonthlySearchBtn.addEventListener("click", () => {
      clearTimeout(monthlySearchDebounceTimer);
      monthlySearchInput.value = "";
      clearMonthlySearchBtn.style.display = "none";
      clearMonthlySearchBtn.disabled = true;
      triggerSearch();
      monthlySearchInput.focus();
    });

    // NEW: Event listener for the scope dropdown
    searchScopeSelect.addEventListener("change", () => {
      monthlyViewSearchScope = searchScopeSelect.value;
      // Re-run the current search with the new scope
      triggerSearch();
    });
  }

  const openTransferModalButton = $("#openTransferModalBtn");
  if (openTransferModalButton) {
    openTransferModalButton.onclick = () => {
      const modal = $("#transferMoneyModal");
      if (modal) {
        populateDropdowns();
        const transferModalForm = $("#transferModalForm");
        if (transferModalForm) {
          transferModalForm.reset();
        }
        const errorEl = $("#modalTransferError");
        if (errorEl) {
          errorEl.classList.add("hidden");
        }
        modal.style.display = "block";
        const firstInput = modal.querySelector('input[type="number"], select');
        if (firstInput) {
          firstInput.focus();
        }
      }
    };
  }

  const transferModalFormElement = $("#transferModalForm");
  if (transferModalFormElement) {
    transferModalFormElement.onsubmit = handleTransferSubmit;
  }

  // --- CC History Modal Search Logic ---
  const ccHistorySearchInput = $("#ccHistorySearchInput");
  const clearCcHistorySearchBtn = $("#clearCcHistorySearchBtn");

  if (ccHistorySearchInput && clearCcHistorySearchBtn) {
    const triggerCcSearch = () => {
      const renderFunction = document.body.renderCcHistoryList;
      if (typeof renderFunction === "function") {
        renderFunction();
      }
    };

    ccHistorySearchInput.addEventListener("input", () => {
      const searchTerm = ccHistorySearchInput.value.trim();
      clearCcHistorySearchBtn.classList.toggle("hidden", !searchTerm);
      clearTimeout(ccHistorySearchDebounceTimer);
      ccHistorySearchDebounceTimer = setTimeout(triggerCcSearch, 400);
    });

    clearCcHistorySearchBtn.addEventListener("click", () => {
      clearTimeout(ccHistorySearchDebounceTimer);
      ccHistorySearchInput.value = "";
      clearCcHistorySearchBtn.classList.add("hidden");
      triggerCcSearch();
      ccHistorySearchInput.focus();
    });
  }

  // --- NEW: SUPABASE EVENT LISTENERS ---
  const googleLoginButton = $("#googleLoginBtn");
  if (googleLoginButton) {
    googleLoginButton.onclick = signInWithGoogle;
  }

  const googleLogoutButton = $("#googleLogoutBtn");
  if (googleLogoutButton) {
    googleLogoutButton.onclick = signOut;
  }

  const backupToSupabaseButton = $("#backupToSupabaseBtn");
  if (backupToSupabaseButton) {
    backupToSupabaseButton.onclick = backupToSupabase;
  }

  const restoreFromSupabaseButton = $("#restoreFromSupabaseBtn");
  if (restoreFromSupabaseButton) {
    restoreFromSupabaseButton.onclick = restoreFromSupabase;
  }

  // --- MODIFIED: shortcutTargetGroup listener ---
  const shortcutTargetGroup = $("#shortcutTargetGroup");
  if (shortcutTargetGroup) {
    shortcutTargetGroup.onchange = (e) => {
      if (e.target.name === "shortcutTarget") {
        console.log(`Shortcut target changed to: ${e.target.value}`);
        // --- NEW: Update header buttons when radio changes ---
        updateHeaderShortcutButtons();
        // --- END NEW ---
      }
    };
  }
  // --- END MODIFICATION ---

  // --- END NEW ---

  $("#exportDataBtn").onclick = exportData;
  $("#importDataInput").onchange = importData;
  $("#initiateDeleteBtn").onclick = initiateDeleteAllData;
  $("#cancelDeleteBtn").onclick = cancelDeleteAllData;
  $("#addDebtBtn").onclick = openAddDebtForm;
  $("#addReceivableBtn").onclick = openAddReceivableForm;
  $("#addInstallmentBtn").onclick = openAddInstallmentForm;
  $("#cashCounterBtn").onclick = openCashCounter;
  $("#ccHistoryBtn").onclick = openCcHistoryModal;

  const viewDebtsBtn = $("#viewDebtsBtn");
  if (viewDebtsBtn) {
    viewDebtsBtn.onclick = () => {
      renderDebtList();
      $("#debtsViewModal").style.display = "block";
    };
  }

  const viewReceivablesBtn = $("#viewReceivablesBtn");
  if (viewReceivablesBtn) {
    viewReceivablesBtn.onclick = () => {
      renderReceivableList();
      $("#receivablesViewModal").style.display = "block";
    };
  }

  const transactionTypeSelect = $("#transactionType");
  const categoryGroup = $("#categoryGroup");
  const descriptionInput = $("#description");

  const toggleMainCategoryVisibility = () => {
    if (!transactionTypeSelect || !categoryGroup) return;
    if (transactionTypeSelect.value === "income") {
      categoryGroup.style.display = "none";
      $("#category").required = false;
      if (descriptionInput)
        descriptionInput.placeholder = "e.g., Monthly Salary";
    } else {
      categoryGroup.style.display = "block";
      $("#category").required = true;
      if (descriptionInput)
        descriptionInput.placeholder = "e.g., Lunch, Groceries";
    }
  };

  if (transactionTypeSelect) {
    transactionTypeSelect.onchange = toggleMainCategoryVisibility;
    toggleMainCategoryVisibility();
  }

  if (!document.body.dataset.keyboardListenerAttached) {
    document.addEventListener("keydown", handleKeyboardShortcuts);
    document.body.dataset.keyboardListenerAttached = "true";
    console.log("Keyboard shortcut listener attached.");
  }
}

// --- NEW: SUPABASE AUTH & DATA FUNCTIONS ---

/**
 * Initializes the Supabase client and checks for an active user session.
 * Updates the UI based on the user's login status.
 */
async function initializeSupabase() {
  if (!supabase) {
    console.error("Supabase client not available.");
    return;
  }
  console.log("Checking Supabase auth state...");

  // Handle auth state changes (e.g., login, logout)
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Supabase auth state changed:", event, session);
    const user = session?.user || null;
    supabaseUser = user;
    updateSupabaseUI(user);
  });

  // Check for initial session
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error.message);
      throw error;
    }
    const user = data.session?.user || null;
    supabaseUser = user;
    updateSupabaseUI(user);
    console.log(
      "Initial session check complete. User:",
      user ? user.email : "none"
    );
  } catch (error) {
    console.error("Failed to initialize session:", error);
    updateSupabaseUI(null);
  }
}

/**
 * Updates the Data Management UI based on login state.
 */
function updateSupabaseUI(user) {
  const loggedOutView = $("#cloudBackupLoggedOut");
  const loggedInView = $("#cloudBackupLoggedIn");
  const userEmailEl = $("#userEmail");
  const shortcutCloudInput = $("#shortcutCloud");
  const shortcutCloudLabel = $("#shortcutCloudLabel");
  const shortcutLocalInput = $("#shortcutLocal");

  if (
    !loggedOutView ||
    !loggedInView ||
    !userEmailEl ||
    !shortcutCloudInput ||
    !shortcutCloudLabel
  ) {
    console.warn(
      "Could not find all Supabase UI elements in Settings to update."
    );
    return;
  }

  if (user) {
    // User is logged IN
    loggedOutView.classList.add("hidden");
    loggedInView.classList.remove("hidden");
    userEmailEl.textContent = user.email;
    shortcutCloudInput.disabled = false;
    shortcutCloudLabel.classList.remove(
      "text-gray-400",
      "opacity-60",
      "cursor-not-allowed"
    );
    shortcutCloudLabel.classList.add("text-gray-300");

    // --- NEW: Default to Cloud Backup on login ---
    shortcutCloudInput.checked = true;
    shortcutLocalInput.checked = false;
    // --- END NEW ---
  } else {
    // User is logged OUT
    loggedOutView.classList.remove("hidden");
    loggedInView.classList.add("hidden");
    userEmailEl.textContent = "...";
    shortcutCloudInput.disabled = true;
    shortcutCloudInput.checked = false; // Uncheck it
    if (shortcutLocalInput) shortcutLocalInput.checked = true; // Default to local
    shortcutCloudLabel.classList.add(
      "text-gray-400",
      "opacity-60",
      "cursor-not-allowed"
    );
    shortcutCloudLabel.classList.remove("text-gray-300");
  }

  // Update the header buttons to reflect the (new) shortcut state
  updateHeaderShortcutButtons();
}

/**
 * Updates the header backup/restore buttons to reflect the selected shortcut target.
 */
function updateHeaderShortcutButtons() {
  const backupBtn = $("#headerBackupBtn");
  const restoreBtn = $("#headerRestoreBtn");
  const localRadio = $("#shortcutLocal");
  const cloudRadio = $("#shortcutCloud");

  if (!backupBtn || !restoreBtn || !localRadio || !cloudRadio) {
    console.warn("Header shortcut buttons or radio inputs not found.");
    return;
  }

  const importInput = $("#importDataInput"); // Get the file input element

  // Check if cloud is selected AND enabled
  const isCloud = cloudRadio.checked && !cloudRadio.disabled;

  if (isCloud) {
    // Set to CLOUD mode
    // backupBtn.innerHTML = 'Backup'; // No longer changing text
    // backupBtn.className = "btn btn-primary mr-2"; // No longer changing class
    backupBtn.dataset.tooltip = "Export to Cloud (Ctrl+E)";
    backupBtn.onclick = backupToSupabase; // Assign cloud backup function

    // restoreBtn.innerHTML = 'Restore'; // No longer changing text
    // restoreBtn.className = "btn btn-secondary mr-2"; // No longer changing class
    restoreBtn.dataset.tooltip = "Import from Cloud (Ctrl+I)";
    restoreBtn.onclick = restoreFromSupabase; // Assign cloud restore function
  } else {
    // Set to LOCAL mode (default)
    // backupBtn.innerHTML = 'Exp.'; // No longer changing text
    // backupBtn.className = "btn btn-secondary mr-2"; // No longer changing class
    backupBtn.dataset.tooltip = "Export Local File (Ctrl+E)";
    backupBtn.onclick = exportData; // Assign local export function

    // restoreBtn.innerHTML = 'Imp.'; // No longer changing text
    // restoreBtn.className = "btn btn-secondary mr-2"; // No longer changing class
    restoreBtn.dataset.tooltip = "Import Local File (Ctrl+I)";
    restoreBtn.onclick = () => {
      // For restore, we need to find the correct data tab and click the hidden input
      const importInput = $("#importDataInput");
      if (importInput) {
        const settingsModal = $("#settingsModal");
        // Open settings if not open, and switch to data tab
        if (settingsModal && settingsModal.style.display !== "block") {
          openSettingsModal();
          setTimeout(() => {
            const dataTabButton = Array.from(
              $$("#settingsTabsContainer button")
            ).find((btn) => btn.textContent === "Data");
            if (dataTabButton) dataTabButton.click();
            importInput.click();
          }, 100);
        } else if (settingsModal) {
          // If already open, just switch tab and click
          const dataTabButton = Array.from(
            $$("#settingsTabsContainer button")
          ).find((btn) => btn.textContent === "Data");
          if (dataTabButton) dataTabButton.click();
          importInput.click();
        } else {
          importInput.click(); // Fallback
        }
      }
    };
  }
}

/**
 * Initiates the Google Sign-In flow via Supabase.
 */
async function signInWithGoogle() {
  if (!supabase) return;
  console.log("Attempting Google Sign-In...");
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // You can add scopes here if needed, e.g., 'email profile'
        // redirectTo: 'https://app.kaasi.com.lk' // Supabase uses the URL Config settings
      },
    });
    if (error) {
      console.error("Error during Google sign-in:", error.message);
      showNotification(`Google Sign-In Error: ${error.message}`, "error");
    } else {
      console.log("Sign-in data:", data);
      // User will be redirected to Google, then back.
    }
  } catch (error) {
    console.error("Exception during sign-in:", error);
    showNotification("An unexpected error occurred during sign-in.", "error");
  }
}

/**
 * Signs the user out from Supabase.
 */
async function signOut() {
  if (!supabase) return;
  console.log("Attempting Sign-Out...");
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error during sign-out:", error.message);
      showNotification(`Sign-Out Error: ${error.message}`, "error");
    } else {
      console.log("User signed out successfully.");
      supabaseUser = null;
      updateSupabaseUI(null);
      showNotification("You have been signed out.", "success");
    }
  } catch (error) {
    console.error("Exception during sign-out:", error);
    showNotification("An unexpected error occurred during sign-out.", "error");
  }
}

/**
 * Backs up the entire local 'state' object to the Supabase database.
 */
async function backupToSupabase() {
  if (!supabaseUser) {
    showNotification("You must be logged in to back up to the cloud.", "error");
    return;
  }

  // Show loading state on button
  const backupBtn = $("#backupToSupabaseBtn");
  const originalText = backupBtn.innerHTML;
  backupBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Backing up...`;
  backupBtn.disabled = true;

  console.log("Starting cloud backup...");

  try {
    // We use 'upsert' to either create a new record or update the existing one for this user.
    // ** THE FIX IS HERE: { onConflict: 'user_id' } **
    // This tells Supabase to use the 'user_id' column to detect conflicts.
    const { data, error } = await supabase
      .from("user_data")
      .upsert(
        {
          user_id: supabaseUser.id,
          data: state, // 'state' is our complete localstorage JSON object
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id", // This is the magic line!
        }
      )
      .select() // Ask Supabase to return the saved row
      .single(); // We only expect one row

    if (error) {
      console.error("Error backing up data:", error.message);
      throw error;
    }

    console.log("Backup successful. Data saved:", data);
    const backupTime = data.updated_at
      ? new Date(data.updated_at).toLocaleString()
      : "just now";
    showNotification(
      `Cloud backup successful! (Last sync: ${backupTime})`,
      "success"
    );
  } catch (error) {
    console.error("Exception during backup:", error);
    showNotification(`Cloud backup failed: ${error.message}`, "error", 7000);
  } finally {
    // Restore button text and state
    backupBtn.innerHTML = originalText;
    backupBtn.disabled = false;
  }
}

/**
 * Restores the 'state' object from Supabase, overwriting local data.
 */
async function restoreFromSupabase() {
  if (!supabaseUser) {
    showNotification(
      "You must be logged in to restore from the cloud.",
      "error"
    );
    return;
  }

  // Show a confirmation modal first
  showConfirmationModal(
    "Restore from Cloud",
    "This will <strong class='text-warning'>OVERWRITE ALL</strong> your current local data with the data from your last cloud backup.<br><br>Are you sure you want to proceed?",
    "Restore & Overwrite",
    "Cancel",
    async () => {
      // onConfirm: Proceed with restore
      console.log("Starting cloud restore...");

      const restoreBtn = $("#restoreFromSupabaseBtn");
      const originalText = restoreBtn.innerHTML;
      restoreBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Restoring...`;
      restoreBtn.disabled = true;

      try {
        // ** THE FIX IS HERE: .order(...).limit(1) **
        // This makes the query more robust by ensuring we *only* get the single, most recent
        // backup for this user, which makes .single() safe to use.
        const { data, error } = await supabase
          .from("user_data")
          .select("data, updated_at")
          .eq("user_id", supabaseUser.id)
          .order("updated_at", { ascending: false }) // Get newest one first
          .limit(1) // Only take that one
          .single(); // Now this is safe

        if (error || !data) {
          if (error && error.code === "PGRST116") {
            // "PostgREST error: No rows found"
            console.warn("No cloud backup found for this user.");
            showNotification("No cloud backup found to restore.", "info");
            return;
          }
          console.error(
            "Error fetching data:",
            error ? error.message : "No data found"
          );
          throw error || new Error("No data found to restore.");
        }

        console.log("Data fetched successfully:", data);

        if (!data.data || typeof data.data !== "object") {
          throw new Error("Cloud data is empty or in an invalid format.");
        }

        // --- Overwrite Local State ---
        // We deep merge into a default state to ensure all functions exist,
        // just like we do in loadData() and importData()
        let importedData = data.data;
        state = deepMerge(getDefaultState(), importedData);

        // Run the same integrity checks as local import
        ensureDefaultAccounts();
        ensureDefaultCategories();

        // Mark setup as done
        if (state.settings) state.settings.initialSetupDone = true;

        // Save the restored state to LocalStorage
        saveData();

        // Fully refresh the entire application UI
        initializeUI(true);

        const backupTime = new Date(data.updated_at).toLocaleString();
        showNotification(
          `Restore successful! (Data from ${backupTime})`,
          "success"
        );
        closeModal("settingsModal");
      } catch (error) {
        console.error("Exception during restore:", error);
        showNotification(
          `Cloud restore failed: ${error.message}`,
          "error",
          7000
        );
      } finally {
        restoreBtn.innerHTML = originalText;
        restoreBtn.disabled = false;
      }
    },
    () => {
      // onCancel: Do nothing
      console.log("Cloud restore cancelled by user.");
    }
  );
}

// --- END NEW SUPABASE FUNCTIONS ---

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded. Initializing...");
  loadData(); // Load existing data or set up default state
  initializeUI(); // Set up all initial UI elements, event listeners, and render initial views
  checkAndTriggerBackupReminder(); // <-- THIS LINE WAS MISSING

  // Event listener to update date fields and attempt to focus window when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("Page became visible, attempting to focus and update dates.");
      window.focus(); // Attempt to bring focus to the window/document

      const mainTransactionDateInput = $("#date"); // Main transaction form date
      if (mainTransactionDateInput) {
        mainTransactionDateInput.value = getCurrentDateString(); // Use local date
      }

      const ccTransactionDateInput = $("#ccDate"); // Credit Card transaction form date
      if (ccTransactionDateInput) {
        ccTransactionDateInput.value = getCurrentDateString(); // Use local date
      }
    }
  });

  // Preloader logic
  const preloaderElement = document.getElementById("preloader");
  const appContentElement = document.getElementById("app-content");
  const preloaderDuration = 1250; // Duration preloader is visible

  if (preloaderElement && appContentElement) {
    console.log(
      `Preloader will be shown for ${preloaderDuration / 1000} seconds.`
    );

    setTimeout(() => {
      console.log(
        "Preloader timer finished. Hiding preloader, showing app content."
      );
      preloaderElement.classList.add("hidden");
      appContentElement.classList.add("visible");

      setTimeout(() => {
        preloaderElement.style.display = "none";
        console.log("Preloader display set to 'none' after fade-out.");
      }, 750); // Matches CSS transition duration for opacity
    }, preloaderDuration);
  } else {
    if (!preloaderElement) {
      console.error("Preloader element with ID 'preloader' not found.");
    }
    if (!appContentElement) {
      console.error("App content element with ID 'app-content' not found.");
    }
    // Fallback to show app content if preloader elements are missing
    if (appContentElement) {
      appContentElement.classList.add("visible");
      console.warn(
        "Attempted to show app content due to missing preloader elements."
      );
    }
    if (preloaderElement) {
      preloaderElement.style.display = "none";
    }
  }
});
