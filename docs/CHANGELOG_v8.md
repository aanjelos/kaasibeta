# Kaasi v8 - Development Changelog

Versioned features, bug fixes, and maintenance updates for Kaasi Beta, listed newest first. V8 development builds use `v7.<internal number>m` until the public V8 release. Earlier maintenance builds are in the [V7 changelog](v7%20Changelog/CHANGELOG_v7.md).

## v7.523m - 2026-11-24

- Use the same outstanding cash receivable total to calculate Total Potential and automatically hide its dashboard card when that total is zero.

## v7.522m - 2026-11-24

- Remove redundant expense and share preview descriptions from Stats.

## v7.521m - 2026-11-24

- Give Stats separate panels for transactions, highlights, activity, and the share card. Align full-width export actions with the preview and label credit card purchases explicitly in Stats and the exported image.

## v7.520m - 2026-11-24

- Add Settings → Extras → Stats for annual and all-time transaction activity, logged income and expenses, spending highlights and a branded 1080 × 1920 share image generated locally from historical records.

## v7.519m - 2026-11-22

- Match Daily Note row edit and delete controls to the transaction list and add direct note deletion with confirmation. Keep both controls available with 44px touch targets on mobile.

## v7.518m - 2026-11-22

- Return Add Entry to Expense after saving an inline Daily Note. Reset the note editor to today's date and load today's saved note when present.
- Show the Daily Note indicator immediately to the right of the date in All Transactions.

## v7.517m - 2026-11-21

- Add the N dashboard shortcut to select Daily Note and focus the inline editor. List it in Keyboard Shortcuts.

## v7.516m - 2026-11-21

- Align the inline Daily Note character counter with the Note label, restoring standard spacing before the date field.

## v7.515m - 2026-11-21

- Match inline Daily Note fields and save action to the Add Entry card. Keep the history modal layout.

## v7.514m - 2026-11-21

- Rename the dashboard card to Add Entry and add an inline Daily Note option to the type selector. Selecting a date loads its note without moving a saved record. The history editor still supports moving or deleting notes.

## v7.513m - 2026-11-21

- Cap Daily Note input and backup validation at 256 characters. Keep the history note indicator visually subdued.

## v7.512m - 2026-11-21

- Put the Daily Note text field first, support Enter to save and Shift+Enter for line breaks, and simplify the dashboard, history and editor controls to icons.
- Allow moving a note to an unoccupied date without changing financial records. Limit new and edited notes to 256 characters and preserve previously saved longer notes in storage and backups.

## v7.511m - 2026-11-21

- Add Daily Notes from the Add Transaction card and edit them in All Transactions. Support plain text, emoji and up to 512 characters. Keep note-only dates in chronological history, including after the last transaction is removed.
- Store notes in a dedicated IndexedDB collection keyed by calendar date within each dataset generation. Include notes in JSON backups and existing cloud sync, accept older backups without notes, and validate unique dates and note text before restore.

## v7.510m - 2026-11-21

- Add a device preference under Appearance → Customize Dashboard for the Upcoming Payments window (3, 5, 7, 14 or 28 calendar days). Default to 7 days and retain overdue unpaid items in the dashboard notice and full list. Preserve subscription prompt timing, snoozes and dismissals.
