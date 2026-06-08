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
        <button class="text-xs accent-text hover:text-accent-hover focus:outline-none" onclick="openEditTransactionModal('${
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

        const origAmt = d.originalAmount || d.amount || d.remainingAmount;
        const percentagePaid = origAmt > 0 ? ((origAmt - d.remainingAmount) / origAmt) * 100 : 0;
        let progressBarHtml = "";
        if (percentagePaid > 0) {
          progressBarHtml = `
            <div class="w-full bg-gray-700 rounded-full h-1.5 mt-2 mb-1" title="${percentagePaid.toFixed(1)}% Paid">
              <div class="bg-income h-1.5 rounded-full transition-all duration-500" style="width: ${percentagePaid}%"></div>
            </div>
          `;
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
          const origAmt = r.originalAmount || r.amount || r.remainingAmount;
          const percentagePaid = origAmt > 0 ? ((origAmt - r.remainingAmount) / origAmt) * 100 : 0;
          let progressBarHtml = "";
          if (percentagePaid > 0) {
            progressBarHtml = `
              <div class="w-full bg-gray-700 rounded-full h-1.5 mt-2 mb-1" title="${percentagePaid.toFixed(1)}% Received">
                <div class="bg-income h-1.5 rounded-full transition-all duration-500" style="width: ${percentagePaid}%"></div>
              </div>
            `;
          }

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
        : `${daysLeft} day(s) left`;
    const totalLeftToPay = i.monthlyAmount * i.monthsLeft;
    const progressPercent =
      i.totalMonths > 0
        ? ((i.totalMonths - i.monthsLeft) / i.totalMonths) * 100
        : 0;

    const div = document.createElement("div");
    div.className = "p-3 rounded bg-gray-700/50 text-sm mb-2";

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
        <div class="edit-btn-container flex items-center justify-end gap-x-4">
            ${
              i.monthsLeft > 0
                ? `
                <button class="text-sm text-income hover:opacity-80 focus:outline-none transition-opacity" onclick="payInstallmentMonth('${i.id}')" title="Pay Installment"><i class="fas fa-credit-card"></i></button>
                <button class="text-sm text-gray-400 hover:text-gray-200 focus:outline-none transition-colors" onclick="openEditInstallmentForm('${i.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              `
                : `
                <button class="text-sm text-gray-400 hover:text-gray-200 focus:outline-none transition-colors" onclick="openEditInstallmentForm('${i.id}')" title="Edit"><i class="fas fa-edit"></i></button>
              `
            }
            <button class="text-sm text-gray-500 hover:text-expense focus:outline-none transition-colors" onclick="deleteInstallment('${
              i.id
            }')" title="Delete"><i class="fas fa-times"></i></button>
        </div>
    `;

    div.innerHTML = `
      <!-- DESKTOP VIEW (v5.129k Baseline, completely untouched) -->
      <div class="hidden md:flex items-center gap-x-3 w-full">
          ${ringHtml}
          <div class="flex-grow flex justify-between items-start ml-2 min-w-0">
              <div class="flex flex-col min-w-0 pr-2">
                  <p class="text-sm md:text-base font-medium truncate mb-0.5">${i.description}</p>
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
                  <p class="text-sm font-medium truncate mb-0.5">${i.description}</p>
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

