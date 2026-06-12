# Kaasi Changelog

This document tracks all new features, enhancements, bug fixes, and cleanup tasks made during this pair programming session, ordered chronologically.

---

### 1. [Major] Dead Code Removal
Cleaned up the codebase by identifying and removing unused variables, dead code paths, obsolete functions, and redundant comments. This helped reduce file size, improve maintainability, and ensure code clarity.

### 2. [Major] Inline Math Calculator & Toolbar
Implemented an inline math calculator for amount input fields across the app (identified by the `calc-amount` class). Users can now directly type mathematical expressions (e.g., `1500 + 350`) into the amount fields. The expression is automatically evaluated on focus-out, when pressing Enter, or by clicking `=` on the new contextual Math Toolbar that pops up above the input. The floating Math Toolbar dynamically aligns with the input field, intelligently avoids z-index issues with modals, and can be globally enabled/disabled via settings on mobile devices.

### 3. [Major] Global Hidden Category Rules
Introduced a comprehensive category exclusion feature via a centralized "Hidden Category Rules" panel in the Settings modal. Users can mark categories as hidden/visible via a single Eye icon and fine-tune general exclusion behaviors using global rules.
- **Exclusion Options Introduced**:
- **Primary Rules**:
  - Hide from Dashboard Charts
  - Hide from Monthly Breakdown Totals
  - Exclude from PDF Reports
- **Advanced Rules (Accordion)**:
  - Hide from Quick Stats (Today & 7-Days totals)
  - Hide from Yearly Totals
  - Hide from Monthly Pie Chart
  - Dim in Transaction Lists (Grey out excluded categories)

### 4. [Minor] Cash Account Hideability & Tooltip Fixes
- **Cash Visibility**: Allowed the default "Cash" account card to be toggled visible/hidden from the Settings panel and during Initial Setup, matching the behavior of other custom bank and credit card accounts.
- **Tooltip UI Fix**: Fixed a CSS bug where tooltip elements (`[data-tooltip]`) rendered above their target components, blocking user clicks on buttons directly above them.

### 5. [Minor] Cash Counter Input Enhancements
Fixed the cash counter's Total/Subtotal calculations which were broken due to the inputs missing the expected classes. Enhanced the inputs by changing them strictly to numbers, actively blocking decimals, and implementing a custom scroll wheel listener to smoothly increase or decrease the bill counts without being overly sensitive.

### 6. [Minor] Settings UI Consolidation
Consolidated the Settings modal by moving the "Credit Card Settings" card into the "Accounts" tab and removing the redundant "Credit Cards" tab. This simplifies navigation and groups all account settings in one place.

### 7. [Minor] Debts and Receivables Form Rearrangement
Reordered the input fields in the "Add/Edit Debt" and "Add/Edit Receivable" modals to place the "Amount" field first, and positioned the "Type" and "Account" selectors immediately after the amount in the Receivables form. This aligns them with other transaction forms and prevents accidental entry of amounts into description/name fields.

### 8. [Major] Light Mode & Appearance Settings
Introduced a comprehensive "Appearance" tab in the Settings modal, allowing users to toggle between the classic Dark Mode and a new, high-contrast Light Mode. Added customizable Accent Color presets (Orange, Blue, Teal, Red, Purple, Green) with dynamic shade adjustments. Light mode features a premium "inset" effect for inputs and nested cards (e.g., Balance Overview cards) with carefully balanced Slate backgrounds to ensure high visual consistency and perfect legibility. The main logo retains its signature orange glow regardless of the chosen accent color, and charts dynamically update their axes and tooltips to match the active theme.

### 9. [Major] App PIN Lock Security & Refinements

- Implemented a 4-digit PIN lock screen that secures the app on load.
- Added the full Kaasi logo to the App PIN Lock screen for better branding.
- **Fallback Recovery**: If a user forgets their PIN, they can recover access by answering a preset Security Question they configured during setup.
- **Emergency Reset**: If the security question is also forgotten, an emergency "Export Data & Factory Reset" option is available to safely backup data to a JSON file before wiping the app to regain access.
- **Settings Management**: Added a new "Security" tab in Settings to enable, change, or remove the PIN lock and security questions. Clean inline forms are used rather than browser default prompts.
- **Deferred Dialogs**: Ensured background dialogs like the Cloud Backup Reminder are deferred until the PIN is successfully entered.

