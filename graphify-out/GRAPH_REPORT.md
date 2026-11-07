# Graph Report - kaasibeta  (2026-11-08)

## Corpus Check
- 56 files · ~108,418 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .css 4, (none) 3, .bat 1)

## Summary
- 724 nodes · 1259 edges · 42 communities (34 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5e18394`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Dashboard and Financial Flows
- Roadmap and Data Contracts
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
- History and Milestone Tests
- Storage Migration and Recovery
- ref_node_vm
- Sync Performance Benchmarks
- Dead Code Scanner
- History Suggestions
- Service Worker Tests
- Amount Calculator
- Third Party MIT Notices
- PIN Lock and Recovery
- fetch-subscription-icons.cjs
- PWA Manifest
- serve-sync-qa.cjs
- App Update Tests
- update-app-shell.cjs
- Logo Contrast Analysis
- c
- Transfer Selection Tests
- history-suggestions.test.cjs
- Simple Icons Licensing
- Offline Service Worker
- App Shell Cache Contract
- Cloud Sync Test Fixtures
- Form Containment Helpers

## God Nodes (most connected - your core abstractions)
1. `renderDashboard()` - 27 edges
2. `Kaasi Beta application shell` - 27 edges
3. `syncCloudData()` - 23 edges
4. `Element` - 21 edges
5. `openCcHistoryModal()` - 14 edges
6. `Portable subscription schedules` - 11 edges
7. `Settings desktop sidebar and mobile hub` - 11 edges
8. `refreshMonthlyViewIfRelevant()` - 10 edges
9. `downloadCloudSync()` - 10 edges
10. `Consistent portable JSON snapshots` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Chart.js MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/chartjs.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `jsPDF MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/jspdf.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `Supabase JavaScript MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/supabase-js.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `Tailwind CSS MIT Notice` --semantically_similar_to--> `LobeHub MIT Notice`  [INFERRED] [semantically similar]
  licenses/tailwindcss.txt → img/subscriptions/LOBE_ICONS_LICENSE.txt
- `Complete Font Awesome Free Notices` --semantically_similar_to--> `Font Awesome Free License`  [INFERRED] [semantically similar]
  licenses/font-awesome.txt → img/subscriptions/FONT_AWESOME_LICENSE.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Credit-card settings purchase entry and payment history** — index_accounts_settings, index_credit_card_entry, index_credit_card_history [EXTRACTED 1.00]
- **Local and cloud data recovery surfaces** — index_storage_recovery, index_backup_settings, index_cloud_restore_lock, index_cloud_conflict_review, index_session_recovery [INFERRED 0.85]

## Communities (42 total, 8 thin omitted)

### Community 0 - "Dashboard and Financial Flows"
Cohesion: 0.05
Nodes (79): ccPurchaseCategoryOptions(), deleteCcTransaction(), deleteDebt(), deleteInstallment(), deleteReceivable(), deleteTransaction(), dismissMonthlyBudgetReminder(), getCcPurchaseCategory() (+71 more)

### Community 1 - "Roadmap and Data Contracts"
Cohesion: 0.05
Nodes (47): v6.492n approved accessibility and rendering polish, Device-only sync pause and import protection, Local history-based description and name suggestions, UUIDs for new records, historical IDs retained, Isolated setup and replayable practice tour, Responsive Settings workspace, Shared backup validation and import rollback, Account-scoped SHA-256 sync baseline (+39 more)

### Community 2 - "App Shell and Settings Surfaces"
Cohesion: 0.08
Nodes (43): About support and third-party acknowledgments, Account names balances transfer fees and card limit, Google Analytics page configuration, Theme calculator and dashboard visibility preferences, Subscription security onboarding milestones and history scripts, Local backups cloud sync and storage protection, Total Available and Total Potential overview, Category budgets and monthly reminder (+35 more)

### Community 3 - "Cloud Synchronization"
Cohesion: 0.15
Nodes (37): assertCloudSyncLocal(), automaticCloudReviewsSeen, automaticCloudSyncEnabled(), automaticSyncPaused(), beginCloudRestoreLock(), checkVisibleCloudSync(), chooseCloudSyncCopy(), cloudSyncAssertUser() (+29 more)

### Community 4 - "Shared State and Utilities"
Cohesion: 0.08
Nodes (19): ccHistoryOpenMonthKeys, ccSelectedMonth, ccSelectedYear, deepMerge(), ensureDefaultAccounts(), ensureDefaultCategories(), escapeHTML(), formatCurrency() (+11 more)

### Community 5 - "IndexedDB Regression Tests"
Cohesion: 0.08
Nodes (19): devDependencies, fake-indexeddb@6.2.4, name, private, scripts, test, fake-indexeddb, assert (+11 more)

### Community 6 - "Interaction Regression Tests"
Cohesion: 0.08
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
Nodes (14): dir, fs, get(), icoImage(), main(), worker(), overrides, path (+6 more)

### Community 12 - "Subscription Regression Tests"
Cohesion: 0.12
Nodes (7): assert, fs, path, root, test, vm, {webcrypto}

### Community 13 - "Standalone Error and Confirmation Pages"
Cohesion: 0.25
Nodes (14): Google Analytics Page Tracking, External Font Awesome 6.5.1 Stylesheet, Main Website Recovery Link, 404 Noindex Directive, Standalone Page Not Found, External Satoshi Stylesheet, Pointer Driven 3D Tilt, Confirmation Google Analytics Tracking (+6 more)

### Community 14 - "Artwork Attribution and Notices"
Cohesion: 0.25
Nodes (7): Other Code: MIT, Font Awesome Free License, Font Files: SIL OFL 1.1, SVG and JS Icons: CC BY 4.0, Subscription Artwork Maintenance, Artwork Contact Sheet and Tests, Complete Font Awesome Free Notices

### Community 15 - "History and Milestone Tests"
Cohesion: 0.13
Nodes (8): assert, fs, test, vm, assert, fs, test, vm

### Community 16 - "Storage Migration and Recovery"
Cohesion: 0.32
Nodes (14): activeStorageRecoverySource(), addMigrationExport(), authorizeStorageRecovery(), chooseStorageMigration(), guardStorageAction(), openStorageCloudRecovery(), showStorageFailure(), startLocalStorage() (+6 more)

### Community 17 - "ref_node_vm"
Cohesion: 0.29
Nodes (5): context, fs, path, root, vm

### Community 18 - "Sync Performance Benchmarks"
Cohesion: 0.15
Nodes (9): baseline, baselineFiles, { environment }, fs, path, { performance }, { runtime, syncCloud }, sourceFs (+1 more)

### Community 19 - "Dead Code Scanner"
Cohesion: 0.17
Nodes (9): allContent, allFiles, fs, functionDeclarations, jsFiles, path, seen, uniqueFuncs (+1 more)

### Community 20 - "History Suggestions"
Cohesion: 0.30
Nodes (10): close(), configuration(), findHistorySuggestions(), pick(), prepare(), show(), appendOptions(), loadMore() (+2 more)

### Community 21 - "Service Worker Tests"
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

### Community 25 - "fetch-subscription-icons.cjs"
Cohesion: 0.29
Nodes (5): c, fs, path, root, vm

### Community 26 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 27 - "serve-sync-qa.cjs"
Cohesion: 0.08
Nodes (21): beta, fs, http, legacy, path, server, types, { execFileSync } (+13 more)

### Community 28 - "App Update Tests"
Cohesion: 0.22
Nodes (7): assert, fs, handler, path, source, test, vm

### Community 29 - "update-app-shell.cjs"
Cohesion: 0.20
Nodes (6): { createHash }, files, fs, html, path, root

### Community 30 - "Logo Contrast Analysis"
Cohesion: 0.33
Nodes (5): chooseFrame(), frames, fs, luminance(), path

### Community 32 - "Transfer Selection Tests"
Cohesion: 0.29
Nodes (5): accounts, assert, fs, test, vm

### Community 33 - "history-suggestions.test.cjs"
Cohesion: 0.29
Nodes (5): assert, context, fs, test, vm

### Community 35 - "Offline Service Worker"
Cohesion: 0.53
Nodes (5): fresh(), navigationShell(), pendingShells, STATIC_ASSETS, verifiedShell()

### Community 36 - "App Shell Cache Contract"
Cohesion: 0.70
Nodes (3): Coordinated application, asset and worker versions, CRLF-normalized SHA-256 asset hashes, Versioned app-shell hash manifest

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Element` connect `UI Test Runtime` to `Interaction Regression Tests`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Dashboard and Financial Flows` be split into smaller, more focused modules?**
  _Cohesion score 0.05393258426966292 - nodes in this community are weakly interconnected._
- **Should `Roadmap and Data Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.05030181086519115 - nodes in this community are weakly interconnected._
- **Should `App Shell and Settings Surfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Cloud Synchronization` be split into smaller, more focused modules?**
  _Cohesion score 0.14615384615384616 - nodes in this community are weakly interconnected._
- **Should `Shared State and Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._
- **Should `IndexedDB Regression Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.082010582010582 - nodes in this community are weakly interconnected._