# Kaasi Changelog

This document tracks all new features, enhancements, bug fixes, and cleanup tasks made during this pair programming session, ordered chronologically.

---

### 1. [Major] Dead Code Removal
- **Description**: Cleaned up the codebase by identifying and removing unused variables, dead code paths, obsolete functions, and redundant comments. This helped reduce file size, improve maintainability, and ensure code clarity.
- **Scope**: Cleaned up various sections in `script.js` and other project files.

### 2. [Minor] GitHub Authentication Setup & Script Fix
- **Description**: Resolved a fatal authentication error encountered during repository operations by setting up a Personal Access Token (PAT) for git commands. This ensured secure and seamless code deployments to the remote repository.
- **Scope**: Internal configuration.

### 3. [Major] Inline Math Calculator & Toolbar (v5.84k)
- **Description**: Implemented an inline math calculator for amount input fields across the app (identified by the `calc-amount` class). Users can now directly type mathematical expressions (e.g., `1500 + 350`) into the amount fields. The expression is automatically evaluated on focus-out, when pressing Enter, or by clicking `=` on the new contextual Math Toolbar that pops up above the input.
- **Scope**: Added parsing and toolbar rendering logic in `script.js`, and styling in `style.css`.

### 4. [Major] Category Exclusion Settings (v5.85k Initial)
- **Description**: Added the initial implementation of the category exclusion feature. This allowed users to hide specific categories (e.g., Savings, Transfers) from dashboard charts and monthly reports, enabling a more accurate overview of actual daily expenses.
- **Scope**: Added inline exclusion controls to the "Manage Expense Categories" settings UI and integrated exclusion filters into the primary dashboard calculations.

### 5. [Major] Global Hidden Category Rules (v5.85k Refined)
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

### 6. [Minor] Migration Code Cleanup
- **Description**: Removed the temporary auto-migration code that automatically transitioned legacy categories (`excludeFromTotals`, etc.) to the new hidden categories array. Since the feature was not yet public, this simplified the startup initialization routine. All categories now start as visible by default.
- **Scope**: Cleaned up initialization routines in `script.js`.

### 7. [Minor] Granular Monthly Exclusion Rules
- **Description**: Separated "Hide from Monthly Breakdown Totals" and "Hide from Monthly Pie Chart" into two distinct advanced rule options. This provides finer control, allowing users to exclude a category from total calculation while keeping it visible in the pie chart breakdown (or vice versa).
- **Scope**: Modified rules list layout in `index.html` and logic checks in `script.js`.

### 8. [Minor] Cash Account Hideability & Tooltip Position Fix (v5.86k)
- **Description**:
  - **Cash Visibility**: Allowed the default "Cash" account card to be toggled visible/hidden from the Settings panel and during Initial Setup, matching the behavior of other custom bank and credit card accounts. For integrity, Cash remains un-renameable.
  - **Tooltip UI Fix**: Fixed a CSS bug where tooltip elements (`[data-tooltip]`) rendered above their target components, blocking user clicks on buttons directly above them (e.g., clicking the "View all debts" tooltip would intercept clicks intended for "Add new debt"). All tooltips are now repositioned to render below their respective elements.
- **Scope**: Modified `index.html`, `script.js`, and `style.css`.

### 9. [Minor] Cash Counter CSS Selector Fix
- **Description**: Fixed a `DOMException` error caused by an invalid CSS selector string in the cash counter modal logic, which prevented the modal from opening. The selector `[class="..."]` syntax inside the attribute bracket was updated to properly chain the `.class` syntax.
- **Scope**: Modified `script.js`.

### 10. [Minor] Cash Counter Input Enhancements
- **Description**: Fixed the cash counter's Total/Subtotal calculations which were broken due to the inputs missing the expected classes. Enhanced the inputs by changing them strictly to numbers (`step="1"`), actively blocking decimals (`.`, `e`, `+`, `-`), and implementing a custom scroll wheel listener to smoothly increase or decrease the bill counts without being overly sensitive.
- **Scope**: Modified `script.js`.