### 10. [Major] Codebase Modularization
Completed a massive structural refactor to split the monolithic `script.js` (8,000+ lines) into exactly 6 logical, focused modules (`globals.js`, `ui.js`, `features.js`, `charts-export.js`, `security.js`, `app.js`). Implemented this modularization using a safe, sequential loading strategy in `index.html` to guarantee compatibility without requiring a complex bundler setup.

### 11. [Minor] Settings Tabs Refinement
Added horizontal scrollability (`overflow-x-auto`) to the Settings tabs to prevent multi-line wrapping on mobile screens, implementing a clean `hide-scrollbar` utility and edge fade effects.

### 12. [Minor] Tailwind CSS Standalone CLI Migration
Successfully migrated Tailwind CSS from a CDN-loaded runtime script to a locally compiled static stylesheet (`tailwind.css`) using the Tailwind v3.4.17 Standalone CLI. This removes console warnings, drastically speeds up initial page load, and ensures backward compatibility with all existing custom color variables and overridden classes. Reorganized the project directory by creating a `docs/` folder for changelogs/roadmaps and a `tailwind/` folder for the standalone executable.

### 13. [Major] Chart.js Rendering Optimization
Optimized the rendering logic for the main dashboard chart. Instead of aggressively destroying and completely re-rendering the HTML canvas element every time a transaction is added or deleted, the chart now simply updates its `chart.data` and config references, and calls `chart.update()`. This enables smooth, native Chart.js animations when transitioning between data states and entirely eliminates the browser layout thrashing that was previously causing the UI to jitter during quick edits.

### 14. [Major] PWA Offline Support & Custom Install UI
Upgraded Kaasi into a fully installable Progressive Web App (PWA). The app can now be installed directly to a user's home screen or desktop and works entirely offline.
- Implemented a `manifest.json` using the existing SVG logo and dark theme colors to provide a native, full-screen standalone app experience.
- Built a Service Worker (`sw.js`) utilizing a Stale-While-Revalidate caching strategy. This instantly serves cached core files for lightning-fast offline loading, while silently fetching updates in the background.
- Engineered a custom, non-intrusive "Install App" button in the footer that safely intercepts and replaces the default browser installation prompts. This button dynamically hides itself if the app is already installed.

### 15. [Major] Privacy-First Analytics Integration
Integrated Google Analytics 4 (GA4) event tracking to capture anonymized usage metrics, allowing for feature discovery tracking without compromising user privacy.
- Implemented a centralized, robust `trackEvent` helper function to safely dispatch custom events to the GA4 tracking pixel without collecting personally identifiable information.
- Handled automated tracking of core application events (`add_transaction`, `edit_transaction`, `delete_transaction`) and feature usage (e.g., inline math calculator, PDF generation, PIN lock setup).

### 16. [Minor] Extensive Dashboard Customization & Fixes
Added several new toggles to the Settings > Appearance panel allowing users to completely declutter the dashboard to suit their personal tracking habits.
- Added toggles to Hide Cash Counter, Hide Total Potential, Hide Debts & Receivables, and Hide Installments. The dashboard grid layout automatically recalculates and expands cards based on which visibility toggles are active.
- Fixed a bug where opening the Monthly Breakdown view would persist a previously searched year instead of resetting to the current real-world year.
- Fixed a logic omission where the "Less/More than last month" tooltip indicator on the Monthly Breakdown ignored custom category exclusion rules. The tooltip now properly excludes any hidden categories for an accurate month-over-month comparison.

### 17. [Patch] Credit Card Partial Payment UI Totals

- Fixed an issue where the monthly grouping totals within the credit card transaction history modal incorrectly summed the full original amounts of partially paid items. The totals will now sum the exact amounts based on the filter logic.
- Partially paid items are now rendered in the "Paid" tab as well, explicitly displaying as "X Paid of Y" to properly account for the money allocated toward that debt within the view.

