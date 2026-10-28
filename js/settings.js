/**
 * settings.js
 * Manages the settings modal, user preferences, account management, and category rules.
 */
function openSettingsModal({ restore = false } = {}) {
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
    )} (${KaasiStorage.mode === "indexeddb" ? "IndexedDB" : "localStorage"})`;
  }

  if (!restore) openModalHelper("settingsModal");
  cancelDeleteAllData();
  displayAppVersion();
  refreshStorageProtection();
  if (supabaseUser && typeof refreshCloudSyncStatus === "function") refreshCloudSyncStatus();
}

let storageProtectionCheck = 0;
let storageProtectionRequestPending = false;
let storageProtectionLaunchChecked = false;

async function rememberStorageProtectionDecision(granted) {
  try {
    if (granted) appPreferences.removeItem("kaasi_storage_protection_denied");
    else appPreferences.setItem("kaasi_storage_protection_denied", "true");
    await appPreferences.flush();
  } catch (error) { console.warn("Storage protection preference could not be saved.", error); }
}

async function requestStartupStorageProtection() {
  if (storageProtectionLaunchChecked || KaasiStorage.mode !== "indexeddb" || isAppLocked()) return;
  storageProtectionLaunchChecked = true;
  try {
    if (window.storagePersistenceDecision !== undefined) {
      await rememberStorageProtectionDecision(window.storagePersistenceDecision);
      return;
    }
    if (!navigator.storage?.persist || !navigator.storage?.persisted) return;
    if (await navigator.storage.persisted()) { await rememberStorageProtectionDecision(true); return; }
    if (appPreferences.getItem("kaasi_storage_protection_denied") === "true") return;
    try {
      const permission = await navigator.permissions?.query({ name: "persistent-storage" });
      if (permission?.state === "denied") { await rememberStorageProtectionDecision(false); return; }
    } catch (_) { /* Not every browser supports this permission query. */ }
    if (isAppLocked() || storageProtectionRequestPending) return;
    await refreshStorageProtection();
    if (!isAppLocked() && !storageProtectionRequestPending && !$("#requestPersistenceBtn").disabled) await $("#requestPersistenceBtn").onclick();
  } catch (error) { console.warn("Automatic storage protection request could not complete.", error); }
}

async function refreshStorageProtection() {
  const persistButton = $("#requestPersistenceBtn");
  if (persistButton) {
    $("#storageProtectionSection").hidden = KaasiStorage.mode !== "indexeddb";
    persistButton.hidden = KaasiStorage.mode !== "indexeddb";
    const canRequest = typeof navigator.storage?.persist === "function";
    if (storageProtectionRequestPending) return;
    const check = ++storageProtectionCheck;
    const renderProtection = (granted, message) => {
      persistButton.disabled = granted || !canRequest;
      persistButton.textContent = granted ? "Protection Enabled" : "Protect Local Storage";
      $("#persistenceStatus").textContent = granted
        ? "Persistent storage is enabled. External backups are still important."
        : message || (canRequest ? "Persistent storage is not enabled." : "Persistent storage is unavailable in this browser. Keep external backups.");
    };
    renderProtection(false, "Checking storage protection…");
    persistButton.onclick = async () => {
      if (storageProtectionRequestPending) return;
      storageProtectionRequestPending = true;
      ++storageProtectionCheck;
      persistButton.disabled = true;
      try {
        const granted = await navigator.storage.persist();
        renderProtection(granted, "Not enabled. Your browser may decide without a prompt. Keep external backups.");
        await rememberStorageProtectionDecision(granted);
      } catch (_) { renderProtection(false, "Persistent storage is unavailable in this browser. Keep external backups."); }
      finally { storageProtectionRequestPending = false; }
    };
    if (navigator.storage?.persisted) {
      try {
        const granted = await navigator.storage.persisted();
        if (check === storageProtectionCheck) renderProtection(granted);
      } catch (_) {
        if (check === storageProtectionCheck) renderProtection(false, "Storage protection could not be checked. Keep external backups.");
      }
    } else renderProtection(false);
  }
}

function refreshVisibleStorageProtection() {
  if (document.visibilityState === "hidden" || $("#settingsModal")?.style.display !== "block") return;
  refreshStorageProtection();
}
window.addEventListener("focus", refreshVisibleStorageProtection);
document.addEventListener("visibilitychange", refreshVisibleStorageProtection);

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
      hideButton.setAttribute("aria-label", `${acc.hidden ? "Show" : "Hide"} ${acc.name}`);
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
      nameInput.setAttribute("aria-label", `${acc.name} account name`);
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
      const nameField = document.createElement("label");
      nameField.className = "settings-account-name";
      nameField.innerHTML = '<span class="settings-mobile-field-label">Account Name</span>';
      nameField.appendChild(nameInput);
      accRow.appendChild(nameField);

      // Balance Input
      const balanceInput = document.createElement("input");
      balanceInput.type = "number";
      balanceInput.name = `accountBalance_${acc.id}`;
      balanceInput.setAttribute("aria-label", `${acc.name} balance`);
      balanceInput.value = acc.balance.toFixed(2);
      balanceInput.step = "0.01";
      balanceInput.dataset.accountId = acc.id;
      balanceInput.className =
        "text-sm rounded placeholder-gray-400";
      balanceInput.style.backgroundColor = "var(--bg-secondary)";
      balanceInput.style.borderColor = "var(--border-color)";
      balanceInput.style.color = "var(--text-primary)";
      const balanceField = document.createElement("label");
      balanceField.className = "settings-account-balance";
      balanceField.innerHTML = '<span class="settings-mobile-field-label">Balance (LKR)</span>';
      balanceField.appendChild(balanceInput);
      accRow.appendChild(balanceField);

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
    settingsTransferFeeForm.onsubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(settingsTransferFeeForm);
      const fee = parseAmountValue(formData.get("defaultTransferFee"));
      if (isNaN(fee) || fee < 0) {
        showNotification("Invalid transfer fee amount.", "error");
        return;
      }
      state.settings.defaultTransferFee = fee;
      await saveData();
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
    settingsCcLimitForm.onsubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(settingsCcLimitForm);
      const limit = parseAmountValue(formData.get("ccLimitAmount"));
      if (isNaN(limit) || limit < 0) {
        showNotification("Invalid credit limit amount.", "error");
        return;
      }
      if (!state.creditCard) {
        state.creditCard = { limit: 0, transactions: [] };
      }
      state.creditCard.limit = limit;
      await saveData();
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
      toggleCcSectionElement.onchange = async () => {
        if (!state.settings) {
          state.settings = {
            initialSetupDone: false,
            showCcDashboardSection: true,
            theme: "dark",
          };
        }
        state.settings.showCcDashboardSection = toggleCcSectionElement.checked;
        await saveData();
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
      toggleMathToolbarElement.onchange = async () => {
        if (!state.settings) {
          state.settings = {
            initialSetupDone: false,
            showCcDashboardSection: true,
            showMathToolbar: true,
            theme: "dark",
          };
        }
        state.settings.showMathToolbar = toggleMathToolbarElement.checked;
        await saveData();
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
      backupReminderSelect.onchange = async () => {
        if (!state.settings) {
          state.settings = { backupReminderFrequency: "default" };
        }
        state.settings.backupReminderFrequency = backupReminderSelect.value;
        await saveData();
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
      toggleHideCashCounter.onchange = async () => {
        if (!state.settings) state.settings = {};
        state.settings.hideCashCounter = toggleHideCashCounter.checked;
        await saveData();
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
      toggleHideTotalPotential.onchange = async () => {
        if (!state.settings) state.settings = {};
        state.settings.hideTotalPotential = toggleHideTotalPotential.checked;
        await saveData();
        if (typeof renderDashboard === "function") renderDashboard();
      };
      toggleHideTotalPotential.dataset.listenerAttached = "true";
    }
  }

  const toggleHideDebts = $("#toggleHideDebts");
  if (toggleHideDebts) {
    toggleHideDebts.checked = state.settings.hideDebts === true;
    if (!toggleHideDebts.dataset.listenerAttached) {
      toggleHideDebts.onchange = async () => {
        if (!state.settings) state.settings = {};
        state.settings.hideDebts = toggleHideDebts.checked;
        await saveData();
        if (typeof renderDashboard === "function") renderDashboard();
      };
      toggleHideDebts.dataset.listenerAttached = "true";
    }
  }

  const toggleHideInstallments = $("#toggleHideInstallments");
  if (toggleHideInstallments) {
    toggleHideInstallments.checked = state.settings.hideInstallments === true;
    if (!toggleHideInstallments.dataset.listenerAttached) {
      toggleHideInstallments.onchange = async () => {
        if (!state.settings) state.settings = {};
        state.settings.hideInstallments = toggleHideInstallments.checked;
        await saveData();
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
        
        const pinHash = await hashString(pin);
        const answerHash = await hashString(a);
        state.settings.appPin = { enabled: true, pin: pinHash, question: q, answer: answerHash };
        await saveData();
        
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
        await saveData();
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
        await saveData();
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
        await saveData();
        hideAllInlineForms();
        toggleAppPin.checked = false;
        securityManagementOptions.classList.add("hidden");
        showNotification("PIN and Security Question removed.", "info");
      };

      toggleAppPin.dataset.listenerAttached = "true";
    }
  }
  // --- END SECURITY PANEL UI INIT ---
  for (const id of ["btnSavePinSetup", "btnSavePinChange", "btnSaveQuestionChange", "btnConfirmPinRemove"]) {
    const button = document.getElementById(id);
    if (button?.onclick && !button.dataset.storageGuard) {
      button.onclick = guardStorageAction(button.onclick);
      button.dataset.storageGuard = "true";
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
  if (!categoryList) return;
  categoryList.innerHTML = "";
  [...state.categories].sort((a, b) => a.localeCompare(b)).forEach(cat => {
    const li = document.createElement("li");
    li.className = "settings-category-row";
    const hidden = state.hiddenCategories?.includes(cat);
    li.innerHTML = `
      <div class="settings-category-summary"><div class="settings-category-name"><strong>${escapeHTML(cat)}</strong>${hidden ? '<small>Hidden</small>' : ''}<input hidden type="text" aria-label="Category name" value="${escapeHTML(cat)}" data-original-name="${escapeHTML(cat)}"></div><div class="settings-category-normal-actions"><button type="button" class="settings-row-icon" aria-label="${hidden?'Show':'Hide'} ${escapeHTML(cat)}" onclick="toggleHiddenCategory(this.dataset.cat)" data-cat="${escapeHTML(cat)}"><i class="fas ${hidden?'fa-eye-slash':'fa-eye'}" aria-hidden="true"></i></button><button type="button" class="settings-row-icon" aria-label="Rename ${escapeHTML(cat)}" onclick="SettingsWorkspace.editCategory(this)"><i class="fas fa-pen" aria-hidden="true"></i></button><button type="button" class="settings-row-icon" aria-label="Delete ${escapeHTML(cat)}" onclick="deleteCategory(this.dataset.cat)" data-cat="${escapeHTML(cat)}"><i class="fas fa-trash-alt" aria-hidden="true"></i></button></div><div class="settings-category-save-actions" hidden><button class="settings-row-icon" type="button" aria-label="Cancel Rename" onclick="SettingsWorkspace.editCategory(this,false)"><i class="fas fa-times" aria-hidden="true"></i></button><button class="settings-row-icon accent-text" type="button" aria-label="Save Rename" onclick="renameCategory(this)"><i class="fas fa-check" aria-hidden="true"></i></button></div></div>`;
    categoryList.appendChild(li);
  });
}


async function toggleHiddenCategory(categoryName) {
  if (!Array.isArray(state.hiddenCategories)) {
    state.hiddenCategories = [];
  }
  
  const index = state.hiddenCategories.indexOf(categoryName);
  if (index > -1) {
    state.hiddenCategories.splice(index, 1);
  } else {
    state.hiddenCategories.push(categoryName);
  }
  
  await saveData();
  showNotification(`${categoryName} is now ${index > -1 ? "visible" : "hidden"}`, "success");
  renderCategorySettingsList();
  renderDashboard();
}

function toggleAdvancedRules() {
  const container = document.getElementById('advancedRulesContainer');
  const icon = document.getElementById('advancedRulesIcon');
  if (container.classList.contains('hidden') || container.style.display === 'none') {
    container.classList.remove('hidden');
    container.style.display = 'block';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
  } else {
    container.style.display = 'none';
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
  }
}

async function toggleHiddenRule(ruleKey) {
  if (!state.settings) state.settings = {};
  if (!state.settings.hiddenCategoryRules) state.settings.hiddenCategoryRules = {};
  
  const checkbox = document.getElementById(`rule_${ruleKey}`);
  state.settings.hiddenCategoryRules[ruleKey] = checkbox.checked;
  
  await saveData();
  renderDashboard();
}

async function renameCategory(buttonElement) {
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

    state.hiddenCategories = (state.hiddenCategories || []).map(cat => cat === originalName ? newName : cat);
    state.creditCard.transactions.forEach(item => {
      if (item.category === originalName) item.category = newName;
    });
    (state.subscriptions || []).forEach(item => {
      if (item.category === originalName) item.category = newName;
    });
    if (state.settings.defaultTransferFeeCategory === originalName) {
      state.settings.defaultTransferFeeCategory = newName;
    }
    $$(".filter-category-checkbox").forEach(checkbox => {
      if (checkbox.value === originalName) checkbox.value = newName;
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

    await saveData();
    populateDropdowns();
    renderCategorySettingsList();
    renderDashboard();
    refreshMonthlyViewIfRelevant(getCurrentDateString());
    if (typeof renderBudgetsSettingsList === "function") renderBudgetsSettingsList();
    buildBudgetCategoryCheckboxes("addBudgetCategoriesContainer");
    
    showNotification(
      `Category "${originalName}" renamed to "${newName}". ${updateCount} transaction(s) and ${budgetUpdateCount} budget(s) updated.`,
      "success"
    );
    document.body.renderCcHistoryList?.();
  } else {
    showNotification(`Original category "${originalName}" not found.`, "error");
    inputElement.value = originalName;
  }
}

async function addCategory(event) {
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
  await saveData();
  populateDropdowns();
  renderCategorySettingsList();
  input.value = "";
  showNotification(`Category "${newCategoryName}" added.`, "success");
  if ($("#settingsAddCategoryModal")?.style.display === "block") closeModal("settingsAddCategoryModal");
}

async function deleteCategory(categoryName) {
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
  showConfirmationModal('Delete Category?', `Delete "${escapeHTML(categoryName)}"? This cannot be undone.`, 'Delete Category', 'Cancel', async () => {
    if (state.transactions.some(t => t.category === categoryName)) { showNotification('This category is now in use and cannot be deleted.', 'error'); return; }
    state.categories = state.categories.filter((cat) => cat !== categoryName);
    state.creditCard.transactions.forEach(item => {
      if (item.category === categoryName) delete item.category;
    });
    (state.subscriptions || []).forEach(item => {
      if (item.category === categoryName) item.category = '';
    });
    
    // Cascade to budgets
    if (state.budgets) {
      state.budgets.forEach(b => {
        b.categories = b.categories.filter(cat => cat !== categoryName);
      });
      // Removed clean up empty budgets to avoid silent deletion
    }

    await saveData();
    populateDropdowns();
    renderCategorySettingsList();
    if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    showNotification(`Category "${categoryName}" deleted.`, "success");
    document.body.renderCcHistoryList?.();
  });
}

async function handleManageAccountsSubmit(event) {
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
    const newBalance = parseAmountValue(newBalanceInput);

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
    await saveData();
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
      const newBalanceFromForm = parseAmountValue(formData.get(`accountBalance_${acc.id}`));
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
      await saveData();
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
  SettingsWorkspace.setup();
}

function switchSettingsTab(clickedButton, targetPanelId) {
  SettingsWorkspace.navigate(targetPanelId);
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
  ).sort(compareCategoryNames);

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
  const sortSelect = $("#budgetSortOrderSelect");
  if (sortSelect) sortSelect.value = state.settings?.budgetSortOrder || "added";

  if (!state.budgets || state.budgets.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400">No active budgets.</p>`;
    return;
  }

  const sortedBudgets = typeof getSortedBudgets === "function" ? getSortedBudgets() : state.budgets;
  
  const updateFn = () => {
    container.innerHTML = "";
    sortedBudgets.forEach((budget) => {
      const div = document.createElement("div");
      div.className = "settings-budget-row";
      div.dataset.budgetId = budget.id;
      
      const catList = budget.categories.join(", ");
      const month = getCurrentDateString().slice(0, 7);
      const spent = state.transactions.filter(item => item.type === "expense" && item.date.startsWith(month) && budget.categories.includes(item.category)).reduce((sum, item) => sum + item.amount, 0);
      const percent = budget.limit > 0 ? spent / budget.limit * 100 : (spent > 0 ? 100 : 0);
    
    div.innerHTML = `
      <div class="settings-budget-heading"><h4>${escapeHTML(budget.name)}</h4><div class="settings-budget-actions">
        <button type="button" class="settings-row-icon" aria-label="Edit ${escapeHTML(budget.name)}" data-record-action="editBudget" data-record-id="${escapeHTML(budget.id)}" data-tooltip="Edit Budget">
          <i class="fas fa-pen" aria-hidden="true"></i>
        </button>
        <button type="button" class="settings-row-icon" aria-label="Delete ${escapeHTML(budget.name)}" data-record-action="deleteBudget" data-record-id="${escapeHTML(budget.id)}" data-tooltip="Delete Budget">
          <i class="fas fa-trash-alt" aria-hidden="true"></i>
        </button>
      </div></div>
      ${catList === budget.name ? '' : `<p class="settings-budget-categories">${escapeHTML(catList) || 'No categories assigned'}</p>`}
      <p class="settings-budget-spending ${percent > 100 ? 'text-expense' : ''}">${formatCurrency(spent)} of ${formatCurrency(budget.limit)} spent</p>
      <div class="settings-budget-track" role="meter" aria-label="${escapeHTML(budget.name)} spending" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(percent, 100)}" aria-valuetext="${percent.toFixed(1)}% of budget"><span style="width:${Math.min(percent, 100)}%;background:var(--${percent > 100 ? 'expense-color' : percent > 70 ? 'accent-primary' : 'income-color'})"></span></div>
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

async function handleAddBudgetSubmit(event) {
  event.preventDefault();
  let nameInput = $("#addBudgetName").value.trim();
  const limitInput = parseAmountValue($("#addBudgetLimit").value);
  
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
  
  await saveData();
  renderBudgetsSettingsList();
  $("#addBudgetForm").reset();
  buildBudgetCategoryCheckboxes("addBudgetCategoriesContainer");
  if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
  
  showNotification(`Budget "${nameInput}" created successfully.`, "success");
  if ($("#settingsAddBudgetModal")?.style.display === "block") closeModal("settingsAddBudgetModal");
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

async function handleEditBudgetSubmit(event) {
  event.preventDefault();
  const id = $("#editBudgetId").value;
  let nameInput = $("#editBudgetName").value.trim();
  const limitInput = parseAmountValue($("#editBudgetLimit").value);
  
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
    await saveData();
    renderBudgetsSettingsList();
    closeModal("editBudgetModal");
    if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    showNotification(`Budget "${nameInput}" updated.`, "success");
  }
}

async function deleteBudget(budgetId) {
  const budget = state.budgets.find(b => b.id === budgetId);
  if (!budget) return;
  
  if (confirm(`Are you sure you want to delete the budget "${budget.name}"?`)) {
    state.budgets = state.budgets.filter(b => b.id !== budgetId);
    await saveData();
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
    sortSelect.addEventListener("change", async (e) => {
      if (!state.settings) state.settings = {};
      state.settings.budgetSortOrder = e.target.value;
      await saveData();
      renderBudgetsSettingsList();
      if (typeof renderCategoryBudgets === "function") renderCategoryBudgets();
    });
  }
}, 100);
