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

### 55. [Bugfix] Modal Stack Preservation & Accordion Refresh Optimizations (v5.207l)
- **Modal Stack Architecture**: Resolved an issue where background modals (like "All Transactions") would aggressively close and disappear when closing a foreground modal (like "Transaction Details"). The browser `popstate` event listener now leverages a strict `history.state.openModals` array to perfectly maintain the Z-stack of all currently opened modals, keeping underlying elements cleanly visible without relying on expensive re-renders.
- **Accordion Animation Prevention**: Patched an annoyance where accordion item elements inside the "All Transactions" list would needlessly re-animate (replaying the stagger fade-in) when switching back from the Details modal. Renderings now detect if an accordion item is already expanded and disables `stagger-item` animation inline.
- **Recent List Bug Fix**: Disabled the `new-transaction-animate` animation on the recent transactions dashboard component during list deletions and refreshes, mitigating the jittery rebuild. The list now seamlessly shrinks without firing off initial stagger transitions.

### 56. [UX] Seamless Modal Re-Rendering (v5.208l)
- **Persistent Chart Morphing**: Re-engineered the way the "All Transactions" modal rebuilds itself during background data updates. Instead of fully destroying and recreating the HTML canvas, the existing chart node is preserved and dynamically reinjected. This allows Chart.js to natively morph the pie slices to their new values, rather than jarringly flashing out of existence and spinning up from zero.
- **Accordion Slide-Snap Fix**: Disabled the CSS slide-down height transitions on the daily group accordions when they are redrawn during an update. Background list re-renders now snap instantly to their proper `scrollHeight` heights without triggering a full re-open slide animation.

### 57. [Bugfix] Modal Scroll Collapse on Refresh (v5.209l)
- **Scroll Freezing**: Fixed an annoying UX issue where the "All Transactions" list would snap back to the very top if a transaction was edited or deleted while scrolled down. The inner container height would momentarily collapse to 0 pixels while re-rendering the updated list, aggressively overwriting the browser's scroll height. The DOM now seamlessly freezes the `min-height` of the container prior to wiping it, keeping the scroll bar perfectly in place during the background refresh cycle.

### 58. [Bugfix] Inner List Scroll Restoration & History popstate jumps (v5.210l)
- **Manual Scroll Restoration**: Disabled the browser's native history scroll restoration (`history.scrollRestoration = 'manual'`) globally, preventing sudden scrolling jumps to the top when navigating back or closing stacked modals via `popstate` events.
- **Inner List Scroll Container Identification**: Identified the inner list container (`#monthlyTransactionsListContainer`) where the actual transactions list resides and scroll position was lost, and added tracking/restoration of its scroll state alongside the main modal container.
- **Synchronous Layout & Accordion Height Calculation**: Removed asynchronous timeouts (`setTimeout`) in layout updates. By setting expanded accordions to `maxHeight: "none"` synchronously, the DOM maintains its full size instantly, enabling reliable synchronous restoration of scroll coordinates during background details edits or deletions.

### 59. [Feature] Cloud Sync Expiration Interceptor & Recovery (v5.211l)
- **Session Expiration Detection**: Hooked session expiration detection checks into initial loading and Supabase `onAuthStateChange` state changes. If a user previously preferred cloud backups but their session expired in the background, a non-closable recover modal is displayed.
- **Interactive Option Locks**: Designed an un-closable, high-priority `cloudSessionExpiredModal` using the native Initial Setup Card layouts, forcing the user to choose to either re-authenticate ("Resume Cloud Backups") or switch strictly to local storage ("Switch to Local Mode"), preventing silent back-up loss.
- **Debug Verification Hook**: Exposed a global hook `window.triggerTestSessionExpiration()` to allow instant testing and verification of the session expiration dialog in the web inspector console.

### 60. [UI/Security] Session Expiration Modal Polish & Console Log Sanitization (v5.212l)
- **Button Sizing Alignment**: Standardized the dimensions of both choice buttons inside the session expired modal to `w-full sm:w-[140px]`, making them visually symmetrical and responsive.
- **Google Icon Polish**: Substituted the colored Google SVG icon with FontAwesome's brand icon (`fa-google`), fixing contrast issues on themed primary backgrounds.
- **Security Console Log Sanitization**: Modified session tracking logs in the Supabase module to output only `session.user.email` (or `"no session"`), completely preventing full JWT tokens (containing access tokens and refresh tokens) from being printed directly into the browser inspect console.

