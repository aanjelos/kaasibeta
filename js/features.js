/**
 * features.js
 * Implements core application features and DOM rendering logic for transactions, debts, receivables, etc.
 */
// --- Shared Helper Functions ---
function populateYearSelector(transactionsArray, yearSelectorElement, currentYear, selectedYear) {
  const years = new Set(
    (transactionsArray || []).map((t) => {
      const d = new Date(t.date);
      return isNaN(d.getFullYear()) ? currentYear : d.getFullYear();
    })
  );
  years.add(currentYear);
  yearSelectorElement.innerHTML = "";
  [...years]
    .sort((a, b) => b - a)
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      if (year === selectedYear) option.selected = true;
      yearSelectorElement.appendChild(option);
    });
}

function setupMaxMonthsValidation(totalMonthsInput, monthsLeftInput) {
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

function processPaymentDeduction(account, roundedPaymentAmount, logAsExpense, category) {
  if (logAsExpense && !category) {
    showNotification(
      "Please select a category for this payment if logging as an expense.",
      "error"
    );
    return false;
  }
  if (account.balance < roundedPaymentAmount) {
    showNotification(`Insufficient funds in ${account.name}.`, "warning");
    return false;
  }
  account.balance = roundToTwoDecimals(account.balance - roundedPaymentAmount);
  if (isNaN(account.balance)) account.balance = 0;
  return true;
}

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

  const recent = [...state.transactions]
    .sort(
      (a, b) =>
        new Date(b.date).setHours(0, 0, 0, 0) -
          new Date(a.date).setHours(0, 0, 0, 0) || b.timestamp - a.timestamp
    )
    .slice(0, 10);

  if (recent.length === 0) {
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-8 text-gray-500"><i class="fas fa-receipt text-3xl mb-3 opacity-40"></i><p class="text-sm font-medium">No transactions yet</p></div>';
    return;
  }

  list.innerHTML = "";

  recent.forEach((t) => {
    const div = document.createElement("div");
    div.dataset.id = t.id;
    div.className = `transaction-list-item-layout flex justify-between items-center rounded-lg bg-gray-700/50 text-sm transition-all duration-200 hover:bg-gray-700/70 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group`;
    
    div.onclick = () => openTransactionDetailModal(t.id);

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
      subDetailText += ` | ${escapeHTML(t.category)}`;
    } else if (!isIncome && !t.category) {
      subDetailText += ` | Uncategorized`;
    }

    div.innerHTML = `
      <div class="flex-grow mr-2 overflow-hidden">
        <p class="font-medium truncate ${textColorClass}">${escapeHTML(t.description)}</p>
        <p class="text-xs text-gray-400">${subDetailText}</p>
      </div>
      <span class="font-semibold whitespace-nowrap ${textColorClass} tabular-nums">${isIncome ? "+" : "-"}${formatCurrency(t.amount)}</span>
      <div class="edit-btn-container flex-shrink-0 hidden md:flex">
        <button class="text-xs accent-text hover:text-accent-hover focus:outline-none" onclick="openEditTransactionModal('${t.id}', event)" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
        <button class="text-xs text-gray-500 hover:text-expense focus:outline-none" onclick="deleteTransaction('${t.id}',event)" data-tooltip="Delete"><i class="fas fa-times"></i></button>
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
      '<div class="flex flex-col items-center justify-center py-8 text-gray-500"><i class="fas fa-handshake text-4xl mb-3 opacity-40"></i><p class="text-sm font-medium">No debts recorded</p></div>';
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
      "flex flex-col sm:flex-row sm:justify-between sm:items-center items-start p-3 cursor-pointer hover:bg-gray-600/50 transition-colors gap-2 sm:gap-0";
    creditorHeader.style.backgroundColor = "var(--bg-tertiary)";

    creditorHeader.innerHTML = ` 
      <h4 class="text-md font-semibold text-gray-100 force-word-wrap">${escapeHTML(creditorName)}</h4>
      <div class="flex items-center flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
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
          const absDays = Math.abs(daysLeft);
          daysText = `Overdue by ${absDays} day${absDays === 1 ? '' : 's'}`;
          daysColor = "text-expense font-medium";
        } else if (daysLeft === 0) {
          daysText = `Due Today`;
          daysColor = "text-warning font-medium";
        } else {
          daysText = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
          daysColor = "text-gray-300";
        }

        const origAmt = d.originalAmount || d.amount || d.remainingAmount;
        const percentagePaid = origAmt > 0 ? ((origAmt - d.remainingAmount) / origAmt) * 100 : 0;
        let progressBarHtml = "";
        if (percentagePaid > 0) {
          progressBarHtml = `
            <div class="w-full bg-gray-700 rounded-full h-1.5 mt-2 mb-1" data-tooltip="${percentagePaid.toFixed(1)}% Paid">
              <div class="bg-income h-1.5 rounded-full transition-all duration-500" style="width: ${percentagePaid}%"></div>
            </div>
          `;
        }

        const itemDiv = document.createElement("div");
        itemDiv.className =
          "transaction-list-item-layout text-sm border-b border-gray-700 last:border-b-0";
        itemDiv.innerHTML = `
          <div class="flex justify-between items-start mb-1 gap-x-2">
            <div class="flex-grow">
              <p class="font-medium text-gray-200 force-word-wrap">${escapeHTML(d.why)}</p>
              <p class="text-xs ${daysColor}">${daysText}</p>
            </div>
            <span class="font-semibold text-expense whitespace-nowrap tabular-nums">${formatCurrency(
              d.remainingAmount
            )}</span>
          </div>
          ${progressBarHtml}
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
              }')" data-tooltip="Delete"><i class="fas fa-times"></i></button>
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
      '<div class="flex flex-col items-center justify-center py-8 text-gray-500"><i class="fas fa-hand-holding-usd text-4xl mb-3 opacity-40"></i><p class="text-sm font-medium">No receivables recorded</p></div>';
    return;
  }

  const renderGroupInModal = (title, receivablesForGroup) => {
    const sectionWrapper = document.createElement("div");
    sectionWrapper.className = "mb-6";
    const sectionTitleHeader = document.createElement("div");
    sectionTitleHeader.className =
      "flex flex-col sm:flex-row sm:justify-between sm:items-end items-start border-b border-gray-500 pb-2 mb-3 gap-1";
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
        "flex flex-col sm:flex-row sm:justify-between sm:items-center items-start p-3 cursor-pointer hover:bg-gray-600/50 transition-colors gap-2 sm:gap-0";
      personHeader.style.backgroundColor = "var(--bg-tertiary)";
      personHeader.innerHTML = `
          <h4 class="text-md font-semibold text-gray-100 force-word-wrap">${escapeHTML(personName)}</h4>
          <div class="flex items-center flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
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
          const origAmt = r.originalAmount || r.amount || r.remainingAmount;
          const percentagePaid = origAmt > 0 ? ((origAmt - r.remainingAmount) / origAmt) * 100 : 0;
          let progressBarHtml = "";
          if (percentagePaid > 0) {
            progressBarHtml = `
              <div class="w-full bg-gray-700 rounded-full h-1.5 mt-2 mb-1" data-tooltip="${percentagePaid.toFixed(1)}% Received">
                <div class="bg-income h-1.5 rounded-full transition-all duration-500" style="width: ${percentagePaid}%"></div>
              </div>
            `;
          }

          const itemDiv = document.createElement("div");
          itemDiv.className =
            "transaction-list-item-layout text-sm border-b border-gray-700 last:border-b-0";
          itemDiv.innerHTML = `
          <div class="flex justify-between items-start mb-1 gap-x-2">
            <div class="flex-grow">
              <p class="font-medium text-gray-200 force-word-wrap">${escapeHTML(r.why)}</p>
              <p class="text-xs text-gray-400">${srcTxt}</p>
            </div>
            <span class="font-semibold text-income whitespace-nowrap tabular-nums">${formatCurrency(
              r.remainingAmount
            )}</span>
          </div>
          ${progressBarHtml}
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
              }')" data-tooltip="Delete"><i class="fas fa-times"></i></button>
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
    list.innerHTML = '<div class="flex flex-col items-center justify-center py-8 text-gray-500"><i class="fas fa-calendar-check text-4xl mb-3 opacity-40"></i><p class="text-sm font-medium">No installments recorded</p></div>';
    return;
  }

  sortedInstallments.forEach((i) => {
    const endDate = new Date(i.startDate);
    endDate.setMonth(endDate.getMonth() + i.totalMonths);
    const daysLeft = getDaysLeft(endDate);
    let daysLeftText =
      daysLeft < 0
        ? `<span class="text-gray-500">Finished</span>`
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
    const totalLeftToPay = i.monthlyAmount * i.monthsLeft;
    const progressPercent =
      i.totalMonths > 0
        ? ((i.totalMonths - i.monthsLeft) / i.totalMonths) * 100
        : 0;

    const div = document.createElement("div");
    div.className = "transaction-list-item-layout rounded-lg bg-gray-700/50 text-sm mb-2 transition-all duration-200 hover:bg-gray-700/70 hover:-translate-y-0.5 hover:shadow-md cursor-pointer";

    const ringHtml = `
      <div class="installment-progress-ring-container w-10 h-10 flex-shrink-0" data-tooltip="${progressPercent.toFixed(
        0
      )}% Paid (${i.monthsLeft} months left)">
          <svg class="w-full h-full" viewBox="0 0 36 36">
              <path class="progress-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-width="3"></path>
              <path class="progress-ring-circle" stroke-dasharray="${progressPercent.toFixed(
                2
              )}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke-linecap="round" stroke-width="3"></path>
              <text x="50%" y="50%" dominant-baseline="central" class="progress-ring-text" text-anchor="middle" fill="var(--text-primary)">${
                i.monthsLeft
              }</text>
          </svg>
      </div>
    `;

    const buttonsHtml = `
        <div class="edit-btn-container flex items-center justify-end gap-x-4">
            ${
              i.monthsLeft > 0
                ? `
                <button class="text-sm text-income hover:opacity-80 focus:outline-none transition-opacity" onclick="payInstallmentMonth('${i.id}')" data-tooltip="Pay Installment"><i class="fas fa-credit-card"></i></button>
                <button class="text-sm text-gray-400 hover:text-gray-200 focus:outline-none transition-colors" onclick="openEditInstallmentForm('${i.id}')" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
              `
                : `
                <button class="text-sm text-gray-400 hover:text-gray-200 focus:outline-none transition-colors" onclick="openEditInstallmentForm('${i.id}')" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
              `
            }
            <button class="text-sm text-gray-500 hover:text-expense focus:outline-none transition-colors" onclick="deleteInstallment('${
              i.id
            }')" data-tooltip="Delete"><i class="fas fa-times"></i></button>
        </div>
    `;

    div.innerHTML = `
      <!-- DESKTOP VIEW (v5.129k Baseline, completely untouched) -->
      <div class="hidden md:flex items-center gap-x-3 w-full">
          ${ringHtml}
          <div class="flex-grow flex justify-between items-start ml-2 min-w-0">
              <div class="flex flex-col min-w-0 pr-2">
                  <p class="text-sm md:text-base font-medium truncate mb-0.5">${escapeHTML(i.description)}</p>
                  <p class="text-[11px] md:text-xs text-gray-400 mb-1.5 tabular-nums truncate">${formatCurrency(i.monthlyAmount)} / month</p>
                  <p class="text-[11px] md:text-xs text-gray-500 truncate tabular-nums">${i.monthsLeft} of ${i.totalMonths} months left (${daysLeftText})</p>
              </div>
              <div class="flex flex-col items-end flex-shrink-0">
                  <span class="text-xs md:text-sm font-semibold text-gray-200 mb-2.5 whitespace-nowrap tabular-nums">${formatCurrency(totalLeftToPay)} Left</span>
                  ${buttonsHtml}
              </div>
          </div>
      </div>

      <!-- MOBILE VIEW (Footer Layout) -->
      <div class="flex md:hidden flex-col w-full">
          <div class="flex items-center gap-x-3 w-full">
              ${ringHtml}
              <div class="flex flex-col min-w-0 flex-grow">
                  <p class="text-sm font-medium truncate mb-0.5">${escapeHTML(i.description)}</p>
                  <p class="text-[11px] text-gray-400 mb-1.5 tabular-nums truncate">${formatCurrency(i.monthlyAmount)} / month</p>
                  <p class="text-[11px] text-gray-500 truncate tabular-nums">${i.monthsLeft} of ${i.totalMonths} months left (${daysLeftText})</p>
              </div>
          </div>
          <div class="flex flex-row justify-between items-center w-full border-t border-gray-600 pt-3 mt-3">
              <span class="text-xs font-semibold text-gray-200 whitespace-nowrap tabular-nums">${formatCurrency(totalLeftToPay)} Left</span>
              ${buttonsHtml}
          </div>
      </div>
    `;
    list.appendChild(div);
  });
}

let monthlyOverviewChartInstance = null;



function handleTransactionSubmit(event) {
  event.preventDefault();
  const form = event.target,
    formData = new FormData(form);
  const type = formData.get("transactionType");
  const amount = parseFloat(String(formData.get("amount")).replace(/,/g, ''));
  const description = formData.get("description").trim();
  const date = formData.get("date");

  if (type === "transfer") {
    const fromAccountId = formData.get("transferFrom");
    const toAccountId = formData.get("transferTo");
    const feeRaw = formData.get("transferFee");
    const fee = feeRaw ? parseFloat(String(feeRaw).replace(/,/g, '')) : 0;
    const feeCategory = formData.get("category");

    if (isNaN(amount) || amount <= 0) {
      showNotification("Valid amount required.", "error");
      return;
    }
    if (!fromAccountId || !toAccountId) {
      showNotification("From and To accounts required.", "error");
      return;
    }
    if (fromAccountId === toAccountId) {
      showNotification("From and To accounts cannot be the same.", "error");
      return;
    }
    if (isNaN(fee) || fee < 0) {
      showNotification("Invalid transfer fee.", "error");
      return;
    }
    if (!date) {
      showNotification("Date required.", "error");
      return;
    }

    const fromAccount = state.accounts.find((acc) => acc.id === fromAccountId);
    const toAccount = state.accounts.find((acc) => acc.id === toAccountId);
    if (!fromAccount || !toAccount) {
      showNotification("Account not found.", "error");
      return;
    }

    if (fromAccount.balance < amount + fee) {
      showNotification(
        `Insufficient funds in ${fromAccount.name}. Transfer still added.`,
        "warning"
      );
    }

    // Update balances
    fromAccount.balance = roundToTwoDecimals(fromAccount.balance - amount - fee);
    toAccount.balance = roundToTwoDecimals(toAccount.balance + amount);
    if (isNaN(fromAccount.balance)) fromAccount.balance = 0;
    if (isNaN(toAccount.balance)) toAccount.balance = 0;

    // Log fee if > 0
    if (fee > 0) {
      const timestamp = Date.now();
      const feeTransaction = {
        id: generateId(),
        type: "expense",
        amount: roundToTwoDecimals(fee),
        account: fromAccountId,
        category: feeCategory || "Bank Charges",
        description: description || "Bank Transfer Fee",
        date: date,
        timestamp: timestamp
      };
      state.transactions.push(feeTransaction);
    }

    showNotification("Transfer successful.", "success");
    if (typeof trackEvent === "function") trackEvent("add_transfer", "Engagement");

    saveData();
    renderDashboard();
    populateDropdowns();
    form.reset();
    const ts = $("#transactionType");
    if (ts) {
      ts.value = "expense";
      ts.dispatchEvent(new Event("change"));
    }
    return;
  }

  // Normal Income / Expense logic
  const accountId = formData.get("account");
  const category = type === "expense" ? formData.get("category") : null;

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
    amount: roundToTwoDecimals(amount),
    account: accountId,
    category,
    description,
    date,
    timestamp,
  };
  state.transactions.push(newTransaction);

  if (type === "income") {
    account.balance = roundToTwoDecimals(account.balance + newTransaction.amount);
  } else {
    account.balance = roundToTwoDecimals(account.balance - newTransaction.amount);
  }
  if (isNaN(account.balance)) account.balance = 0;

  showNotification(
    `${type.charAt(0).toUpperCase() + type.slice(1)} added.`,
    "success"
  );
  if (typeof trackEvent === "function") trackEvent(`add_${type}`, "Engagement");

  saveData();
  renderDashboard();
  populateDropdowns();
  form.reset();

  const ts = $("#transactionType");
  if (ts) {
    ts.value = "expense";
    ts.dispatchEvent(new Event("change"));
  }

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

function openTransactionDetailModal(transactionId, skipHistory = false) {
  const transaction = state.transactions.find((tx) => tx.id === transactionId);
  if (!transaction) return;

  const account = state.accounts.find((a) => a.id === transaction.account);
  const accountName = account ? account.name : "Unknown Acct";
  const isIncome = transaction.type === "income";
  const textColorClass = isIncome ? "text-income" : "text-expense";
  
  let categoryHtml = "";
  if (transaction.type === "expense") {
    categoryHtml = `
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-gray-400">Category</span>
        <span class="font-medium">${transaction.category || "Uncategorized"}</span>
      </div>`;
  }

  const html = `
    <div class="text-center mb-4">
      <div class="text-3xl font-bold ${textColorClass} tabular-nums mb-1">${isIncome ? "+" : "-"}${formatCurrency(transaction.amount)}</div>
      <div class="text-sm text-gray-400 mb-3">${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</div>
      <div class="text-lg font-semibold text-gray-50 px-2" style="text-wrap: balance;">${transaction.description}</div>
    </div>
    
    <div class="bg-gray-700/30 rounded-lg p-4 space-y-2 mb-6">
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-gray-400">Date</span>
        <span class="font-medium">${new Date(transaction.date).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-gray-400">Account</span>
        <span class="font-medium">${accountName}</span>
      </div>
      ${categoryHtml}
    </div>
    
    <div class="flex gap-3 mt-4">
      <button class="btn btn-secondary flex-1" onclick="openEditTransactionModal('${transaction.id}', null)">
        <i class="fas fa-edit mr-2"></i> Edit
      </button>
      <button class="btn btn-danger flex-1" onclick="deleteTransaction('${transaction.id}', null)">
        <i class="fas fa-trash mr-2"></i> Delete
      </button>
    </div>
  `;

  const contentContainer = $("#transactionDetailContent");
  if (contentContainer) {
    contentContainer.innerHTML = html;
    if (skipHistory) {
      const modal = $("#transactionDetailModal");
      if (modal) modal.style.display = "block";
    } else {
      openModalHelper("transactionDetailModal");
    }
  }
}

function openCcTransactionDetailModal(transactionId, skipHistory = false) {
  const transaction = state.creditCard.transactions.find((tx) => tx.id === transactionId);
  if (!transaction) return;

  const remainingOnItem = transaction.amount - (transaction.paidAmount || 0);
  const isSelectable = !transaction.paidOff && remainingOnItem > 0.005;

  let statusBadge = "";
  if (transaction.paidOff || remainingOnItem <= 0.005) {
    statusBadge = `<span class="bg-green-500/20 text-income text-xs font-semibold px-2 py-1 rounded">Settled</span>`;
  } else if (transaction.paidAmount > 0) {
    statusBadge = `<span class="bg-orange-500/20 text-orange-400 text-xs font-semibold px-2 py-1 rounded">Partially Paid (${formatCurrency(transaction.paidAmount)})</span>`;
  } else {
    statusBadge = `<span class="bg-red-500/20 text-expense text-xs font-semibold px-2 py-1 rounded">Unpaid</span>`;
  }

  let payButtonHtml = "";
  if (isSelectable) {
    payButtonHtml = `<button class="btn btn-primary flex-1 py-2.5" onclick="openPayCcItemForm('${transaction.id}')"><i class="fas fa-credit-card mr-1"></i> Pay</button>`;
  }

  const html = `
    <div class="text-center mb-4">
      <div class="text-3xl font-bold ${transaction.paidOff ? "text-gray-500" : "text-gray-200"} tabular-nums mb-1">${formatCurrency(transaction.amount)}</div>
      <div class="mb-3">${statusBadge}</div>
      <div class="text-lg font-semibold text-gray-50 px-2" style="text-wrap: balance;">${escapeHTML(transaction.description)}</div>
    </div>
    
    <div class="bg-gray-700/30 rounded-lg p-4 space-y-2 mb-6">
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-gray-400">Date</span>
        <span class="font-medium">${new Date(transaction.date).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-gray-400">Paid So Far</span>
        <span class="font-medium text-gray-300">${formatCurrency(transaction.paidAmount || 0)}</span>
      </div>
      <div class="flex justify-between items-center py-2 border-b border-gray-700/50">
        <span class="text-gray-400">Remaining</span>
        <span class="font-medium ${remainingOnItem > 0.005 ? "text-expense" : "text-gray-300"}">${formatCurrency(remainingOnItem)}</span>
      </div>
    </div>
    
    <div class="flex flex-col sm:flex-row gap-3 mt-4">
      ${payButtonHtml}
      <div class="flex gap-3 flex-1 w-full">
        <button class="btn btn-secondary flex-1 py-2.5" onclick="openEditCcTransactionModal('${transaction.id}')">
          <i class="fas fa-edit mr-2"></i> Edit
        </button>
        <button class="btn btn-secondary flex-1 py-2.5 hover:!text-expense hover:!border-expense" onclick="deleteCcTransaction('${transaction.id}')">
          <i class="fas fa-trash mr-2"></i> Delete
        </button>
      </div>
    </div>
  `;

  const contentContainer = $("#ccTransactionDetailContent");
  if (contentContainer) {
    contentContainer.innerHTML = html;
    if (skipHistory) {
      const modal = $("#ccTransactionDetailModal");
      if (modal) modal.style.display = "block";
    } else {
      openModalHelper("ccTransactionDetailModal");
    }
  }
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
                <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="modalAmount" name="amount" value="${transaction.amount.toFixed(
                  2
                )}" step="0.01" min="0" placeholder="e.g., 1500.50" required><button type="button" class="calc-toggle-btn absolute right-4 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
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
  const newAmount = parseFloat(String(formData.get("amount")).replace(/,/g, '')); // Parsed from form
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
  if (typeof trackEvent === "function") trackEvent("edit_transaction", "Engagement");

  refreshMonthlyViewIfRelevant(newDate);
  if (originalDate !== newDate) {
    refreshMonthlyViewIfRelevant(originalDate);
  }

  const detailModal = $("#transactionDetailModal");
  if (detailModal && detailModal.style.display === "block") {
    openTransactionDetailModal(transactionId, true);
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
      if (typeof trackEvent === "function") trackEvent("delete_transaction", "Engagement");
      refreshMonthlyViewIfRelevant(deletedDate);

      const detailModal = $("#transactionDetailModal");
      if (detailModal && detailModal.style.display === "block") {
        detailModal.style.display = "none";
        const confirmModal = $("#confirmationModal");
        if (confirmModal) confirmModal.style.display = "none";
        updateBodyScrollState();
        history.go(-2);
        return true;
      }
    }
  );
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

      const scrollPos = monthlyViewModal.scrollTop;
      const innerListContainer = $("#monthlyTransactionsListContainer");
      const listScrollPos = innerListContainer ? innerListContainer.scrollTop : 0;
      
      const container = $("#monthlyDetailsContainer");
      if (container) {
        container.style.minHeight = container.offsetHeight + "px";
      }


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
          const dayKey = header.dataset.dayKey;

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

      const monthlySearchInput = $("#monthlySearchInput");
      const currentSearchTerm = monthlySearchInput ? monthlySearchInput.value.trim() : "";
      // Since accordion expansion is now fully synchronous via maxHeight: "none",
      // the DOM has its full height immediately. We can restore scroll synchronously!
      monthlyViewModal.scrollTop = scrollPos;
      const newInnerListContainer = $("#monthlyTransactionsListContainer");
      if (newInnerListContainer) {
        newInnerListContainer.scrollTop = listScrollPos;
      }
      
      if (container) {
        container.style.minHeight = "";
      }
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

  populateYearSelector(state.transactions, yearSelector, currentYear, currentYear);

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
  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const fullMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  shortMonths.forEach((monthName, index) => {
    const button = document.createElement("button");
    button.className = "tab-button !px-3 !py-1.5 !text-sm whitespace-nowrap";
    button.innerHTML = `
      <span class="inline md:hidden">${fullMonths[index]}</span>
      <span class="hidden md:inline">${monthName}</span>
    `;
    button.dataset.month = index;
    button.dataset.year = year;
    button.onclick = () => {
      $$("#monthTabs .tab-button").forEach((btn) => {
        btn.classList.remove("active");
        btn.removeAttribute("data-logically-active");
      });
      button.classList.add("active");
      button.setAttribute("data-logically-active", "true");
      
      // Scroll the active tab into view (centered)
      setTimeout(() => {
        button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        if (typeof updateTabIndicator === 'function') updateTabIndicator();
      }, 10);
      
      // Reset search and advanced filters when a tab is clicked
      if (typeof window.resetAdvancedFiltersAndSearch === "function") {
        window.resetAdvancedFiltersAndSearch(false);
      } else {
        const monthlySearchInput = $("#monthlySearchInput");
        const clearMonthlySearchBtn = $("#clearMonthlySearchBtn");
        if (monthlySearchInput) monthlySearchInput.value = "";
        if (clearMonthlySearchBtn) {
          clearMonthlySearchBtn.style.display = "none";
          clearMonthlySearchBtn.disabled = true;
        }
      }
      renderMonthlyDetails(index, year, new Set(), false, "", false);
    };
    monthTabsContainer.appendChild(button);
  });
  
  setTimeout(() => {
    if (typeof updateTabIndicator === 'function') updateTabIndicator();
  }, 10);
}

function renderMonthlyDetails(
  month,
  year,
  openDayKeys = new Set(),
  isUpdate = false,
  searchTerm = "",
  isSearchingOrJustCleared = false
) {
  const container = $("#monthlyDetailsContainer");

  if (
    (isSearchingOrJustCleared && !searchTerm) ||
    (!isSearchingOrJustCleared && !searchTerm)
  ) {
    if (monthlyPieChartInstance && !isUpdate) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
  }

  let existingChartCard = null;
  if (monthlyPieChartInstance) {
    const canvas = document.getElementById("monthlyDetailPieChartCanvas");
    if (canvas) {
      existingChartCard = canvas.closest('.p-4.rounded-lg');
    }
  }

  container.innerHTML = "";


  const filterStartDate = $("#filterStartDate")?.value;
  const filterEndDate = $("#filterEndDate")?.value;
  const filterType = $("#filterType")?.value || "all";
  // Multi-Select Category Extraction
  const filterCategoryDropdown = $("#filterCategoryDropdown");
  let selectedCategories = new Set();
  let isAllCategories = true;
  if (filterCategoryDropdown) {
    const allCheckbox = filterCategoryDropdown.querySelector("#filterCategoryAll");
    if (!allCheckbox || !allCheckbox.checked) {
      isAllCategories = false;
      const checkedBoxes = filterCategoryDropdown.querySelectorAll(".filter-category-checkbox:checked");
      checkedBoxes.forEach(cb => selectedCategories.add(cb.value));
    }
  }
  const filterMinAmount = $("#filterMinAmount")?.value;
  const filterMaxAmount = $("#filterMaxAmount")?.value;
  
  const searchLower = searchTerm ? searchTerm.toLowerCase() : "";

  const defaultStartDate = new Date(year, month, 1).toLocaleDateString("en-CA");
  const defaultEndDate = new Date(year, month + 1, 0).toLocaleDateString("en-CA");

  const isCustomDate = (filterStartDate && filterStartDate !== defaultStartDate) || 
                       (filterEndDate && filterEndDate !== defaultEndDate);

  const hasAdvancedFilters = isCustomDate || filterType !== "all" || !isAllCategories || filterMinAmount || filterMaxAmount;
  const toggleBtn = $("#toggleAdvancedFiltersBtn");
  if (toggleBtn) {
    if (hasAdvancedFilters) {
      toggleBtn.querySelector(".filter-text").textContent = "Filters (Active)";
    } else {
      toggleBtn.querySelector(".filter-text").textContent = "Filters";
    }
  }

  // UX Tweak: Handle active month tab visual state for multi-month spans
  const allTabs = $$("#monthTabs .tab-button");
  if (isCustomDate) {
    allTabs.forEach(btn => {
      const btnMonth = parseInt(btn.dataset.month);
      const btnYear = parseInt(btn.dataset.year);
      const btnStart = new Date(btnYear, btnMonth, 1).toLocaleDateString("en-CA");
      const btnEnd = new Date(btnYear, btnMonth + 1, 0).toLocaleDateString("en-CA");

      let overlap = true;
      if (filterStartDate && btnEnd < filterStartDate) overlap = false;
      if (filterEndDate && btnStart > filterEndDate) overlap = false;

      if (overlap) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  } else {
    // If no custom date override, only the logically active tab should be active
    allTabs.forEach(btn => {
      if (btn.getAttribute("data-logically-active") === "true" || parseInt(btn.dataset.month) === month) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // Update tab indicator to reflect new active state
  setTimeout(() => {
    if (typeof updateTabIndicator === 'function') updateTabIndicator();
  }, 10);

  const transactionsToDisplay = state.transactions.filter((t) => {
    const tDate = new Date(t.date + "T00:00:00");
    if (isNaN(tDate.getTime())) return false;

    // 1. Date Check
    if (filterStartDate || filterEndDate) {
      if (filterStartDate && t.date < filterStartDate) return false;
      if (filterEndDate && t.date > filterEndDate) return false;
    } else {
      // Fallback to month/year tabs
      if (tDate.getFullYear() !== year || tDate.getMonth() !== month) return false;
    }

    // 2. Type Check
    if (filterType !== "all" && t.type !== filterType) return false;

    // 3. Category Check
    if (!isAllCategories && !selectedCategories.has(t.category)) return false;

    // 4. Amount Check
    if (filterMinAmount && t.amount < parseFloat(String(filterMinAmount).replace(/,/g, ''))) return false;
    if (filterMaxAmount && t.amount > parseFloat(String(filterMaxAmount).replace(/,/g, ''))) return false;

    // 5. Text Search Check
    if (searchLower) {
      const account = state.accounts.find((a) => a.id === t.account);
      const accountName = account ? account.name.toLowerCase() : "";
      const descriptionLower = t.description ? t.description.toLowerCase() : "";
      const categoryLower = t.category ? t.category.toLowerCase() : "";
      const amountStr = t.amount.toFixed(2);
      const typeLower = t.type.toLowerCase();

      if (!(descriptionLower.includes(searchLower) ||
            categoryLower.includes(searchLower) ||
            accountName.includes(searchLower) ||
            amountStr.includes(searchLower) ||
            typeLower.includes(searchLower))) {
        return false;
      }
    }

    return true;
  });

  transactionsToDisplay.sort(
    (a, b) =>
      new Date(b.date).setHours(0, 0, 0, 0) -
        new Date(a.date).setHours(0, 0, 0, 0) || b.timestamp - a.timestamp
  );

  // --- Summary calculations are now based on the FILTERED transaction pool ---
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};
  if (state.categories && Array.isArray(state.categories)) {
    state.categories.forEach((cat) => (categoryTotals[cat] = 0));
  }

  // For the last month comparison, we'll keep it strictly to the previous month of the selected tab
  let lastMonthTotalExpense = 0;
  const lastMonthDate = new Date(year, month - 1, 1);
  state.transactions
    .filter((t) => {
      const tDate = new Date(t.date + "T00:00:00");
      const isExcluded = isCategoryExcluded(t.category || "Other", 'excludeFromMonthlyTotals');
      return (
        t.type === "expense" &&
        !isExcluded &&
        !isNaN(tDate.getTime()) &&
        tDate.getFullYear() === lastMonthDate.getFullYear() &&
        tDate.getMonth() === lastMonthDate.getMonth()
      );
    })
    .forEach((t) => (lastMonthTotalExpense += t.amount));

  transactionsToDisplay.forEach((t) => {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else if (t.type === "expense") {
      const category = t.category || "Other";
      const isExcluded = isCategoryExcluded(category, 'excludeFromMonthlyTotals');
      
      if (!isExcluded) {
        totalExpense += t.amount;
      }
      
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
    monthSpendingIndicatorHtml = `<i class="fas fa-arrow-up text-indicator-bad spending-indicator" data-tooltip="More than last month (${formatCurrency(
      lastMonthTotalExpense
    )})"></i>`;
  } else if (
    totalExpense < lastMonthTotalExpense &&
    lastMonthTotalExpense > 0
  ) {
    monthSpendingIndicatorHtml = `<i class="fas fa-arrow-down text-indicator-good spending-indicator" data-tooltip="Less than last month (${formatCurrency(
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
  if (!hasAdvancedFilters && !searchTerm) {
    transactionHeader.appendChild(exportButton);
  }
  transactionListSection.appendChild(transactionHeader);
  // --- END FIX ---

  if (transactionsToDisplay.length === 0) {
    const noTransactionsDiv = document.createElement("div");
    const msg = searchTerm ? "No transactions match your search" : "No transactions for this period";
    noTransactionsDiv.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-500"><i class="fas fa-search text-4xl mb-3 opacity-40"></i><p class="text-sm font-medium">${msg}</p></div>`;
    transactionListSection.appendChild(noTransactionsDiv);
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
    listContainerElement.id = "monthlyTransactionsListContainer";
    listContainerElement.className = "max-h-[60vh] overflow-y-auto pr-2";

    sortedDays.forEach((dayData) => {
      if (searchTerm && dayData.transactions.length === 0) return;

      const dayGroup = document.createElement("div");
      dayGroup.className = "monthly-view-day-group";
      dayGroup.style.transition =
        "opacity 0.3s ease-out, max-height 0.3s ease-out, margin-bottom 0.3s ease-out, padding-bottom 0.3s ease-out";
      dayGroup.style.overflow = "hidden";

      const dayHeader = document.createElement("div");
      dayHeader.className = "monthly-view-day-header flex flex-col sm:flex-row sm:justify-between sm:items-center items-start gap-2 sm:gap-0";
      dayHeader.style.cursor = "pointer";
      dayHeader.dataset.dayKey = dayData.dayKey;

      const dateSpan = document.createElement("span");
      dateSpan.className = "font-semibold";
      const isFiltering = hasAdvancedFilters || searchTerm;
      dateSpan.textContent = dayData.date.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        ...(isFiltering ? { year: "numeric" } : {})
      });

      // --- FIX: Right-aligned container for amount and icon ---
      const rightSideContainer = document.createElement("div");
      rightSideContainer.className = "flex items-center flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0";

      const dailyTotalExpenseForDisplay = dayData.transactions
        .filter((t) => t.type === "expense" && !isCategoryExcluded(t.category || "Other", 'excludeFromMonthlyTotals'))
        .reduce((sum, t) => sum + t.amount, 0);
      const spentSpan = document.createElement("span");
      spentSpan.className = "text-md font-semibold text-expense mr-3 whitespace-nowrap tabular-nums";
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
        (searchTerm && dayData.transactions.length > 0) ||
        (!searchTerm && openDayKeys.has(dayData.dayKey));

      if (shouldBeOpenInitially) {
        chevronIcon.classList.add("fa-chevron-up");
      } else {
        dayTransactionsContainer.style.maxHeight = "0px";
        chevronIcon.classList.add("fa-chevron-down");
      }

      dayData.transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .forEach((t, index) => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "transaction-list-item-layout monthly-view-transaction-item stagger-item flex justify-between items-center gap-x-2";
          if (shouldBeOpenInitially) {
            itemDiv.style.animation = "none";
            itemDiv.style.opacity = "1";
          } else {
            itemDiv.style.animationDelay = `${index * 0.03}s`;
          }
          itemDiv.onclick = () => openTransactionDetailModal(t.id);
          const account = state.accounts.find((acc) => acc.id === t.account);
          const accountName = account ? account.name : "Unknown Acct";
          const isIncome = t.type === "income";
          const textColorClass = isIncome ? "text-income" : "text-expense";

          let subDetailText = accountName;
          if (!isIncome && t.category) {
            subDetailText += ` | ${escapeHTML(t.category)}`;
          } else if (!isIncome && !t.category) {
            subDetailText += ` | Uncategorized`;
          }

          const isExcluded = t.type === "expense" && isCategoryExcluded(t.category || "Other", 'dimInTransactionLists');
          const opacityClass = isExcluded ? "opacity-50" : "";
          const tooltipSuffix = isExcluded ? " (Hidden Category)" : "";

          itemDiv.innerHTML = `
              <div class="flex-grow min-w-0 ${opacityClass} mr-2">
                <p class="font-medium truncate ${textColorClass}">${escapeHTML(t.description)}</p>
                <p class="text-xs text-gray-400 mt-0.5 truncate">${subDetailText}</p>
              </div>
              <div class="flex items-center justify-end flex-shrink-0">
                <span class="font-semibold whitespace-nowrap ${textColorClass} tabular-nums ${opacityClass}" data-tooltip="${isExcluded ? 'Excluded from totals' : ''}">${
              isIncome ? "+" : "-"
            }${formatCurrency(t.amount)}</span>
                <div class="edit-btn-container ml-3 hidden md:flex">
                  <button class="text-xs accent-text hover:text-accent-hover focus:outline-none" onclick="openEditTransactionModal('${
                    t.id
                  }', event)" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
                  <button class="text-xs text-gray-500 hover:text-expense focus:outline-none ml-2" onclick="deleteTransaction('${
                    t.id
                  }', event)" data-tooltip="Delete"><i class="fas fa-times"></i></button>
                </div>
              </div>`;
          dayTransactionsContainer.appendChild(itemDiv);
        });
      dayGroup.appendChild(dayTransactionsContainer);

      if (shouldBeOpenInitially) {
        if (isUpdate) {
          dayTransactionsContainer.style.transition = "none";
          dayTransactionsContainer.style.maxHeight = "none";
          requestAnimationFrame(() => {
            dayTransactionsContainer.style.transition = "";
          });
        } else {
          setTimeout(() => {
            dayTransactionsContainer.style.maxHeight =
              dayTransactionsContainer.scrollHeight + "px";
            if (typeof triggerStaggerAnimation === 'function') {
              triggerStaggerAnimation(dayTransactionsContainer);
            }
          }, 50);
        }
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
          
          if (typeof triggerStaggerAnimation === 'function') {
            triggerStaggerAnimation(dayTransactionsContainer);
          }
        } else {
          if (dayTransactionsContainer.style.maxHeight === "none" || dayTransactionsContainer.style.maxHeight === "") {
             dayTransactionsContainer.style.maxHeight = dayTransactionsContainer.scrollHeight + "px";
             void dayTransactionsContainer.offsetHeight; // trigger reflow
          }
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
  summaryCard.innerHTML = `<h3 class="text-lg font-semibold mb-3 text-center">Category Summary</h3>`;
  const categoryList = document.createElement("ul");
  categoryList.className =
    "monthly-view-category-list space-y-1 text-sm max-h-48 overflow-y-auto pr-2";
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([_, amount]) => amount > 0)
    .sort(([, a], [, b]) => b - a);

  if (sortedCategories.length > 0) {
    sortedCategories.forEach(([category, amount]) => {
      const isExcluded = isCategoryExcluded(category, 'excludeFromMonthlyTotals');
      const li = document.createElement("li");
      const opacityClass = isExcluded ? "opacity-50" : "";
      const tooltip = isExcluded ? `data-tooltip="${category} (Hidden Category)"` : `data-tooltip="${category}"`;
      li.innerHTML = `<span class="truncate pr-2 ${opacityClass}" ${tooltip}>${category}</span><span class="font-medium whitespace-nowrap tabular-nums ${opacityClass}" ${tooltip}>${formatCurrency(
        amount
      )}</span>`;
      categoryList.appendChild(li);
    });
  } else {
      categoryList.innerHTML = '<li class="flex flex-col items-center justify-center py-8 text-gray-500"><i class="fas fa-folder-open text-3xl mb-3 opacity-40"></i><p class="text-sm font-medium">No expenses this month</p></li>';
  }
  summaryCard.appendChild(categoryList);
  categorySection.appendChild(summaryCard);

  if (sortedCategories.length > 0) {
    if (existingChartCard) {
      categorySection.appendChild(existingChartCard);
    } else if (!monthlyPieChartInstance || (isSearchingOrJustCleared && !searchTerm)) {
      if (monthlyPieChartInstance) {
        monthlyPieChartInstance.destroy();
        monthlyPieChartInstance = null;
      }
      const chartCard = document.createElement("div");
      chartCard.className = "p-4 rounded-lg h-96 md:h-[450px] flex flex-col";
      chartCard.style.backgroundColor = "var(--bg-tertiary)";
      const titleEl = document.createElement("h3");
      titleEl.className = "text-lg font-semibold mb-3 text-center";
      titleEl.textContent = "Category Distribution";
      chartCard.appendChild(titleEl);
      const wrapper = document.createElement("div");
      wrapper.className = "flex-grow relative w-full min-h-0 flex items-center justify-center";
      
      const canvasContainer = document.createElement("div");
      canvasContainer.className = "absolute inset-0";
      const canvas = document.createElement("canvas");
      canvas.id = "monthlyDetailPieChartCanvas";
      canvasContainer.appendChild(canvas);
      
      // Center Info Overlay
      const centerInfo = document.createElement("div");
      centerInfo.id = "pieChartCenterInfo";
      centerInfo.className = "absolute flex flex-col items-center justify-center text-center pointer-events-none transition-opacity duration-200 opacity-0 z-10 w-3/5";
      
      // 1. Data Container
      const dataContainer = document.createElement("div");
      dataContainer.id = "pieChartDataContainer";
      dataContainer.className = "flex flex-col items-center justify-center hidden w-full";
      
      const centerTitle = document.createElement("span");
      centerTitle.id = "pieChartCenterTitle";
      centerTitle.className = "text-sm text-gray-400 mb-1 truncate w-full";
      
      const centerValue = document.createElement("span");
      centerValue.id = "pieChartCenterValue";
      centerValue.className = "text-xl font-bold truncate w-full";
      
      const centerPercentage = document.createElement("span");
      centerPercentage.id = "pieChartCenterPercentage";
      centerPercentage.className = "text-xs font-medium px-2 py-0.5 rounded-full mt-1 truncate max-w-full";
      
      dataContainer.appendChild(centerTitle);
      dataContainer.appendChild(centerValue);
      dataContainer.appendChild(centerPercentage);

      // 2. Placeholder Container
      const placeholderContainer = document.createElement("div");
      placeholderContainer.id = "pieChartPlaceholderContainer";
      placeholderContainer.className = "flex flex-col items-center justify-center text-gray-500 w-full";
      
      const isMobileLayout = window.matchMedia("(max-width: 768px)").matches;
      const iconClass = isMobileLayout ? "fa-hand-pointer" : "fa-mouse-pointer";
      const instructionText = isMobileLayout ? "Tap a segment" : "Hover or click";

      placeholderContainer.innerHTML = `
        <i class="fas ${iconClass} text-xl mb-1 opacity-40"></i>
        <span class="text-xs font-medium opacity-60">${instructionText}</span>
      `;
      
      centerInfo.appendChild(dataContainer);
      centerInfo.appendChild(placeholderContainer);

      wrapper.appendChild(canvasContainer);
      wrapper.appendChild(centerInfo);
      chartCard.appendChild(wrapper);
      categorySection.appendChild(chartCard);
    }
    
    const pieDataCategories = sortedCategories.filter(([c, _]) => !isCategoryExcluded(c, 'excludeFromPieChart'));
    const pieData = {
      labels: pieDataCategories.map(([c, _]) => c),
      values: pieDataCategories.map(([_, a]) => a),
    };
    setTimeout(() => renderMonthlyPieChart(pieData, isUpdate), 100);
  } else if (sortedCategories.length === 0) {
    if (monthlyPieChartInstance) {
      monthlyPieChartInstance.destroy();
      monthlyPieChartInstance = null;
    }
    const noChartCard = document.createElement("div");
    noChartCard.className =
      "p-4 rounded-lg h-72 md:h-80 flex flex-col";
    noChartCard.style.backgroundColor = "var(--bg-tertiary)";
    noChartCard.innerHTML =
      '<h3 class="text-lg font-semibold mb-3 text-center">Category Distribution</h3>' +
      '<div class="flex flex-col items-center justify-center flex-grow text-gray-500"><i class="fas fa-chart-pie text-5xl mb-4 opacity-30"></i><p class="text-sm font-medium">No expense data for chart</p></div>';
    categorySection.appendChild(noChartCard);
  }

  contentGrid.appendChild(categorySection);
  container.appendChild(contentGrid);
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
  
  const progressBar = $("#ccProgressBar");
  if (progressBar) {
    if (limit <= 0) {
      progressBar.style.width = "0%";
      progressBar.className = "bg-gray-500 h-1.5 rounded-full transition-all duration-500 ease-out";
    } else {
      let percentUsed = (spentUnpaid / limit) * 100;
      percentUsed = Math.min(100, Math.max(0, percentUsed)); // clamp between 0 and 100
      progressBar.style.width = `${percentUsed}%`;
      
      // Color logic: green -> orange -> red
      if (percentUsed >= 90) {
        progressBar.className = "bg-[#E74C3C] h-1.5 rounded-full transition-all duration-500 ease-out";
      } else if (percentUsed >= 70) {
        progressBar.className = "bg-orange-500 h-1.5 rounded-full transition-all duration-500 ease-out";
      } else {
        progressBar.className = "bg-[#27AE60] h-1.5 rounded-full transition-all duration-500 ease-out";
      }
    }
  }
}

