# Kaasi v7 - Development Changelog

Versioned features, bug fixes, and maintenance updates for Kaasi Beta, listed newest first.

## v6.453n - 2026-10-30

### Consistent Dashboard View Buttons

- Share the same 44px minimum height and text size between All Transactions and View & Pay, retaining the existing secondary-button padding, border and icon spacing.

## v6.452n - 2026-10-30

### Transaction History Shortcut Placement

- Move the desktop All Transactions shortcut from the header to the Recent Transactions card, using the existing secondary button style. Show the card shortcut on mobile while retaining the hamburger entry and A keyboard shortcut.
- Allow the card heading and shortcut to wrap cleanly at narrow widths without truncating either label.

## v6.451n - 2026-10-29

### Compact Mobile Milestones

- Display two milestone cards per row on typical phones with reduced padding, 32px icons and 14px titles. Retain a single column at widths of 340px or less for readability.

## v6.450n - 2026-10-29

### Milestone Presentation and Longer-term Goals

- Give Extras its own Settings navigation group with Milestones opening directly in the content panel, without an intermediate hub or popup.
- Centre larger icons, titles and descriptions in vertical responsive cards. Add accessible progress bars to unearned measurable goals, retaining simple status labels for first-action awards and dates for earned awards.
- Start record goals at 100 and extend them through 250, 500, 1,000, 2,500, 5,000 and 10,000. Add three- and six-calendar-month journey goals, including end-of-month date handling. Preserve existing saved achievement metadata.

## v6.449n - 2026-10-29

### Milestone Dates

- Display Achieved followed by the unlock date on milestone cards. Derive historical count, recording-day and anniversary dates from the earliest qualifying retained records; use creation timestamps for debts, receivables and installments when available. Leave unsupported historical dates unspecified.
- Backfill previously undated awards without replacing known unlock dates or triggering celebrations. Keep dates in JSON backups.
- Remove New badges and device-specific viewed tracking. Opening Milestones no longer writes viewing preferences.

## v6.448n - 2026-10-29

### Extras and Milestones

- Add Extras under Information in Settings, with responsive milestone cards for first records, transaction counts, active recording days, anniversaries and optional feature discovery.
- Persist earned achievement IDs and timestamps with verified dataset metadata and JSON backups. Recognise existing records and imports silently; retain earned awards after source records are deleted.
- Show a restrained orange-accent toast after newly earned achievements; defer notifications while typing or using dialogs. Show New badges for unseen awards earned within seven days, with viewed state kept on-device.
- Add removable beta console helpers for non-persistent toast previews and explicit achievement resets. Document usage in MILESTONES_TESTING.md.

## v6.447n - 2026-10-29

### Installment Focus and Donation Settings

- Highlight the installment card and focused pay, edit or delete action during keyboard navigation, using an inset orange outline that remains inside the card.
- Move Donate from the dashboard footer into Settings under Information. Retain both bank accounts and copy-to-clipboard actions in a responsive Settings card.
- Add a December year-end recap export to the roadmap, with private financial details excluded by default.

## v6.446n - 2026-10-29

### Streamlined Amount-field Tab Order

- Skip calculator toggle buttons during Tab navigation in static and dynamically rendered forms. Preserve mouse/touch toggles and direct expression entry in amount fields.
- Clear focus from the submitted form after successfully saving income, expenses, transfers and credit card purchases, allowing dashboard shortcuts to work immediately after Enter submission. Preserve focus on validation or save failures.

## v6.445n - 2026-10-29

### Context-aware Floating Controls and Update Notice

- Place the calculator and shared tooltip one level above their source dialog, below higher dialogs, while retaining body-level positioning to avoid clipping. Hide floating controls when another dialog opens or PIN/restore protection starts; ignore disconnected, hidden or inert sources.
- Keep the update notice prominent on the dashboard but defer it during dialogs, unfinished transaction input, focused form controls, saves, sync and security/recovery screens. Re-evaluate visibility when interactions and protected-screen state change.
- Preserve the existing toast notification layer and behaviour.

## v6.444n - 2026-10-29

### Visible Cloud Restore Lock

- Dim the screen and block background interaction and app keyboard shortcuts before fetching a newer cloud copy, retaining the lock through validation, local replacement and interface refresh. Metadata-only checks, uploads and conflict comparisons do not show the overlay.
- Continue deferring automatic restores around unfinished entries and open dialogs. Keep revision/timestamp checks and recovery copies; release the lock on success, failure and timeout without overriding PIN or storage-recovery protection. Add no artificial delay.
- Show the same progress state when preparing an explicit cloud restore and when applying the confirmed copy. Preserve existing replacement confirmation and paused-sync behaviour.
- Simplify upload/restore confirmations to plain-language descriptions and short Upload/Restore actions while retaining the warning that changes present only in the replaced copy will be removed.

## v6.443n - 2026-10-29

### Batch Settings Changes for Cloud Sync

- Continue persisting Settings changes locally immediately, while deferring automatic cloud checks/transfers until Settings closes. Apply the same deferral to polling, focus, reconnection and switching away; local changes remain pending if the app closes before Settings does.
- Allow successful explicit saves for accounts, transfer fees, CC limits, security forms, categories, budgets and subscription definitions to schedule automatic sync while Settings remains open. The whole-copy transfer includes all current saved changes. Later edits require a new explicit save or closing Settings.
- Release the batch on Close, backdrop/Escape and browser Back exits, without releasing it on navigation between Settings sections. Failed validation/saves do not authorize transfers; manual cloud actions, pause and conflict safeguards retain their existing behaviour.

## v6.442n - 2026-10-29

### Quicker Automatic Sync Scheduling

- Reduce the debounce after saved changes from three seconds to 500 milliseconds. Group edits within that interval into one scheduled attempt; retain failure backoff, in-flight guards and local persistence.
- Keep immediate reconnect/focus checks and the existing best-effort upload when switching away. Closing an app is not a guarantee that an upload completes; pending changes remain saved locally.

## v6.441n - 2026-10-29

### Faster Verified Cloud Sync Preparation

- Begin independent cloud reads and local snapshot preparation together for unified Sync and paused manual transfers.
- Retain one full integrity-checked IndexedDB snapshot per sync attempt. At later checkpoints, verify that the saved revision, generation and dataset hash still match that snapshot instead of reconstructing and hashing every collection again. Checkpoints reject changes from other tabs, replacements and resets; unrecognised snapshots cannot use the fast path.
- Keep conditional cloud writes, final cloud timestamp checks, backup validation, staged-write verification, atomic activation and the previous local recovery copy. Storage schemas, backup JSON and Supabase configuration are unchanged; no partial syncing is introduced.
- Add repeatable synthetic before/after benchmarks and storage-backed restore race checks. Benchmarks exclude real cloud latency and browser rendering and are not production speed guarantees.

