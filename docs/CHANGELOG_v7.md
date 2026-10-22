# Kaasi v7 - Development Changelog

Versioned features, bug fixes, and maintenance updates for Kaasi Beta, listed newest first.

---

## v6.375n - 2026-10-23

### 1. [Enhancement] Consistent Sync Difference Counts

Removed the orange emphasis from the **Changed** count so all three sync comparison counts use the same neutral text colour. Updated application/service-worker versions to `v6.375n`.

## v6.374n - 2026-10-22

### 1. [Enhancement] Refined Sync Comparison Layout and Actions

Added a compact sync heading, clearer difference counts, a bordered comparison table, and device/cloud column icons. Entry dates now appear beneath descriptions. Present records use a subtle status badge; absent records remain muted. Both copy-choice buttons use orange with equal emphasis, readable dark labels, and mobile-sized touch targets. The replacement reminder and actions remain visible while the comparison scrolls. Monetary values omit the repeated LKR prefix while retaining grouping separators and two decimal places.

### 2. [Enhancement] Expandable Long Comparison Text

Long entry names and changed values now use two-line previews with **Show More / Show Less** controls. Expansion reveals complete text in a section spanning the table's width, including separate device/cloud labels for changed descriptions. Repeated title/field text shares one expanded section. Long strings wrap within the dialog; dates remain visible beside collapsed previews. Expansion supports keyboard controls and changes only the displayed comparison, leaving the captured datasets intact.

Validation: all 81 automated tests pass, including long descriptions, text escaping, complete field values, expansion controls, and existing sync/storage regressions. Synthetic browser checks covered desktop, 390px and 320px layouts, long paragraphs, unbroken strings, keyboard expansion/collapse, and visible choice actions while scrolling. Updated application/service-worker versions to `v6.374n` and rebuilt Tailwind. No live cloud operations were performed.

## v6.373n - 2026-10-22

### 1. [Enhancement] Direct Table Comparison for Sync Conflicts

Replaced expandable difference entries with an immediately visible **Entry / This Device / Cloud** table. Changed amounts appear side by side; records found in only one copy show **Present / Absent**. Other changed fields retain readable labels, and sensitive values remain redacted. The table adapts to narrow screens, keeps its column headings visible while scrolling, and retains pagination for larger comparisons. The copy-choice actions remain visible below the scrolling content.

### 2. [Enhancement] Removed Backup Actions From Sync Comparison

Removed the **Save a Backup** menu and its device/cloud export actions from the conflict dialog. Standard JSON export remains available in Settings. Replacement confirmations, conditional cloud writes, stale-data checks, and the single previous-local-copy recovery slot remain in place.

Validation: all 80 automated tests pass. Synthetic browser checks covered desktop, 390px and 320px layouts, table values, Present / Absent states, replacement confirmation, and cancellation. Captured desktop/mobile screenshots, rebuilt Tailwind, and updated application/service-worker versions to `v6.373n`. No live cloud operations were performed.

## v6.372n - 2026-10-22

### 1. [Enhancement] Simplified Sync Comparison Dialog

Replaced the dense comparison introduction with **Which Data Should We Keep?**, a short explanation, and compact Device Only / Cloud Only / Changed counts. Differences are collapsed by default; expanded entries show a concise name, readable date/type, and status badge instead of repeating long labels. Backup exports are grouped under a secondary **Save a Backup** disclosure.

Shortened the equal-weight choice buttons to **Use This Device** and **Use Cloud**. The choice actions and replacement reminder stay visible while the details scroll, including on mobile. New comparisons reset both disclosures to their collapsed state; pagination preserves the open details view. Existing security redaction, exports, replacement confirmations, and sync safeguards remain in place.

Validation: all 80 automated tests pass. Synthetic browser checks covered the compact desktop/390px views, expanded differences with side-by-side amounts, the backup menu, and replacement confirmation/cancellation. Rebuilt Tailwind and updated application/service-worker versions to `v6.372n`. No live cloud operations were performed.

## v6.371n - 2026-10-22

### 1. [Feature] Single Manual Cloud Sync Action

Replaced separate cloud upload/restore controls with **Sync** in Settings and cloud-mode desktop/mobile shortcuts. Sync uses an account-specific SHA-256 baseline and the cloud's existing `updated_at` value to choose upload, download, or no change. When no trustworthy baseline exists, differing copies require review; identical copies establish a baseline without an upload. Ordinary status refreshes fetch only `updated_at`, including throttled checks on focus, visibility, and reconnect. Transfers remain manual. Local JSON export/import controls remain available.

