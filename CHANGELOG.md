# Kaasi Changelog

This document tracks all new features, enhancements, bug fixes, and cleanup tasks made during this pair programming session, ordered chronologically.

---

### 1. [Major] Dead Code Removal
- **Description**: Cleaned up the codebase by identifying and removing unused variables, dead code paths, obsolete functions, and redundant comments. This helped reduce file size, improve maintainability, and ensure code clarity.
- **Scope**: Cleaned up various sections in `script.js` and other project files.

### 2. [Minor] GitHub Authentication Setup & Script Fix
- **Description**: Resolved a fatal authentication error encountered during repository operations by setting up a Personal Access Token (PAT) for git commands. This ensured secure and seamless code deployments to the remote repository.
- **Scope**: Internal configuration.

### 3. [Major] Category Exclusion Settings (v5.85k Initial)
- **Description**: Added the initial implementation of the category exclusion feature. This allowed users to hide specific categories (e.g., Savings, Transfers) from dashboard charts and monthly reports, enabling a more accurate overview of actual daily expenses.
- **Scope**: Added inline exclusion controls to the "Manage Expense Categories" settings UI and integrated exclusion filters into the primary dashboard calculations.

### 4. [Major] Global Hidden Category Rules (v5.85k Refined)
- **Description**: Revamped the category exclusion feature into a centralized "Hidden Category Rules" panel in the Settings modal. Instead of configuring rules per-category, users mark categories as hidden/visible via a single Eye icon (`fa-eye` / `fa-eye-slash`) and fine-tune general exclusion behaviors using global rules.
- **Exclusion Options Introduced**:
  - **Primary Rules**:
    - Hide from Dashboard Charts
    - Hide from Monthly Breakdown Totals
    - Exclude from PDF Reports
  - **Advanced Rules (Accordion)**:
    - Hide from Quick Stats (Today & 7-Days totals)
    - Hide from Yearly Totals
    - Dim in Transaction Lists (Grey out excluded categories)
- **UI Fixes**: Resolved height alignment mismatch between text inputs, action buttons, and icons in the category editor UI.
- **Scope**: Modified `index.html` and `script.js`.

### 5. [Minor] Migration Code Cleanup
- **Description**: Removed the temporary auto-migration code that automatically transitioned legacy categories (`excludeFromTotals`, etc.) to the new hidden categories array. Since the feature was not yet public, this simplified the startup initialization routine. All categories now start as visible by default.
- **Scope**: Cleaned up initialization routines in `script.js`.

### 6. [Minor] Granular Monthly Exclusion Rules
- **Description**: Separated "Hide from Monthly Breakdown Totals" and "Hide from Monthly Pie Chart" into two distinct advanced rule options. This provides finer control, allowing users to exclude a category from total calculation while keeping it visible in the pie chart breakdown (or vice versa).
- **Scope**: Modified rules list layout in `index.html` and logic checks in `script.js`.

### 7. [Minor] Cash Account Hideability & Tooltip Position Fix (v5.86k)
- **Description**:
  - **Cash Visibility**: Allowed the default "Cash" account card to be toggled visible/hidden from the Settings panel and during Initial Setup, matching the behavior of other custom bank and credit card accounts. For integrity, Cash remains un-renameable.
  - **Tooltip UI Fix**: Fixed a CSS bug where tooltip elements (`[data-tooltip]`) rendered above their target components, blocking user clicks on buttons directly above them (e.g., clicking the "View all debts" tooltip would intercept clicks intended for "Add new debt"). All tooltips are now repositioned to render below their respective elements.
- **Scope**: Modified `index.html`, `script.js`, and `style.css`.

### 8. [Minor] Cash Counter CSS Selector Fix
- **Description**: Fixed a `DOMException` error caused by an invalid CSS selector string in the cash counter modal logic, which prevented the modal from opening. The selector `[class="..."]` syntax inside the attribute bracket was updated to properly chain the `.class` syntax.
- **Scope**: Modified `script.js`.

### 9. [Minor] Cash Counter Input Enhancements
- **Description**: Fixed the cash counter's Total/Subtotal calculations which were broken due to the inputs missing the expected classes. Enhanced the inputs by changing them strictly to numbers (`step="1"`), actively blocking decimals (`.`, `e`, `+`, `-`), and implementing a custom scroll wheel listener to smoothly increase or decrease the bill counts without being overly sensitive.
- **Scope**: Modified `script.js`.

### 10. [Minor] Settings UI Consolidation (v5.87k)
- **Description**: Consolidated the Settings modal by moving the "Credit Card Settings" card into the "Accounts" tab and removing the redundant "Credit Cards" tab. This simplifies navigation and groups all account settings in one place.
- **Scope**: Modified `index.html` and `script.js`.

### 11. [Minor] Debts and Receivables Form Rearrangement
- **Description**: Reordered the input fields in the "Add/Edit Debt" and "Add/Edit Receivable" modals to place the "Amount" field first. This aligns them with other transaction forms and prevents accidental entry of amounts into description/name fields.
- **Scope**: Modified `script.js`.