function openCcHistoryModal() {
  const modal = $("#ccHistoryModal");
  if (!modal) return;

  const currentYear = new Date().getFullYear();
  const yearSelector = $("#ccYearSelector");
  const monthTabsContainer = $("#ccMonthTabs");
  const listContainer = $("#ccHistoryListContainer");
  const searchInput = $("#ccHistorySearchInput");
  const clearSearchBtn = $("#clearCcHistorySearchBtn");

  // --- Reset state on open ---
  ccHistoryFilter = "unpaid"; // Default filter
  if (searchInput) searchInput.value = "";
  if (clearSearchBtn) clearSearchBtn.classList.add("hidden");

  // Determine active year and month based on state or current time
  ccSelectedYear = currentYear;
  ccSelectedMonth = new Date().getMonth();

  // --- Populate Year Selector ---
  populateYearSelector(state.creditCard.transactions, yearSelector, currentYear, ccSelectedYear);

  // --- Populate Month Tabs ---
  const renderMonthTabs = () => {
    monthTabsContainer.innerHTML = "";
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // determine selected year globally
    ccSelectedYear = parseInt(yearSelector.value) || ccSelectedYear;
    
    shortMonths.forEach((monthStr, index) => {
      // Calculate if this month has any transactions matching the current filter
      let hasData = (state.creditCard.transactions || []).some(t => {
        const d = new Date(t.date);
        if (d.getFullYear() !== ccSelectedYear || d.getMonth() !== index) return false;
        if (ccHistoryFilter === "paid" && !t.paidOff && (!t.paidAmount || t.paidAmount <= 0)) return false;
        // if unpaid, it's bypassed entirely anyway, but just in case
        if (ccHistoryFilter === "unpaid" && t.paidOff) return false;
        return true;
      });

      const btn = document.createElement("button");
      btn.className = `tab-button !px-3 !py-1.5 !text-sm whitespace-nowrap ${index === ccSelectedMonth ? "active" : ""}`;
      if (!hasData) {
        btn.classList.add("opacity-40"); // Dim months with no data
      }
      btn.innerHTML = `
        <span class="inline md:hidden">${fullMonths[index]}</span>
        <span class="hidden md:inline">${monthStr}</span>
      `;
      btn.onclick = () => {
        ccSelectedMonth = index;
        renderFilteredCcList();
      };
      monthTabsContainer.appendChild(btn);
    });

    if (typeof updateTabIndicator === 'function') updateTabIndicator('ccMonthTabs');

    // Ensure the active tab scrolls into view
    setTimeout(() => {
      const activeBtn = monthTabsContainer.querySelector('.tab-button.active');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 10);
  };

  // --- Main Rendering Function ---
  const renderFilteredCcList = () => {
    ccSelectedYear = parseInt(yearSelector.value);
    const navRow = $("#ccHistoryNavigationRow");
    
    if (ccHistoryFilter === "unpaid") {
      if (navRow) navRow.style.display = "none";
    } else {
      if (navRow) navRow.style.display = "flex";
      renderMonthTabs();
    }

    const searchTerm = searchInput.value.trim().toLowerCase();

    // 1. Filter by Year, Month, Status, and Search Term
    let filteredTransactions = (state.creditCard.transactions || []).filter(
      (t) => {
        const tDate = new Date(t.date);
        
        // Status checks
        if (ccHistoryFilter === "unpaid" && t.paidOff) return false;
        if (ccHistoryFilter === "paid" && !t.paidOff && (!t.paidAmount || t.paidAmount <= 0)) return false;

        // If not unpaid, strictly filter by year and month
        if (ccHistoryFilter !== "unpaid") {
          if (tDate.getFullYear() !== ccSelectedYear) return false;
          if (tDate.getMonth() !== ccSelectedMonth) return false;
        }

        // Search check
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

    // Sort newest first
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date) || b.timestamp - a.timestamp);

    // 2. Update Summary Stats (always based on full data, not filters)
    const limit = state.creditCard.limit || 0;
    const allUnpaid = (state.creditCard.transactions || [])
      .filter((t) => !t.paidOff)
      .reduce((sum, t) => sum + t.amount - (t.paidAmount || 0), 0);
    const available = limit - allUnpaid;
    
    $("#ccHistoryLimit").innerHTML = `<span class="tabular-nums">${formatCurrency(limit)}</span>`;
    $("#ccHistorySpentUnpaid").innerHTML = `<span class="tabular-nums">${formatCurrency(allUnpaid)}</span>`;
    const availableEl = $("#ccHistoryAvailable");
    availableEl.innerHTML = `<span class="tabular-nums">${formatCurrency(available)}</span>`;
    availableEl.classList.toggle("text-expense", available < 0);
    availableEl.classList.toggle("accent-text", available >= 0);

    // 3. Render Chronological List
    listContainer.innerHTML = "";
    
    // Clear selection state
    if (window.ccSelectedItems) {
      window.ccSelectedItems.clear();
    } else {
      window.ccSelectedItems = new Set();
    }
    updateCcBulkPaymentBar();
    
    if (filteredTransactions.length === 0) {
      listContainer.innerHTML = `<div class="flex flex-col items-center justify-center py-12 text-gray-500"><i class="fas fa-search text-4xl mb-3 opacity-40"></i><p class="text-sm font-medium">No transactions found for this period</p></div>`;
      // Also update filter buttons
      $$("#ccHistoryFilterControls button").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === ccHistoryFilter);
      });
      return;
    }

      // 3. Calculate Monthly Total based on current filter
      let currentTotal = 0;
      filteredTransactions.forEach(t => {
        if (ccHistoryFilter === "unpaid") {
          currentTotal += t.amount - (t.paidAmount || 0);
        } else if (ccHistoryFilter === "paid") {
          currentTotal += t.paidAmount || 0;
        } else {
          currentTotal += t.amount; // "all"
        }
      });
      
      let lastMonthYearStr = "";

      filteredTransactions.forEach((t, index) => {
        const dateObj = new Date(t.date);
        
        // Render month header if doing continuous scroll (unpaid view)
        if (ccHistoryFilter === "unpaid") {
          const monthYearStr = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          if (monthYearStr !== lastMonthYearStr) {
            const headerDiv = document.createElement("div");
            headerDiv.className = "text-gray-300 font-bold text-sm mt-4 mb-0 pb-2 border-b border-gray-700 px-2";
            headerDiv.textContent = monthYearStr;
            listContainer.appendChild(headerDiv);
            lastMonthYearStr = monthYearStr;
          }
        }
        
        const itemDiv = document.createElement("div");
        itemDiv.className = `transaction-list-item-layout monthly-view-transaction-item stagger-item block relative cc-history-row !py-3.5 sm:!py-3 !px-4 sm:!px-5`;
        itemDiv.style.animationDelay = `${(index % 20) * 0.03}s`; // Limit stagger delay
        
        if (t.paidOff) {
          itemDiv.classList.add("opacity-50");
        }
        
        const remainingOnItem = t.amount - (t.paidAmount || 0);
        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        
        let statusText = "";
        let bigAmountText = "";
        if (t.paidOff || remainingOnItem <= 0.005) {
          statusText = `<span class="text-income font-medium">Settled</span>`;
          bigAmountText = `
            <span class="font-semibold text-sm sm:text-base tabular-nums text-gray-500">${formatCurrency(t.amount)}</span>
          `;
        } else if (t.paidAmount > 0) {
          statusText = `<span class="text-gray-400">Paid ${formatCurrency(t.paidAmount)}</span>`;
          bigAmountText = `
            <span class="font-semibold sm:text-base tabular-nums hidden sm:inline text-expense">
              ${formatCurrency(remainingOnItem)} <span class="text-gray-500 text-sm font-normal">of ${formatCurrency(t.amount)} Left</span>
            </span>
            <span class="font-semibold text-sm tabular-nums sm:hidden text-expense">
              ${formatCurrency(remainingOnItem)}
            </span>
          `;
        } else {
          statusText = `<span class="text-gray-400">Unpaid</span>`;
          bigAmountText = `
            <span class="font-semibold sm:text-base tabular-nums hidden sm:inline text-expense">${formatCurrency(remainingOnItem)} <span class="text-gray-500 text-sm font-normal">Left</span></span>
            <span class="font-semibold text-sm tabular-nums sm:hidden text-expense">${formatCurrency(remainingOnItem)}</span>
          `;
        }

        const isSelectable = !t.paidOff && remainingOnItem > 0.005;
        let checkboxHtml = "";
        if (isSelectable) {
          checkboxHtml = `
            <div class="flex-shrink-0 mr-3 flex items-center h-full" onclick="event.stopPropagation(); toggleCcItemSelection('${t.id}')">
              <div id="cc-checkbox-${t.id}" class="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center transition-colors cursor-pointer hover:border-accent-500">
                <i class="fas fa-check text-xs text-white opacity-0 transition-opacity"></i>
              </div>
            </div>
          `;
        }

        // The main row
        const mainRow = document.createElement("div");
        mainRow.className = "flex justify-between items-center gap-x-2 w-full cursor-pointer";
        mainRow.onclick = () => {
          if (window.matchMedia("(min-width: 640px)").matches) {
            // Desktop: Toggle drawer logic
            $$(".cc-history-row .overflow-hidden").forEach(drawer => {
              if (drawer !== drawerDiv) {
                drawer.style.maxHeight = "0px";
                drawer.style.opacity = "0";
              }
            });
            
            if (drawerDiv.style.maxHeight === "0px") {
              drawerDiv.style.maxHeight = drawerDiv.scrollHeight + "px";
              drawerDiv.style.opacity = "1";
            } else {
              drawerDiv.style.maxHeight = "0px";
              drawerDiv.style.opacity = "0";
            }
          } else {
            // Mobile: Open Modal
            openCcTransactionDetailModal(t.id);
          }
        };
        
        mainRow.innerHTML = `
          ${checkboxHtml}
          <div class="flex-grow min-w-0 mr-2 text-left">
              <p class="font-medium truncate ${t.paidOff ? "text-gray-500" : "text-gray-200"}">${escapeHTML(t.description)}</p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">${formattedDate} &bull; ${statusText}</p>
          </div>
          <div class="flex items-center justify-end flex-shrink-0 text-right">
              ${bigAmountText}
          </div>
        `;

      // Expandable Drawer
      const drawerDiv = document.createElement("div");
      drawerDiv.className = "overflow-hidden transition-all duration-300 hidden sm:block";
      drawerDiv.style.maxHeight = "0px";
      drawerDiv.style.opacity = "0";
      
      let payButtonHtml = "";
      if (isSelectable) {
        payButtonHtml = `<button class="btn btn-primary flex-1 py-1 sm:py-1.5 px-0 text-sm" onclick="event.stopPropagation(); openPayCcItemForm('${t.id}')"><i class="fas fa-credit-card mr-1"></i> Pay</button>`;
      }
      
      drawerDiv.innerHTML = `
        <div class="flex w-full gap-2 pt-3 pb-1 pl-${isSelectable ? '8' : '0'}">
          ${payButtonHtml}
          <button class="btn btn-secondary flex-1 py-1 sm:py-1.5 px-0 text-sm" onclick="event.stopPropagation(); openEditCcTransactionModal('${t.id}')"><i class="fas fa-edit mr-1"></i> Edit</button>
          <button class="btn btn-secondary flex-1 hover:!text-expense hover:!border-expense py-1 sm:py-1.5 px-0 text-sm" onclick="event.stopPropagation(); deleteCcTransaction('${t.id}')"><i class="fas fa-trash-alt mr-1"></i> Delete</button>
        </div>
      `;

      itemDiv.appendChild(mainRow);
      itemDiv.appendChild(drawerDiv);
      listContainer.appendChild(itemDiv);
    });

      // Append Total Footer Row
      if (filteredTransactions.length > 0) {
        const footerDiv = document.createElement("div");
        footerDiv.className = "flex justify-between items-center mt-2 monthly-view-summary-card !text-left";
        if (ccHistoryFilter === "unpaid") {
          footerDiv.innerHTML = `<span class="text-gray-400 font-medium">Total Unpaid</span><span class="font-bold text-white text-base tabular-nums">${formatCurrency(currentTotal)}</span>`;
        } else if (searchTerm) {
          footerDiv.innerHTML = `<span class="text-gray-400 font-medium">Search Results (${filteredTransactions.length})</span><span class="font-bold text-white text-base">Total: <span class="tabular-nums">${formatCurrency(currentTotal)}</span></span>`;
        } else {
          footerDiv.innerHTML = `<span class="text-gray-400 font-medium">Monthly Total</span><span class="font-bold text-white text-base tabular-nums">${formatCurrency(currentTotal)}</span>`;
        }
        listContainer.appendChild(footerDiv);
      }

    // 4. Update active filter button
    $$("#ccHistoryFilterControls button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === ccHistoryFilter);
    });
  };

  // --- Setup Event Listeners ---
  yearSelector.onchange = () => {
    ccSelectedYear = parseInt(yearSelector.value);
    renderFilteredCcList();
  };

  $$("#ccHistoryFilterControls button").forEach((btn) => {
    btn.onclick = () => {
      ccHistoryFilter = btn.dataset.filter;
      renderFilteredCcList();
    };
  });

  // Expose the render function for the search listeners
  // Ensure the body has the reference for updates
  document.body.renderCcHistoryList = renderFilteredCcList;

  // --- Bulk Selection Logic ---
  window.toggleCcItemSelection = (id) => {
    if (!window.ccSelectedItems) window.ccSelectedItems = new Set();
    const checkbox = document.getElementById(`cc-checkbox-${id}`);
    if (!checkbox) return;
    
    if (window.ccSelectedItems.has(id)) {
      window.ccSelectedItems.delete(id);
      checkbox.classList.remove("bg-accent-500", "border-accent-500");
      checkbox.querySelector("i").classList.remove("opacity-100");
      checkbox.querySelector("i").classList.add("opacity-0");
    } else {
      window.ccSelectedItems.add(id);
      checkbox.classList.add("bg-accent-500", "border-accent-500");
      checkbox.querySelector("i").classList.remove("opacity-0");
      checkbox.querySelector("i").classList.add("opacity-100");
    }
    updateCcBulkPaymentBar();
  };

  window.updateCcBulkPaymentBar = () => {
    const bar = document.getElementById("ccBulkPaymentBar");
    const text = document.getElementById("ccBulkPaymentText");
    const container = document.getElementById("ccHistoryListContainer");
    if (!bar || !text) return;
    
    if (window.ccSelectedItems && window.ccSelectedItems.size > 0) {
      let totalAmount = 0;
      window.ccSelectedItems.forEach(id => {
        const item = state.creditCard.transactions.find(t => t.id === id);
        if (item) totalAmount += item.amount - (item.paidAmount || 0);
      });
      text.innerHTML = `<span class="text-white">${window.ccSelectedItems.size} Selected</span> &bull; <span class="text-expense font-bold tabular-nums">${formatCurrency(totalAmount)}</span>`;
      
      bar.classList.remove("translate-y-24", "opacity-0", "pointer-events-none");
      bar.classList.add("translate-y-0", "opacity-100", "pointer-events-auto");
      if (container) container.classList.add("pb-16");
    } else {
      bar.classList.add("translate-y-24", "opacity-0", "pointer-events-none");
      bar.classList.remove("translate-y-0", "opacity-100", "pointer-events-auto");
      if (container) container.classList.remove("pb-16");
    }
  };

  window.openBulkPayCcItemForm = () => {
    if (!window.ccSelectedItems || window.ccSelectedItems.size === 0) return;
    
    let totalAmount = 0;
    let itemsHtml = "";
    
    let categoryOptions = `<option value="" disabled selected>Select Category</option>`;
    const expenseCategories = state.categories
      .filter((c) => c.toLowerCase() !== "income")
      .sort((a, b) => a.localeCompare(b));

    expenseCategories.forEach((cat) => {
      categoryOptions += `<option value="${cat}">${cat}</option>`;
    });

    window.ccSelectedItems.forEach(id => {
      const item = state.creditCard.transactions.find(t => t.id === id);
      if (item) {
        const remaining = item.amount - (item.paidAmount || 0);
        totalAmount += remaining;
        
        itemsHtml += `
          <div class="mb-3 pb-3 border-b border-gray-700 last:border-0 last:pb-0">
            <div class="flex justify-between items-center mb-1.5">
              <span class="font-medium text-sm truncate pr-2 text-gray-100">${escapeHTML(item.description)}</span>
              <span class="text-expense font-semibold text-sm flex-shrink-0 tabular-nums">${formatCurrency(remaining)}</span>
            </div>
            <select name="payCategory_${id}" class="w-full text-sm" required>
              ${categoryOptions}
            </select>
          </div>
        `;
      }
    });

    const formHtml = `
        <input type="hidden" name="isBulkCcPayment" value="true">
        <p class="mb-4 text-sm text-gray-300">You are settling <span class="text-white font-semibold">${window.ccSelectedItems.size} items</span> for a total of <span class="font-semibold text-expense text-base tabular-nums">${formatCurrency(totalAmount)}</span>.</p>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Pay From Account</label>
          <select name="payFromAccount" class="w-full text-sm" required>
            ${state.accounts
              .filter((acc) => !acc.hidden)
              .map(
                (acc) =>
                  `<option value="${acc.id}">${escapeHTML(acc.name)} (${formatCurrency(
                    acc.balance
                  )})</option>`
              )
              .join("")}
          </select>
        </div>
        
        <div class="mb-4 mt-5 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
          <label class="block text-sm font-medium mb-3 text-gray-300">Categorize Items</label>
          ${itemsHtml}
        </div>
        
        <p class="text-xs text-gray-400 mb-4 bg-tertiary border border-theme p-3 rounded"><i class="fas fa-info-circle mr-1"></i> A separate transaction will be created in your bank account for each item to ensure pie charts remain accurate.</p>
        <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-secondary flex-1" onclick="closeModal('formModal')">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-check-circle mr-1"></i> Settle All</button>
        </div>
    `;

    openFormModal("Bulk CC Payment", formHtml, (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      const payFromAccountId = formData.get("payFromAccount");
      
      const account = state.accounts.find((a) => a.id === payFromAccountId);
      if (!account) {
        showNotification("Account not found.", "error");
        return;
      }
      
      let paidItemCount = 0;      
      let aggregateAmount = 0;
      
      window.ccSelectedItems.forEach(id => {
        const item = state.creditCard.transactions.find(t => t.id === id);
        if (item) {
          const remaining = item.amount - (item.paidAmount || 0);
          if (remaining > 0) {
            aggregateAmount += remaining;
          }
        }
      });
      
      if (account.balance < aggregateAmount) {
        showNotification(`Insufficient funds in ${account.name}.`, "warning");
        return;
      }
      
      window.ccSelectedItems.forEach(id => {
        const item = state.creditCard.transactions.find(t => t.id === id);
        if (item) {
          const remaining = item.amount - (item.paidAmount || 0);
          if (remaining > 0) {
            item.paidAmount = item.amount;
            item.paidOff = true;
            paidItemCount++;
            
            const payCategory = formData.get(`payCategory_${id}`);
            
            // Record individual bank transaction for perfect chart tracking
            const bankTx = {
              id: generateId(),
              amount: remaining,
              description: `Credit Card Payment: ${item.description}`,
              category: payCategory,
              type: "expense",
              account: payFromAccountId,
              date: getCurrentDateString(),
              timestamp: Date.now(),
            };
            state.transactions.push(bankTx);
          }
        }
      });
      
      if (aggregateAmount > 0) {
        // Deduct from bank balance
        account.balance -= aggregateAmount;
        
        saveData();
        renderFilteredCcList();
        renderCreditCardSection();
        renderDashboard();
        showNotification(`Settled ${paidItemCount} items successfully.`, "success");
        if (typeof trackEvent === "function") trackEvent("bulk_pay_cc", "Engagement", paidItemCount);
      }
      
      closeModal("formModal");
    });
  };

  // Initial render
  renderFilteredCcList();
  openModalHelper("ccHistoryModal");
}

