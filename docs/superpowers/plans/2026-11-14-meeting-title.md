# Meeting title implementation plan

**Goal:** Remove the date question from the live meeting and prevent it returning through poll creation and booking.

**Architecture:** Update the event and linked poll together. Clean the legacy suffix only when deriving a meeting title from a poll; retain explicit meeting titles.

**Tech stack:** Next.js, TypeScript, Firestore, Vitest, Firebase App Hosting.

- [x] Inspect the live event and linked poll; back up their original title fields outside the repository.
- [x] Update both live titles transactionally and verify other event/poll fields are unchanged.
- [x] Extend `tests/poll-outcomes.test.ts` to book a poll titled `Next Gay-I-Club meeting: which dates work?` and expect `Next Gay-I-Club meeting`; verify custom poll titles and explicit meeting titles survive. Run the focused test and observe the legacy-title failure.
- [x] In `app/vote/new/page.tsx`, change the title default to `Next meeting`. In `lib/poll-outcomes.ts`, use `ctx.poll.title.replace(/\s*:\s*which dates work\?\s*$/i, '')` as the fallback when no explicit title is supplied.
- [x] Run focused booking tests, the unit suite, TypeScript checking, and lint for changed source files. Review the diff. Result: 358 unit tests passed, 9 emulator tests skipped; TypeScript and changed-file lint passed.
- [x] Commit, integrate the isolated change, and deploy the tracked source with `firebase deploy --only apphosting --project gayiclub --non-interactive --force` using existing Application Default Credentials. Source commit: `d40d6d2`, pushed to main; deployment completed successfully.
- [x] Verify the deployed poll-creation bundle and reread both live titles. Verified at 2026-11-14 13:38:20 UTC: both titles are corrected, no event or poll title contains the legacy question, and the live new-poll bundle contains the new default without the old default.
