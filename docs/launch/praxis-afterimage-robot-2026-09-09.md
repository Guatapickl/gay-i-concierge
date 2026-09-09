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

Screenshots in `evidence/praxis-afterimage/`: `solo-dark-idle`, `solo-light-idle`, `solo-dark-open`, `solo-light-open`, `gallery-desktop-dark`, `gallery-desktop-light` (1280 px, all seven entries plus a second Afterimage instance), `gallery-mobile-dark`, `gallery-mobile-light` (390 px). Observed: no rectangular field edge against the card in either theme; the idle broken ring reads as a deliberate gesture; the canopy assembles behind the figure on click; two instances render independently; neighbouring artworks unaffected. Not performed: Safari, physical-device profiling, frame-rate traces.

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
| Mobile 390 px | `live-mobile-dark.png`, `live-mobile-light.png`; no horizontal overflow (scrollWidth 390) |
| Sign-out | session cookie deleted (HTTP 200) |

**Status: execution finished, review passed, confirmed live.**

## 4. Quorum status (unchanged by this release)

Quorum (`praxis-cooperative-council`) exists only on the unmerged branch `codex/praxis-council-robot`; it was served as `build-2026-09-06-014` on 2026-09-06 and displaced by `build-2026-09-06-016` from `main`. It is not registered on `main`, so it is not in this release and any stored votes for it stay inert. Restoring it is Robert's separate decision and would need its own label to stay distinguishable from Afterimage.