## v6.440n - 2026-10-29

### Consistent Branded Checkboxes

- Apply the existing orange checkbox treatment to visible native checkboxes, including single/bulk credit-card payment and debt-payment expense options. Retain checked state, label activation, keyboard focus and disabled behaviour.
- Preserve existing custom category checkboxes and Settings switches. Use native checkbox rendering in forced-colour accessibility mode.

## v6.439n - 2026-10-29

### Offline Dashboard Indicator

- Pulse the desktop and mobile dashboard cloud-sync indicators red while the browser reports an offline connection. Restore normal sync colours when connectivity returns; Settings controls and local-file users remain unchanged.
- Use a steady red indicator when reduced motion is requested. Offline financial changes continue to save locally through the existing storage flow.

## v6.438n - 2026-10-29

### Settings Keyboard Navigation

- Move focus from the desktop Settings sidebar into the displayed section's first available control with Tab. Shift+Tab from that control returns to the active sidebar section; nested dialogs retain their own focus handling.
- Remove standard Tab, arrow/Home/End and Escape instructions from Keyboard Shortcuts. Retain Ctrl+S as Sync Now for an explicit sync check or retry.

## v6.437n - 2026-10-29

### Device-specific Sync Pause and Import Protection

- Add Pause and Resume controls within Cloud Backup. Paused mode provides explicit Upload to Cloud and Restore from Cloud actions with replacement confirmation; both leave automatic transfers paused.
- Pause automatic sync before local-file imports and atomically with local-file recovery. Reject imports during a cloud transfer. Import notifications identify the paused state, which persists on the device and is excluded from backups.
- Require comparison before resuming with differing copies, even when only local data changed. Close/cancel leaves sync paused; only a successful explicit replacement or an equal-copy check resumes transfers.
- Continue metadata-only checks while paused and show a warning and Review Copies action when both datasets changed. Dashboard Sync Paused opens Data & Backups instead of transferring data. Keep status text on one line at a readable mobile size.
- Defer record-level merging. Supabase schemas, policies and public-client data formats are unchanged.
- Keep the mobile Sign Out action in the cloud account row as an accessible icon button instead of a detached second row.

## v6.436n - 2026-10-28

### Audit Reliability and Privacy Fixes

- Validate account edits on a draft and reject the whole submission before changing live account balances or names.
- Require an explicit first-upload decision for an unassociated cloud identity. Track the local dataset's cloud association so switching back to a previously used account cannot silently upload another account's local changes.
- Restrict service-worker app-shell navigation to the root and index entry routes. Standalone documents keep their own routing; optional CDN/font download failures no longer prevent a verified core worker installation.
- Cancel timed-out cloud requests where the transport supports abort signals, while retaining fresh comparison and conditional writes to reconcile uncertain server completion.
- Prune obsolete subscription reminder preferences, migrate current legacy choices once, and retain snoozes when a financial save fails.
- Pin the Supabase SDK to the currently resolved 2.118.0 release and add browser integrity checks to the Supabase, Chart.js and jsPDF scripts. The existing visual PIN lock and recovery flow are unchanged.

## v6.435n - 2026-10-28

### Consistent App Refreshes

- Check a small release manifest on navigation and reuse the cached app shell when unchanged. Download changed releases once and verify HTML, JavaScript and CSS hashes before serving the new shell.
- Serve versioned application assets only from their verified build cache, preventing an old HTML document from fetching newer code under an outdated version query. Retain the last working shell for offline or incomplete-deployment fallback.
- Bypass HTTP caching for service-worker update checks. Existing installation prompts remain available; no financial databases or browser preferences are cleared.

## v6.434n - 2026-10-28

### Sync Controls and Conflict Prompts

- Replace the desktop cloud shortcut with a compact clickable gray status followed by a sync icon before All Transactions. Match the smaller icon on mobile and group it beside the hamburger menu. Keep local file actions unchanged.
- Show Up to Date when copies match; keep the last successful sync time in the hover tooltip using relative dates and 12-hour AM/PM time. Retain rotating icons while syncing and visible keyboard focus with a generous click target.
- Open conflict comparison automatically once per cloud revision per session, deferring around active forms and dialogs. Dismissed comparisons remain available through Sync without repeatedly reopening; new cloud revisions can prompt again. No copy is replaced without an explicit choice.

## v6.433n - 2026-10-28

### Automatic Cloud Sync

- Sync signed-in IndexedDB users after saved changes with a three-second debounce, on launch/unlock, focus and reconnection, and with thirty-second checks while visible. Unchanged checks transfer metadata only; offline edits stay saved locally for the next attempt.
- Retain manual Sync and conflict review. Automatic checks never select between conflicting copies or open an unsolicited review dialog; the header displays Review Changes instead.
- Show quiet sync status beside dashboard Sync icons, with no success toasts for automatic transfers. Retry failed requests with backoff and a request timeout; attempt pending uploads when switching away without relying on background execution.
- Defer automatic downloads around open dialogs and unfinished dashboard inputs, recheck local/cloud revisions before replacement, and prevent new input during the short atomic apply step. Existing recovery snapshots and conditional cloud writes remain in use.

## v6.432n - 2026-10-28

### Device-only Subscription Reminders

- Store six-hour snoozes and renewal reminder dismissals in device preferences without changing financial records or marking cloud data as modified.
- Exclude temporary reminders and the unused budget-tip dismissal setting from exported backups, cloud uploads, sync hashes and conflict comparisons. Ignore these fields in older imported backups while preserving payment history and unknown data.
- Preserve existing local reminder choices and upgrade unchanged sync baselines without uploading the dataset.

## v6.431n - 2026-10-28

### Settings Transition Scope

Restricted mobile slides to navigation between Settings views. Removed the delayed outgoing animation from Back and cancel active section animations when Settings closes or reopens, preventing stale transitions when returning from the dashboard.

## v6.430n - 2026-10-28

### Focus Visibility and Settings Motion

- Added inset focus outlines to debt and receivable accordion headers and highlighted the entry containing the focused action.
- Added subtle forward and Back transitions to mobile Settings navigation, respecting reduced-motion preferences and preserving focus restoration.

## v6.429n - 2026-10-28

### App-wide Keyboard Access

