# Kaasi Future Roadmap & Ideas

This document serves as a backlog for approved feature ideas, UI/UX improvements, and technical refinements to be implemented in Kaasi over time.

---

## 🌟 Feature Additions

### 1. Category Budgets & Grouping
- **Concept**: Allow users to set monthly limits for specific categories or grouped categories (e.g., combining "Groceries" and "Food & Dining" into a single 20,000 LKR budget).
- **Implementation Idea**: 
  - Add a "Budgets" array to the `state`. Each budget object contains `{ id, name, limit, categories: [] }`. 
  - On the dashboard or in reports, sum the transactions for the current month that match the selected categories and display a progress bar (e.g., Green/Warning/Red) showing how close the user is to their limit.



### 2. Virtual Envelopes / Savings Wishlist
- **Concept**: A dedicated area to track savings goals (e.g., "New Laptop", "Vacation").
- **Implementation Idea**: Users can virtually allocate funds from their "Total Available" balance into specific goal envelopes. Visually represent progress with filling bars or circular rings to motivate saving.

### 3. Split Bills / IOU Tracker
- **Concept**: A built-in "Splitwise" style feature to track shared expenses and who owes who money.
- **Implementation Idea**: Add an "Is Split" toggle when adding a transaction. If toggled, prompt the user to specify who owes them (or who they owe) and the split amount. Create a dedicated "Shared Expenses" tab to view running tallies of debts and settlements with specific friends/roommates.
### 4. Gamification: Streaks & Badges
- **Concept**: Encourage responsible spending and habit-building by rewarding users with milestones.
- **Implementation Idea**: 
  - **Under Budget Streaks**: Track how many consecutive months a user stays under their set Category Budgets. Display a visual "Streak" counter with fire emojis 🔥. If they break the budget, the streak resets.
  - **Achievement Badges**: Unlockable SVG badges in the profile/settings for hitting app milestones (e.g., "Data Nerd" for 100 transactions, "Diversified" for using 5+ categories, "Debt Free" for paying off a debt).

---

## ✨ UI / UX Polish

### 1. Credit Card Section Revamp
- **Concept**: Comprehensive overhaul of the Credit Card interface and functionality.
- **Implementation Idea**: Redesign the visual layout for credit card cards, refine how partial payments/transactions are nested and displayed, and improve the overall flow.

### 2. Mobile App Refinements
- **Concept**: Ongoing focus on enhancing the mobile application experience.
- **Implementation Idea**: Continue polishing spacing, tap targets, safe-areas, and interactive components to ensure Kaasi feels like a premium, native mobile app.

---

## 🛠️ Technical Debt & Code Organization

*(No active technical debt items currently tracked)*

## 🐛 Bug Fixes & Known Issues


*(No active bugs currently tracked)*



