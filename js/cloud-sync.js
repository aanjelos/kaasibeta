/** Automatic and manual whole-dataset sync. Never merge or choose conflicting copies silently. */
let cloudSyncRemote = null;
let cloudSyncReview = null;
let cloudSyncCheckSequence = 0;
let cloudSyncRemoteSequence = 0;
let cloudSyncBusy = false;
let cloudSyncActivity = 0;
let cloudSyncFeedback = '';
const automaticCloudReviewsSeen = new Set();
function automaticSyncPaused() { return appPreferences.getItem('kaasi_auto_sync_paused') === 'true'; }
async function persistSyncPause() {
  appPreferences.setItem('kaasi_auto_sync_paused','true');
  clearTimeout(automaticCloudSyncTimer);
  await appPreferences.flush();
  updateHeaderShortcutButtons();
}
async function pauseAutomaticSync() {
  if (cloudSyncBusy || storageOperationPending) { showNotification('Wait for the current operation to finish.', 'info'); return; }
  await persistSyncPause();
}
function openCloudSyncSettings() {
  if (isAppLocked()) return;
  if ($('#settingsModal')?.style.display !== 'block') openSettingsModal();
  SettingsWorkspace.navigate('settingsDataManagementPanel');
  $('#cloudBackupLoggedIn')?.scrollIntoView?.({block:'center',behavior:'smooth'});
}
async function finishSyncResume(context) {
  if (!context.resume) return;
  appPreferences.removeItem('kaasi_auto_sync_paused');
  await appPreferences.flush();
}
function updateSyncPauseControls() {
  const paused=automaticSyncPaused();
  const actions={pauseAutomaticSyncBtn:pauseAutomaticSync,resumeAutomaticSyncBtn:()=>syncCloudData({resume:true}),reviewPausedCopiesBtn:()=>syncCloudData({reviewOnly:true}),manualCloudUploadBtn:()=>manualCloudTransfer('local'),manualCloudRestoreBtn:()=>manualCloudTransfer('cloud')};
  for(const [id,action] of Object.entries(actions)){const button=document.getElementById(id);if(button){button.onclick=action;button.disabled=cloudSyncBusy||storageOperationPending;}}
  const pause=document.getElementById('pauseAutomaticSyncBtn');if(pause){pause.hidden=paused;pause.style.display=paused?'none':'';}
  const controls=document.getElementById('pausedCloudActions');if(controls)controls.hidden=!paused;
  const sync=$('#syncCloudBtn');if(sync?.parentElement){sync.parentElement.hidden=paused;sync.parentElement.style.display=paused?'none':'';}
  const review=document.getElementById('reviewPausedCopiesBtn');if(review)review.style.display=paused && window.currentCloudSyncStatus==='conflict'?'':'none';
  const hint=document.getElementById('automaticSyncDescription');
  if(hint)hint.textContent=paused ? 'Uploads and downloads are paused on this device.' : 'Changes sync automatically when you’re online.';
  const warning=document.getElementById('pausedSyncWarning');
  if(warning){warning.hidden=!paused||!['conflict','local_newer','cloud_newer'].includes(window.currentCloudSyncStatus);warning.textContent=window.currentCloudSyncStatus==='conflict' ? 'This device and the cloud have different changes. Review copies before replacing either.' : window.currentCloudSyncStatus==='local_newer' ? 'This device has changes that have not been uploaded.' : window.currentCloudSyncStatus==='cloud_newer' ? 'A newer cloud copy is available. Your device has not been replaced.' : '';}
}
async function manualCloudTransfer(which) {
  if (cloudSyncBusy || storageOperationPending || isAppLocked()) return;
  setCloudSyncBusy(true);
  try {
    const userId=supabaseUser?.id;cloudSyncAssertUser(userId);
    const revision=KaasiStorage.revision,local=portableKaasiData(await KaasiStorage.snapshot());
    const row=await readCloudSyncRow(userId,which==='cloud');
    if(which==='cloud'&&!row)throw new Error('There is no cloud copy to restore.');
    const context={userId,revision,local,hash:await KaasiStorage.digest(local),updatedAt:row?.updated_at??null,automatic:false};
    if(which==='cloud')context.cloud=portableKaasiData(prepareImportedData(row.data));
    await assertCloudSyncLocal(context);cloudSyncReview=context;
  } catch(error){showNotification(error.message,'error');return;}
  finally{setCloudSyncBusy(false);}
  chooseCloudSyncCopy(which);
}

