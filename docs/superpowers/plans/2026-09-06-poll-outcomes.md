# Poll availability, reports, and automatic booking

Robert requests explicit per-date “can't make this date” responses included in reporting; an owner summary after a week; automatic booking of a clear winner; owner tie-breaking. This supersedes the earlier manual-booking-only workflow. Existing owner availability before member polls remains required. Live deployment is already authorized.

Implementation: retain ranked preferences among available dates (Borda points using all original options); unavailable dates receive zero points. A tie in top points goes to Robert, with no automatic first-choice/earliest-date tie-break. No responses or no available future dates means no invented booking. Report counts attendance, explicit unavailability, unrecorded choices, respondents/nonrespondents and ranked points. No paid model is used.

Use complete per-member ballots submitted through an authenticated transactional API; preserve legacy votes when reading and supersede them only when that member submits a new ballot. Direct client writes to legacy votes/new ballots become server-only. Finalization and manual booking use the same deterministic meeting ID and poll transaction so retries cannot create duplicates. Existing ballots must remain intact if a submit fails.

At closes_at (normally opened_at + seven days), a cloud job finalizes the poll, queues a report to the owner and books a unique eligible points winner using configured meeting defaults. Ties stay unbooked and are presented through the existing Praxis owner-question mechanism and an authenticated admin action. No-response/zero-availability/missing-default/past-date cases produce a report and require a decision rather than arbitrary scheduling. September's four options remain; Robert approved its early deadline: September 11, 2026 at 6 p.m. America/New_York (22:00 UTC).

Pending required information: default New York meeting time and location. September early close is approved; future polls receive a full week. Do not infer meeting defaults from elapsed time.

Work ownership:
- UI/tally/types: availability controls, complete ballot client, legacy merge, report counts, tie-aware UI; pure tests.
- Owner reporting/decision formatting: safe summary email and reusable tie questionnaire presentation; test HTML escaping and states.
- Root: ballot API, deadline processing, transactional booking/tie callbacks, cron, rules, live migration/config, integration tests and deployment.

Verification: exact partition validation, failed updates preserve old ballots, all-unavailable ballots count as responses, expired voting rejected, unavailable zero points, genuine ties stay unresolved, repeat jobs/callbacks book and report once, late/past/zero-vote/defaultless cases held, owner-only tie choice, September choices unchanged, live signed-in UI and protected endpoints. No synthetic broadcasts or test bookings on the live calendar.