### 18. [Minor] Fully Offline Satoshi Web Fonts
Migrated the Satoshi font family from the external Fontshare CDN to locally hosted `.woff2` font files. This eliminates browser console warnings related to third-party cookies, guarantees 100% offline support for the PWA, enhances initial page load speeds, and improves user privacy.

### 19. [Feature] Debt & Receivable Progress Bars
Made partial payments significantly more rewarding by displaying dynamic visual progress bars beneath Debt and Receivable items. The progress bar conditionally appears only after the first partial payment is logged, keeping untouched items looking clean. It automatically calculates the percentage paid based on the `originalAmount` and `remainingAmount`, filling up a green track to visualize repayment progress.

### 20. [Feature] Modernized Accessibility Palette
Replaced the previous generic UI red and green colors with a modernized semantic palette utilizing Nephritis Green (`#27AE60`) and Alizarin Red (`#E74C3C`). This highly readable hybrid palette provides exceptional contrast on the dark theme background while retaining a premium, desaturated look that drastically reduces eye strain and satisfies WCAG accessibility requirements.

### 21. [Patch] PWA Maskable Icon Rendering Fix (v5.108k)
Fixed an issue where Android devices were heavily cropping the Kaasi logo when installed as a PWA. A dedicated `maskable` variant of the SVG logo was created with an expanded internal `viewBox` (adding a 20% safe-zone padding) and a solid dark background. The Web Manifest now seamlessly serves the perfect padded icon to Android, while keeping the edge-to-edge logo for desktop shortcuts and the internal app navigation.

### 22. [Feature] Mobile App Experience Overhaul (v5.115k)

- **Header Navigation Dropdown**: Replaced the bottom-right Speed Dial FAB with a native top-right mobile hamburger dropdown menu that cascades out of the main header, aligning perfectly with standard mobile UX patterns. It retains the custom deep-dark background dimming overlay (`75%` opacity) to focus the user's attention.
- **All Transactions**: Renamed 'Monthly View' to 'All Transactions' across the UI and keyboard shortcuts (now mapped to hotkey `A`) for clarity.
- **Horizontal Scroll & Edge Fade**: Implemented horizontal scrolling with a custom edge-fade mask for cramped Month selector buttons and settings tabs on mobile screens.
- **Grid Reordering**: Pushed the 'Balance Overview' card above the 'Credit Card' section on mobile viewpoints using CSS Display Contents for improved logical hierarchy.
- **Back Gestures**: Integrated HTML5 History API (`pushState`/`popstate`) to ensure native mobile swiping back closes overlay modals safely instead of abruptly terminating the PWA.
- **UI/UX Tightening**: 
  - Resolved an issue where tooltips remained stuck on screen after tapping buttons on mobile by utilizing `@media (hover: hover)`.
  - Maintained original 2-column tabular layout for Installments, adjusting text to stay readable on mobile without truncation.
  - Adjusted native dropdown padding for improved touch targets on iOS Safari without excessive desktop indentation.
  - Adjusted the Inline Math Toolbar dynamically to left-align preventing it from overlapping form close buttons.
  - Resolved color visibility for 'App Locked' text in light-mode PIN Setup.

### 23. [Patch] Mobile Dropdown Menu Polish (v5.123k)

- **Z-Index Layering**: Restructured the z-index hierarchy of the mobile dropdown menu and header to correctly sit below app modals (like Settings and All Transactions) while retaining prominence over the dashboard.
- **Scroll Locking**: Implemented robust scroll locking utilizing both `overflow-hidden` on the body and `touch-action: none` on the background dim overlay. This completely blocks background touch-scrolling while the menu is open on iOS and Android.
- **Alignment & Spacing**: Enforced strict right-alignment of the dropdown icons to match the hamburger toggle button. Replaced hardcoded inline paddings with dynamically compiled Tailwind utility classes for perfect spacing, and developed a resilient pure CSS fallback for the `env(safe-area-inset-top)` variable to bypass a mathematical parsing bug in Chromium mobile browsers.

### 24. [Feature] Installments Refinement & UX Polish (v5.138k)

