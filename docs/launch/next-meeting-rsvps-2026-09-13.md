# Next meeting RSVPs — organizer view, release record (2026-09-13)

Nexus task `da41ae78-fca1-4d3b-958a-79bd4f0e98dc`. Robert asked for a spot on the website to see who has RSVP'd to the next meeting. Evidence: [docs/launch/evidence/next-meeting-rsvps/](evidence/next-meeting-rsvps/).

**Where Robert opens it (signed in with his existing organizer account):**

- Dashboard (`https://gayiclub.com/`) → "Next meetup" panel → **See who's RSVP'd**
- Events (`https://gayiclub.com/events`) → **Next meeting RSVPs** button in the header (next to "New Event")
- Any event page → **See who's RSVP'd** in the action bar (opens that event's list)
- Direct: `https://gayiclub.com/events/rsvps` (next meeting) or `https://gayiclub.com/events/rsvps?event=<event id>`

No role was granted or changed for Robert: his account is the only entry in `app_admins`, and the view keys off that existing roster.

## 1. What was built

| File | Change |
| --- | --- |
| `app/api/events/attendees/route.ts` | New `GET /api/events/attendees[?event_id=…]`, server-enforced: 401 without a valid bearer token, 403 unless `app_admins/{uid}` exists (checked before any RSVP read). Resolves the next meeting as the earliest event with `event_datetime >= now` (the dashboard's "Next meetup" convention), returns up to 12 upcoming events for selection, the attendee list in RSVP order, and `is_next_meeting`. Names: `user_profiles.full_name` → Firebase Auth display name; a sign-in email is included only when no name exists, never beside one. Any failure is an error status, never an empty list. `Cache-Control: private, no-store`. |
| `lib/rsvp.ts` | Additive: `getNextMeetingRsvps()` + `RsvpViewError` (throws with the HTTP status instead of masking failures as `count: 0`, unlike the existing `getEventAttendees`, which is untouched). |
| `components/NextMeetingRsvps.tsx` | New presentational view with distinct states: loading, signed out, organizers only (403), load error with Retry (explicitly "not a zero-RSVP result"), no upcoming meeting, meeting with zero RSVPs, attendee list with headcount, meeting title/date/time/location, event selector when more than one meeting is upcoming, Refresh button with "Updated" time. |
| `app/events/rsvps/page.tsx` | New client page under the existing `/events` protected prefix (Edge middleware redirects guests to sign-in). Handles `?event=<id>`. |
| `components/DashboardView.tsx` | Additive admin-only "See who's RSVP'd" link in the "Next meetup" panel (admin flag read from `app_admins`, same pattern as `/events`). |
| `app/events/page.tsx` | Additive admin-only "Next meeting RSVPs" button beside "New Event". |
| `app/events/[id]/page.tsx` | Additive admin-only "See who's RSVP'd" link in the action bar (via existing `isCurrentUserAdmin`). |
| `tests/attendees.route.test.ts` (new, 6 tests) | 401 before DB access; 403 for non-organizers without reading RSVPs; next-meeting resolution, RSVP ordering, name/display-name/email fallbacks, no profile email leakage beside names; "no upcoming meeting" vs "zero RSVPs"; explicit event selection, non-next flag, 404; lookup failure → 500, never an empty list. |
| `tests/next-meeting-rsvps.test.tsx` (new, 5 tests) | Every UI state renders distinctly; attendee list, headcount, fallbacks; selector rules; email never shown beside a name. |
| `tests/rsvp.lib.test.ts` (+4 tests) | Helper: 401 without a session and no fetch; bearer + `no-store` request shape; 403/500 surfaced as errors; network failure throws where the legacy helper returns zero. |

Not changed: the existing member-facing `GET/POST/DELETE /api/events/rsvp` (RSVP creation/cancellation), Firestore rules, navigation menus, the member directory, any RSVP or event data. The private meeting location stays where it was (event document, members only) and is redacted from all evidence files here.

Follow-up (pre-existing, not in scope): the legacy `GET /api/events/rsvp` attendee list hydrates names from the auto-id `profiles` collection, so it returns `null` names; the event page only uses its count.

## 2. Checks (canonical workspace, uncommitted working tree)

| Check | Baseline (before edits) | Result |
| --- | --- | --- |
| `npm run test:type` | pass | pass |
| `npm run lint` | 0 errors, 37 warnings | 0 errors, 37 warnings (no new warnings) |
| `npm run test:unit` | 210 passed, 5 skipped | 225 passed, 5 skipped (38 files + 3 skipped) |
| `npm run test:smoke` | pass | pass |
| `npm run build` | — | pass; `/events/rsvps` prerendered, `/api/events/attendees` dynamic |
| Strict UTF-8 + mojibake scan of the 10 edited files | — | clean |

## 3. Local signed-in verification (production build, `next start` on port 4190, against the live Firestore/Auth project)

Two temporary Firebase Auth accounts were created with the Admin SDK and deleted after the checks (`praxis.rsvpview.member.20260913@example.com`, uid `p4bn7qt8Trcm7UxU257WsOsLS542`; `praxis.rsvpview.organizer.20260913@example.com`, uid `pN8UFoCTWSTtVbADVNKf7ccJXMw2`). The organizer account was listed in `app_admins` only for the duration of the check (note text on the doc says so) and removed again; the roster before and after is Robert's uid alone (see section 5). Headless Chrome was driven over the DevTools protocol through the real sign-in form (`evidence/next-meeting-rsvps/scripts/verify.mjs`, `qa.mjs`). Neither account RSVP'd through the app; the refresh check wrote and then deleted one synthetic `rsvps` document for the member account with the Admin SDK (no email side effects, since only the RSVP API enqueues mail).

| Observation | Member (non-organizer) | Organizer |
| --- | --- | --- |
| Anonymous `/events/rsvps` | redirected to `/auth/sign-in` | same |
| `GET /api/events/attendees` with no auth / bogus bearer / session cookie only | 401 / 401 / 401 | same |
| Dashboard "See who's RSVP'd" link | absent | present |
| `/events` "Next meeting RSVPs" button | absent (no "New Event" either) | present |
| Event page "See who's RSVP'd" link | absent | present, points at `/events/rsvps?event=<id>` |
| `/events/rsvps` | state `forbidden` ("Organizers only"), API answered 403, no attendee data in the page | state `attendees`: "Next meeting" badge, "Gay I Club Meeting", Sunday, September 13, 2026, 6:30 PM, location, **2 RSVPs**, both real attendees listed (one by profile name, one by sign-in email with the "no name on their profile" note) in RSVP order |
| Refresh reflects changes | — | synthetic RSVP added → Refresh → **3 RSVPs** with the new row; removed → Refresh → **2 RSVPs** (`local-admin-check.json`, `local-admin-rsvps-after-add.png`) |
| `?event=<id>` preselect | forbidden | same meeting, same 2 rows |
| Mobile 390×844 | `scrollWidth` 390 = `clientWidth` 390 | same |
| Screenshots | `local-member-*` (desktop dark/light, mobile dark/light, dashboard) | `local-admin-*` (desktop dark/light, mobile dark/light, dashboard, after-add) |
| Sign-out | 200 | 200 |

Screenshots and JSON have the private meeting address and member emails replaced with `[private location]` / `[member email]` before capture.

Post-review hardening (2026-09-13, reviewer suggestion): `verify.mjs` now fails instead of merely recording. Every wait throws on timeout, and each step asserts the role's expected outcome (anonymous redirect and 401s, sign-in with session cookie, cookie-only 401, admin-only entry links, `forbidden` for members versus `attendees`/`zero-rsvps`/`no-upcoming-meeting` for organizers, rows matching the count badge, refresh add/remove counts, no mobile overflow, sign-out 200, and every observed `/api/events/attendees` status matching the role). A failed run still writes its `*-check.json` with `result: "failed"` and the failing step, and exits 1. Verified against gayiclub.com with a fresh temporary non-organizer account (deleted afterwards): `--expect member` passed (exit 0, statuses 401/401/401/403/403/403), and the same account with `--expect admin` failed at the first mismatched assertion (exit 1, "dashboard: RSVP link false but role admin").

## 4. Production evidence

| Item | Value |
| --- | --- |
| Source | The uncommitted working tree of `/Volumes/Projects/gay-i-concierge` at HEAD `3bd50ab` plus this task's changes (the task forbids committing without explicit authorization, so nothing was committed or pushed). It was copied to `/tmp/rsvp-view/deploy` with `rsync`, excluding `node_modules`, `.next`, `.git`, every gitignored file (`.env`, `service-account.json`, `users.csv`, `users.json`, …) and the other session's staged `components/robots/BENCHMARK_PROMPT.md`, and deployed from there so the CLI wrote nothing into the shared workspace. |
| Deploy command | `firebase deploy --only apphosting --project gayiclub --non-interactive --force` with Robert's Application Default Credentials in an isolated CLI config dir (`deploy.log`, exit 0). Same backend, `firebase.json` and `apphosting.yaml` as every prior release; no IAM, backend or hosting setting changed. |
| Backend | `gayiclub-web`, `us-east4`, project `gayiclub` |
| Before | traffic 100 % on `build-2026-09-09-001` (`production-before-traffic.json`, `production-before-rollouts.json`) |
| Rollout / build | Rollout `build-2026-09-13-001` SUCCEEDED (created 15:21:00Z, finished 15:23:38Z); build `build-2026-09-13-001` READY from uploaded archive `gayiclub-web--25674-do5O5NW5BLb0-.zip` (rootDirectory `/`); Cloud Build `ef420abc-fe99-459c-b15a-efd94736db2a`; image `gayiclub-web:build-2026-09-13-001` (`rollout-2026-09-13-001.json`, `build-2026-09-13-001.json`) |
| After | traffic 100 % on `build-2026-09-13-001` (`production-after-traffic.json`); the rollout list grew by exactly this rollout (`production-after-rollouts.json`, 21 rollouts) |
| Rollback target | `build-2026-09-09-001` (re-point traffic through the App Hosting console or the `traffic` REST endpoint) |
| Anonymous probes | `https://gayiclub.com/events/rsvps` → 307 to `/auth/sign-in`; `GET https://gayiclub.com/api/events/attendees` → 401 `{"error":"unauthorized"}` with `cache-control: no-store` (the route sets `private, no-store`; the hosting layer serves it as `no-store`, still uncacheable) |

### Live verification (signed in, headless Chrome through the real sign-in form)

Same two temporary accounts as section 3, run against `https://gayiclub.com` after the rollout (`live-member-check.json`, `live-admin-check.json`); no RSVP or member data was written during the live checks.

| Observation | Member (non-organizer) | Organizer |
| --- | --- | --- |
| Sign-in | redirected to `/`, `__session` set | same |
| API with no auth / bogus bearer / cookie only | 401 / 401 / 401 | same |
| Entry links (dashboard, `/events`, event page) | none | all three present; event page link `/events/rsvps?event=poll-0b5a…27a6` |
| `/events/rsvps` | `forbidden` state; API answered 403 on every attempt, including `?event_id=` | `attendees` state: "Next meeting" badge, Gay I Club Meeting, Sunday, September 13, 2026, 6:30 PM, location, **2 RSVPs**, both real attendees in RSVP order (Sep 11, 2:00 PM and 2:05 PM) |
| Event page attendee badge (existing member API) | "2 attendees" (unchanged behaviour) | "2 attendees" |
| Mobile 390×844 | no horizontal overflow (390 = 390) | same |
| Screenshots | `live-member-dashboard`, `live-member-rsvps-desktop-{dark,light}`, `live-member-rsvps-mobile-{dark,light}` | `live-admin-dashboard`, `live-admin-rsvps-desktop-{dark,light}`, `live-admin-rsvps-mobile-{dark,light}` |
| Sign-out | 200 | 200 |

The first live organizer run, started concurrently with the member run, crashed after its desktop screenshots (its Chrome profile kept the session, so the retry's anonymous step failed); the profile was deleted and the run repeated alone, which is the recorded one.

## 5. Cleanup evidence

`cleanup.json` (2026-09-13T15:28:56Z): temporary organizer role revoked (`app_admins/pN8UFoCTWSTtVbADVNKf7ccJXMw2` deleted), both QA Auth accounts deleted, `app_admins` again contains only Robert's uid `d3aef0b9-a32b-469d-ab12-b38e493536c6`, the meeting's RSVPs are the same two documents with their original timestamps (2026-09-11T18:00:54Z and 18:05:56Z), and neither QA account left a `user_profiles` document. The synthetic RSVP row from the local refresh check was removed inside that check (section 3). No emails, reminders or invites were sent: the only RSVP write went through the Admin SDK, not the RSVP API, and no `email_reminders` row is created by that path.

## 6. Status

**Implementation finished.** Ten files changed or added in the canonical workspace, all uncommitted (see `git status`); the release record and evidence are also uncommitted. The other session's staged `components/robots/BENCHMARK_PROMPT.md` was not touched.

**Executor self-review passed** (type-check, lint at baseline, 225 unit tests, smoke tests, production build, own-diff re-read, UTF-8 scan). **Independent review: not yet** — that is the Nexus QA step that follows this report.

**Deployed and live verified.** Rollout `build-2026-09-13-001` is serving 100 % of traffic; the organizer view and the 401/403 gates were exercised signed in on `https://gayiclub.com`.

**Caveats.** (1) Production now runs code that exists only in the working tree until Robert's end-of-day commit approval lands it on `main`; a later deploy from a clean checkout of `main` would remove the feature unless this change is committed first. (2) The only upcoming meeting is today at 6:30 PM New York; after it passes, `/events/rsvps` will correctly show "No upcoming meeting" until the next meeting is booked, and a past meeting's list stays reachable from that event's page link. (3) A temporary organizer entry existed in `app_admins` for about 12 minutes during verification and is recorded above; Robert's own access needed no change.
