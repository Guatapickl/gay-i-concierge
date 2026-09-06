# Gay I Club relaunch — September 2026

The existing site runs on **Firebase App Hosting (gayiclub-web, us-east4)** with Firebase Authentication and Cloud Firestore. Its custom domains and certificates are already active. Do not restore Supabase, configure Netlify, or repeat the September 4 migration.

- Owner actions: [Robert’s checklist](docs/launch/robert-checklist-2026-09-06.md).
- Readiness and evidence: [September 6 readiness report](docs/launch/readiness-2026-09-06.md).
- Release and rollback: [cutover runbook](docs/launch/cutover-2026-09-06.md).
- Approved visual references: `Gayiclub.com redesign review/` (all 14 files).

The redesign branch is prepared separately from the live site. A successful local build does not mean it has been released. Follow the readiness report for the current release decision.

## Member smoke flow

1. Verify email/password sign-in, Google sign-in, email-link sign-in and sign-out with the intended host.
2. Test password reset with a controlled real inbox and the correct Firebase action link.
3. Confirm member profile updates; ensure other members cannot retrieve private email/phone or consent records.
4. As an organizer, create a clearly labeled test date poll, rank dates with a separate test member, and verify the tally. Confirm actual first-meeting dates before publishing a real poll.
5. Test event RSVP and calendar export; verify the reminder queue and receipt only with authorized test inboxes.
6. Suggest an agenda topic, vote, and import suggestions into the agenda.
7. Confirm email update opt-in and opt-out end to end. SMS is not offered in this release.
8. Confirm feedback submission arrives in the intended project and reviewed support requests receive the expected handling.

Local emulator fixtures must remain isolated from the real Firebase project. No member announcements should be used as a smoke test.

Historical Netlify/Supabase instructions are retained at `docs/launch/archive/RELAUNCH.pre-redesign.md` solely as history.