- **Installments Layout**: Engineered a completely decoupled layout strategy to natively support both Desktop and Mobile views. Desktop perfectly mimics the native Debts 2-row tabular layout, while Mobile intelligently wraps the action buttons into a full-width footer row separated by a subtle divider line to entirely prevent text truncation and cutoff. 
- **Credit Card Polish**: Adjusted the visual presentation of Credit Cards to align with the rest of the application by integrating dynamic circular progress rings.
- **UX Consistency**: Standardized interaction icons across the board. The 'Edit' button across the app (Installments, Credit Cards, Transactions) is now a muted grey (`fa-edit`), the 'Delete' button utilizes a soft X (`fa-times`), and the 'Pay' buttons use a standard green card icon (`fa-credit-card`).
- **Natural Language**: Implemented dynamic string pluralization across Installments, Debts, and Receivables (e.g., smoothly alternating between "1 day left" and "5 days left" instead of the hardcoded "day(s)").

### 55. [Bugfix] Modal Stack Preservation & Accordion Refresh Optimizations (v5.207l)
- **Modal Stack Architecture**: Resolved an issue where background modals (like "All Transactions") would aggressively close and disappear when closing a foreground modal (like "Transaction Details"). The browser `popstate` event listener now leverages a strict `history.state.openModals` array to perfectly maintain the Z-stack of all currently opened modals, keeping underlying elements cleanly visible without relying on expensive re-renders.
- **Accordion Animation Prevention**: Patched an annoyance where accordion item elements inside the "All Transactions" list would needlessly re-animate (replaying the stagger fade-in) when switching back from the Details modal. Renderings now detect if an accordion item is already expanded and disables `stagger-item` animation inline.
- **Recent List Bug Fix**: Disabled the `new-transaction-animate` animation on the recent transactions dashboard component during list deletions and refreshes, mitigating the jittery rebuild. The list now seamlessly shrinks without firing off initial stagger transitions.

### 56. [UX] Seamless Modal Re-Rendering (v5.208l)
- **Persistent Chart Morphing**: Re-engineered the way the "All Transactions" modal rebuilds itself during background data updates. Instead of fully destroying and recreating the HTML canvas, the existing chart node is preserved and dynamically reinjected. This allows Chart.js to natively morph the pie slices to their new values, rather than jarringly flashing out of existence and spinning up from zero.
- **Accordion Slide-Snap Fix**: Disabled the CSS slide-down height transitions on the daily group accordions when they are redrawn during an update. Background list re-renders now snap instantly to their proper `scrollHeight` heights without triggering a full re-open slide animation.

### 57. [Bugfix] Modal Scroll Collapse on Refresh (v5.209l)
- **Scroll Freezing**: Fixed an annoying UX issue where the "All Transactions" list would snap back to the very top if a transaction was edited or deleted while scrolled down. The inner container height would momentarily collapse to 0 pixels while re-rendering the updated list, aggressively overwriting the browser's scroll height. The DOM now seamlessly freezes the `min-height` of the container prior to wiping it, keeping the scroll bar perfectly in place during the background refresh cycle.

### 25. [Feature] Advanced Search & Filters (v5.143k)
Added a robust set of advanced filtering tools within the All Transactions modal. Users can now open an accordion panel to filter their transaction history by custom date ranges, type (Income/Expense), category, and min/max amount ranges. The filters dynamically update the list in real-time, and UI elements cleanly highlight when active. Layout elegantly collapses to single-column on mobile phones and expands to a 3-column structured layout on desktop/tablet to properly accommodate all inputs.

### 26. [Feature] Advanced Category Multi-Select Filter (v5.150k)
Replaced the native Category dropdown inside Advanced Filters with a custom multi-select UI. Users can now check/uncheck multiple categories simultaneously, allowing for far more flexible transaction filtering. The dropdown incorporates intelligent toggling (e.g., selecting specific items unchecks the 'All Categories' master switch, and checking 'All Categories' clears specific selections), while dynamically updating the button label to reflect the current selection count.

