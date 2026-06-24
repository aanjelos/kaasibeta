# Codebase & Roadmap Analysis Report — Kaasi

## 1. Roadmap Review
The following items are already tracked in the `docs/ROADMAP.md` backlog and are excluded from the new suggestions below to prevent duplication:

### Feature Additions
*   **Virtual Envelopes / Savings Wishlist**: Allocated trackable savings goals with visual progress bars.
*   **Split Bills / IOU Tracker**: Shared expense tracking ("Splitwise" style) with friend logs and settlement tallies.
*   **Gamification (Streaks & Badges)**: Streak counters for staying under budget and unlockable milestone badges.
*   **Undo Transactions**: Quick undo/revert action for last added, edited, or deleted transactions.
*   **Historical Budget Progress in PDF**: End-of-month historical snapshots of category limits in PDF reports.
*   **"Safe to Spend" Metric**: A dashboard widget showing disposable balance minus pending bills/goals.
*   **Multi-Currency Accounts**: Multi-currency account handling (e.g., USD/EUR wise balances converted to LKR net worth).

### UI / UX Polish
*   *(No items currently tracked in this category in the roadmap)*

### Technical Debt & Code Organization
*   *(No items currently tracked in this category in the roadmap)*

### Pre-Release v6 Checklist
*   **Offline PWA Smoke Test**: Verify offline launches via DevTools stale-while-revalidate caches.

---

## 2. Codebase Review
The following 6 files have been selected and analyzed to document their purpose, structure, and details:

### 1. `js/globals.js`
*   **Purpose**: Central utility and state configuration module.
*   **Key Details**:
    *   Defines the global `state` object and the template constructor `getDefaultState()` which structures transactions, accounts, categories, debts, receivables, installments, and user preferences.
    *   Initializes the Supabase client utilizing the publishable key.
    *   Provides storage functions (`saveData` and `loadData`) managing local data replication, size checks, and local modification indicators.
    *   Contains the application configuration wizard (`openInitialSetupWizard`) that handles initial account, category, and credit card configuration.
    *   Exposes global utility functions like `formatCurrency`, `roundToTwoDecimals`, and `showNotification`.

### 2. `js/app.js`
*   **Purpose**: Main entry point, lifecycle controller, and event handler setup.
*   **Key Details**:
    *   Triggers initialization sequence on DOM content load, executing data loading, theme selection, wizard logic, and event mapping.
    *   Handles PWA registration and install prompts by binding customized event listeners to standard installation triggers.
    *   Configures global tooltips via custom coordinates calculations, dynamically adjusting positioning relative to viewport edges.
    *   Hosts the preloader logic, providing random tips and Sinhala coin trivia to the user while loading is active.

### 3. `js/features.js`
*   **Purpose**: Domain-level transactional business logic and dashboard rendering.
*   **Key Details**:
    *   Contains UI render functions for recent transactions, active debt lists, receivables lists, installment plans, and category budgets.
    *   Handles form submission processing for adding, editing, and deleting transactions.
    *   Implements progress ring rendering using dynamic SVG attributes to visualize installment timelines and payment percentages.
    *   Tracks budget categories validation and limits, calculating transaction category totals for active budgets.

### 4. `js/settings.js`
*   **Purpose**: Configuration panel coordination and user preferences controller.
*   **Key Details**:
    *   Orchestrates the tabbed Settings panel (Accounts, Categories, Budgets, Data, Security, Appearance).
    *   Manages category renaming, creation, and deletion rules, including rules for hiding categories.
    *   Coordinates security credentials modifications, binding validation controls for PIN setups and security question configurations.
    *   Provides category selection fields dynamically when configuring budget groups.

### 5. `js/charts.js`
*   **Purpose**: Data visualization and document reporting.
*   **Key Details**:
    *   Orchestrates line charts (daily/monthly views) and pie charts (category breakdown) using the Chart.js canvas library.
    *   Provides automated PDF generation utilizing the `jsPDF` library to build high-fidelity print statements including financial summary cards, transaction registers, and category breakdown reports.

### 6. `js/math-tool.js`
*   **Purpose**: Built-in inline calculator feature controller.
*   **Key Details**:
    *   Provides mathematical expression parser `evaluateMathExpression` which replaces Sinhala characters with operators and runs a strict characters evaluation.
    *   Binds floating calculator toolbar positioning to active inputs in order to prevent overlap with standard buttons.

---

## 3. Suggestions List

### 🛑 Bugs & Critical Fixes

