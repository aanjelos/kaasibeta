/**
 * settings.js
 * Manages the settings modal, user preferences, account management, and category rules.
 */
function openSettingsModal() {
  renderSettingsForm();
  setupSettingsTabs();
  setupAppearanceListeners();
  
  if (typeof renderBudgetsSettingsList === "function") {
    renderBudgetsSettingsList();
    buildBudgetCategoryCheckboxes("addBudgetCategoriesContainer");
  }

  const storageInfoElement = $("#storageSizeInfo");
  if (storageInfoElement) {
    storageInfoElement.textContent = `Approx. Storage Used: ${getFormattedLocalStorageSize(
      STORAGE_KEY
    )}`;
  }

  openModalHelper("settingsModal");
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
      accRow.className = "grid grid-cols-[auto,1fr,1fr] gap-x-3 items-center py-1 account-row";
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

      hideButton.onclick = () => toggleAccountVisibility(acc.id);
      accRow.appendChild(hideButton);

      // Name Input
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.name = `accountName_${acc.id}`;
      nameInput.value = acc.name;
      nameInput.dataset.accountId = acc.id;
      nameInput.className = "text-sm rounded placeholder-gray-400";
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
        "text-sm rounded placeholder-gray-400";
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

  const settingsDefaultTransferFee = $("#settingsDefaultTransferFee");
  if (settingsDefaultTransferFee) {
    settingsDefaultTransferFee.value = (
      state.settings.defaultTransferFee !== undefined
        ? state.settings.defaultTransferFee
        : 25
    ).toFixed(2);
    settingsDefaultTransferFee.style.backgroundColor = "var(--bg-secondary)";
    settingsDefaultTransferFee.style.borderColor = "var(--border-color)";
    settingsDefaultTransferFee.style.color = "var(--text-primary)";
  }

  const settingsTransferFeeForm = $("#settingsTransferFeeForm");
  if (settingsTransferFeeForm) {
    settingsTransferFeeForm.onsubmit = (event) => {
      event.preventDefault();
      const formData = new FormData(settingsTransferFeeForm);
      const fee = parseFloat(String(formData.get("defaultTransferFee")).replace(/,/g, ''));
      if (isNaN(fee) || fee < 0) {
        showNotification("Invalid transfer fee amount.", "error");
        return;
      }
      state.settings.defaultTransferFee = fee;
      saveData();
      showNotification(`Default transfer fee set to ${formatCurrency(fee)}.`, "success");
    };
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
      const limit = parseFloat(String(formData.get("ccLimitAmount")).replace(/,/g, ''));
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

  const toggleMathToolbarElement = $("#toggleMathToolbar");
  if (toggleMathToolbarElement) {
    if (!state.settings) {
      state.settings = {
        initialSetupDone: false,
        showCcDashboardSection: true,
        showMathToolbar: true,
        theme: "dark",
      };
    }
    toggleMathToolbarElement.checked =
      state.settings.showMathToolbar !== undefined
        ? state.settings.showMathToolbar
        : true;

    if (!toggleMathToolbarElement.dataset.listenerAttached) {
      toggleMathToolbarElement.onchange = () => {
        if (!state.settings) {
          state.settings = {
            initialSetupDone: false,
            showCcDashboardSection: true,
            showMathToolbar: true,
            theme: "dark",
          };
        }
        state.settings.showMathToolbar = toggleMathToolbarElement.checked;
        saveData();
        applyAppearance();
      };
      toggleMathToolbarElement.dataset.listenerAttached = "true";
    }
  }

  // --- BACKUP REMINDER INIT ---
  const backupReminderSelect = $("#settingsBackupReminderFreq");
  if (backupReminderSelect) {
    if (!state.settings) {
      state.settings = {
        backupReminderFrequency: "default",
      };
    }
    backupReminderSelect.value =
      state.settings.backupReminderFrequency !== undefined
        ? state.settings.backupReminderFrequency
        : "default";

    if (!backupReminderSelect.dataset.listenerAttached) {
      backupReminderSelect.onchange = () => {
        if (!state.settings) {
          state.settings = { backupReminderFrequency: "default" };
        }
        state.settings.backupReminderFrequency = backupReminderSelect.value;
        saveData();
        showNotification("Local backup reminder frequency updated.", "success");
      };
      backupReminderSelect.dataset.listenerAttached = "true";
    }
  }

  // --- CASH COUNTER TOGGLE INIT ---
  const toggleHideCashCounter = $("#toggleHideCashCounter");
  if (toggleHideCashCounter) {
    toggleHideCashCounter.checked = state.settings.hideCashCounter === true;

    if (!toggleHideCashCounter.dataset.listenerAttached) {
      toggleHideCashCounter.onchange = () => {
        if (!state.settings) state.settings = {};
        state.settings.hideCashCounter = toggleHideCashCounter.checked;
        saveData();
        if (typeof renderDashboard === "function") renderDashboard();
      };
      toggleHideCashCounter.dataset.listenerAttached = "true";
    }
  }

  // --- ADDITIONAL DASHBOARD TOGGLES INIT ---
  const toggleHideTotalPotential = $("#toggleHideTotalPotential");
  if (toggleHideTotalPotential) {
    toggleHideTotalPotential.checked = state.settings.hideTotalPotential === true;
    if (!toggleHideTotalPotential.dataset.listenerAttached) {
      toggleHideTotalPotential.onchange = () => {
        if (!state.settings) state.settings = {};
        state.settings.hideTotalPotential = toggleHideTotalPotential.checked;
        saveData();
        if (typeof renderDashboard === "function") renderDashboard();
      };
      toggleHideTotalPotential.dataset.listenerAttached = "true";
    }
  }

  const toggleHideDebts = $("#toggleHideDebts");
  if (toggleHideDebts) {
    toggleHideDebts.checked = state.settings.hideDebts === true;
    if (!toggleHideDebts.dataset.listenerAttached) {
      toggleHideDebts.onchange = () => {
        if (!state.settings) state.settings = {};
        state.settings.hideDebts = toggleHideDebts.checked;
        saveData();
        if (typeof renderDashboard === "function") renderDashboard();
      };
      toggleHideDebts.dataset.listenerAttached = "true";
    }
  }

  const toggleHideInstallments = $("#toggleHideInstallments");
  if (toggleHideInstallments) {
    toggleHideInstallments.checked = state.settings.hideInstallments === true;
    if (!toggleHideInstallments.dataset.listenerAttached) {
      toggleHideInstallments.onchange = () => {
        if (!state.settings) state.settings = {};
        state.settings.hideInstallments = toggleHideInstallments.checked;
        saveData();
        if (typeof renderDashboard === "function") renderDashboard();
      };
      toggleHideInstallments.dataset.listenerAttached = "true";
    }
  }

  // --- SECURITY PANEL UI INIT ---
  const toggleAppPin = $("#toggleAppPin");
  const securityManagementOptions = $("#securityManagementOptions");
  const btnChangePin = $("#btnChangePin");
  const btnRemovePin = $("#btnRemovePin");
  
  const inlineSetup = $("#securityInlineSetup");
  const inlineChange = $("#securityInlineChange");
  const inlineRemove = $("#securityInlineRemove");
  const inlineChangeQuestion = $("#securityInlineChangeQuestion");

  function hideAllInlineForms() {
    if (inlineSetup) inlineSetup.classList.add("hidden");
    if (inlineChange) inlineChange.classList.add("hidden");
    if (inlineRemove) inlineRemove.classList.add("hidden");
    if (inlineChangeQuestion) inlineChangeQuestion.classList.add("hidden");
  }

  if (toggleAppPin) {
    if (state.settings && state.settings.appPin && state.settings.appPin.enabled) {
      toggleAppPin.checked = true;
      securityManagementOptions.classList.remove("hidden");
    } else {
      toggleAppPin.checked = false;
      securityManagementOptions.classList.add("hidden");
    }

    if (!toggleAppPin.dataset.listenerAttached) {
      toggleAppPin.onchange = () => {
        hideAllInlineForms();
        if (toggleAppPin.checked) {
          // Uncheck it visually until they complete setup
          toggleAppPin.checked = false;
          inlineSetup.classList.remove("hidden");
          
          $("#setupPinInput").value = "";
          $("#setupPinConfirm").value = "";
          $("#setupSecurityAnswer").value = "";
          $("#setupPinInput").focus();
        } else {
          // Wants to disable PIN. Recheck visually until they authenticate
          toggleAppPin.checked = true;
          inlineRemove.classList.remove("hidden");
          $("#removePinCurrent").value = "";
          $("#removePinCurrent").focus();
        }
      };
      
      // Inline Setup Logic
      $("#btnCancelPinSetup").onclick = () => {
        hideAllInlineForms();
        toggleAppPin.checked = false;
      };
      
      $("#btnSavePinSetup").onclick = async () => {
        const pin = $("#setupPinInput").value;
        const confirmPin = $("#setupPinConfirm").value;
        const q = $("#setupSecuritySelect").value;
        const a = $("#setupSecurityAnswer").value.trim().toLowerCase();
        
        if (!/^\d{4}$/.test(pin)) return showNotification("PIN must be exactly 4 digits.", "error");
        if (pin !== confirmPin) return showNotification("PINs do not match.", "error");
        if (!a) return showNotification("You must provide an answer to the security question.", "error");
        
        if (!state.settings.appPin) state.settings.appPin = {};
        state.settings.appPin.enabled = true;
        state.settings.appPin.pin = await hashString(pin);
        state.settings.appPin.question = q;
        state.settings.appPin.answer = await hashString(a);
        saveData();
        
        hideAllInlineForms();
        toggleAppPin.checked = true;
        securityManagementOptions.classList.remove("hidden");
        showNotification("PIN Lock enabled successfully.", "success");
        if (typeof trackEvent === "function") trackEvent("pin_enabled", "Security");
      };
      
      // Inline Change Logic
      if (btnChangePin) {
        btnChangePin.onclick = () => {
          hideAllInlineForms();
          inlineChange.classList.remove("hidden");
          $("#changePinCurrent").value = "";
          $("#changePinNew").value = "";
          $("#changePinConfirm").value = "";
          $("#changePinCurrent").focus();
        };
      }
      
      $("#btnCancelPinChange").onclick = () => {
        hideAllInlineForms();
      };
      
      $("#btnSavePinChange").onclick = async () => {
        const current = $("#changePinCurrent").value;
        const newPin = $("#changePinNew").value;
        const confirmPin = $("#changePinConfirm").value;
        
        const currentHash = await hashString(current);
        if (currentHash !== state.settings.appPin.pin) return showNotification("Incorrect current PIN.", "error");
        if (!/^\d{4}$/.test(newPin)) return showNotification("New PIN must be exactly 4 digits.", "error");
        if (newPin !== confirmPin) return showNotification("New PINs do not match.", "error");
        
        state.settings.appPin.pin = await hashString(newPin);
        saveData();
        hideAllInlineForms();
        showNotification("PIN changed successfully.", "success");
      };

      // Inline Change Question Logic
      const btnChangeQuestion = $("#btnChangeQuestion");
      const inlineChangeQuestion = $("#securityInlineChangeQuestion");
      
      if (btnChangeQuestion) {
        btnChangeQuestion.onclick = () => {
          hideAllInlineForms();
          if (inlineChangeQuestion) inlineChangeQuestion.classList.remove("hidden");
          $("#changeQuestionPinCurrent").value = "";
          $("#changeQuestionAnswer").value = "";
          $("#changeQuestionPinCurrent").focus();
        };
      }
      
      $("#btnCancelQuestionChange").onclick = () => {
        if (inlineChangeQuestion) inlineChangeQuestion.classList.add("hidden");
        hideAllInlineForms();
      };
      
      $("#btnSaveQuestionChange").onclick = async () => {
        const current = $("#changeQuestionPinCurrent").value;
        const newQ = $("#changeQuestionSelect").value;
        const newA = $("#changeQuestionAnswer").value.trim().toLowerCase();
        
        const currentHash = await hashString(current);
        if (currentHash !== state.settings.appPin.pin) return showNotification("Incorrect current PIN.", "error");
        if (!newA) return showNotification("You must provide an answer to the new security question.", "error");
        
        state.settings.appPin.question = newQ;
        state.settings.appPin.answer = await hashString(newA);
        saveData();
        if (inlineChangeQuestion) inlineChangeQuestion.classList.add("hidden");
        hideAllInlineForms();
        showNotification("Security Question updated.", "success");
      };
      
      // Inline Remove Logic
      if (btnRemovePin) {
        btnRemovePin.onclick = () => {
          hideAllInlineForms();
          inlineRemove.classList.remove("hidden");
          $("#removePinCurrent").value = "";
          $("#removePinCurrent").focus();
        };
      }
      
      $("#btnCancelPinRemove").onclick = () => {
        hideAllInlineForms();
      };
      
      $("#btnConfirmPinRemove").onclick = async () => {
        const current = $("#removePinCurrent").value;
        
        const currentHash = await hashString(current);
        if (currentHash !== state.settings.appPin.pin) return showNotification("Incorrect current PIN.", "error");
        
        state.settings.appPin = { enabled: false };
        saveData();
        hideAllInlineForms();
        toggleAppPin.checked = false;
        securityManagementOptions.classList.add("hidden");
        showNotification("PIN and Security Question removed.", "info");
      };

      toggleAppPin.dataset.listenerAttached = "true";
    }
  }
  // --- END SECURITY PANEL UI INIT ---

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

  // Populate hidden category rules checkboxes
  if (state.settings && state.settings.hiddenCategoryRules) {
    const rules = state.settings.hiddenCategoryRules;
    for (const rule in rules) {
      const checkbox = document.getElementById(`rule_${rule}`);
      if (checkbox) {
        checkbox.checked = rules[rule];
      }
    }
  }

  renderCategorySettingsList();
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

    li.className = "flex justify-between items-center px-3 py-1.5 rounded";
    li.style.backgroundColor = "var(--bg-secondary)";
    li.style.borderColor = "var(--border-color)";
    li.style.borderWidth = "1px";

    const inputElementHTML = `<input type="text" value="${escapeHTML(cat)}" data-original-name="${escapeHTML(cat)}" class="bg-transparent border-none focus:ring-0 focus:outline-none p-0 flex-grow mr-2 text-sm">`;

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "flex items-center gap-x-3";

    const isHidden = state.hiddenCategories?.includes(cat);
    const eyeIconClass = isHidden ? "fa-eye-slash text-gray-500" : "fa-eye text-accent-primary";
    const eyeTooltip = isHidden ? "Hidden Category (Click to make visible)" : "Visible Category (Click to hide)";
    
    const toggleBtn = `<button class="focus:outline-none hover:scale-110 transition-transform flex items-center justify-center w-6 h-6" onclick="toggleHiddenCategory(this.getAttribute('data-cat'))" data-cat="${escapeHTML(cat)}" data-tooltip="${escapeHTML(eyeTooltip)}"><i class="fas ${eyeIconClass}"></i></button>`;

    const saveButtonHTML = `<button class="btn btn-primary btn-sm !py-1 !px-3 text-xs font-medium" onclick="renameCategory(this)">Save</button>`;
    const deleteButtonHTML = `<button class="text-gray-400 hover:text-expense focus:outline-none w-6 h-6 flex items-center justify-center" onclick="deleteCategory(this.getAttribute('data-cat'))" data-cat="${escapeHTML(cat)}" data-tooltip="Delete Category"><i class="fas fa-times"></i></button>`;

    li.innerHTML = inputElementHTML;
    buttonsDiv.innerHTML = toggleBtn + saveButtonHTML + deleteButtonHTML;
    li.appendChild(buttonsDiv);

    categoryList.appendChild(li);
  });
}

