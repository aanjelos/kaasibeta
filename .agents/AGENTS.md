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
   - The application version is stored in `index.html` (e.g., `<meta name="application-version" content="v5.267m" />`).
   - Increment the **decimal portion only** on update (e.g., `v5.267m` becomes `v5.268m`).
   - **DO NOT change the trailing letter** (e.g., `m`) unless the user explicitly requests you to do so.

2. **Service Worker Cache Versioning**:
   - Every time a JavaScript, CSS, or HTML asset is modified, you **must** increment the cache version name inside `sw.js` (e.g., `const CACHE_NAME = "kaasi-cache-v161"` to `kaasi-cache-v162`).
   - Failing to bump this will cause PWA clients to serve stale cached assets, rendering your changes invisible.

3. **Changelog Updates (`docs/CHANGELOG.md`)**:
   - **Notable Features/Major Fixes**: Document these sequentially in the chronologically ordered changelog list.
   - **Minor/Tiny Bug Fixes / Rollbacks**: Do **NOT** add these to the changelog. Ignore minor tweaks or experimental features that end up being rolled back to prevent changelog bloat.

4. **Git Version Control**:
   - Commit changes incrementally with clear, descriptive commit messages.
   - Push to `origin main` of the `kaasibeta` repository immediately after completing a functional update.

---

## Key App Features & Architecture

### 1. Manual Cloud Sync & Storage (`js/data-sync.js`)
- Cloud backups are **manual** (triggered by user action), not instant or automatic syncing. Make sure any UI/alert copy emphasizes this.
- Sync options are stored in `localStorage` under `preferredSyncMethod` (`cloud` or `local`).
- Modals like `#offlineSyncWarningModal` check offline status before allowing cloud operations, though local mode users bypass this check.

### 2. Lockscreen & Secure PIN Recovery (`js/security.js`)
- Protects access using a numeric PIN.
- Recovery is handled via a secure, offline hash-based recovery code mechanism (avoiding data resets).
- Valid recovery code hashes are verified using SHA-256 matching. Actual codes are stored in the `.gitignore`d `recovery_codes.md` file.

### 3. Tailwind CSS Compiling
- When utility CSS classes are added or modified in the HTML templates, recompile the stylesheet using the Tailwind CLI:
  `.\tailwind\tailwindcss.exe -i .\tailwind\tailwind-input.css -o .\tailwind.css --config .\tailwind\tailwind.config.js --minify`

### 4. Custom Styling & Animations (`style.css`)
- Custom UI keyframes are used for the startup preloader (`logo-pulse`) and system alerts. Do not override them with Tailwind's default `.animate-pulse` which has different easing parameters.
