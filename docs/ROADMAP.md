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

### 3. Cloud Backup Refinement
- **Concept**: Look into the existing Supabase cloud backup architecture and refine the syncing/recovery flow to be more robust and intuitive.
- **Implementation Idea**: 
  - Investigate the current `backupToSupabase` and `restoreFromSupabase` mechanisms.
  - Explore implementing clearer conflict resolution or a background auto-sync feature so users don't have to manually press 'Export to Cloud'.

---

## ✨ UI / UX Polish

### 1. Credit Card Section Revamp
- **Concept**: Comprehensive overhaul of the Credit Card interface and functionality.
- **Implementation Idea**: Redesign the visual layout for credit card cards, refine how partial payments/transactions are nested and displayed, and improve the overall flow.

### 2. Mobile App Refinements
- **Concept**: Ongoing focus on enhancing the mobile application experience.
- **Implementation Idea**: Continue polishing spacing, tap targets, safe-areas, and interactive components to ensure Kaasi feels like a premium, native mobile app.



## 🐛 Bug Fixes & Known Issues

*(No active bugs currently tracked)*



