# Sync performance verification - v6.441n

## Scope

Reduce repeated local reads without changing the backup format or Supabase. No live accounts or financial records were used. Each sync attempt still begins with a complete record read and integrity verification; later checks use private in-memory snapshot proofs and fresh durable dataset metadata. This relies on application writers atomically updating the dataset metadata, as all supported saves/restores already do. It is not protection against someone deliberately editing raw IndexedDB records mid-operation without updating metadata. Fresh sync snapshots and startup integrity checks still detect such record corruption.

## Reproduce

- `node tests/benchmark-sync.cjs --baseline`: committed v6.440n storage/sync code from `67999e3`.
- `node tests/benchmark-sync.cjs`: working storage/sync code.
- `npm test`: financial, storage, cloud, import and cache regression tests.

The benchmark uses 300 synthetic records with long descriptions (roughly 700 KB), fake-indexeddb, simulated Supabase responses and a stubbed interface renderer. Three runs per direction; each operation starts from a separately initialized database. These are local processing measurements, not actual browser disk or production network measurements.

| Path | Before median | After median | Full snapshot reads before/after |
| --- | ---: | ---: | ---: |
| Unchanged | 52 ms | 27 ms | 2 / 1 |
| Upload | 108 ms | 62 ms | 3 / 1 |
| Download | 3,931 ms | 3,140 ms | 5 / 1 |

Download timings are noisy and dominated by simulated database staging/verification. No rendering shortcut or recovery-write reduction was made. Network request counts remain unchanged: metadata checks do not fetch the dataset; downloads retain the final timestamp recheck and uploads retain conditional writes. Connectivity may still dominate perceived sync time.

## Safety coverage

- Checkpoints perform no collection reread but reject another tab's committed edit, dataset replacement, reset and cloned/unrecognised proof.
- Storage-backed cloud restore applies an unchanged expected copy and retains its previous recovery dataset.
- A competing local commit or cloud update at the final download check prevents replacement and leaves the old sync baseline intact.
- Existing tests cover conditional upload collisions, edits during upload, invalid downloads, failed saves, pause/resume and metadata-only checks.
