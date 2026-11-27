/* Stage all changes on a copy so invalid rows and failed writes leave live balances intact. */
async function saveTransactionBatch(entries) {
  if (!entries.length) throw new Error("Add at least one entry.");
  const stored = new Map((KaasiStorage.current?.transactions || state.transactions).map(entry => [entry.id, entry]));
  const ids = new Set(entries.map(entry => entry.id));
  if (ids.size !== entries.length) throw new Error("This batch contains duplicate entry IDs.");
  const existing = entries.filter(entry => stored.has(entry.id));
  if (existing.length) {
    const matches = existing.every(entry => Object.keys(entry).every(key => stored.get(entry.id)[key] === entry[key]));
    if (matches && existing.length === entries.length) return;
    throw new Error("An entry ID is already in use. This batch was not saved.");
  }

  const next = structuredClone(state);
  const accounts = new Map(next.accounts.filter(account => !account.hidden).map(account => [account.id, account]));
  const lowBalances = new Set();
  for (const [index, entry] of entries.entries()) {
    const account = accounts.get(entry.account);
    const date = new Date(entry.date + "T00:00:00Z");
    const validDate = Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === entry.date;
    if (!account || !["expense", "income"].includes(entry.type) || !validDate ||
        !entry.description.trim() || !Number.isSafeInteger(Math.round(entry.amount * 100)) || entry.amount <= 0 ||
        (entry.type === "expense" && !next.categories.includes(entry.category))) {
      throw new Error(`Check the details for entry ${index + 1}.`);
    }
    const change = entry.type === "income" ? entry.amount : -entry.amount;
    account.balance = roundToTwoDecimals(account.balance + change);
    if (!Number.isSafeInteger(Math.round(account.balance * 100))) {
      throw new Error(`The balance for entry ${index + 1} is outside the supported range.`);
    }
    if (entry.type === "expense" && account.balance < 0) lowBalances.add(account.name);
    next.transactions.push(entry);
  }
  await saveData(next);
  return lowBalances;
}