### 2. [Feature] Review Differences Before Replacing Divergent Copies

Added a responsive comparison dialog for independently changed or previously unpaired datasets. Records are matched by ID, with separate labels for device-only records, cloud-only records, and changed values. Account balances, card payments, commitments, budgets, categories, settings, and compatible unknown fields are included. Missing records are not assumed deleted. Differences are paginated, rendered as text, and security values are redacted. Users can export either captured copy, cancel, or confirm replacement using one whole dataset; records are not merged.

### 3. [Fix] Conditional Cloud Writes and Stale Comparison Protection

Existing cloud rows are updated only when `user_id` and the reviewed `updated_at` still match. First uploads use insert and reject an existing row rather than overwriting it. Write responses request timestamp metadata only. Local revision and snapshot checks reject edits made during download or while reviewing, and account/lock checks guard actions. Edits during upload remain pending for another sync. Network failures do not establish a synced baseline, and delayed status responses cannot replace a newer sync result. Sign-in no longer restores automatically.

### 4. [Enhancement] Unified Sync Status Indicators and Bounded Recovery

The cloud Sync icon pulses orange for local changes, green for cloud changes, and alternates both colours for conflicts or unpaired copies. Synced status stops flashing; offline or failed checks display unknown status. Cloud replacements retain one previous local dataset using the existing IndexedDB recovery mechanism, rather than accumulating saved histories. Applying a cloud copy requires completing the IndexedDB upgrade. Added a regression verifying bounded recovery across repeated replacements.

Validation: all 80 automated tests pass, including conditional-write races, first-upload collisions, local edits during transfer, account changes, failed restores, security redaction, pagination, and the existing financial/migration regressions. Synthetic browser QA verified comparison, export controls, cancellation/confirmation, application of a cloud copy, reload persistence, and the 390px layout. Rebuilt Tailwind and updated application/service-worker assets to `v6.371n`. No live Supabase writes or schema changes were performed; live permissions and production service-worker behavior still require release validation. Android and public app sources were not changed.

## v6.370n - 2026-10-21

### 1. [Fix] Refresh Storage Protection After Browser Permission Changes

Storage protection is rechecked when Settings opens, when its Data tab is selected, and when an open Settings dialog regains browser focus or visibility. Revoked permission restores the **Protect Local Storage** action and disabled-protection status. Enabled protection continues to display the external-backup reminder. Status checks never request permission; only the explicit button does. Sequence checks prevent delayed results from overriding newer checks or permission requests, and focus/visibility listeners are registered once.

Validation: regression coverage includes permission revocation and restoration, modal reopening, Data-tab selection, hidden/closed dialogs, permission-request isolation, and delayed check results. Updated application and service-worker versions to `v6.370n`.

## v6.369n - 2026-10-21

### 1. [Fix] Export Divergent Legacy Data During Recovery

Recovery now offers a separate **Changed localStorage copy** when an older application window has modified the legacy data after migration. Identical copies are not listed twice. Each export retains its own PIN authorization; the current database and original migration snapshot remain unchanged.

### 2. [Fix] Reject Deletion From Stale Windows

Delete All Data checks the active dataset revision and generation inside the same transaction that clears IndexedDB. A stale window must reload before deleting data, preserving newer records, device settings, and recovery copies even when cross-window notifications are unavailable.

### 3. [Fix] Coordinate Saves While Migration Is Postponed

Updated windows serialize legacy financial saves and resets through short IndexedDB transactions. Each operation checks that the localStorage source is unchanged and that no migration, active database, or reset has superseded it. Stale operations are rejected instead of overwriting another window's work. Legacy saves also advance the local revision so a delayed cloud restore cannot replace intervening edits. Multiple windows may remain open; older application builds that do not implement coordination must still be closed before migration.

Validation: all 60 automated tests pass, including simultaneous legacy saves, stale resets, migration in another window, quota failure, delayed restore rejection, recovery PIN checks, and the existing 20,000-record migration test. Updated application and service-worker versions to `v6.369n`.

## v6.368n - 2026-10-21

### 1. [Fix] Preserve Modals After Text-Selection Drags

Backdrop dismissal now requires a pointer action to start and finish on the backdrop itself. Selecting text inside a dialog and releasing outside it no longer closes the dialog. Applied the same guard to donation-modal handlers while retaining ordinary backdrop clicks, close buttons, and keyboard dismissal.

### 2. [Enhancement] Explicit Calculator Evaluation

