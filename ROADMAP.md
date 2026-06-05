# Kaasi Future Roadmap & Ideas

This document serves as a backlog for approved feature ideas, UI/UX improvements, and technical refinements to be implemented in Kaasi over time.

---

## 🌟 Feature Additions

### 1. Category Budgets & Grouping
- **Concept**: Allow users to set monthly limits for specific categories or grouped categories (e.g., combining "Groceries" and "Food & Dining" into a single 20,000 LKR budget).
- **Implementation Idea**: 
  - Add a "Budgets" array to the `state`. Each budget object contains `{ id, name, limit, categories: [] }`. 
  - On the dashboard or in reports, sum the transactions for the current month that match the selected categories and display a progress bar (e.g., Green/Warning/Red) showing how close the user is to their limit.

### 2. Advanced Filters & Date Ranges
- **Concept**: Expand the current text search to allow granular filtering of transactions.
- **Implementation Idea**: 
  - Add a "Filters" button/accordion to the All Transactions modal.
  - Provide inputs for "Start Date", "End Date", "Category Dropdown", and "Amount Range (Min/Max)".
  - Update the `searchTransactions()` rendering loop to respect these new filter parameters alongside the existing text query.

### 3. Customizable Dashboard Layout
- **Concept**: Give users the ability to rearrange or hide specific sections/cards on the main dashboard to prioritize the data they care about most.
- **Implementation Idea**: 
  - Add a "Customize Dashboard" toggle in Settings.
  - Store an array in `state.settings.dashboardLayout` defining the rendering order and visibility of widgets (e.g., `['balanceOverview', 'quickStats', 'monthlyChart']`).

---

## ✨ UI / UX Polish

### 1. Debt & Receivable Progress Bars
- **Concept**: Make partial payments more rewarding by displaying visual progress bars on Debt and Receivable cards.
- **Details**: Show the percentage of the debt paid off visually (e.g., a green bar filling up as the remaining balance drops).

### 2. Mobile Specific UI/UX Improvements
- **Concept**: A dedicated pass to audit and refine tap targets, scrolling behaviors, and layouts specifically for mobile users.

---

## 🛠️ Technical Refinements

### 1. Chart.js Rendering Optimization
- **Concept**: Instead of destroying and completely re-rendering the canvas every time the data changes, optimize the chart logic to simply update `chart.data` and call `chart.update()`.
- **Benefit**: This allows Chart.js to smoothly animate the transitions between data states (e.g., bars growing or shrinking) and reduces browser layout thrashing.

### 2. PWA Offline Support
- **Concept**: Ensure Kaasi is fully installable and works offline.
- **Details**: Register a Service Worker to cache static assets (HTML, CSS, JS, images) so the app loads instantly from the home screen, even without an internet connection.
