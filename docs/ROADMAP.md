# Kaasi Future Roadmap & Ideas

This document serves as a backlog for approved feature ideas, UI/UX improvements, and technical refinements to be implemented in Kaasi over time.

---

## 🌟 Feature Additions

### 1. Virtual Envelopes / Savings Wishlist
- **Concept**: A dedicated area to track savings goals (e.g., "New Laptop", "Vacation").
- **Implementation Idea**: Users can virtually allocate funds from their "Total Available" balance into specific goal envelopes. Visually represent progress with filling bars or circular rings to motivate saving.

### 2. Split Bills / IOU Tracker
- **Concept**: A built-in "Splitwise" style feature to track shared expenses and who owes who money.
- **Implementation Idea**: Add an "Is Split" toggle when adding a transaction. If toggled, prompt the user to specify who owes them (or who they owe) and the split amount. Create a dedicated "Shared Expenses" tab to view running tallies of debts and settlements with specific friends/roommates.

### 3. Gamification: Streaks & Badges
- **Implemented**: Extras → Milestones covers first records, transaction counts, recording days, anniversaries and optional feature discovery. Removed the original badge proposal from pending work.
- **Before public release**: Review milestone presentation and logic in beta, then remove the temporary console debug script. Additional badges require separate agreement; do not reward spending more or require optional features to complete a percentage.

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

### 13. Flexible Credit Card Tracking Modes (Lump-Sum Bill vs. Per-Transaction)
- **Concept**: Provide an option for users to select their preferred credit card tracking workflow: either logging individual credit card purchases transaction-by-transaction, or entering the total monthly credit card statement bill as a single lump-sum expense.

### 14. Credit Card Initial / Starting Expenses
- **Concept**: Allow users to set an initial carried-over balance or starting un-billed expense total when adding or configuring a Credit Card account.

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

### 18. Subscription Suggestions From History
- **Concept**: Suggest recurring services from historical transactions for explicit review. Manual schedules and Save as Subscription are implemented; pattern detection remains future work. Never create a schedule or charge from a guess.

### 19. Dated Installment Reminders
- **Concept**: Extend the existing Upcoming Payments bar to installments once plans have explicit, reliable due-date rules. Do not infer deadlines from months remaining alone. Subscription and dated-debt notices are implemented.
- **Scope**: Reminders appear inside Kaasi while it is open; closed-app browser/PWA system notifications are not planned. Displaying a reminder must not create financial records. Android remains outside the current web implementation scope.

### 20. Buy Now, Pay Later (BNPL) Tracking
- **Concept**: Support purchases paid through providers such as Koko, Mintpay and Payzy, with installment schedules, due dates, recorded payments and outstanding balances.
- **Planning**: Confirm provider-specific schedules and rules before implementation. Include due installments in Upcoming Payments and define expense/account treatment to avoid double-counting purchases and repayments. Start with manual tracking; provider integrations or automatic payments require separate agreement.

### 21. Start-of-Month Budget Reminder
- **Scope**: Review and refine the existing monthly budget tip so users can review or adjust the new month's budgets on their first eligible visit, including when they do not open Kaasi on the first day.
- **Behaviour**: Keep the reminder brief and dismissible, with a direct route to budget management. Store dismissal state on the device, outside cloud sync. Coordinate with monthly budget carry-forward and history; decide reminder timing and repeat behaviour before implementation.

---

## ✨ UI / UX Polish

### 1. Internal Modal Refinements, Especially on Mobile
- **Priority**: Follow up on remaining mobile editor and keyboard-layout issues after the dashboard and Settings refinements. Review any further user-reported issues before category icons.
- **Scope**: Improve sizing, spacing, typography, field hierarchy, scrolling, close controls and action-button placement at narrow mobile widths, including when the keyboard is open. Keep primary actions reachable and avoid clipped content or horizontal overflow. Preserve existing payment and storage behaviour.

### 2. Segmented Control Buttons for Transaction Type
- **Concept**: Replace the standard `<select>` dropdown for Transaction Type (`Income` | `Expense` | `Transfer`) in the Add/Edit modal with prominent segmented toggle buttons for faster, one-tap selection.

### 3. Mobile Floating Action Button (FAB)
- **Concept**: Add an optional floating `+` button in the bottom-right corner visible on mobile viewports for instant 1-tap transaction entry.

### 4. Settings Workspace UI/UX Refinements
- **Status**: The functional workspace shipped in v6.421n; further visual and interaction refinements remain planned.
- **Next step**: Review the user's next round of feedback across desktop and mobile, including spacing, typography, grouping and editing flows. Preserve existing settings, save behaviour, financial logic and shared subscription data.

### 5. Keyboard Accessibility Follow-up
- **Status**: App-wide keyboard navigation and mobile Settings transitions have received an implementation pass. Verify remaining focus visibility and navigation with populated installment lists, nested dialogs, Settings Back/Escape and Tab/Shift+Tab before closing this item.

---

## 🛠️ Technical Debt & Code Organization

### 1. Safe Cross-device Data Merging (Deferred)
- **Product decision**: Keep whole-copy sync, explicit replacement decisions and pause/import safeguards for now. Merging is deferred, not the next committed implementation.
- **Status**: Future design work. Automatic whole-copy sync is implemented; both-changed copies still require manual review. Validate automatic sync across actual browsers/devices before expanding its scope.
- **Deletion handling**: Keep compact deletion markers containing collection, record ID and change revision so stale devices cannot resurrect removed entries. Deletion wins against an unchanged record; deletion versus an independently edited record requires an explicit resolution policy. Do not expire markers just because they are old; define acknowledgement or resync rules for long-offline devices first.
- **Financial integrity**: Define record revisions, device identity and a shared merge baseline. Preserve linked effects across transactions, transfers, CC payments, debts, receivables and account balances; combining lists or taking the newest balance is insufficient. Handle retries without duplicating financial effects.
- **Compatibility**: Plan schema/JSON upgrades, backup round-tripping and restrictions for older clients that do not understand merging or deletion markers. Preserve unknown fields and retain recovery before replacing data. Never enable merging silently for incompatible clients.
- **Acceptance**: Test independent offline edits, delete-versus-edit, repeated merges, stale-device reconnection, category changes, linked financial records and interrupted sync before release. No automatic merging is enabled yet.

### 2. UUIDs for New Financial Records
- **Concept**: Replace the timestamp/random-fragment financial record ID generator with UUIDs for new records. This portion of the former storage migration item is still pending.
- **Compatibility**: Preserve existing IDs, payment references, and imported backup records. Database generations already use UUIDs; financial records still use the existing `generateId()` helper.

### 3. Public Release Validation for IndexedDB
- **Scope**: Before promoting the beta storage changes, verify an authorized cloud backup/restore using a test account, production service-worker updates and offline launches, and the actual mobile/browser combinations in use.
- **Onboarding check**: Use the test account to verify first-run cloud sign-in, explicit cloud restore, and the optional cloud-sync handoff after new setup. Check local-file restore and PIN recovery on a clean browser profile.
- **Acceptance**: Existing data survives upgrade and reload, exported backups restore correctly, PIN-protected access remains intact, and interrupted or failed operations retain recovery options. Automated database tests and localhost browser checks do not replace these environment-specific checks.

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
