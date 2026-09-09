# Afterimage — cooperative council showcase entry, release record (2026-09-09)

Commission brief and final council design: [docs/robot-showcase/2026-09-09-cooperative-council-brief.md](../robot-showcase/2026-09-09-cooperative-council-brief.md). Evidence: [docs/launch/evidence/praxis-afterimage/](evidence/praxis-afterimage/).

**The entry is visible to signed-in members only; the gallery is marked noindex. Anonymous access would be a separate scope change.**

## 1. Editorial decisions (council)

- Council session `council-j36f6m-mttuuhd3`, three seats: `cli:codex/gpt-6-astra` (proposer and editor), `cli:claude-code/claude-fable-5-1` (proposer, reviewer, verifier), `cli:claude-code/claude-opus-5` (proposer, reviewer, verifier). Executor: Claude Fable 5.1 in Claude Code.
- Concept chosen: **Afterimage, the Night Architect** (Astra's proposal) with Meridian's refracted light, satellite carriers and light-theme caustic (Fable 5.1) and Chorus's plurality, depth planes, deterministic geometry and complete still frame (Opus 5).
- Card name `Afterimage`; model label `Praxis · Cooperative Council · 2026-09-09` (dated so it cannot collide with Quorum's label).
- The session finished `complete`; the packet's status was `needs_revision` with six executor-facing findings from the v2 verification. The brief's section 8 records how each was resolved.
- No accessibility requirements, budgets, mandated aesthetics or extra approval gates were imposed, as Robert asked.

## 2. Implementation and local verification (executor)

### Changed files (commit `65fac5e` on `main`)

| File | Change |
| --- | --- |
| `components/robots/PraxisCouncilRobot.tsx` | New artwork (456 lines): chrome figure, broken spectral ring, arch of night over New York, click-to-raise canopy, pointer depth |
| `lib/robot-showcase.ts` | New first entry `praxis-council-afterimage`, `addedAt: 2026-09-09T08:58:00Z` |
| `app/robot/registry.ts` | Maps the id to the component |
| `tests/praxis-council-robot.test.tsx` | 4 tests: registration, self-contained SVG with resolving references, two-instance scoping, determinism |
| `tests/robot-showcase.test.ts` | Newest-first and top-voted order arrays extended (index 0 and index 3) |
| `scripts/preview-afterimage.mjs`, `scripts/afterimage-preview.tsx` | Loopback preview harness: real registry, shared CSS, real card geometry, Afterimage first plus a second instance, `?theme`, `?layout`, `?pin=1` |
| `docs/robot-showcase/2026-09-09-cooperative-council-brief.md` | Commission brief and final council design |

Preserved: all six existing entries and IDs, the vote code and API, and the other session's staged `components/robots/BENCHMARK_PROMPT.md` (still staged, uncommitted, untouched).

### Checks (canonical checkout, before commit)

| Check | Result |
| --- | --- |
| `npm run test:type` | passed |
| `npm run lint` | 0 errors, 37 warnings (baseline 37; the one warning the new harness introduced was fixed) |
| `npm run test:unit` | 36 files passed, 3 skipped; 210 tests passed, 5 skipped (baseline 206 passed) |
| `npm run build` | passed; `/robot` prerendered |
| UTF-8 / mojibake scan of changed files | clean |

### Local visual inspection (headless Chrome against the preview harness)

Screenshots in `evidence/praxis-afterimage/`: `solo-dark-idle`, `solo-light-idle`, `solo-dark-open`, `solo-light-open`, `gallery-desktop-dark`, `gallery-desktop-light` (1280 px, all seven entries plus a second Afterimage instance), `gallery-mobile-dark`, `gallery-mobile-light`, `gallery-mobile-dark-open` (390×844 device emulation, Afterimage card scrolled fully into view, `gallery-mobile-check.json`: scrollWidth 390 = clientWidth 390, so no horizontal overflow). The first mobile captures, taken with a bare `--window-size=390` headless window, were cropped by Chrome's minimum window width and looked like overflow; they were replaced on 2026-09-09 after QA pointed this out. Observed: no rectangular field edge against the card in either theme; the idle broken ring reads as a deliberate gesture; the canopy assembles behind the figure on click; two instances render independently; neighbouring artworks unaffected. Not performed: Safari, physical-device profiling, frame-rate traces.

## 3. Production evidence

| Item | Value |
| --- | --- |
| Integrated revision | `65fac5e85355fc930dcca9b569b1786487a6d627` on `origin/main` (pushed from the canonical checkout) |
| Deploy source | Clean detached worktree `/tmp/afterimage-release` at that revision, `git status --porcelain` empty (`evidence/praxis-afterimage/deploy.log`) |
| Deploy command | `firebase deploy --only apphosting --project gayiclub --non-interactive --force` (Firebase CLI 15.16.0) with Robert's Application Default Credentials in an isolated CLI config dir. A first attempt with the repository service account failed on `iam.serviceAccounts.create` (`deploy-attempt-1-service-account.log`) and uploaded nothing. |
| Backend | `gayiclub-web`, `us-east4`, project `gayiclub`, no connected repository |
| Before | traffic 100 % on `build-2026-09-06-016` (`production-before-traffic.json`, `production-before-rollouts.json`); served `/robot` chunks contained no Afterimage |
| Rollout / build | Rollout `build-2026-09-09-001` SUCCEEDED (created 09:27:08Z, finished 09:29:35Z); build `build-2026-09-09-001` READY from uploaded archive `gayiclub-web--5714-5rRWaEg9KzIj-.zip` (rootDirectory `/`); Cloud Build `bd7e8c2e-0b49-4c3d-b1cc-6714164d5ca9`; image `gayiclub-web:build-2026-09-09-001` (`build-2026-09-09-001.json`, `deploy.log`) |
| After | traffic 100 % on `build-2026-09-09-001` (`production-after-traffic.json`, `production-after-rollouts.json`); `https://gayiclub.com/robot` served chunk `/_next/static/chunks/bd33aa8e22716245.js` containing the artwork title |
| Rollback target | `build-2026-09-06-016` |

### Live verification

Performed with a temporary Firebase Auth account (`praxis.afterimage.qa.20260909@example.com`, created with the Admin SDK immediately before the check and deleted immediately after; it cast no votes and wrote no member data). Headless Chrome was driven over the DevTools protocol through the real sign-in form (`live-check.json`).

| Observation | Result |
| --- | --- |
| Sign-in | Redirected to `/`, `__session` cookie set |
| `/robot` newest order | Afterimage (`Praxis · Cooperative Council · 2026-09-09`), Kin, The Open Seat, The Storyweaver, Coral Opus, Prismatic Pulse, GAY-I UNIT 01; every card renders its SVG |
| Artwork | One `afterimage-` SVG, title "Afterimage, the Night Architect", viewBox `0 0 800 800`; click toggled `is-open` (canopy raised) and back |
| Themes | `live-desktop-dark.png`, `live-desktop-light.png`, `live-desktop-dark-open.png` |
| Top voted (read-only) | Kin, Afterimage, The Open Seat, The Storyweaver, Coral Opus, Prismatic Pulse, GAY-I UNIT 01 (existing member votes untouched) |
| Mobile 390 px | `live-mobile-dark.png`, `live-mobile-light.png`, `live-mobile-dark-open.png` (390×844 device emulation, Afterimage card scrolled fully into view: card top 12 px, artwork 163–404 px inside an 844 px viewport; `live-mobile-check.json`); scrollWidth 390 = clientWidth 390, no horizontal overflow. The original live mobile capture showed only the top of the card and was replaced after QA feedback, using a second and third temporary account (`praxis.afterimage.qa2…`, `praxis.afterimage.qa3…`), both deleted afterwards |
| Sign-out | session cookie deleted (HTTP 200) |

**Status.** Execution finished (all files committed and pushed). Executor self-review passed (type-check, lint, unit suite, production build, own-diff code review by the executor, Claude Fable 5.1). Confirmed live (rollout `build-2026-09-09-001` serving, signed-in gallery inspected). Cross-executor QA: the Nexus QA reviewer (Codex) passed the task on 2026-09-09; an adversarial critic then raised four objections, answered in section 5 below. "Review passed" in the first version of this line referred only to the executor's self-review.

### Acceptance criteria scorecard

| # | Criterion | Proof |
| --- | --- | --- |
| 1 | Council design and commission brief saved at `docs/robot-showcase/2026-09-09-cooperative-council-brief.md` with no accessibility requirements or arbitrary creative limits | File committed in `65fac5e` (184 lines). Its section "What this brief deliberately does not require" states there are no accessibility requirements, no budgets, no mandated aesthetic and no approval gates; `grep -n -i "accessib\|budget\|approval\|mandat"` on the file matches only those negations and the task-mandated path note |
| 2 | Original artwork integrated with unique id and real `addedAt`; accurate collaborative attribution; existing entries, IDs and voting preserved | `git diff 645ed71 65fac5e -- lib app` is purely additive: one new line in `lib/robot-showcase.ts`, one import and one map entry in `app/robot/registry.ts`, no deletions. `tests/robot-showcase.test.ts` changes only the two exact-order arrays, inserting the new id and keeping every existing id in its original relative order (the two removed lines are the old arrays, reproduced inside the new ones). `lib/robot-votes.ts` and `app/api` are untouched. Live check: all six prior cards render and Kin's existing vote total is unchanged. Attribution: label in `lib/robot-showcase.ts`, seats and executor in the brief's ledger and section 1 above |
| 3 | Checks run and visual inspection in both themes on desktop and mobile | Table under "Checks"; local and live screenshots listed above |
| 4 | Commit, push, deploy through the existing hosting, verify live, report | Commits `65fac5e`, `4052c35` on `origin/main`; rollout `build-2026-09-09-001` on the existing backend `gayiclub-web` (us-east4) using the repository's `firebase.json` / `apphosting.yaml` unchanged; before/after rollout lists differ by exactly that one rollout; live URL https://gayiclub.com/robot inspected signed in |

## 4. Quorum status (unchanged by this release)

Quorum (`praxis-cooperative-council`) exists only on the unmerged branch `codex/praxis-council-robot`; it was served as `build-2026-09-06-014` on 2026-09-06 and displaced by `build-2026-09-06-016` from `main`. It is not registered on `main`, so it is not in this release and any stored votes for it stay inert. Restoring it is Robert's separate decision and would need its own label to stay distinguishable from Afterimage.

## 5. Adversarial critic objections and answers (2026-09-09)

1. **Reviewer silent on criterion 1.** The scorecard above cites the brief file and the grep that shows its only mentions of accessibility, budgets and approvals are negations. The brief was committed in `65fac5e` and is unchanged since.
2. **Criterion 2 preservation unproven because existing files were edited.** The edits are additive: no existing line was removed from `lib/robot-showcase.ts` or `app/robot/registry.ts`. In `tests/robot-showcase.test.ts` the two exact-order arrays were extended, not weakened: every prior id keeps its relative position, the vote fixtures (12/8/8) are unchanged, and the third derived test is untouched. The full unit suite passed (210 tests) and the signed-in live check showed all six prior entries with their existing vote totals.
3. **Criterion 4: which deployment path was used.** The release went through the existing hosting configuration: backend `gayiclub-web` in `us-east4`, the tracked `firebase.json` and `apphosting.yaml`, the same `firebase deploy --only apphosting --project gayiclub` command used for every prior release. Only the CLI credential differed: the repository service account was denied (`deploy-attempt-1-service-account.log`, 7 lines, no upload and no rollout created) and the deploy was rerun with Robert's Application Default Credentials. No IAM binding, backend setting or hosting file was changed. The before/after rollout lists prove exactly one rollout, `build-2026-09-09-001`, was created.
4. **Attribution completeness.** Nothing was excluded from this entry's attribution by the executor. The brief's ledger names every council seat by its recorded transport identity, the executor model and environment, and Robert as commissioner; the label carries the council name and session date. The reviewer's remark about a "shared-mind disclosure" concerns the reviewer's own process, not a contributor to the artwork.
