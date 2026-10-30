# Registered-member vote invitations — 2026-10-30

Approved by Robert in Codex: implement and deploy the reviewed recipient rule.

The organizer vote-invitation button enumerates enabled Firebase Auth accounts, normalizes and deduplicates their email addresses, excludes reserved example-domain fixtures and explicit club-email opt-outs, and leaves subscription records unchanged. Accounts without subscription records are included. Result-email recipients are unchanged.

Delivery rechecks normalized explicit opt-outs. Queueing recognizes legacy poll markers, today's one-time admin_poll_invite records, and deterministic automated invitation IDs. New organizer invitations use the same deterministic ID and atomic creation as automation, preventing overlapping requests from generating duplicate messages. The invitation footer explains the account relationship and retains unsubscribe links.

Validation: 324 unit tests passed; 6 emulator-dependent tests skipped. Type checking passed. Full lint passed with 36 existing warnings and zero errors. Focused recipient, delivery and meeting-reminder tests passed (26 tests). Production build passed after moving stale Next cache aside; the initial cached build failed in the existing Google font loader. The smoke test had a pre-existing stale RSVP function-name assertion; corrected it to getRsvpStatuses and the smoke check passed. Independent review identified legacy automated invitation compatibility; fixed and re-reviewed with no remaining blockers.

Evidence lives at /Volumes/Projects/BuildArtifacts/gayiclub-poll-member-invites-2026-10-30. No real member emails were sent during implementation or QA. Deployment outcome is recorded separately after rollout verification.

## Deployment verified

Source commit: 6555ef2. Firebase App Hosting rollout build-2026-10-30-001 completed successfully. Cloud Build 3c9a5507-8001-475d-b509-a7ab2ab7bc09 succeeded. The initial CLI attempt used an expired saved login; the deployment succeeded using existing Application Default Credentials with an isolated CLI config on Projects.

At 08:10 Eastern on October 30, gayiclub.com and the current poll page returned HTTP 200. The live poll page loaded /_next/static/chunks/app/vote/%5Bid%5D/page-53aa47fbebc10751.js containing the new registered-member invitation explanation. An unauthenticated notification request returned HTTP 401 without queueing mail. Structured verification is retained at the evidence path above in live-verification.json; successful deployment output is deploy-adc.log.
