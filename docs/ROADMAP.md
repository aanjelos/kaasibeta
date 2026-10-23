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
- **Concept**: Encourage responsible spending and habit-building by rewarding users with milestones.
- **Implementation Idea**: 
  - **Under Budget Streaks**: Track how many consecutive months a user stays under their set Category Budgets. Display a visual "Streak" counter with fire emojis 🔥. If they break the budget, the streak resets.
  - **Achievement Badges**: Unlockable SVG badges in the profile/settings for hitting app milestones (e.g., "Data Nerd" for 100 transactions, "Diversified" for using 5+ categories, "Debt Free" for paying off a debt).

### 4. Undo Transactions
- **Concept**: A simple way to quickly revert the last added, edited, or deleted transaction in case of an accidental action or typo.

### 5. Historical Budget Progress in PDF Export
- **Concept**: Include the user's set monthly budget goals and their progress against them within the generated PDF reports.
- **Implementation Idea**: This will require coming up with a reliable way to save historical snapshots of category budget limits at the end of each month, rather than just the current active budgets.

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

### 10. Custom Icon and Color Tags for Categories
- **Concept**: Allow users to associate a custom FontAwesome icon and color code to each category in Settings to dramatically improve the scannability of transaction lists, budget cards, and visual charts.

### 11. Recent Activity Section
- **Concept**: A dedicated module or dashboard section to view the most recent actions taken in the app, such as recently added, edited, or deleted transactions, as well as transfers.
- **Implementation Idea**: Will require building a new custom UI view to display a chronological list of activities, and ensuring new transaction types like 'transfers' are easily identifiable.

### 12. Fun Facts / All-Time Stats Dashboard
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

### 17. Possible Duplicate Entry Warning
- **Concept**: Warn before saving a manually entered transaction that closely matches a recent entry, helping prevent accidental double entry.
- **Behaviour**: Compare transaction type, account, amount, date and normalised description. Present the matching entry with options to go back or save anyway; legitimate repeated purchases must remain possible. Exclude the edited record itself, and treat transfers and automatically generated payment records explicitly to avoid false warnings.
- **Scope**: Advisory duplicate detection, not automatic deletion, merging or blocking. Define the matching window and apply equivalent rules on web and Android before implementation.

### 18. Subscriptions and Recurring Payment Reminders
- **Concept**: Save subscription name, expected amount, account/payment method, next renewal date and recurrence (weekly, monthly, quarterly or annually), with pause/cancel controls.
- **Entry**: Start with manual creation and an optional Save as Subscription action on an existing transaction. Historical pattern detection is a separate future enhancement; do not automatically create subscriptions from guesses.
- **Behaviour**: On the renewal date, ask whether the subscription was paid when the app is next open; missed dates remain eligible as overdue reminders. A Paid confirmation creates the appropriate transaction after confirming amount, account and payment date, or links an already-recorded transaction. Bank/cash payments create expenses; credit-card charges create purchases, not settlement payments. No deductions or transactions occur without confirmation. Use stable renewal-occurrence identifiers and an atomic save to prevent repeated confirmations from recording the same occurrence twice.
- **Reminder actions**: Offer Paid, Ask Later (12 hours or one day), and Manage/Cancel Subscription. Snoozing changes the reminder time, not the underlying renewal date or recurrence anchor. Cancellation prevents future renewal reminders without deleting recorded financial history. Group due reminders to avoid repeated popups for each subscription; do not reopen a snoozed reminder on every focus. Support skipping a renewal without logging spending. Preserve the intended recurrence anchor for short months and leap years.
- **Compatibility**: Store schedules locally for offline use and include them in JSON/cloud backups. Web and Android MUST preserve compatible fields and record types they do not display or edit when importing, saving, syncing and exporting. Reject formats that cannot be preserved safely before replacing data; never silently drop unsupported information. Validate safe structure without discarding unknown compatible fields. Plan schema/version handling with Android before rollout.

### 19. Unified Upcoming Payments Area
- **Concept**: A compact dashboard area for subscription renewals and dated debt/installment obligations due within seven calendar days, including items due today or overdue.
- **Presentation**: Use one grouped summary with expandable details, dates, amounts and relevant actions rather than separate banners for every obligation. Distinguish expected costs from recorded transactions; avoid counting the same obligation twice.
- **Behaviour**: Recalculate on launch, focus and local date changes. Completed, cancelled, paused or settled obligations must not continue appearing. In-app reminders work offline; notifications while the app is closed require a separately designed platform-specific notification feature.

---

## ✨ UI / UX Polish

### 2. Segmented Control Buttons for Transaction Type
- **Concept**: Replace the standard `<select>` dropdown for Transaction Type (`Income` | `Expense` | `Transfer`) in the Add/Edit modal with prominent segmented toggle buttons for faster, one-tap selection.

### 3. Mobile Floating Action Button (FAB)
- **Concept**: Add an optional floating `+` button in the bottom-right corner visible on mobile viewports for instant 1-tap transaction entry.

---

## 🛠️ Technical Debt & Code Organization

### 1. Automatic Background Cloud Backups
- **Concept**: Solve the "I forgot to click backup" issue by running silent, timed backups.
- **Implementation Idea**: Add a background interval timer (e.g., every 5-10 minutes) that checks if the local state has un-synced changes (`local_newer`) and the device is online. If true, trigger a silent `executeBackupToSupabase()` upsert. Additionally, automatically restore from the cloud on launch if a newer cloud state is detected and local storage is clean.
- **Prerequisite**: Add server-enforced cloud revision checks and explicit conflict handling before enabling unattended uploads or restores. Local IndexedDB revision checks protect local writes; they do not prevent one device from overwriting another device's cloud backup. Realtime synchronization remains a separate future project. Manual cloud backups remain the current behavior.

### 2. UUIDs for New Financial Records
- **Concept**: Replace the timestamp/random-fragment financial record ID generator with UUIDs for new records. This portion of the former storage migration item is still pending.
- **Compatibility**: Preserve existing IDs, payment references, and imported backup records. Database generations already use UUIDs; financial records still use the existing `generateId()` helper.

### 3. Public Release Validation for IndexedDB
- **Scope**: Before promoting the beta storage changes, verify an authorized cloud backup/restore using a test account, production service-worker updates and offline launches, and the actual mobile/browser combinations in use.
- **Acceptance**: Existing data survives upgrade and reload, exported backups restore correctly, PIN-protected access remains intact, and interrupted or failed operations retain recovery options. Automated database tests and localhost browser checks do not replace these environment-specific checks.

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