### 27. [UX] Responsive Tabs & Auto-Scroll (v5.152k)
Added intelligent auto-scrolling to the scrollable tabs in the All Transactions modal and Settings panel. When a tab becomes active, it now automatically and smoothly scrolls into the center of the viewport. Additionally, updated the All Transactions month tabs to render the full month name (e.g., "January") on mobile screens and snap back to the abbreviated name ("Jan") on larger screens to better indicate horizontal scrollability.

### 28. [Feature] Privacy-Preserving DAU Analytics (v5.153k)
Enhanced the Google Analytics 4 (GA4) implementation by adding explicit `app_opened` and `app_returned` (via the Page Visibility API) custom events. This allows for highly accurate Daily Active User (DAU) tracking for the offline PWA without relying exclusively on automatic engagement metrics, perfectly preserving user privacy.

### 29. [Feature] Smart Contextual Cloud Sync UI (v5.154k)
Introduced a sophisticated "Out of Sync" detection system for Cloud Backups without modifying the offline-first architecture. The app now tracks hidden timestamps for lastLocalDataModification and lastLocalCloudSync. When connecting to Supabase, it performs a 3-way comparison against the Cloud's updated_at timestamp.
- **New Cloud Data Detection**: If the cloud contains newer data (e.g., synced from a phone), the "Import from Cloud" buttons turn green and pulse, with tooltips warning the user to pull the latest changes.
- **Unsaved Local Changes**: If the user adds expenses locally but forgets to back them up, the "Export to Cloud" buttons glow Kaasi orange, reminding them to push their changes.
- **Timestamp Display**: The exact human-readable timestamp of the last cloud sync is now cleanly displayed within the Settings panel and injected directly into the header button tooltips to provide instant peace of mind.

### 30. [Enhancement] Mobile Cloud Sync UI Polish (v5.155k)
Refined the mobile experience for the new contextual Cloud Sync UI:
- **Hamburger Menu Integration**: The core menu button now actively pulses (orange or green) to alert mobile users of their out-of-sync status before they even open the menu.
- **Dynamic Dropdown Text**: Mobile dropdown labels now actively switch states and dynamically print simplified sync timestamps (e.g., \Import Backup (New: Today at 12:23 AM)\) to provide instant clarity without breaking UI bounds.
- **Time Formatting**: Fully overhauled timestamp formatting app-wide to use intuitive "Today / Yesterday at X:XX AM" outputs instead of bulky absolute dates, significantly improving human readability.

### 31. [Feature] Seamless Cloud Onboarding (v5.156k)
Added a "Login & Restore" flow directly into the Initial Setup wizard. Returning users can now authenticate with a single tap, bypassing the entire setup flow and silently pulling their latest cloud data to instantly populate the dashboard.
- **Mobile Dropdown Enhancements**: Refined the UI logic for the mobile hamburger menu to elegantly differentiate between "Local Mode" and "Cloud Mode", ensuring labels dynamically update (e.g. `Export to Cloud (Unsaved changes)`) without overflowing narrow phone screens.
- **Pulsing Animation Tweaks**: Tweaked the CSS animation for out-of-sync cloud icons so that only the inner icon changes color, rather than scaling the entire button.
- **Inline Calculator Adjustment**: Adjusted the positioning of the floating Math Toolbar to anchor tightly to the bottom-right of active input fields, accompanied by a clean drop-down animation.

### 32. [Bugfix] Setup & Deletion Polishing (v5.157k)
- **Data Deletion Logout**: Ensures that sliding to "Delete All Data" from the Settings menu now also seamlessly severs the cloud connection by logging the user out of their Google session.
- **OAuth Race Condition Fix**: Refactored the core UI booting sequence to gracefully handle edge cases where the Supabase OAuth redirect would fire before the app UI had fully mounted, resulting in a blank dashboard screen during auto-restores. Using a localized intent flag ensures a completely seamless transition under a loading screen.

