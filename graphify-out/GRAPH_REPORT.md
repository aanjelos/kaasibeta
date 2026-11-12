# Graph Report - kaasibeta  (2026-11-13)

## Corpus Check
- 57 files · ~111,840 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .css 4, (none) 3, .bat 1)

## Summary
- 748 nodes · 1314 edges · 50 communities (42 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb32f6c8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Dashboard and Financial Flows
- docs/CHANGELOG_v7.md
- App Shell and Settings Surfaces
- Cloud Synchronization
- Shared State and Utilities
- IndexedDB Regression Tests
- Interaction Regression Tests
- Settings and Budgets
- UI Test Runtime
- Backups and Cloud Sessions
- Startup and Animations
- Official Artwork Tooling
- Subscription Regression Tests
- Standalone Error and Confirmation Pages
- Artwork Attribution and Notices
- ref_node_test
- Storage Migration and Recovery
- ref_node_vm
- Sync Performance Benchmarks
- v7 release staging
- History Suggestions
- service-worker.test.cjs
- Amount Calculator
- Third Party MIT Notices
- PIN Lock and Recovery
- ref_node_fs
- PWA Manifest
- serve-migration-rehearsal.cjs
- App Update Tests
- feature-analytics.test.cjs
- serve-sync-qa.cjs
- serve-qa.cjs
- ref_node_test
- ref_node_assert
- Simple Icons Licensing
- Offline Service Worker
- fetch-subscription-icons.cjs
- Cloud Sync Test Fixtures
- Form Containment Helpers
- transfer-selection.test.cjs
- docs/INDEXEDDB_STORAGE.md
- milestones.test.cjs
- docs/SUBSCRIPTIONS.md
- docs/ROADMAP.md
- Deployed Supabase row-level security verification
- docs/APP_SHELL_CACHE.md
- Portable achievement metadata

## God Nodes (most connected - your core abstractions)
1. `renderDashboard()` - 27 edges
2. `Kaasi Beta application shell` - 27 edges
3. `syncCloudData()` - 24 edges
4. `Element` - 21 edges
5. `openCcHistoryModal()` - 14 edges
6. `downloadCloudSync()` - 12 edges
7. `manualCloudTransfer()` - 11 edges
8. `Portable subscription schedules` - 11 edges
9. `Settings desktop sidebar and mobile hub` - 11 edges
10. `confirmCloudAccountReplacement()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Chart.js MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/chartjs.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `jsPDF MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/jspdf.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `Supabase JavaScript MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/supabase-js.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `Tailwind CSS MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/tailwindcss.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `Release branch` --references--> `main()`  [INFERRED]
  docs/V7_RELEASE_STAGING.md → tests/fetch-official-subscription-icons.cjs

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Credit-card settings purchase entry and payment history** — index_accounts_settings, index_credit_card_entry, index_credit_card_history [EXTRACTED 1.00]
- **Local and cloud data recovery surfaces** — index_storage_recovery, index_backup_settings, index_cloud_restore_lock, index_cloud_conflict_review, index_session_recovery [INFERRED 0.85]

## Communities (50 total, 8 thin omitted)

### Community 0 - "Dashboard and Financial Flows"
Cohesion: 0.05
Nodes (79): ccPurchaseCategoryOptions(), deleteCcTransaction(), deleteDebt(), deleteInstallment(), deleteReceivable(), deleteTransaction(), dismissMonthlyBudgetReminder(), getCcPurchaseCategory() (+71 more)

### Community 1 - "docs/CHANGELOG_v7.md"
Cohesion: 0.15
Nodes (8): v6.492n approved accessibility and rendering polish, Device-only sync pause and import protection, Local history-based description and name suggestions, UUIDs for new records, historical IDs retained, Isolated setup and replayable practice tour, Responsive Settings workspace, Shared backup validation and import rollback, Planned advisory duplicate-entry warning

### Community 2 - "App Shell and Settings Surfaces"
Cohesion: 0.08
Nodes (43): About support and third-party acknowledgments, Account names balances transfer fees and card limit, Google Analytics page configuration, Theme calculator and dashboard visibility preferences, Subscription security onboarding milestones and history scripts, Local backups cloud sync and storage protection, Total Available and Total Potential overview, Category budgets and monthly reminder (+35 more)

### Community 3 - "Cloud Synchronization"
Cohesion: 0.14
Nodes (43): approveCloudAccountChoice(), assertCloudSyncLocal(), assertCloudSyncOwnership(), automaticCloudReviewsSeen, automaticCloudSyncEnabled(), automaticSyncPaused(), beginCloudRestoreLock(), checkVisibleCloudSync() (+35 more)

### Community 4 - "Shared State and Utilities"
Cohesion: 0.08
Nodes (19): ccHistoryOpenMonthKeys, ccSelectedMonth, ccSelectedYear, deepMerge(), ensureDefaultAccounts(), ensureDefaultCategories(), escapeHTML(), formatCurrency() (+11 more)

### Community 5 - "IndexedDB Regression Tests"
Cohesion: 0.06
Nodes (25): devDependencies, fake-indexeddb@6.2.4, name, private, scripts, test, fake-indexeddb, assert (+17 more)

### Community 6 - "Interaction Regression Tests"
Cohesion: 0.07
Nodes (7): assert, fs, path, root, test, vm, { webcrypto }

### Community 7 - "Settings and Budgets"
Cohesion: 0.16
Nodes (19): addCategory(), buildBudgetCategoryCheckboxes(), deleteBudget(), deleteCategory(), handleAddBudgetSubmit(), handleEditBudgetSubmit(), handleManageAccountsSubmit(), openEditBudgetModal() (+11 more)

### Community 9 - "Backups and Cloud Sessions"
Cohesion: 0.16
Nodes (13): checkAndTriggerBackupReminder(), completeDeletion(), exportData(), fetchAndUpdateLastCloudSyncTime(), handleBackupReminderDismiss(), initializeSupabase(), latestLocalBackupDate(), openCloudSessionExpiredModal() (+5 more)

### Community 10 - "Startup and Animations"
Cohesion: 0.14
Nodes (11): activeBalanceAnimations, animateValue(), previousBalances, updateTabIndicator(), initializeGlobalTooltips(), hideTooltip(), updateTooltipPosition(), initializeUI() (+3 more)

### Community 11 - "Official Artwork Tooling"
Cohesion: 0.17
Nodes (13): dir, fs, get(), icoImage(), worker(), overrides, path, references() (+5 more)

### Community 12 - "Subscription Regression Tests"
Cohesion: 0.08
Nodes (9): assert, env(), c, fs, path, root, test, vm (+1 more)

### Community 13 - "Standalone Error and Confirmation Pages"
Cohesion: 0.25
Nodes (14): Google Analytics Page Tracking, External Font Awesome 6.5.1 Stylesheet, Main Website Recovery Link, 404 Noindex Directive, Standalone Page Not Found, External Satoshi Stylesheet, Pointer Driven 3D Tilt, Confirmation Google Analytics Tracking (+6 more)

### Community 14 - "Artwork Attribution and Notices"
Cohesion: 0.25
Nodes (7): Other Code: MIT, Font Awesome Free License, Font Files: SIL OFL 1.1, SVG and JS Icons: CC BY 4.0, Subscription Artwork Maintenance, Artwork Contact Sheet and Tests, Complete Font Awesome Free Notices

### Community 15 - "ref_node_test"
Cohesion: 0.29
Nodes (4): assert, fs, test, vm

### Community 16 - "Storage Migration and Recovery"
Cohesion: 0.32
Nodes (14): activeStorageRecoverySource(), addMigrationExport(), authorizeStorageRecovery(), chooseStorageMigration(), guardStorageAction(), openStorageCloudRecovery(), showStorageFailure(), startLocalStorage() (+6 more)

### Community 17 - "ref_node_vm"
Cohesion: 0.29
Nodes (5): context, fs, path, root, vm

### Community 18 - "Sync Performance Benchmarks"
Cohesion: 0.15
Nodes (9): baseline, baselineFiles, { environment }, fs, path, { performance }, { runtime, syncCloud }, sourceFs (+1 more)

### Community 19 - "v7 release staging"
Cohesion: 0.22
Nodes (8): Analytics follow-up, 2026-11-08, Before publishing, Release branch, Release contents, Remaining release checks, v7 release staging, Verification, main()

### Community 20 - "History Suggestions"
Cohesion: 0.30
Nodes (10): close(), configuration(), findHistorySuggestions(), pick(), prepare(), show(), appendOptions(), loadMore() (+2 more)

### Community 21 - "service-worker.test.cjs"
Cohesion: 0.17
Nodes (8): assert, fs, path, root, source, test, vm, {webcrypto,createHash}

### Community 22 - "Amount Calculator"
Cohesion: 0.31
Nodes (9): evaluateMathExpression(), parseExpression(), parseFactor(), parseTerm(), formatAmountInputResult(), parseAmountValue(), positionMathToolbar(), processCalculation() (+1 more)

### Community 23 - "Third Party MIT Notices"
Cohesion: 0.20
Nodes (5): LobeHub MIT Notice, Chart.js MIT Notice, jsPDF MIT Notice, Supabase JavaScript MIT Notice, Tailwind CSS MIT Notice

### Community 24 - "PIN Lock and Recovery"
Cohesion: 0.42
Nodes (8): addPinDigit(), onAppUnlocked(), removePinDigit(), showForgotPinModal(), showPinLockScreen(), updatePinDots(), verifyPin(), verifyRecoveryCode()

### Community 25 - "ref_node_fs"
Cohesion: 0.33
Nodes (5): chooseFrame(), frames, fs, luminance(), path

### Community 26 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 27 - "serve-migration-rehearsal.cjs"
Cohesion: 0.22
Nodes (7): beta, fs, http, legacy, path, server, types

### Community 28 - "App Update Tests"
Cohesion: 0.22
Nodes (7): assert, fs, handler, path, source, test, vm

### Community 29 - "feature-analytics.test.cjs"
Cohesion: 0.17
Nodes (8): assert, fs, globals, helper, onboarding(), c, test, vm

### Community 30 - "serve-sync-qa.cjs"
Cohesion: 0.22
Nodes (8): context, fixture, fs, http, path, remote, root, vm

### Community 31 - "serve-qa.cjs"
Cohesion: 0.25
Nodes (6): { execFileSync }, fs, http, path, root, types

### Community 32 - "ref_node_test"
Cohesion: 0.29
Nodes (4): assert, fs, test, vm

### Community 33 - "ref_node_assert"
Cohesion: 0.25
Nodes (5): assert, context, fs, test, vm

### Community 35 - "Offline Service Worker"
Cohesion: 0.53
Nodes (5): fresh(), navigationShell(), pendingShells, STATIC_ASSETS, verifiedShell()

### Community 36 - "fetch-subscription-icons.cjs"
Cohesion: 0.29
Nodes (5): c, fs, path, root, vm

### Community 42 - "transfer-selection.test.cjs"
Cohesion: 0.25
Nodes (5): accounts, assert, fs, test, vm

### Community 43 - "docs/INDEXEDDB_STORAGE.md"
Cohesion: 0.27
Nodes (11): Account-scoped SHA-256 sync baseline, Atomic financial saves, Single previous-dataset recovery slot, kaasi-finances schema version 2, Frozen original KaasiData migration copy, Consistent portable JSON snapshots, Optimistic revision and generation guards, Verified staging generations (+3 more)

### Community 44 - "milestones.test.cjs"
Cohesion: 0.29
Nodes (4): assert, fs, test, vm

### Community 45 - "docs/SUBSCRIPTIONS.md"
Cohesion: 0.21
Nodes (11): Already Recorded renewal-only action, Atomic payment and renewal commits, Calendar recurrence and anchor-day clamping, Independent subscription expense and CC records, Bundled subscription artwork and local matching, Portable subscription schedules, Six-hour subscription reminder snoozes, SUBSCRIPTION_LOGO_FILES (+3 more)

### Community 46 - "docs/ROADMAP.md"
Cohesion: 0.23
Nodes (11): Planned BNPL purchase and repayment tracking, Planned per-month historical budget storage, Deferred Fluent Emoji Flat category icons, Planned reliably dated installment reminders, Planned historical budget PDF reporting, Optional future mobile transaction FAB, Implemented portable monthly budget reminder, Privacy-preserving shareable yearly recap (+3 more)

### Community 47 - "Deployed Supabase row-level security verification"
Cohesion: 0.43
Nodes (4): Owner and timestamp conditional cloud writes, Two-account backup isolation tests, Deployed Supabase row-level security verification, Concurrent expected-timestamp write test

### Community 48 - "docs/APP_SHELL_CACHE.md"
Cohesion: 0.70
Nodes (3): Coordinated application, asset and worker versions, CRLF-normalized SHA-256 asset hashes, Versioned app-shell hash manifest

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Element` connect `UI Test Runtime` to `Interaction Regression Tests`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Dashboard and Financial Flows` be split into smaller, more focused modules?**
  _Cohesion score 0.05393258426966292 - nodes in this community are weakly interconnected._
- **Why does `Consistent portable JSON snapshots` connect `docs/INDEXEDDB_STORAGE.md` to `docs/CHANGELOG_v7.md`, `docs/SUBSCRIPTIONS.md`, `docs/ROADMAP.md`, `Portable achievement metadata`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `App Shell and Settings Surfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Cloud Synchronization` be split into smaller, more focused modules?**
  _Cohesion score 0.1391304347826087 - nodes in this community are weakly interconnected._
- **Should `Shared State and Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.07563025210084033 - nodes in this community are weakly interconnected._
- **Should `IndexedDB Regression Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.05832147937411095 - nodes in this community are weakly interconnected._