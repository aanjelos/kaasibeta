/** Local database boundary. Financial records never depend on the auth SDK's storage. */
const KaasiStorage = (() => {
  const NAME = "kaasi-finances";
  const VERSION = 2;
  const DATASET = "local";
  const LEGACY = "KaasiData";
  const MARKER = "kaasi_indexeddb_migrated";
  const optionalGroups = ["subscriptions", "subscriptionOccurrences"];
  const groups = ["accounts", "transactions", "ccTransactions", "debts", "receivables", "installments", "budgets", "categories", ...optionalGroups];
  const stores = ["datasets", "settings", "deviceSettings", "recovery", ...groups];
  const ownKeys = new Set(["preferredSyncMethod", "pendingCloudRestore", "skipRestoreWarning", "lastLocalDataModification", "lastLocalCloudSync", "lastSyncedCloudUpdatedAt", "kaasi_synced_state_hash", "lastSuccessfulBackupDate", "lastSuccessfulCloudBackupDate"]);
  let db, mode, revision = 0, current, root, legacyRaw = null, stale = false;
  let preferenceQueue = Promise.resolve();
  const preferences = new Map();
  const owns = key => ownKeys.has(key) || (key.startsWith("kaasi_") && key !== MARKER) || /BackupReminder|backupReminder/.test(key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const request = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const finished = tx => new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error("Database transaction was cancelled."));
    tx.onerror = () => {}; // onabort reports the transaction's final outcome.
  });
  async function abortFailure(tx, done, error) {
    try { tx.abort(); } catch (_) { /* A completed/aborted transaction cannot be aborted again. */ }
    await done.catch(() => {});
    throw error;
  }
  const canonical = value => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  };
  async function digest(value) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  function transaction(names, write = false) {
    if (!db) throw new Error("The local database is not open.");
    try { return db.transaction(names, write ? "readwrite" : "readonly", write ? { durability: "strict" } : undefined); }
    catch (error) { if (error instanceof TypeError) return db.transaction(names, write ? "readwrite" : "readonly"); throw error; }
  }
  function conflict(message) { const error = new Error(message); error.name = "KaasiConflictError"; return error; }
  function assertWritable() {
    if (stale) throw conflict("Another Kaasi window changed this data. Reload before saving. Your draft has not been saved.");
    if (!mode) throw new Error("Local storage is not ready. Reload and complete the storage upgrade first.");
    if (mode === "indexeddb" && localStorage.getItem(LEGACY) !== legacyRaw) {
      stale = true;
      throw conflict("An older Kaasi window changed the original data. Both copies have been kept. Close older windows and use recovery before continuing.");
    }
  }
  function flatten(value, generation) {
    const base = clone(value);
    const result = {};
    groups.forEach(group => {
      const values = group === "ccTransactions" ? base.creditCard.transactions : optionalGroups.includes(group) ? (base[group] || []) : base[group];
      if (!Array.isArray(values)) throw new Error(`Invalid ${group} collection.`);
      const seen = new Set();
      result[group] = values.map((item, position) => {
        const id = group === "categories" ? String(position) : item.id;
        if (typeof id !== "string" || !id || seen.has(id)) throw new Error(`Invalid or duplicate ID in ${group}.`);
        seen.add(id);
        return { dataset: DATASET, generation, id, position, value: item };
      });
      if (group === "ccTransactions") delete base.creditCard.transactions;
      else delete base[group];
    });
    result.settings = { dataset: DATASET, generation, value: base, collections: optionalGroups.filter(group => Object.prototype.hasOwnProperty.call(value, group)) };
    return result;
  }
  async function readGeneration(generation) {
    const tx = transaction(["settings", ...groups]); const done = finished(tx);
    const queries = [request(tx.objectStore("settings").get([DATASET, generation])), ...groups.map(group => request(tx.objectStore(group).index("generation").getAll([DATASET, generation])))];
    const [base, ...rows] = await Promise.all(queries); await done;
    if (!base) throw new Error("Saved dataset is incomplete. No data has been replaced.");
    const value = clone(base.value);
    groups.forEach((group, index) => {
      if (optionalGroups.includes(group) && !base.collections?.includes(group)) return;
      const values = rows[index].sort((a, b) => a.position - b.position).map(row => row.value);
      if (group === "ccTransactions") value.creditCard.transactions = values;
      else value[group] = values;
    });
    return value;
  }
  async function readRoot() {
    const tx = transaction(["datasets"]); const done = finished(tx);
    const value = await request(tx.objectStore("datasets").get(DATASET)); await done;
    if (value && value.formatVersion !== 1) throw new Error("This database requires a newer version of Kaasi. Update the app; do not reset its data.");
    return value;
  }
  async function open() {
    if (db) return;
    if (!window.indexedDB) throw new Error("IndexedDB is unavailable in this browser.");
    db = await new Promise((resolve, reject) => {
      let cancelled = false;
      const opening = indexedDB.open(NAME, VERSION);
      opening.onupgradeneeded = () => {
        const database = opening.result;
        if (!database.objectStoreNames.contains("datasets")) database.createObjectStore("datasets", { keyPath: "id" });
        if (!database.objectStoreNames.contains("deviceSettings")) database.createObjectStore("deviceSettings", { keyPath: "key" });
        if (!database.objectStoreNames.contains("recovery")) database.createObjectStore("recovery", { keyPath: "id" });
        if (!database.objectStoreNames.contains("settings")) database.createObjectStore("settings", { keyPath: ["dataset", "generation"] });
        groups.forEach(group => {
          if (database.objectStoreNames.contains(group)) return;
          const store = database.createObjectStore(group, { keyPath: ["dataset", "generation", "id"] });
          store.createIndex("generation", ["dataset", "generation"]);
          if (["transactions", "ccTransactions"].includes(group)) store.createIndex("date", ["dataset", "generation", "value.date"]);
          if (group === "transactions") {
            store.createIndex("accountDate", ["dataset", "generation", "value.account", "value.date"]);
            store.createIndex("categoryDate", ["dataset", "generation", "value.category", "value.date"]);
            store.createIndex("ccPurchaseId", ["dataset", "generation", "value.ccPurchaseId"]);
          }
        });
      };
      opening.onsuccess = () => { if (cancelled) opening.result.close(); else resolve(opening.result); };
      opening.onerror = () => reject(opening.error);
      opening.onblocked = () => {
        cancelled = true;
        reject(new Error("Close other Kaasi tabs or app windows, then reload to retry the database upgrade."));
      };
    });
    db.onversionchange = () => { stale = true; db.close(); db = null; window.showStorageFailure?.(new Error("A newer Kaasi version needs this database. Reload this window.")); };
    db.onclose = () => { stale = true; };
  }
  function readLegacyPreferences() {
    preferences.clear();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && owns(key)) preferences.set(key, localStorage.getItem(key));
    }
  }
  async function loadPreferences() {
    const tx = transaction(["deviceSettings"]); const done = finished(tx);
    const rows = await request(tx.objectStore("deviceSettings").getAll()); await done;
    preferences.clear(); rows.forEach(row => preferences.set(row.key, row.value));
  }
  async function activate(value, { source = "import", expected = revision, raw = legacyRaw } = {}) {
    const generation = crypto.randomUUID();
    const hash = await digest(value); const records = flatten(value, generation);
    const old = await readRoot();
    if ((old?.revision || 0) !== expected) throw conflict("Saved data changed while the import was being prepared. Retry after reloading.");
    // Staging is isolated from the active generation, including on browser termination.
    const tx = transaction(["datasets", "settings", "recovery", "deviceSettings", ...groups], true); const done = finished(tx);
    try {
    const latest = await request(tx.objectStore("datasets").get(DATASET));
    if ((latest?.revision || 0) !== expected) { tx.abort(); await done; }
    for (const group of groups) records[group].forEach(row => tx.objectStore(group).put(row));
    tx.objectStore("settings").put(records.settings);
    tx.objectStore("datasets").put({ id: "staging", generation, hash, expected, source });
    if (source === "migration") {
      tx.objectStore("recovery").put({ id: "legacy", raw, preferences: Object.fromEntries(preferences), createdAt: Date.now() });
      preferences.forEach((entry, key) => tx.objectStore("deviceSettings").put({ key, value: entry }));
    }
    await done;
    } catch (error) { return abortFailure(tx, done, error); }
    const verified = await readGeneration(generation);
    if (await digest(verified) !== hash) throw new Error("Storage verification failed. Your previous data remains active.");
    if (localStorage.getItem(LEGACY) !== raw) throw conflict("An older Kaasi window changed the original data during migration. Close other windows and retry. Both copies are preserved.");
    const activation = transaction(["datasets", "recovery"], true); const activated = finished(activation);
    let next;
    try {
    const active = await request(activation.objectStore("datasets").get(DATASET));
    if ((active?.revision || 0) !== expected) { activation.abort(); await activated; }
    if (current && source !== "migration") activation.objectStore("recovery").put({ id: "previous", value: clone(current), createdAt: Date.now() });
    next = { id: DATASET, formatVersion: 1, generation, revision: expected + 1, hash, legacyRaw: raw, migrated: true,
      recoveryGeneration: source === "recovery" && !current ? old?.generation : old?.recoveryGeneration };
    activation.objectStore("datasets").put(next); activation.objectStore("datasets").delete("staging");
    activation.objectStore("datasets").delete("reset");
    await activated;
    } catch (error) { return abortFailure(activation, activated, error); }
    root = next; revision = next.revision; current = clone(verified); mode = "indexeddb"; legacyRaw = raw;
    try { localStorage.setItem(MARKER, "true"); } catch (_) { /* Database metadata remains authoritative. */ }
    notify();
    await cleanup();
    return clone(current);
  }
  async function cleanup() {
    // Keep only active records. Recovery snapshots retain the pre-import state separately.
    try {
      const tx = transaction(["datasets", "settings", ...groups], true); const done = finished(tx);
      const active = await request(tx.objectStore("datasets").get(DATASET));
      const staging = await request(tx.objectStore("datasets").get("staging"));
      for (const name of ["settings", ...groups]) {
        const store = tx.objectStore(name);
        const cursor = store.openCursor();
        cursor.onsuccess = () => { const row = cursor.result; if (row) { if (row.value.generation !== active?.generation && row.value.generation !== active?.recoveryGeneration && row.value.generation !== staging?.generation) row.delete(); row.continue(); } };
      }
      await done;
    } catch (error) { console.warn("Unused staging data will be cleaned up later.", error); }
  }
  let channel;
  function notify() { channel?.postMessage({ revision }); }
  function watch() {
    if (window.BroadcastChannel && !channel) {
      channel = new BroadcastChannel("kaasi-local-database");
      channel.onmessage = event => {
        if (mode === "indexeddb" && event.data.revision > revision) {
          stale = true;
          window.showStorageFailure?.(conflict("Another Kaasi window saved changes. Reload to use the latest data. Unsaved form input has been kept."));
        }
      };
    }
  }
  async function initialize(defaultState, validate, chooseMigration) {
    legacyRaw = localStorage.getItem(LEGACY); // Access failures must not look like a new user.
    let marker = localStorage.getItem(MARKER);
    await open(); root = await readRoot();
    const resetTx = transaction(["datasets"]); const resetDone = finished(resetTx);
    const reset = await request(resetTx.objectStore("datasets").get("reset")); await resetDone;
    if (reset?.pending) {
      // Resume an explicitly requested wipe; never re-import its frozen legacy copy.
      localStorage.removeItem(LEGACY); localStorage.removeItem(MARKER);
      legacyRaw = null; marker = null;
    }
    if (root) {
      revision = root.revision;
      current = await readGeneration(root.generation);
      if (await digest(current) !== root.hash) throw new Error("Saved data did not pass its integrity check. No data has been replaced.");
      revision = root.revision; mode = "indexeddb"; legacyRaw = root.legacyRaw;
      if (localStorage.getItem(LEGACY) !== legacyRaw) throw conflict("An older Kaasi window changed the legacy copy. Both copies are preserved; recovery is required before saving.");
      await loadPreferences(); watch(); return clone(current);
    }
    if (marker) throw new Error("The upgraded database is missing. The legacy copy may be outdated. Restore a current backup instead of automatically migrating old data.");
    readLegacyPreferences();
    if (legacyRaw !== null) {
      const parsed = JSON.parse(legacyRaw);
      const candidate = validate(parsed);
      const choice = await chooseMigration(clone(parsed));
      if (choice === "later") {
        current = clone(candidate); mode = "legacy"; return clone(current);
      }
      await activate(candidate, { source: "migration", expected: 0 });
    } else {
      await activate(defaultState(), { source: "migration", expected: 0 });
    }
    watch(); return clone(current);
  }
  async function commit(value, metadata = {}) {
    assertWritable();
    const next = clone(value);
    if (mode === "legacy") {
      await withLegacyWrite(() => {
        const raw = JSON.stringify(next);
        localStorage.setItem(LEGACY, raw);
        legacyRaw = raw; current = next; revision++;
      });
      for (const [key, entry] of Object.entries(metadata)) appPreferences.setItem(key, entry);
      return;
    }
    const expectedRevision = revision;
    const generation = root.generation;
    const beforeSnapshot = clone(current);
    const hash = await digest(next); const records = flatten(next, generation); const previous = flatten(beforeSnapshot, generation);
    const tx = transaction(["datasets", "settings", "deviceSettings", ...groups], true); const done = finished(tx);
    let nextRoot;
    try {
    const latest = await request(tx.objectStore("datasets").get(DATASET));
    if (!latest || latest.revision !== expectedRevision) { tx.abort(); try { await done; } catch (_) {} throw conflict("Another Kaasi window changed the saved data. Reload before retrying."); }
    for (const group of groups) {
      const before = new Map(previous[group].map(row => [row.id, row]));
      for (const row of records[group]) {
        if (JSON.stringify(before.get(row.id)) !== JSON.stringify(row)) tx.objectStore(group).put(row);
        before.delete(row.id);
      }
      before.forEach(row => tx.objectStore(group).delete([DATASET, generation, row.id]));
    }
    tx.objectStore("settings").put(records.settings);
    Object.entries(metadata).forEach(([key, entry]) => tx.objectStore("deviceSettings").put({ key, value: String(entry) }));
    nextRoot = { ...latest, revision: expectedRevision + 1, hash };
    tx.objectStore("datasets").put(nextRoot); await done;
    } catch (error) { return abortFailure(tx, done, error); }
    root = nextRoot; revision = nextRoot.revision; current = next;
    Object.entries(metadata).forEach(([key, entry]) => preferences.set(key, String(entry)));
    notify();
  }
  async function replace(value, expected = revision) {
    assertWritable();
    if (expected !== revision) throw conflict("Saved data changed while the import was being prepared. Reload before restoring.");
    if (mode === "legacy") return commit(value);
    await preferenceQueue;
    return activate(value, { expected });
  }
  async function snapshot() {
    if (!mode) throw new Error("Complete storage initialization before exporting.");
    if (mode === "legacy") return clone(current);
    const tx = transaction(["datasets", "settings", ...groups]); const done = finished(tx);
    const latest = await request(tx.objectStore("datasets").get(DATASET));
    if (!latest || latest.formatVersion !== 1) { await done; throw new Error("No compatible active dataset is available for backup."); }
    const [base, ...rows] = await Promise.all([request(tx.objectStore("settings").get([DATASET, latest.generation])),
      ...groups.map(group => request(tx.objectStore(group).index("generation").getAll([DATASET, latest.generation])))]);
    await done;
    if (!base) throw new Error("The saved dataset is incomplete.");
    const value = clone(base.value);
    groups.forEach((group, index) => {
      if (optionalGroups.includes(group) && !base.collections?.includes(group)) return;
      const values = rows[index].sort((a, b) => a.position - b.position).map(row => row.value);
      if (group === "ccTransactions") value.creditCard.transactions = values; else value[group] = values;
    });
    if (await digest(value) !== latest.hash) throw new Error("Backup snapshot failed verification. Please retry.");
    return value;
  }
  // IndexedDB serializes these short transactions across updated tabs, even while
  // financial data remains in localStorage. Older builds cannot honor this lock.
  async function withLegacyWrite(action) {
    const expectedRaw = legacyRaw;
    const tx = transaction(["datasets"], true); const done = finished(tx);
    try {
      const rows = await request(tx.objectStore("datasets").getAll());
      if (rows.some(row => [DATASET, "staging", "reset"].includes(row.id)) ||
          localStorage.getItem(MARKER) || localStorage.getItem(LEGACY) !== expectedRaw) {
        throw conflict("Another Kaasi window changed or upgraded the saved data. Reload before retrying. Your draft has not been saved.");
      }
      action(); // Keep comparison and localStorage mutation inside the lock.
      await done;
    } catch (error) { return abortFailure(tx, done, error); }
  }
  async function clear() {
    const expectedRevision = revision;
    assertWritable(); await preferenceQueue;
    if (mode === "indexeddb") {
      const tx = transaction(stores, true); const done = finished(tx);
      try {
        const latest = await request(tx.objectStore("datasets").get(DATASET));
        if (!latest || latest.revision !== expectedRevision || latest.generation !== root.generation) {
          throw conflict("Another Kaasi window changed the saved data. Reload before deleting data.");
        }
        stores.forEach(name => tx.objectStore(name).clear());
        tx.objectStore("datasets").put({ id: "reset", pending: true }); await done;
      } catch (error) { return abortFailure(tx, done, error); }
      localStorage.removeItem(LEGACY); localStorage.removeItem(MARKER);
    } else {
      await withLegacyWrite(() => { localStorage.removeItem(LEGACY); localStorage.removeItem(MARKER); });
    }
    for (let index = localStorage.length - 1; index >= 0; index--) { const key = localStorage.key(index); if (key && owns(key)) localStorage.removeItem(key); }
    preferences.clear(); mode = undefined; current = undefined; root = undefined; revision = 0; legacyRaw = null;
  }
  async function preferenceWrite(key, value) {
    if (mode === "legacy") { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); return; }
    if (!mode) throw new Error("Preferences are not ready.");
    const tx = transaction(["deviceSettings"], true); const done = finished(tx);
    try {
      if (value === null) tx.objectStore("deviceSettings").delete(key); else tx.objectStore("deviceSettings").put({ key, value });
      await done;
    } catch (error) { return abortFailure(tx, done, error); }
  }
  async function recoverySources() {
    const sources = [];
    try {
      await open();
      const tx = transaction(["recovery"]); const done = finished(tx);
      const rows = await request(tx.objectStore("recovery").getAll()); await done;
      rows.forEach(row => {
        if (row.id === "previous" && row.value) sources.push({ label: "Previous saved dataset", value: row.value });
        if (row.id === "legacy" && row.raw) {
          try { sources.push({ label: "Original migration copy", value: JSON.parse(row.raw), raw: row.raw }); } catch (_) { /* Never expose an unvalidated protected copy. */ }
        }
      });
      const active = await readRoot();
      if (active) {
        try { sources.unshift({ label: "Current database copy", value: await readGeneration(active.generation) }); } catch (_) { /* Keep incomplete generations for repair. */ }
      }
    } catch (_) { /* Original localStorage may still be readable if IndexedDB is unavailable. */ }
    try {
      const raw = localStorage.getItem(LEGACY);
      if (raw && !sources.some(item => item.raw === raw)) {
        sources.push({ label: sources.some(item => item.raw) ? "Changed localStorage copy" : "Original local copy", value: JSON.parse(raw), raw });
      }
    } catch (_) { /* An unreadable source is never reset. */ }
    return sources.filter(item => item.value && typeof item.value === "object" && Array.isArray(item.value.accounts));
  }
  async function recover(value, expected = revision) {
    await open();
    root = await readRoot();
    if ((root?.revision || 0) !== expected) throw conflict("Saved data changed while recovery was open. Reload before restoring.");
    current = undefined;
    if (root) { try { current = await readGeneration(root.generation); } catch (_) { /* Preserve the incomplete generation below. */ } }
    legacyRaw = localStorage.getItem(LEGACY);
    await activate(value, { source: "recovery", expected, raw: legacyRaw });
    stale = false;
  }
  const prefs = {
    keys() { return [...preferences.keys()]; },
    getItem(key) { return preferences.get(key) ?? null; },
    setItem(key, value) {
      const entry = String(value); preferences.set(key, entry);
      preferenceQueue = preferenceQueue.catch(() => {}).then(() => preferenceWrite(key, entry));
      preferenceQueue.catch(error => { console.error("Device setting was not saved.", error); window.showNotification?.("A device setting could not be saved. Please retry.", "warning"); });
    },
    removeItem(key) {
      preferences.delete(key);
      preferenceQueue = preferenceQueue.catch(() => {}).then(() => preferenceWrite(key, null));
      preferenceQueue.catch(error => console.error("Device setting could not be removed.", error));
    },
    flush() { return preferenceQueue; }
  };
  return { initialize, commit, replace, snapshot, clear, recover, recoverySources, digest, canonical, preferences: prefs,
    get revision() { return revision; }, get ready() { return !!mode; }, get mode() { return mode; },
    get current() { return current && clone(current); },
    get legacyRaw() { return legacyRaw; }, get stale() { return stale; } };
})();
const appPreferences = KaasiStorage.preferences;
