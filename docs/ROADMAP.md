# Kaasi Future Roadmap & Ideas

This document serves as a backlog for approved feature ideas, UI/UX improvements, and technical refinements to be implemented in Kaasi over time.

## Before v7

The monthly budget reminder refinement shipped in v6.477n. Subscription Suggestions From History was dropped on 2026-11-03; retain manual subscription creation and Save as Subscription.

Completed items were removed from the active backlog on 2026-11-02 at the user's request: Milestones, credit-card tracking workflows and starting expenses, mobile modal/Settings/accessibility refinements, UUIDs and IndexedDB work. Final release smoke checks still cover upgrades, backup/restore, PIN recovery, offline launches and cross-device sync. The temporary milestone debug script was removed in v6.476n. This roadmap cleanup does not constitute new live-environment verification.

---

## v9 Dashboard Redesign and Visual Direction

**Decision updated 2026-11-08:** Release v7 with the current dashboard after final release validation. The proposed sequence is v8 for statistics, Year in Review and December Christmas styling, followed by the complete desktop/mobile dashboard redesign in v9. These are planning targets, not committed dates. This section records direction only and does not authorize starting implementation.

### Scope and functionality

- Prefer a coherent redesign of dashboard hierarchy, spacing, grouping and presentation over successive cosmetic patches. Reuse existing financial logic rather than rewriting it for the redesign.
- Preserve every existing piece of information, figure, calculation, form, action, shortcut, navigation destination and dashboard visibility preference. Inventory current functionality before designing and use that inventory for acceptance checks.
- Cover transaction entry (expense, income and transfers), balance/account summaries, Total Potential, recent activity/history access, budgets and their monthly reminder, credit-card entry/history/payments, debts, receivables, installments, upcoming-payment notices, charts and header actions.
- Preserve IndexedDB migration/recovery, historical IDs, unknown JSON fields, backup compatibility, PIN behavior and cloud-sync safeguards. Do not change Supabase data or settings as part of presentation work.
- Keep the existing Settings workspace and its workflows; use its visual treatment as the reference for a more cohesive app.

### Brand and visual direction

- Retain Kaasi's name, symbol, Satoshi typography, established serif heading treatment where appropriate and terminology. Explore a visual evolution rather than committing to a full rebrand. Orange remains the preferred accent; compare the current brand orange (`#e67e26`) against the reference in previews before approving any new shade.
- **Preferred palette reference:** [Orange, charcoal and cream — dark/light pair](design-references/v9-orange-charcoal-cream.png). Saved from the user's first supplied image on 2026-11-03; original creator/source URL unknown. Use as visual inspiration, not a shipped app asset or a template to copy.
- Explore warm charcoal surface levels in dark mode and soft cream with lighter cards in light mode, supported by beige and muted warm greys. The first reference is the strongest preference for both themes; no other reference images were retained.
- Borrow the palette and surface contrast, with quieter effects suitable for financial information. Glowing edges, gradients and the reference's promotional card layout are not requirements. Check accent contrast and separation from expense/error red using real controls, balances and charts.
- Do not force blue, purple, pink or competitor-associated green as a replacement brand accent; the user prefers orange. Keep green/red for financial meaning. Burgundy and yellow were discussed as alternatives, not selected directions.
- Keep the current v7 light-mode refinement and dark-mode styling for release. The reference palette is for future v9 previews, not an instruction to restyle the current app.
- Follow Settings' restrained surfaces, subtle borders and lighter shadows. Reduce competing tile backgrounds and repetitive nested framing; align spacing, typography and corner treatment.
- Use orange for deliberate emphasis and actions, and retain green/red financial meaning. White labels on orange controls were restored by user preference in v6.485n; revisit their contrast during v9 palette work. Preserve readable light-mode balance and supporting text.
- Preserve accessible dialog naming, keyboard interaction, reduced-motion support and screen-reader chart information. Do not reintroduce a visible chart-data section/control; the user declined that addition.

### Desktop and mobile composition