(() => {
  const modal = document.getElementById("batchEntryModal");
  const form = document.getElementById("batchEntryForm");
  const sheet = document.getElementById("batchSheet");
  const rows = document.getElementById("batchRows");
  const add = document.getElementById("batchAddRow");
  const review = document.getElementById("batchReview");
  const discard = document.getElementById("batchDiscard");
  const submit = document.getElementById("batchSubmit");
  const error = document.getElementById("batchError");
  let reviewedEntries = null;
  let saving = false;

  function editing() {
    reviewedEntries = null;
    sheet.hidden = add.hidden = false;
    review.hidden = true;
    review.replaceChildren();
    submit.textContent = "Review batch";
    error.textContent = "";
  }

  function addRow() {
    const previous = rows.lastElementChild;
    const row = document.createElement("tr");
    row.dataset.id = generateId();
    row.innerHTML = `
      <td><input type="text" name="description" autocomplete="off" spellcheck="false" autocorrect="off" autocapitalize="none" placeholder="Enter description" required></td>
      <td><input name="amount" type="number" inputmode="decimal" placeholder="0.00" min="0.01" step="0.01" max="90071992547409.91" required></td>
      <td><select name="type"><option value="expense">Expense</option><option value="income">Income</option></select></td>
      <td><input type="date" name="date" required></td>
      <td><select name="account" required></select></td>
      <td><select name="category" required></select><span class="batch-not-applicable" hidden>—</span></td>
      <td><button type="button" data-batch-remove>×</button></td>`;
    const field = name => row.querySelector(`[name="${name}"]`);
    for (const name of ["account", "category"]) {
      field(name).replaceChildren(...Array.from(document.getElementById(name).options, option => option.cloneNode(true)));
    }
    field("category").value = "";
    for (const option of field("account").options) {
      option.textContent = state.accounts.find(account => account.id === option.value)?.name || option.textContent;
    }
    field("date").value = previous?.querySelector('[name="date"]').value || getCurrentDateString();
    field("account").value = previous?.querySelector('[name="account"]').value || document.getElementById("account").value;
    field("type").value = previous?.querySelector('[name="type"]').value || "expense";
    const updateCategory = () => {
      const income = field("type").value === "income";
      field("category").disabled = income;
      field("category").hidden = income;
      row.querySelector(".batch-not-applicable").hidden = !income;
      if (income) field("category").removeAttribute("aria-invalid");
    };
    field("type").addEventListener("change", updateCategory);
    updateCategory();
    rows.append(row);
    numberRows();
    field("description").focus();
  }

  function numberRows() {
    Array.from(rows.children).forEach((row, index) => {
      for (const field of row.querySelectorAll("input, select")) {
        field.setAttribute("aria-label", `${field.name}, row ${index + 1}`);
      }
      const remove = row.querySelector("[data-batch-remove]");
      remove.disabled = rows.children.length === 1;
      remove.setAttribute("aria-label", `Remove entry ${index + 1}`);
    });
  }

  function showReview() {
    const invalid = [];
    for (const field of rows.querySelectorAll("input, select")) {
      if (!field.checkValidity()) invalid.push(field);
      if (field.validity.valid) field.removeAttribute("aria-invalid");
      else field.setAttribute("aria-invalid", "true");
    }
    if (invalid.length) {
      const first = invalid[0];
      error.textContent = `Row ${first.closest("tr").rowIndex}, ${first.name}. ${first.validationMessage}`;
      first.focus();
      return;
    }
    error.textContent = "";
    reviewedEntries = Array.from(rows.children, row => {
      const value = name => row.querySelector(`[name="${name}"]`).value;
      const type = value("type");
      return { id: row.dataset.id, type, date: value("date"), description: value("description").trim(),
        account: value("account"), category: type === "expense" ? value("category") : null,
        amount: roundToTwoDecimals(Number(value("amount"))), timestamp: Date.now() };
    });
    const totals = { expense: 0, income: 0 };
    const list = document.createElement("ol");
    for (const entry of reviewedEntries) {
      totals[entry.type] += Math.round(entry.amount * 100);
      const row = document.createElement("li");
      const detail = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = entry.description;
      const meta = document.createElement("small");
      const account = state.accounts.find(account => account.id === entry.account);
      meta.textContent = [entry.date, account?.name, entry.category].filter(Boolean).join(" · ");
      detail.append(title, meta);
      const amount = document.createElement("strong");
      amount.className = entry.type === "income" ? "text-income" : "text-expense";
      amount.textContent = (entry.type === "income" ? "+" : "−") + formatCurrency(entry.amount);
      row.append(detail, amount);
      list.append(row);
    }
    const summary = document.createElement("p");
    summary.textContent = `Income ${formatCurrency(totals.income / 100)} · Expenses ${formatCurrency(totals.expense / 100)}`;
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn btn-secondary";
    back.textContent = "Edit entries";
    back.onclick = () => { editing(); rows.querySelector('[name="description"]').focus(); };
    review.replaceChildren(summary, list, back);
    sheet.hidden = add.hidden = true;
    review.hidden = false;
    submit.textContent = `Save ${reviewedEntries.length} ${reviewedEntries.length === 1 ? "entry" : "entries"}`;
    back.focus();
  }

  document.getElementById("openBatchEntry").onclick = () => {
    if (isAppLocked()) return;
    openModalHelper(modal.id);
    if (!rows.children.length) addRow();
  };
  add.onclick = addRow;
  rows.onclick = event => {
    const remove = event.target.closest("[data-batch-remove]");
    if (!remove || rows.children.length === 1) return;
    remove.closest("tr").remove();
    numberRows();
    error.textContent = "";
    add.focus();
  };
  rows.oninput = event => {
    if (event.target.name === "description") {
      event.target.setCustomValidity(event.target.value.trim() ? "" : "Enter a description.");
    }
    if (event.target.validity?.valid) event.target.removeAttribute("aria-invalid");
  };
  discard.onclick = () => {
    if (!confirm("Discard this batch draft?")) return;
    rows.replaceChildren();
    editing();
    closeModal(modal.id);
  };

  form.onsubmit = async event => {
    event.preventDefault();
    if (saving || isAppLocked()) return;
    if (!reviewedEntries) { showReview(); return; }
    if (cloudSyncBusy || storageOperationPending) {
      error.textContent = "Wait for the current save or sync to finish, then try again.";
      return;
    }
    const entries = reviewedEntries;
    saving = true;
    submit.disabled = discard.disabled = true;
    review.querySelector("button").disabled = true;
    error.textContent = "";
    let lowBalances;
    try {
      lowBalances = await saveTransactionBatch(entries);
    } catch (cause) {
      error.textContent = cause.message;
      return;
    } finally {
      saving = false;
      submit.disabled = discard.disabled = false;
      review.querySelector("button").disabled = false;
    }
    rows.replaceChildren();
    editing();
    closeModal(modal.id);
    renderDashboard();
    populateDropdowns();
    for (const date of new Set(entries.map(entry => entry.date))) refreshMonthlyViewIfRelevant(date);
    showNotification(`${entries.length} ${entries.length === 1 ? "entry" : "entries"} saved.`, "success");
    if (lowBalances?.size) showNotification(`Expenses exceeded the available balance in ${[...lowBalances].join(", ")}.`, "warning");
  };
})();