function cloudSyncDownloadSafe(context) {
  return document.visibilityState !== 'hidden' && !storageOperationPending &&
    context.activity === cloudSyncActivity &&
    !['amount','description','ccAmount','ccDescription'].some(id => document.getElementById(id)?.value?.trim()) &&
    !document.activeElement?.matches?.('input,select,textarea,[contenteditable="true"]') &&
    ![...document.querySelectorAll('.modal')].some(modal => getComputedStyle(modal).display !== 'none');
}

function cloudSyncStatusText() {
  if (!supabaseUser) return '';
  if (cloudSyncBusy) return 'Syncing…';
  if (automaticSyncPaused()) return 'Sync Paused';
  if (!navigator.onLine) return 'Offline';
  const status = window.currentCloudSyncStatus;
  if (status === 'review' || status === 'conflict') return 'Review Changes';
  if (cloudSyncFeedback) return 'Sync Pending';
  if (status === 'local_newer') return 'Waiting to Sync';
  if (status === 'cloud_newer') return 'Update Pending';
  return status === 'synced' ? 'Up to Date' : 'Checking…';
}

function cloudSyncBaselineKey(userId) { return `kaasi_cloud_sync_baseline_${userId}`; }
function cloudSyncBaseline(userId) {
  try {
    const value = JSON.parse(appPreferences.getItem(cloudSyncBaselineKey(userId)));
    return value?.userId === userId && /^[a-f0-9]{64}$/.test(value.hash) && typeof value.updatedAt === "string" ? value : null;
  } catch (_) { return null; }
}
async function portableCloudBaseline(userId, snapshot) {
  const baseline = cloudSyncBaseline(userId);
  if (baseline && !baseline.portable && baseline.hash === await KaasiStorage.digest(snapshot)) {
    const migrated = { ...baseline, portable: true, hash: await KaasiStorage.digest(portableKaasiData(snapshot)) };
    if (JSON.stringify(cloudSyncBaseline(userId)) !== JSON.stringify(baseline)) return cloudSyncBaseline(userId);
    appPreferences.setItem(cloudSyncBaselineKey(userId), JSON.stringify(migrated));
    return migrated;
  }
  return baseline;
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
function formatCloudBackupTime(updatedAt, now = new Date()) {
  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) return "Unavailable";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const day = date.toDateString() === now.toDateString() ? "Today"
    : date.toDateString() === yesterday.toDateString() ? "Yesterday"
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
  return `${day} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}
async function updateLocalCloudSyncStatus() {
  const userId = supabaseUser?.id;
  const json = lastPersistedStateJson;
  const sequence = ++cloudSyncCheckSequence;
  if (!userId || !json) return;
  try {
    const hash = await KaasiStorage.digest(portableKaasiData(JSON.parse(json)));
    const baseline = await portableCloudBaseline(userId, JSON.parse(json));
    if (sequence !== cloudSyncCheckSequence || userId !== supabaseUser?.id || json !== lastPersistedStateJson) return;
    window.currentCloudSyncStatus = cloudSyncRemote?.userId === userId
      ? cloudSyncDirection(hash, baseline, cloudSyncRemote) : "unknown";
    updateHeaderShortcutButtons();
  } catch (_) { window.currentCloudSyncStatus = "unknown"; updateHeaderShortcutButtons(); }
}
async function readCloudSyncRow(userId, full = false) {
  cloudSyncAssertUser(userId);
  const { data, error } = await cloudSyncRequest(supabaseClient.from("user_data")
    .select(full ? "data, updated_at" : "updated_at").eq("user_id", userId));
  cloudSyncAssertUser(userId);
  if (error) throw new Error(error.message || "The cloud could not be checked.");
  if (data && (typeof data.updated_at !== "string" || !Number.isFinite(Date.parse(data.updated_at)))) {
    throw new Error("The cloud backup has an invalid timestamp. No data was replaced.");
  }
  return data;
}
async function cloudSyncRequest(query) {
  let timer;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  if (controller && typeof query.abortSignal === 'function') query = query.abortSignal(controller.signal);
  try {
    return await Promise.race([query.maybeSingle(), new Promise((_, reject) => {
      timer = setTimeout(() => { reject(new Error('The cloud request timed out. Your local data is saved; Sync will retry.')); controller?.abort(); }, 20000);
    })]);
  } finally { clearTimeout(timer); }
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
    lastCloudSyncTimeString = row ? formatCloudBackupTime(row.updated_at) : "";
    if (timeEl) timeEl.textContent = row ? `Last backed up: ${lastCloudSyncTimeString}` : "No cloud copy yet. Select Sync to upload.";
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
  const hash = await KaasiStorage.digest(portableKaasiData(snapshot));
  cloudSyncAssertUser(userId);
  appPreferences.setItem(cloudSyncBaselineKey(userId), JSON.stringify({ userId, hash, updatedAt, portable: true }));
  appPreferences.setItem('kaasi_cloud_data_owner', userId);
  // Keep legacy backup-reminder metadata usable, but never trust its unscoped hash as a sync baseline.
  appPreferences.setItem("lastSyncedCloudUpdatedAt", updatedAt);
  appPreferences.setItem("kaasi_synced_state_hash", generateDataHash(JSON.stringify(snapshot)));
  appPreferences.setItem("lastLocalCloudSync", Date.now().toString());
  if (uploaded) appPreferences.setItem("lastSuccessfulCloudBackupDate", getCurrentDateString());
  await appPreferences.flush();
  cloudSyncRemote = { userId, exists: true, updatedAt };
  lastCloudSyncTimeString = formatCloudBackupTime(updatedAt);
  $("#lastCloudBackupTime").textContent = `Last backed up: ${lastCloudSyncTimeString}`;
  await updateLocalCloudSyncStatus();
}
async function assertCloudSyncLocal(context) {
  cloudSyncAssertUser(context.userId);
  if (storageOperationPending || KaasiStorage.stale || KaasiStorage.revision !== context.revision) {
    throw new Error("Local data changed. Start Sync again to compare the latest copies.");
  }
  const saved = await KaasiStorage.snapshot();
  if (await KaasiStorage.digest(portableKaasiData(saved)) !== context.hash || KaasiStorage.revision !== context.revision) {
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
  const { data, error } = await cloudSyncRequest(query.select("updated_at"));
  cloudSyncAssertUser(context.userId);
  if (error || !data) throw new Error(error?.code === "23505" || !error
    ? "The cloud copy changed. Nothing was overwritten; start Sync again."
    : error.message || "Upload failed. Your local copy is unchanged.");
  if (typeof data.updated_at !== "string" || !Number.isFinite(Date.parse(data.updated_at))) throw new Error("The cloud response could not be verified. Check Sync again before replacing either copy.");
  await recordCloudSync(context.userId, context.local, data.updated_at, true);
  await finishSyncResume(context);
  if (!context.automatic) showNotification(context.resume ? 'Automatic sync resumed.' : window.currentCloudSyncStatus === "local_newer"
    ? "Cloud copy updated. Changes made during upload still need syncing." : "Sync complete. This device's copy was uploaded.", "success");
}
async function downloadCloudSync(context) {
  if (KaasiStorage.mode !== "indexeddb") throw new Error("Complete the local storage upgrade before applying a cloud copy. Your saved data has not been replaced.");
  await assertCloudSyncLocal(context);
  const latest = await readCloudSyncRow(context.userId);
  if (!latest || latest.updated_at !== context.updatedAt) throw new Error("The cloud copy changed. Start Sync again before restoring.");
  await assertCloudSyncLocal(context);
  if (context.automatic && !cloudSyncDownloadSafe(context)) return;
  // Briefly prevent new draft input during the atomic local replacement and rerender.
  const content = context.automatic ? document.getElementById('app-content') : null;
  const wasInert = content?.inert;
  if (content) content.inert = true;
  try { await applyImportedData(context.cloud, context.revision, {source:'cloud'}); }
  finally { if (content) content.inert = wasInert || isAppLocked(); }
  // applyImportedData normalizes legacy optional defaults; baseline matches what was actually saved.
  await recordCloudSync(context.userId, KaasiStorage.current, context.updatedAt, false);
  await finishSyncResume(context);
  if (state.settings.initialSetupDone && $("#initialSetupModal")?.style.display === "block") closeModal("initialSetupModal");
  if (!context.automatic) showNotification(context.resume ? 'Automatic sync resumed.' : "Sync complete. The cloud copy was applied.", "success");
}
function setCloudSyncBusy(busy) {
  cloudSyncBusy = busy;
  window.cloudBackupInProgress = busy;
  const button = $("#syncCloudBtn");
  button?.setAttribute("aria-busy", String(busy));
  if (button) { button.disabled = busy; button.innerHTML = busy ? '<i class="fas fa-spinner fa-spin mr-2"></i>Syncing…' : '<i class="fas fa-sync-alt mr-2"></i>Sync'; }
  updateHeaderShortcutButtons();
}
async function syncCloudData(options = {}) {
  const automatic = options.automatic === true;
  const resume = options.resume === true;
  if (!automatic && !resume && !options.reviewOnly && automaticSyncPaused()) { openCloudSyncSettings(); return; }
  if (automatic && automaticSyncPaused()) return;
  if (isAppLocked() || storageOperationPending || cloudSyncBusy) return;
  if (automatic && !automaticCloudSyncEnabled()) return;
  if (!supabaseUser || !supabaseClient) { showNotification("Sign in to sync with the cloud.", "info"); return; }
  cloudSyncFeedback = '';
  setCloudSyncBusy(true);
  ++cloudSyncRemoteSequence;
  try {
    if (cloudSyncReview && !automatic) { closeModal("cloudSyncModal"); cloudSyncReview = null; }
    const userId = supabaseUser.id;
    const activity = cloudSyncActivity;
    cloudSyncAssertUser(userId);
    const revision = KaasiStorage.revision;
    const saved = await KaasiStorage.snapshot();
    const baseline = await portableCloudBaseline(userId, saved);
    const local = portableKaasiData(saved);
    const hash = await KaasiStorage.digest(local);
    const remote = await readCloudSyncRow(userId);
    if(options.reviewOnly && !remote)throw new Error('There is no cloud copy to compare. Use Upload to Cloud if you want to create one.');
    const context = { userId, revision, local, hash, automatic, resume, activity, updatedAt: remote?.updated_at ?? null };
    await assertCloudSyncLocal(context);
    cloudSyncRemote = { userId, exists: !!remote, updatedAt: context.updatedAt };
    let direction = cloudSyncDirection(hash, baseline, cloudSyncRemote);
    if ((resume || options.reviewOnly) && remote) direction='review';
    if (resume && !remote) {
      cloudSyncReview=context;
      // Confirmation is opened after releasing the busy state below.
      return;
    }
    const owner = appPreferences.getItem('kaasi_cloud_data_owner');
    if (automatic && owner !== userId && remote) direction = 'review';
    window.currentCloudSyncStatus = direction;
    if (automatic && !remote && (!baseline || owner !== userId)) {
      window.currentCloudSyncStatus = 'review';
      const key = `${userId}:initial-upload`;
      if (!automaticCloudReviewsSeen.has(key) && cloudSyncDownloadSafe(context)) {
        automaticCloudReviewsSeen.add(key);
        showConfirmationModal('Start Cloud Sync?', `The cloud account <strong>${escapeHTML(supabaseUser.email || 'currently signed in')}</strong> has no saved copy. Upload the data currently on this device and enable automatic sync for this account?`, 'Upload This Device', 'Not Now', async () => {
          if (cloudSyncBusy) return true;
          setCloudSyncBusy(true);
          try { await uploadCloudSync({...context,automatic:false}); }
          finally { setCloudSyncBusy(false); }
        });
      }
      return;
    }
    if (direction === "synced") { if (!automatic) showNotification("Already synced.", "success"); return; }
    if (direction === "local_newer") { await uploadCloudSync(context); return; }
    // Prompt once per cloud revision, after the active form/dialog is finished.
    const reviewKey = `${userId}:${context.updatedAt}`;
    if (automatic && (direction === 'review' || direction === 'conflict') && automaticCloudReviewsSeen.has(reviewKey)) return;
    if (automatic && !cloudSyncDownloadSafe(context)) return;
    const full = await readCloudSyncRow(userId, true);
    if (!full || full.updated_at !== context.updatedAt) throw new Error("The cloud copy changed. Start Sync again.");
    context.cloud = portableKaasiData(prepareImportedData(full.data));
    await assertCloudSyncLocal(context);
    if (KaasiStorage.canonical(local) === KaasiStorage.canonical(context.cloud)) {
      await recordCloudSync(userId, local, context.updatedAt, false);
      await finishSyncResume(context);
      if (!automatic) showNotification(resume ? 'Automatic sync resumed.' : "Already synced. Both copies contain the same data.", "success");
    } else if (direction === "cloud_newer") {
      await downloadCloudSync(context);
    } else {
      window.currentCloudSyncStatus = direction;
      cloudSyncReview = context;
      if (automatic) {
        if (!cloudSyncDownloadSafe(context)) { cloudSyncReview = null; return; }
        automaticCloudReviewsSeen.add(reviewKey);
        context.automatic = false; // Choosing a copy is an explicit manual action.
      }
      renderCloudSyncReview();
      openModalHelper("cloudSyncModal");
    }
  } catch (error) {
    cloudSyncRemote = null; window.currentCloudSyncStatus = "unknown";
    cloudSyncFeedback = 'Sync Pending · Retry';
    if (!automatic) showNotification(`Sync stopped: ${error.message}`, "error", 10000);
    if (automatic) automaticCloudSyncFailures = Math.min(automaticCloudSyncFailures + 1, 4);
  } finally {
    setCloudSyncBusy(false);
    if(resume && cloudSyncReview?.resume && cloudSyncReview.updatedAt===null)chooseCloudSyncCopy('local');
    if (automatic && !cloudSyncFeedback) automaticCloudSyncFailures = 0;
    if (window.currentCloudSyncStatus === 'local_newer') scheduleAutomaticCloudSync();
  }
}

/** Compare by record ID. Missing records are not classified as deletions. */
function cloudSyncDifferences(local, cloud) {
  local = portableKaasiData(local);
  cloud = portableKaasiData(cloud);
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
    ["Debts", "debts"], ["Receivables", "receivables"], ["Installments", "installments"], ["Budgets", "budgets"],
    ["Subscriptions", "subscriptions"], ["Renewals", "subscriptionOccurrences"]];
  for (const [area, key] of collections) {
    const a = key === "ccTransactions" ? local.creditCard.transactions : (local[key] || []);
    const b = key === "ccTransactions" ? cloud.creditCard.transactions : (cloud[key] || []);
    const left = new Map(a.map(row => [row.id, row])), right = new Map(b.map(row => [row.id, row]));
    for (const id of new Set([...left.keys(), ...right.keys()])) {
      const row = left.get(id) || right.get(id);
      const subscriptionName=key==='subscriptionOccurrences' ? [...(local.subscriptions||[]),...(cloud.subscriptions||[])].find(sub=>sub.id===row.subscriptionId)?.name : '';
      compare(area, `${row.date || row.dateGiven || row.dueDate || row.nextDueDate || ""} ${row.description || row.name || subscriptionName || id}`.trim(), left.get(id), right.get(id));
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
  $("#cloudSyncDeviceCount").textContent = String(changes.filter(c => c.kind === "Only on this device").length);
  $("#cloudSyncCloudCount").textContent = String(changes.filter(c => c.kind === "Only in cloud").length);
  $("#cloudSyncChangedCount").textContent = String(changes.filter(c => c.kind === "Different values").length);
  $("#cloudSyncSummary").setAttribute("aria-label", `${changes.length} differences`);
  const labels = { amount: "Amount", balance: "Balance", paidAmount: "Amount paid", paidOff: "Fully paid", originalAmount: "Original amount", remainingAmount: "Remaining amount", originalFullAmount: "Original total", monthlyAmount: "Monthly amount", limit: "Limit", type: "Type", date: "Date", description: "Description", account: "Account", category: "Category", name: "Name", ccPurchaseId: "Linked card purchase", timestamp: "Recorded time", hidden: "Hidden", totalMonths: "Total months", monthsLeft: "Months remaining", startDate: "Start date", dueDate: "Due date", dateGiven: "Date lent" };
  Object.assign(labels,{nextDueDate:'Next renewal',frequency:'Frequency',method:'Payment method',status:'Status',anchorDay:'Renewal day',serviceId:'Service',icon:'Icon',subscriptionId:'Subscription',subscriptionOccurrenceId:'Renewal',transactionId:'Recorded entry',kind:'Payment method',snoozedUntil:'Remind after',handledAt:'Recorded time'});
  const money = new Set(["amount", "balance", "paidAmount", "originalAmount", "remainingAmount", "originalFullAmount", "monthlyAmount", "limit"]);
  const display = (value, key) => value === undefined ? "Absent" : money.has(key) && typeof value === "number" ? formatCurrency(value).replace(/^LKR\s*/, "")
    : typeof value === "boolean" ? value ? "Yes" : "No" : typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const appendText = (parent, value, className, expand, label, limit = 64) => {
    const text = document.createElement("span"); text.className = className; text.textContent = value;
    parent.appendChild(text);
    if (value.length <= limit && !value.includes("\n")) return;
    text.classList.add("sync-text-preview");
    expand(parent, label, value);
  };
  let rowIndex = 0;
  for (const change of changes.slice(page * pageSize, (page + 1) * pageSize)) {
    const row = document.createElement("tr");
    const detailRow = document.createElement("tr"); detailRow.className = "sync-expanded-row"; detailRow.hidden = true;
    detailRow.id = `cloudSyncText-${page}-${rowIndex++}`;
    const detailCell = document.createElement("td"); detailCell.setAttribute("colspan", "3");
    const panel = document.createElement("div"); panel.className = "sync-expanded-content";
    detailCell.appendChild(panel); detailRow.appendChild(detailCell);
    const sections = new Map(), toggles = [];
    const addSection = (label, value) => {
      // Identical title/field text shares one full-width section, preserving its full value.
      const existing = sections.get(value.trim());
      if (existing) {
        existing.heading.textContent = existing.heading.textContent === "Entry" ? label : `${existing.heading.textContent} / ${label}`;
        existing.full.textContent = value;
      }
      else {
        const section = document.createElement("div"), heading = document.createElement("strong"), full = document.createElement("span");
        heading.textContent = label; full.textContent = value;
        section.appendChild(heading); section.appendChild(full); panel.appendChild(section); sections.set(value.trim(), { heading, full });
      }
    };
    const addToggle = parent => {
      const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "sync-text-toggle";
      toggle.textContent = "Show More"; toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", detailRow.id);
      toggle.onclick = () => {
        detailRow.hidden = !detailRow.hidden;
        for (const button of toggles) { button.textContent = detailRow.hidden ? "Show More" : "Show Less"; button.setAttribute("aria-expanded", String(!detailRow.hidden)); }
      };
      toggles.push(toggle); parent.appendChild(toggle);
    };
    const expand = (parent, label, value) => { addSection(label, value); addToggle(parent); };
    const entry = document.createElement("th"); entry.setAttribute("scope", "row");
    const dateLabel = change.label.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    let dateText = "";
    if (dateLabel) {
      const date = new Date(`${dateLabel[1]}T00:00:00`);
      const options = { day: "numeric", month: "short" };
      if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
      dateText = date.toLocaleDateString(undefined, options);
    }
    appendText(entry, dateLabel ? dateLabel[2] : change.label.replace(/^./, c => c.toUpperCase()), "sync-entry-name", expand, "Entry");
    const area = { Transactions: "Transaction", Accounts: "Account", Debts: "Debt", Receivables: "Receivable", Installments: "Installment", Budgets: "Budget", "Settings & categories": "Settings" }[change.area] || change.area;
    const fieldLabel = key => labels[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());
    const descriptionChange = change.kind === "Different values" ? change.fields.find(field => field.name === "description") : null;
    const valueFields = change.fields.filter(field => field.name !== "description");
    if (descriptionChange) {
      addSection("This Device · Description", display(descriptionChange.local, "description"));
      addSection("Cloud · Description", display(descriptionChange.cloud, "description"));
      if (!toggles.length) addToggle(entry);
    }
    const singleField = change.kind === "Different values" && valueFields.length === 1 ? valueFields[0].name : null;
    const subtitle = [dateText, area !== "Transaction" ? area : "", singleField && singleField !== "amount" ? fieldLabel(singleField) : "", descriptionChange ? "Description Changed" : ""].filter(Boolean).join(" · ");
    if (subtitle) {
      const meta = document.createElement("span"); meta.className = "sync-entry-meta"; meta.textContent = subtitle; entry.appendChild(meta);
    }
    row.appendChild(entry);
    for (const side of ["local", "cloud"]) {
      const cell = document.createElement("td");
      if (change.kind !== "Different values") {
        const present = change.kind === "Only on this device" ? side === "local" : side === "cloud";
        const status = document.createElement("span"); status.className = `sync-presence ${present ? "is-present" : "is-absent"}`;
        status.textContent = present ? "Present" : "Absent"; cell.appendChild(status);
      } else {
        if (!valueFields.length) { cell.textContent = "—"; cell.setAttribute("aria-label", "Description changed; expand the entry for details"); }
        for (const field of valueFields) {
          const value = document.createElement("div"); value.className = "sync-cell-value";
          if (valueFields.length > 1) {
            const name = document.createElement("span"); name.className = "sync-field-name"; name.textContent = fieldLabel(field.name); value.appendChild(name);
          }
          appendText(value, display(field[side], field.name), "sync-cell-text", expand, `${side === "local" ? "This Device" : "Cloud"} · ${fieldLabel(field.name)}`, 96);
          cell.appendChild(value);
        }
      }
      row.appendChild(cell);
    }
    host.appendChild(row);
    if (toggles.length) host.appendChild(detailRow);
  }
  $("#cloudSyncPage").textContent = `${page + 1} / ${pages}`;
  $("#cloudSyncPagination").hidden = pages === 1;
  $("#cloudSyncPrevious").disabled = page === 0; $("#cloudSyncNext").disabled = page + 1 >= pages;
  $("#cloudSyncPrevious").onclick = () => renderCloudSyncReview(page - 1);
  $("#cloudSyncNext").onclick = () => renderCloudSyncReview(page + 1);
  $("#cloudSyncUseLocal").onclick = () => chooseCloudSyncCopy("local");
  $("#cloudSyncUseCloud").onclick = () => chooseCloudSyncCopy("cloud");
}
function chooseCloudSyncCopy(which) {
  if (!cloudSyncReview || cloudSyncBusy || isAppLocked()) return;
  const context = cloudSyncReview;
  showConfirmationModal(which === "local" ? "Replace Cloud Copy?" : "Replace This Device's Copy?",
    which === "local" ? "This replaces the cloud dataset with this device's copy. Cloud-only entries will no longer be in the active cloud copy."
      : "This replaces this device's dataset with the cloud copy. Device-only entries will no longer be active. One previous local copy is retained for recovery.",
    which === "local" ? "Replace Cloud" : "Replace Device", "Cancel", async () => {
      if (cloudSyncBusy || isAppLocked() || cloudSyncReview !== context) return;
      setCloudSyncBusy(true);
      try {
        if (which === "local") await uploadCloudSync(context); else await downloadCloudSync(context);
        closeModal("cloudSyncModal"); cloudSyncReview = null;
      } catch (error) { showNotification(`Sync stopped: ${error.message}`, "error", 10000); }
      finally { setCloudSyncBusy(false); }
    }, undefined, "btn-danger sync-confirm-action");
}

function resetCloudSyncAccount(user) {
  clearTimeout(automaticCloudSyncTimer);
  cloudSyncFeedback = ''; automaticCloudSyncFailures = 0;
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

// Pending work is derived from persisted data and the account-specific baseline, not a volatile queue.
let automaticCloudSyncTimer, automaticCloudSyncFailures = 0, automaticCloudSyncLastCheck = 0;
function automaticCloudSyncEnabled() {
  return !!(window.uiInitialized && supabaseUser && supabaseClient && KaasiStorage.ready &&
    KaasiStorage.mode === 'indexeddb' && state.settings?.initialSetupDone && !isAppLocked() && !KaasiStorage.stale);
}
function scheduleAutomaticCloudSync(delay = 3000) {
  clearTimeout(automaticCloudSyncTimer);
  if (!automaticCloudSyncEnabled()) return;
  automaticCloudSyncTimer = setTimeout(() => runAutomaticCloudSync(), Math.max(delay, automaticCloudSyncFailures ? 5000 * 2 ** automaticCloudSyncFailures : 0));
}
async function runAutomaticCloudSync(allowHidden = false) {
  if (!automaticCloudSyncEnabled() || !navigator.onLine || cloudSyncBusy || storageOperationPending ||
    (!allowHidden && document.visibilityState === 'hidden')) return;
  if(automaticSyncPaused()){automaticCloudSyncLastCheck=Date.now();await refreshCloudSyncStatus();return;}
  if (cloudSyncReview) {
    if ($('#cloudSyncModal')?.style.display === 'block') return;
    cloudSyncReview = null;
  }
  automaticCloudSyncLastCheck = Date.now();
  await syncCloudData({automatic:true});
}
function checkVisibleCloudSync() {
  if (document.visibilityState === 'hidden' || Date.now() - automaticCloudSyncLastCheck < 3000) return;
  scheduleAutomaticCloudSync(0);
}
window.addEventListener('focus', checkVisibleCloudSync);
window.addEventListener('online', () => { automaticCloudSyncFailures = 0; scheduleAutomaticCloudSync(0); updateHeaderShortcutButtons(); });
window.addEventListener('offline', () => { ++cloudSyncRemoteSequence; cloudSyncRemote = null; updateHeaderShortcutButtons(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (window.currentCloudSyncStatus === 'local_newer') void runAutomaticCloudSync(true);
  } else checkVisibleCloudSync();
});
document.addEventListener('input', () => { ++cloudSyncActivity; }, true);
document.addEventListener('change', () => { ++cloudSyncActivity; }, true);
document.addEventListener('click', () => {
  if (['conflict','review'].includes(window.currentCloudSyncStatus)) scheduleAutomaticCloudSync(250);
});
window.setInterval?.(() => {
  if (Date.now() - automaticCloudSyncLastCheck >= Math.max(30000, 5000 * 2 ** automaticCloudSyncFailures)) void runAutomaticCloudSync();
}, 30000);
