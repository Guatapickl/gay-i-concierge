# Member experience and automations — September 6, 2026

The homepage emphasizes sign-in, AIlex discloses its actual OpenAI GPT-4o model, and shared textareas follow the active light/dark theme. Meeting dates are owner-approved before polling members. News is collected on a cloud schedule with admin removal and member sharing/saving.

## Calendar and owner workflow

A fresh live inventory contained 18 old calendar events, 4 related RSVPs, and no poll/option/vote records. Exact events and related records were privately backed up and removed. Robert confirmed September 12, 13, 19, and 20; `meeting_polls/september-2026` and four date-only options restore that intended poll. No test member email was sent. Automatic recurring-series creation was removed; existing display/deletion support remains for legacy data.

`meeting_automation_config/default` enables checks only for meetings after activation. Firebase `meetingPollTick` invokes the secret-protected `/api/cron/meeting-polls` at 9 a.m. America/New_York. Passed meetings generate one deterministic `month-YYYY-MM` owner request for the following month’s future weekend days. No historic-event backfill or automatic booking occurs.

Praxis polls `GET /api/automation/owner-questions` using the project secret. Its existing hosted questionnaire asks one required Available/Unavailable choice per weekend day. The reusable integration uses a durable SQLite ledger and callback outbox. SMTP ambiguity requires attention instead of blind resending. Structured answers are stored before relay acknowledgment; generic agent dispatch does not process them.

`POST /api/automation/owner-questions/:id/events` validates the deterministic Praxis query ID, exact required answers, expiry, future dates, and callback binding. Poll/options and callback receipt commit atomically. Answer callbacks can precede sent callbacks after ambiguous SMTP delivery. No availability yields `needs_availability`, never an invented date. Member invites are queued idempotently for opted-in subscribers excluding the owner; all members can vote in-app. Queue retries skip expired/closed polls. Seven-day voting is shortened if necessary to finish before the earliest date. Admins explicitly choose the New York meeting time when booking; DST gaps/overlaps are rejected.

Owner request/config documents and callback ledgers are denied to browser clients. The per-project secret is configured in Praxis; shared mailbox/relay credentials are not copied into the club app. Praxis’s existing LaunchAgent must remain running for questionnaire delivery and return of answers.

## News

Firebase `newsTick` invokes `/api/cron/news` at 8 a.m. America/New_York. Fixed RSS publishers: OpenAI, Google AI, MIT News. Feed fetches, sizes and item counts are bounded. HTML is stripped from descriptions; linked pages are not fetched. Failed publishers do not erase existing news. Deterministic canonical URLs and transactions prevent duplicates; `news_tombstones` prevent removed sources returning. Existing Cortex ingestion remains authenticated with its own secret.

Admins can collect or remove; members can save and native-share/copy source links. Saved articles load separately from the newest 60, preserving access to older bookmarks. The live news inventory was empty before this change, so historical raw-URL migration was unnecessary.

## Cross-project reuse

Praxis documentation: `/Volumes/Projects/Praxis/docs/automation-owner-questions.md`. Add an explicit entry to `PRAXIS_AUTOMATION_PROJECTS_JSON` with project ID, HTTPS base URL, unique secret environment name, and owner recipient. Each project implements the two owner-question endpoints and its business rules; Praxis supplies questionnaire delivery, persistence and answer handoff. Do not reuse the global feedback relay secret. Adding another project to this configuration replaces the defaults, so retain GayIClub’s entry.

## Verification and operations

See test output and deployment result in the final task record. Cloud jobs use the existing project, region us-east4 and CRON_SECRET; the existing 10-minute reminders job remains. `functions/.env.gayiclub` must provide `SITE_URL=https://gayiclub.com` for noninteractive deploys. No DNS changes were required. The current Functions runtime is Node 20; upgrade before its October 30, 2026 deployment cutoff as a separate maintenance change.

Owner checklist: [Robert’s checklist](robert-checklist-2026-09-06.md). Never roll back deleted events as part of a code rollback without separately reviewing the private backup and current poll decisions.

## Verified live

The first release of these features used app commit `e65cc22`, Firebase rollout `build-2026-09-06-004`. Live checks confirmed September’s exact four date-only options, empty calendar, required booking time, readable light inputs, and the actual GPT-4o label. The news query required an undeployed existing composite index; indexes were deployed and the finished query returns HTTP 200 with 45 linked stories. A temporary account successfully saved and filtered a story.

Both Cloud Scheduler jobs were invoked through the scheduler: news updated 45 existing stories without duplicates; meeting checks created 0 requests with the empty calendar. All three publisher fetches succeeded. Unauthenticated automation endpoints return 401; authenticated endpoints return 200; browser access to owner configuration returns 403. Praxis restarted idle and healthy with its project secret, its feedback poller running every 120 seconds, and its durable automation ledger created.

Validation: 105 unit tests passed plus 2 separate Firestore emulator integration checks; production build passed; lint 0 errors / 45 existing warnings. Praxis’s 55 focused tests and TypeScript passed. Queue delivery uses transactional claims, checks poll opt-out again before sending, and has a 15-second Resend timeout with stable 24-hour idempotency keys. A worker crash after claiming still needs manual reconciliation of a `sending` record before requeueing.

Final mobile review found the account controls missing from the drawer. The existing AuthNav is now included: app commit `cb868a6`, live rollout `build-2026-09-06-005` at 100% traffic. Live sign-out succeeded, the guest homepage shows primary Sign in and a smaller Sign up, and the temporary review account/bookmark were removed. No member poll invitations or test meetings were sent/created.
