# Milestone testing (temporary beta helpers)

Use the browser console while Kaasi is unlocked:

```js
kaasiMilestonesDebug.list() // Available IDs
kaasiMilestonesDebug.preview('records_500') // Toast only; no storage changes
kaasiMilestonesDebug.check(500) // Evaluate synthetic records in memory only
await kaasiMilestonesDebug.reset('records_500') // Removes the saved award
```

Reset changes achievement metadata only and follows normal backup/sync behaviour.
An award whose requirement is still satisfied can unlock again on the next save.
Removing `js/milestones-debug.js` and its script tag after testing removes these
helpers without affecting the feature. Do not expose them in the public release.

Historical recognition runs silently at load/import; earned records are persisted
with the next normal save. `earnedAt: 0` means recognised from existing data, not
a known historical completion date. Reliable historical transaction dates are
stored as achievedDate; new awards retain their actual unlock timestamp.
Cards use the same Achieved wording for both. New badges and viewed tracking
have been removed; opening Milestones does not write any viewing preferences.

Achievements are stored in the existing settings object store as dataset metadata,
and exported as `achievements`. This intentionally avoids a new database version.
No financial records or balances are changed by milestone evaluation.