### 61. [UI/UX] Consistent Google Blue Branding (v5.213l)
- **Shared Google Blue Styles**: Updated the style sheet to apply the official Google Blue theme color (`#4285F4` background, `#357ae8` hover state) to both the settings page Google login button and the new session expired Google login button. This meets Google brand specifications and eliminates visual color desyncs in the user flow.

### 62. [Bugfix] Fixed Width Constraint for Expired Session Modal Buttons (v5.214l)
- **Enforced Button Symmetrical Widths**: Added explicit `width: 140px !important` CSS rules inside a `(min-width: 640px)` media query block for the recovery modal buttons, permanently correcting rendering discrepancies caused by flex parent constraints and different text lengths in desktop views.

### 63. [Bugfix] Strict min/max-width for Symmetrical Buttons (v5.215l)
- **Strict Width Constraints**: Added explicit `min-width: 140px !important` and `max-width: 140px !important` styles inside the media query for both recovery buttons to override any browser flex layout compression or custom padding discrepancies.

### 64. [Feature] Preloader Feature Tips & Easter Eggs (v5.216l)
- **Startup Tips Element**: Added a styled `#preloader-tip-container` and `#preloader-tip-text` block below the pulsing logo in the preloader overlay, mimicking classic gaming loading tips to help users discover hidden features.
- **Short & Punchy Tips Selection**: Compiled an array of over 20 short, action-focused hints covering keyboard shortcuts, backup details, hidden dashboard settings, and print-friendly PDF generation. Added a random selection script that picks and displays a single tip on page mount.
- **Easter Eggs Included**: Injected subtle, lighthearted budgeting jokes and localized Sinhalese coin trivia to keep the app startup experience delightful and fresh.

### 65. [UI/UX] Preloader Loading Tips Layout Polish (v5.217l)
- **Removed Header Label**: Removed the static uppercase `"TIP"` label above the loader hint text to simplify the loading layout and keep the presentation minimal.
- **Increased Logo Spacing**: Enlarged the top margin of the tip container from `2rem` to `3.5rem` to increase the visual breathing room below the central pulsing logo.
- **Balanced Multi-line Wrap**: Applied `text-wrap: balance` to the tip text container to prevent awkward line breaks and keep sentences evenly wrapped when rendered across multiple lines.

### 66. [Feature] Dynamic Tip Filtering for Mobile Devices (v5.218l)
- **Filtered Keyboard Shortcuts**: Added dynamic detection for mobile/touch screen environments to filter out keyboard shortcut tips (like Ctrl+E, 'A', '?') on touch devices where physical keyboards are unavailable.

### 67. [Feature] Dynamic Interval-Based Local Backup Reminders (v5.219l)
- **Customizable Intervals**: Transitioned local backup reminders from a fixed day-of-week approach to a dynamic interval format. Users can now choose to be reminded to download offline backups every 3 days, weekly (7 days), monthly (30 days), or switch them off entirely via a new setting in the Local Data Management panel.
- **Smart Cloud Auto-Default**: Introduced a "Smart Schedule" default setting which dynamically sets the local reminder interval to 7 days if the user is authenticated via Supabase (since data is already auto-saving to the cloud), or 3 days for offline/local-only users.
- **True Date Tracking**: The system now correctly saves the timestamp of manual local exports (`lastSuccessfulBackupDate`) alongside the dismissed reminder timestamp. This ensures the prompt genuinely waits for the full duration of the specified interval from the user's *last actual backup*, preventing redundant spam alerts.
- **Debug Trigger Support**: Added `window.triggerTestBackupReminder()` to the developer window object, allowing developers and testers to spawn the backup alert box on-demand without waiting for the timer to elapse.