function toggleHiddenCategory(categoryName) {
  if (!Array.isArray(state.hiddenCategories)) {
    state.hiddenCategories = [];
  }
  
  const index = state.hiddenCategories.indexOf(categoryName);
  if (index > -1) {
    state.hiddenCategories.splice(index, 1);
    showNotification(`${categoryName} is now visible`, "success");
  } else {
    state.hiddenCategories.push(categoryName);
    showNotification(`${categoryName} is now hidden`, "success");
  }
  
  saveData();
  renderCategorySettingsList();
  renderDashboard();
}

function toggleAdvancedRules() {
  const container = document.getElementById('advancedRulesContainer');
  const icon = document.getElementById('advancedRulesIcon');
  if (container.style.display === 'none') {
    container.style.display = 'block';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
  } else {
    container.style.display = 'none';
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
  }
}

function toggleHiddenRule(ruleKey) {
  if (!state.settings) state.settings = {};
  if (!state.settings.hiddenCategoryRules) state.settings.hiddenCategoryRules = {};
  
  const checkbox = document.getElementById(`rule_${ruleKey}`);
  state.settings.hiddenCategoryRules[ruleKey] = checkbox.checked;
  
  saveData();
  renderDashboard();
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

    // Cascade to budgets
    let budgetUpdateCount = 0;
    if (state.budgets) {
      state.budgets.forEach(b => {
        if (b.categories.includes(originalName)) {
          b.categories = b.categories.map(cat => cat === originalName ? newName : cat);
          budgetUpdateCount++;
        }
      });
    }

    saveData();
    populateDropdowns();
    renderCategorySettingsList();
    if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    
    showNotification(
      `Category "${originalName}" renamed to "${newName}". ${updateCount} transaction(s) and ${budgetUpdateCount} budget(s) updated.`,
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
    
    // Cascade to budgets
    if (state.budgets) {
      state.budgets.forEach(b => {
        b.categories = b.categories.filter(cat => cat !== categoryName);
      });
      // Removed clean up empty budgets to avoid silent deletion
    }

    saveData();
    populateDropdowns();
    renderCategorySettingsList();
    if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    showNotification(`Category "${categoryName}" deleted.`, "success");
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
    const newBalance = parseFloat(String(newBalanceInput).replace(/,/g, ''));

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
      const newBalanceFromForm = parseFloat(String(formData.get(`accountBalance_${acc.id}`)).replace(/,/g, ''));
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
    li.className = "flex-shrink-0";

    const button = document.createElement("button");
    button.className =
      "settings-tab-button inline-block p-3 border-b-2 rounded-t-lg whitespace-nowrap";
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

  // Dynamic Scroll Fade Logic
  const updateTabScrollFade = () => {
    // Only apply on mobile/small screens if desired, but scrollWidth check handles desktop naturally
    if (tabsContainer.scrollWidth <= tabsContainer.clientWidth) {
      tabsContainer.style.maskImage = 'none';
      tabsContainer.style.webkitMaskImage = 'none';
      return;
    }
    
    const isAtStart = tabsContainer.scrollLeft <= 0;
    const isAtEnd = Math.ceil(tabsContainer.scrollLeft) >= (tabsContainer.scrollWidth - tabsContainer.clientWidth) - 1;
    
    if (isAtStart && !isAtEnd) {
      tabsContainer.style.maskImage = 'linear-gradient(to right, black 85%, transparent 100%)';
      tabsContainer.style.webkitMaskImage = 'linear-gradient(to right, black 85%, transparent 100%)';
    } else if (!isAtStart && isAtEnd) {
      tabsContainer.style.maskImage = 'linear-gradient(to right, transparent 0%, black 15%, black 100%)';
      tabsContainer.style.webkitMaskImage = 'linear-gradient(to right, transparent 0%, black 15%, black 100%)';
    } else if (!isAtStart && !isAtEnd) {
      tabsContainer.style.maskImage = 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)';
      tabsContainer.style.webkitMaskImage = 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)';
    } else {
      tabsContainer.style.maskImage = 'none';
      tabsContainer.style.webkitMaskImage = 'none';
    }
  };

  tabsContainer.addEventListener('scroll', updateTabScrollFade, { passive: true });
  window.addEventListener('resize', updateTabScrollFade, { passive: true });
  
  // Need to run it once it's visible, so we hook into the modal open or a short timeout
  setTimeout(updateTabScrollFade, 50);
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
  
  if (typeof updateTabIndicator === 'function') {
    updateTabIndicator('settingsTabsContainer');
  }
  
  // Scroll the active tab into view (centered)
  setTimeout(() => {
    clickedButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, 10);

  const targetPanel = document.getElementById(targetPanelId);
  if (targetPanel) {
    targetPanel.classList.remove("hidden");
  } else {
    console.warn(`Target panel with ID '${targetPanelId}' not found.`);
  }

  activeSettingsTab = { button: clickedButton, panelId: targetPanelId };
}


