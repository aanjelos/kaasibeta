# Kaasi Future Roadmap & Ideas

This document serves as a backlog for approved feature ideas, UI/UX improvements, and technical refinements to be implemented in Kaasi over time.

---

## 🌟 Feature Additions

### 1. Category Budgets & Grouping
- **Concept**: Allow users to set monthly limits for specific categories or grouped categories (e.g., combining "Groceries" and "Food & Dining" into a single 20,000 LKR budget).
- **Implementation Idea**: 
  - Add a "Budgets" array to the `state`. Each budget object contains `{ id, name, limit, categories: [] }`. 
  - On the dashboard or in reports, sum the transactions for the current month that match the selected categories and display a progress bar (e.g., Green/Warning/Red) showing how close the user is to their limit.





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

### 1. Function Reorganization
- **Concept**: Refactor and move misplaced functions into their logically appropriate files to improve code maintainability.
- **Implementation Idea**: Relocate functions like `setupDeleteSlider()` and `completeDeletion()`, which are currently awkwardly housed in `charts-export.js`, into `ui.js` or `app.js` where they belong. Audit other files for similar misplacements.



## 🐛 Bug Fixes & Known Issues

*(No active bugs currently tracked)*



