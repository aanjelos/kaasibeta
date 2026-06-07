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
    { key: "A", action: "Open All Transactions." },
    { key: "S", action: "Open Settings (In Dashboard)." },
    { key: "S", action: "Start Search (In All Transactions)." },
    { key: "C", action: "Start a CC Transaction." },
    { key: "D", action: "View All Debts." },
    { key: "R", action: "View All Receivables." },
    { key: "T", action: "Transfer Money." },
    { key: "Ctrl + E", action: "Export Data." },
    { key: "Ctrl + I", action: "Import Data." },
    { key: "← / →", action: "Navigate Month Tabs in All Transactions." },
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

  openModalHelper("shortcutsHelpModal");
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

    case "a":
    case "A":
      if (!inInputField) {
        event.preventDefault();
        const monthlyViewBtn = $("#monthlyViewBtn");
        if (monthlyViewBtn) {
          if ($("#monthlyViewModal")?.style.display !== "block") {
            monthlyViewBtn.click();
            console.log("Shortcut: 'a' pressed, opening All Transactions");
          } else {
            closeModal("monthlyViewModal");
            console.log("Shortcut: 'a' pressed, closing All Transactions");
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
function applyAppearance() {
  if (!state.settings) return;
  const theme = state.settings.theme || "dark";
  const accent = state.settings.accent || "orange";

  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-accent", accent);

  if (typeof renderDashboard === 'function') {
    // A lightweight timeout ensures CSS variables are parsed before canvas re-reads them
    setTimeout(renderDashboard, 10);
  }
}

function setupAppearanceListeners() {
  const themeDarkBtn = $("#themeDarkBtn");
  const themeLightBtn = $("#themeLightBtn");
  
  if (themeDarkBtn && themeLightBtn) {
    const updateThemeUI = () => {
      const theme = state.settings.theme || "dark";
      if (theme === "dark") {
        themeDarkBtn.classList.add("border-accent-primary");
        themeDarkBtn.classList.remove("border-transparent");
        themeLightBtn.classList.remove("border-accent-primary");
        themeLightBtn.classList.add("border-transparent");
      } else {
        themeLightBtn.classList.add("border-accent-primary");
        themeLightBtn.classList.remove("border-transparent");
        themeDarkBtn.classList.remove("border-accent-primary");
        themeDarkBtn.classList.add("border-transparent");
      }
    };
    
    themeDarkBtn.onclick = () => {
      state.settings.theme = "dark";
      saveData();
      applyAppearance();
      updateThemeUI();
    };
    
    themeLightBtn.onclick = () => {
      state.settings.theme = "light";
      saveData();
      applyAppearance();
      updateThemeUI();
    };
    
    updateThemeUI();
  }

  const accentBtns = $$("#accentColorContainer button");
  if (accentBtns) {
    const updateAccentUI = () => {
      const accent = state.settings.accent || "orange";
      accentBtns.forEach(btn => {
        if (btn.dataset.accent === accent) {
          btn.classList.add("ring-2", "ring-offset-2", "ring-accent-primary");
          btn.classList.remove("ring-transparent");
        } else {
          btn.classList.remove("ring-2", "ring-offset-2", "ring-accent-primary");
          btn.classList.add("ring-transparent");
        }
      });
    };

    accentBtns.forEach(btn => {
      btn.onclick = () => {
        state.settings.accent = btn.dataset.accent;
        saveData();
        applyAppearance();
        updateAccentUI();
      };
    });
    
    updateAccentUI();
  }
}

function openSettingsModal() {
  renderSettingsForm();
  setupSettingsTabs();
  setupAppearanceListeners();

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
      };
      toggleMathToolbarElement.dataset.listenerAttached = "true";
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
      
      $("#btnSavePinSetup").onclick = () => {
        const pin = $("#setupPinInput").value;
        const confirmPin = $("#setupPinConfirm").value;
        const q = $("#setupSecuritySelect").value;
        const a = $("#setupSecurityAnswer").value.trim().toLowerCase();
        
        if (!/^\d{4}$/.test(pin)) return showNotification("PIN must be exactly 4 digits.", "error");
        if (pin !== confirmPin) return showNotification("PINs do not match.", "error");
        if (!a) return showNotification("You must provide an answer to the security question.", "error");
        
        if (!state.settings.appPin) state.settings.appPin = {};
        state.settings.appPin.enabled = true;
        state.settings.appPin.pin = btoa(pin);
        state.settings.appPin.question = q;
        state.settings.appPin.answer = btoa(a);
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
      
      $("#btnSavePinChange").onclick = () => {
        const current = $("#changePinCurrent").value;
        const newPin = $("#changePinNew").value;
        const confirmPin = $("#changePinConfirm").value;
        
        if (btoa(current) !== state.settings.appPin.pin) return showNotification("Incorrect current PIN.", "error");
        if (!/^\d{4}$/.test(newPin)) return showNotification("New PIN must be exactly 4 digits.", "error");
        if (newPin !== confirmPin) return showNotification("New PINs do not match.", "error");
        
        state.settings.appPin.pin = btoa(newPin);
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
      
      $("#btnSaveQuestionChange").onclick = () => {
        const current = $("#changeQuestionPinCurrent").value;
        const newQ = $("#changeQuestionSelect").value;
        const newA = $("#changeQuestionAnswer").value.trim().toLowerCase();
        
        if (btoa(current) !== state.settings.appPin.pin) return showNotification("Incorrect current PIN.", "error");
        if (!newA) return showNotification("You must provide an answer to the new security question.", "error");
        
        state.settings.appPin.question = newQ;
        state.settings.appPin.answer = btoa(newA);
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
      
      $("#btnConfirmPinRemove").onclick = () => {
        const current = $("#removePinCurrent").value;
        
        if (btoa(current) !== state.settings.appPin.pin) return showNotification("Incorrect current PIN.", "error");
        
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

function toggleAccountVisibility(accountId) {
  const account = state.accounts.find((acc) => acc.id === accountId);
  if (!account) return;

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

    li.className = "flex justify-between items-center px-3 py-1.5 rounded";
    li.style.backgroundColor = "var(--bg-secondary)";
    li.style.borderColor = "var(--border-color)";
    li.style.borderWidth = "1px";

    const inputElementHTML = `<input type="text" value="${cat}" data-original-name="${cat}" class="bg-transparent border-none focus:ring-0 focus:outline-none p-0 flex-grow mr-2 text-sm">`;

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "flex items-center gap-x-3";

    const isHidden = state.hiddenCategories?.includes(cat);
    const eyeIconClass = isHidden ? "fa-eye-slash text-gray-500" : "fa-eye text-accent-primary";
    const eyeTooltip = isHidden ? "Hidden Category (Click to make visible)" : "Visible Category (Click to hide)";
    
    const toggleBtn = `<button class="focus:outline-none hover:scale-110 transition-transform flex items-center justify-center w-6 h-6" onclick="toggleHiddenCategory('${cat}')" title="${eyeTooltip}"><i class="fas ${eyeIconClass}"></i></button>`;

    const saveButtonHTML = `<button class="btn btn-primary btn-sm !py-1 !px-3 text-xs font-medium" onclick="renameCategory(this)">Save</button>`;
    const deleteButtonHTML = `<button class="text-gray-400 hover:text-expense focus:outline-none w-6 h-6 flex items-center justify-center" onclick="deleteCategory('${cat}')" title="Delete Category"><i class="fas fa-times"></i></button>`;

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
    inputEl.step = "1";
    inputEl.dataset.denom = denom;
    inputEl.className =
      "text-center bg-gray-600 border border-gray-500 rounded px-1 py-0.5 w-16 mx-auto text-sm";
    inputEl.placeholder = "0";
    inputEl.oninput = calculateCashTotal;
    inputEl.onkeydown = (e) => {
      if (['.', 'e', 'E', '-', '+'].includes(e.key)) e.preventDefault();
    };
    inputEl._scrollAccumulator = 0;
    inputEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      inputEl._scrollAccumulator += e.deltaY;
      if (Math.abs(inputEl._scrollAccumulator) >= 100) {
        let val = parseInt(inputEl.value) || 0;
        let steps = Math.trunc(inputEl._scrollAccumulator / 100);
        val = Math.max(0, val - steps); // Scroll up (negative delta) increases value
        inputEl.value = val;
        inputEl._scrollAccumulator -= steps * 100;
        calculateCashTotal();
      }
    });
    const totalEl = document.createElement("span");
    totalEl.className = "text-right text-gray-400 text-sm";
    totalEl.id = `cashTotal-${denom}`;
    totalEl.textContent = formatCurrency(0);
    gridContainer.appendChild(denomEl);
    gridContainer.appendChild(inputEl);
    gridContainer.appendChild(totalEl);
  });
  calculateCashTotal();
  openModalHelper("cashCounterModal");
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

// --- MODAL & BACK GESTURE LOGIC ---
function openModalHelper(modalId) {
  const modal = $(`#${modalId}`);
  if (modal && modal.style.display !== "block") {
    modal.style.display = "block";
    history.pushState({ modalOpen: true, modalId }, null, "");
  }
}

window.addEventListener("popstate", (event) => {
  const modalsToClose = [
    "confirmationModal", "formModal", "ccHistoryModal", "cashCounterModal",
    "debtsViewModal", "receivablesViewModal", "transferMoneyModal",
    "monthlyViewModal", "settingsModal", "donateModal", "shortcutsHelpModal", "securityQuestionModal", "initialSetupModal"
  ];
  modalsToClose.forEach(id => {
    const m = $(`#${id}`);
    if (m && m.style.display === "block") {
      m.style.display = "none"; // Hide silently
      if (id === "formModal") {
        $("#dynamicForm").innerHTML = "";
        $("#dynamicForm").onsubmit = null;
      }
      if (id === "settingsModal") cancelDeleteAllData();
      if (id === "ccHistoryModal") document.body.renderCcHistoryList = null;
    }
  });
});

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
  
  // Clean up history state if closed manually
  if (history.state && history.state.modalOpen) {
    history.back();
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
  openModalHelper("formModal");
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

  openModalHelper("confirmationModal");
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
                <input type="text" inputmode="decimal" class="calc-amount" id="modalCcAmount" name="ccAmount" value="${transaction.amount.toFixed(
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
  { label: "Categories", targetPanelId: "settingsCategoriesPanel" },
  { label: "Data", targetPanelId: "settingsDataManagementPanel" },
  { label: "Appearance", targetPanelId: "settingsAppearancePanel" },
  { label: "Security", targetPanelId: "settingsSecurityPanel" }
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
    openModalHelper("donateModal");
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

/* --------------------------------------------------- */
/* --- INLINE AMOUNT CALCULATION & MATH TOOLBAR --- */
/* --------------------------------------------------- */

// Create the global math toolbar
const mathToolbar = document.createElement("div");
mathToolbar.className = "math-toolbar";
mathToolbar.innerHTML = `
  <div class="math-btn" data-op="+">+</div>
  <div class="math-btn" data-op="-">-</div>
  <div class="math-btn" data-op="*">×</div>
  <div class="math-btn" data-op="/">÷</div>
  <div class="math-btn math-btn-equal" data-op="=">=</div>
`;
document.body.appendChild(mathToolbar);

let activeCalcInput = null;
let toolbarHideTimeout = null;

function evaluateMathExpression(inputStr) {
  let expr = inputStr.trim();
  if (expr.endsWith("=")) {
    expr = expr.slice(0, -1);
  }
  expr = expr.replace(/×/g, "*").replace(/÷/g, "/");

  if (!/^[\d\.\+\-\*\/\(\)\s]+$/.test(expr)) return null;
  if (!/[\+\-\*\/]/.test(expr)) return null;

  try {
    const result = Function('"use strict";return (' + expr + ')')();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return parseFloat(result.toFixed(2));
    }
  } catch (e) {
    return null;
  }
  return null;
}

function processCalculation(inputEl) {
  const result = evaluateMathExpression(inputEl.value);
  if (result !== null) {
    inputEl.value = result;
    if (typeof trackEvent === "function") trackEvent("used_inline_calculator", "Feature Usage");
    return true; 
  }
  return false; 
}

function positionMathToolbar(inputEl) {
  const rect = inputEl.getBoundingClientRect();
  mathToolbar.style.left = `${rect.left + window.scrollX}px`;
  mathToolbar.style.top = `${rect.top + window.scrollY - 45}px`; 
}

function showMathToolbar(inputEl) {
  if (state.settings && state.settings.showMathToolbar === false) return;
  activeCalcInput = inputEl;
  positionMathToolbar(inputEl);
  mathToolbar.classList.add("visible");
  if (toolbarHideTimeout) clearTimeout(toolbarHideTimeout);
}

function hideMathToolbar() {
  toolbarHideTimeout = setTimeout(() => {
    mathToolbar.classList.remove("visible");
    activeCalcInput = null;
  }, 150);
}

document.addEventListener("focusin", (e) => {
  if (e.target.classList && e.target.classList.contains("calc-amount")) {
    showMathToolbar(e.target);
  }
});

document.addEventListener("focusout", (e) => {
  if (e.target.classList && e.target.classList.contains("calc-amount")) {
    hideMathToolbar();
    processCalculation(e.target);
  }
});

document.addEventListener("input", (e) => {
  if (e.target.classList && e.target.classList.contains("calc-amount")) {
    const val = e.target.value;
    if (val.endsWith("=")) {
      processCalculation(e.target);
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList && e.target.classList.contains("calc-amount")) {
    const calculated = processCalculation(e.target);
    if (calculated) {
      e.preventDefault(); 
    }
  }
});

window.addEventListener("scroll", () => {
  if (activeCalcInput && mathToolbar.classList.contains("visible")) {
    positionMathToolbar(activeCalcInput);
  }
}, true);

window.addEventListener("resize", () => {
  if (activeCalcInput && mathToolbar.classList.contains("visible")) {
    positionMathToolbar(activeCalcInput);
  }
});

mathToolbar.addEventListener("mousedown", (e) => {
  e.preventDefault(); 
});

mathToolbar.addEventListener("click", (e) => {
  if (e.target.classList.contains("math-btn") && activeCalcInput) {
    const op = e.target.getAttribute("data-op");
    if (op === "=") {
      processCalculation(activeCalcInput);
    } else {
      activeCalcInput.value += op;
      
      const evt = new Event("input", { bubbles: true });
      activeCalcInput.dispatchEvent(evt);
    }
    activeCalcInput.focus();
  }
});

// --- MOBILE DROPDOWN MENU LOGIC ---
function setupMobileDropdown() {
  const mobileMenuBtn = $("#mobileMenuBtn");
  const mobileDropdown = $("#mobileDropdown");
  const mobileMenuOverlay = $("#mobileMenuOverlay");
  const mobileMenuIcon = $("#mobileMenuIcon");
  
  if (!mobileMenuBtn || !mobileDropdown) return;

  let isOpen = false;

  const toggleDropdown = () => {
    isOpen = !isOpen;
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
      mobileDropdown.classList.remove("opacity-0", "invisible");
      mobileDropdown.classList.add("opacity-100", "visible", "dropdown-open");
      mobileMenuOverlay.classList.remove("opacity-0", "invisible");
      mobileMenuOverlay.classList.add("opacity-100", "visible", "pointer-events-auto");
      mobileMenuIcon.classList.remove("fa-bars");
      mobileMenuIcon.classList.add("fa-times");
    } else {
      document.body.classList.remove("overflow-hidden");
      mobileDropdown.classList.remove("opacity-100", "visible", "dropdown-open");
      mobileDropdown.classList.add("opacity-0", "invisible");
      mobileMenuOverlay.classList.remove("opacity-100", "visible", "pointer-events-auto");
      mobileMenuOverlay.classList.add("opacity-0", "invisible");
      mobileMenuIcon.classList.remove("fa-times");
      mobileMenuIcon.classList.add("fa-bars");
    }
  };

  mobileMenuBtn.onclick = toggleDropdown;
  mobileMenuOverlay.onclick = toggleDropdown;

  // Wire up Dropdown buttons
  $("#dropSettingsBtn")?.addEventListener("click", () => {
    toggleDropdown();
    $("#settingsBtn")?.click();
  });

  $("#dropMonthlyBtn")?.addEventListener("click", () => {
    toggleDropdown();
    $("#monthlyViewBtn")?.click();
  });

  $("#dropBackupBtn")?.addEventListener("click", () => {
    toggleDropdown();
    const target = $("#shortcutCloud")?.checked && !$("#shortcutCloud")?.disabled ? "cloud" : "local";
    if (target === "cloud") {
      if (typeof backupToSupabase === "function") backupToSupabase();
    } else {
      if (typeof exportData === "function") exportData();
    }
  });

  $("#dropRestoreBtn")?.addEventListener("click", () => {
    toggleDropdown();
    const target = $("#shortcutCloud")?.checked && !$("#shortcutCloud")?.disabled ? "cloud" : "local";
    if (target === "cloud") {
      if (typeof restoreFromSupabase === "function") restoreFromSupabase();
    } else {
      const importInput = $("#importDataInput");
      if (importInput) importInput.click();
    }
  });
}