#### 1. Silent Bank Balance Desync on Deleting Paid Credit Card Transactions
*   **Rationale**: In `js/features.js` (`deleteCcTransaction`), deleting a credit card item filters related transactions (categorized as "Credit Card Payment") out of `state.transactions`. However, it does not add the payment amounts back to the corresponding bank accounts. This results in permanent balance mismatches where cash/bank accounts remain reduced, and the user has no way to correct this desync since the transactions themselves are deleted.
*   **Affected Files**: `js/features.js` (specifically `deleteCcTransaction`).

#### 2. Security Hazard & CSP Incompatibility via Dynamic Function Compilation
*   **Rationale**: The expression parser in `js/math-tool.js` uses `Function('"use strict";return (' + expr + ')')()` to evaluate mathematical inputs. While sanitization is in place to only permit digits and operators, dynamic code compilation is unsafe and fails in environments enforcing strict Content Security Policies (CSP) that restrict `unsafe-eval`. It should be replaced with a lightweight math parsing engine or safe tokenization library.
*   **Affected Files**: `js/math-tool.js` (specifically `evaluateMathExpression`).

#### 3. Silent Budget Deletion and Modification on Category Removal
*   **Rationale**: When a user deletes a category in Settings > Categories, the `deleteCategory` function cascades this deletion by filtering out the category from all active budgets. If a budget is left with zero categories, it is silently deleted from `state.budgets`. There is no confirmation dialog or list indicating to the user that their budget targets will be modified or deleted.
*   **Affected Files**: `js/settings.js` (specifically `deleteCategory`).

---

### 🎨 UI & UX Improvements

#### 1. Touch Event Support for Mobile Math Toolbar Focus
*   **Rationale**: On mobile/touch devices, tapping a button on the floating Math Toolbar can fire the amount input's `focusout` handler *before* the toolbar's button click event registers. This hides the toolbar instantly and prevents the operation from being applied. Implementing touch listeners (`touchstart`) that call `preventDefault()` on toolbar buttons will prevent focus loss on mobile screens.
*   **Affected Files**: `js/ui.js` (focus/out and click listeners) and `js/math-tool.js`.

#### 2. High-Contrast Text Styling for Dimmed Categories in Light Mode
*   **Rationale**: Under settings, users can select a rule to "Dim in Transaction Lists" for excluded categories. In Light Mode, this dimming styling can result in very low contrast ratios that fail standard accessibility checks (WCAG 2.1 AA), making transaction descriptions unreadable. The theme needs specific Light Mode dimming overrides.
*   **Affected Files**: `style.css` (custom variables and dim classes).

#### 3. Modal Depth Styling via Backdrop Blur
*   **Rationale**: When modals stack (e.g. editing a transaction from inside All Transactions, which stacks the Edit modal over the All Transactions list), there is insufficient visual depth. Applying a subtle backdrop-blur (`backdrop-blur-sm`) to overlay elements will enhance spatial hierarchy.
*   **Affected Files**: `style.css` and `tailwind.config.js`.

---

### 🚀 New Features

#### 1. Interactive Emergency Fund Calculator (Major)
*   **Rationale**: The Kaasi roadmap suggests a blog post about Sri Lankan bank insurance limits and Emergency Funds. Building a visual, interactive calculator directly into the app (e.g., in a "Calculators" tab in Settings or a separate Dashboard widget) where users can input monthly necessities and compute target ranges (3, 6, 9 months) would make this blog idea highly actionable.
*   **Affected Files**: `index.html`, `js/ui.js`, `js/app.js`, `style.css`.

#### 2. Dedicated Account Transfers History Log (Major)
*   **Rationale**: Users can transfer funds between cash and bank accounts, which adjusts balances and logs synthetic transactions. However, there is no way to audit transfers separate from other income/expenses. A dedicated "Transfers Log" tab or an advanced filter would allow users to verify internal fund movements without cluttering normal expense records.
*   **Affected Files**: `js/features.js`, `js/ui.js`, `index.html`.

#### 3. Automatic Backup Prompt before Factory Reset (Minor)
*   **Rationale**: Sliding the "Delete All Data" slider triggers an immediate wipe of all local and cloud data. Adding a prompt to download a final backup file (`kaasi-backup-before-wipe.json`) automatically right before execution would serve as an emergency safety net.
*   **Affected Files**: `js/data-sync.js` (specifically `completeDeletion`).

#### 4. Custom Icons & Color Codes for Categories (Minor)
*   **Rationale**: Users currently manage a simple text list of categories. Allowing them to assign predefined FontAwesome icons or distinct color tags to each category in Settings would make the dashboard pie charts, budgets, and transaction lists much more scannable.
*   **Affected Files**: `js/settings.js`, `js/features.js`, `js/globals.js`, `index.html`.