// --- CATEGORY BUDGETS SETTINGS LOGIC ---

function buildBudgetCategoryCheckboxes(containerId, selectedCategories = [], currentBudgetId = null) {
  const container = $(`#${containerId}`);
  if (!container) return;
  container.innerHTML = "";

  const generalCategories = state.categories.filter(
    (c) =>
      c.toLowerCase() !== "income" &&
      c.toLowerCase() !== "credit card payment"
  ).sort((a, b) => a.localeCompare(b));

  if (generalCategories.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 p-2">No categories available.</p>`;
    return;
  }

  // Find categories used by other budget groups
  const usedCategories = new Set();
  if (state.budgets) {
    state.budgets.forEach(b => {
      if (b.id !== currentBudgetId) {
        if (Array.isArray(b.categories)) {
          b.categories.forEach(cat => usedCategories.add(cat));
        }
      }
    });
  }

  generalCategories.forEach((cat) => {
    const isUsed = usedCategories.has(cat);
    const isChecked = selectedCategories.includes(cat);
    const label = document.createElement("label");
    
    if (isUsed) {
      label.className = "flex items-center gap-2 px-2 py-1.5 opacity-40 cursor-not-allowed rounded text-sm text-gray-400 transition-colors select-none";
    } else {
      label.className = "flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 focus:bg-white/10 focus:outline-none cursor-pointer rounded text-sm text-gray-300 transition-colors";
      label.tabIndex = 0;
      label.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const cb = label.querySelector('input[type="checkbox"]');
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
    
    label.innerHTML = `
      <input type="checkbox" value="${escapeHTML(cat)}" class="budget-category-checkbox peer sr-only" ${isChecked ? "checked" : ""} ${isUsed ? "disabled" : ""}>
      <div class="w-4 h-4 rounded border ${isUsed ? "border-gray-700 bg-gray-800" : "border-gray-500 peer-checked:border-accent-500"} flex items-center justify-center transition-colors text-transparent peer-checked:text-accent-500">
        <svg class="w-3 h-3 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <span class="truncate flex-grow">${escapeHTML(cat)}</span>
      ${isUsed ? `<span class="text-[10px] bg-gray-850 text-gray-400 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider">Used</span>` : ""}
    `;
    container.appendChild(label);
  });

  // Auto-fill logic
  const nameInputId = containerId === "addBudgetCategoriesContainer" ? "addBudgetName" : "editBudgetName";
  const nameInput = $(`#${nameInputId}`);
  
  if (nameInput) {
    // Reset manual edit state when rebuilding
    const currentSelectedStr = selectedCategories.join(', ');
    if (nameInput.value.trim() !== "" && nameInput.value.trim() !== currentSelectedStr) {
      nameInput.dataset.manuallyEdited = "true";
    } else {
      nameInput.dataset.manuallyEdited = "false";
    }

    // Flag to track manual edits
    nameInput.addEventListener("input", (e) => {
      if (e.target.value.trim() !== "") {
        nameInput.dataset.manuallyEdited = "true";
      } else {
        nameInput.dataset.manuallyEdited = "false"; // resume auto-fill if they clear it
      }
    });

    const checkboxes = container.querySelectorAll(".budget-category-checkbox");
    checkboxes.forEach(cb => {
      cb.addEventListener("change", () => {
        if (nameInput.dataset.manuallyEdited === "true") return; // don't override manual edits
        
        const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
        if (selected.length > 0) {
          nameInput.value = selected.join(', ');
        } else {
          nameInput.value = "";
        }
      });
    });
  }
}

function renderBudgetsSettingsList() {
  const container = $("#activeBudgetsList");
  if (!container) return;

  if (!state.budgets || state.budgets.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400">No active budgets.</p>`;
    return;
  }

  const sortedBudgets = typeof getSortedBudgets === "function" ? getSortedBudgets() : state.budgets;
  
  const updateFn = () => {
    container.innerHTML = "";
    sortedBudgets.forEach((budget) => {
      const div = document.createElement("div");
      div.className = "flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-black/20 rounded-md border border-gray-600 gap-3";
      div.dataset.budgetId = budget.id;
      
      const catList = budget.categories.join(", ");
    
    div.innerHTML = `
      <div class="flex-grow min-w-0">
        <div class="flex items-center justify-between sm:justify-start gap-2 mb-1">
          <h4 class="font-medium text-gray-200 truncate">${escapeHTML(budget.name)}</h4>
          <span class="text-sm font-semibold text-accent-500 whitespace-nowrap">${formatCurrency(budget.limit)}</span>
        </div>
        <p class="text-xs text-gray-400 line-clamp-2" data-tooltip="${escapeHTML(catList)}">Categories: ${escapeHTML(catList) || 'None'}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
        <button type="button" class="btn btn-icon btn-sm" onclick="openEditBudgetModal('${budget.id}')" data-tooltip="Edit Budget">
          <i class="fas fa-edit"></i>
        </button>
        <button type="button" class="btn btn-icon-danger btn-sm" onclick="deleteBudget('${budget.id}')" data-tooltip="Delete Budget">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
      container.appendChild(div);
    });
  };

  if (typeof animateListReorder === "function") {
    animateListReorder(container, updateFn);
  } else {
    updateFn();
  }
}

function handleAddBudgetSubmit(event) {
  event.preventDefault();
  let nameInput = $("#addBudgetName").value.trim();
  const limitInput = parseFloat(String($("#addBudgetLimit").value).replace(/,/g, ''));
  
  if (isNaN(limitInput) || limitInput <= 0) {
    showNotification("Please provide a valid budget limit.", "error");
    return;
  }

  const container = $("#addBudgetCategoriesContainer");
  const checkboxes = container.querySelectorAll(".budget-category-checkbox");
  const selectedCategories = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

  if (selectedCategories.length === 0) {
    showNotification("Please select at least one category for the budget.", "error");
    return;
  }

  if (!nameInput) {
    if (selectedCategories.length === 1) {
      nameInput = selectedCategories[0];
    } else {
      showNotification("Please provide a budget name when grouping multiple categories.", "error");
      return;
    }
  }

  const newBudget = {
    id: generateId(),
    name: nameInput,
    limit: roundToTwoDecimals(limitInput),
    categories: selectedCategories
  };

  if (!state.budgets) state.budgets = [];
  state.budgets.push(newBudget);
  
  saveData();
  renderBudgetsSettingsList();
  $("#addBudgetForm").reset();
  buildBudgetCategoryCheckboxes("addBudgetCategoriesContainer");
  if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
  
  showNotification(`Budget "${nameInput}" created successfully.`, "success");
}

function openEditBudgetModal(budgetId) {
  const budget = state.budgets.find(b => b.id === budgetId);
  if (!budget) return;

  $("#editBudgetId").value = budget.id;
  $("#editBudgetName").value = budget.name;
  $("#editBudgetLimit").value = budget.limit;
  
  buildBudgetCategoryCheckboxes("editBudgetCategoriesContainer", budget.categories, budget.id);
  
  openModalHelper("editBudgetModal");
}

function handleEditBudgetSubmit(event) {
  event.preventDefault();
  const id = $("#editBudgetId").value;
  let nameInput = $("#editBudgetName").value.trim();
  const limitInput = parseFloat(String($("#editBudgetLimit").value).replace(/,/g, ''));
  
  if (isNaN(limitInput) || limitInput <= 0) {
    showNotification("Please provide a valid budget limit.", "error");
    return;
  }

  const container = $("#editBudgetCategoriesContainer");
  const checkboxes = container.querySelectorAll(".budget-category-checkbox");
  const selectedCategories = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

  if (selectedCategories.length === 0) {
    showNotification("Please select at least one category for the budget.", "error");
    return;
  }

  if (!nameInput) {
    if (selectedCategories.length === 1) {
      nameInput = selectedCategories[0];
    } else {
      showNotification("Please provide a budget name when grouping multiple categories.", "error");
      return;
    }
  }

  const budgetIndex = state.budgets.findIndex(b => b.id === id);
  if (budgetIndex !== -1) {
    state.budgets[budgetIndex] = {
      ...state.budgets[budgetIndex],
      name: nameInput,
      limit: roundToTwoDecimals(limitInput),
      categories: selectedCategories
    };
    saveData();
    renderBudgetsSettingsList();
    closeModal("editBudgetModal");
    if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    showNotification(`Budget "${nameInput}" updated.`, "success");
  }
}

function deleteBudget(budgetId) {
  const budget = state.budgets.find(b => b.id === budgetId);
  if (!budget) return;
  
  if (confirm(`Are you sure you want to delete the budget "${budget.name}"?`)) {
    state.budgets = state.budgets.filter(b => b.id !== budgetId);
    saveData();
    renderBudgetsSettingsList();
    if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    showNotification(`Budget deleted.`, "success");
  }
}

// Hook into existing form submissions
setTimeout(() => {
  const addBudgetForm = $("#addBudgetForm");
  if (addBudgetForm) addBudgetForm.addEventListener("submit", handleAddBudgetSubmit);
  
  const editBudgetForm = $("#editBudgetForm");
  if (editBudgetForm) editBudgetForm.addEventListener("submit", handleEditBudgetSubmit);
  
  const sortSelect = $("#budgetSortOrderSelect");
  if (sortSelect) {
    sortSelect.value = state.settings?.budgetSortOrder || "added";
    sortSelect.addEventListener("change", (e) => {
      if (!state.settings) state.settings = {};
      state.settings.budgetSortOrder = e.target.value;
      saveData();
      renderBudgetsSettingsList();
      if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    });
  }
}, 100);
