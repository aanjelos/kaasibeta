# Kaasi Local Database

## Storage ownership

The financial database is `kaasi-finances`, schema version `2`. Database, application, and backup-format versions are independent. Browser origins remain separate: beta, public, and localhost installations do not share data. No Supabase schema change is required.

`js/storage.js` owns database access. `js/storage-ui.js` owns upgrade and recovery screens. Feature handlers keep their existing in-memory `state`, but await `saveData()` before reporting success or resetting forms.

Supabase authentication remains managed by the SDK in its existing localStorage keys. Kaasi-owned preferences and backup metadata use IndexedDB after migration. The original `KaasiData` value remains frozen in localStorage; it is not a second writable database. The explicit postponement path continues using legacy storage until a later launch.

## Object stores

| Store | Key | Contents |
| --- | --- | --- |
| `datasets` | `id` | Active generation, local revision, format version, SHA-256 digest, migration state, and legacy source identity. Reserved `staging` and `reset` entries coordinate replacement and explicit deletion. |
| `accounts`, `transactions`, `ccTransactions`, `debts`, `receivables`, `installments`, `budgets`, `categories` | `[dataset, generation, id]` | Original record in `value`, plus its array `position`. Category keys use positions so names and order are preserved. |
| `subscriptions`, `subscriptionOccurrences` | `[dataset, generation, id]` | Optional schedule and renewal records, including unknown compatible fields. Created by schema version 2. |
| `settings` | `[dataset, generation]` | Remaining top-level data, settings, hidden categories, CC configuration, and unrecognized compatible fields. |
| `deviceSettings` | `key` | Device preferences, backup status, and modification metadata. SDK authentication tokens are excluded. |
| `recovery` | `id` | Frozen migration source and the previous replaced dataset. An incomplete recovery generation is retained when it cannot be reconstructed into a snapshot. |

Collection stores have a generation index. Transaction stores also index dates; ordinary transactions index account/date, category/date, and CC purchase references. Existing domain IDs, balances, monetary representation, dates, and array ordering are retained. Removing a CC purchase does not remove its recorded payment expenses or references.

Schema 2 adds stores without rewriting the active generation or changing its digest. A settings-row `collections` list records which optional collections were present, so reconstructing an older snapshot does not insert empty arrays or change hashes. Compatible subscription fields retained inside a schema-1 settings row remain readable and move into dedicated stores on the next successful save. This is a database upgrade, not another localStorage migration. See [Subscription Schedules](SUBSCRIPTIONS.md).

## Startup and migration

1. Open the database before initializing financial UI or cloud restore.
2. If an active dataset exists, verify its digest and load it. Never silently fall back to the frozen legacy copy.
3. If there is no active dataset and no migration marker, validate existing legacy data without changing existing values. Compatible defaults may be added; ambiguous conversions require recovery.
4. Existing users can export the original financial dataset directly from the upgrade screen before choosing Continue. PIN-protected exports require the existing PIN; exporting does not begin migration or request persistence. A denied/unavailable persistence request also offers export, explicit IndexedDB continuation, or postponement. New users create IndexedDB directly. After startup/unlock, IndexedDB users automatically request persistence if it is off and neither a previous refusal nor browser denial blocks the request. Migration's persistence result is reused to avoid a second request. Refusals (including silent browser refusals) are remembered in device preferences; Settings permits an explicit retry, and a successful grant clears that preference. Status refreshes remain read-only. Browsers control the grant and whether a prompt appears; protection is never forced.
5. Write a staging generation and original recovery copy, wait for transaction completion, then read and verify through a separate transaction. Recheck the legacy source and active revision before atomically activating the generation.
6. If interrupted, the old source remains available. Staging can be retried without duplicating records. A valid active dataset takes precedence even if writing the optional localStorage marker failed.

Malformed data, unavailable storage, failed verification, unknown format versions, and a missing previously migrated database open recovery instead of a fresh setup wizard. Explicit Delete All Data uses a persisted reset marker so an interrupted wipe cannot resurrect legacy data.

## Writes, concurrency, and backups

Each financial save writes changed records, account balances, dataset revision/digest, and modification metadata in one transaction. Success means the transaction completed. Synchronous request exceptions and asynchronous aborts cancel the operation. Strict durability is requested where supported; it does not replace external backups.

Every save captures its expected revision before asynchronous work. A stale revision aborts rather than overwriting another tab's changes. BroadcastChannel notifies current tabs; database revision checks remain authoritative. Changes to the legacy copy from an older application window stop further writes and preserve both copies. Legacy-only windows cannot be remotely prevented from writing; users must close them before migration or recovery.

Delete All Data checks both revision and generation within its clearing transaction. When migration is postponed, updated tabs use short readwrite transactions on `datasets` to serialize localStorage comparisons and financial writes or resets. A changed source, migration staging record, active dataset, migration marker, or reset marker rejects the legacy operation. An interrupted migration with staging records must be retried rather than continuing legacy writes. These locks coordinate updated tabs only; localStorage and IndexedDB are not a single atomic storage system. Legacy saves advance the in-memory revision to reject delayed restores after intervening edits.

Exports read all collections and metadata through one consistent read transaction and reconstruct the existing Kaasi JSON object. Local files remain JSON text; Supabase receives an object in `user_data.data`, not a JSON string or IndexedDB-specific envelope. Backups exclude database internals, device preferences, recovery archives, and auth tokens. Content comparisons ignore JSON object-key order while preserving array order.

