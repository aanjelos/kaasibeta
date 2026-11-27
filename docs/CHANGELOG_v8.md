# Kaasi v8 - Development Changelog

Versioned features, bug fixes, and maintenance updates for Kaasi Beta, listed newest first. V8 development builds use `v7.<internal number>m` until the public V8 release. Earlier maintenance builds are in the [V7 changelog](v7%20Changelog/CHANGELOG_v7.md).

## v7.553m

- Rework All Transactions and Credit Card History & Payments as full-screen workspaces with responsive summaries and dashboard navigation.

## v7.552m

- Use brand orange with ivory labels and icons on light-mode primary buttons.

## v7.551m

- Brighten light-mode primary actions while retaining white labels.

## v7.550m

- Refine light mode with ivory cards on beige, warm chart labels and higher-contrast financial colors and orange accents.

## v7.549m

- Disable browser form-history suggestions and typing corrections on description and name fields with Kaasi suggestions, and on search fields.

## v7.548m

- Use the brand orange for category icons and reduce the glow opacity.

## v7.547m

- Add healthcare, medication and everyday category icons, plus searchable A–Z initials. Soften the category glow with a wider blur.

## v7.546m

- Match the category icon picker’s no-results state to transaction history and soften the orange icon glow.
- Save and close the category icon picker when an icon is selected, cleared or reset.

## v7.545m

- Give Total Potential a warm neutral surface and clarify that it includes cash owed to the user.

- Align debt, receivable and installment controls in payment, edit and delete order. Use neutral edit icons with an orange hover and focus state in those lists and transaction history.

## v7.544m

- Replace the Batch Entry header button with a table icon.

- Add framed category icons to Recent Transactions and All Transactions, with a searchable picker in Settings. Save current choices in backups and sync.

## v7.543m

- Distinguish account sync from backup files, clarify which copy a replacement keeps, and show the differences immediately with pagination for longer comparisons.
- Keep calculator visibility on the current device. Use its existing setting as the starting preference without changing older backup records.

## v7.542m

- Match the Expense Categories, Storage Usage, Quick Action Shortcut and App PIN Lock headings to their peer Settings card titles.

## v7.541m

- Align standard entry fields, category pickers, history filters, Settings controls and tutorial fields at 14 px on desktop and 16 px on phones at the default browser text size.
- Reserve space for dropdown chevrons, align batch cell text, simplify category prompts and use the standard dropdown arrow for budget sorting.
- Match the title size and weight across the seven full-screen mobile lists and editors.

## v7.540m

- Give full-screen mobile lists and batch entry consistent side gutters, inset header dividers, and clearance around titles, close buttons and bottom actions for device safe areas.

## v7.539m

- Use full-screen mobile list views for All Transactions, Credit Card History & Payments, debts, receivables, subscriptions and upcoming payments, with a persistent close control.
- Reuse local transaction suggestions in batch descriptions, filtered by the row's entry type. Selecting a previous expense fills an empty category on that row.

## v7.538m

- Inset the dropdown chevrons and align dropdown labels with the other batch table cells.

## v7.537m

- Adjust batch table column widths and align amount headings with their values.

## v7.536m

- Redesign the batch editor as a table with inline cell validation and a sticky description column on phones.

## v7.535m

- Add batch entry for expenses and income, with review, stable UUIDs and a single commit for transactions and balances.

## v7.534m - 2026-11-26

- Use a lighter grey for category labels beneath budget names in monthly PDFs.

## v7.533m - 2026-11-26

- Show historical category labels beneath each budget name in monthly PDFs. Omit the category line when the sole category matches the budget name.

## v7.532m - 2026-11-24

- Align budget balances by decimal point in monthly PDFs and place the overspending label to the right.

## v7.531m - 2026-11-24

- Start optional PDF budget tables on a dedicated page after Category Breakdown. Color remaining balances green and overspending red in the Left column.

## v7.530m - 2026-11-24

- Remove Budget Progress from the monthly view. Optional monthly PDFs now show historical budgets in a compact table after transaction totals.

## v7.529m - 2026-11-24

- Store effective-month budget plans in IndexedDB, carrying limits and category assignments forward until changed or stopped. Show read-only Budget Progress above the monthly chart and optionally include it in PDF reports from Settings → Budgets.

## v7.528m - 2026-11-24

- Shorten the Stats exclusion toggle label to match the other Exclusion Rules.

## v7.527m - 2026-11-24

- List hidden-category settings under Exclusion Rules and add an off-by-default Stats rule that filters rankings, totals, activity and the share card.

## v7.526m - 2026-11-24

- Restore the Expense Tracker tagline in the inline Kaasi logo on the Stats share card.
- Move the share card stats upward to leave room for the Instagram Stories message box.

## v7.525m - 2026-11-24

- Add ranked expense and income lists to private Stats. Update the share card with the full Kaasi mark, activity counts and the highest-spend date.

## v7.524m - 2026-11-24

- Use the Kaasi wordmark inline with regular Instrument Serif on the share card, show a natural month range for partial years, and slightly strengthen the soft-light grain.

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
