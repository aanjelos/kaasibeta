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

---

## ✨ UI / UX Polish

*(No active UI/UX polish items currently tracked)*

---

## 🛠️ Technical Debt & Code Organization

*(No active technical debt items currently tracked)*

---

## 🐛 Bug Fixes & Known Issues

### 1. Credit Card Modal Navigation
- **Issue**: Investigate modal history and back-button/closure routing bugs when going back on modals in the Credit Card history section.

---

## 📋 Pre-Release v6 Checklist

### 1. Offline PWA Smoke Test
- Verify the app launches and works perfectly in offline mode via browser DevTools (Application > Service Workers > Offline) to test stale-while-revalidate offline behavior.

### 2. Backup & PIN Reset Verification
- Export a manual `.json` backup file, execute a factory reset/clear site data, and verify the file restores all data and PIN settings successfully.

### 3. Keyboard Shortcuts Modal Audit
- Open the keyboard shortcuts help modal (`?`) and confirm all descriptions (especially `A` mapping to "All Transactions") match the final `v6` user interface.

---

## 📝 Blog Ideas

### 1. The Privacy Cost of Auto-Tracking Finance Apps
- **Concept**: Explain why Kaasi deliberately avoids auto-reading SMS messages for transaction tracking.
- **Key Points**: 
  - Break down how other native apps use aggressive permissions (like `READ_SMS`) to scrape users' personal text messages.
  - Highlight the massive privacy and security risks of granting blanket access to an SMS inbox (e.g., exposing 2FA codes, password resets, and private conversations).
  - Contrast this with Kaasi's local-first, privacy-respecting philosophy. Frame the lack of SMS scraping as a deliberate, empowering security feature rather than a technical limitation.

### 2. Emergency Funds 101
- **Concept**: A beginner's guide to understanding and building an emergency fund.
- **Key Points**: Define what an emergency fund is, why it's crucial for financial stability, how much you actually need to save, and actionable steps to start building one from scratch.

### 3. Bank Failures & Deposit Insurance in Sri Lanka
- **Concept**: Educate users on what happens to their money if their bank goes bankrupt.
- **Key Points**: Explain the Sri Lanka Deposit Insurance Scheme (SLDIS). Clarify that the maximum compensation limit per depositor per bank is capped (currently around Rs. 1.1 million). Discuss how to distribute funds across multiple institutions to minimize risk.

### 4. Trimming the Fat: Cutting Unnecessary Expenses
- **Concept**: Practical strategies for reducing lifestyle creep and everyday waste.
- **Key Points**: Provide a downloadable or actionable checklist for identifying and cutting recurring but unused subscriptions, impulse purchases, and optimizing daily habits without sacrificing quality of life.

### 5. Why Tracking Every Penny Matters
- **Concept**: The psychological and practical benefits of manual expense tracking.
- **Key Points**: Discuss the concept of mindfulness in spending. How seeing where the money goes inherently changes spending behavior. Why manual input (like Kaasi's approach) builds better financial discipline than fully automated systems that you ignore.