function renderMonthlyOverviewChart() {
  const canvas = $("#monthlyOverviewChart");
  if (!canvas) return;

  const chartTitleEl = $("#dashboardChartTitle");
  const toggleBtn = $("#toggleChartBtn");
  const toggleBtnIcon = toggleBtn ? toggleBtn.querySelector("i") : null;


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

  // Use CSS variables for income/expense instead of hardcoded hexes
  const incomeColor = computedStyle.getPropertyValue("--chart-income-color").trim() || computedStyle.getPropertyValue("--income-color").trim() || "#2a9d8f";
  const expenseColor = computedStyle.getPropertyValue("--chart-expense-color").trim() || computedStyle.getPropertyValue("--expense-color").trim() || "#e74c3c";

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
        tDate.getFullYear() === currentYear &&
        !isCategoryExcluded(t.category || "Other", 'excludeFromDashboardCharts')
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
          else if (t.type === "expense" && !isCategoryExcluded(t.category || "Other", 'excludeFromDashboardCharts')) monthlyExpense += t.amount;
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

  // --- Create or Update the Chart ---
  if (monthlyOverviewChartInstance) {
    // Optimization: Update data and options instead of destroying the canvas
    monthlyOverviewChartInstance.data.labels = chartLabels;
    monthlyOverviewChartInstance.data.datasets = chartDatasets;
    
    // Update theme-dependent options in case the user toggled light/dark mode
    if (monthlyOverviewChartInstance.options && monthlyOverviewChartInstance.options.scales) {
      monthlyOverviewChartInstance.options.scales.y.ticks.color = chartTickColor;
      monthlyOverviewChartInstance.options.scales.y.grid.color = chartGridColor;
      monthlyOverviewChartInstance.options.scales.x.ticks.color = chartTickColor;
      monthlyOverviewChartInstance.options.plugins.legend.labels.color = chartLegendColor;
      monthlyOverviewChartInstance.options.plugins.tooltip.backgroundColor = chartTooltipBg;
      monthlyOverviewChartInstance.options.plugins.tooltip.titleColor = chartTooltipText;
      monthlyOverviewChartInstance.options.plugins.tooltip.bodyColor = chartTooltipText;
    }
    
    monthlyOverviewChartInstance.update();
  } else {
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
  if (typeof trackEvent === "function") trackEvent(`add_${type}`, "Engagement");

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
                <input type="text" inputmode="decimal" class="calc-amount" id="modalAmount" name="amount" value="${transaction.amount.toFixed(
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
  if (typeof trackEvent === "function") trackEvent("edit_transaction", "Engagement");

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
      if (typeof trackEvent === "function") trackEvent("delete_transaction", "Engagement");
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

  allTransactionsInMonth.forEach((t) => {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else if (t.type === "expense") {
      const category = t.category || "Other";
      const isExcluded = isCategoryExcluded(category, 'excludeFromMonthlyTotals');
      
      if (!isExcluded) {
        totalExpense += t.amount;
      }
      
      // Still accumulate in categoryTotals for the breakdown list (will be greyed out)
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
        .filter((t) => t.type === "expense" && !isCategoryExcluded(t.category || "Other", 'excludeFromMonthlyTotals'))
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

          const isExcluded = t.type === "expense" && isCategoryExcluded(t.category || "Other", 'dimInTransactionLists');
          const opacityClass = isExcluded ? "opacity-50" : "";
          const tooltipSuffix = isExcluded ? " (Hidden Category)" : "";

          itemDiv.innerHTML = `
              <div class="flex-grow mr-2 overflow-hidden ${opacityClass}">
                <p class="font-medium truncate ${textColorClass}" title="${
            t.description
          }${tooltipSuffix}">${t.description}</p>
                <p class="text-xs text-gray-400 mt-0.5">${subDetailText}</p>
              </div>
              <span class="font-semibold whitespace-nowrap ${textColorClass} ml-2 tabular-nums ${opacityClass}" title="${isExcluded ? 'Excluded from totals' : ''}">${
            isIncome ? "+" : "-"
          }${formatCurrency(t.amount)}</span>
              <div class="edit-btn-container flex-shrink-0 ml-2">
                <button class="text-xs accent-text hover:text-accent-hover focus:outline-none" onclick="openEditTransactionModal('${
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
      const isExcluded = isCategoryExcluded(category, 'excludeFromMonthlyTotals');
      const li = document.createElement("li");
      const opacityClass = isExcluded ? "opacity-50" : "";
      const tooltip = isExcluded ? `title="${category} (Hidden Category)"` : `title="${category}"`;
      li.innerHTML = `<span class="truncate pr-2 ${opacityClass}" ${tooltip}>${category}</span><span class="font-medium whitespace-nowrap tabular-nums ${opacityClass}" ${tooltip}>${formatCurrency(
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
    const pieDataCategories = sortedCategories.filter(([c, _]) => !isCategoryExcluded(c, 'excludeFromPieChart'));
    const pieData = {
      labels: pieDataCategories.map(([c, _]) => c),
      values: pieDataCategories.map(([_, a]) => a),
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

  const computedStyle = getComputedStyle(document.documentElement);
  const chartTooltipBg = computedStyle.getPropertyValue("--chart-tooltip-bg").trim() || "rgba(0,0,0,0.85)";
  const chartTooltipText = computedStyle.getPropertyValue("--chart-tooltip-text").trim() || "#fff";

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
    "#2a9d8f",
    "#e74c3c",
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
            backgroundColor: chartTooltipBg,
            titleColor: chartTooltipText,
            bodyColor: chartTooltipText,
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
        if (ccHistoryFilter === "paid" && !t.paidOff && (!t.paidAmount || t.paidAmount <= 0)) return false;

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

        const allMonthTransactions = (state.creditCard.transactions || []).filter(t => {
          const tDate = new Date(t.date);
          if (tDate.getFullYear() !== selectedYear || tDate.getMonth() !== Number(monthKey)) return false;
          if (searchTerm) {
            const descriptionMatch = t.description.toLowerCase().includes(searchTerm);
            const amountMatch = t.amount.toFixed(2).includes(searchTerm);
            if (!descriptionMatch && !amountMatch) return false;
          }
          return true;
        });

        let totalSpentInMonth = 0;
        if (ccHistoryFilter === "unpaid") {
          totalSpentInMonth = allMonthTransactions.reduce((sum, t) => sum + (t.paidOff ? 0 : (t.amount - (t.paidAmount || 0))), 0);
        } else if (ccHistoryFilter === "paid") {
          totalSpentInMonth = allMonthTransactions.reduce((sum, t) => sum + (t.paidOff ? t.amount : (t.paidAmount || 0)), 0);
        } else {
          totalSpentInMonth = allMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
        }

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
                      ? `<button class="text-xs text-income hover:opacity-80 focus:outline-none mr-2" onclick="openPayCcItemForm('${t.id}')" title="Pay Item"><i class="fas fa-credit-card"></i></button>`
                      : ""
                  }
                  <button class="text-xs text-gray-400 hover:text-gray-200 transition-colors focus:outline-none mr-2" onclick="openEditCcTransactionForm('${
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
                      : (ccHistoryFilter === "paid" ? "text-gray-400" : "text-expense")
                  }">
                      ${
                        t.paidOff
                          ? formatCurrency(t.amount)
                          : remainingOnItem <= 0.005
                          ? formatCurrency(remainingOnItem) + " (Settled)"
                          : ccHistoryFilter === "paid"
                          ? formatCurrency(t.paidAmount) + " Paid of " + formatCurrency(t.amount)
                          : formatCurrency(remainingOnItem) + " Left"
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
    closeModal("ccHistoryModal");
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
    `<div><label for="debtAmount" class="block text-sm font-medium mb-1">Amount Owed (LKR)</label><input type="text" inputmode="decimal" class="calc-amount" id="debtAmount" name="debtAmount" step="0.01" min="0.01" required></div><div><label for="debtWho" class="block text-sm font-medium mb-1">Who do you owe?</label><input type="text" id="debtWho" name="debtWho" placeholder="e.g., John Doe" required></div><div><label for="debtWhy" class="block text-sm font-medium mb-1">Reason?</label><input type="text" id="debtWhy" name="debtWhy" placeholder="e.g., Loan" required></div><div><label for="debtDueDate" class="block text-sm font-medium mb-1">Due Date</label><input type="date" id="debtDueDate" name="debtDueDate" required></div><button type="submit" class="btn btn-primary w-full">Add Debt</button>`,
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
    }"> <div><label class="block text-sm font-medium mb-1">Original Amount</label><input type="text" inputmode="decimal" class="calc-amount" name="debtOriginalAmount" value="${(
      d.originalAmount || d.amount
    ).toFixed(
      2
    )}" step="0.01" min="0.01" required></div> <div><label class="block text-sm font-medium mb-1">Remaining Amount</label><input type="text" inputmode="decimal" class="calc-amount" name="debtRemainingAmount" value="${d.remainingAmount.toFixed(
      2
    )}" step="0.01" min="0" required></div> <div><label class="block text-sm font-medium mb-1">Who</label><input type="text" name="debtWho" value="${
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
          <input type="text" inputmode="decimal" class="calc-amount" id="payDebtAmount" name="payDebtAmount" step="0.01" min="0.01" max="${debt.remainingAmount.toFixed(
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
            <div><label for="recAmount" class="block text-sm font-medium mb-1">Amount Owed (LKR)</label><input type="text" inputmode="decimal" class="calc-amount" id="recAmount" name="recAmount" step="0.01" min="0.01" required></div>
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
    }"> <div><label class="block text-sm font-medium mb-1">Original Amount</label><input type="text" inputmode="decimal" class="calc-amount" name="recOriginalAmount" value="${(
      r.originalAmount || r.amount
    ).toFixed(
      2
    )}" step="0.01" min="0.01" required></div> <div><label class="block text-sm font-medium mb-1">Remaining</label><input type="text" inputmode="decimal" class="calc-amount" name="recRemainingAmount" value="${r.remainingAmount.toFixed(
      2
    )}" step="0.01" min="0" required></div> <div><label class="block text-sm font-medium mb-1">Type</label><select id="recTypeEdit" name="recType" onchange="toggleReceivableSourceAccount(this.value, 'recSourceAccountGroupEdit', 'recSourceAccountEdit')"><option value="cash" ${
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
      <input type="text" inputmode="decimal" class="calc-amount" id="recPaymentAmount" name="recPaymentAmount" step="0.01" min="0.01" 
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
      <input type="text" inputmode="decimal" class="calc-amount" id="instFullAmount" name="instFullAmount" step="0.01" min="0.01" placeholder="Total original cost" required>
    </div>
    <div>
      <label for="instTotalMonths" class="block text-sm font-medium mb-1">Total Months for Plan</label>
      <input type="text" inputmode="decimal" class="calc-amount" id="instTotalMonths" name="instTotalMonths" step="1" min="1" placeholder="e.g., 12" required>
    </div>
    <div>
      <label for="instMonthsLeft" class="block text-sm font-medium mb-1">Months Left (if not full term)</label>
      <input type="text" inputmode="decimal" class="calc-amount" id="instMonthsLeft" name="instMonthsLeft" step="1" min="0" placeholder="Defaults to Total Months">
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
      <input type="text" inputmode="decimal" class="calc-amount" id="instFullAmount" name="instFullAmount" value="${currentFullAmount.toFixed(
        2
      )}" step="0.01" min="0.01" required>
    </div>
    <div>
      <label for="instTotalMonths" class="block text-sm font-medium mb-1">Total Months for Plan</label>
      <input type="text" inputmode="decimal" class="calc-amount" id="instTotalMonths" name="instTotalMonths" value="${
        i.totalMonths
      }" step="1" min="1" required>
    </div>
    <div>
      <label for="instMonthsLeft" class="block text-sm font-medium mb-1">Months Left</label>
      <input type="text" inputmode="decimal" class="calc-amount" id="instMonthsLeft" name="instMonthsLeft" value="${
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
          <input type="text" inputmode="decimal" class="calc-amount" id="ccItemPayAmount" name="ccItemPayAmount" step="0.01" min="0.01" max="${remaining.toFixed(
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

