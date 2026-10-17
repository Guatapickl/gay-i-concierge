# Pending agenda save repair

Task: `ae41bfa2-79d9-49aa-a8ad-1e865571dfe5`, bounded QA repair, 2026-09-13.

## Result and scope

Both reported races were reproduced before editing the source. A `node` heredoc transpiled the actual `app/agenda/page.tsx` in memory with TypeScript, mocked persistent hooks, and deferred `saveEventAgenda`. It printed:

```text
After A finishes, B draft: [ 'B original', 'A-only concurrent article' ]
B baseline: [ 'A original', 'A-only concurrent article' ]
Next B save: [ 'B original', 'A-only concurrent article' ]
Copies of article x: 2
Next reconciliation copies: 2
```

`app/agenda/page.tsx:93` now tracks a draft session and a synchronous pending-save flag. Event selection and replacement drafts advance the session. The save captures its event and session before awaiting the transaction. Successful saves update only the captured event's cache; obsolete completions do not change the open draft, baseline, or status (`app/agenda/page.tsx:317`). Preserved lines are compared with the latest draft using the existing `sameSavedLine` article identity helper before inclusion (`app/agenda/page.tsx:349`), retaining intervening title edits and source links without duplicates. Event selection remains usable during saving; stale results are guarded. Overlapping saves are rejected before a rerender can occur.

Files changed by this run:

- `app/agenda/page.tsx` was already dirty at preflight. Only the pending-save handling, imports, and session invalidation points were edited additively.
- `tests/agenda-page-save.test.ts` is new. Its seven tests call the real page controls with mocked hooks and a deferred database boundary. They cover A-to-B completion, B's next save and baseline, reopening A, article identity via ID and canonical URL, intervening title edits, A-to-B-to-A switching, template replacement, stale failure status, and overlapping saves.
- This new repair record.

`pwd` and `git rev-parse --show-toplevel` both returned `/Volumes/Projects/gay-i-concierge`; the existing page and supporting feature files were present there before editing. `git status --short` confirmed the shared changes listed in the brief. No other repository was modified. No commit, push, staging, revert, stash, live member vote, live agenda mutation, or Nexus status change was performed.

Access remains `/news` for voting, `/agenda` for choosing voted articles and saving as an organizer, and `/events/<id>` or `/events/<id>/agenda` for member-facing agendas.

## Verification

| Command or observation | Result in this run |
| --- | --- |
| `npx vitest run tests/agenda-page-save.test.ts` before source repair | Seven tests failed with the expected state contamination, duplicate, stale status, and overlapping-save assertions. |
| Same command after source repair | Seven tests passed. The B save contains only B's draft and baseline; the next reconciliation contains one article with its locally edited title and link. |
| `npx vitest run tests/agenda-page-save.test.ts tests/news-discussion.test.ts tests/news-discussion.client.test.ts tests/news-discussion-ledger.test.ts tests/event-agenda-save.test.ts tests/news-card.test.tsx tests/voted-articles.test.tsx tests/agenda-articles.test.ts tests/news-discussion.rules.test.ts` | Eight test files passed, 54 tests passed, one emulator-only rule test skipped. The deliberate read-failure test logs its expected error. |
| `npm run test:unit` | 46 files passed, four skipped; 279 tests passed, six emulator-only tests skipped. |
| `npx tsc --noEmit --incremental false` | Exit 0. |
| `npm run lint` | Zero errors, 37 existing warnings; none in the new test or repaired page. |
| `npm run test:smoke` | `Smoke tests passed (0 failure(s)).` |
| `npm run build` | Exit 0; `Compiled successfully in 2.1s`; route generation completed. |
| Python strict UTF-8 decoding and mojibake scan of all three edited text files | Passed. |
| `git diff -- app/agenda/page.tsx` and `git diff --no-index -- /dev/null tests/agenda-page-save.test.ts`, followed by rereading this report | Code review clean: captured event/session, cache ownership, baseline updates, current-draft identity matching, pending/error reset, imports, test assertions, and absence of debug code checked. The HEAD diff includes prior shared changes and is not claimed as this run's ownership. |

## Acceptance criteria and settled evidence

