/** One-time upgrade and recovery UI. No financial data is rendered before startup succeeds. */
let storageOperationPending = false;
let storageStartupReady = false;
let storageActionPending = false;
let storageRecoveryView = 0;
let storageRecoverySources = [];

function guardStorageAction(action) {
  return async function (...args) {
    if (storageActionPending || storageOperationPending) return;
    storageActionPending = true;
    try { return await action.apply(this, args); }
    finally { storageActionPending = false; }
  };
}

function storageScreen(title, message) {
  ++storageRecoveryView;
  const screen = document.getElementById("storageScreen");
  document.getElementById("storageTitle").textContent = title;
  document.getElementById("storageStatus").textContent = message;
  screen.hidden = false;
  document.getElementById("app-content").inert = true;
  document.getElementById("preloader").style.display = "none";
  document.getElementById("storageActions").replaceChildren();
  return document.getElementById("storageActions");
}

function storageButton(actions, text, action) {
  const button = document.createElement("button");
  button.type = "button"; button.className = "btn btn-primary"; button.textContent = text;
  button.onclick = async () => {
    if (button.disabled) return;
    button.disabled = true;
    try { await action(); } catch (error) { await showStorageFailure(error); }
    finally { button.disabled = false; }
  };
  actions.appendChild(button);
}

function addMigrationExport(actions, existingData, returnTo) {
  if (!existingData) return;
  const download = () => {
    try {
      downloadKaasiSnapshot(existingData, "kaasi-before-upgrade");
      returnTo("Backup download requested. Check that the JSON file was saved before continuing with the upgrade.");
    } catch (_) {
      document.getElementById("storageStatus").textContent = "The backup download could not be started. Please retry; your existing data has not been changed.";
    }
  };
  storageButton(actions, "Export Existing Data", () => {
    if (!existingData.settings?.appPin?.enabled) return download();
    const exportActions = storageScreen("Export existing data", "Enter your existing app PIN to download a backup before upgrading. Exporting does not start the migration.");
    const label = document.createElement("label"); label.textContent = "Existing app PIN";
    label.style.flexBasis = "100%";
    const pin = document.createElement("input"); pin.type = "password"; pin.inputMode = "numeric"; pin.autocomplete = "off";
    label.appendChild(pin); exportActions.appendChild(label);
    storageButton(exportActions, "Download Backup", async () => {
      if (await hashString(pin.value) !== existingData.settings.appPin.pin) {
        document.getElementById("storageStatus").textContent = "Incorrect PIN. Enter your existing app PIN to export this data.";
        return;
      }
      pin.value = "";
      download();
    });
    storageButton(exportActions, "Back", () => returnTo());
  });
}

async function chooseStorageMigration(existingData) {
  return new Promise(resolve => {
    const intro = message => {
      const actions = storageScreen("Upgrade local storage", message || "Kaasi can move your existing data to a larger local database. Your original data will be kept. Export your existing data below to save a backup before upgrading. Close other Kaasi tabs and app windows before continuing.");
      storageButton(actions, "Continue", async () => {
        let persistent = false;
        try { persistent = await navigator.storage?.persist?.() || false; } catch (_) { /* The decision below remains explicit. */ }
        window.storagePersistenceDecision = persistent;
        if (persistent) {
          storageScreen("Upgrading local storage", "Copying and verifying your data. Please keep Kaasi open."); resolve("migrate");
        } else {
          const showDenied = message => {
            const denied = storageScreen("Persistent storage is not enabled", message || "This browser did not grant persistent storage. IndexedDB still provides more capacity, but automatic storage cleanup may remove data. Export your existing data below before continuing if you need a backup.");
            storageButton(denied, "Continue With IndexedDB", () => { storageScreen("Upgrading local storage", "Copying and verifying your data. Please keep Kaasi open."); resolve("migrate"); });
            storageButton(denied, "Not Now", () => resolve("later"));
            addMigrationExport(denied, existingData, showDenied);
          };
          showDenied();
        }
      });
      addMigrationExport(actions, existingData, intro);
      storageButton(actions, "Not Now", () => resolve("later"));
    };
    intro();
  });
}

