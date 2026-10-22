/** Manual whole-dataset sync. The existing user_data JSON format is unchanged. */
let cloudSyncRemote = null;
let cloudSyncReview = null;
let cloudSyncCheckSequence = 0;
let cloudSyncRemoteSequence = 0;
let cloudSyncBusy = false;

function cloudSyncBaselineKey(userId) { return `kaasi_cloud_sync_baseline_${userId}`; }
function cloudSyncBaseline(userId) {
  try {
    const value = JSON.parse(appPreferences.getItem(cloudSyncBaselineKey(userId)));
    return value?.userId === userId && /^[a-f0-9]{64}$/.test(value.hash) && typeof value.updatedAt === "string" ? value : null;
  } catch (_) { return null; }
}
function cloudSyncDirection(localHash, baseline, remote) {
  if (!remote.exists) return "local_newer";
  if (!baseline) return "review";
  const localChanged = localHash !== baseline.hash;
  const remoteChanged = remote.updatedAt !== baseline.updatedAt;
  return localChanged && remoteChanged ? "conflict" : remoteChanged ? "cloud_newer" : localChanged ? "local_newer" : "synced";
}
function cloudSyncAssertUser(userId) {
  if (isAppLocked()) throw new Error("Unlock Kaasi before syncing.");
  if (!supabaseUser || supabaseUser.id !== userId) throw new Error("Your signed-in account changed. Start Sync again.");
  if (!navigator.onLine) throw new Error("You are offline. Your saved data is unchanged; reconnect to sync.");
}
async function updateLocalCloudSyncStatus() {
  const userId = supabaseUser?.id;
  const json = lastPersistedStateJson;
  const sequence = ++cloudSyncCheckSequence;
  if (!userId || !json) return;
  try {
    const hash = await KaasiStorage.digest(JSON.parse(json));
    if (sequence !== cloudSyncCheckSequence || userId !== supabaseUser?.id || json !== lastPersistedStateJson) return;
    window.currentCloudSyncStatus = cloudSyncRemote?.userId === userId
      ? cloudSyncDirection(hash, cloudSyncBaseline(userId), cloudSyncRemote) : "unknown";
    updateHeaderShortcutButtons();
  } catch (_) { window.currentCloudSyncStatus = "unknown"; updateHeaderShortcutButtons(); }
}
async function readCloudSyncRow(userId, full = false) {
  cloudSyncAssertUser(userId);
  const { data, error } = await supabaseClient.from("user_data")
    .select(full ? "data, updated_at" : "updated_at").eq("user_id", userId).maybeSingle();
  cloudSyncAssertUser(userId);
  if (error) throw new Error(error.message || "The cloud could not be checked.");
  if (data && (typeof data.updated_at !== "string" || !Number.isFinite(Date.parse(data.updated_at)))) {
    throw new Error("The cloud backup has an invalid timestamp. No data was replaced.");
  }
  return data;
}
async function refreshCloudSyncStatus() {
  const userId = supabaseUser?.id;
  if (!userId || !supabaseClient || isAppLocked() || cloudSyncBusy) return;
  const sequence = ++cloudSyncRemoteSequence;
  const timeEl = $("#lastCloudBackupTime");
  try {
    const row = await readCloudSyncRow(userId);
    if (sequence !== cloudSyncRemoteSequence || cloudSyncBusy) return;
    cloudSyncRemote = { userId, exists: !!row, updatedAt: row?.updated_at ?? null };
    lastCloudSyncTimeString = row ? new Date(row.updated_at).toLocaleString() : "";
    if (timeEl) timeEl.textContent = row ? `Cloud copy updated: ${lastCloudSyncTimeString}` : "No cloud copy yet. Select Sync to upload.";
    await updateLocalCloudSyncStatus();
  } catch (_) {
    if (userId !== supabaseUser?.id || sequence !== cloudSyncRemoteSequence || cloudSyncBusy) return;
    cloudSyncRemote = null; window.currentCloudSyncStatus = "unknown";
    if (timeEl) timeEl.textContent = navigator.onLine ? "Cloud status unavailable. Select Sync to retry." : "Offline — cloud status has not been checked.";
    updateHeaderShortcutButtons();
  }
}
async function recordCloudSync(userId, snapshot, updatedAt, uploaded) {
  cloudSyncAssertUser(userId);
  const hash = await KaasiStorage.digest(snapshot);
  cloudSyncAssertUser(userId);
  appPreferences.setItem(cloudSyncBaselineKey(userId), JSON.stringify({ userId, hash, updatedAt }));
  // Keep legacy backup-reminder metadata usable, but never trust its unscoped hash as a sync baseline.
  appPreferences.setItem("lastSyncedCloudUpdatedAt", updatedAt);
  appPreferences.setItem("kaasi_synced_state_hash", generateDataHash(JSON.stringify(snapshot)));
  appPreferences.setItem("lastLocalCloudSync", Date.now().toString());
  if (uploaded) appPreferences.setItem("lastSuccessfulCloudBackupDate", getCurrentDateString());
  await appPreferences.flush();
  cloudSyncRemote = { userId, exists: true, updatedAt };
  lastCloudSyncTimeString = new Date(updatedAt).toLocaleString();
  $("#lastCloudBackupTime").textContent = `Cloud copy updated: ${lastCloudSyncTimeString}`;
  await updateLocalCloudSyncStatus();
}
async function assertCloudSyncLocal(context) {
  cloudSyncAssertUser(context.userId);
  if (storageOperationPending || KaasiStorage.stale || KaasiStorage.revision !== context.revision) {
    throw new Error("Local data changed. Start Sync again to compare the latest copies.");
  }
  const saved = await KaasiStorage.snapshot();
  if (await KaasiStorage.digest(saved) !== context.hash || KaasiStorage.revision !== context.revision) {
    throw new Error("Local data changed in another window. Reload before syncing.");
  }
  cloudSyncAssertUser(context.userId);
}
async function uploadCloudSync(context) {
  await assertCloudSyncLocal(context);
  const updatedAt = new Date(Math.max(Date.now(), context.updatedAt ? Date.parse(context.updatedAt) + 1 : 0)).toISOString();
  const payload = { data: context.local, updated_at: updatedAt };
  const table = supabaseClient.from("user_data");
  const query = context.updatedAt === null
    ? table.insert({ ...payload, user_id: context.userId })
    : table.update(payload).eq("user_id", context.userId).eq("updated_at", context.updatedAt);
  const { data, error } = await query.select("updated_at").maybeSingle();
  cloudSyncAssertUser(context.userId);
  if (error || !data) throw new Error(error?.code === "23505" || !error
    ? "The cloud copy changed. Nothing was overwritten; start Sync again."
    : error.message || "Upload failed. Your local copy is unchanged.");
  if (typeof data.updated_at !== "string" || !Number.isFinite(Date.parse(data.updated_at))) throw new Error("The cloud response could not be verified. Check Sync again before replacing either copy.");
  await recordCloudSync(context.userId, context.local, data.updated_at, true);
  showNotification(window.currentCloudSyncStatus === "local_newer"
    ? "Cloud copy updated. Changes made during upload still need syncing." : "Sync complete. This device's copy was uploaded.", "success");
}
async function downloadCloudSync(context) {
  if (KaasiStorage.mode !== "indexeddb") throw new Error("Complete the local storage upgrade before applying a cloud copy. Your saved data has not been replaced.");
  await assertCloudSyncLocal(context);
  const latest = await readCloudSyncRow(context.userId);
  if (!latest || latest.updated_at !== context.updatedAt) throw new Error("The cloud copy changed. Start Sync again before restoring.");
  await assertCloudSyncLocal(context);
  await applyImportedData(context.cloud, context.revision);
  // applyImportedData normalizes legacy optional defaults; baseline matches what was actually saved.
  await recordCloudSync(context.userId, KaasiStorage.current, context.updatedAt, false);
  if (state.settings.initialSetupDone && $("#initialSetupModal")?.style.display === "block") closeModal("initialSetupModal");
  showNotification("Sync complete. The cloud copy was applied. Your previous saved copy is retained for recovery.", "success");
}
function setCloudSyncBusy(busy) {
  cloudSyncBusy = busy;
  window.cloudBackupInProgress = busy;
  const button = $("#syncCloudBtn");
  if (button) { button.disabled = busy; button.innerHTML = busy ? '<i class="fas fa-spinner fa-spin mr-2"></i>Syncing…' : '<i class="fas fa-sync-alt mr-2"></i>Sync'; }
  updateHeaderShortcutButtons();
}
async function syncCloudData() {
  if (isAppLocked() || storageOperationPending || cloudSyncBusy) return;
  if (!supabaseUser || !supabaseClient) { showNotification("Sign in to sync with the cloud.", "info"); return; }
  setCloudSyncBusy(true);
  ++cloudSyncRemoteSequence;
  try {
    if (cloudSyncReview) { closeModal("cloudSyncModal"); cloudSyncReview = null; }
    const userId = supabaseUser.id;
    cloudSyncAssertUser(userId);
    const revision = KaasiStorage.revision;
    const local = await KaasiStorage.snapshot();
    const hash = await KaasiStorage.digest(local);
    const remote = await readCloudSyncRow(userId);
    const context = { userId, revision, local, hash, updatedAt: remote?.updated_at ?? null };
    await assertCloudSyncLocal(context);
    cloudSyncRemote = { userId, exists: !!remote, updatedAt: context.updatedAt };
    const direction = cloudSyncDirection(hash, cloudSyncBaseline(userId), cloudSyncRemote);
    if (direction === "synced") { showNotification("Already synced.", "success"); return; }
    if (direction === "local_newer") { await uploadCloudSync(context); return; }
    const full = await readCloudSyncRow(userId, true);
    if (!full || full.updated_at !== context.updatedAt) throw new Error("The cloud copy changed. Start Sync again.");
    context.cloud = prepareImportedData(full.data);
    context.cloudExport = full.data;
    await assertCloudSyncLocal(context);
    if (KaasiStorage.canonical(local) === KaasiStorage.canonical(context.cloud)) {
      await recordCloudSync(userId, local, context.updatedAt, false);
      showNotification("Already synced. Both copies contain the same data.", "success");
    } else if (direction === "cloud_newer") {
      await downloadCloudSync(context);
    } else {
      window.currentCloudSyncStatus = direction;
      cloudSyncReview = context;
      $("#cloudSyncDetails").open = false;
      $("#cloudSyncBackup").open = false;
      renderCloudSyncReview();
      openModalHelper("cloudSyncModal");
    }
  } catch (error) {
    cloudSyncRemote = null; window.currentCloudSyncStatus = "unknown";
    showNotification(`Sync stopped: ${error.message}`, "error", 10000);
  } finally { setCloudSyncBusy(false); }
}