### 11. [Minor] Settings UI Consolidation (v5.87k)
- **Description**: Consolidated the Settings modal by moving the "Credit Card Settings" card into the "Accounts" tab and removing the redundant "Credit Cards" tab. This simplifies navigation and groups all account settings in one place.
- **Scope**: Modified `index.html` and `script.js`.

### 12. [Minor] Debts and Receivables Form Rearrangement
- **Description**: Reordered the input fields in the "Add/Edit Debt" and "Add/Edit Receivable" modals to place the "Amount" field first, and positioned the "Type" and "Account" selectors immediately after the amount in the Receivables form. This aligns them with other transaction forms and prevents accidental entry of amounts into description/name fields.
- **Scope**: Modified `script.js`.

### 13. [Major] Light Mode & Appearance Settings (v5.88k)
- **Description**: Introduced a comprehensive "Appearance" tab in the Settings modal, allowing users to toggle between the classic Dark Mode and a new, high-contrast Light Mode. Added customizable Accent Color presets (Orange, Blue, Teal, Red, Purple, Green) with dynamic shade adjustments to ensure optimal readability across both themes. The main logo retains its signature orange glow regardless of the chosen accent color, and charts dynamically update their axes and tooltips to match the active theme.
- **Scope**: Modified `index.html`, `style.css`, and `script.js`.

### 14. [Minor] Light Mode Refinements & Logo Contrast (v5.89k)
- **Description**: Perfected the Light Mode contrast based on UX feedback. Replaced pure white backgrounds with a tiered Slate palette to create a premium "inset" effect for inputs and nested cards (e.g., Balance Overview cards, Credit Card modal cards). Consolidated dark text mappings to perfectly match the dark mode background (`#121212`) for high visual consistency. Resolved multiple legibility issues, including invisible modal headers, poorly contrasting dropdown buttons, and unstyled SVG logos (AanjeloNoText) by applying precise hex filter mappings. Additionally updated the settings disclaimer to reflect cloud backup availability.
- **Scope**: Modified `index.html` and `style.css`.

### 15. [Minor] Math Toolbar Refinements (v5.90k)
- **Description**: 
  - **Alignment**: Repositioned the floating Math Toolbar so its right edge dynamically aligns with the right edge of the active input field. This prevents it from awkwardly covering up field labels like "Amount".
  - **Z-Index Fix**: Fixed a critical z-index issue (`z-index: 9999`) that was causing the Math Toolbar to be hidden behind modals, such as when adding Debts, Receivables, or Editing a Transaction.
  - **Mobile Toggle**: Added a user setting in the "Appearance" tab (visible only on mobile/touch devices) to globally enable or disable the Math Toolbar, for users who find the popup intrusive.
  - **Styling**: Fixed an issue where the `=` button text was completely invisible in Light Mode by properly referencing the active `--accent-primary` color variable instead of an undefined variable.
- **Scope**: Modified `index.html`, `script.js`, and `style.css`.

### 16. [Major] App PIN Lock Security & Refinements (v5.91k)
- **Description**: 
  - Implemented a 4-digit PIN lock screen that secures the app on load.
  - **Fallback Recovery**: If a user forgets their PIN, they can recover access by answering a preset Security Question they configured during setup.
  - **Emergency Reset**: If the security question is also forgotten, an emergency "Export Data & Factory Reset" option is available to safely backup data to a JSON file before wiping the app to regain access.
  - **Settings Management**: Added a new "Security" tab in Settings to enable, change, or remove the PIN lock and security questions. Clean inline forms are used rather than browser default prompts.
  - **Deferred Dialogs**: Ensured background dialogs like the Cloud Backup Reminder are deferred until the PIN is successfully entered.
  - **UI Polish**: Fixed lock screen height stretching, matched the dark theme background color precisely, hid visual numpad on large screens (with global keyboard event listeners for seamless desktop entry), and corrected password input field styling.