function showStorageFailure(error) {
  console.error("Local storage operation stopped:", error);
  if (["SecurityError", "NotAllowedError"].includes(error?.name)) {
    storageRecoverySources = [];
    const actions = storageScreen("Browser storage is blocked", "Allow this site to save data in your browser’s site settings, then reload Kaasi. Do not clear the site’s existing data.");
    storageButton(actions, "Reload Kaasi", () => location.reload());
    return;
  }
  const actions = storageScreen("Your data needs attention", `${error.message} No automatic reset was performed. Your existing saved copies have been kept.`);
  const view = storageRecoveryView;
  storageRecoverySources = [];
  storageButton(actions, "Reload And Retry", () => location.reload());
  return KaasiStorage.recoverySources().catch(() => []).then(sources => {
    if (view !== storageRecoveryView) return;
    storageRecoverySources = sources;
    if (sources.some(source => source.value.settings?.appPin?.enabled)) {
      const label = document.createElement("label"); label.textContent = "Existing app PIN for recovery";
      const pin = document.createElement("input"); pin.type = "password"; pin.inputMode = "numeric"; pin.id = "storageRecoveryPin";
      label.appendChild(pin); actions.appendChild(label);
    }
    for (const source of sources) storageButton(actions, `Export ${source.label.replace(/\b[a-z]/g, letter => letter.toUpperCase())}`, async () => {
      if (!await authorizeStorageRecovery(source.value)) return;
      downloadKaasiSnapshot(source.value, "kaasi-recovery");
    });
    storageButton(actions, "Restore A Backup File", async () => {
      const active = activeStorageRecoverySource();
      if (active && !await authorizeStorageRecovery(active.value)) return;
      document.getElementById("storageRecoveryInput").click();
    });
    if (supabaseClient) storageButton(actions, "Restore From Cloud", () => openStorageCloudRecovery(error));
  });
}

function activeStorageRecoverySource() {
  return storageRecoverySources.find(source => source.label === "Current database copy")
    || storageRecoverySources.find(source => source.value.settings?.appPin?.enabled) || storageRecoverySources[0];
}

async function authorizeStorageRecovery(value, inputId = "storageRecoveryPin") {
  if (!value.settings?.appPin?.enabled) return true;
  const input = document.getElementById(inputId);
  if (input && await hashString(input.value) === value.settings.appPin.pin) return true;
  document.getElementById("storageStatus").textContent = "Enter the existing PIN for this saved copy before exporting or replacing protected data.";
  return false;
}

// Startup may have failed before normal auth/UI initialization. This path reads
// only the authenticated user's cloud row and never uploads or resets local data.
async function storageCloudUser(client, expectedUserId) {
  if (!navigator.onLine) throw new Error("You are offline. Reconnect to access your cloud backup.");
  if (!client || client !== supabaseClient) throw new Error("Cloud access is unavailable. Reload Kaasi and try again.");
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error("Your cloud session could not be checked. Reload Kaasi and try again.");
  const user = data?.session?.user;
  if (expectedUserId && user?.id !== expectedUserId) throw new Error("Your cloud account changed. Go back and select Restore From Cloud again.");
  return user;
}

async function openStorageCloudRecovery(originalError) {
  const active = activeStorageRecoverySource();
  if (active && !await authorizeStorageRecovery(active.value)) return;
  const client = supabaseClient, expected = KaasiStorage.revision;
  const actions = storageScreen("Cloud recovery", "Checking your cloud backup. Your saved data has not been changed.");
  const view = storageRecoveryView, current = () => view === storageRecoveryView;
  const back = target => storageButton(target, "Back", () => showStorageFailure(originalError));
  back(actions);
  try {
    const user = await storageCloudUser(client);
    if (!current()) return;
    if (!user) {
      document.getElementById("storageStatus").textContent = "Sign in to access your cloud backup, then select Restore From Cloud again. Signing in will not replace any saved data.";
      actions.replaceChildren();
      storageButton(actions, "Sign In With Google", async () => {
        const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
        if (error) document.getElementById("storageStatus").textContent = "Sign-in could not be started. Please try again.";
      });
      back(actions);
      return;
    }
    const { data: row, error } = await client.from("user_data").select("data, updated_at").eq("user_id", user.id).maybeSingle();
    if (!current()) return;
    await storageCloudUser(client, user.id);
    if (!current()) return;
    if (error) throw new Error("The cloud backup could not be downloaded. Please go back and try again.");
    if (!row) throw new Error("No cloud backup was found for this account. Your local saved copies are unchanged.");
    if (typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))) throw new Error("The cloud backup could not be verified. No data was replaced.");
    const candidate = prepareImportedData(typeof row.data === "string" ? JSON.parse(row.data) : row.data);
    const updatedAt = row.updated_at;
    const ready = storageScreen("Restore cloud backup?", `Cloud backup for ${user.email || "your signed-in account"}. Last backed up: ${formatCloudBackupTime(updatedAt)}. Restoring replaces this device's data. Your cloud copy will stay unchanged.`);
    const readyView = storageRecoveryView;
    if (candidate.settings?.appPin?.enabled) {
      const label = document.createElement("label"); label.textContent = "App PIN for this cloud copy"; label.style.flexBasis = "100%";
      const pin = document.createElement("input"); pin.id = "storageCloudRecoveryPin"; pin.type = "password"; pin.inputMode = "numeric"; pin.autocomplete = "off";
      label.appendChild(pin); ready.appendChild(label);
    }
    storageButton(ready, "Download Cloud Backup", guardStorageAction(async () => {
      await storageCloudUser(client, user.id);
      if (readyView !== storageRecoveryView || !await authorizeStorageRecovery(candidate, "storageCloudRecoveryPin")) return;
      downloadKaasiSnapshot(candidate, "kaasi-cloud-recovery");
    }));
    storageButton(ready, "Restore Cloud Backup", guardStorageAction(async () => {
      if (readyView !== storageRecoveryView || !await authorizeStorageRecovery(candidate, "storageCloudRecoveryPin")) return;
      await storageCloudUser(client, user.id);
      const { data: latest, error: latestError } = await client.from("user_data").select("updated_at").eq("user_id", user.id).maybeSingle();
      await storageCloudUser(client, user.id);
      if (readyView !== storageRecoveryView) return;
      if (latestError || latest?.updated_at !== updatedAt) throw new Error("The cloud backup changed or could not be checked. Select Restore From Cloud again before restoring.");
      storageOperationPending = true;
      try {
        await KaasiStorage.recover(candidate, expected);
        // A failed status-preference write must not report an already committed restore as failed.
        try {
          const hash = await KaasiStorage.digest(KaasiStorage.current);
          appPreferences.setItem(cloudSyncBaselineKey(user.id), JSON.stringify({ userId: user.id, hash, updatedAt }));
          await appPreferences.flush();
        } catch (error) { console.warn("Cloud recovery completed; sync status will be checked again after reload.", error); }
        // All writes have finished; let this intentional reload pass the unload guard.
        storageOperationPending = false; storageActionPending = false;
        location.reload();
      }
      finally { storageOperationPending = false; }
    }));
    back(ready);
  } catch (error) {
    if (current()) document.getElementById("storageStatus").textContent = error.message;
  }
}

