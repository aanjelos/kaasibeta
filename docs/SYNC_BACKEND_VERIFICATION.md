# Deployed Cloud Access Verification

Frontend tests cannot certify deployed Supabase row-level security. No database policies are changed by the v6.436n web fixes.

Before public release, use two disposable authenticated accounts A/B and synthetic datasets only. Verify the deployed `user_data` table policies for:

- Anonymous SELECT/INSERT/UPDATE/DELETE cannot access user backup rows.
- A can read/create/update its own row, but cannot read/update/delete B's row.
- A cannot insert a row owned by B or change its own row's user_id to B.
- The equivalent restrictions hold for B. Include both USING and WITH CHECK restrictions in the policy review.
- Concurrent updates with the same expected updated_at allow only one successful write.
- Auth expiration, sign-out and account changes during requests leave local records intact and do not upload into a different identity without a first-sync decision.

Use the existing publishable client key, not a service-role credential, for these access tests. A missing row returned by a filtered read is not by itself proof of correct UPDATE/INSERT restrictions. Record policy definitions and test outcomes privately; never place access tokens, real exports or recovery codes in a committed report.
