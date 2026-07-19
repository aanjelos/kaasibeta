/**
 * ui.js
 * Handles user interface interactions, modals, keyboard shortcuts, and general DOM manipulation helpers.
 */
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
        restoreFromSupabase(false, true);
      } else {
        console.log("Shortcut: Ctrl+I pressed for Local Import");
        triggerDataImport();
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
          "transactionDetailModal",
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
        const typeSelect = $("#transactionType");
        const amountInput = $("#amount");
        if (typeSelect && amountInput) {
          typeSelect.value = "transfer";
          typeSelect.dispatchEvent(new Event("change"));
          amountInput.focus();
          console.log("Shortcut: 't' pressed, selecting Transfer");
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
  const theme = getDeviceTheme();

  document.documentElement.setAttribute("data-theme", theme);
  
  if (state.settings.showMathToolbar === false) {
    document.body.classList.add("hide-calc-buttons");
  } else {
    document.body.classList.remove("hide-calc-buttons");
  }

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
      const theme = getDeviceTheme();
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
      setDeviceTheme("dark");
      applyAppearance();
      updateThemeUI();
    };
    
    themeLightBtn.onclick = () => {
      setDeviceTheme("light");
      applyAppearance();
      updateThemeUI();
    };
    
    updateThemeUI();
  }
}