1. Retained QA PASS, corroborated by the focused command above: 21 discussion API tests, three card tests, and four client tests exercise exact action text, own-vote state, counts, retained withdrawal/re-voting, authorization and idempotent concurrency. No vote code changed.
2. Repaired. The seven new page callback tests prove intended-event completion and duplicate-safe subsequent saves. Existing voted-article rendering, agenda helper and transaction tests also passed, including preservation of another editor's additions.
3. Retained QA PASS. Read `docs/launch/evidence/news-discussion-votes/emulator-event-agenda.json`: saved story title, source link and `news_id` survive two saves, alongside existing speaker, time and notes. Its `savedDetailsPreservedAndNoDuplicates` and `otherEditorLineKept` are true. New page tests additionally prove title/link retention during pending-save reconciliation. Presentation code was not changed.
4. Repaired. New tests verify pending-save exclusion, current-event status isolation and recovery from stale failures. Existing API, card, ledger and panel tests passed for authorization and pending/error/empty states. Read `firestore.rules:15` and `firestore.rules:114` for existing admin checks and closed client vote storage. General-pool semantics remain documented in `docs/launch/news-discussion-votes-2026-09-13.md:42`; export, suggestions and sharing behavior were not rewritten.
5. Retained QA PASS with fresh unit/type/lint/smoke/build checks above. Inspected the existing `emulator-admin-agenda-desktop-light.png` and `emulator-admin-agenda-mobile-light.png` under `docs/launch/evidence/news-discussion-votes/`: responsive agenda controls, voted title/link/count and save controls remain recorded. These are historical captures, not new screenshots; this repair makes no markup or styling changes. Emulator-only permission coverage remains the reviewer's settled PASS and was not rerun without the emulators.
6. Retained QA PASS. Read the existing `deploy.log` (App Hosting rollout complete, exit 0), `traffic-after.json` (`build-2026-09-13-002` at 100%), and `live-member-check.json` (live authenticated vote/withdrawal/persistence checks) under the same evidence directory. The prior deployed URL is https://gayiclub.com. This bounded repair has not been deployed and is not claimed live. It remains in the working tree for the normal independent Nexus QA/completion handler; the earlier deployment and release verification remain settled by the repair brief.

## Binding constraints carried forward verbatim

#### BC-WORKSPACE — Do the work inside /Volumes/Projects/gay-i-concierge — QA's primary diff comes from there; any additional repo you touch must be named in your completion report.
- **Prerequisite (resolve first):** The assigned workspace must be the repo that holds the main body of the code this task changes. Check that before your first edit, not after.
- **Authority (who may waive it):** Praxis, via the task re-point endpoint — POST /api/tasks/ae41bfa2-79d9-49aa-a8ad-1e865571dfe5/workspace with the new path and a reason. Robert, if the re-point is refused.
- **Fallback (do this instead):** If the WHOLE task belongs elsewhere, re-point the task first and then do ALL the work in the new directory; if you only realise at the end, still call the endpoint with "baseline":"head". If the task merely also needs another repo, work there and declare it in your report. If neither is possible, report needs_input.
- **Consequence (if you proceed anyway):** QA builds the authoritative diff from this workspace and the dispatch-time snapshot, plus the diff of every additional repo the run touched and declared. Work done in an undeclared repo that Praxis could not record is invisible to review, and a round with no work in any visible repo fails as an empty diff no matter how correct the change is.

#### BC-CRITERIA — Satisfy every acceptance criterion above and cite the command or observation that proves each one.
- **Prerequisite (resolve first):** Each criterion has to be verified against real behavior before you report complete — a criterion you did not run is a criterion you did not meet.
- **Authority (who may waive it):** The QA reviewer, and only through a ruling: contest a defective criterion with "PRAXIS_CRITERION_DISPUTE: <number> — <why, with evidence>". Twice contested without resolution goes to Robert.
- **Fallback (do this instead):** If a criterion cannot be met as written, say so explicitly with evidence and deliver everything else in full. Narrowing the scope quietly is not the fallback.
- **Consequence (if you proceed anyway):** QA scores each criterion mechanically against your diff. An unproven criterion is a fail verdict and a correction round, not a note.

#### BC-REPAIR — Resolve every reviewer finding listed for this repair round (attempt 1 of 2).
- **Prerequisite (resolve first):** Reproduce the reviewer's failing check yourself before changing anything. A finding you cannot reproduce is one to report, not one to guess at.
- **Authority (who may waive it):** The QA reviewer, via a ruling on a contested finding ("PRAXIS_CRITERION_DISPUTE: <number> — <why, with evidence>"). Robert, once a finding has been contested twice without resolution.
- **Fallback (do this instead):** Fix only the listed findings and preserve every criterion not amended by one; if a finding is defective, contest it with evidence instead of complying blindly or ignoring it.
- **Consequence (if you proceed anyway):** Attempts are bounded at 2. Exhausting them stops the task and escalates it to Robert, and a finding that recurs across rounds is read as an unfixed root cause, not a fresh note.

