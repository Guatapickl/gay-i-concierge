# News discussion votes and voted-article agenda selection (2026-09-13)

Nexus task `ae41bfa2-79d9-49aa-a8ad-1e865571dfe5`. Robert asked for a button on each news story that says "I want to talk about this", counted as a vote to put the story on the agenda, and a way in the agenda maker to add the voted stories so they are shared with everyone.

Work was left uncommitted in the working tree (the brief did not authorize a commit) and deployed from an rsync copy of the working tree, which also carried the sibling session's uncommitted RSVP work that was already dirty in the shared workspace.

## QA repair round (2026-09-13, attempt 1 of 2)

The QA reviewer failed criteria 1, 2, 4 and 6. Each finding was reproduced before the change (the deletion test at `tests/news-discussion.test.ts` passed only because it asserted deletion; a two-line vitest reproduction showed `mergeSavedAgenda` keeping a `from_event` line against an empty destination and `draftItemOnSaved` matching a linked draft by title alone).

| Finding | Fix | Proof |
| --- | --- | --- |
| Withdrawal deleted the vote document | Withdrawing now updates the same document to `active: false` with `withdrawn_at` and a `withdrawal_count`; voting again reactivates it (`revoted_at`, `vote_count`). `tallyVotes` counts active documents only; nothing deletes vote documents. Requests that match the stored state write nothing, so retries and concurrent duplicates stay idempotent. | `tests/news-discussion.test.ts` ("lets the member withdraw", "reactivates the same document", "tallies valid, active documents only"); `emulator-member-votes.json` (member document after vote, withdraw, vote again). |
| Switching to an event with no saved agenda kept the previous event's lines; a plain saved line with the same title swallowed a linked article | `mergeSavedAgenda` drops `from_event` lines on every switch, including to an empty destination, and reports `dropped`; `draftItemOnSaved` matches a line that carries a story by story identity only. `selectEvent` applies the result in every case (the template returns when nothing is left) and explains what stayed with the previous event. | `tests/agenda-articles.test.ts` ("switching from an event with a saved agenda to one without", "keeps a linked article when the saved agenda has a plain line with the same title"); emulator steps `agenda-switch-empty`, `agenda-save-empty`, `event-view-empty-meeting`, `agenda-switch-back`. |
| Save overwrote the stored agenda from the cached draft | `saveEventAgenda` (`lib/events.ts`) runs a Firestore transaction: it reads the event as it is now, keeps lines added since the draft's baseline (`reconcileSavedAgenda`) and writes draft plus those lines in one step; the maker shows "Kept N items another editor added" and appends them to the draft. | `tests/event-agenda-save.test.ts` (the line "Added by another editor after page load" survives), `tests/agenda-articles.test.ts` (reconcile); emulator step `agenda-inject` followed by `agenda-save` and `emulator-event-agenda.json` (`otherEditorLineKept`). |
| A slow GET finishing after a successful PUT erased the vote; the button could toggle an unknown own-vote state | `DiscussionLedger` (`lib/news-discussion-ledger.ts`) stamps loads and saved votes on one clock: a superseded load is ignored and a story whose vote was saved after a load began keeps the PUT result. `NewsCard` disables the vote button while the state is loading or unavailable. | `tests/news-discussion-ledger.test.ts` (delayed GET after PUT, PUT after GET, superseded loads, late withdrawal), `tests/news-card.test.tsx` (`disabled` while loading or unavailable). |
| Release record incomplete | Redeployed after the fixes; see Deployment, Live verification and Cleanup below. | `deploy.log`, `traffic-before.json`, `traffic-after.json`, build JSON, `live-*.json`, `cleanup.json`. |
| Improvement: "Last refreshed" | The voted-articles panel shows `generated_at` as "Last refreshed h:mm AM/PM". | `tests/voted-articles.test.tsx`. |

## Access paths