### 68. [UI/Bugfix] Backup Reminder Polish & Search Crash Fix (v5.220l)
- **Backup Dropdown Visual Polish**: Aligned the new interval-based backup reminder dropdown selector with the global select inputs styling. Added a responsive fixed width (`sm:w-[220px]`) to cleanly display the dropdown options on small screens without text clipping.
- **Dynamic Fine Print Description**: Updated the explanatory text below the backup dropdown in settings to dynamically compute and show the reminder frequency (e.g., "You will get an automatic reminder every 3 days.") based on the user's chosen interval.
- **All Transactions Search Crash Fix**: Fixed a critical crash in the Search and tab filtration flow. The search function (`triggerSearch`) and active tab handlers were invoking `renderMonthlyDetails` with misaligned parameters, causing the code to try to execute `.toLowerCase()` on a boolean value instead of the search term. Corrected the argument ordering to restore seamless transaction searching.
- **Context-Aware PDF Export Action**: Automatically hide the "Export PDF" button while search queries or advanced category filters are active to prevent generating confused, partial reports.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v109` to force automatic, clean client-side updates, and updated the application metadata version in `index.html` to `v5.220l`.

### 69. [Feature] Category Budgets & Grouping (v5.221l)
Implemented a comprehensive category budget tracking feature with the following highlights:
- **Dynamic Budgets**: Create customizable monthly limits and assign multiple categories to a single budget.
- **Smart Cascade**: Changing or deleting a category seamlessly syncs up with your custom budgets without data loss or corruption.
- **Visual Progress**: A sleek, collapsible Dashboard Card tracks the current calendar month's spending against targets using Semantic 3-State Progress bars (Green, Orange, Red).
- **Settings Integration**: Dedicated settings tab offering Add/Edit/Delete actions with multi-select category checklists.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v110` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.221l`.

### 70. [UI/UX] Category Budgets Polish & Layout Fixes (v5.222l)
- **Settings UX**: Rearranged the Budget form layout to place category selections at the top. Added intelligent JavaScript auto-fill so the Budget Name dynamically populates based on your category selections (and smoothly steps back if you type a custom name).
- **Dashboard Layout**: Reorganized the core DOM structure to slot the Category Budgets card optimally between the "Add Transaction" and "Credit Card" cards on desktop.
- **Mobile Ordering**: Stripped out invalid CSS fractional orders and applied strict integer sorting to ensure the Category Budgets card correctly renders immediately after the Balance Overview on mobile, preventing it from incorrectly jumping to the top of the feed.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v111` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.222l`.

### 71. [UI/UX] Category Budgets Refinements, Spacing & Alignment Polish (v5.234l)
- **Consistent Spacing & Layout Alignment**: Standardized dashboard grid gap and column spacing (24px) for perfect layout symmetry across desktop and mobile. Increased the max-height of the Recent Transactions list container from `max-h-60` to `max-h-80` to display more items, pushing the bottom of the card down so that column layout gaps look visually balanced and separate instead of looking "nearly aligned".
- **Collapsible Budgets Divider**: Dynamically hide the header divider border and bottom padding/margins when the Category Budgets card is collapsed, preventing empty space artifacts.
- **Taller Category Selector**: Increased the height of the category selection boxes to 240px (`max-h-60`) inside both the budget setup and editing forms to fit more items and reduce scrolling.
- **Category Locking / Deduplication**: Dynamically lock and grey out categories already assigned to other budget groups (with a "Used" badge) to prevent double assignments.
- **Dismissible Monthly Tip**: Added a smart monthly budget banner reminder that automatically shows at the start of each month (during the first 3 days) inside the Category Budgets card. Clicking dismiss stores the month's identifier, preventing the prompt from reappearing until the next calendar month.
- **Tailwind Rebuild**: Successfully rebuilt the `tailwind.css` asset so that the newly introduced utility classes (like `max-h-80`) compile correctly and activate the proper scrolling behavior.
- **Bypassed Category Exclusions for Budgets**: Budget calculations now ignore general dashboard/report/totals exclusion settings for their assigned categories. If a user explicitly sets up a budget for a hidden category (e.g. "Savings"), it will still track and sum transactions for that budget normally.
- **Animated Budget Collapse**: Integrated smooth CSS `max-height` transitions (350ms ease-in-out) for expanding and collapsing the Category Budgets card. Refactored the handler to use a temporary dynamic transition class (`collapsible-transition`) combined with browser layout reflow flushes and transition cleanup listeners. This solves the stuttering/jumping animation glitches that occurred during standard page updates and allows the expanded element to layout naturally (`max-height: auto`).
- **Smooth Header Divider & Tip Transition**: Deferred removing the header border divider, bottom margins, and monthly tip banner during collapse until the `transitionend` event fires. This prevents layout content from instantly snapping up or clipping at the start of the collapse animation.
- **Stationary Preloader Logo**: Changed the preloader screen elements from vertical flex alignment to absolute positioning. The pulsing logo container is now locked at a stationary `45%` screen height, while the loading screen tip fades in directly `72px` underneath it, preventing the logo from abruptly shifting up as the tip text renders.
- **Animated Budget Progress Changes**: Refactored the Category Budgets progress bar updates to preserve the underlying DOM nodes across renders via budget ID matching. Prevented redundant `appendChild` calls when elements are already in their correct DOM ordering, as re-inserting elements resets the browser's active transition states. When transactions are added or deleted, the progress bars and their status texts now transition smoothly forwards or backwards, and their background colors change gradually (emerald green ↔ orange ↔ red) instead of snapping instantly.
- **Budget Text & Bar Spacing**: Adjusted the gap between the budget name/status text and its corresponding progress bar by increasing the bottom margin (`mb-1` to `mb-2`), preventing them from looking compressed.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v123` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.234l`.

### 72. [UI/UX] Global Tooltip System & Overflow Fixes (v5.235l)
- **Global Tooltip Migration**: Replaced the CSS pseudo-element tooltips (`[data-tooltip]::after`) with a single dynamic, body-level custom tooltip system (`#global-tooltip`). This handles rendering at the root viewport level, fully solving the bug where tooltips were clipped inside parent cards with `overflow: hidden` or scroll containers (such as the collapsible "Category Budgets" card).
- **Responsive & Smart Positioning**: Implemented viewport calculations inside the new global handler `initializeGlobalTooltips()`. The tooltip automatically centers relative to the target element and dynamically flips to the top if it risks overflowing the bottom of the screen.
- **Mobile Safe**: Added pointer-device verification (`(hover: hover)`) before triggering tooltips to prevent tooltips from getting stuck on mobile/touch screen interfaces.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v124` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.235l`.

