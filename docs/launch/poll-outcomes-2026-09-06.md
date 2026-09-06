# Poll availability, owner reports, and booking

This release supersedes the manual-booking-only statements in the earlier member automation notes. September retains September 12, 13, 19, and 20, with Robert’s approved deadline of September 11, 2026 at 6 p.m. America/New_York (22:00 UTC). Later automated polls receive a full seven days.

Members explicitly mark dates they cannot attend and rank the remaining dates. A complete ballot is replaced atomically through an authenticated API. An all-unavailable response is valid. Legacy ranked votes remain effective until that member submits a new ballot. Reports distinguish unavailable answers, unanswered choices among respondents, and members who have not responded. Points retain the existing Borda formula (original option count minus rank plus one); unavailable and unanswered dates earn zero.

The cloud pollResultsTick checks every five minutes. Once voting closes, it freezes the results, queues the owner summary, and books one future, positive-score winner if meeting defaults exist. The normal email worker runs every ten minutes; allow about 15 minutes from closing to delivery. Retries use deterministic records and transactions. No member result announcement is automatically broadcast: the existing “Email the result” control remains available.

Any tie in the highest eligible points total waits for Robert; earliest date and first-choice count never break ties automatically. The existing Praxis questionnaire sends the tied dates and returns Robert’s selected option. The authenticated owner action on the poll page provides the same booking path. No responses, all-unavailable answers, elapsed dates, or missing defaults hold booking and are explained in the report. Praxis must remain running for questionnaire delivery and callback relay.

Owner time/location defaults remain pending until Robert supplies them. They are configured in the server-only meeting_automation_config/default document (defaultMeetingTime, defaultMeetingLocation). Poll-specific default_meeting_time/default_meeting_location can override them. New York wall-clock time conversion rejects daylight-saving gaps and overlaps.

Verification and live deployment evidence will be recorded after completion. No synthetic owner reports, member broadcasts, or test calendar meetings are sent/created on production.

## Verification

Application commit `f5779f6`. Production build and Functions build passed; 176 unit tests passed. The two Firestore rules suites passed separately, and three real Firestore emulator concurrency tests passed with observed SDK transaction retries. They cover overlapping closing jobs, a ballot/closing race, and simultaneous tie callbacks/manual booking. TypeScript passed; lint has 0 errors and 41 pre-existing warnings. Independent different-model source, test, and privacy review passed after the privacy inventory was expanded.

The live September document was updated transactionally after a private snapshot. The exact four option IDs were asserted before writing. Closing time is `2026-09-11T22:00:00Z`; `auto_schedule` is true. At migration there were 0 legacy vote rows, 0 complete ballots, 0 events, and 0 queued emails. No votes were reset. Default meeting time and location are still absent and must be supplied before automatic booking can occur.

## Live release

Firebase App Hosting rollout `build-2026-09-06-008` serves the new application. Matching Firestore rules and all four Functions deployed successfully. `firebase-schedule-pollResultsTick-us-east4` is ENABLED every five minutes in America/New_York; a manual scheduler invocation logged HTTP 200 and `{processed:0, booked:0, reportsQueued:0, ties:0, errors:[]}` at 14:51:29 UTC on September 6. This verified the actual scheduler/function/application connection without triggering an early outcome.

Live API evidence is in `evidence/poll-outcomes-live-check.json`: unauthenticated cron/ballot requests reject with 401, an incomplete authenticated ballot rejects with 400, member booking rejects with 403, private decision reads reject with 403, and the member ballot query works against live indexes. The protected job and owner question feed returned 200 with no due work. The four exact September option IDs and September 11 22:00 UTC deadline were verified from current live data.

A temporary member signed in on the live site. All four explicit-unavailable controls and the enabled all-unavailable submit state were verified without saving synthetic votes. The light-theme ballot rendered at 375 CSS-pixel viewport width without horizontal overflow; mobile navigation and sign-out worked. The temporary account was removed; no profile or ballot fixture had been created. Calendar and email queue remained empty. A different-model reviewer independently fetched the live homepage, all legal pages, protected cron rejection and updated privacy text, and visually reviewed the deployed privacy page; that bounded review passed.

Rollback: previous app rollout `build-2026-09-06-007` / source `7870de6`. The older UI writes legacy votes and cannot be paired with the new ballot write lockdown; prefer a forward fix or preserve the new server ballot path during a rollback. Do not restore deleted historical events or reset member ballots. The private pre-deadline-update September snapshot is under `private-backups/2026-09-06/poll-outcomes/`; restoring its missing deadline would cancel the owner-approved report schedule and is not an automatic rollback step.

Remaining required owner input: default meeting start time in New York and location/link. No time or location was guessed. Reports and tie handling are deployed; actual booking holds safely until these defaults are supplied (or Robert explicitly enters them on the booking form).
