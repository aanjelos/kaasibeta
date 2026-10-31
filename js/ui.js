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
    { key: "D", action: "Add a Debt." },
    { key: "Shift + D", action: "View All Debts." },
    { key: "R", action: "Add a Receivable." },
    { key: "Shift + R", action: "View All Receivables." },
    { key: "T", action: "Transfer Money." },
    { key: "Ctrl + S", action: "Sync Now (Signed In)." },
    { key: "Ctrl + E", action: "Export Local File." },
    { key: "Ctrl + I", action: "Import Local File." },
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
  if (isAppLocked()) {
    if ((event.ctrlKey || event.metaKey) && ["s", "e", "i"].includes(event.key.toLowerCase())) event.preventDefault();
    return;
  }
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
  if (settingsModalVisible && event.key !== 'Escape') {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='s') event.preventDefault();
    return;
  }
  const activeDialog=topVisibleModal();
  if(activeDialog && event.key!=='Escape' && !(activeDialog.id==='monthlyViewModal' && ['s','S','ArrowLeft','ArrowRight'].includes(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey)) {
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s')event.preventDefault();
    return;
  }

  // Dedicated actions are independent of the selected Dashboard button mode.
  if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
    const key = event.key.toLowerCase();
    if (["s", "e", "i"].includes(key)) {
      // Keep the browser's Save Page dialog from appearing on Ctrl+S.
      if (key === "s" || !inInputField) event.preventDefault();
      if (!inInputField && !event.repeat) {
        if (key === "s") syncCloudData();
        else if (key === "e") exportData();
        else triggerDataImport();
      }
      return;
    }
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
      const topDialog = topVisibleModal();
      if (topDialog && !['initialSetupModal','offlineSyncWarningModal'].includes(topDialog.id)) {
        const search = $('#monthlySearchInput');
        if (!(topDialog.id==='monthlyViewModal' && document.activeElement===search && search?.value)) {
          event.preventDefault();closeModal(topDialog.id);break;
        }
      }
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
          "formModal", "editBudgetModal", "settingsAddCategoryModal", "settingsAddBudgetModal", "subscriptionReminderModal", "upcomingPaymentsModal", "subscriptionsModal",
          "cloudSyncModal",
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
            if (modalId === "settingsModal" && typeof SettingsWorkspace !== "undefined") closeModal('settingsModal');
            else closeModal(modalId);
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
        if (!event.shiftKey) { $("#addDebtBtn")?.click(); break; }
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
        if (!event.shiftKey) { $("#addReceivableBtn")?.click(); break; }
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
          if (typeSelect.querySelector('option[value="transfer"]')?.disabled) {
            showNotification("At least two visible accounts are needed to make a transfer.", "warning");
            break;
          }
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

// Record IDs are data, never JavaScript source embedded in an HTML handler.
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-record-action]");
  if (!target || isAppLocked()) return;
  const actions = {
    editTransaction: openEditTransactionModal, deleteTransaction,
    editDebt: openEditDebtForm, payDebt: openPayDebtForm, deleteDebt,
    editReceivable: openEditReceivableForm, receivePayment: openReceivePaymentForm, deleteReceivable,
    editInstallment: openEditInstallmentForm, payInstallment: payInstallmentMonth, deleteInstallment,
    editCc: openEditCcTransactionModal, payCc: openPayCcItemForm, deleteCc: deleteCcTransaction,
    selectCc: (id) => window.toggleCcItemSelection?.(id),
    editBudget: openEditBudgetModal, deleteBudget
  };
  if (!Object.prototype.hasOwnProperty.call(actions, target.dataset.recordAction)) return;
  event.preventDefault();
  event.stopPropagation();
  actions[target.dataset.recordAction](target.dataset.recordId, event);
}, true);

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
      themeDarkBtn.setAttribute("aria-pressed", String(theme === "dark"));
      themeLightBtn.setAttribute("aria-pressed", String(theme === "light"));
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