/** Compare by record ID. Missing records are not classified as deletions. */
function cloudSyncDifferences(local, cloud) {
  const changes = [];
  const equal = (a, b) => KaasiStorage.canonical(a) === KaasiStorage.canonical(b);
  const sensitive = key => /pin|password|answer|secret|token|recovery/i.test(key);
  const safe = (value, key = "") => {
    if (sensitive(key)) return "[Hidden security value]";
    if (Array.isArray(value)) return value.map(item => safe(item));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, safe(entry, name)]));
    return value;
  };
  const compare = (area, label, a, b) => {
    if (equal(a, b)) return;
    let fields = a && b && typeof a === "object" && typeof b === "object"
      ? [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => !equal(a[key], b[key]))
        .map(key => ({ name: sensitive(key) ? "Security setting" : key, local: safe(a[key], key), cloud: safe(b[key], key) })) : [];
    if (a === undefined || b === undefined) {
      const record = a || b;
      if (record && typeof record === "object" && !Array.isArray(record)) fields = Object.keys(record).filter(key => !["id", "timestamp"].includes(key))
        .map(key => ({ name: sensitive(key) ? "Security setting" : key, local: a && safe(a[key], key), cloud: b && safe(b[key], key) }));
    }
    changes.push({ area, label, kind: a === undefined ? "Only in cloud" : b === undefined ? "Only on this device" : "Different values",
      fields: fields.length ? fields : [{ name: "Value", local: safe(a), cloud: safe(b) }] });
  };
  const collections = [["Accounts", "accounts"], ["Transactions", "transactions"], ["Credit card", "ccTransactions"],
    ["Debts", "debts"], ["Receivables", "receivables"], ["Installments", "installments"], ["Budgets", "budgets"]];
  for (const [area, key] of collections) {
    const a = key === "ccTransactions" ? local.creditCard.transactions : local[key];
    const b = key === "ccTransactions" ? cloud.creditCard.transactions : cloud[key];
    const left = new Map(a.map(row => [row.id, row])), right = new Map(b.map(row => [row.id, row]));
    for (const id of new Set([...left.keys(), ...right.keys()])) {
      const row = left.get(id) || right.get(id);
      compare(area, `${row.date || row.dateGiven || row.dueDate || ""} ${row.description || row.name || id}`.trim(), left.get(id), right.get(id));
    }
    if (a.length === b.length && a.every(row => right.has(row.id))) compare(area, "Record order", a.map(row => row.id), b.map(row => row.id));
  }
  compare("Credit card", "Card settings", { ...local.creditCard, transactions: undefined }, { ...cloud.creditCard, transactions: undefined });
  const omitted = new Set([...collections.map(([, key]) => key), "creditCard"]);
  for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    if (!omitted.has(key)) compare("Settings & categories", sensitive(key) ? "Security setting" : key, local[key], cloud[key]);
  }
  return changes;
}
function renderCloudSyncReview(page = 0) {
  const context = cloudSyncReview;
  if (!context) return;
  const changes = cloudSyncDifferences(context.local, context.cloud);
  const pageSize = 25, pages = Math.max(1, Math.ceil(changes.length / pageSize));
  const host = $("#cloudSyncDifferences"); host.replaceChildren();
  $("#cloudSyncDeviceCount").textContent = `${changes.filter(c => c.kind === "Only on this device").length} Device Only`;
  $("#cloudSyncCloudCount").textContent = `${changes.filter(c => c.kind === "Only in cloud").length} Cloud Only`;
  $("#cloudSyncChangedCount").textContent = `${changes.filter(c => c.kind === "Different values").length} Changed`;
  $("#cloudSyncSummary").setAttribute("aria-label", `${changes.length} differences`);
  const labels = { amount: "Amount", balance: "Balance", paidAmount: "Amount paid", paidOff: "Fully paid", originalAmount: "Original amount", remainingAmount: "Remaining amount", originalFullAmount: "Original total", monthlyAmount: "Monthly amount", limit: "Limit", type: "Type", date: "Date", description: "Description", account: "Account", category: "Category", name: "Name", ccPurchaseId: "Linked card purchase", timestamp: "Recorded time", hidden: "Hidden", totalMonths: "Total months", monthsLeft: "Months remaining", startDate: "Start date", dueDate: "Due date", dateGiven: "Date lent" };
  const money = new Set(["amount", "balance", "paidAmount", "originalAmount", "remainingAmount", "originalFullAmount", "monthlyAmount", "limit"]);
  const display = (value, key) => value === undefined ? "Absent" : money.has(key) && typeof value === "number" ? formatCurrency(value)
    : typeof value === "boolean" ? value ? "Yes" : "No" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
  for (const change of changes.slice(page * pageSize, (page + 1) * pageSize)) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const caption = document.createElement("span"); caption.className = "sync-entry-caption";
    const title = document.createElement("span"); title.className = "sync-entry-name";
    const dateLabel = change.label.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    title.textContent = dateLabel ? dateLabel[2] : change.label.replace(/^./, c => c.toUpperCase());
    const meta = document.createElement("span"); meta.className = "sync-entry-meta";
    const area = { Transactions: "Transaction", Accounts: "Account", Debts: "Debt", Receivables: "Receivable", Installments: "Installment", Budgets: "Budget", "Settings & categories": "Settings" }[change.area] || change.area;
    meta.textContent = dateLabel ? `${new Date(`${dateLabel[1]}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${area}` : area;
    caption.appendChild(title); caption.appendChild(meta);
    const badge = document.createElement("span"); badge.className = "sync-entry-badge";
    badge.textContent = { "Only on this device": "Device Only", "Only in cloud": "Cloud Only", "Different values": "Changed" }[change.kind];
    summary.appendChild(caption); summary.appendChild(badge);
    details.appendChild(summary);
    for (const field of change.fields) {
      const row = document.createElement("div"); row.className = "sync-diff-row";
      const name = document.createElement("strong"); name.textContent = labels[field.name] || field.name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase()); row.appendChild(name);
      for (const [label, value] of [["This device", field.local], ["Cloud", field.cloud]]) {
        const column = document.createElement("div"), heading = document.createElement("span"), text = document.createElement("pre");
        heading.textContent = label; text.textContent = display(value, field.name); column.appendChild(heading); column.appendChild(text); row.appendChild(column);
      }
      details.appendChild(row);
    }
    host.appendChild(details);
  }
  $("#cloudSyncPage").textContent = `${page + 1} / ${pages}`;
  $("#cloudSyncPagination").hidden = pages === 1;
  $("#cloudSyncPrevious").disabled = page === 0; $("#cloudSyncNext").disabled = page + 1 >= pages;
  $("#cloudSyncPrevious").onclick = () => renderCloudSyncReview(page - 1);
  $("#cloudSyncNext").onclick = () => renderCloudSyncReview(page + 1);
  $("#cloudSyncDetails").ontoggle = () => {
    $("#cloudSyncDetails").querySelector("summary").textContent = $("#cloudSyncDetails").open ? "Hide Differences" : "View Differences";
  };
  $("#cloudSyncDetails").ontoggle();
  $("#cloudSyncUseLocal").onclick = () => chooseCloudSyncCopy("local");
  $("#cloudSyncUseCloud").onclick = () => chooseCloudSyncCopy("cloud");
  $("#cloudSyncExportLocal").onclick = () => exportCloudSyncCopy("local");
  $("#cloudSyncExportCloud").onclick = () => exportCloudSyncCopy("cloud");
}
function exportCloudSyncCopy(which) {
  if (!cloudSyncReview || isAppLocked() || cloudSyncBusy) return;
  if (supabaseUser?.id !== cloudSyncReview.userId) { showNotification("Your signed-in account changed. Start Sync again.", "error"); return; }
  downloadKaasiSnapshot(which === "local" ? cloudSyncReview.local : cloudSyncReview.cloudExport, `kaasi-sync-${which}`);
}
function chooseCloudSyncCopy(which) {
  if (!cloudSyncReview || cloudSyncBusy || isAppLocked()) return;
  const context = cloudSyncReview;
  showConfirmationModal(which === "local" ? "Replace Cloud Copy?" : "Replace This Device's Copy?",
    which === "local" ? "This replaces the cloud dataset with this device's copy. Cloud-only entries will no longer be in the active cloud copy. Export both copies first if needed."
      : "This replaces this device's dataset with the cloud copy. Device-only entries will no longer be active. One previous local copy is retained for recovery.",
    which === "local" ? "Use This Device's Copy" : "Use Cloud Copy", "Cancel", async () => {
      if (cloudSyncBusy || isAppLocked() || cloudSyncReview !== context) return;
      setCloudSyncBusy(true);
      try {
        if (which === "local") await uploadCloudSync(context); else await downloadCloudSync(context);
        closeModal("cloudSyncModal"); cloudSyncReview = null;
      } catch (error) { showNotification(`Sync stopped: ${error.message}`, "error", 10000); }
      finally { setCloudSyncBusy(false); }
    });
}

function resetCloudSyncAccount(user) {
  if (cloudSyncReview && cloudSyncReview.userId !== user?.id) {
    cloudSyncReview = null;
    $("#cloudSyncDifferences").replaceChildren();
    for (const id of ["cloudSyncDeviceCount", "cloudSyncCloudCount", "cloudSyncChangedCount"]) $(`#${id}`).textContent = "";
    $("#cloudSyncModal").style.display = "none";
  }
  if (!user || cloudSyncRemote?.userId !== user.id) {
    cloudSyncRemote = null; window.currentCloudSyncStatus = "unknown"; ++cloudSyncCheckSequence; ++cloudSyncRemoteSequence;
  }
}

// Focus/online checks read metadata only. No timed or unattended data transfers.
let cloudSyncLastCheck = 0;
function checkVisibleCloudSync() {
  if (document.visibilityState === "hidden" || !window.uiInitialized || isAppLocked() || cloudSyncBusy || !supabaseUser) return;
  if (Date.now() - cloudSyncLastCheck < 10000) return;
  cloudSyncLastCheck = Date.now(); refreshCloudSyncStatus();
}
window.addEventListener("focus", checkVisibleCloudSync);
window.addEventListener("online", checkVisibleCloudSync);
window.addEventListener("offline", () => { cloudSyncLastCheck = 0; ++cloudSyncRemoteSequence; cloudSyncRemote = null; window.currentCloudSyncStatus = "unknown"; updateHeaderShortcutButtons(); });
document.addEventListener("visibilitychange", checkVisibleCloudSync);