function handleCcTransactionSubmit(event) {
  event.preventDefault();
  const form = event.target,
    formData = new FormData(form);
  const amount = parseFloat(String(formData.get("ccAmount")).replace(/,/g, ''));
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
  if (typeof trackEvent === "function") trackEvent("add_cc_transaction", "Engagement");

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
    // Keep CC History modal open in background
  }

  const formHtml = `
            <input type="hidden" name="editCcTransactionId" value="${
              transaction.id
            }">
            <div>
                <label for="modalCcAmount" class="block text-sm font-medium mb-1">Amount (LKR)</label>
                <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="modalCcAmount" name="ccAmount" value="${transaction.amount.toFixed(
                  2
                )}" step="0.01" min="0" placeholder="Amount spent" required><button type="button" class="calc-toggle-btn absolute right-4 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
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

  const newAmount = parseFloat(String(formData.get("ccAmount")).replace(/,/g, ''));
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

  const detailModal = $("#ccTransactionDetailModal");
  if (detailModal && detailModal.style.display === "block") {
    openCcTransactionDetailModal(ccTransactionId, true);
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

      const detailModal = $("#ccTransactionDetailModal");
      if (detailModal && detailModal.style.display === "block") {
        detailModal.style.display = "none";
        const confirmModal = $("#confirmationModal");
        if (confirmModal) confirmModal.style.display = "none";
        updateBodyScrollState();
        history.go(-2);
        return true;
      }
    }
  );
}

function openAddDebtForm() {
  openFormModal(
    "Add New Debt",
    `<div><label for="debtAmount" class="block text-sm font-medium mb-1">Amount Owed (LKR)</label><div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="debtAmount" name="debtAmount" step="0.01" min="0.01" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div></div><div><label for="debtWho" class="block text-sm font-medium mb-1">Who do you owe?</label><input type="text" id="debtWho" name="debtWho" placeholder="e.g., John Doe" required></div><div><label for="debtWhy" class="block text-sm font-medium mb-1">Reason?</label><input type="text" id="debtWhy" name="debtWhy" placeholder="e.g., Loan" required></div><div><label for="debtDueDate" class="block text-sm font-medium mb-1">Due Date</label><input type="date" id="debtDueDate" name="debtDueDate" required></div><button type="submit" class="btn btn-primary w-full">Add Debt</button>`,
    handleAddDebtSubmit
  );
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
  const day = String(nextMonth.getDate()).padStart(2, '0');
  
  const debtDueDateInput = $("#debtDueDate");
  if (debtDueDateInput)
    debtDueDateInput.value = `${year}-${month}-${day}`;
}

function handleAddDebtSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const amount = parseFloat(String(form.get("debtAmount")).replace(/,/g, ''));

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
    }"> <div><label class="block text-sm font-medium mb-1">Original Amount</label><div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" name="debtOriginalAmount" value="${(
      d.originalAmount || d.amount
    ).toFixed(
      2
    )}" step="0.01" min="0.01" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div></div> <div><label class="block text-sm font-medium mb-1">Remaining Amount</label><div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" name="debtRemainingAmount" value="${d.remainingAmount.toFixed(
      2
    )}" step="0.01" min="0" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div></div> <div><label class="block text-sm font-medium mb-1">Who</label><input type="text" name="debtWho" value="${
      d.who
    }" required></div> <div><label class="block text-sm font-medium mb-1">Why</label><input type="text" name="debtWhy" value="${
      d.why
    }" required></div> <div><label class="block text-sm font-medium mb-1">Due Date</label><input type="date" name="debtDueDate" value="${
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

  const originalAmount = parseFloat(String(form.get("debtOriginalAmount")).replace(/,/g, ''));
  const remainingAmount = parseFloat(String(form.get("debtRemainingAmount")).replace(/,/g, ''));

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
          <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="payDebtAmount" name="payDebtAmount" step="0.01" min="0.01" max="${debt.remainingAmount.toFixed(
            2
          )}" value="${debt.remainingAmount.toFixed(2)}" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
      </div>
      <div>
          <label for="modalPayDebtAccount" class="block text-sm font-medium mb-1">Pay From Account</label>
          <select id="modalPayDebtAccount" name="payDebtAccount" required></select>
      </div>
      <div class="flex items-center mt-3 mb-1">
          <input type="checkbox" id="logDebtPaymentAsExpense" name="logDebtPaymentAsExpense" class="h-4 w-4 text-accent-500 border-gray-500 rounded focus:ring-accent-500 mr-2" checked>
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
  const paymentAmount = parseFloat(String(form.get("payDebtAmount")).replace(/,/g, ''));
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
  if (!processPaymentDeduction(account, roundedPaymentAmount, logAsExpense, category)) return;

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
            <div><label for="recAmount" class="block text-sm font-medium mb-1">Amount Owed (LKR)</label><div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="recAmount" name="recAmount" step="0.01" min="0.01" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div></div>
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
            <div><label for="recWho" class="block text-sm font-medium mb-1">Who owes you?</label><input type="text" id="recWho" name="recWho" placeholder="e.g., Jane Doe" required></div>
            <div><label for="recWhy" class="block text-sm font-medium mb-1">Reason?</label><input type="text" id="recWhy" name="recWhy" placeholder="e.g., Friendly loan" required></div>
            <div><label for="recDateGiven" class="block text-sm font-medium mb-1">Date Given</label><input type="date" id="recDateGiven" name="recDateGiven" required></div>
            <button type="submit" class="btn btn-primary w-full"><i class="fas fa-plus"></i> Add Receivable</button>
        `;
  openFormModal("Add New Receivable", formHtml, handleAddReceivableSubmit);

  const dateGivenInput = $("#recDateGiven");
  if (dateGivenInput)
    dateGivenInput.value = getCurrentDateString();

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
  const amount = parseFloat(String(form.get("recAmount")).replace(/,/g, ''));
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
    }"> <div><label class="block text-sm font-medium mb-1">Original Amount</label><div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" name="recOriginalAmount" value="${(
      r.originalAmount || r.amount
    ).toFixed(
      2
    )}" step="0.01" min="0.01" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div></div> <div><label class="block text-sm font-medium mb-1">Remaining</label><div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" name="recRemainingAmount" value="${r.remainingAmount.toFixed(
      2
    )}" step="0.01" min="0" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div></div> <div><label class="block text-sm font-medium mb-1">Type</label><select id="recTypeEdit" name="recType" onchange="toggleReceivableSourceAccount(this.value, 'recSourceAccountGroupEdit', 'recSourceAccountEdit')"><option value="cash" ${
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
      )}</select></div> <div><label class="block text-sm font-medium mb-1">Who</label><input type="text" name="recWho" value="${
      r.who
    }" required></div> <div><label class="block text-sm font-medium mb-1">Why</label><input type="text" name="recWhy" value="${
      r.why
    }" required></div> <div><label class="block text-sm font-medium mb-1">Date Given</label><input type="date" name="recDateGiven" value="${
      r.dateGiven
    }" required></div> <button type="submit" class="btn btn-primary w-full">Update Receivable</button> `,
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

  const newOriginalAmountForm = parseFloat(String(form.get("recOriginalAmount")).replace(/,/g, ''));
  const newRemainingAmountForm = parseFloat(String(form.get("recRemainingAmount")).replace(/,/g, ''));
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
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="recPaymentAmount" name="recPaymentAmount" step="0.01" min="0.01" 
             value="${receivable.remainingAmount.toFixed(2)}" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div> 
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
      const enteredAmount = parseFloat(String(amountInput.value).replace(/,/g, ''));
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
  const paymentAmountForm = parseFloat(String(form.get("recPaymentAmount")).replace(/,/g, ''));
  const accountId = form.get("recPaymentAccount");
  const currentDate = getCurrentDateString();

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
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="instFullAmount" name="instFullAmount" step="0.01" min="0.01" placeholder="Total original cost" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
    </div>
    <div>
      <label for="instTotalMonths" class="block text-sm font-medium mb-1">Total Months for Plan</label>
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="instTotalMonths" name="instTotalMonths" step="1" min="1" placeholder="e.g., 12" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
    </div>
    <div>
      <label for="instMonthsLeft" class="block text-sm font-medium mb-1">Months Left (if not full term)</label>
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="instMonthsLeft" name="instMonthsLeft" step="1" min="0" placeholder="Defaults to Total Months"><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
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
    instStartDateInput.value = getCurrentDateString();

  const totalMonthsInput = $("#instTotalMonths");
  const monthsLeftInput = $("#instMonthsLeft");
  setupMaxMonthsValidation(totalMonthsInput, monthsLeftInput);
}

function handleAddInstallmentSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const fullAmount = parseFloat(String(formData.get("instFullAmount")).replace(/,/g, ''));
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
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="instFullAmount" name="instFullAmount" value="${currentFullAmount.toFixed(
        2
      )}" step="0.01" min="0.01" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
    </div>
    <div>
      <label for="instTotalMonths" class="block text-sm font-medium mb-1">Total Months for Plan</label>
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="instTotalMonths" name="instTotalMonths" value="${
        i.totalMonths
      }" step="1" min="1" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
    </div>
    <div>
      <label for="instMonthsLeft" class="block text-sm font-medium mb-1">Months Left</label>
      <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="instMonthsLeft" name="instMonthsLeft" value="${
        i.monthsLeft
      }" step="1" min="0" max="${i.totalMonths}" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
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
  setupMaxMonthsValidation(totalMonthsInput, monthsLeftInput);
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

  const fullAmount = parseFloat(String(form.get("instFullAmount")).replace(/,/g, ''));
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
          <div class="relative flex items-center w-full"><input type="text" inputmode="decimal" class="calc-amount pr-8" id="ccItemPayAmount" name="ccItemPayAmount" step="0.01" min="0.01" max="${remaining.toFixed(
            2
          )}" value="${remaining.toFixed(2)}" required><button type="button" class="calc-toggle-btn absolute right-2 text-gray-400 hover:text-accent-500 transition-colors focus:outline-none" tabindex="-1"><i class="fas fa-calculator"></i></button></div>
      </div>
      <div>
          <label for="modalCcPayFromAccount" class="block text-sm font-medium mb-1">Pay From Account</label>
          <select id="modalCcPayFromAccount" name="ccPayFromAccount" required></select>
      </div>
      <div class="flex items-center mt-3 mb-1">
          <input type="checkbox" id="logCcPaymentAsExpense" name="logCcPaymentAsExpense" class="h-4 w-4 text-accent-500 border-gray-500 rounded focus:ring-accent-500 mr-2" checked>
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
  const paymentAmountForm = parseFloat(String(form.get("ccItemPayAmount")).replace(/,/g, ''));
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
  if (!processPaymentDeduction(account, roundedPaymentAmount, logAsExpense, category)) return;

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

  const detailModal = $("#ccTransactionDetailModal");
  if (detailModal && detailModal.style.display === "block") {
    openCcTransactionDetailModal(ccItemId, true);
  }

  closeModal("formModal");
  showNotification(notificationMessage, "success");
}