### 33. [UI/UX] Mobile Responsiveness & Centering Fixes (v5.160k)
- **Progress Ring Centering**: Fixed an obscure CSS/SVG rotation bug to ensure that the installment progress percentage text sits perfectly anchored in the center of its circular progress bar.
- **Mobile Dropdown Enhancements**: Added the "Transfer Money" shortcut directly into the mobile hamburger menu for easier one-handed access.
- **Modal Text Spacing**: Injected extra right-padding to all modal titles (`<h2>`) so they no longer collide with or overlap the "X" close button on extremely narrow screens.
- **Debts/Receivables Flex Wrapping**: Rewrote the flexbox styling for the Debts and Receivables modals. Instead of squeezing names and amounts into an unreadable mess, they now dynamically detect screen size and gracefully stack horizontally into two separate lines on mobile, while staying side-by-side on desktop.

### 34. [Architecture] JavaScript Codebase Reorganization (v5.161k)
- **Domain-Specific Modules**: Completely refactored and modularized the JavaScript codebase to drastically improve maintainability. Logic previously tangled inside `charts-export.js` and `ui.js` has been extracted and logically separated.
- **New File Structure**:
  - `data-sync.js`: Now exclusively handles all Supabase cloud sync, Google OAuth, and local data import/export/wipe operations.
  - `charts.js`: Dedicated exclusively to rendering the Dashboard UI charts and generating the comprehensive PDF Monthly Reports.
  - `settings.js`: Manages all Settings modal logic, advanced rules, and category customizations.
  - `math-tool.js`: A dedicated module for the floating inline calculator.

### 35. [UI/UX] Cloud Restore Enhancements (v5.162k)
- **Dashboard Restore Overwrite Warning**: Restoring from the dashboard now correctly summons the overwrite warning modal before proceeding.
- **Opt-Out Checkbox**: Added a beautifully styled "Don't show this warning again" custom checkbox inside the dashboard's restore warning modal for power users.
- **Modal Text Alignment**: Refined the UI of the confirmation modals to left-align larger paragraphs of text for significantly better readability.

### 36. [UI/UX] Modal & Checkbox UI Polish (v5.163k)
- **Modal DOM Hierarchy Fix**: Fixed an underlying DOM issue where injecting confirmation messages created massive structural gaps, restoring a perfectly padded confirmation modal.
- **Orange Tick Design**: All custom checkboxes (including the Cloud Restore opt-out and the Dashboard Category Filter dropdowns) have been upgraded. Instead of turning into a solid block of color, they now maintain their sleek dark background and reveal a gorgeous, animated orange SVG checkmark when ticked.

### 37. [Bugfix] CSS Custom Form Interference (v5.164k)
- **Tailwind Compilation**: Force-compiled the new utility classes into the production CSS payload.
- **Checkbox Solid Color Bug**: Removed an old hardcoded rule from `style.css` that was forcibly painting custom checkboxes solid orange, allowing the new transparent tick mark design to finally render.

### 38. [Bugfix] Tailwind Theme Configuration (v5.165k)
- **CSS Variables in Tailwind**: Configured `tailwind.config.js` to natively recognize the `var(--accent-primary)` CSS variable. This allows the Tailwind compiler to correctly generate utility classes like `border-accent-primary` and `text-accent-primary`, fixing the invisible checkbox styling.
- **Modal Margin Tightening**: Shrunk the internal vertical padding and margins inside the confirmation modal to perfectly eliminate the excessive visual gap.

### 39. [Bugfix] Checkbox SVG Visibility (v5.166k)
- **Tailwind Sibling Utilities**: Fixed a CSS hierarchy issue where the `peer-checked` state was incorrectly applied directly to the child `<svg>` element instead of the sibling `<div>`. The SVG checkmark now correctly inherits the dynamic `text-accent-primary` color when the hidden checkbox is toggled.

### 40. [Bugfix] Duplicate Event Listeners (v5.167k)
- **Initialization Guard**: Wrapped all global event listeners in `app.js` with a strict `!isRefresh` guard to prevent duplicate click events from stacking on the Advanced Filters toggle and search inputs during application re-renders.

### 41. [Enhancement] Inline Calculator UI (v5.168k)
- **Non-Intrusive Math Toolbar**: Replaced the automatic focus-triggered math toolbar popup with a dedicated, non-intrusive calculator icon button `fa-calculator` placed directly inside the right edge of all amount input fields.
- **Desktop Support**: Enabled the math toolbar for desktop users as well, providing a quick inline calculation tool without breaking the UX.