- Added keyboard activation to transaction details, credit card action drawers, debt/receivable groups, monthly day groups and budget transaction links.
- Excluded collapsed list controls from keyboard navigation and added accessible names to icon-only actions and calculator buttons.
- Extended visible focus indicators to the dashboard. The mobile menu supports Escape and focus containment; PIN entry retains focus within its controls.
- Escape closes the top dialog, including credit card details, and dashboard shortcuts no longer open unrelated views behind dialogs.

## v6.428n - 2026-10-28

### Keyboard Navigation and Mobile Dialog Focus

- Phone dialogs initially focus their container so opening a form does not automatically raise the keyboard. Desktop form autofocus and intentional field editing remain available.
- Tab and Shift+Tab wrap through visible controls in the top dialog; closing a dialog restores focus to its opener where available.
- Added Settings section navigation using Up/Down/Home/End, keyboard activation of custom button controls, and Enter/Escape handling for inline category rename.
- Prevented dashboard shortcuts from firing behind Settings and documented navigation keys in shortcut help.

## v6.427n - 2026-10-28

### Settings Follow-up Refinements

- Saving an unchanged category name closes inline editing without writing data.
- Tightened credit card toggle spacing and made Add Category full-width on mobile.
- Renamed the cloud shortcut option to Cloud Sync and moved the mobile version label below the Settings menu.

## v6.426n - 2026-10-28

### Settings Usability Refinements

- Added inline category rename, visibility and deletion actions with an in-app deletion confirmation and existing usage checks.
- Reorganized account, credit card, budget and backup controls; restored side-by-side mobile account fields and placed creation actions above lists.
- Refined exclusion rules, security buttons, deletion cancellation, shortcut contrast and About typography; moved the version to the desktop sidebar.
- Escape closes Settings instead of navigating through previously viewed sections. Confirmation amounts stay together on one line.

## v6.425n - 2026-10-28

### Subscription Payment Presentation

- Reduced the renewal reminder dialog width and placed Pay and Remind Me Later directly below each subscription, with quieter dismissal and management controls.
- Grouped each upcoming payment amount with its name and due status, keeping Pay aligned beside the details on small screens.
- Dashboard payment notices open the matching payment form directly; the overflow link opens the full upcoming list.

## v6.424n - 2026-10-28

### Payment Reminder and Upcoming Payment Layouts

- Reorganized reminder and upcoming payment rows to keep payment details and Pay actions together across desktop and mobile.
- Grouped reminder choices and subscription management in an expandable menu for each renewal.
- Updated debt and receivable payment icons while retaining their action colours, labels and touch targets.

## v6.423n - 2026-10-28

### Subscription and Payment Controls

- Added an option to dismiss reminders for an individual subscription renewal until it is paid or skipped, while retaining the six-hour reminder option and upcoming notice.
- Removed the redundant Close button from the reminder dialog.
- Refined debt and receivable action spacing and replaced payment icons with direction and colour appropriate to each action.
- Applied the Kaasi accent colour to the renewal-date checkbox.

## v6.422n - 2026-10-28

### Dashboard and Payment Refinements

- Display budget names and status on separate lines and show six recent transactions without an inner scroll area.
- Align mobile credit card summaries with monthly summaries and truncate lengthy transaction descriptions in lists.
- Use accessible icon buttons with larger touch targets for debt and receivable actions.
- Show dismissed subscription reminders again on the next app launch; the six-hour reminder remains available.
- Allow overdue subscription payments to reset the renewal schedule from the payment date.

## v6.421n - 2026-10-27

### 1. [UI] Responsive Settings Workspace

Replaced the tabbed Settings dialog with an in-app full-screen workspace. Desktop uses grouped sidebar navigation; phones use a grouped menu and a dedicated screen for each section. Existing settings controls, immediate-save toggles, explicit form saves, validation and stored data are retained. Supporting text uses 12px, with larger labels and controls and theme-aware contrast. Account fields stack on narrow phones so names and balances have room to display.

### 2. [UX] Category and Budget Management

Categories appear as compact rows; their row editor exposes the existing rename, hide/show and delete actions. Adding categories and budgets opens the original forms in dedicated dialogs. Hidden-category rules remain available below the category list, with more space between labels and switches; advanced rules now expand on the first click. Budget rows show monthly spending against the limit, with edit/delete actions and all existing sorting choices retained.

### 3. [UI] Data, Subscriptions and About Sections

Reorganized Data & Backups into cloud, local file, storage, shortcut, reminder and deletion cards. Retained Smart Schedule, the storage-protection request and slide-to-delete safeguard; storage usage has no implied quota meter. The Subscriptions section shares the existing manager, records and Active/Paused filter with the dashboard, with workspace-specific spacing. About & Support retains the existing credits, contact details, personal logo, version and backup information. PIN, security-question and recovery behaviour is unchanged.

### 4. [Fix] Settings and Nested-Dialog Navigation

Settings section navigation participates in browser Back/Forward history. Back returns through nested dialogs and sections before closing Settings; backdrop taps dismiss the top dialog. Closing Settings after restore removes its nested navigation branch before proceeding, preventing stale confirmation screens or extra Back steps. File restore and data-reset flows wait for that navigation to complete. Calculator fields, transfer-fee settings and financial handlers remain unchanged.

## v6.420n - 2026-10-26

### 1. [UI] Top-Aligned App Update Notice

Moved the app update notice to the top centre of the viewport, with mobile safe-area spacing. The notice remains fixed while scrolling and retains its existing width constraints and update action.

## v6.419n - 2026-10-26

### 1. [Fix] App Update Activation and Failure Feedback

The Update Kaasi action now disables repeated taps and shows an updating state while applying a waiting service worker. It handles activation by another tab during preference writes, listens for both worker activation and controller changes, and removes temporary listeners after completion. Preference-write, messaging, superseded-worker and activation-timeout failures now show an actionable retry message instead of an unhandled error. Pending financial writes still block updates; activation does not modify financial records or cloud backups.

## v6.418n - 2026-10-26

### 1. [UI] Mobile Monthly Transactions and Subscription Management

Replaced the mobile monthly view's three large summary cards with compact total rows and placed Filters beside search. Transaction amounts consistently occupy a separate row on phones; descriptions show up to two lines, with full text retained in transaction details. Subscription management uses compact icon/name/amount/action columns, retaining its existing dashboard entry and shared subscription data.

### 2. [UI] Responsive Financial Summaries and Installment Controls

Organized YTD earnings/spending and Today/Past 7 Days into labelled mobile summary cells. Receivable/debt amounts receive a separate row at narrow widths; budget names and status text wrap without clipping. Budget tooltips keep currency values together within viewport bounds. Installment totals align left on phones, action buttons have adjacent 44px touch targets, and the confirmation uses full-width mobile actions. Removed native number steppers from numeric inputs on desktop and mobile without changing their validation or calculations.

