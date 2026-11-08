# v7 release staging

Prepared 2026-11-08 from Kaasi Beta `1cfc141` (application `v6.501n`).

## Release branch

- Repository: `aanjelos/kaasiapp`.
- Branch: `codex/v7-release-staging`, based on production main `604bb1d`.
- Published staging commit: `6ced2b3`. Production main remains `604bb1d`.
- Staged application/cache version: `v6.503n` after the analytics follow-up below. Keep the internal format until public v7 publication; assign the public version and regenerate the app-shell manifest in the final release commit.
- Production `main`, CNAME (`app.kaasi.com.lk`), Pages settings and Supabase settings/data were not changed. Pages was verified to publish only `main` at the repository root.

## Release contents

- Copy tracked runtime files only. Use production Kaasi titles, manifest names and social-image URLs, preserving production descriptions and domain.
- Remove the beta homepage noindex/nofollow tag; retain noindex on the confirmation/error pages as in production.
- Exclude internal docs, Graphify, tests, QA servers, tooling, private/untracked files, Android work and subscription source inventories.
- Remove the unused FullLogo.png and development-only Tailwind compiler/source directory. Keep compiled tailwind.css, used artwork and required license notices.
- Remove the two console-only reminder/session-expiry test hooks from the release copy. Preserve actual reminder/session functionality.
- All 156 subscription artwork files are referenced by the runtime catalogue; no missing or unused catalogue artwork was found. Apparent Font Awesome font paths in the service worker are external CDN URLs, not missing local files.

## Verification

- Release runtime was copied to an isolated temporary QA folder; tests and source inventories were added there only, never to the public repository.
- Full suite: 240 passed, one legacy-compatibility test skipped because its sibling production checkout was absent. Re-ran the subscription suite against the actual pre-release production globals from main: 36 passed, including that compatibility test. All 241 distinct checks were therefore covered without a remaining skip.
- JavaScript parses; regenerated normalized app-shell hashes match the release files.
- Browser: synthetic saved-data upgrade and successful completion; mocked sync comparison/upload; dark/light desktop and 390px mobile dashboards; mixed Kasun debt, Netflix and Spotify upcoming rows; debt-payment form; Settings, About branding and license section. No horizontal overflow on the checked mobile dashboard.
- The isolated mock server deliberately returns 404 for sw.js. Service-worker behavior was covered by automated tests; this browser run does not certify installed-PWA updating or live Supabase sync.

## Before publishing

### Analytics follow-up, 2026-11-08

- Added in Beta first: subscription_created, subscription_payment_recorded, setup_completed, tutorial_completed and milestone_unlocked. Payloads contain only fixed feature metadata and known milestone IDs, never financial record fields or personal details.
- Only successful local actions emit events. Restored/synced achievements are silently baselined; device-only reporting receipts prevent milestone replay after reloads and older restores on that device. Receipts are not exported or cloud-synced. Clearing device storage or independent unlocks on separate devices can defeat deduplication; do not describe GA counts as exactly-once financial audit data.
- Beta verification: all 247 tests passed. Browser event capture confirmed fixed creation/payment payloads, silent simulated cloud restore/reload, and a known ID for a newly earned milestone. New events were captured locally rather than sent to Google.
- Only after Beta verification, copied the four changed runtime scripts and release versions to staging. All four scripts match Beta byte-for-byte. Staging's four analytics tests and eight app-shell/service-worker tests passed. Internal tests, mock capture and documentation remain excluded from the public app repository.
- Existing Google Analytics property/configuration retained. No GA administrative settings were changed; reporting milestone_id as a custom dimension remains a separate reporting setup step.

### Remaining release checks

- Complete real desktop/phone bidirectional sync, paid-subscription reminder ordering and shared local-backup reminder checks.
- Complete real-device PIN/recovery, installed-PWA update/offline/reconnect and real-data backup/restore acceptance checks. Keep personal test data out of both repositories.
- Complete the deployed backend checks recorded in SYNC_BACKEND_VERIFICATION.md with disposable accounts before claiming them verified.
- Assign public v7 version consistently in HTML, asset URLs, sw.js and app-shell.json; regenerate hashes and repeat cache checks.
- Review the staging diff and merge only on the agreed release date. Do not change Pages to the staging branch or push this candidate to main beforehand.