### 42. [Feature] UI Polish, PIN Autofill Bypass & Quick Date Range Enhancements (v5.180k)
- **Desktop Calculator Toggle**: Enabled the setting to toggle the amount-input calculator button on desktop viewports. Re-labeled the toggle text to "Show Calculator Button" to clearly describe the action.
- **PIN Lock Autofill Bypass**: Converted PIN input fields from `type="password"` to `type="text"` using CSS-level masking (`-webkit-text-security`). This successfully prevents modern browsers from issuing weak password alerts or triggering annoying credential-saving popups for basic 4-digit PINs.
- **Micro-Animations & Transitions**: Introduced a dedicated animation module featuring a smooth balance count-up effect on dashboard load, a sliding indicator background for tab switches, and a staggered fade-in entrance transition for transaction lists.
- **Beginner-Friendly Date Filters**: Added quick date range selectors (This Year, Past 6 Months, Past Year, and Last Year) to the advanced filters section, replacing financial acronyms (YTD, 6M, 1Y) with plain English for ease of use.
- **PWA Service Worker Cache Update**: Added the new `js/animations.js` module to the Service Worker static assets configuration and bumped the cache scheme to `kaasi-cache-v75` to force clients to update cleanly offline.

### 43. [Bugfix] Preloader, Tabs & ID Persistence (v5.181k)
- **Preloader Animation**: Resolved timing issues with the startup preloader by correcting animation delays.
- **Sliding Tabs Indicator**: Fixed a visibility and placement bug with the sliding tab indicator.
- **Countup ID Reset**: Ensured the countup animation targets stable DOM IDs to prevent errors when re-rendering dashboard elements.
- **Tailwind Compilation**: Recompiled Tailwind checkboxes to address minor layout spacing regressions.

### 44. [UI/UX] Stagger Animation & Checkbox Styling Polish (v5.182k - v5.183k)
- **rAF-Based Stagger**: Rewrote list entrance animations utilizing `requestAnimationFrame` for stutter-free rendering.
- **Sleek Checkboxes**: Addressed custom checkbox styling issues by compiling missing Tailwind utility classes.
- **Pill Alignment**: Fine-tuned the vertical alignment of selection pills and fixed preloader timeouts.

### 45. [Feature] Date Range Dropdown & Animation Cleanup (v5.184k - v5.185k)
- **Unified Date Dropdown**: Replaced the cluttered date selection pills with a clean, searchable "Date Range" dropdown.
- **Stagger Animation Removal**: Removed the initial load stagger animation on the recent transactions list, resolving layout jumps and simplifying loading times.
- **Dropdown Item Renaming**: Rephrased range options to ensure maximum clarity on mobile screens.

### 46. [Feature] Android Haptic Feedback Integration (v5.186k - v5.192k)
- **Tactile Notifications**: Integrated native haptic feedback (`navigator.vibrate`) into toasts and transactions.
- **Iteration & Tuning**: Tuned vibration length through user testing, starting at 100ms and dialing down to a highly responsive and subtle `55ms` duration.
- **Service Worker Scheme Update**: Bumped Service Worker cache schemes to force update static assets.

### 47. [Feature] Transaction Detail Modal & Navigation routing adjustments (v5.193l)
- **Detail Modal**: Introduced a dedicated transaction detail modal. Tapping anywhere on a transaction row now opens a clean, focused view showing the full description, category, date, account, and amount, completely eliminating any text truncation issues on narrow screens.
- **Responsive Action Buttons**: Hidden the small inline "Edit" and "Delete" buttons from transaction lists on mobile devices to maximize horizontal space for descriptions and prevent accidental misclicks. 
- **Desktop Parity**: Retained the inline quick-action buttons on desktop views for power users, while seamlessly integrating full-sized, touch-friendly "Edit" and "Delete" buttons inside the new mobile detail modal.
- **Modal Routing Intelligence**: Overhauled the `popstate` (back button) listener to properly recognize stacked modals, intelligently closing only the topmost active layer while preserving underlying modals.