### 3. [UI] Responsive Chart Window and App Update Notice

The rolling income/expense chart shows six months below 640px and twelve months on larger screens, updating its title and existing chart instance when the breakpoint changes. Replaced the unpositioned footer update button with a fixed, labelled update notice and prevented duplicate notices. Applying an update retains the existing pending-save guard and preference flush.

## v6.417n - 2026-10-26

### 1. [Fix] Overdue Timing Colour in Subscription Lists

Fixed a more-specific secondary-text style overriding the overdue colour in subscription lists. Overdue timing lines now use the expense red consistently with dashboard reminders; names and amounts retain their existing colours.

## v6.416n - 2026-10-26

### 1. [Fix] Retain Overdue Renewals When Adding a Past Payment Date

A past Last Paid / Next Due Date now advances by exactly one selected billing period rather than skipping missed renewals until the present. The resulting renewal can remain overdue and appears in existing reminders. Today and future dates remain direct due dates. The form preview shows the calculated renewal and its due/overdue status. The same rule applies to daily, weekly, monthly, quarterly, bi-annual and annual schedules, retaining month-end/leap-year anchors. Editing unrelated fields preserves existing due dates; adding a schedule never creates past charges or changes account balances.

## v6.415n - 2026-10-26

### 1. [Fix] Transparent Fansly Logo

Removed the dark square baked into the Fansly artwork while preserving the blue symbol. Added the background treatment to the asset maintenance pipeline so future refreshes retain transparency.

## v6.414n - 2026-10-26

### 1. [Feature] Passes and Fansly Catalogue Entries

Added Passes and Fansly with bundled, optimized logos. Passes uses normal search matching. OnlyFans and Fansly can appear from “fan” onward, while “fa” still excludes both; OnlyFans also retains its “only” prefix. Existing saved subscriptions remain unchanged.

### 2. [UI] Muted Subscription Empty-State Icons

Subscription empty-state icons now use low-contrast grey rather than orange, matching the visual treatment of existing empty transaction lists and charts.

## v6.413n - 2026-10-26

### 1. [UX] Require an Explicit Prefix for OnlyFans Suggestions

OnlyFans appears in service search suggestions only after a search word begins with “only”, case-insensitively. Short or incidental fragments such as “fa”, “fans” and “onl” no longer surface it; Facebook remains available through “fa”. Existing subscriptions and full-name logo recognition are unchanged.

## v6.412n - 2026-10-26

### 1. [UX] Subscription Search Keyboard Controls and Visible Icon Selection

Lightroom searches now match Lightroom Mobile instead of the generic Adobe entry. Service suggestions support Up/Down navigation, highlighted selection, Enter to choose the highlighted or first result, and Escape/Tab dismissal without accidentally saving the form. The icon selector is always visible below the subscription name; the adjacent logo is a preview rather than a hidden picker trigger. Search prioritises exact names and prefixes over substrings, with short alias fragments filtered out so EA Play leads searches for “ea”. Existing saved subscriptions and payment behaviour are unchanged.

### 2. [Feature] Expanded Subscription Catalogue and Dark Logo Frames

Added 25 services with bundled logos and keyword aliases, bringing the catalogue to 155 entries. YouTube Music has its own choice, and Google Health Premium reuses the existing Fitbit service ID to preserve saved references. Existing requested services are reused rather than duplicated. All frames now use the same dark background; Adobe uses red, LinkedIn and Salesforce use blue, Microsoft uses its four-colour symbol, and Trello, Canva, Slack and Google use coloured variants. PEO TV shares SLT-MOBITEL artwork. Replaced several long wordmarks with compact official-site symbols; genuinely monochrome brands retain their appropriate marks. New raster assets are resized to 96px WebP, source records are retained, replaced files are removed, and the artwork manifest lists every bundled file.

### 3. [UX] Transparent Subscription Marks and On-Demand Artwork

Removed the solid tile backgrounds from Hulu, Magnific, Dialog Viu, Monday.com and Epidemic Sound; Nintendo Switch uses a transparent symbol. Meta-family catalogue labels are simplified to Meta, Facebook, Instagram and WhatsApp while retaining subscription-related aliases. Logo images are no longer precached during service-worker installation: lazy image requests fetch individual versioned files only when displayed and cache them for offline reuse. Previously unseen logos require connectivity on first display. No external logo service is contacted by the app.

## v6.411n - 2026-10-26

### 1. [Fix] Preserve Decimal Zeros in Amount Fields

Shared calculator-field evaluation and submit validation now retain two decimal places when an amount contains a decimal point or produces a fractional result. Values such as 2379.50, 1.50 and 1.00 no longer lose trailing zeros; plain whole-number entries remain whole numbers. Financial parsing and stored numeric values are unchanged.

## v6.410n - 2026-10-25

### 1. [UX] Immediate Sync Progress Feedback

Desktop and mobile dashboard Sync icons now spin throughout the existing busy state, starting before local snapshot/hash work or network requests. Controls expose their busy state to assistive technology and remain disabled against repeated taps. The Settings progress indicator and existing success/failure notifications remain in place; icons reset when Sync finishes or stops for copy review.

## v6.409n - 2026-10-25

### 1. [UI] Contain Long Names and Large Financial Values

Added responsive wrapping and minimum-width constraints to transaction details, recent/monthly transaction rows, calendar-year and quick-stat totals, monthly summary cards, debt headings, subscription actions and reminders. Monthly chart canvases stay within their panels. Budget sorting controls wrap below the heading when needed, and Cash Counter columns can shrink without spilling outside the modal.

### 2. [UI] Wrap Currency Values at Thousands Separators

Rendered LKR amounts gain optional line breaks after commas while each digit group and its decimals stay together. Formatting is applied only to displayed DOM text, including animated and newly rendered values; textContent, editable inputs, financial state, exports and backups retain the original values.

## v6.408n - 2026-10-25

### 1. [UI] Responsive Credit-Card Balance Summary

Right-aligned Available and placed each credit-card summary label above its amount. Limit and Available share a row when space permits and wrap into separate rows when their amounts need more room. Exceptionally long values can wrap within the card instead of overlapping or overflowing.

## v6.407n - 2026-10-25

### 1. [UI] Restore Mobile Subscriptions Icon

Removed the obsolete narrow-screen rule that hid the Subscriptions button icon. The icon now remains visible beside its label in the stacked mobile dashboard actions.

