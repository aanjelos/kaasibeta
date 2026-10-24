# Subscription Schedules

## Modules and interface

`js/subscriptions.js` owns schedule CRUD, renewal decisions, reminders and dedicated management windows. `js/subscription-services.js` owns service identities, aliases, name matching and artwork selection. `js/subscription-assets.js` lists bundled SVGs for both the UI and service worker. Images, library licences and per-asset provenance live in `img/subscriptions/`; subscription names are never sent to a logo service.

The dashboard Subscriptions button opens management without adding another Settings tab. A notice bar attached to Recent Transactions groups subscriptions and dated outstanding debts due within seven calendar days, including overdue entries. Undated installment schedules are excluded rather than assigned guessed deadlines.

## Portable records

Optional root-level JSON arrays `subscriptions` and `subscriptionOccurrences` map to schema-2 IndexedDB stores. Absence in older backups is valid. The existing backup object, Supabase user_data row and manual Sync workflow are unchanged. Unknown compatible root/record fields survive validation and save; unsupported core subscription enums or malformed records reject the import before replacement.

Each subscription has an existing-style unique `id`, personal `name`, positive LKR `amount`, `method` (bank/cc), optional account/category defaults, `frequency` (daily/weekly/monthly/quarterly/annually), local-date `nextDueDate`, `anchorDay` (1–31), `status` (active/paused/cancelled), optional `serviceId` and generic `icon`. The UI labels annually as Yearly. Users choose Next Due Date or Last Paid Date when entering a date; the latter calculates the next renewal without fabricating a historical expense. A cancelled schedule remains available under Paused / Cancelled and can be resumed. No financial history is removed.

Occurrence IDs are deterministic: subscription ID plus the original due date as YYYYMMDD. Records store subscription ID, due date, status (paid/skipped/snoozed), snooze deadline or handled timestamp, and payment reference, kind, amount and date when paid. Financial entries carry `subscriptionId` and `subscriptionOccurrenceId`. Removing a financial entry does not reopen that renewal. Linking rejects an entry already referenced by another occurrence, even if its own link fields are absent.

## Recording and recurrence

Creating/editing a schedule never deducts money. Paid opens an editable confirmation form. Bank/cash recording requires a visible account, sufficient funds and valid category; it creates one expense and deducts the balance. CC recording creates one unpaid purchase, with optional category, and enables the existing CC section if hidden. Linking an existing entry changes neither its amount nor account balance.

Financial changes, occurrence status and next date commit together through saveData. Failed saves restore the previous state; pending writes, stale drafts, PIN locks and outdated database revisions reject writes. A repeated decision for an already advanced renewal cannot create another charge. Cross-device divergence continues using explicit whole-copy Sync review, not record merging.

Daily/weekly renewals advance one/seven calendar days. Other periods advance by calendar months and clamp to the last available day while retaining anchorDay, including leap years. Each confirmation handles one occurrence; missed periods remain overdue until handled or the date is edited. No catch-up expenses are generated automatically. Remind Me Later snoozes for six hours in one action and changes only the reminder time; the next eligible launch/focus/timer check then reminds again. Skipping advances once without spending. Pause/cancel stop reminders; resuming retains the saved due date.

## Reminders and matching

Due/overdue reminders are grouped when the app is open and unlocked. They avoid open dialogs and active input. A device preference records shown occurrence tokens for the current local day, so removing or snoozing another item does not repeat already-seen reminders. A new due occurrence or expired snooze becomes eligible. Launch/unlock, focus and a minute timer recalculate eligibility. Closed-app Android/OS notifications require separate implementation.

Name matching is case-insensitive and checks whole phrases inside longer personal names. The longest match wins; equally specific brands require an explicit choice. Picking artwork preserves a personal label already identifying that service. A Custom choice overrides automatic artwork. Related brands remain separate identities; multiple Adobe products share a single local logo. Unknown/unavailable brands use an initial or generic gym, internet, insurance or other icon. The optional maintenance downloader fetches only image assets; it never runs in the client.

## Compatibility and verification

The adjacent public web checkout can be smoke-tested for importing/saving/exporting these unknown fields; that optional test skips when the sibling checkout is absent. Its existing generic JSON preservation retains the new arrays, but it does not manage renewals. The Android model's source-JSON copy/export design also retains unknown collections; this update does not implement Android subscription UI or execute Android tests. Avoid recording the same renewal manually on another client without linking it when returning to beta.

Run npm test for domain, backup, native IndexedDB transaction and schema-upgrade regressions. KAASI_SUBS_QA=1 with tests/serve-sync-qa.cjs provides disposable schedules and fake cloud data for browser QA; never use it with real financial data. Production Supabase policies and physical-device/PWA update behaviour require the existing release verification process.