- **Desktop:** Explore a deliberate workspace with prominent transaction entry, scannable balances and clearer relationships between recent activity, budgets and upcoming obligations.
- **Mobile:** Aim for an app-like web/PWA experience rather than merely stacking desktop cards. Explore dedicated screens and persistent bottom navigation for the main destinations, reducing unnecessary scrolling while retaining every existing piece of information and functionality.
- Keep transaction entry the primary action through a prominent Add Transaction floating action button (FAB), accessible across the main screens. Explore its placement alongside bottom navigation so it does not obscure content or controls; this is now part of the v9 design exploration.
- Explore bottom sheets for transaction details, filters and quick actions. Preserve screen scroll positions and filters when navigating back, and handle the phone keyboard, safe areas, browser Back button and focus deliberately.
- Use purposeful, lightweight animations for screen transitions, sheets and button feedback. Keep frequent transaction entry fast, respect reduced-motion preferences and verify performance on phones.
- Adapt navigation and composition independently for desktop rather than enlarging the phone layout. Keep financial calculations, storage and sync behaviour underneath the new interface unchanged; any future sync-engine changes need a separate checkpoint.

### Interactive in-app tour

- **Decision (2026-11-09):** Keep the tested tutorial for v7. Revisit its replacement alongside the v9 screens, bottom navigation and FAB, rather than rebuilding the tour immediately before release.
- Replace separate tutorial demonstrations with a short guided tour that highlights actual app controls using a dimmed background and attached explanations. Reuse the existing lessons and refined wording; advance relevant steps after the intended interaction rather than relying only on Next buttons.
- **Preferred library to evaluate:** [Driver.js](https://driverjs.com/) ([source](https://github.com/nilbuild/driver.js)), a dependency-free vanilla JavaScript library under the MIT license. Verify its current license, maintenance and accessibility before adoption; bundle a reviewed version locally for offline use and retain its license notice. No paid onboarding service or external account is required for this direction.
- Prototype transaction entry first: type selection, calculator, description and category, then show balances, history/search and optional features. Review desktop and mobile behaviour before replacing the complete guide.
- Practice must remain isolated from financial persistence, backup/export, cloud sync, financial-action analytics and milestone awards. The tour library does not supply this isolation. Keep destructive, restore, payment and security actions outside the practice flow; preserve the user's unfinished draft and restore their previous screen when exiting.
- Keep Skip/Exit available and replay from Settings starting at the beginning. Do not automatically force returning users through the replacement guide. Preserve completion tracking only for a genuinely completed tour, distinct from practice actions.
- Match Kaasi's approved v9 styling. Test phone keyboard/popover overlap, scrolling, safe areas, hidden sections, missing targets, interrupted tours, keyboard/focus handling, screen readers and reduced motion. Adapt steps to the controls actually available on each device.

### Sinhala localization

- **Requested 2026-11-12; explore with v9:** Offer Sinhala alongside English, with a clear language selector in Settings. Discuss default language and whether the preference is device-specific before implementation; keep switching reversible.
- Translate interface labels, navigation, forms, validation/errors, reminders, onboarding/tour, Settings and accessibility text using shared translation resources. Have Sinhala financial terminology and natural phrasing reviewed by a fluent speaker; retain English fallbacks for missing translations.
- Localize presentation only. Preserve stored category/account names, descriptions, person names, stable IDs, calculations, backup structure and sync behaviour; never rewrite user-entered financial records when changing language. Distinguish translated default labels from their underlying stored values.
- Choose an appropriately licensed Sinhala-capable font and bundle required resources for offline use. Verify glyph shaping, readable sizing, line height, wrapping and longer labels on desktop/mobile in both themes. Review date/number/currency formatting, search behaviour, charts and PDF exports explicitly rather than assuming the existing font/export paths support Sinhala.
- Include Sinhala previews in the v9 design review and test the same financial workflows in both languages. This is planning only; no translation service, dependency or current-app change is authorized by this item.

### Preview, checkpoint and acceptance

- Begin with a polished desktop preview and an interactive mobile preview using synthetic data and a mocked backend. Cover Home → Add Transaction → Transaction Details, including bottom navigation, FAB and transitions; include Balance Overview and Recent Transactions in enough context to assess hierarchy.
- Obtain approval of the visual direction before expanding to the complete dashboard. No new theme, dependency or paid image/API use is implied by this plan.
- Keep the redesign in its own Git checkpoint and app-version round, separate from the completed accessibility fixes and v7 release work. The entire visual change must be independently reviewable and reversible without selectively reverting unrelated changes.
- Verify desktop and mobile in both themes, including narrow phones and wide desktops. Check populated, empty, long-description and large-amount states, visibility preferences, chart behavior, keyboard/focus handling and reduced motion.
- Test each workflow against the pre-redesign inventory in the browser, in addition to appropriate automated regression tests. Keep financial behavior unchanged and verify that presentation changes have not broken linked flows.
- Before v7 itself, complete upgrade, local/cloud backup and restore, offline launch, PIN recovery and actual cross-device sync checks. Mocked browser previews do not substitute for live-device release validation.

---

## 🌟 Feature Additions

### 1. Virtual Envelopes / Savings Wishlist
- **Concept**: A dedicated area to track savings goals (e.g., "New Laptop", "Vacation").
- **Implementation Idea**: Users can virtually allocate funds from their "Total Available" balance into specific goal envelopes. Visually represent progress with filling bars or circular rings to motivate saving.

### 2. Split Bills / IOU Tracker
- **Concept**: A built-in "Splitwise" style feature to track shared expenses and who owes who money.
- **Implementation Idea**: Add an "Is Split" toggle when adding a transaction. If toggled, prompt the user to specify who owes them (or who they owe) and the split amount. Create a dedicated "Shared Expenses" tab to view running tallies of debts and settlements with specific friends/roommates.

### 4. Undo Transactions
- **Concept**: A simple way to quickly revert the last added, edited, or deleted transaction in case of an accidental action or typo.

### 5. Historical Budget Progress in PDF Export
- **Concept**: Include the user's set monthly budget goals and their progress against them within the generated PDF reports.
- **Implementation Idea**: Use the budget definitions saved for the selected report month, including category assignments and limits, to show budget versus actual spending consistently with the in-app monthly view. Depends on Per-Month Historical Budget Storage & Persistence; do not apply today's limits retroactively to old reports or invent missing historical budgets.

### 6. "Safe to Spend" Metric
- **Concept**: A prominent dashboard number that takes your current balance, subtracts pending bills, subtracts savings goals, and tells you the actual amount of money you can safely spend without ruining your budget.
- **Implementation Idea**: Needs careful UI/UX design to avoid cluttering the dashboard. Could potentially be a togglable view or a dedicated widget.

### 7. Multi-Currency Accounts
- **Concept**: Useful for users holding foreign currency in a Wise account, Payoneer, or an FCBU account. Allow specific accounts to have a base currency (like USD or EUR) but show the aggregated net worth in LKR based on a manually set or fetched exchange rate.
- **Implementation Idea**: Will require significant backend restructuring for transactions and exchange rate handling. Requires deep discussion on feasibility vs complexity.

### 8. Dedicated Account Transfers Audit Log
- **Concept**: A "Transfers Log" sub-tab or filter toggle to group matching debit/credit pairs, making it simple to audit internal capital movements between cash and bank accounts.

### 9. Reset Safety Net: Automatic Data Backup Prompt
- **Concept**: Automatically trigger a JSON export download immediately before execution of the "Delete All Data" wipe, giving the user a recovery file in case they made a mistake.

### 10. Coloured Category Icons
- **Release target**: Defer until an update after the current v7 release. Prioritise release validation and remaining usability refinements first.
- **Library decision**: Use Fluent Emoji Flat as the preferred coloured SVG library. Check coverage against all default categories and choose clear broader symbols where exact matches are unavailable. Keep one consistent library rather than mixing it with Fluent UI Colour; confirm the appearance in real transaction rows before implementation.
- **Sequence**: Implement after the mobile module/modal refinement round and the Settings workspace redesign. Review a small mobile/desktop visual preview before applying icons throughout the app. Web only for now.
- **Appearance**: Use a consistent library of coloured SVG icons directly before transaction descriptions on the existing row background. No tile, frame, separate background or category colour picker. Keep transaction amount colours and chart sector colours unchanged; check light/dark theme contrast and narrow-screen text space.
- **Management**: Give default categories preset icons. Offer a searchable icon picker for custom categories and changing existing icons in Settings; show presets during setup without requiring an extra selection step.
- **Storage**: Store a category-name-to-icon-ID mapping alongside category settings. Transactions retain their existing category field without per-transaction icon IDs. Bundle selected SVG assets locally; include only the small mapping in local/cloud JSON backups. Older backups use defaults. Renames retain icon assignments; hiding retains them; deletion follows existing transaction reassignment behaviour with an appropriate fallback.
- **Display**: Apply icons to Recent Transactions and monthly transaction lists, and show the assigned icon with the category name and amount in the selected chart sector's information display.

### 11. Recent Activity Section
- **Concept**: A dedicated module or dashboard section to view the most recent actions taken in the app, such as recently added, edited, or deleted transactions, as well as transfers.
- **Implementation Idea**: Will require building a new custom UI view to display a chronological list of activities, and ensuring new transaction types like 'transfers' are easily identifiable.

### 12. Fun Facts / All-Time Stats Dashboard
- **Year-End Recap (around December)**: Explore an exportable, shareable yearly recap with transaction count, most-spent category and other non-sensitive highlights. Let users preview the export; exclude amounts, balances, account/person names, descriptions and exact dates by default. Keep this as a planned feature, separate from general all-time statistics.
- **Concept**: A Spotify Wrapped-style "Fun Facts" or "Stats" page that highlights interesting all-time data points for the user to reflect on their financial journey.
- **Implementation Idea**: Build a dedicated view that parses the entire `transactions` array to calculate and display fun metrics such as: Total transactions added, most common spending category, highest single expense of all time, highest earning month, highest spending day, etc. Could be implemented as a new tab in the Monthly Overview or a standalone widget.

### 15. Support > 3 Bank Accounts
- **Concept**: Remove or expand the restriction capping users to 3 bank accounts in setup and settings, allowing full flexibility for power users with multiple accounts.

### 16. Per-Month Historical Budget Storage & Persistence
- **Concept**: Save category budget limits on a per-month basis instead of having a single static budget that resets every month. This allows users to accurately review historical budget targets vs. actual spending for past months.
- **Implementation Note**: IndexedDB storage is now available. Add a versioned schema upgrade and backup compatibility for historical budget records; the migration itself did not implement budget history. Coordinate this feature with Historical Budget Progress in PDF Export.
- **Planning**: Carry the previous month's budgets forward as editable starting values. Preserve past months when current limits, names or category assignments change; define how edits within a month affect that month's saved budget. Handle users returning after several months without relying on the app being open at month-end. Calculate actual spending from transactions rather than saving duplicate totals. Historical data must round-trip through local/cloud backups; months predating this feature should clearly have no recorded budget unless explicitly supplied by the user.

### 17. Possible Duplicate Entry Warning
- **Concept**: Warn before saving a manually entered transaction that closely matches a recent entry, helping prevent accidental double entry.
- **Behaviour**: Compare transaction type, account, amount, date and normalised description. Present the matching entry with options to go back or save anyway; legitimate repeated purchases must remain possible. Exclude the edited record itself, and treat transfers and automatically generated payment records explicitly to avoid false warnings.
- **Scope**: Advisory duplicate detection, not automatic deletion, merging or blocking. Define the matching window and apply equivalent rules on web and Android before implementation.

### 19. Dated Installment Reminders
- **Concept**: Extend the existing Upcoming Payments bar to installments once plans have explicit, reliable due-date rules. Do not infer deadlines from months remaining alone. Subscription and dated-debt notices are implemented.
- **Scope**: Reminders appear inside Kaasi while it is open; closed-app browser/PWA system notifications are not planned. Displaying a reminder must not create financial records. Android remains outside the current web implementation scope.

### Optional Installment Links to Credit-card Transactions (v8)

- **Requested 2026-11-12; next-update target v8:** Let users optionally link an installment plan to an existing credit-card purchase. Offer linking when creating a plan and later for existing plans. Unlinked plans retain their current behaviour; do not infer links or migrate existing plans automatically.
- When a linked installment is marked paid, apply the payment to the linked card purchase's outstanding balance and record the corresponding credit-card payment through the established payment workflow. Define account selection and ledger effects explicitly so the same payment is not deducted or recorded twice. Confirm the intended meaning of "deduct from the credit card" in the UI: repayment reduces outstanding debt and restores available credit, rather than creating another card expense.
- Before linking, compare the remaining installment payments with the card purchase's actual outstanding balance. Treat the credit-card record as the preferred reference when differences arise from installment rounding; show the discrepancy and proposed reconciliation for confirmation instead of silently rewriting financial records.
- Calculate in currency minor units and allocate any rounding remainder explicitly, including the final installment. Preserve payment history and explain any revised remaining/final payment; distinguish small rounding differences from genuine amount mismatches that need user review.
- Design stable links that preserve historical transaction IDs, existing backups, unknown fields and cloud-sync compatibility. Define partial payments, previously paid installments, additional/manual card payments, edits, unlinking and deletion of either linked record. Warn or reconcile when one side changes so the two views cannot silently diverge.
- Commit linked financial effects atomically, prevent repeat submissions/retries from applying the same payment twice, and verify balances, payment histories, backup/restore and cross-device sync. Discuss the reconciliation and confirmation flow before implementation; this item does not authorize changes to current records or Supabase.

### 20. Buy Now, Pay Later (BNPL) Tracking
- **Concept**: Support purchases paid through providers such as Koko, Mintpay and Payzy, with installment schedules, due dates, recorded payments and outstanding balances.
- **Planning**: Confirm provider-specific schedules and rules before implementation. Include due installments in Upcoming Payments and define expense/account treatment to avoid double-counting purchases and repayments. Start with manual tracking; provider integrations or automatic payments require separate agreement.

### 21. Start-of-Month Budget Reminder
- **Implemented**: v6.477n shows a review reminder in the existing dashboard budget card until dismissed or a budget is successfully created/saved that month, including visits after the fifth day.
- **Behaviour**: Store only the latest handled month in portable settings, using the existing backup/cloud sync flow. Show the notice again in a later month without resetting limits or changing financial records. Offline devices reflect dismissal after syncing; whole-copy conflict/replacement rules remain unchanged.

---

## ✨ UI / UX Polish

### 2. Segmented Control Buttons for Transaction Type
- **Concept**: Replace the standard `<select>` dropdown for Transaction Type (`Income` | `Expense` | `Transfer`) in the Add/Edit modal with prominent segmented toggle buttons for faster, one-tap selection.

### 3. Mobile Floating Action Button (FAB)
- **Concept**: Add an optional floating `+` button in the bottom-right corner visible on mobile viewports for instant 1-tap transaction entry.
- **Planning**: Explore this within the v9 app-like mobile experience above, coordinated with bottom navigation and dedicated screens. Final placement and optionality remain subject to preview approval.

---

## 🛠️ Technical Debt & Code Organization

### 1. Safe Cross-device Data Merging (Deferred)
- **Product decision**: Keep whole-copy sync, explicit replacement decisions and pause/import safeguards for now. Merging is deferred, not the next committed implementation.
- **Status**: Future design work. Automatic whole-copy sync is implemented; both-changed copies still require manual review. Validate automatic sync across actual browsers/devices before expanding its scope.
- **Deletion handling**: Keep compact deletion markers containing collection, record ID and change revision so stale devices cannot resurrect removed entries. Deletion wins against an unchanged record; deletion versus an independently edited record requires an explicit resolution policy. Do not expire markers just because they are old; define acknowledgement or resync rules for long-offline devices first.
- **Financial integrity**: Define record revisions, device identity and a shared merge baseline. Preserve linked effects across transactions, transfers, CC payments, debts, receivables and account balances; combining lists or taking the newest balance is insufficient. Handle retries without duplicating financial effects.
- **Compatibility**: Plan schema/JSON upgrades, backup round-tripping and restrictions for older clients that do not understand merging or deletion markers. Preserve unknown fields and retain recovery before replacing data. Never enable merging silently for incompatible clients.
- **Acceptance**: Test independent offline edits, delete-versus-edit, repeated merges, stale-device reconnection, category changes, linked financial records and interrupted sync before release. No automatic merging is enabled yet.

### 4. Supabase Advisor Review
- **Read-only findings (2026-10-29)**: Review three security warnings concerning `public.handle_updated_at()` search-path configuration and execution permissions, plus three authentication/RLS evaluation performance warnings on `public.user_data`. Determine actual impact before proposing any change; preserve compatibility with public and beta clients.
- **Auth note**: The advisor also flags disabled leaked-password protection; check relevance to the app's sign-in methods and plan availability before treating this as actionable.
- **Constraint**: No backend settings, policies, functions or user data were changed during the dashboard review. Any remediation requires a separate agreed change.

---



## 📝 Blog Ideas

### 1. The Privacy Cost of Auto-Tracking Finance Apps
- **Concept**: Explain why Kaasi deliberately avoids auto-reading SMS messages for transaction tracking.
- **Key Points**: 
  - Break down how other native apps use aggressive permissions (like `READ_SMS`) to scrape users' personal text messages.
  - Highlight the massive privacy and security risks of granting blanket access to an SMS inbox (e.g., exposing 2FA codes, password resets, and private conversations).
  - Contrast this with Kaasi's local-first, privacy-respecting philosophy. Frame the lack of SMS scraping as a deliberate, empowering security feature rather than a technical limitation.

### 2. Emergency Funds 101 & Calculator
- **Concept**: A beginner's guide to understanding and building an emergency fund, featuring a built-in interactive calculator.
- **Key Points**: Define what an emergency fund is, why it's crucial for financial stability, and actionable steps to start building one from scratch.
- **Interactive Tool**: A working calculator where users can input their estimated monthly expenses to see their total minimum required target. They can also input their monthly savings contribution to see exactly how long it will take to build their emergency vault.

### 3. Bank Failures & Deposit Insurance in Sri Lanka
- **Concept**: Educate users on what happens to their money if their bank goes bankrupt.
- **Key Points**: Explain the Sri Lanka Deposit Insurance Scheme (SLDIS). Clarify that the maximum compensation limit per depositor per bank is capped (currently around Rs. 1.1 million). Discuss how to distribute funds across multiple institutions to minimize risk.

### 4. Trimming the Fat: Cutting Unnecessary Expenses
- **Concept**: Practical strategies for reducing lifestyle creep and everyday waste.
- **Key Points**: Provide a downloadable or actionable checklist for identifying and cutting recurring but unused subscriptions, impulse purchases, and optimizing daily habits without sacrificing quality of life.

### 5. Why Tracking Every Penny Matters
- **Concept**: The psychological and practical benefits of manual expense tracking.
- **Key Points**: Discuss the concept of mindfulness in spending. How seeing where the money goes inherently changes spending behavior. Why manual input (like Kaasi's approach) builds better financial discipline than fully automated systems that you ignore.

### 6. Understanding PAYE in Sri Lanka
- **Concept**: A breakdown of the Pay-As-You-Earn (PAYE) tax system, complete with a built-in tax calculator.
- **Key Points**: Demystify the latest tax brackets, how it affects salaries, and what exemptions exist in plain, simple terms.
- **Interactive Tool**: Include a working calculator (similar to taxadvisor.lk) where users can input their gross salary to see their estimated take-home pay and exact tax deductions.

### 7. The "PickMe/UberEats Factor" (The Local Latte Factor)
- **Concept**: Adapting the famous "Latte Factor" to Colombo life.
- **Key Points**: Discuss how dropping Rs. 1,500 on food delivery or iced coffee every day seemingly hurts a little, but adds up to Rs. 45,000+ a month. Show the math and how tracking it stops the bleed. Needs further discussion on the exact angle to ensure it resonates well without sounding preachy.

### 8. Is the 50/30/20 Rule Realistic in Sri Lanka?
- **Concept**: Break down the famous budgeting rule (50% Needs, 30% Wants, 20% Savings) against the reality of the Sri Lankan economy.
- **Key Points**: Discuss how inflation and the high cost of living make allocating only 50% on "Needs" nearly impossible for many Sri Lankans given low relative incomes. Discuss how to practically adapt the rule (e.g., 60/20/20 or 70/10/20) to survive the current economic climate while still building a safety net.