## v6.406n - 2026-10-25

### 1. [UX] Larger Transaction Action Hit Areas

Expanded the invisible Edit and Delete click targets in Recent Transactions and All Transactions without changing icon size, row padding or spacing. Horizontal targets meet halfway across the existing button gap without overlapping. Existing event handling routes these clicks directly to the action instead of opening transaction details; keyboard focus indicators remain visible.

## v6.405n - 2026-10-25

### 1. [UI] Simplify Transaction Details

Removed Save As Subscription from regular expense and credit-card detail dialogs. Subscriptions remain available through Manage Subscriptions → Add New; existing financial records and subscriptions are unchanged.

## v6.404n - 2026-10-25

### 1. [UI] Icon-Only Mobile Sync Control

Removed the background, border and shadow from mobile header Sync to match the adjacent menu icon. Retained its 48px touch target, keyboard focus indicator, busy state and sync-status flashes. Desktop controls are unchanged.

## v6.403n - 2026-10-25

### 1. [Improvement] Responsive Dashboard Controls and Balances

Cloud mode now provides a directly accessible mobile header Sync button with existing status flashes and busy-state handling. Local mode retains import/export in the menu. Mobile debt and subscription actions stack with larger touch targets. Balance amounts fit their available width after value animations and resizing, and summary tiles respond to card width, filling the final row in two-column layouts. Calendar-year totals now exclude future-dated entries and use the YTD label. Removed the completed mobile Sync item from the roadmap.

## v6.402n - 2026-10-24

### 1. [Cleanup] Remove Obsolete Subscription Service-ID Mapping

Removed the compatibility map for earlier experimental Adobe product IDs and the former Freepik ID. Service lookup now uses current catalogue IDs directly. Product-name aliases still match personal labels to Adobe or Magnific artwork. Updated catalogue tests and documentation; modal layouts and financial data handling are unchanged.

## v6.401n - 2026-10-24

### 1. [Improvement] Reminders Below Transaction Entry

Moved the upcoming-payments strip to the bottom of Add Transaction on desktop and mobile. It leaves desktop Balance Overview and transaction-entry controls at fixed positions as reminders appear or disappear, while retaining the mobile sequence of transaction entry, reminders and balances. The strip uses the card's bottom corners and disappears without leaving an empty section when nothing is upcoming. Narrow containers place amounts beneath the name/date so full subscription names remain readable in the desktop sidebar and small mobile screens. Three-entry previews, overflow navigation and payment behaviour are unchanged.

## v6.400n - 2026-10-24

### 1. [Improvement] Earlier Payment Reminders and Mobile Dashboard Order

Moved the existing upcoming-payments strip to the top of Balance Overview on desktop and mobile, retaining its three-entry preview, overflow link and hidden state when no payments are upcoming. Mobile keeps Add Transaction first, followed by Balance Overview with reminders, Recent Transactions, Credit Card, Debts/Receivables/Installments, Category Budgets and the yearly chart. Desktop columns and card order remain unchanged. Notice edges follow the Balance Overview card's padding at each breakpoint. Payment, recurrence and storage logic are unchanged.

## v6.399n - 2026-10-24

### 1. [Improvement] Independent Subscription Payments and Simple Date Corrections

Pay now creates a normal independent expense or unpaid CC purchase and advances the subscription's renewal date in the same save. New payments have no subscription link fields or paid-renewal history records. Already Recorded only advances the date, and Skip Next Renewal creates no historical marker. Removed handled-payment eligibility checks, Edit Date fallback actions and Reopen Renewal confirmations. Users can correct the date directly after an accidental entry, while deleting/editing financial records remains independent of the schedule. Temporary snoozes are cleared when paying, skipping, changing dates or deleting a schedule. Existing saved transactions, balances and legacy metadata are preserved; stale forms, repeated submissions, PIN locks and failed-save rollback remain protected.

## v6.398n - 2026-10-24

### 1. [Fix] Correcting Previously Handled Subscription Renewals

Editing a renewal date back to a paid/skipped occurrence now offers Reopen Renewal confirmation when no linked payment remains, rather than saving a date that later fails as already handled. Reopening clears that occurrence's confirmation and refreshes its reminder token without changing financial entries or balances. A remaining linked payment blocks reopening with actionable guidance. Existing mismatched dates offer Edit Date in management and are excluded from upcoming/due alerts. Newly added schedules due today remain payable and create no payment history until confirmed.

### 2. [Improvement] Simplified Payment Actions and Already Recorded Flow

Renamed subscription action buttons to Pay in management, upcoming payments and reminder dialogs. Management now filters only Active/Paused. Already Recorded no longer requires selecting or linking a transaction: Update Renewal advances the schedule and saves an external confirmation without creating an expense, CC purchase or deduction. Existing linked history is preserved. Backup validation accepts explicitly marked external confirmations without a transaction reference; the JSON format remains portable, although older beta validators may reject that new optional record shape.

### 3. [Improvement] Clear Name Editing and Responsive Notices

Moved the logo beside the subscription name input and removed the duplicate canonical brand label, making the saved name/capitalization unambiguous. The icon control opens custom choices, retaining explicit custom artwork during name edits. Left-aligned the and X more link with the logos. Corrected notice offsets to match Recent Transactions card padding at desktop, tablet and narrow mobile breakpoints.

## v6.397n - 2026-10-24

### 1. [Feature] Cloud Backup Recovery During Startup Failure

Added Restore From Cloud to the storage recovery screen, including explicit Google sign-in when the saved session is unavailable. Recovery reads and validates the signed-in account's existing cloud backup before offering Download Cloud Backup or confirmed Restore Cloud Backup. It enforces the existing local-copy PIN and cloud-copy PIN where applicable, rechecks the account, cloud timestamp and local revision before replacement, and uses the existing staged recovery mechanism. Offline, missing, invalid, stale or failed responses leave local data unchanged. Returning to another recovery view discards late responses. The flow never uploads or changes the cloud row and requires no database schema changes.

### 2. [Improvement] Consistent Recovery and Pop-Up Action Labels

Applied title case to migration, recovery, backup-restoration, Google sign-in, Save As Subscription and custom-icon action buttons. Long recovery text wraps within narrow mobile screens. Added disposable cloud-recovery preview support and regression coverage for damaged-database recovery, protected copies, cancellation, account changes, concurrent writes and failed commits.

## v6.396n - 2026-10-24

### 1. [Improvement] Curated Subscription Catalogue and Shared Adobe Identity

