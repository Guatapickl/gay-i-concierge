# Poll availability, owner reports, and booking

This release supersedes the manual-booking-only statements in the earlier member automation notes. September retains September 12, 13, 19, and 20, with Robert’s approved deadline of September 11, 2026 at 6 p.m. America/New_York (22:00 UTC). Later automated polls receive a full seven days.

Members explicitly mark dates they cannot attend and rank the remaining dates. A complete ballot is replaced atomically through an authenticated API. An all-unavailable response is valid. Legacy ranked votes remain effective until that member submits a new ballot. Reports distinguish unavailable answers, unanswered choices among respondents, and members who have not responded. Points retain the existing Borda formula (original option count minus rank plus one); unavailable and unanswered dates earn zero.

The cloud pollResultsTick checks every five minutes. Once voting closes, it freezes the results, queues the owner summary, and books one future, positive-score winner if meeting defaults exist. The normal email worker runs every ten minutes; allow about 15 minutes from closing to delivery. Retries use deterministic records and transactions. No member result announcement is automatically broadcast: the existing “Email the result” control remains available.

Any tie in the highest eligible points total waits for Robert; earliest date and first-choice count never break ties automatically. The existing Praxis questionnaire sends the tied dates and returns Robert’s selected option. The authenticated owner action on the poll page provides the same booking path. No responses, all-unavailable answers, elapsed dates, or missing defaults hold booking and are explained in the report. Praxis must remain running for questionnaire delivery and callback relay.

Owner time/location defaults remain pending until Robert supplies them. They are configured in the server-only meeting_automation_config/default document (defaultMeetingTime, defaultMeetingLocation). Poll-specific default_meeting_time/default_meeting_location can override them. New York wall-clock time conversion rejects daylight-saving gaps and overlaps.

Verification and live deployment evidence will be recorded after completion. No synthetic owner reports, member broadcasts, or test calendar meetings are sent/created on production.
