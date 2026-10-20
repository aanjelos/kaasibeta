# Kaasi v6 - Development Changelog

Versioned features, bug fixes, and maintenance updates for Kaasi Beta, listed newest first.

---

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