### 73. [UI/UX] Tooltip Unification & Migration (v5.236l)
- **Migrated Default Tooltips**: Converted remaining native browser tooltips (`title`) to the unified custom tooltip system (`data-tooltip`) on budget titles and MoM comparison indicators (e.g. today and 7-day spending change alerts).
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v125` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.236l`.

### 74. [UI/UX] Comprehensive Tooltip Sweep (v5.237l)
- **Global Tooltip Unification**: Performed a full codebase sweep to eliminate all remaining native browser `title` tooltips. Converted over 20+ hardcoded `title` attributes (across transactions, settings toggles, custom date range inputs, and dashboard components) to the new `data-tooltip` unified system for a 100% consistent, premium UI experience.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v126` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.237l`.

### 75. [Bugfixes] Stability & UX Edge-Case Polish (v5.238l)
- **Persistent UI States**: Migrated the monthly budget tip dismissal state (`lastDismissedBudgetTipMonth`) to `localStorage`. This prevents the cloud sync icon from flashing when simply dismissing UI notifications.
- **Duplicate Notifications**: Fixed an issue causing duplicate "Export to Cloud" toast notifications on mobile by replacing `.addEventListener` with direct `.onclick` assignment for mobile dropdown actions, avoiding stacked listeners on UI refreshes.
- **Budget Divider Animation**: Improved the category budget collapse/expand logic to verify the intended state inside the `transitionend` listener. This prevents the budget divider from disappearing when spam-clicking the toggle button.
- **False Missing Elements Warning**: Corrected a logical bug in the initialization script where a UI refresh skipped attaching donate modal event listeners, but erroneously triggered an "elements not found" console warning.
- **Preserved Search State**: Ensured that editing or deleting a transaction while actively searching the "All Transactions" list preserves the current search term, rather than resetting to show all transactions.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v127` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.238l`.

