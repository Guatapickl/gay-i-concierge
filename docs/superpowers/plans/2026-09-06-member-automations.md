# Member experience and recurring workflows

Goal: implement Robert's requested sign-in-first homepage, transparent AIlex model label, legible light-theme inputs, availability-first monthly meeting polls, and scheduled news with owner moderation and member sharing; deploy to the existing live Firebase site for review.

Approved behavior from Robert: primary sign-in with small sign-up link; label actual AIlex model; remove current calendar events/recurring schedules while preserving September poll dates (September12,13,19,20; no last-weekend options); after each meeting ask Robert which following-month weekend days work, then poll members only on selected dates; use Praxis's existing questionnaire experience as a reusable cross-project workflow. News should ingest on a cron with owner deletion and member sharing.

Defaults pending optional timing answer: owner request9AM New York the day after meeting; member poll closes after7days; news daily8AM. Never infer availability from silence. No automatic meeting booking; admin confirms the winning date. No backfill-trigger on events being removed. Preserve existing poll/vote documents; audit live inventory before any mutation. Make archive backup of exact event/reminder IDs before removal. Membership polling includes all members in-app; delivery must respect email opt-outs.

Architecture: retain Firebase app/Firestore for club data and cloud cron, use existing Praxis hosted questionnaire and human-query persistence for owner approval, with deterministic workflow IDs and authenticated handoff of selected dates. Implement reusable request/answer orchestration without copying shared mailbox credentials into the club browser. Keep delivery idempotent and reruns safe. News uses deduplication plus deletion tombstones so removed URLs do not reappear.

Tasks:
- [x] Audit live calendar/polls/queues and current cron/Praxis question APIs.
- [x] Frontend: primary sign-in, smaller sign-up, real model label, semantic theme inputs; browser verification.
- [x] News: daily ingestion endpoint; trusted sources; owner remove and member share/save; tombstone semantics; tests.
- [x] Meetings: one-off events only; remove old event/series records and pending linked reminders, preserve September polls.
- [x] Reusable owner-question → selected-date poll workflow; robust timezone/date generation, empty/malformed/no-answer states, deduplication, notifications and scheduler; tests.
- [x] Integrate/review, run production build and appropriate tests; deploy app/functions/rules as needed.
- [x] Verify live controls, scheduled jobs and dry-run cycle without broadcasting synthetic polls; update documentation and owner checklist.