Amount expressions remain unchanged when a field loses focus. Tab evaluates the expression and moves focus normally; Enter evaluates an expression before submitting on a subsequent press; equals input and the calculator equals button remain supported. Form submission still validates complete expressions and rejects invalid amounts before saving.

### 3. [Feature] Optional Expense Logging for Bulk Credit Card Payments

Added a checked-by-default **Log as Expense?** toggle to bulk CC settlement. Disabling it hides category controls and removes their validation requirements. Both modes deduct the total payment from the selected account and mark the selected purchases as paid; only enabled logging creates linked expense records. Existing payment records remain unchanged. Categories and available funds are checked before modifying purchases, and save failures roll back the entire settlement.

Removed these three completed items from the roadmap and rebuilt Tailwind styles. All 55 automated tests pass, including settlement validation, preservation of existing payments, failed-save rollback, backdrop pointer sequences, and calculator triggers. Browser checks confirmed draft preservation, Tab/Enter evaluation, category-toggle behavior, Cancel, close buttons, and Escape. Updated application and service-worker versions to `v6.368n`.

### 4. [Planning] Credit Card Payment Workflow Follow-Up

Added a future roadmap task for directly accessible single-purchase payments, secondary multi-item selection, and partial payments across selected purchases. The task requires a compact mobile-friendly design and an explicit payment-allocation decision before implementation. Documentation only; current payment behavior and application/cache versions remain unchanged.

## v6.367n - 2026-10-21

### 1. [Enhancement] Storage Settings Layout and Protection Status

Reorganized the Storage Usage card with a separate Storage Protection section, explanatory text, and an aligned action that stacks below the description on narrow screens. The size label now reads `Approx. Storage Used: [size] (IndexedDB)` or `(localStorage)` so the storage backend remains available for debugging without leading the description.

Enabled protection always displays `Persistent storage is enabled. External backups are still important.`, including when reopening Settings. The action changes to a disabled **Protection Enabled** indicator after permission is granted. Requests disable the button while pending, and delayed initial checks cannot replace a newer permission result. Added regression coverage for reopening Settings, asynchronous permission results, and backend labels; all 25 application regression tests pass. Updated application and service-worker versions to `v6.367n`.

### 2. [Maintenance] Roadmap Reconciliation

Removed the completed IndexedDB migration and immediate deletion-list refresh items from the roadmap after checking the storage boundary, deletion handlers, and regression coverage. Retained UUID generation for new financial records as a separate pending task, updated historical-budget prerequisites for the current database, and added public-release validation requirements. Clarified that unattended cloud operations require server-side conflict protection before implementation. Documentation-only maintenance; application and cache versions remain unchanged.

## v6.366n - 2026-10-21

### 1. [Enhancement] Export Existing Data Before Storage Upgrade

Added an **Export Existing Data** action to the initial storage-upgrade screen and the persistent-storage denial screen. The action downloads the original financial dataset as a compatible JSON backup before migration, without modifying the saved data, requesting persistence, or starting the upgrade. PIN-protected datasets require the existing app PIN before export. Users return to the same upgrade step after requesting the download and can retry failed downloads or postpone migration. Standardized the upgrade action labels to title case.

Added regression coverage for export before migration, exact preservation of original fields, PIN verification and cancellation, exports after persistence denial, and download retries. Updated application and service-worker versions to `v6.366n`.

Validation: all 48 automated tests pass. A browser download from the upgrade screen preserved every field of the original 3,688-transaction sample, and the screen remained at the consent step after export.

## v6.365n - 2026-10-21

### 1. [Feature] IndexedDB Financial Storage

Added a versioned local database with separate account, transaction, credit card, debt, receivable, installment, budget, category, settings, preference, and recovery stores. Records retain their existing IDs, ordering, balances, and monetary values. Financial updates now commit related records and modification metadata atomically, and forms wait for confirmation before clearing input or displaying success.

### 2. [Feature] Verified Legacy Data Migration

Existing installations receive a one-time upgrade screen. Continue requests persistent storage before copying data; denied requests allow explicit continuation or postponement. New installations use IndexedDB immediately. Migration stages a separate generation, verifies the reconstructed data with SHA-256, and activates it only after checking that the source and saved revision have not changed. The original localStorage data remains untouched as a frozen recovery copy.

### 3. [Fix] Storage Failure Recovery and Concurrent Writes