### 76. [Features] Smart Sync & Mobile Tooltips (v5.539m)
- **Zero-Network Sync Hashing**: Implemented a highly efficient local data hashing mechanism (`generateDataHash`) that runs transparently during cloud syncs. When local changes are made and then reverted (e.g., adding and deleting a test transaction), the app now instantly recalculates the hash to detect that the local data perfectly matches the last cloud sync. This intelligently suppresses false-positive "Export to Cloud" warnings without requiring any bandwidth or background network payloads.
- **Mobile Tap-to-Tooltip**: Expanded the global tooltip system to fully support touch interfaces. Tapping on informational UI elements (like budget titles or trend arrows) on mobile devices now smoothly renders the tooltip for 2 seconds before auto-dismissing. Tooltips are actively suppressed on buttons to prevent them from interfering with actual button clicks or blocking modal overlays.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v130` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.539m`.

### 77. [UI/UX] Credit Card History Revamp (v5.540m)
- **Responsive Layout**: Replaced the constrained layout of the Credit Card History modal with a modern, mobile-friendly design aligning completely with the "All Transactions" aesthetic.
- **Month Tabs Navigation**: Removed the vertical scrolling month accordions in favor of a sleek horizontal Month Tabs slider and Year Selector at the top of the modal, allowing users to instantly jump to specific billing cycles without excessive scrolling.
- **Expandable Action Drawer**: Transformed credit card transactions into clean, status-badged cards inside a flat chronological list. Tapping a transaction on mobile or desktop smoothly toggles an inline Action Drawer containing large, touch-friendly buttons for paying off, editing, or deleting the item, completely eliminating horizontal squishing.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v131` to force automatic client-side updates, and updated the application metadata version in `index.html` to `v5.540m`.

### 78. [UI/UX] Credit Card History Refinements & Version Skip Correction (v5.254m)
- **Refined Action Drawer & Button Layout**: Optimized CTA buttons within the credit card action drawer to match the visual style of filter buttons. Forced min-height and added bottom padding to prevent button squashing and improve touch targets.
- **Improved Monthly Total Presentation**: Repositioned the monthly total from an awkward badge layout under the selector tabs to a clean, dedicated footer row at the bottom of the credit card history list.
- **Dynamic Mobile and Desktop Suffix Formatting**:
  - **Desktop**: Styled partially paid items to display as "X of Y Left" with the remaining amount "X" in bold red and the "of Y Left" suffix in a subtle, muted grey.
  - **Mobile**: Re-styled to display simply as "X Left" in red to conserve valuable horizontal screen space for the transaction name.
- **Mobile Spacing & Responsive Elements**: Increased standard margins/paddings between transactions on mobile layouts to prevent visual crowding. Recompiled Tailwind CSS to include responsive visibility classes (`sm:inline`, `sm:hidden`).
- **Version Sequence Correction**: Corrected a historical version numbering skip where the version jumped 300 iterations (from `v5.238l` to `v5.539m`). Reset the app metadata version to `v5.254m` to accurately align with the actual commit history.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to version `v146` to force automatic, clean client-side updates.

### 79. [Major] Production Bug Fixes
- **CC History Modal Navigation**: Fixed an issue where closing sub-modals (like Edit or Pay) from within the Credit Card History modal would improperly close the entire modal chain back to the dashboard. The CC History modal is now correctly registered in the browser's history state stack.
- **Service Worker Stale-While-Revalidate**: Fixed `sw.js` cache update dropping gracefully offline and keeping the Service Worker awake during background fetch.
- **Security PIN Modal State**: Fixed an issue in `js/security.js` where the background PIN event listener remained active when the Forgot PIN modal was open, preventing erroneous locks.

### 80. [Feature Sweep] UX Improvements & Fixes (v5.257m)
- **Modal Autofocus**: Automatically focus the first input field when opening static modals (like Transfer Money) on both desktop and mobile.
- **Math Toolbar Mobile Fix**: Repositioned the inline math toolbar to append correctly to the input's parent container to avoid floating bugs when the mobile virtual keyboard resizes the viewport.
- **Desktop Preloader Tips**: Fixed device detection so touch-enabled laptops properly show keyboard shortcut tips, and added several new fun tips.
- **Comma Support in Amounts**: Users can now freely type commas in number inputs (e.g., `10,000`). The commas are stripped automatically before calculations or saving.
- **Independent Backup Reminders**: Reworked cloud backup reminders to utilize local storage timestamps instead of synced states, ensuring devices track their 7-day intervals independently. The 7-day default is also now smartly detected via local tokens.
- **Cloud Backup Indicator**: Added a visual "Saving backup..." toast when clicking the cloud sync button.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v149` and version to `v5.257m`.