| Who | Where | What they see |
| --- | --- | --- |
| Signed-in member | `/news` (News Feed) | Each story card has an "I want to talk about this" button with the live total ("3 votes"). Pressed state shows a check mark and "Withdraw your vote" on hover. Clicking again withdraws the vote. |
| Signed-in member | `/agenda` (Agenda Maker) | "Voted articles" panel: title (links to the source), source and date, vote badge, Add button. Members can use it for their own draft or export. |
| Organizer (`app_admins`) | `/agenda` | Same panel plus "Save to event": picking an event loads its saved agenda into the draft, "Add" puts a voted story on it, "Save agenda" writes the list back. Rows show "On this agenda", "Planned for <other meeting>" or "Discussed <date>". |
| Everyone signed in | `/events/<id>` and `/events/<id>/agenda`, reminder email | Agenda lines added from the feed keep their title and show "Read the article ↗ <host>". |
| Signed out | `/news`, `/agenda` | No vote button; the panel says to sign in. `/api/news/discussion` answers 401. |

## What was built

| Layer | Files | Notes |
| --- | --- | --- |
| Data | `firestore.rules`, `docs/database-schema.md`, `types/supabase.ts` | New `news_discussion_votes` collection (one doc per member and story, id = sha256 of `[news_id, user_id]`), closed to the client SDK. `AgendaItem` gains optional `link` and `news_id`. |
| Server | `lib/news-discussion.ts`, `app/api/news/discussion/route.ts` | `GET` lists voted stories (totals, caller's own choice, optional `?ids=` filter and `?agendas=1` placement scan). `PUT {newsId, voted}` creates the caller's vote or flips its `active` flag in a transaction (`tx.create` / `tx.update`; withdrawn documents are kept with `withdrawn_at`), so repeated or concurrent requests cannot inflate a total and no vote history is lost. 401 signed out, 400 bad input, 404 story gone, 413 oversized body, 500 on read failure. Responses never include voter identities and carry `Cache-Control: private, no-store`. |
| Client | `lib/news-discussion-client.ts`, `lib/news-discussion-types.ts`, `lib/news-discussion-ledger.ts`, `lib/agendaArticles.ts`, `lib/events.ts` | Fetch helpers that throw on failure; the ordering ledger for GET/PUT races; pure helpers for canonical article URLs, "already on this agenda" matching by `news_id` or canonical link, idempotent `appendArticles`, `mergeSavedAgenda` and `reconcileSavedAgenda`; `saveEventAgenda` (transactional agenda save). |
| Feed | `components/NewsCard.tsx`, `app/news/page.tsx` | Button with `aria-pressed`, `aria-busy`, live badge, disabled until the member's own state is known. Totals load per feed load; a failed load shows "Vote count unavailable" and a retry banner, never "0 votes". |
| Agenda maker | `components/VotedArticles.tsx`, `app/agenda/page.tsx` | Voted list ordered by votes, then newest, then id, with "Last refreshed". Explicit Add only. Choosing an event loads its saved agenda (time, speaker, notes, link preserved); saving runs as a transaction that keeps lines another editor stored in the meantime. |
| Agenda display | `app/events/[id]/page.tsx`, `app/events/[id]/agenda/page.tsx`, `components/AgendaEditor.tsx`, `app/events/new/page.tsx`, `app/events/[id]/edit/page.tsx`, `lib/emailTemplates.ts` | Links rendered and preserved through the event editors and the reminder email. |
| Tests | `tests/news-discussion.test.ts`, `tests/news-discussion.client.test.ts`, `tests/news-discussion-ledger.test.ts`, `tests/event-agenda-save.test.ts`, `tests/news-card.test.tsx`, `tests/voted-articles.test.tsx`, `tests/agenda-articles.test.ts`, `tests/news-discussion.rules.test.ts` | 47 new unit tests plus an emulator rules test. |

## Lifecycle semantics (general pool)

- A vote is a member's standing interest in a story, kept in the general "next meeting" pool, the same convention as `agenda_suggestions` with `event_id = null`. Votes never expire and are never reset by the app; a member withdraws their own vote by clicking again, which marks only their own document `active: false` (the document and its history stay on record; withdrawn votes are not counted).
- Nothing is placed on an agenda automatically. An organizer adds a voted story to one specific event from the agenda maker; the saved agenda line records `link` and `news_id`.
- The panel scans the 60 most recent events. A story already on the selected event shows "On this agenda" and its Add button is disabled; a story on another upcoming event shows "Planned for <title>"; a story on a past event shows "Discussed <date>" and is hidden by default ("Hide stories already discussed at a past meeting"), so an old vote does not quietly populate every future meeting. Organizers can untick the box to schedule a repeat.
- Article identity survives ingestion refreshes because news documents are keyed by the canonical source URL; agenda lines match by `news_id` first, then by canonical link, never by title.
- Saving an agenda writes the draft list back to the event inside a transaction; lines another editor stored after the draft was loaded are kept and appended, never overwritten. Choosing an event first loads what is saved (an untouched template draft is replaced; an edited draft keeps its own lines after the saved ones; lines loaded from a previously chosen event go back to that event, also when the new event has no agenda yet), and a second save of the same draft produces no duplicates. A draft line that carries a story is matched by that story only, so a plain saved line with the same words never replaces it.

## Checks

| Check | Baseline (before edits) | After | Command |
| --- | --- | --- | --- |
| Unit | 225 passed, 5 skipped | 45 files, 272 passed, 6 skipped (after the repair round; 260 before it) | `npm run test:unit` |
| Lint | 0 errors, 37 warnings | 0 errors, 37 warnings | `npm run lint` |
| Types | pass | pass | `npm run test:type` |
| Smoke | pass | pass | `npm run test:smoke` |
| Build | pass | pass, `/api/news/discussion` listed (re-run after the repair round, exit 0) | `npm run build` |
| Rules (emulator) | n/a | 2 passed | `XDG_CONFIG_HOME=/tmp/news-discussion/fbconfig firebase emulators:exec --project demo-gayiclub --only firestore,auth "RUN_FIREBASE_RULES_TESTS=1 npx vitest run tests/news-discussion.rules.test.ts tests/meeting.rules.test.ts"` |
| Encoding | n/a | 27 edited files strict UTF-8, no mojibake, no new em dashes; re-scanned after the repair round (18 files, 0 new em dashes in the diff against `fdb5462`) | python scan (see task log) |

## Emulator end-to-end (full flow including save and reopen)

The only real upcoming meeting passed during the task and the brief forbids live agenda mutations, so the save/reopen path ran against the Firestore and Auth emulators with seeded fixtures (`scripts/qa.mjs seedEmulator`): stories `qa-story-a`, `qa-story-b`, event `qa-next-meeting` (two saved lines, one with a time and one with notes), `qa-empty-meeting` (upcoming, no agenda) and `qa-past-meeting` (agenda already carrying story B's link). The run was repeated in full after the repair round (evidence files below are from the repeated run, 2026-09-13 23:19 to 23:23 UTC). A production build with `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1` served `http://localhost:4191`; `scripts/verify.mjs` drove headless Chrome through the real sign-in form; `scripts/probe.mjs` ran the Node-side checks.

| Evidence | Result |
| --- | --- |
| `emulator-member-check.json` | Anonymous feed has no vote button, anonymous API 401 (GET, PUT, bogus token), anonymous panel "signed-out". Member votes (0 to 1 vote, `aria-pressed=true`, "Counted..."), persists across reload, withdraws (back to 0, "Vote withdrawn."), withdrawal persists, votes again. Panel lists the story with "1 vote", Add puts it on the draft once ("On this agenda", Added disabled), second Add impossible. Story B hidden as discussed (1 hidden) and shown with "Discussed Aug 1, 2026" when unticked. No save card for a member. Mobile 390 px: no horizontal overflow. |
| `emulator-probe.json` | 8 concurrent identical votes: all 200, every response `count: 1`, listed total 1. 4 concurrent withdrawals: all 200, count 0 (the document is retained as inactive, see `emulator-member-votes.json`). Unknown story 404, malformed 400, oversized 413, bad ids 400. Response never contains the uid or email. Client SDK read, list and forged write of `news_discussion_votes` all `permission-denied` for the voter. |
| `emulator-admin-check.json` | Organizer votes (total 2). Choosing `qa-next-meeting` replaces the untouched template with the 2 saved lines ("Loaded 2 saved items..."); Add appends the story (3 lines, source link shown). Step `agenda-inject`: while the draft is open, `qa.mjs appendAgendaLine` stores "Added by another editor after page load" on the event (3 stored lines). Save answers "Saved to event. Kept 1 item another editor added since you loaded this agenda." and the draft shows all 4 lines; `/events/qa-next-meeting` and `/events/qa-next-meeting/agenda` show the 4 lines with exactly one "Read the article" link; reopening the maker loads 4 saved lines with the story marked "On this agenda"; a second save leaves exactly one link and every line. Steps `agenda-switch-*`: with the 4 loaded lines plus story B added by the organizer, choosing `qa-empty-meeting` leaves only story B (with its link) and says "has no saved agenda yet. Kept your 1 draft item; 4 items loaded from the previous event stay with that event."; saving writes only story B to that meeting (`event-view-empty-meeting`); choosing the first meeting again loads its 4 lines without story B. One `/agenda` load needed a reload (Firestore client stream stall in headless Chrome, recorded as a `retry` step with the matching console error). |
| `emulator-event-agenda.json` | Stored agenda of `qa-next-meeting` after two saves: Welcome & introductions (notes kept), Existing feature talk (7:15 PM and speaker kept), QA story A (link and news_id), Added by another editor after page load (speaker and notes kept), no duplicates (`otherEditorLineKept: true`). Stored agenda of `qa-empty-meeting`: exactly story B with its link and news_id (`secondMeetingHoldsOnlyTheChosenStory: true`). |
| `emulator-member-votes.json` | The member's vote documents after the run: story A `active: true` with `withdrawals: 3` (vote, withdraw, vote again in the browser, then the probe's reset and concurrent withdrawals), story B active with 0; both ids match the hash. Withdrawn votes stay on record and are not counted (the browser and probe totals above went back to 0 on withdrawal). |
| Screenshots | `emulator-{member,admin}-{news,agenda}-{desktop,mobile}-{dark,light}.png`, `emulator-admin-event-{detail,agenda}-desktop-*.png`, `emulator-admin-agenda-switch-empty.png` |

## Deployment

The first deploy attempt of the day never ran (its background task was lost; `deploy.log` was empty and production stayed on `build-2026-09-13-001`), so the release below is the first and only rollout of this feature.

| Item | Value |
| --- | --- |
| Source | `/tmp/news-discussion/deploy`, an rsync of the working tree at 2026-09-13 23:23 UTC (excluding `node_modules`, `.next`, `.git`, `.env*`, `service-account.json`, `users.csv`, `users.json`, `components/robots/BENCHMARK_PROMPT.md`). No commit was made; the brief did not authorize one. |
| Command | `/tmp/news-discussion/deploy.sh`: `firebase deploy --only firestore:rules --project gayiclub --non-interactive --force`, then `firebase deploy --only apphosting --project gayiclub --non-interactive --force`, with `XDG_CONFIG_HOME=/tmp/news-discussion/fbdeploy` and Application Default Credentials. |
| Rules | Compiled and released (`released rules firestore.rules to cloud.firestore`; the live version already matched, so the `news_discussion_votes` lock was in place from the earlier rules release). Exit 0. |
| App Hosting | Backend `gayiclub-web`, source uploaded to `gs://firebaseapphosting-sources-692568338842-us-east4/gayiclub-web--84113-5R7Dqqdam0ri-.zip`, rollout complete, exit 0 (`deploy.log`). |
| Build | `build-2026-09-13-002`, state `READY`, created 2026-09-13T23:23:26Z, ready 23:26:28Z (`build-2026-09-13-002.json`). |
| Traffic | Before: `build-2026-09-13-001` at 100% (`traffic-before.json`, captured 23:20 UTC). After: `build-2026-09-13-002` at 100% (`traffic-after.json`). Rollback target: `build-2026-09-13-001`. |
| Deployed URL | https://gayiclub.com (feed at `/news`, agenda maker at `/agenda`, API at `/api/news/discussion`). Unauthenticated `GET` and `PUT` on the API answer 401 after the rollout; `/news` answers 200. |

## Live verification (gayiclub.com)

`/tmp/news-discussion/live-run.sh` at 2026-09-13 23:27 to 23:28 UTC against the live site with two temporary accounts (`praxis.newsvotes.member.<stamp>@example.com`, `praxis.newsvotes.organizer.<stamp>@example.com`, the organizer granted `app_admins` for the run only). The story under test was the newest feed item. The live vote total was 0 before the run. No real member, agenda or meeting was touched; there was no upcoming meeting, so the save-to-event path is covered by the emulator run above.

| Evidence | Result |
| --- | --- |
| `live-member-check.json` | Anonymous feed (60 cards) shows no vote button; anonymous API 401 for GET, PUT and a bogus token; anonymous panel "signed-out". Signed in through the real form (`__session` cookie). Vote: 0 to "1 vote", `aria-pressed=true`, "Counted. Organizers can add this story to the next agenda."; persists across reload; withdraw: back to "0 votes", "Vote withdrawn."; persists across reload; vote again registers. Panel lists the story with "1 vote" and its source link; Add puts it on the draft once ("On this agenda", Added disabled), a second Add is impossible; no save card for a member. Mobile 390 px: no horizontal overflow on `/news` or `/agenda`. Every `/api/news/discussion` response was 200 after sign-in or 401 before it, all with `Cache-Control: no-store`. |
| `live-probe.json` | 8 concurrent identical votes: all 200, every `count: 1`, listed total 1. 4 concurrent withdrawals: all 200, count 0. Unknown story 404, malformed body 400, oversized body 413, bad ids 400. The response never contains the uid or email. Client SDK read, list and forged write of `news_discussion_votes` are `permission-denied` for the voter. |
| `live-admin-check.json` | Organizer sees the member's vote ("1 vote"), votes (total "2 votes"), reload keeps it, withdraws (back to "1 vote"), votes again. Panel row shows "2 votes"; Add works once. No upcoming meeting exists, so no event selector and no save card (asserted). No page needed a reload. |
| `cleanup.json` | Both temporary vote documents were found by the exact deterministic id, still present after the withdrawals (`active: true`, member `withdrawals: 3`, organizer `withdrawals: 1`: retained history on the live collection), then removed as test artifacts. Organizer grant revoked; both users deleted; `app_admins` back to the single real admin; vote total back to 0; no `user_profiles` documents were created for the temporary accounts. `clean: true`. |
| Screenshots | `live-{member,admin}-{news,agenda}-{desktop,mobile}-{dark,light}.png` (emails redacted in the DOM before capture). |

## Cleanup

- Temporary accounts, their vote documents and the temporary organizer grant were removed by `live-run.sh` immediately after the checks (`cleanup.json`, `clean: true`, 2026-09-13T23:28:46Z).
- The emulator ran with a fresh in-memory state each time; nothing persisted.
- The working tree keeps the feature uncommitted for QA; no commit, stash, checkout or reset was run. The sibling RSVP work and `components/robots/BENCHMARK_PROMPT.md` remain dirty as found at dispatch.
- Nothing was written to the live `events` collection; the only live writes were the temporary accounts' votes and the temporary `app_admins` document, all removed.

## Caveats

- Deployed from the working tree, not from a commit; the QA diff is `git diff fdb546274e11` plus the untracked files listed in the task report.
- The sibling RSVP work that was already uncommitted in the workspace went out in the same App Hosting build, as it did for the RSVP release; `components/robots/BENCHMARK_PROMPT.md` was excluded from the staged copy.
- Vote counts are read through the API only, so the news page makes one extra request per 100 stories on screen.
