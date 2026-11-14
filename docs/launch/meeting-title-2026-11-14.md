# Meeting title cleanup — November 14, 2026

Robert requested removal of “which dates work?” from the upcoming meeting and its source. The live November 15 event `poll-3201c11497c6dd907b3e8b9a46d7b66e1da17f91` and linked poll `k5J7IsmeXjkr9UWsWvbo` now both have the title “Next Gay-I-Club meeting”. The transaction changed only titles and modification timestamps; the meeting remains November 15 at 6:30 p.m. Eastern with the same identifiers and RSVPs.

The new-poll form defaults to “Next meeting”. Shared poll booking removes the legacy question suffix when deriving a meeting name from a poll. Custom poll titles and explicit organizer meeting names are preserved. Historical sent-email audit records were left intact.

Source commit `d40d6d2` was integrated into main and pushed to GitHub. The regression tests failed on the previous suffix-copying behavior, then passed after the fix. Validation: 358 unit tests passed, 9 emulator-dependent tests skipped; TypeScript and changed-file lint passed.

Deployment used the existing Firebase App Hosting backend `gayiclub-web`, Application Default Credentials, and a clean archive of the source commit. Cloud Build `39cc46ca-9090-44f6-a422-9d2e173529cf` succeeded; the Firebase CLI reported the rollout complete and exited successfully.

Live verification at 2026-11-14 13:38:20 UTC confirmed both corrected titles, zero event or poll titles containing the legacy question, and a successful HTTP 200 response for the new-poll page and its updated bundle `page-37bf8051beb9ceef.js`. That bundle contains the new default and no legacy default.

Private title backups, deployment source/log, and structured verification are retained at `/Volumes/Projects/BuildArtifacts/gayiclub-meeting-title-2026-11-14`. No member emails were sent as part of this change.