### 81. [Polish] Brand-Consistent Toast Notification Colors (v5.258m)
Replaced generic Tailwind color classes in `showNotification` with inline styles driven by Kaasi's own CSS variables, so toast colors automatically respect the active theme.
- **Success** → `--income-color` (Kaasi green `#27ae60`)
- **Error** → `--expense-color` (Kaasi red `#e74c3c`)
- **Warning** → `--accent-hover` (darker brand orange `#d35400`)
- **Info** → `--bg-tertiary` with a `--border-light` border (dark card tone `#2c2c2c`, subtle & unobtrusive)
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v150` and version to `v5.258m`.

### 82. [Security & Performance] Audit Implementations (v5.259m)
Addressed several key findings from the Kaasibeta Codebase Audit Report:
- **Data Import Performance**: Added a `setTimeout` yield in `data-sync.js` to ensure the "Restoring..." UI toast renders smoothly without the main thread locking up during heavy JSON parsing.
- **Transactional Error Handling**: Refactored `restoreFromSupabase` to use a transactional `try...catch` block with an in-memory backup, ensuring that malformed cloud data cannot corrupt the local state.
- **Modernized Clipboard API**: Migrated the deprecated `document.execCommand('copy')` in `app.js` to the modern, promise-based `navigator.clipboard.writeText()` API.
- **DRY Data Sanitization**: Created a generic `sanitizeNumericFields` utility in `data-sync.js`, replacing 6 repetitive `forEach` loops and significantly cleaning up the import logic.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v151` and version to `v5.259m`.

### 83. [Feature & Security] Beta PWA & PIN Recovery (v5.260m)
- **Beta PWA Rename**: Renamed the PWA short name and title to "Kaasi Beta" in the manifest to avoid naming conflicts on devices when installed alongside the final production version.
- **Search Date Formatting**: When searching or applying advanced filters, the year is now explicitly appended to the transaction dates in the timeline (e.g. "Sun, Jun 21, 2026") to avoid confusion across multiple years of data.
- **Secure PIN Recovery System**: Replaced the dangerous "Export Data & Factory Reset" PIN recovery option with a secure, hash-based recovery code mechanism. Users must now request a recovery code from the developer, which when entered, safely removes the PIN without wiping data.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v152` and version to `v5.260m`.

### 84. [Polish] Obsolete Files Cleanup (v5.267m)
- **Obsolete Files Cleanup**: Deleted the unused, UTF-16 encoded file `temp.html` (an old version of `index.html`) from the repository, reducing project bloat.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v161` and version to `v5.267m` to trigger clean client updates.

### 85. [Fixes & Polish] Safe Math Eval & UI Adjustments (v5.268m)
- **Security Upgrade**: Replaced the unsafe `Function()` execution in the math calculator with a secure, custom recursive descent parser, preventing CSP errors and closing potential execution vulnerabilities.
- **Budget Retention Fix**: Prevented budgets from being silently deleted when their assigned categories drop to zero.
- **Dashboard UI Graceful Degradation**: Modified the dashboard budget progress bars to display a compact "⚠️ 0 Categories" warning when a budget has no categories, replacing the normal status text without breaking horizontal layouts on mobile.
- **Mobile Toolbar Glitch Fix**: Bound the `touchstart` event to the floating math toolbar, preventing the input field from losing focus on mobile taps.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v162` and version to `v5.268m` to trigger clean client updates.

### 86. [Hotfix] Mobile Math Toolbar Touch Fix (v5.269m)
- **Touch Event Propagation Fix**: Resolved an issue where the math toolbar buttons were unresponsive on mobile touchscreens. The previous implementation prevented the default `touchstart` behavior (to avoid losing input focus), which inadvertently stopped the browser from firing the subsequent `click` event. The logic has been consolidated to trigger immediately on `touchstart` to ensure snappy and reliable mobile interactions.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v163` and version to `v5.269m` to force the client-side fix.