Imports stage a verified replacement generation. The previous dataset is retained as one recovery snapshot. Cloud restores capture the local revision before fetching and reject replacement if it changed during download. Uploads use a committed snapshot; later edits remain pending.

## Manual cloud Sync

`js/cloud-sync.js` owns the single manual Sync workflow. The table remains `user_data` with `user_id`, JSON-object `data`, and `updated_at`; no schema changes or automatic record merging are introduced. Device preferences contain one `kaasi_cloud_sync_baseline_<userId>` record per signed-in account with a canonical SHA-256 content hash and the last accepted cloud timestamp. Legacy unscoped hashes do not authorize an automatic replacement.

Status checks request only `updated_at`; focus/visibility/reconnect checks are throttled and never transfer datasets. Sync with an unchanged baseline needs only metadata. Changed local data uploads conditionally; changed cloud data downloads, validates, rechecks the cloud timestamp and local revision, then applies through the existing replacement boundary. First uploads insert; subsequent writes filter by owner and the expected timestamp. Responses request only `updated_at`. SHA-256 baselines are recorded only after successful operations; later local edits stay pending.

Ctrl+S invokes cloud Sync when signed in, independently of the selected Dashboard button mode. Ctrl+E and Ctrl+I always invoke local file export/import. Keyboard actions are blocked while editing a field or when PIN-locked; repeated keydown events are ignored. Ctrl+S suppresses the browser's Save Page action. The Dashboard shortcuts retain pending-change colour pulses; the Settings Sync button remains steady. Settings shows the cloud timestamp as Last backed up with local Today / Yesterday wording and a 12-hour time, falling back to a readable date for older backups. Successful downloads use a short toast; the previous-local-copy recovery slot is still retained.

Unknown pairings and independently changed copies open a paginated three-column comparison: Entry / This Device / Cloud. Changed fields show their values; records present on one side show Present / Absent. Descriptions stay in Entry rather than repeating in the value columns. Description edits are marked Description Changed, with both complete versions available through Show More; description-only differences use dashes in the value columns. Dates appear beneath entry names. Long entry names and values use two-line previews; Show More reveals their complete text in a full-width detail row. These controls change only the comparison display. Both orange copy-choice buttons have equal emphasis and require confirmation. Security values are redacted. Missing records cannot be distinguished from deletions without history; absence does not imply deletion. Local JSON export remains available in Settings, while the conflict dialog contains no backup menu. Baselines are per account; signing out/switching accounts clears the previous cloud comparison. Applying cloud data is unavailable in postponed legacy mode because that mode cannot provide the same bounded recovery guarantee.

Cloud downloads retain the existing single `recovery/previous` snapshot; repeated replacements overwrite this recovery slot. Staging generations are cleaned after activation. The frozen migration copy remains separate. The old public app can still overwrite the shared cloud row using its own unconditional uploads: these safeguards govern updated beta operations only. `updated_at` remains a client-supplied equality token for backward compatibility, not a server-enforced monotonic revision. Test production RLS/update permissions on an authorized test account before rollout.

`node tests/serve-sync-qa.cjs` serves a synthetic cloud/account and disposable sample dataset at `127.0.0.1:8768` (override with `KAASI_SYNC_QA_PORT`). It does not send backup requests to Supabase and must not be used with real data. The preview excludes service workers and repository/private files.

## Recovery and rollback

The recovery screen can export readable current, previous, and original copies and restore a validated backup through an explicit confirmation. Protected copies require their existing PIN. Recovery never silently changes a balance or selects between divergent legacy/database copies.

If the current localStorage text differs from the retained migration snapshot, recovery also offers a **Changed localStorage copy** with its own PIN authorization. Identical legacy copies are listed only once. Exporting a divergent copy does not merge it into the active database.

Use a database-aware application build for rollback. Deploying an old localStorage-only build after migration would show outdated data and may create divergent writes. Do not automatically delete IndexedDB or copy its data back over the original localStorage snapshot.

Browser data deletion, device failure, private browsing, denied persistence, and storage eviction remain possible. Persistent storage reduces automatic eviction when granted. Keep external local/cloud backups; recovery copies inside the same browser are not independent backups.

## Application updates

HTML references versioned local scripts and styles. The service worker caches a complete build and does not revalidate immutable assets into an older build. Updates wait for existing windows unless the user selects Update Kaasi after writes finish. Database `versionchange` closes the connection and requests a reload; blocked upgrades require other windows to close.

## Verification and rollout

Run `npm ci --ignore-scripts` and `npm test`. The fake-indexeddb development dependency exercises database transactions and injected failures; it is not shipped as an app dependency. Domain regressions use a controllable asynchronous storage boundary.

For isolated browser QA, run `node tests/serve-qa.cjs`. The server binds only `127.0.0.1:8766`, serves the working tree at `/`, and serves the pre-migration Git revision at `/legacy/`. Import test data into the legacy app, then navigate to `/index.html` on the same origin. The allowlist excludes docs, credentials, Git internals, and recovery-code files. Service workers are intentionally disabled on this QA origin to avoid stale development assets.

Before promoting to the public app, test production service-worker update/offline behavior and physical target browsers, and verify an authorized Supabase backup/restore on a test account. Mocked cloud tests do not confirm the live database's policies. Publish only through the existing public release process; this implementation changes beta only.