Removed the requested service suggestions and consolidated seven Adobe product choices into one Adobe entry. Product keywords still match within personal subscription names. Added Lightroom Mobile with distinct Lr artwork, Google Play Pass and Lyfta. Freepik and Magnific share the Magnific identity and artwork. Legacy Adobe product IDs and freepik resolve to the current logos without rewriting saved names, identifiers, unknown fields or financial history; removing a catalogue choice never deletes an existing subscription.

### 2. [Improvement] Complete Offline Logo Coverage and Asset Cleanup

All 130 listed services now have bundled brand artwork. Filled 24 missing/new logo slots with optimized 96px WebP files from reviewed official websites and app listings, retaining per-file provenance and existing library licences. Corrected unrelated Hulu/PEO TV favicon results with verified brand sources. Removed 28 unused SVG files and their stale source records. The shared filename manifest supports SVG/WebP in both the UI and offline service-worker cache, with contrast-based frames retained. Custom subscriptions still support initials and generic icons. Database schema, backup format and cloud sync are unchanged.

## v6.395n - 2026-10-24

### 1. [Improvement] Identifiable Upcoming Payments and Simpler Artwork Controls

The notice area attached to Recent Transactions now displays the earliest three payments individually, with each service logo or debt icon, full name, relative due date and amount. Additional items use an and X more link to the existing complete upcoming-payments view. Removed the redundant Change artwork button and its separate picker; editing the subscription name still updates matching services and offers the custom-icon choice. Renamed the six-month interval to Bi-Annual between Quarterly and Annual. Stored recurrence values, financial records and backup formats are unchanged.

### 2. [Improvement] Simple Payment Modes and Category Defaults

Payment entry offers Add Expense (Add CC Charge for cards) or Already Recorded. The latter reveals a searchable selection of five existing entries at a time, with Show More for older records; linking never creates another expense or deduction. Saved category choices take precedence; otherwise the form selects Subscriptions & Memberships when available or the standard Select Category placeholder when absent. New subscription definitions use the same category default, and CC categories remain optional.

### 3. [Improvement] Contrasting Local Logo Frames

Logo frames use a light or dark background chosen from the rendered artwork's pixel contrast, independent of the app theme. Bundled metadata makes this work offline without runtime image analysis or external requests. Added a development-only analysis utility for regenerating choices when the artwork library changes; SVG files are unchanged.

### 4. [Improvement] Paused Subscriptions and Schedule Deletion

Renamed Archived to Paused. Management offers Edit, Skip Next Renewal, Pause/Resume and Delete; Remind Me Later is available only on renewal alerts. Deleting removes the schedule after confirmation while retaining all financial entries, account balances and renewal-history references. Legacy cancelled schedules appear as inactive entries in Paused and can be resumed or explicitly deleted. Backup validation continues accepting their existing stored status.

## v6.394n - 2026-10-24

### 1. [Improvement] Integrated Subscription Navigation and Consistent Forms

Moved Subscriptions into the I Owe view row beside Debts, retaining the two-row alignment with Owes Me. When debt widgets are hidden, subscription controls remain accessible in the same dashboard area. The manager now reserves its header for the title and close control; Add New sits with search and status filtering below. Refined mobile widths, typography, spacing and form controls to match existing transaction forms. The name field explicitly uses the standard text-input styling. Generic icon selections update the preview immediately, and the searchable artwork picker preserves personal names when choosing a different icon.

### 2. [Improvement] Single Renewal Date and Six-Month Frequency

Removed Start From and its date-mode selector. A single Last Paid / Next Due Date field treats a past date as a recurrence reference and advances to the first renewal on or after today, retaining month-end anchors and creating no past expenses. Today/future dates are used directly. Editing unrelated fields leaves an existing overdue renewal intact. A preview shows the calculated next renewal for past reference dates. Renamed Yearly to Annual and added the biannual interval labelled Every 6 Months, stored as semiannually in compatible JSON backups. Existing schedules are not rewritten, and the database schema remains version 2.

### 3. [Clarification] Card Charge Versus Card Settlement

Credit-card subscription rows use Charged instead of Paid. Confirmation records an unpaid CC purchase and explains that settlement happens through View & Pay. Bank balances and logged spending change only through the existing card-payment workflow, whose category defaults continue to come from the purchase. Recording or linking a subscription charge does not settle the card or duplicate an expense.

## v6.393n - 2026-10-24

### 1. [Feature] Subscription Schedules and Confirmed Renewals

Added a dedicated Subscriptions manager with search, active/due/archived filters, and daily, weekly, monthly, quarterly or yearly schedules. Each schedule stores its name, amount, payment method, account, category and next renewal date. Users can enter the next due date directly or enter the last paid date to calculate it. Existing expense and CC purchase details offer Save as Subscription with prefilled values. Saving a schedule does not record spending or deduct funds.

Due and overdue subscriptions appear in a grouped in-app reminder with a one-tap Remind Me Later action that snoozes for six hours. Users can confirm a payment, link an existing expense/purchase, skip a renewal, edit, pause or cancel. Bank/cash confirmation creates an expense and deducts its account; credit-card confirmation creates an unpaid purchase and makes the CC section visible. Linking an existing entry creates no second charge. Stable occurrence IDs and the existing atomic save boundary keep the financial record, balance and next date consistent. Short months and leap years retain the intended renewal day. Recorded history survives cancellation and deletion of a linked transaction.

### 2. [Feature] Upcoming Payments Bar

Attached a compact notice bar to the top of Recent Transactions. It groups active subscription renewals and outstanding dated debts due within seven calendar days, including overdue items, with a review window for dates, amounts and actions. Counts refresh after changes, on focus and across local date changes. Reminders run while Kaasi is open; no background operating-system notifications or automatic payments are scheduled.

### 3. [Improvement] Local Service Artwork and Personal Names

Added a searchable service catalogue, bundled offline logos, generic subscription icons and an initial fallback. Brand matching recognises whole keywords within longer names such as Work ChatGPT and PickMe renewal for my girlfriend without replacing personal labels. Local entries include PickMe Pass, Uber One and Sri Lankan telecom services. Related products retain distinct service identifiers while sharing artwork where appropriate, including one Adobe logo file for its product family. All assets and provenance are organized in img/subscriptions; no name or logo lookup is sent to an external service at runtime.

### 4. [Storage] Subscription Collections and Backup Compatibility

Upgraded the local IndexedDB schema from 1 to 2 with subscriptions and subscriptionOccurrences object stores. The upgrade preserves existing snapshot contents and hashes, including compatible subscription fields already carried by an older build. Schedules and renewal records use the existing whole-dataset JSON/cloud backup format and participate in cloud comparison; no Supabase schema change is required. Missing optional collections in older backups remain valid, unknown compatible fields are preserved, and malformed new records are rejected before replacement. Category renames update schedule defaults; eligible category deletion clears them without changing prior payments.