- **Scope**: Modified `index.html`, `script.js`, and `style.css`.

### 18. [Major] Codebase Modularization (v5.93k)
- **Description**: 
  - Completed a massive structural refactor to split the monolithic `script.js` (8,000+ lines) into exactly 6 logical, focused modules (`globals.js`, `ui.js`, `features.js`, `charts-export.js`, `security.js`, `app.js`).
  - Implemented this modularization using a safe, sequential loading strategy in `index.html` to guarantee 1000% compatibility with existing top-level global variables and inline HTML event listeners, without requiring a complex Webpack/ES6 bundler setup.
- **Scope**: Deleted `script.js`. Modified `index.html` and added `js/globals.js`, `js/ui.js`, `js/features.js`, `js/charts-export.js`, `js/security.js`, `js/app.js`.

### 17. [Minor] Settings Tabs & Branding Refinements (v5.92k)
- **Description**: 
  - Added horizontal scrollability (`overflow-x-auto`) to the Settings tabs to prevent multi-line wrapping on mobile screens, implementing a clean `hide-scrollbar` utility and edge fade effects.
  - Added the full Kaasi logo to the App PIN Lock screen for better branding.
- **Scope**: Modified `index.html` and `style.css`.

### 19. [Minor] Tailwind CSS Optimization & Folder Cleanup
- **Description**: 
  - Migrated Tailwind CSS from a CDN-loaded runtime script (`cdn.tailwindcss.com`) to a locally compiled static stylesheet (`tailwind.css`). This removes the console warning, drastically speeds up initial page load (as the browser no longer needs to download the compiler or generate CSS on the fly), and properly prepares the project for production while remaining entirely vanilla.
  - Reorganized the project directory by creating a `docs/` folder for changelogs/roadmaps and a `tailwind/` folder for the standalone Tailwind CLI executable and config files.
  - Added a convenient `build-tailwind.bat` script inside the `tailwind/` folder to make future local CSS generation a simple one-click task.
- **Scope**: Modified `index.html`, created `tailwind.css`, added `tailwind/` and `docs/` directories.

### 20. [Major] Chart.js Rendering Optimization (v5.94k)
- **Description**: Optimized the rendering logic for the main dashboard chart. Instead of aggressively destroying and completely re-rendering the HTML canvas element every time a transaction is added or deleted, the chart now simply updates its `chart.data` and config references, and calls `chart.update()`. This enables smooth, native Chart.js animations when transitioning between data states and entirely eliminates the browser layout thrashing that was previously causing the UI to jitter during quick edits.
- **Scope**: Modified `renderMonthlyOverviewChart` in `js/features.js` and updated version in `index.html`.

### 21. [Major] PWA Offline Support & Custom Install UI (v5.95k)
- **Description**: Upgraded Kaasi into a fully installable Progressive Web App (PWA). The app can now be installed directly to a user's home screen or desktop and works entirely offline.
  - Implemented a `manifest.json` using the existing SVG logo and dark theme colors to provide a native, full-screen standalone app experience.
  - Built a Service Worker (`sw.js`) utilizing a Stale-While-Revalidate caching strategy. This instantly serves cached core files (HTML, CSS, JS, Images) for lightning-fast offline loading, while silently fetching updates in the background to ensure seamless version updates without manual refreshes.
  - Engineered a custom, non-intrusive "Install App" button in the footer that safely intercepts and replaces the default browser installation prompts. This button dynamically hides itself if the app is already installed or if the user is running the app in standalone mode, guaranteeing zero UX spam.
- **Scope**: Created `manifest.json`, created `sw.js`, modified `index.html` (linked manifest, added footer button), modified `js/app.js` (registered SW, handled `beforeinstallprompt`), and updated version to `v5.95k`.
