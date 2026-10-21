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
    try { await action(); } catch (error) { showStorageFailure(error); }
    finally { button.disabled = false; }
  };
  actions.appendChild(button);
}

async function chooseStorageMigration() {
  return new Promise(resolve => {
    const intro = () => {
      const actions = storageScreen("Upgrade local storage", "Kaasi can move your existing data to a larger local database. Your original data will be kept. Close other Kaasi tabs and app windows before continuing. Keep a recent exported backup as an additional safeguard.");
      storageButton(actions, "Continue", async () => {
        let persistent = false;
        try { persistent = await navigator.storage?.persist?.() || false; } catch (_) { /* The decision below remains explicit. */ }
        if (persistent) {
          storageScreen("Upgrading local storage", "Copying and verifying your data. Please keep Kaasi open."); resolve("migrate");
        } else {
          const denied = storageScreen("Persistent storage is not enabled", "This browser did not grant persistent storage. IndexedDB still provides more capacity, but automatic storage cleanup may remove data. External backups remain important.");
          storageButton(denied, "Continue with IndexedDB", () => { storageScreen("Upgrading local storage", "Copying and verifying your data. Please keep Kaasi open."); resolve("migrate"); });
          storageButton(denied, "Not now", () => resolve("later"));
        }
      });
      storageButton(actions, "Not now", () => resolve("later"));
    };
    intro();
  });
}

function showStorageFailure(error) {
  console.error("Local storage operation stopped:", error);
  const actions = storageScreen("Your data needs attention", `${error.message} No automatic reset was performed. Your existing saved copies have been kept.`);
  storageButton(actions, "Reload and retry", () => location.reload());
  const view = ++storageRecoveryView;
  KaasiStorage.recoverySources().then(sources => {
    if (view !== storageRecoveryView) return;
    storageRecoverySources = sources;
    if (sources.some(source => source.value.settings?.appPin?.enabled)) {
      const label = document.createElement("label"); label.textContent = "Existing app PIN for recovery";
      const pin = document.createElement("input"); pin.type = "password"; pin.inputMode = "numeric"; pin.id = "storageRecoveryPin";
      label.appendChild(pin); actions.appendChild(label);
    }
    for (const source of sources) storageButton(actions, `Export ${source.label.toLowerCase()}`, async () => {
      if (!await authorizeStorageRecovery(source.value)) return;
      downloadKaasiSnapshot(source.value, "kaasi-recovery");
    });
    storageButton(actions, "Restore a backup file", async () => {
      const active = sources.find(source => source.label === "Current database copy") || sources.find(source => source.value.settings?.appPin?.enabled) || sources[0];
      if (active && !await authorizeStorageRecovery(active.value)) return;
      document.getElementById("storageRecoveryInput").click();
    });
  }).catch(() => {});
}

async function authorizeStorageRecovery(value) {
  if (!value.settings?.appPin?.enabled) return true;
  const input = document.getElementById("storageRecoveryPin");
  if (input && await hashString(input.value) === value.settings.appPin.pin) return true;
  document.getElementById("storageStatus").textContent = "Enter the existing PIN for this saved copy before exporting or replacing protected data.";
  return false;
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
    const active = storageRecoverySources.find(source => source.label === "Current database copy") || storageRecoverySources.find(source => source.value.settings?.appPin?.enabled) || storageRecoverySources[0];
    if (active && !await authorizeStorageRecovery(active.value)) return;
    const candidate = prepareImportedData(JSON.parse(await file.text()));
    const actions = storageScreen("Restore saved data?", "This replaces the active dataset with the selected backup. Existing readable data is kept as a recovery copy. Close other Kaasi windows first.");
    storageButton(actions, "Restore backup", async () => {
      storageOperationPending = true;
      try { await KaasiStorage.recover(candidate, expected); storageOperationPending = false; location.reload(); }
      finally { storageOperationPending = false; }
    });
    storageButton(actions, "Cancel", () => showStorageFailure(new Error("Recovery cancelled.")));
  } catch (error) { showStorageFailure(error); }
  finally { event.target.value = ""; }
};