## v6.392n - 2026-10-23

### 1. [Copy] Consolidated Creator Credit

Setup and About now use one creator credit: Created by Aanjelo Salgado with Antigravity and Codex. Removed the separate sentence about AI refinement and the Gemini-specific attribution.

## v6.391n - 2026-10-23

### 1. [Improvement] Consistent Category Field Order and Choices

CC purchase add/edit forms place Category before Description, matching regular transaction entry. Shared display ordering keeps Other after all alphabetically sorted default and custom categories in CC purchase/payment selectors, transaction editing, debt-payment choices, history category filters and budget category pickers. Existing main transaction/payment dropdowns already place Other last. Sorting display choices does not reorder stored categories or change selected values, financial records or balances.

## v6.390n - 2026-10-23

### 1. [Feature] Optional Categories for Credit Card Purchases

Add/edit CC purchase forms accept an optional expense category. Categories appear in desktop history rows and purchase details; mobile history rows retain their existing date/payment-status layout. Uncategorized purchases omit the listing label. Adding or editing a purchase category does not create an expense or modify previously recorded payments.

### 2. [Improvement] Payment Category Defaults

Single and multiple payment forms prefill each purchase's saved category. Logging an expense requires a valid category; disabling expense logging continues to deduct the bank payment without requiring or recording a category. The first logged payment remembers its selected category on an uncategorized purchase, including partial payments. Later payment overrides affect only that expense. Category renames update purchase defaults; deleting an eligible category clears them. Legacy purchases remain valid, and backup validation preserves valid optional categories while treating missing references as uncategorized. No database or Supabase schema change is required.

## v6.389n - 2026-10-23

### 1. [Fix] Smooth Dashboard Chart Updates

The income/expense dashboard chart retains dataset objects and value arrays when transactions are added, edited or deleted, allowing existing points to animate to their new values instead of replaying series entrance animations. Renders with unchanged data and colours skip Chart.js updates. Legend visibility survives routine updates, daily/monthly view switching remains available, and transitions use a 400ms animation. Added regression checks for object identity, changed totals, unchanged renders and chart-mode switches.

## v6.388n - 2026-10-23

### 1. [Improvement] Credit Card Selection Toolbar Cleanup

Added a subtle vertical divider between the status filters and Select action on desktop and mobile. Removed the selection instruction; the existing selected-count/payment bar remains the selection feedback.

## v6.387n - 2026-10-23

### 1. [Improvement] Labelled Credit Card Selection Control

The checklist action now includes a visible Select label and sits after the All, Unpaid and Settled filters with separate spacing. Selection mode changes the label to Cancel and displays Tap purchases to select until a purchase is selected, after which the existing selected-count/payment bar provides feedback. Mobile uses a full-width search row followed by filters and the selection action, retaining touch-sized controls. Settled continues to hide selection controls.

## v6.386n - 2026-10-23

### 1. [Fix] Stale Payment Preview Handler on Reused Forms

Opening another shared form after a multiple credit-card payment could trigger the previous payment preview on input and throw a null-input error. Shared forms now clear their input handler before replacement, when closed explicitly, and when dismissed through browser history. Added regression coverage for all three lifecycle paths. Payment calculations and saved financial data are unchanged.

## v6.385n - 2026-10-23

### 1. [Fix] Calculator Toolbar Clipping

The shared calculator toolbar stays attached to the document body with fixed positioning instead of moving into an input's scrolling container. It floats over modal content, aligns with the active input, opens above it when there is insufficient space below, and clamps to the visible viewport with an eight-pixel margin. Viewport size limits prevent overflow on narrow screens; scrolling, resizing and mobile visual-viewport changes reposition the toolbar. Financial calculations are unchanged.

## v6.384n - 2026-10-23

### 1. [Improvement] Calculator Inputs for Multiple Credit Card Payments

Selected purchases' payment amounts now use the shared decimal calculator input and calculator toggle instead of native number inputs with increment/decrement arrows. Expressions use the existing amount parser, preview and payment validation. Single-payment fields already use this control.

## v6.383n - 2026-10-23

### 1. [Improvement] Lighter Credit Card Payment Forms

Single payments show the outstanding balance as a compact text line and omit Paid when no payments have been made. Partial-payment remaining balances and multiple-payment totals use simple summary rows instead of additional shaded cards. Removed repeated account-deduction helper text from both forms and shortened the single-payment category label. Financial behavior is unchanged.

### 2. [Improvement] Separate Selection From History Filters

Multiple selection is a compact checklist icon beside search, with accessible labels and tooltips; it changes to a cancel icon while selecting. Desktop search and filters share a row again. On mobile, the three filters occupy their own full-width row without competing with the selection action. Selection remains unavailable on Settled.

The entire selectable purchase row, including its outer padding and unused space, toggles selection. The dedicated selection button continues to support keyboard interaction without toggling twice.

## v6.382n - 2026-10-23

### 1. [Improvement] Focused Credit Card Selection

Multiple-selection mode now selects or deselects a purchase by tapping its row. Edit, Delete and individual Pay drawers are not attached in this mode. Selection controls are grouped with the history filters and disappear on Settled; switching to Settled exits selection and clears selected purchases.

### 2. [Improvement] Payment Summary Cleanup

The Remaining After summary appears only for a valid partial payment in both single and multiple payment forms. Full payments omit the zero remaining balance. Removed the single-payment instruction about entering a smaller amount. Payment calculations, account deductions, expense logging and saved data formats are unchanged.

## v6.381n - 2026-10-23

### 1. [Improvement] Direct Credit Card Payments

The dashboard credit-card section now has a labelled **View & Pay** entry point. Unpaid purchases show an orange **Pay** button directly in their history row on desktop and mobile. **Select Multiple** enables a separate selection mode with keyboard-accessible controls, pressed states, and a payment bar beneath the list. Cancelling selection clears it. The Settled filter now contains only fully settled purchases, leaving partially paid purchases in Unpaid.

### 2. [Feature] Partial Payments Across Selected Purchases

Each selected purchase has an editable payment amount, initially its full outstanding balance. Users choose the exact allocation, with no automatic distribution. A zero amount skips a purchase. The form previews the total payment and the selected purchases' remaining balance. Amounts, categories for positive payments, current outstanding balances, and available funds are validated before any financial mutation. Bank deduction, purchase payment totals, and optional expense records use the existing atomic save and rollback path. New expense records retain their purchase references; historical records and deletion behavior are unchanged.

