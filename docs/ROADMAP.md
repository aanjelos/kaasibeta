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

---

## ✨ UI / UX Polish

*(No active UI/UX polish items currently tracked)*

---

## 🛠️ Technical Debt & Code Organization

*(No active technical debt items currently tracked)*

---

---

## 📋 Pre-Release v6 Checklist

### 1. Offline PWA Smoke Test
- Verify the app launches and works perfectly in offline mode via browser DevTools (Application > Service Workers > Offline) to test stale-while-revalidate offline behavior.

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