Unreadable or incompatible saved data now opens recovery instead of silently starting fresh. Added exports of readable recovery copies, PIN checks for protected copies, and confirmed backup restoration. Revision checks prevent stale windows or overlapping saves from overwriting newer data. Changes made by an older localStorage-only window are detected and retained for recovery. Explicit data deletion clears recovery data and uses a reset marker to prevent interrupted wipes from restoring old records.

### 4. [Enhancement] Storage-Independent Local and Cloud Backups

Exports and uploads reconstruct the existing Kaasi JSON object from a consistent committed snapshot. Imports and cloud restores validate and stage replacements while retaining the previous dataset. Cloud restores reject replacement when local data changes during download. Snapshot comparisons ignore object-key ordering, preventing false unsaved-change reports after database reconstruction. Supabase authentication and the existing cloud table format remain unchanged.

### 5. [Maintenance] Coordinated Startup and Application Updates

Database initialization now completes before financial UI and cloud restore initialization. Moved application-owned preferences and backup status away from direct localStorage access, added persistent-storage controls alongside storage usage, and reset stale modal navigation state on launch. Updated backup guidance to remove routine resets and re-imports. Versioned local assets and controlled service-worker activation reduce mixed-build updates. Updated application and cache versions to `v6.365n`.

### 6. [Maintenance] Database Regression Tests and Developer Reference

Added IndexedDB transaction tests for migration, interruption, quota/write failures, recovery, incompatible formats, persistence decisions, multiple tabs, backup compatibility, and 20,000-record datasets. Updated existing financial regressions for asynchronous saves and added an isolated legacy-to-current browser QA server. Documented schema, recovery, backup boundaries, and public rollout checks in `docs/INDEXEDDB_STORAGE.md`.

Validation: all 45 automated tests pass. Browser checks confirmed postponement, persistence denial, migration of a 3,688-transaction dataset with identical exported values, successful saves across reload without another migration prompt, and restoration of the original dataset through local import. Live Supabase uploads, physical target browsers, and production service-worker update/offline behavior remain public-release verification requirements.

## v6.364n - 2026-10-21

### 1. [Fix] Preserve Payments When Deleting Credit Card Purchases

Deleting a credit card purchase now removes only the selected purchase from credit card history. Previously, deleting a purchase also removed payment expenses linked to it. All recorded payments, bank balances, and other purchases are now preserved, whether the deleted purchase was partially or fully paid.

- Updated the delete confirmation and success notification to explain that recorded payments and balances are kept.
- Retained purchase-link metadata on payment expenses for reference and backup compatibility.
- Added regression coverage for partial and full payments, saved expense records, unaffected purchases, and imports after purchase deletion. The suite now contains 23 passing tests.
- Updated the application and service-worker cache versions to `v6.364n`.

## v6.363n - 2026-10-20

### 1. [Fix] Receivable Edit Validation and Balance Integrity

Fixed an issue where editing a receivable to an amount the source account could not fund changed the receivable in memory even though the edit was rejected. Retrying could then calculate balances using the rejected amount.

Proposed account balances are now validated before changing the receivable or its source accounts. Insufficient funds, missing accounts, and invalid balances leave the original record intact. Successful edits use the existing save-failure rollback mechanism if browser storage cannot be updated.

### 2. [Enhancement] Explicit Credit Card Payment References

New individual and bulk credit card payments store the purchase ID in the generated expense's `ccPurchaseId` field. References remain valid when a purchase is renamed or the expense category changes. Backup validation checks optional reference IDs while remaining compatible with older backups without them.

This release also replaced description-based payment deletion with exact purchase-ID matching. **Automatic payment deletion was subsequently removed in v6.364n; deleting a purchase now preserves all recorded payment expenses.**

### 3. [Fix] Accurate Backup Status During Concurrent Edits

Cloud backups now upload a separate snapshot captured when the upload starts. Previously, changes made during an upload could be marked as backed up even when absent from the uploaded data.

- Store the uploaded snapshot's hash rather than the latest local data when the upload completes.
- Preserve local modification timestamps and keep later edits marked as needing another backup.
- Notify users when an upload succeeds but additional local changes still need backing up.
- Compare content hashes when refreshing backup status, covering edits within the previous two-second timestamp tolerance.
- Prevent overlapping backup requests and allow retries after failed uploads.

These changes use the existing Supabase schema and retain manual backup operation.

### 4. [Maintenance] Regression Coverage and Cache Update

