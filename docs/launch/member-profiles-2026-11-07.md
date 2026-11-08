# Every account on the Members page: basic profiles at sign-in, 2026-11-07

Robert chose on 2026-11-07 ("just 1 please") to create a basic profile automatically at sign-up and to backfill the existing accounts, so every gayiclub.com account appears on the Members page. Nexus task a2d977e5-7174-4b1c-8d54-17e9a53b0d8d.

## What changed

- `POST /api/auth/session` (every sign-in path calls it after Firebase Auth succeeds) now calls `ensureProfileForIdToken` from `lib/firebase/userProfiles.ts`. The first sign-in of an account creates `user_profiles/{uid}` with `id`, `created_at` (the Auth account creation time) and `full_name` (the Auth display name, otherwise null). The write is a create-if-absent transaction: an existing profile is never modified, and two concurrent first sign-ins produce one document. Returning members cost one document read. A profile failure is logged and never blocks the sign-in.
- Names are never invented and the email address is never copied into the profile. A display name that looks like an email address is treated as no name.
- The Members page and the member detail page show "New member" (`lib/memberName.ts`) for a missing name instead of "Anonymous Member". The email is never a fallback.
- The Profile page builds its merge payload with `profileSavePayload` (`lib/profileSave.ts`); the payload never contains `created_at`, so `setDoc(..., { merge: true })` keeps the sign-up timestamp and every other existing field. Whitespace-only names are stored as null.
- `scripts/backfill-user-profiles.ts` (`npm run profiles:backfill`) lists every Firebase Auth account and creates the missing basic profiles through the same code. Dry run by default, `--apply` to write. Idempotent. Output never includes email addresses.
- No security rule changes. The Admin SDK writes the profile server side; the existing `user_profiles` rules (self or admin read, self create and update) are unchanged. No member email was sent.

## Backfill (production, project gayiclub)

Credentials: the repo's `service-account.json` through `GOOGLE_APPLICATION_CREDENTIALS`. Logs: `evidence/member-profiles/backfill-*.log`.

```
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run profiles:backfill -- --project gayiclub
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run profiles:backfill -- --project gayiclub --apply
```

| Run | Time (UTC) | Result |
| --- | --- | --- |
| Dry run | 2026-11-08 00:15 | accounts=11 existing=8 missing=3 created=0, listed the three uids below, nothing written |
| Apply | 2026-11-08 00:15:45 | created=3 modified=0 skipped=0 profiles_after=11 |
| Apply again (idempotency) | 2026-11-08 00:15:49 | existing=11 missing=0 created=0 modified=0 |

Created profiles (`evidence/member-profiles/production-profiles-after-backfill.json` confirms keys `created_at, full_name, id` and `created_at` equal to the account creation time for each):

| uid | full_name | created_at |
| --- | --- | --- |
| BvBkMw3NbFXMsRunTCW1Zl9cPw52 | null | 2026-09-07T08:03:12Z |
| KJLv7B8tPpQgvtbZGkxf7Q46G3K3 | null | 2026-09-06T23:00:15Z |
| jg4nROTfHyQKupHe2BbRzZw5UKm2 | "kartik desai" (Auth display name) | 2026-09-09T00:32:30Z |

## Checks

| Check | Result | Command |
| --- | --- | --- |
| Unit | 54 files, 354 passed, 9 skipped (emulator tests skipped without the flag) | `npm run test:unit` |
| Lint | 0 errors, 36 warnings (all pre-existing, none in changed files) | `npm run lint` |
| Types | pass | `npm run test:type` |
| Smoke | pass | `npm run test:smoke` |
| Build | pass, exit 0 | `npm run build` |
| Emulator | 3 passed (`tests/user-profiles.emulator.test.ts`): one profile under 5 concurrent first sign-ins and no rewrite, a filled-in profile left untouched, member merge save under the real rules keeps `created_at`; `tests/privacy.rules.test.ts` still passes | `XDG_CONFIG_HOME=<fresh> firebase emulators:exec --project demo-gayiclub --only firestore,auth "RUN_FIREBASE_RULES_TESTS=1 npx vitest run tests/user-profiles.emulator.test.ts tests/privacy.rules.test.ts"` |
| Encoding | 15 changed files strict UTF-8, no em dashes or mojibake in added lines | iconv and grep scan |

New unit tests: `tests/user-profiles.test.ts` (name and timestamp rules, create-if-absent, no overwrite, concurrency, token hook), `tests/member-name.test.ts` (label, both pages use it, no email fallback), `tests/profile-save.test.ts` (payload has no `created_at`, page merges it), plus new cases in `tests/session.route.test.ts` (profile created after the cookie, sign-in survives a profile failure, no profile on a rejected token) and `tests/directory.route.test.ts` (a sign-up profile lists with a null name and no email).

## Deployment verified

Source commit ca9da20 (clean `git archive HEAD` copy). `firebase deploy --only apphosting --project gayiclub --non-interactive --force` with Application Default Credentials and an isolated CLI config, started 2026-11-08 00:17:13 UTC, rollout for backend gayiclub-web complete at 00:22:12 UTC (`evidence/member-profiles/deploy-adc.log`).

Live verification at 00:23:49 UTC with a temporary Auth account that had no email and no display name (`evidence/member-profiles/live-verification.json`, script retained at /Volumes/Projects/BuildArtifacts/gayiclub-member-profiles-2026-11-07/verify-live.mjs):

- Anonymous `GET /api/directory` returned 401. Signed in, it returned 11 members, none with an email field and no "@" anywhere in the response.
- `POST /api/auth/session` returned 200 and created `user_profiles/{temp uid}` with exactly `created_at, full_name, id`, `full_name` null and `created_at` equal to the account creation time. The directory then returned 12 members including the temporary account with a null name. A second session POST left the document unchanged.
- The served `/community` and `/community/[id]` chunks contain "New member" and no longer contain "Anonymous Member" (`evidence/member-profiles/live-verification-bundle.json`).
- Cleanup removed the temporary profile and account; the directory returned 11 again and production ended at 11 Auth accounts and 11 profiles.

The first run of the script reported the bundle step as failed because an anonymous fetch of `/community` follows the middleware redirect to the sign-in page; the step was corrected to fetch the page shell with a presence-only cookie and the whole verification was rerun. The retained JSON is the passing rerun.

## Follow-ups

- 8 of the 11 members have no name set, so the Members page shows "New member" for most people. Consider asking for a name at sign-up or on first visit.
- `app/community/[id]/page.tsx` still reads `user_profiles` with the client SDK, which the rules deny to non-admins, so a non-admin member sees "Member not found" for others. Switching it to `getMemberProfile` (directory API) would fix that; out of scope here.