function renderDashboard() {
  const cashCounterBtn = $("#cashCounterBtn");
  const topCardsContainer = $("#dashboardTopCardsContainer");
  const totalPotentialCard = $("#totalPotentialCard");

  if (topCardsContainer) {
    let visibleCards = 1; // Total Available is always visible
    
    // Total Potential visibility
    const hidePotential = (state.settings && state.settings.hideTotalPotential) || state.receivables.length === 0;
    if (totalPotentialCard) {
      if (hidePotential) {
        totalPotentialCard.style.display = "none";
      } else {
        totalPotentialCard.style.display = "block";
        visibleCards++;
      }
    }

    // Cash Counter visibility
    const hideCashCounter = state.settings && state.settings.hideCashCounter;
    if (cashCounterBtn) {
      if (hideCashCounter) {
        cashCounterBtn.style.display = "none";
      } else {
        cashCounterBtn.style.display = "flex";
        visibleCards++;
      }
    }

    // Adjust grid columns
    if (visibleCards === 1) {
      topCardsContainer.className = "grid grid-cols-1 gap-4 mb-4";
    } else if (visibleCards === 2) {
      topCardsContainer.className = "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4";
    } else {
      topCardsContainer.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4";
    }
  }

  const debtsInstallmentsCard = $("#debtsInstallmentsCard");
  const debtsReceivablesContainer = $("#debtsReceivablesContainer");
  const debtsInstallmentsTitle = $("#debtsInstallmentsTitle");
  const installmentsContainer = $("#installmentsContainer");

  const hideDebts = state.settings && state.settings.hideDebts;
  const hideInstallments = state.settings && state.settings.hideInstallments;

  if (debtsInstallmentsCard) {
    if (hideDebts && hideInstallments) {
      debtsInstallmentsCard.style.display = "none";
    } else {
      debtsInstallmentsCard.style.display = "block";
      
      if (hideDebts) {
        if (debtsReceivablesContainer) debtsReceivablesContainer.style.display = "none";
        if (installmentsContainer) installmentsContainer.classList.remove("mt-6", "pt-4", "border-t", "border-gray-600");
        if (debtsInstallmentsTitle) debtsInstallmentsTitle.style.display = "none";
      } else {
        if (debtsReceivablesContainer) debtsReceivablesContainer.style.display = "grid";
        if (installmentsContainer) installmentsContainer.classList.add("mt-6", "pt-4", "border-t", "border-gray-600");
        if (debtsInstallmentsTitle) debtsInstallmentsTitle.style.display = "block";
      }

      if (hideInstallments) {
        if (installmentsContainer) installmentsContainer.style.display = "none";
        if (debtsInstallmentsTitle) debtsInstallmentsTitle.innerHTML = "Debts & Receivables";
      } else {
        if (installmentsContainer) installmentsContainer.style.display = "block";
        if (!hideDebts) {
          if (debtsInstallmentsTitle) debtsInstallmentsTitle.innerHTML = "Debts, Receivables & Installments";
        }
      }
    }
  }

  const visibleAccounts = state.accounts.filter((acc) => !acc.hidden);
  const accountCardsContainer = $("#accountCardsContainer");
  
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

    // Reuse existing cards to preserve animIds and allow animation
    const existingCardIds = Array.from(accountCardsContainer.children).map(child => child.id.replace('accountBalance-', ''));
    const visibleAccountIds = visibleAccounts.map(acc => acc.id);
    const listsMatch = existingCardIds.length === visibleAccountIds.length && existingCardIds.every((val, index) => val === visibleAccountIds[index]);
    
    if (!listsMatch) {
      accountCardsContainer.innerHTML = "";
      visibleAccounts.forEach((acc) => {
        const card = document.createElement("div");
        card.id = `accountBalance-${acc.id}`;
        card.className = "bg-gray-600 p-3 rounded";
        card.innerHTML = `
          <p class="text-xs font-medium text-gray-300 truncate">${escapeHTML(acc.name)}</p>
          <p class="font-semibold text-sm tabular-nums balance-val"></p>
        `;
        accountCardsContainer.appendChild(card);
      });
    }

    visibleAccounts.forEach((acc) => {
      const card = accountCardsContainer.querySelector(`#accountBalance-${acc.id}`);
      if (card) {
        const nameEl = card.querySelector('p:first-child');
        if (nameEl && nameEl.textContent !== acc.name) {
          nameEl.textContent = acc.name;
        }
        const valEl = card.querySelector('.balance-val');
        if (valEl) {
          if (typeof animateValue === 'function') {
            animateValue(valEl, acc.balance, true, '', 'acc-' + acc.id);
          } else {
            valEl.innerHTML = `<span class="tabular-nums">${formatCurrency(acc.balance)}</span>`;
          }
        }
      }
    });
  } else {
    // Hide the container if the special condition is met
    accountCardsContainer.style.display = "none";
  }

  if (typeof animateValue === 'function') {
    animateValue($("#totalBalance"), totalBalance);
    const cashRecTotal = state.receivables
      .filter((r) => r.type === "cash" || (r.type === "cc" && r.sourceAccount))
      .reduce((s, r) => s + r.remainingAmount, 0);
    animateValue($("#totalPotentialBalance"), totalBalance + cashRecTotal);
    
    animateValue($("#totalOwedToMe"), state.receivables.reduce((s, r) => s + r.remainingAmount, 0), true, "Total: ");
    animateValue($("#totalOwed"), state.debts.reduce((s, d) => s + d.remainingAmount, 0), true, "Total: ");
    animateValue($("#totalInstallmentsLeft"), state.installments.reduce((s, i) => s + i.monthlyAmount * i.monthsLeft, 0), true, "Total Left: ");
  } else {
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
  }
  renderRecentTransactions();
  renderDebtList();
  renderReceivableList();
  renderInstallmentList();
  renderCreditCardSection();
  renderMonthlyOverviewChart();
  renderYearlyAndQuickStats();
  renderCategoryBudgets();
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
      if (t.type === "expense" && !isCategoryExcluded(t.category || "Other", 'excludeFromYearlyTotals')) yearlySpent += t.amount;
    }

    if (t.type === "expense" && !isCategoryExcluded(t.category || "Other", 'excludeFromQuickStats')) {
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

  $("#yearlyTotals").innerHTML = `<span class="whitespace-nowrap">Yearly: Earned ${formatCurrency(
    yearlyEarned
  )}</span> / <span class="whitespace-nowrap">Spent ${formatCurrency(yearlySpent)}</span>`;

  const quickStatsEl = $("#quickStats");
  // Update text to "Past 7 Days"
  quickStatsEl.innerHTML = `<span class="whitespace-nowrap">Today: ${formatCurrency(
    todaySpent
  )} <span id="todaySpendingIndicator"></span></span> | <span class="whitespace-nowrap">Past 7 Days: ${formatCurrency(
    current7DaysSpent
  )} <span id="weekSpendingIndicator"></span></span>`; // ID "weekSpendingIndicator" is kept for now, but refers to 7-day period

  const todayIndicator = $("#todaySpendingIndicator");
  if (todaySpent > yesterdaySpent && yesterdaySpent >= 0) {
    // Check yesterdaySpent >= 0 to avoid showing arrow if no data for yesterday
    todayIndicator.innerHTML = `<i class="fas fa-arrow-up text-indicator-bad spending-indicator" data-tooltip="More than yesterday (${formatCurrency(
      yesterdaySpent
    )})"></i>`;
  } else if (todaySpent < yesterdaySpent && yesterdaySpent > 0) {
    // Check yesterdaySpent > 0
    todayIndicator.innerHTML = `<i class="fas fa-arrow-down text-indicator-good spending-indicator" data-tooltip="Less than yesterday (${formatCurrency(
      yesterdaySpent
    )})"></i>`;
  } else {
    todayIndicator.innerHTML = ""; // No indicator if same or no comparison data
  }

  const sevenDayIndicator = $("#weekSpendingIndicator"); // This now compares rolling 7-day periods
  if (current7DaysSpent > previous7DaysSpent && previous7DaysSpent >= 0) {
    sevenDayIndicator.innerHTML = `<i class="fas fa-arrow-up text-indicator-bad spending-indicator" data-tooltip="More than previous 7 days (${formatCurrency(
      previous7DaysSpent
    )})"></i>`;
  } else if (current7DaysSpent < previous7DaysSpent && previous7DaysSpent > 0) {
    sevenDayIndicator.innerHTML = `<i class="fas fa-arrow-down text-indicator-good spending-indicator" data-tooltip="Less than previous 7 days (${formatCurrency(
      previous7DaysSpent
    )})"></i>`;
  } else {
    sevenDayIndicator.innerHTML = "";
  }
}