function toggleAccountVisibility(accountId) {
  const account = state.accounts.find((acc) => acc.id === accountId);
  if (!account) return;

  if (!account.hidden) {
    const visibleAccounts = state.accounts.filter((a) => !a.hidden);
    if (visibleAccounts.length <= 1) {
      showNotification("You must have at least one account visible.", "error");
      return;
    }
  }
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
let bodyScrollPosition = 0;
function updateBodyScrollState() {
  const modals = document.querySelectorAll('.modal');
  let anyOpen = false;
  modals.forEach(m => {
    if (m.style.display === "block") anyOpen = true;
  });
  
  if (anyOpen && !document.body.classList.contains("modal-open")) {
    bodyScrollPosition = window.pageYOffset;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${bodyScrollPosition}px`;
    document.body.style.width = '100%';
    document.body.classList.add("modal-open");
  } else if (!anyOpen && document.body.classList.contains("modal-open")) {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.classList.remove("modal-open");
    window.scrollTo(0, bodyScrollPosition);
  }
}

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

function openModalHelper(modalId) {
  const modal = $(`#${modalId}`);
  if (modal && modal.style.display !== "block") {
    modal.style.display = "block";
    updateBodyScrollState();
    
    let currentOpenModals = [];
    if (history.state && history.state.openModals) {
      currentOpenModals = [...history.state.openModals];
    }
    currentOpenModals.push(modalId);
    
    history.pushState({ modalOpen: true, modalId, openModals: currentOpenModals }, null, "");

    setTimeout(() => {
      if (!["settingsModal", "initialSetupModal", "donateModal", "shortcutsHelpModal", "monthlyViewModal"].includes(modalId)) {
        const firstInput = modal.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([readonly]), select, textarea');
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 50);
  }
}

window.addEventListener("popstate", (event) => {
  const modalsToClose = [
    "confirmationModal", "formModal", "transactionDetailModal", "ccTransactionDetailModal", "ccHistoryModal", "cashCounterModal",
    "debtsViewModal", "receivablesViewModal", "transferMoneyModal",
    "monthlyViewModal", "settingsModal", "donateModal", "shortcutsHelpModal", "securityQuestionModal", "initialSetupModal", "editBudgetModal"
  ];
  
  const targetOpenModals = (event.state && event.state.openModals) ? event.state.openModals : [];
  if (event.state && event.state.modalOpen && (!event.state.openModals || event.state.openModals.length === 0)) {
    targetOpenModals.push(event.state.modalId);
  }

  modalsToClose.forEach(id => {
    const m = $(`#${id}`);
    if (m) {
      if (targetOpenModals.includes(id)) {
        m.style.display = "block";
      } else if (m.style.display === "block") {
        m.style.display = "none";
        if (id === "formModal") {
          $("#dynamicForm").innerHTML = "";
          $("#dynamicForm").onsubmit = null;
        }
        if (id === "settingsModal") cancelDeleteAllData();
        if (id === "ccHistoryModal") document.body.renderCcHistoryList = null;
      }
    }
  });
  updateBodyScrollState();
});

function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal) {
    modal.style.display = "none";
    updateBodyScrollState();
  }
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
    if (event.target === modal && modal.id !== "initialSetupModal" && modal.id !== "cloudSessionExpiredModal") {
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
    let handled = false;
    if (typeof currentConfirmCallback === "function") {
      handled = currentConfirmCallback();
    }
    if (handled !== true) {
      closeModal("confirmationModal");
    }
  };

  newCancelBtn.onclick = () => {
    if (typeof currentCancelCallback === "function") {
      currentCancelCallback();
    }
    closeModal("confirmationModal");
  };

  openModalHelper("confirmationModal");
}



  






let activeSettingsTab = null;

const settingsTabsConfig = [
  { label: "Accounts", targetPanelId: "settingsAccountsPanel" },
  { label: "Categories", targetPanelId: "settingsCategoriesPanel" },
  { label: "Budgets", targetPanelId: "settingsBudgetsPanel" },
  { label: "Data", targetPanelId: "settingsDataManagementPanel" },
  { label: "Appearance", targetPanelId: "settingsAppearancePanel" },
  { label: "Security", targetPanelId: "settingsSecurityPanel" }
];





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











document.addEventListener("click", (e) => {
  const toggleBtn = e.target.closest(".calc-toggle-btn");
  if (toggleBtn) {
    e.preventDefault();
    e.stopPropagation();
    const inputEl = toggleBtn.parentElement.querySelector(".calc-amount");
    if (inputEl) {
      if (mathToolbar.classList.contains("visible") && activeCalcInput === inputEl) {
        hideMathToolbar();
      } else {
        showMathToolbar(inputEl);
        inputEl.focus();
      }
    }
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

function handleMathToolbarInteraction(e) {
  e.preventDefault(); // Prevents input from losing focus
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
}

mathToolbar.addEventListener("mousedown", handleMathToolbarInteraction);
mathToolbar.addEventListener("touchstart", handleMathToolbarInteraction, { passive: false });

function triggerDataImport() {
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
  const dropSettingsBtn = $("#dropSettingsBtn");
  if (dropSettingsBtn) {
    dropSettingsBtn.onclick = () => {
      toggleDropdown();
      $("#settingsBtn")?.click();
    };
  }

  const dropMonthlyBtn = $("#dropMonthlyBtn");
  if (dropMonthlyBtn) {
    dropMonthlyBtn.onclick = () => {
      toggleDropdown();
      $("#monthlyViewBtn")?.click();
    };
  }

  const dropTransferBtn = $("#dropTransferBtn");
  if (dropTransferBtn) {
    dropTransferBtn.onclick = () => {
      toggleDropdown();
      $("#openTransferModalBtn")?.click();
    };
  }

  const dropBackupBtn = $("#dropBackupBtn");
  if (dropBackupBtn) {
    dropBackupBtn.onclick = () => {
      toggleDropdown();
      const target = $("#shortcutCloud")?.checked && !$("#shortcutCloud")?.disabled ? "cloud" : "local";
      if (target === "cloud") {
        if (typeof backupToSupabase === "function") backupToSupabase();
      } else {
        if (typeof exportData === "function") exportData();
      }
    };
  }

  const dropRestoreBtn = $("#dropRestoreBtn");
  if (dropRestoreBtn) {
    dropRestoreBtn.onclick = () => {
      toggleDropdown();
      const target = $("#shortcutCloud")?.checked && !$("#shortcutCloud")?.disabled ? "cloud" : "local";
      if (target === "cloud") {
        if (typeof restoreFromSupabase === "function") restoreFromSupabase(false, true);
      } else {
        const importInput = $("#importDataInput");
        if (importInput) importInput.click();
      }
    };
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