### 48. [UI/UX] Detail Modal Typography & Hierarchy Polish (v5.194l)
- **Detail Modal Typography Polish**: Shifted the detail modal layout to prioritize the transaction description, utilizing `text-wrap: balance` to mathematically eliminate awkward orphan words on multi-line text for pristine typography.

### 49. [Bugfix] Chart Layout Flexbox Overflow (v5.195l)
- **Chart Layout Bugfix**: Completely decoupled the Chart.js canvas from flexbox constraints by wrapping it in an absolute container. This permanently resolves the infamous Chart.js bug where pie charts would overflow their container bounds.

### 50. [Feature] Mobile Accordion Layout Overhaul (v5.196l)
- **Accordion Mobile Overhaul**: Rebuilt the mobile layout engine for the "All Transactions" accordion. Day headers and transaction items now elegantly stack via flex-col on small screens, preventing extreme text-wrapping and giving complex data maximum breathing room, matching the design of the Debts and Receivables accordions.

### 51. [Bugfix] Active Tab Alignment Precision (v5.197l)
- **Active Tab Precision**: Wired the active tab indicator offset calculations directly into the `document.fonts.ready` event listener to ensure pinpoint pixel accuracy even if custom web fonts load slowly.

### 52. [UI/UX] Mobile Transaction Item Polish & Truncation (v5.198l)
- **Item Sizing Alignment**: Adjusted padding and font sizes on mobile viewports for transaction list items and headers to align perfectly with the Debts and Receivables accordions.
- **Title & Sub-detail Truncation**: Applied strict text truncation to transaction descriptions and metadata, preventing line wrapping and restoring visual hierarchy, relying on the transaction detail modal for full description details.

### 53. [Refactor] UI/UX Consistency Standardization & Performance Polish (v5.204l)
- **Standardized Corner Radii**: Replaced inconsistent, scattered border-radius values across the main stylesheet with centralized CSS custom variables (`--radius-sm`, `--radius-md`, `--radius-lg`), ensuring design token conformity.
- **Padding Standardization**: Standardized padding across transaction list items and headers in JS DOM rendering.
- **Inline Style Eradication**: Removed hardcoded `style` attributes in `index.html` (e.g. for z-indices, backgrounds, margins), replacing them with Tailwind classes or clean utility classes (`.bg-primary`, `.bg-tertiary`, `.border-theme`, `.modal-open`).
- **Modal Scroll Locking**: Resolved the issue where the dashboard background remained scrollable underneath open modals by defining `.modal-open { overflow: hidden; }` to lock body scrolling.
- **JS Codebase Header Documentation**: Added structured block comment headers to all 10 modular JavaScript files.
- **Stagger Animation Optimization**: Refactored the recent transactions renderer to perform delta DOM updates on list items using unique transaction IDs. This prevents the stagger animation from completely re-triggering from scratch for unmodified elements, making additions and deletions smooth and non-intrusive.
- **Auto-Setup Trigger After Deletion**: Improved the data deletion flow (slide to delete) so that upon wiping all local and cloud-associated data, it immediately triggers the initial Setup Wizard without forcing the user to manually refresh the page.

### 54. [UI/UX] Smooth Stacked Modal Routing & Dynamic Transaction Animations (v5.206l)
- **Eliminated Detail Modal Flash and Desyncs**: Modified the Transaction Detail Modal's action flows. Tapping "Edit" now launches the form modal right on top of the details view (boosting `#formModal` z-index to `68`), keeping it open underneath. Upon submitting the form, the details modal refreshes seamlessly with the updated details.
- **Improved Details Modal Delete**: Deleting a transaction from within the details modal now prompts the confirmation overlay to render on top. Confirming the deletion instantly closes both modals and returns to the parent list via a single `history.go(-2)` jump, preventing visual desyncs.
- **Dynamic Recent Transactions Animations**: Replaced static state transitions in the recent transactions view with smart DOM insertions. Newly added items slide down and fade in (`.new-transaction-animate`), pushing existing elements down, while deleted items smoothly shrink in height and fade out to 0 before getting removed. Initial loads retain the standard stagger.