function validateMigrationData(input) {
  const candidate = prepareImportedData(input);
  candidate.settings.initialSetupDone = input.settings?.initialSetupDone ?? false;
  // Explicit defaults may be added, but existing values must not be silently rewritten.
  function conserved(original, prepared, path = "data") {
    if (Array.isArray(original)) {
      if (!Array.isArray(prepared) || prepared.length < original.length) throw new Error(`Migration would remove values from ${path}. Export and check the original backup first.`);
      original.forEach((item, index) => conserved(item, prepared[index], `${path}[${index}]`));
    } else if (original && typeof original === "object") {
      for (const key of Object.keys(original)) conserved(original[key], prepared?.[key], `${path}.${key}`);
    } else if (original !== prepared) {
      throw new Error(`Migration needs a compatibility check for ${path}. The original data has not been changed.`);
    }
  }
  conserved(input, candidate);
  return candidate;
}

async function startLocalStorage() {
  const value = await KaasiStorage.initialize(getDefaultState, validateMigrationData, chooseStorageMigration);
  state = value; lastPersistedStateJson = JSON.stringify(value);
  storageStartupReady = true;
  document.getElementById("storageScreen").hidden = true;
  if (KaasiStorage.mode === "legacy") showNotification("Storage upgrade postponed. Existing local storage is still in use.", "warning", 8000);
  else if (!KaasiStorage.legacyRaw) {
    // New users use IndexedDB immediately; persistence is an optional separate request.
    document.getElementById("requestPersistenceBtn").hidden = false;
  }
}

// A commit temporarily blocks further input. The first event is processed normally;
// later events cannot mutate state while its snapshot is being persisted.
for (const eventName of ["click", "submit", "change", "keydown"]) {
  document.addEventListener(eventName, event => {
    const inRecovery = event.target.closest("#storageScreen");
    if (storageOperationPending || storageActionPending || ((!storageStartupReady || !document.getElementById("storageScreen").hidden) && !inRecovery)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
}

window.addEventListener("beforeunload", event => {
  if (storageOperationPending || storageActionPending) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("storage", event => {
  if (KaasiStorage.mode === "indexeddb" && event.key === "KaasiData" && event.newValue !== KaasiStorage.legacyRaw) {
    showStorageFailure(new Error("An older Kaasi window changed the original local data. Close older windows. Both data copies are preserved; do not overwrite either copy."));
  }
});

document.getElementById("storageRecoveryInput").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const expected = KaasiStorage.revision;
    const view = storageRecoveryView;
    const active = activeStorageRecoverySource();
    if (active && !await authorizeStorageRecovery(active.value)) return;
    const candidate = prepareImportedData(JSON.parse(await file.text()));
    if (view !== storageRecoveryView) return;
    const actions = storageScreen("Restore saved data?", "This replaces the active dataset with the selected backup. Existing readable data is kept as a recovery copy. Close other Kaasi windows first.");
    storageButton(actions, "Restore Backup", async () => {
      storageOperationPending = true;
      try { await KaasiStorage.recover(candidate, expected); storageOperationPending = false; location.reload(); }
      finally { storageOperationPending = false; }
    });
    storageButton(actions, "Cancel", () => showStorageFailure(new Error("Recovery cancelled.")));
  } catch (error) { showStorageFailure(error); }
  finally { event.target.value = ""; }
};