### 3. [Improvement] Compact Payment Forms

Single payments show the purchase description, paid/outstanding summary, and a live remaining-balance preview. Multiple-payment rows place amounts and categories side by side, wrap long descriptions, and hide category controls when expense logging is off. Both forms explain the account deduction independently of expense logging. Mobile history uses compact summary cards and touch-sized payment controls; the selection bar stays in normal modal flow. Removed the completed payment-workflow and prominent credit-card-entry items from the roadmap.

Validation: automated financial/storage/sync regression tests cover partial allocations, skipped purchases, invalid and outdated amounts, insufficient funds, optional expenses, and failed-save rollback. Browser verification uses disposable synthetic data and a fake cloud account, with desktop and 390px mobile layouts. Application and service-worker versions are `v6.381n`.

---

## v6.380n - 2026-10-23

### 1. [Enhancement] Request Storage Protection Automatically After Launch

After startup/unlock, IndexedDB installations check persistence and request it automatically when off. Already-protected, unsupported, PIN-locked, and legacy-storage states do not request permission. A browser denial or prior unsuccessful request suppresses further automatic requests; the outcome is saved as a device preference. Settings retains a manual retry, and a successful grant clears the refusal flag. Migration's existing permission result is reused rather than immediately requesting again. Permission failures do not block opening the app, and browser decisions are never overridden.

### 2. [Enhancement] Align Storage Protection Status and Action

Moved the status directly beneath the Storage Protection heading and aligned the action beside that text block on desktop. Mobile retains its stacked full-width action. Reduced divider/status spacing and shortened the refusal message while retaining the backup reminder.

Validation: all 87 automated tests pass, including automatic request deduplication, remembered refusals, manual retry, browser denial, existing grants, unsupported APIs, PIN/legacy guards, migration result reuse, and existing storage/financial/sync checks. Inspected the revised card in a synthetic browser preview; the development screenshot is stored under `docs/dev screenshots`. Updated application/service-worker versions to `v6.380n`.

## v6.379n - 2026-10-23

### 1. [Fix] Explain Browser Storage Access Blocks

Storage access errors now open **Browser storage is blocked**, with instructions to allow site data in browser settings and reload Kaasi without clearing existing site data. This screen offers **Reload Kaasi** rather than exposing the browser's technical error or offering backup restoration while saving is blocked. It does not read recovery sources, reset data, or replace saved records. Opening the screen also invalidates earlier recovery-view callbacks.

### 2. [Enhancement] Clarify Silent Storage Protection Decisions

When a persistence request is declined, the existing status message explains that a browser may decide without displaying a permission prompt. The button continues to call the native persistence API directly; permission decisions remain browser-controlled. Enabled protection and the external-backup reminder retain their existing behavior.

Validation: all 84 automated tests pass, including blocked-storage guidance, data preservation, recovery-action suppression, persistence controls, and existing financial/storage/sync checks. Updated application/service-worker versions to `v6.379n`.

## v6.378n - 2026-10-23

### 1. [Enhancement] Reduce Settings and Budget Form Text

- Removed the local-data/cloud-Sync explanation from the Settings and setup About sections, retaining the AI credit and backup reminder.
- Removed the app-update/re-import reassurance from both backup notices, retaining the data-loss warning.
- Removed the single-category optional-name annotation from the add/edit budget labels. Budget-name behavior is unchanged.
- Removed the Storage Protection helper sentence, retaining its action, permission status, and external-backup reminder.
- Removed the local export/import explanation beneath the file actions, retaining the backup warning and existing import confirmations.

Validation: checked all matching text removals and surrounding markup, rebuilt Tailwind, and passed the whitespace/diff check. Updated application/service-worker versions to `v6.378n`. No financial, storage, or sync behavior changed.

## v6.377n - 2026-10-23

### 1. [Enhancement] Calmer Cloud Backup Settings

Removed pending-change colour pulses from the Settings Sync button; Dashboard shortcuts retain their upload/download/conflict indicators. The cloud timestamp now reads **Last backed up: Today / Yesterday at 7:30 PM**, using the device's local time and a readable date for older backups. Dates from another year include the year. Removed the explanatory paragraph beneath Sync.

### 2. [Enhancement] Dedicated Cloud Sync Keyboard Shortcut

Added **Ctrl+S** for cloud Sync when signed in, independently of the Dashboard button mode. **Ctrl+E** and **Ctrl+I** now consistently export/import local files. Updated shortcut help, Dashboard tooltips, Settings guidance, and startup tips. Input focus, PIN lock, and repeated-key guards prevent unintended operations; Ctrl+S suppresses the browser's Save Page action. Modified combinations such as Ctrl+Shift+S retain their normal browser behavior when unlocked.

### 3. [Enhancement] Shorter Sync Completion Notification

Successful cloud downloads now display **Sync complete. The cloud copy was applied.** Removed the recovery-copy detail from the success toast while preserving the existing bounded local recovery mechanism.

### 4. [Fix] Keep Sync Confirmation Actions on One Line

Shortened replacement confirmation actions to **Replace Cloud** and **Replace Device**, with non-wrapping labels. Confirmation action rows can wrap whole buttons on narrow screens instead of squeezing the sync button text onto multiple lines. Replacement warnings and confirmation safeguards remain in place.

Validation: all 53 application regression tests pass, including local/cloud keyboard routing, input/PIN/repeat guards, Settings pulse removal, calendar-relative backup times, and existing financial/sync checks. Synthetic browser checks verified Ctrl+S, the steady Settings button, relative backup time, both confirmation labels at 320px, cancellation, and the shortened download toast. Rebuilt Tailwind and updated application/service-worker versions to `v6.377n`. No live cloud operations were performed.

## v6.376n - 2026-10-23

### 1. [Enhancement] Keep Descriptions in the Entry Column

Removed repeated description previews and their expansion controls from the device/cloud value columns. Entries with wording changes display **Description Changed** beneath the entry name; **Show More** reveals both full descriptions in the expanded detail row, including short descriptions. Other changed values remain side by side. Description-only differences show dashes in the value columns. This changes comparison presentation only and preserves all detected differences and captured data.

Validation: all 51 application regression tests pass, including amount/description edits, description-only edits, full-text preservation, escaping, and expansion controls. Synthetic desktop/mobile checks confirmed clean value columns, both descriptions in expanded details, neutral counts, and no horizontal overflow. Updated application/service-worker versions to `v6.376n`. No live cloud operations were performed.

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
