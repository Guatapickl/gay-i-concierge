# Poll invitation recipients

## Requested behavior

The organizer's “Email members to vote” button sends a poll invitation to every registered, enabled member account with a usable email address unless that address has an explicit club-email opt-out. A missing alerts subscription is eligible. This does not change anyone's subscription or marketing preferences.

## Approach

Reuse the Firebase Auth account enumeration and unsubscribe helpers already used by organizer meeting reminders. This keeps membership based on Auth, including newer accounts without a profile document. Normalize and deduplicate email addresses. Exclude the known signup-check fixture and reserved example domains from real delivery.

Alternatives considered: using user_profiles misses members whose profiles have not been created; automatically creating opted-in subscriptions changes consent records unnecessarily. Reusing Auth enumeration with explicit opt-out filtering is the recommended approach.

## Queue and delivery

Change only the invite branch of the poll notification endpoint; leave poll-result email audience unchanged. Keep organizer authorization and open-poll validation. Continue using the existing poll_invite queue, retry transport, and audit trail. At delivery, reject explicit opt-outs rather than requiring an opted-in subscription; this also honors an unsubscribe after queueing.

Keep repeat clicks from resending the same invitation. Include today's one-time admin_poll_invite records when checking for prior invitations so those recipients do not receive another copy. Preserve the existing response shape and show concise explanatory text beside the button about all registered members except opt-outs.

## Verification

Add route tests covering Auth pagination, members without subscription rows, explicit opt-outs, case normalization and duplicate emails, disabled or email-less accounts, the known test account, organizer authorization, closed polls, repeat clicks, today's one-time sends, and unchanged result-email audience. Add queue tests for no subscriber record and opt-out after queueing. Run relevant tests, type checking, lint, and production build. Do not click the live send button or send additional member mail during verification.

## Release

Deploy the reviewed application update to the existing Firebase App Hosting backend after checks pass. Verify rollout status and read-only live behavior. Retain test and build evidence on the Projects volume. No subscription records or account data need migration.