// --- CATEGORY BUDGETS DASHBOARD LOGIC ---

function renderCategoryBudgets() {
  const container = $("#categoryBudgetsProgressContainer");
  const card = $("#categoryBudgetsDashboardCard");
  if (!container || !card) return;

  if (!state.budgets || state.budgets.length === 0) {
    card.classList.add("hidden");
    return;
  }
  
  card.classList.remove("hidden");
  
  // Handle Collapsed State
  const toggleBtn = $("#toggleBudgetsCardBtn");
  const headerEl = card.querySelector(".flex.justify-between.items-center");
  const isCollapsed = localStorage.getItem("kaasi_collapseCategoryBudgets") === "true";
  
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isFirst5Days = now.getDate() <= 5;
  const lastDismissed = localStorage.getItem("kaasi_lastDismissedBudgetTipMonth");
  const isDismissedForThisMonth = lastDismissed === currentMonthStr;
  const showTip = isFirst5Days && !isDismissedForThisMonth;

  if (isCollapsed) {
    container.style.maxHeight = "0px";
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    if (headerEl) {
      if (showTip) {
        headerEl.classList.remove("mb-0");
        headerEl.classList.add("border-b", "border-gray-600", "pb-2", "mb-4");
      } else {
        headerEl.classList.remove("border-b", "border-gray-600", "pb-2", "mb-4");
        headerEl.classList.add("mb-0");
      }
    }
  } else {
    container.style.maxHeight = "";
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    if (headerEl) {
      headerEl.classList.remove("mb-0");
      headerEl.classList.add("border-b", "border-gray-600", "pb-2", "mb-4");
    }
  }

  // Monthly tip banner logic
  const tipContainer = $("#categoryBudgetsTipContainer");
  if (tipContainer) {
    if (showTip) {
      tipContainer.classList.remove("hidden");
      tipContainer.innerHTML = `
        <div class="flex items-start justify-between bg-accent-500/10 border border-accent-500/30 rounded-lg p-3 text-xs text-gray-300 relative">
          <div class="flex gap-2">
            <i class="fas fa-lightbulb text-accent-500 mt-0.5"></i>
            <div>
              <span class="font-semibold text-accent-400 text-[11px] block mb-0.5">Monthly Budget Check</span>
              It's the start of the month. Do you need to adjust or update your budget limits in Settings?
            </div>
          </div>
          <button id="dismissBudgetTipBtn" class="text-gray-400 hover:text-white ml-2 focus:outline-none" data-tooltip="Dismiss">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      const dismissBtn = $("#dismissBudgetTipBtn");
      if (dismissBtn) {
        dismissBtn.addEventListener("click", () => {
          localStorage.setItem("kaasi_lastDismissedBudgetTipMonth", currentMonthStr);
          tipContainer.classList.add("hidden");
          if (localStorage.getItem("kaasi_collapseCategoryBudgets") === "true" && headerEl) {
            headerEl.classList.remove("border-b", "border-gray-600", "pb-2", "mb-4");
            headerEl.classList.add("mb-0");
          }
        });
      }
    } else {
      tipContainer.classList.add("hidden");
    }
  }

  // Set up event listener if not already done
  if (toggleBtn && !toggleBtn.dataset.listenerAttached) {
    toggleBtn.addEventListener("click", () => {
      const currentlyCollapsed = localStorage.getItem("kaasi_collapseCategoryBudgets") === "true";
      const header = card.querySelector(".flex.justify-between.items-center");
      const tip = $("#categoryBudgetsTipContainer");
      const isTipVisible = tip && !tip.classList.contains("hidden");
      
      container.classList.add("collapsible-transition");

      if (currentlyCollapsed) {
        // Expand
        if (header) {
          header.classList.remove("mb-0");
          header.classList.add("border-b", "border-gray-600", "pb-2", "mb-4");
        }

        container.style.maxHeight = "0px";
        container.offsetHeight; // force reflow
        container.style.maxHeight = container.scrollHeight + "px";
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        localStorage.setItem("kaasi_collapseCategoryBudgets", "false");

        const onTransitionEnd = () => {
          if (localStorage.getItem("kaasi_collapseCategoryBudgets") === "false") {
            container.style.maxHeight = "";
          }
          container.classList.remove("collapsible-transition");
          container.removeEventListener("transitionend", onTransitionEnd);
        };
        container.addEventListener("transitionend", onTransitionEnd);
      } else {
        // Collapse
        container.style.maxHeight = container.scrollHeight + "px";
        container.offsetHeight; // force reflow
        container.style.maxHeight = "0px";
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        localStorage.setItem("kaasi_collapseCategoryBudgets", "true");

        const onTransitionEnd = () => {
          if (localStorage.getItem("kaasi_collapseCategoryBudgets") === "true") {
            if (header && !isTipVisible) {
              header.classList.remove("border-b", "border-gray-600", "pb-2", "mb-4");
              header.classList.add("mb-0");
            }
          }
          container.classList.remove("collapsible-transition");
          container.removeEventListener("transitionend", onTransitionEnd);
        };
        container.addEventListener("transitionend", onTransitionEnd);
      }
    });
    toggleBtn.dataset.listenerAttached = "true";
  }

  const activeBudgetIds = new Set(state.budgets.map(b => b.id));
  
  // Remove deleted budgets from DOM
  Array.from(container.children).forEach(child => {
    const budgetId = child.dataset.budgetId;
    if (budgetId && !activeBudgetIds.has(budgetId)) {
      child.remove();
    }
  });

  const sortedBudgets = typeof getSortedBudgets === "function" ? getSortedBudgets() : state.budgets;

  const updateFn = () => {
    sortedBudgets.forEach((budget, index) => {
      let spent = 0;
    
    // Sum transactions for the current calendar month that fall under the budget's categories
    state.transactions.forEach(t => {
      if (t.type === "expense" && t.date.startsWith(currentMonthStr)) {
        if (budget.categories.includes(t.category)) {
          spent += t.amount;
        }
      }
    });

    const percent = budget.limit > 0 ? (spent / budget.limit) * 100 : (spent > 0 ? 100 : 0);
    const isOver = spent > budget.limit;
    
    let colorClass = "bg-[#27AE60]"; // Emerald Green
    if (percent > 100) {
      colorClass = "bg-[#E74C3C]"; // Crimson Red
    } else if (percent > 70) {
      colorClass = "bg-orange-500"; // Amber/Orange
    }

    const remaining = budget.limit - spent;
    let statusText = isOver ? `${formatCurrency(Math.abs(remaining))} over limit` : `${formatCurrency(remaining)} left`;
    const tooltipText = `Spent: ${formatCurrency(spent)} / Limit: ${formatCurrency(budget.limit)}`;

    // Check if there is already an element for this budget ID
    let budgetItem = Array.from(container.children).find(child => child.dataset.budgetId === budget.id);
    const isNew = !budgetItem;
    
    if (isNew) {
      budgetItem = document.createElement("div");
      budgetItem.className = "group relative";
      budgetItem.dataset.budgetId = budget.id;
      budgetItem.innerHTML = `
        <div class="flex justify-between items-end mb-2">
          <span class="text-sm font-medium text-gray-200 truncate pr-2 budget-title"></span>
          <span class="text-xs font-semibold budget-status whitespace-nowrap"></span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity budget-progress-container">
          <div class="budget-progress h-2 rounded-full transition-all duration-500 ease-out" style="width: 0%"></div>
        </div>
      `;
      
      const clickHandler = () => {
        if (typeof window.openMonthlyViewWithCategories === "function") {
          window.openMonthlyViewWithCategories(budget.categories);
        }
      };
      
      const progressContainer = budgetItem.querySelector(".budget-progress-container");
      if (progressContainer) progressContainer.onclick = clickHandler;
    }

    const progressEl = budgetItem.querySelector(".budget-progress");
    const statusEl = budgetItem.querySelector(".budget-status");
    const titleEl = budgetItem.querySelector(".budget-title");

    if (statusEl) {
      if (!budget.categories || budget.categories.length === 0) {
        statusEl.className = 'text-xs font-semibold budget-status whitespace-nowrap text-orange-500';
        statusEl.dataset.tooltip = "No categories assigned";
        statusEl.textContent = "⚠️ 0 Categories";
      } else {
        statusEl.className = `text-xs font-semibold budget-status whitespace-nowrap ${isOver ? 'text-[#E74C3C]' : 'text-gray-400'}`;
        statusEl.dataset.tooltip = tooltipText;
        statusEl.textContent = `${statusText} (${percent.toFixed(1)}%)`;
      }
    }

    if (titleEl) {
      titleEl.textContent = budget.name;
      titleEl.dataset.tooltip = budget.categories.join(', ');
    }

    if (progressEl) {
      progressEl.classList.remove("bg-[#27AE60]", "bg-[#E74C3C]", "bg-orange-500");
      progressEl.classList.add(colorClass);

      if (isNew) {
        setTimeout(() => {
          progressEl.style.width = `${Math.min(percent, 100)}%`;
        }, 50);
      } else {
        progressEl.style.width = `${Math.min(percent, 100)}%`;
      }
    }

      // Only touch the DOM tree order if it's not already in the correct position
      if (container.children[index] !== budgetItem) {
        container.insertBefore(budgetItem, container.children[index] || null);
      }
    });
  };

  if (typeof animateListReorder === "function") {
    animateListReorder(container, updateFn);
  } else {
    updateFn();
  }
}
