# Poll invitation recipients implementation plan

**Goal:** Implement the approved registered-member invitation audience and deploy it.

**Architecture:** Reuse Firebase Auth enumeration and explicit opt-out filtering. Keep poll-result audience unchanged. Use the existing email queue and recheck opt-outs before delivery. Recognize legacy poll markers and the one-time administrative sends for duplicate protection.

1. Add failing route tests using FakeAdminAuth pagination and FakeAdminDb: registration without subscription, opt-outs, normalization, duplicates, unreachable/test accounts, authorization, poll status, repeated sends, prior administrative invitations, and unchanged result audience. Add delivery and template regression tests.
2. Update invite recipient selection, duplicate lookup, delivery opt-out checks, account-related email footer, and organizer explanation. Do not mutate subscription preferences.
3. Run focused tests, full unit suite, type checking, lint, production build, and inspect the final diff. Retain evidence on Projects.
4. Commit the scoped change, integrate into the main checkout, deploy App Hosting, and verify rollout plus read-only live checks. Do not send real member emails in QA.