Expanded the regression suite from 15 to 22 tests. Added coverage for rejected receivable edits, retries, account/type changes, storage rollback, individual and bulk payment references, import compatibility, independent payment-expense deletion, delayed uploads, overlapping requests, and upload failure recovery. Cloud tests use mocked Supabase responses.

Updated the application and service-worker cache versions to `v6.363n`.

## v6.362n - 2026-10-20

### 1. [Maintenance] Public App Baseline Update

Updated beta JavaScript and compiled styles to match the public application's `v6.361m` baseline. Aligned the credit card dashboard's Limit/Available ordering while retaining the beta title, domain, and manifest configuration.

### 2. [Fix] Safe Handling of Failed Local Saves

Fixed submission flows that could display success or clear form input after browser storage rejected a financial update. Failed saves now restore the last persisted financial state, retain form input, and display an error. Account and record references are preserved during rollback so retries use restored data.

Optional backup-status metadata is saved separately; a metadata failure does not undo a successfully stored financial update.

### 3. [Fix] Backup Validation and Import Rollback

Added `js/import-validation.js` to validate backups before replacing application data. Local imports, initial-setup imports, and cloud restores share the same validation path.

- Validate record collections, unique IDs, account references, finite monetary values, calendar dates, installment durations, credit card payment amounts, budgets, and settings.
- Reject unsafe object keys and excessively nested data.
- Fill supported defaults for legacy backups without modifying the supplied backup object.
- Restore previous data if saving or initializing the imported state fails.
- Include the validation module in the service-worker asset cache.

### 4. [Security] Block Background Actions While PIN-Locked

Disabled application shortcuts and export, import, backup, and restore entry points while the PIN lock is active. Application content and the footer become inert, existing field focus is cleared, and keyboard focus moves to the lock screen. Unlocking restores normal interaction.

Also prevented duplicate PIN keyboard listeners and corrected the startup lock's application-container reference.

### 5. [Security] Safe Rendering of User-Controlled Data

Escaped account names, categories, descriptions, and record IDs in generated HTML. Replaced dynamic inline record-action handlers with delegated actions using data attributes, so IDs are treated as data rather than executable JavaScript. Category aggregation maps now use objects without inherited properties to avoid collisions with user-defined category names.

### 6. [Fix] Immediate Transaction History Updates

Fixed All Transactions failing to redraw after a record changed. The active view now refreshes rows, totals, and category breakdowns while preserving search text, filters, expanded day groups, and scroll positions. Date-range results also refresh when the changed record falls outside the selected month.

### 7. [Fix] First-Time Setup Event Binding

Fixed advanced filters and credit card search controls remaining inactive after first-time setup. UI listeners now attach after setup completes and register only once, preventing duplicate handlers during subsequent initialization. The year selector also uses a single change handler.

### 8. [Fix] Strict Amount and Calculator Validation

Amount fields now require a complete, finite number or supported mathematical expression. Malformed input such as `12abc`, unfinished expressions, and division by zero is rejected instead of being partially parsed and saved. Installment durations must be whole numbers. Validation applies to transaction, setup, settings, credit card, debt, receivable, and installment forms.

### 9. [Fix] Preserve Hidden Category Settings on Rename

Renaming a hidden category now updates its entry in `hiddenCategories`, preserving exclusion rules. Renames also update affected transactions, budgets, the default transfer-fee category, and active category-filter values, then refresh the relevant dashboard, history, and settings views.

### 10. [Fix] Preserve Backdated Transaction Drafts

Removed visibility-change handlers that reset unfinished transaction dates when returning to the app. Transaction and credit card forms still default to the current local date on launch or refresh, while selected draft dates remain intact during normal navigation.

### 11. [Maintenance] Automated Regression and Browser Validation

Added a dependency-free regression suite at `tests/audit-regressions.test.cjs`, runnable with `node --test tests/audit-regressions.test.cjs`. The initial 15 tests cover storage failures, backup validation and rollback, PIN guards, safe rendering, history refreshes, setup listeners, calculations, category renames, and date defaults.

Completed 30 browser checks covering financial forms, transfers, repayments, budgets, filters, reports, imports, and refresh persistence. A synthetic 20,000-transaction dataset retained correct search, edit, and deletion behavior, but exposed a performance limitation: unfiltered history renders every matching transaction row. Pagination or virtualization was not added in this release.

Browser validation did not cover live cloud uploads, actual PIN entry and inactivity locking, physical mobile devices, offline service-worker behavior, or forced storage failures. Applicable storage, PIN, and cloud-validation cases were tested with mocks.

Updated the application and service-worker cache versions to `v6.362n`.