### 87. [Polish] UX Improvements & Cloud Safety (v5.270m)
- **Cloud Overwrite Protection**: Added a critical safety warning modal that blocks users from accidentally backing up to the cloud if the cloud contains newer data (indicated by a flashing restore button), preventing unintentional data loss.
- **Disabled Amount Autocomplete**: Disabled browser-native autocomplete (`autocomplete="off"`) on all transaction and budget amount inputs to prevent annoying dropdown menus from obstructing the math calculator toolbar.
- **Removed Transaction Tooltips**: Removed redundant hover tooltips from transaction descriptions in the dashboard and monthly views to clean up the UI.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v164` and version to `v5.270m` to deploy the latest UX updates.

### 88. [Hotfix] Cloud Overwrite Modal Buttons Fix (v5.271m)
- **Modal Argument Fix**: Corrected a parameter ordering bug in the new Cloud Overwrite Safety Modal where the confirmation callback function was accidentally passed as the `cancelText` parameter, causing the function's raw source code to display on the "Cancel" button instead of the word "Cancel".
### 89. [Security & Bug Fixes] Architecture & Hardening Update (v5.272m)
- **Math Precision Fix**: Improved the core decimal rounding logic across the entire app to eliminate edge-case JavaScript floating-point errors (e.g., partial payments getting stuck at Rs0.000001).
- **Collision-Proof IDs**: Upgraded the internal ID generation algorithm to use a high-entropy time-based string generator, preventing any risk of ID duplication during bulk imports.
- **XSS Vulnerability Patch**: Implemented strict HTML entity escaping (`escapeHTML`) on all transaction descriptions, category names, and debt titles before rendering to the DOM, completely neutralizing Cross-Site Scripting (XSS) risks.
- **Budget Progress Bar Math Fix**: Fixed a visual bug where spending against a budget with a Rs0 limit would fail to show the bar as 100% full (over limit).
- **Auto-Lock Security Timer**: The app now automatically triggers the PIN Lock screen after 5 minutes of inactivity (no taps, clicks, or typing) to protect your data if left unattended.
- **PIN Cryptographic Hashing**: Upgraded PIN and Security Answer storage from easily-reversible Base64 encoding to native browser SHA-256 cryptographic hashing.
- **Subresource Integrity (SRI)**: Hardened all external CDN `<script>` tags (Chart.js, jsPDF, Supabase) with SHA-384 fingerprints to guarantee the app refuses to run compromised code if the external servers are ever hacked.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v166` and version to `v5.272m` to deploy the security patches.

### 90. [Refactor & Tech Debt] Structural and Sync Enhancements (v5.274m)
- **Analytics Caching Fixed**: Excluded Google Tag Manager and Analytics URLs from the Service Worker cache to prevent stale tracking data.
- **Offline Supabase CDN**: Added the Supabase JS library to the offline `STATIC_ASSETS` array, enabling the app to load fully even when offline.
- **Global Error Safety Net**: Added `window.onerror` and `unhandledrejection` event listeners to display a fallback toast notification when unexpected JavaScript crashes occur, preventing silent freezes.
- **Device-Specific Settings Split**: Separated `theme` and `accent` from the global `state.settings` into a local `kaasi_device_theme` localStorage cache. This prevents UI preferences like Dark Mode from accidentally syncing across devices via Supabase.
- **Import Shape Validation**: Added strict validation during manual JSON import to verify the structural integrity of the uploaded data file *before* overwriting the `state`, preventing application corruption.
- **PWA Assets & SW Cache Updates**: Bumped the Service Worker cache schema to `v168` and version to `v5.274m` to deploy these enhancements.