async function toggleAccountVisibility(accountId) {
  const account = state.accounts.find((acc) => acc.id === accountId);
  if (!account) return;

  if (!account.hidden) {
    const visibleAccounts = state.accounts.filter((a) => !a.hidden);
    if (visibleAccounts.length <= 1) {
      showNotification("You must have at least one account visible.", "error");
      return;
    }
  }
  const performToggle = async () => {
    account.hidden = !account.hidden;
    await saveData();
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
    await performToggle(); // Hide if balance is zero or unhide without confirmation
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
  const denominations = [5000, 2000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];
  const gridContainer = form.querySelector(".grid");
  if (gridContainer.children.length > 3) { calculateCashTotal(); return; }
  while (gridContainer.children.length > 3)
    gridContainer.removeChild(gridContainer.lastChild);
  denominations.forEach((denom) => {
    const denomEl = document.createElement("span");
    denomEl.className = "cash-denomination";
    denomEl.textContent = denom.toLocaleString('en-US');
    const inputEl = document.createElement("input");
    inputEl.type = "number";
    inputEl.min = "0";
    inputEl.step = "1";
    inputEl.dataset.denom = denom;
    inputEl.className =
      "text-center bg-gray-600 border border-gray-500 rounded px-1 py-0.5 w-16 mx-auto text-sm";
    inputEl.placeholder = "0";
    inputEl.setAttribute("aria-label", `Number of Rs. ${denom} notes or coins`);
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
    totalEl.className = "cash-row-total";
    totalEl.id = `cashTotal-${denom}`;
    totalEl.textContent = '0.00';
    const stepper = document.createElement("div");
    stepper.className = "cash-stepper";
    for (const [delta, label, symbol] of [[-1, 'Decrease', '−'], [1, 'Increase', '+']]) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "cash-stepper-button";
      button.setAttribute("aria-label", `${label} Rs. ${denom} count`);
      const icon=document.createElement('i'); icon.className = delta < 0 ? 'fas fa-minus' : 'fas fa-plus'; icon.setAttribute('aria-hidden','true'); button.appendChild(icon);
      button.onclick = () => { inputEl.value = Math.max(0, (parseInt(inputEl.value, 10) || 0) + delta); calculateCashTotal(); };
      if (delta < 0) stepper.appendChild(button);
      else { stepper.appendChild(inputEl); stepper.appendChild(button); }
    }
    const row=document.createElement('div'); row.className='cash-counter-row';
    row.appendChild(denomEl); row.appendChild(stepper); row.appendChild(totalEl);
    gridContainer.appendChild(row);
  });
  calculateCashTotal();
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
      totalEl.textContent = total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
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

function resetCashCounts() {
  $$('#cashCounterForm input[data-denom]').forEach(input => { input.value = ''; input._scrollAccumulator = 0; });
  calculateCashTotal();
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

const modalFocusOrigins = new Map();
const mobileModalFocus = () => window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
function visibleModalControls(modal) {
  return [...modal.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, summary, [tabindex]')].filter(el => {
    if(el.disabled || el.tabIndex<0 || !el.getClientRects?.().length || el.closest('[hidden], .hidden, [inert]'))return false;
    for(let parent=el.parentElement;parent&&parent!==modal;parent=parent.parentElement)if(parent.style.maxHeight==='0px')return false;
    return true;
  });
}
function topVisibleModal() {
  return [...document.querySelectorAll('.modal')].filter(el => el.style.display === 'block').sort((a,b) => (Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).pop();
}
function sourceFloatingLayer(target) {
  const owner=target?.closest?.('.modal, #pinLockOverlay, #storageScreen');
  if (!target?.isConnected || !target.getClientRects().length || target.closest('[inert]') ||
      (isAppLocked() && owner?.id!=='pinLockOverlay' && owner?.id!=='securityQuestionModal')) return null;
  const top=topVisibleModal();
  if (top && top!==owner) return null;
  return owner ? (Number(getComputedStyle(owner).zIndex)||50)+1 : 45;
}
function dismissSourceFloatingUI() {
  mathToolbar.classList.remove('visible');activeCalcInput=null;
  const tooltip=document.getElementById('global-tooltip');
  tooltip?.classList.remove('visible');tooltip?.classList.add('hidden');
}
function focusModalStart(modal) {
  if (modal.style.display !== 'block') return;
  const container = modal.querySelector('.modal-content') || modal;
  container.setAttribute('tabindex', '-1');
  const field = !mobileModalFocus() && !['settingsModal','initialSetupModal','donateModal','shortcutsHelpModal','monthlyViewModal'].includes(modal.id) && visibleModalControls(modal).find(el => el.matches('input:not([type="checkbox"]):not([type="radio"]):not([readonly]), select, textarea'));
  (field || container).focus({preventScroll:true});
}
function restoreModalFocus(id) {
  const origin = modalFocusOrigins.get(id);
  modalFocusOrigins.delete(id);
  const top = topVisibleModal();
  if (origin?.isConnected && origin.getClientRects?.().length && (!top || top.contains(origin))) {
    // Returning to a text field must not reopen the phone keyboard.
    if (!mobileModalFocus() || !origin.matches('input,select,textarea')) origin.focus({preventScroll:true});
    else if (top) focusModalStart(top);
  } else if (top) focusModalStart(top);
}
document.addEventListener('keydown', event => {
  let modal = topVisibleModal();
  const menu=document.getElementById('mobileDropdown');
  if(!modal&&menu?.classList.contains('dropdown-open')) {
    modal=menu;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();document.getElementById('mobileMenuBtn').click();return;}
  }
  if (isAppLocked()) {
    const recovery=document.getElementById('securityQuestionModal');
    modal=recovery?.style.display==='block'?recovery:document.getElementById('pinLockOverlay');
    if(modal===recovery&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeModal(recovery.id);return;}
  }
  if(['Enter',' '].includes(event.key)&&event.target.matches?.('[role="button"]:not(button):not(input)')&&(!isAppLocked()||modal?.contains(event.target))){event.preventDefault();event.target.click();return;}
  if (!modal) return;
  const input = event.target.closest?.('.settings-category-row.is-editing input');
  if (input && ['Enter','Escape'].includes(event.key)) {
    event.preventDefault();event.stopImmediatePropagation();
    const row=input.closest('li');
    if(event.key==='Enter')renameCategory(row.querySelector('[aria-label="Save Rename"]'));
    else SettingsWorkspace.editCategory(row.querySelector('[aria-label="Cancel Rename"]'),false);
    return;
  }
  if (event.key==='Tab') {
    if (modal.id === 'settingsModal') {
      const panel = document.querySelector('#settingsTabContent > .settings-tab-panel:not(.hidden)');
      const firstControl = panel && visibleModalControls(panel)[0];
      const navigation = event.target.closest?.('#settingsTabsContainer button');
      if (!event.shiftKey && navigation && firstControl) {
        event.preventDefault(); firstControl.focus(); return;
      }
      if (event.shiftKey && event.target === firstControl) {
        const current = document.querySelector('#settingsTabsContainer button[aria-current="page"]');
        if (current?.getClientRects().length) { event.preventDefault(); current.focus(); return; }
      }
    }
    const controls=visibleModalControls(modal),first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();focusModalStart(modal);return;}
    if(event.shiftKey && (!modal.contains(document.activeElement)||document.activeElement===first||!controls.includes(document.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey && (!controls.includes(document.activeElement)||document.activeElement===last)){event.preventDefault();first.focus();}
  }
},true);

// Keep dynamically rebuilt lists operable without duplicating their click handlers.
function enhanceKeyboardControls() {
  const action = (el, label) => {
    if(!el)return;
    el.setAttribute('role','button');el.tabIndex=0;
    if(label)el.setAttribute('aria-label',label);
  };
  document.querySelectorAll('#recentTransactionsList .transaction-list-item-layout > div:first-child, .monthly-view-transaction-item:not(.cc-history-row) > div:first-child').forEach(el=>action(el,`View transaction: ${el.textContent.trim()}`));
  document.querySelectorAll('.monthly-view-day-header, #debtsViewModal .cursor-pointer, #receivablesViewModal .cursor-pointer').forEach(el=>{
    if(el.tagName==='BUTTON'||el.querySelector('button'))return;
    action(el);
    const panel=el.nextElementSibling;
    if(panel)el.setAttribute('aria-expanded',String(panel.style.maxHeight!=='0px'));
  });
  document.querySelectorAll('.cc-payment-history-main > .flex-grow').forEach(el=>action(el,`View purchase actions: ${el.textContent.trim()}`));
  document.querySelectorAll('.budget-progress-container').forEach(el=>action(el,'View budget transactions'));
  document.querySelectorAll('#mobileDropdown span[onclick]').forEach(el=>action(el));
  document.querySelectorAll('.day-transactions-container, .cc-history-row > .overflow-hidden').forEach(panel=>{panel.inert=panel.style.maxHeight==='0px';});
  document.querySelectorAll('.calc-toggle-btn').forEach(el=>{el.tabIndex=-1;if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label','Toggle Calculator');});
  document.querySelectorAll('button[data-tooltip]').forEach(el=>{if(!el.textContent.trim()||!/[a-z0-9]/i.test(el.textContent)){if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',el.dataset.tooltip);}});
}
enhanceKeyboardControls();
document.addEventListener('click',()=>requestAnimationFrame(enhanceKeyboardControls));
let keyboardRefreshPending=false;
if(typeof MutationObserver!=='undefined')new MutationObserver(()=>{
  if(keyboardRefreshPending)return;keyboardRefreshPending=true;
  requestAnimationFrame(()=>{keyboardRefreshPending=false;enhanceKeyboardControls();});
}).observe(document.body,{childList:true,subtree:true});

function openModalHelper(modalId) {
  const modal = $(`#${modalId}`);
  if (modal && modal.style.display !== "block") {
    dismissSourceFloatingUI();
    modalFocusOrigins.set(modalId, document.activeElement);
    modal.style.display = "block";
    updateBodyScrollState();
    
    let currentOpenModals = [];
    if (history.state && history.state.openModals) {
      currentOpenModals = [...history.state.openModals];
    }
    currentOpenModals.push(modalId);
    
    history.pushState({ ...history.state, modalOpen: true, modalId, openModals: currentOpenModals,
      ...(modalId === "settingsModal" ? { settingsSection: null, settingsDepth: 0 } : {}) }, null, "");

    setTimeout(() => {
      if (topVisibleModal() === modal && !modal.contains(document.activeElement)) focusModalStart(modal);
    }, 50);
  }
}

window.addEventListener("popstate", (event) => {
  const modalsToClose = [
    "milestonesModal", "confirmationModal", "formModal", "subscriptionReminderModal", "upcomingPaymentsModal", "subscriptionsModal", "transactionDetailModal", "ccTransactionDetailModal", "ccHistoryModal", "cashCounterModal",
    "debtsViewModal", "receivablesViewModal", "transferMoneyModal",
    "monthlyViewModal", "settingsModal", "settingsAddCategoryModal", "settingsAddBudgetModal", "cloudSyncModal", "donateModal", "shortcutsHelpModal", "securityQuestionModal", "initialSetupModal", "editBudgetModal"
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
          $("#dynamicForm").oninput = null;
        }
        if (id === "settingsModal") { cancelDeleteAllData(); finishSettingsCloudSyncBatch(); }
        if (id === "ccHistoryModal") document.body.renderCcHistoryList = null;
        restoreModalFocus(id);
      }
    }
  });
  if (typeof SettingsWorkspace !== "undefined") SettingsWorkspace.restore(event.state);
  updateBodyScrollState();
});

function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  const wasOpen = modal?.style.display === "block";
  if (modalId === "settingsModal" && typeof SettingsWorkspace !== "undefined") {
    SettingsWorkspace.stopMotion?.();
    SettingsWorkspace.releaseSubscriptions();
    const depth = history.state?.settingsDepth || 0;
    const stack = history.state?.openModals || [];
    const index = stack.indexOf("settingsModal");
    if (wasOpen && index >= 0) {
      // Imports/reset can close Settings while a confirmation is above it.
      // Remove that whole branch, then let callers open the next screen safely.
      stack.slice(index).forEach(id => { const item = $(`#${id}`); if (item) item.style.display = "none"; });
      finishSettingsCloudSyncBatch();
      if (stack.includes("formModal")) {
        $("#dynamicForm").innerHTML = "";
        $("#dynamicForm").onsubmit = null;
        $("#dynamicForm").oninput = null;
      }
      cancelDeleteAllData();
      updateBodyScrollState();
      return new Promise(resolve => {
        window.addEventListener("popstate", () => { restoreModalFocus('settingsModal'); resolve(); }, { once: true });
        history.go(-(depth + stack.length - index));
      });
    }
  }
  if (modal) {
    modal.style.display = "none";
    updateBodyScrollState();
  }
  if (modalId === "formModal") {
    $("#dynamicForm").innerHTML = "";
    $("#dynamicForm").onsubmit = null;
    $("#dynamicForm").oninput = null;
  }
  if (modalId === "settingsModal") { cancelDeleteAllData(); if (wasOpen) finishSettingsCloudSyncBatch(); }
  if (modalId === "ccHistoryModal") {
    document.body.renderCcHistoryList = null; // Cleanup
  }
  
  // Clean up history state if closed manually
  if (wasOpen && history.state && history.state.modalOpen) {
    history.back();
  }
  if (wasOpen) restoreModalFocus(modalId);
}

function openFormModal(title, formHtml, submitHandler) {
  const modalTitleEl = $("#formModalTitle");
  if (modalTitleEl) {
    modalTitleEl.textContent = title;
    // Add the class to handle long titles from any form modal
    modalTitleEl.classList.add("force-word-wrap");
  }

  const form = $("#dynamicForm");
  form.oninput = null;
  form.innerHTML = formHtml;
  form.onsubmit = submitHandler;
  openModalHelper("formModal");
  focusModalStart(document.getElementById('formModal'));
}

let modalPointerDownTarget = null;
let modalPointerUpTarget = null;
window.addEventListener("pointerdown", event => { modalPointerDownTarget = event.target; modalPointerUpTarget = null; }, true);
window.addEventListener("pointerup", event => { modalPointerUpTarget = event.target; }, true);
window.addEventListener("pointercancel", () => { modalPointerDownTarget = null; modalPointerUpTarget = null; }, true);

function isModalBackdropClick(event, modal) {
  return event.target === modal && (event.detail === 0 ||
    (modalPointerDownTarget === modal && modalPointerUpTarget === modal));
}

window.addEventListener("click", (event) => {
  $$(".modal").forEach((modal) => {
    if (isModalBackdropClick(event, modal) && modal.id !== "initialSetupModal" && modal.id !== "cloudSessionExpiredModal") {
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

  newConfirmBtn.onclick = async () => {
    let handled = false;
    if (typeof currentConfirmCallback === "function") {
      newConfirmBtn.disabled = true;
      try { handled = await currentConfirmCallback(); }
      catch (error) { if (!error.kaasiSaveFailure) showNotification(error.message, "error"); return; }
      finally { newConfirmBtn.disabled = false; }
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
  { label: "Accounts", targetPanelId: "settingsAccountsPanel", group: "Money", icon: "wallet", hint: "Balances, transfer fees & credit card", description: "Manage your balances and payment preferences." },
  { label: "Categories", targetPanelId: "settingsCategoriesPanel", group: "Money", icon: "tags", hint: "Organize expenses & hidden categories", description: "Manage categories and how hidden categories are used." },
  { label: "Budgets", targetPanelId: "settingsBudgetsPanel", group: "Money", icon: "chart-pie", hint: "Monthly limits & budget sorting", description: "Set spending limits and organize your budgets." },
  { label: "Subscriptions", targetPanelId: "settingsSubscriptionsPanel", group: "Money", icon: "calendar-check", hint: "Active subscriptions & paused renewals", description: "Manage your recurring payments and reminders." },
  { label: "Appearance", targetPanelId: "settingsAppearancePanel", group: "App", icon: "palette", hint: "Theme, calculator & dashboard", description: "Choose your theme and what appears on the dashboard." },
  { label: "Data & Backups", targetPanelId: "settingsDataManagementPanel", group: "App", icon: "cloud", hint: "Sync, files, storage & reminders", description: "Manage backups and saved data on this device." },
  { label: "Security", targetPanelId: "settingsSecurityPanel", group: "App", icon: "shield-alt", hint: "PIN lock & security question", description: "Manage your app PIN and security question." },
  { label: "About & Support", targetPanelId: "settingsAboutPanel", group: "Information", icon: "info-circle", hint: "About Kaasi & getting in touch", description: "About Kaasi and how to get in touch." },
  { label: "Donate", targetPanelId: "settingsDonatePanel", group: "Information", icon: "heart", hint: "Support Kaasi's development", description: "Help keep Kaasi free and in active development." },
  { label: "Milestones", targetPanelId: "settingsMilestonesPanel", group: "Extras", icon: "award", hint: "Celebrate your progress", description: "Small steps worth celebrating. Everyone's journey is different." },
  { label: "Cash Counter", targetPanelId: "settingsCashCounterPanel", group: "Extras", icon: "money-bill-wave", hint: "Count your notes and coins", description: "Count your cash and compare it with your saved balance." }
];





let monthlySearchDebounceTimer; // Timer for debouncing search input


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
  if ((e.key === "Enter" || e.key === "Tab") && e.target.classList && e.target.classList.contains("calc-amount")) {
    const calculated = processCalculation(e.target);
    if (calculated && e.key === "Enter") {
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

// Mobile keyboards and pinch zoom can resize/move the visible viewport alone.
if (window.visualViewport) {
  const repositionCalculator = () => {
    if (activeCalcInput && mathToolbar.classList.contains("visible")) positionMathToolbar(activeCalcInput);
  };
  window.visualViewport.addEventListener("resize", repositionCalculator);
  window.visualViewport.addEventListener("scroll", repositionCalculator);
}

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
        ).find((btn) => btn.dataset.tabTarget === "#settingsDataManagementPanel");
        if (dataTabButton) dataTabButton.click();
        importInput.click();
      }, 100);
    } else if (settingsModal) {
      const dataTabButton = Array.from(
        $$("#settingsTabsContainer button")
      ).find((btn) => btn.dataset.tabTarget === "#settingsDataManagementPanel");
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
  mobileMenuBtn.setAttribute('aria-controls','mobileDropdown');
  mobileMenuBtn.setAttribute('aria-expanded','false');

  const toggleDropdown = () => {
    isOpen = !isOpen;
    mobileMenuBtn.setAttribute('aria-expanded',String(isOpen));
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
      mobileDropdown.classList.remove("opacity-0", "invisible");
      mobileDropdown.classList.add("opacity-100", "visible", "dropdown-open");
      mobileMenuOverlay.classList.remove("opacity-0", "invisible");
      mobileMenuOverlay.classList.add("opacity-100", "visible", "pointer-events-auto");
      mobileMenuIcon.classList.remove("fa-bars");
      mobileMenuIcon.classList.add("fa-times");
      mobileDropdown.querySelector('button:not([disabled])')?.focus({preventScroll:true});
    } else {
      document.body.classList.remove("overflow-hidden");
      mobileDropdown.classList.remove("opacity-100", "visible", "dropdown-open");
      mobileDropdown.classList.add("opacity-0", "invisible");
      mobileMenuOverlay.classList.remove("opacity-100", "visible", "pointer-events-auto");
      mobileMenuOverlay.classList.add("opacity-0", "invisible");
      mobileMenuIcon.classList.remove("fa-times");
      mobileMenuIcon.classList.add("fa-bars");
      mobileMenuBtn.focus({preventScroll:true});
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


// Add optional breaks after thousands separators without changing textContent.
// Keep this in the DOM presentation layer: JSON, inputs and exports stay plain text.
document.addEventListener("DOMContentLoaded", () => {
  const pending = new Set();
  let scheduled = false;
  const excluded = "script, style, textarea, input, select, option, [contenteditable], .currency-wrap";
  const formatText = node => {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    const text = node.nodeValue;
    const pattern = /[+-]?LKR[\s\u00a0]+-?\d{1,3}(?:,\d{3})+(?:\.\d{2})?/g;
    const matches = Array.from(text.matchAll(pattern));
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let position = 0;
    matches.forEach(match => {
      fragment.append(document.createTextNode(text.slice(position, match.index)));
      const amount = document.createElement("span");
      amount.className = "currency-wrap";
      const groups = match[0].split(",");
      groups.forEach((group, index) => {
        const chunk = document.createElement("span");
        chunk.className = "currency-digit-group";
        chunk.textContent = group + (index < groups.length - 1 ? "," : "");
        amount.append(chunk);
        if (index < groups.length - 1) amount.append(document.createElement("wbr"));
      });
      fragment.append(amount);
      position = match.index + match[0].length;
    });
    fragment.append(document.createTextNode(text.slice(position)));
    node.replaceWith(fragment);
  };
  const observer = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === "characterData") pending.add(record.target);
      else record.addedNodes.forEach(node => pending.add(node));
    });
    queue();
  });
  const options = { childList: true, subtree: true, characterData: true };
  function queue() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      observer.disconnect();
      pending.forEach(root => {
        if (!root.isConnected) return;
        if (root.nodeType === Node.TEXT_NODE) formatText(root);
        else {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          const texts = [];
          while (walker.nextNode()) texts.push(walker.currentNode);
          texts.forEach(formatText);
        }
      });
      pending.clear();
      observer.observe(document.body, options);
    });
  }
  pending.add(document.body);
  observer.observe(document.body, options);
  queue();
});

