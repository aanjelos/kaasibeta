# Kaasi v6 — Chat n development changelog

## v6.362n — 2026-10-20

One version increment covers this round of changes. Existing documentation, recovery-code files, and beta domain/branding are preserved. Only kaasibeta is modified; kaasiapp and kaasipublic remain unchanged.

1. Bring beta up to the public v6.361m baseline: copy newer JavaScript security fixes and compiled styles, and match the public credit-card Limit/Available ordering while retaining beta identity.
2. Fix audit #4: stop successful submission flows when financial data cannot be saved, preserve form input, and restore the last saved in-memory financial state.
3. Fix audit #5: validate and prepare file/cloud backups before replacing data; use the same validation for setup import and cloud restore, reject unsafe object keys, and preserve existing data when an import fails.
4. Fix audit #6: block app shortcuts and data actions while PIN-locked, make the app background inert, and restore interaction only after unlocking.
5. Fix audit #7: escape remaining user-controlled HTML and replace unsafe dynamic inline record handlers with delegated actions using data attributes.
6. Fix audit #10: actually redraw the monthly transaction view after changes while preserving filters, expanded days, and scroll positions.
7. Fix audit #11: attach initial UI listeners after first-time setup and avoid duplicating those listeners on subsequent refreshes.
8. Fix audit #12: require complete, finite numeric expressions; reject malformed calculations and prevent partial numeric values from being submitted.
9. Fix audit #13: preserve hidden-category exclusions and category-dependent settings when a category is renamed, then refresh affected views.
10. Fix audit #14: initialize dates to today on launch/refresh and preserve selected transaction dates when returning from another tab.

Audit items #1, #2, #3, #8, and #9 are explanation-only in this round. Landing-page item #15 and the separate improvement suggestions are deferred.

11. Add a dependency-free Node regression suite for storage failures, import validation/rollback, PIN guards, safe rendering, monthly redraws, first-run listeners, calculations, category renaming, and date defaults. Tests use synthetic records and mocked browser/cloud APIs; they do not read personal backups or contact Supabase.

12. Verify the real UI on an isolated localhost origin using synthetic records: first-time setup, immediate advanced-filter access, rejection of `1000/0`, delegated edit controls, and immediate monthly row/total updates with the day group still expanded. Save browser evidence in `docs/qa-v6.362n.png`.

Validation: `node --test tests/audit-regressions.test.cjs` passes all 15 tests; all application scripts pass JavaScript syntax checks; `git diff --check` passes. No live cloud writes or production deployments were performed.

13. Run an extended browser QA session on localhost with the user's imported sample (3,688 transactions, 4 accounts, 11 receivables, 5 installment plans, 7 budgets), export a baseline before testing, and restore it afterward. Final exported JSON matches the baseline exactly, including settings. The original backup remains in Downloads as `kaasi-backup-2026-10-20-17-46-17.json`.
14. Verify 30 recorded browser checks: six invalid amount cases; valid expense arithmetic; search and immediate edit redraw; amount filtering; transfers with fees; card history and partial repayment; debt and receivable repayments; installment status; budget creation; hidden-category rename across 45 transactions; safe account names; malformed imports; large-history search/edit; backup round trips; all-time/custom-date reporting; draft dates and refresh defaults; cash counter; alternate chart; and nonempty PDF export. The final restoration comparison is included in these checks. No failed recorded assertions remain. The existing 15 automated regression tests also pass again.
15. Stress-import a temporary synthetic 20,000-transaction fixture. Import, exact-match search, editing, deletion, and subsequent baseline restore succeed. The unfiltered monthly list creates 20,000 record rows: opening it caused a browser-automation input timeout, and its full accessibility snapshot exceeded the automation frame limit. Filtered operations recovered and completed accurately. This identifies a large-list performance concern, with tool limits preventing a precise UI benchmark; pagination/virtualization remains a separate improvement rather than a change made in this QA session.
16. Remove the temporary malformed/large JSON test fixtures after testing and save the restored dashboard screenshot as `docs/qa-v6.362n-stress.png`. No application source or version changes were needed during this verification follow-up. No application console errors/warnings were captured after the final reload. Live Google/Supabase access, actual PIN entry/inactivity locking, physical mobile browsers, offline service-worker behavior, and forced browser-storage failures were not exercised in this browser session; the relevant PIN/storage/cloud validation paths remain covered by the mocked regression suite. The previously deferred audit issues remain deferred.
