# Kaasi Beta - Agent Rules & Workspace Context

This document outlines the project architecture, release workflow, rules, and crucial constraints to guide AI agents working on **Kaasi Beta**.

---

## Workspace Directory Context
- **`kaasibeta` (This repository)**: The core PWA expense tracking application. All active web app development happens here.
- **`kaasipublic`**: The public marketing/landing page repository. Do not mix files or commit beta app logic there.

---

## Release & Versioning Workflow
Agents **MUST** strictly adhere to the following workflow for all updates:

1. **Version Code Increment**:
   - The application version is stored in `index.html`. Retain the `v6.<internal number>n` format until v7 is public.
   - Increment the internal number once per round of app changes; keep the major version and trailing letter unless explicitly requested otherwise.

2. **Service Worker Cache Versioning**:
   - Every time a JavaScript, CSS, or HTML asset is modified, you **must** increment the cache version name inside `sw.js`.
   - Keep `sw.js` BUILD and HTML asset query versions equal to the application version. Refresh normalized SHA-256 hashes in `app-shell.json` following `docs/APP_SHELL_CACHE.md`.
   - Failing to bump this will cause PWA clients to serve stale cached assets, rendering your changes invisible.

3. **Changelog Updates (`docs/CHANGELOG_v7.md`)**:
   - Document each app change round in concise developer-facing language, newest version first. Keep historical changelogs unchanged.

4. **Git Version Control**:
   - Commit changes incrementally with clear, descriptive commit messages.
   - Push to `origin main` of the `kaasibeta` repository immediately after completing a functional update.

---

## Key App Features & Architecture

### 1. Cloud Sync & Storage (`js/cloud-sync.js`, `js/data-sync.js`, `js/storage.js`)
- Cloud sync automatically synchronizes whole datasets after sign-in when online, subject to pause, conflict, lock and activity safeguards. Manual sync and explicit replacement actions are also available; do not describe sync as manual-only.
- IndexedDB holds financial data and device preferences through `KaasiStorage` and `appPreferences`. Preserve migration/recovery copies, unknown backup fields and older IDs; no automatic cross-device merging is enabled.
- Preserve explicit conflict decisions, local-import sync pause and verified replacement safeguards. Do not change Supabase data, policies or settings without an explicit request.

### 2. Lockscreen & Secure PIN Recovery (`js/security.js`)
- The numeric PIN is a display lock, not encryption of stored data or backups.
- Recovery supports a security answer and owner-issued offline recovery codes without deleting financial data. Code rotation affects updated builds; cached older builds can retain earlier codes.
- Valid recovery code hashes are verified using SHA-256 matching. Actual codes are stored in the `.gitignore`d `recovery_codes.md` file.

### 3. Tailwind CSS Compiling
- When utility CSS classes are added or modified in the HTML templates, recompile the stylesheet using the Tailwind CLI:
  `.\tailwind\tailwindcss.exe -i .\tailwind\tailwind-input.css -o .\tailwind.css --config .\tailwind\tailwind.config.js --minify`

### 4. Custom Styling & Animations (`style.css` & `js/animations.js`)
- Custom UI keyframes are used for the startup preloader (`logo-pulse`) and system alerts. Do not override them with Tailwind's default `.animate-pulse` which has different easing parameters.
- `js/animations.js` implements UI polish like `animateValue` (number counting), `updateTabIndicator` (sliding tabs), and cascading fade-ins.

### 5. Main Entry & Global State (`js/app.js` & `js/globals.js`)
- **`app.js`**: Application's root bootstrapper. Coordinates UI setup, Supabase initialization, event bindings, and inactivity auto-lock.
- **`globals.js`**: Maintains application-wide state (stored in a single global `state` object), configuration defaults, and `localStorage` persistence layer. Modifications require mutating this object directly and calling `saveData()` and appropriate UI re-render functions.

### 6. Business Logic & DOM Controller (`js/features.js`)
- Core MVC controller managing primary financial models (Transactions, Debts, Receivables, Installments, Credit Cards).
- Houses CRUD handlers and directly manipulates the DOM to render lists, dashboards, and the complex "Monthly View" tab layouts.

### 7. UI & Interactive State Management (`js/ui.js`)
- Manages visual state (modals, overlays, theme switching, global input handling, background scroll-locking, keyboard shortcuts routing). 

### 8. Settings & Configuration (`js/settings.js`)
- Dedicated to user preferences inside the Settings modal (Categories, Budgets, Accounts, exclusion rules, hidden categories).

### 9. Visualization & Calculations (`js/charts.js` & `js/math-tool.js`)
- **`charts.js`**: Uses `Chart.js` for Monthly Overview (bar/line) and Pie Chart (categories). Also handles PDF report generation.
- **`math-tool.js`**: A custom recursive descent parser that allows inline math calculations in amount input fields with a floating toolbar.

### Important Technical Details & Constraints
- **Vanilla JS & Direct DOM Manipulation:** No front-end frameworks (like React or Vue). Views are rendered imperatively via template strings (`innerHTML`) and DOM APIs.
- **No Event Bus:** Tight-coupled component communication. Files invoke functions declared in other files directly via the global window scope.
- **No Scripts for File Editing:** Do NOT write or execute automated scripts (e.g., Python scripts) to bulk-modify project files. ALWAYS use native file editing tools (`replace_file_content` / `multi_replace_file_content`) to ensure changes remain atomic, easily traceable, and visually transparent in the chat interface.