// Fit complete monetary values after animated updates and container resizing.
document.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("balanceOverviewCard");
  if (!card) return;
  let pending = false;
  const fit = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      card.querySelectorAll("#totalBalance, #totalPotentialBalance, .balance-val, .overview-stat strong").forEach(el => {
        if (!el.clientWidth) return;
        el.style.removeProperty("font-size");
        el.style.removeProperty("white-space");
        el.style.removeProperty("overflow-wrap");
        // Measure a single line, including the display-only comma groups.
        // Otherwise their legal wrapping hides the overflow before fitting runs.
        el.classList.add("fit-currency-line");
        const base = Number.parseFloat(getComputedStyle(el).fontSize);
        if (el.scrollWidth > el.clientWidth) {
          el.style.fontSize = `${Math.max(12, base * el.clientWidth / el.scrollWidth * 0.97)}px`;
          if (el.scrollWidth > el.clientWidth) {
            el.classList.remove("fit-currency-line");
            el.style.whiteSpace = "normal";
            el.style.overflowWrap = "anywhere";
          }
        }
      });
    });
  };
  new MutationObserver(fit).observe(card, { childList: true, subtree: true, characterData: true });
  new ResizeObserver(fit).observe(card);
  document.fonts?.ready.then(fit);
  fit();
});

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


