# Kaasi v7 - Development Changelog

Versioned features, bug fixes, and maintenance updates for Kaasi Beta, listed newest first.

---

## v6.368n - 2026-10-21

### 1. [Fix] Preserve Modals After Text-Selection Drags

Backdrop dismissal now requires a pointer action to start and finish on the backdrop itself. Selecting text inside a dialog and releasing outside it no longer closes the dialog. Applied the same guard to donation-modal handlers while retaining ordinary backdrop clicks, close buttons, and keyboard dismissal.

### 2. [Enhancement] Explicit Calculator Evaluation

Amount expressions remain unchanged when a field loses focus. Tab evaluates the expression and moves focus normally; Enter evaluates an expression before submitting on a subsequent press; equals input and the calculator equals button remain supported. Form submission still validates complete expressions and rejects invalid amounts before saving.

### 3. [Feature] Optional Expense Logging for Bulk Credit Card Payments

Added a checked-by-default **Log as Expense?** toggle to bulk CC settlement. Disabling it hides category controls and removes their validation requirements. Both modes deduct the total payment from the selected account and mark the selected purchases as paid; only enabled logging creates linked expense records. Existing payment records remain unchanged. Categories and available funds are checked before modifying purchases, and save failures roll back the entire settlement.

Removed these three completed items from the roadmap and rebuilt Tailwind styles. All 55 automated tests pass, including settlement validation, preservation of existing payments, failed-save rollback, backdrop pointer sequences, and calculator triggers. Browser checks confirmed draft preservation, Tab/Enter evaluation, category-toggle behavior, Cancel, close buttons, and Escape. Updated application and service-worker versions to `v6.368n`.

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