#### BC-FOREIGN-WORK — The workspace is SHARED and may hold unrelated uncommitted work from other agents or Robert's own sessions. Never revert, stash, `git checkout`/`git restore`, or delete anything you did not change in this run.
- **Prerequisite (resolve first):** Know what was already dirty before you touch the tree: the brief's workspace pre-flight lists it, and `git status` shows the rest. Anything on that list is somebody else's in-flight work.
- **Authority (who may waive it):** Robert alone. No task brief, no reviewer finding, and no cleanup instinct authorizes discarding another session's changes.
- **Fallback (do this instead):** Work additively. Re-read a contended file immediately before each edit, keep your change narrow, and say in your walkthrough that the file was already dirty. Never `git add -A` or `git commit -a`.
- **Consequence (if you proceed anyway):** Git keeps no reflog for working-tree reverts, so the other session's work is gone unrecoverably — that happened on 2026-07-09 and cost a verified-but-uncommitted change.

#### BC-NO-COMMIT — Do NOT commit or push unless the task explicitly says to.
- **Prerequisite (resolve first):** A commit needs explicit authorization in this task's own brief. Absent that sentence, the work stays uncommitted.
- **Authority (who may waive it):** Robert, through the end-of-day commit-approval workflow. The task brief itself, when it explicitly instructs you to commit.
- **Fallback (do this instead):** Leave the change in the working tree; `git add` only the NEW files you created if the task needs them visible to review.
- **Consequence (if you proceed anyway):** QA reviews your UNCOMMITTED diff against a dispatch-time snapshot. Committing moves the work out of that view, and the round can read as an empty diff — a mandatory fail — even though the code is right.

#### BC-LIFECYCLE — Do NOT change this task's status in The Nexus yourself.
- **Prerequisite (resolve first):** The completion protocol markers at the end of this brief are the only status channel available to you; use them instead of the board.
- **Authority (who may waive it):** Praxis's completion handler owns the lifecycle. Robert can override it from the board.
- **Fallback (do this instead):** End with the exact completion / failure / needs-input protocol, and put anything the status cannot express into the walkthrough.
- **Consequence (if you proceed anyway):** A hand-edited status desynchronizes the schedule from the run, and the executor callback that would have carried your result is discarded.

#### BC-QUALITY-GATES — Run BOTH quality gates — verify and code-review — and declare them on the marker line before reporting complete.
- **Prerequisite (resolve first):** The verify pass needs the change actually exercised (run the flow, command, or test — a typecheck is not a verify), and the code-review pass needs your own uncommitted diff re-read end to end.
- **Authority (who may waive it):** Nobody. Neither an executor nor a reviewer may waive a gate; the only sanctioned exception is a change with no runtime surface, and you must say that explicitly on the marker line.
- **Fallback (do this instead):** If there is genuinely nothing to drive, declare that in place of a command rather than omitting the gate or inventing a command you did not run.
- **Consequence (if you proceed anyway):** A completion reported without the marker line is treated as unverified work and flagged for the human reviewer, whatever the walkthrough claims.

#### BC-WORKSPACE-BINDING — Your home workspace is `/Volumes/Projects/gay-i-concierge`. You MAY work in additional repos under /Volumes/Projects when the task genuinely needs it, and you MUST name every extra repo you touched — absolute path — and why, in your completion report.
- **Prerequisite (resolve first):** Before writing outside the home workspace, know that the task genuinely needs that repo. Praxis records every write outside the home root, so the record and your report have to agree.
- **Authority (who may waive it):** You, by declaring it in the completion report — that is the sanctioned way to widen the task's footprint. If the WHOLE task belongs in a different repo, re-point it through the workspace endpoint instead so QA's primary diff moves with you.
- **Fallback (do this instead):** If you touched a repo you did not need, say so in the report anyway (an honest extra repo is not a defect); if you cannot tell which repos you touched, list every one you might have.
- **Consequence (if you proceed anyway):** QA collects the diff from every repo you touched and judges it on merit — it never fails you merely for editing another repo. An UNDECLARED extra repo (recorded by Praxis, never named in your report) is the one cross-repo defect QA may raise.
