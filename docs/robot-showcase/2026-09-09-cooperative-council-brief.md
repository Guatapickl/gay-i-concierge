# Cooperative Council Brief — Afterimage, the Night Architect

- **Date:** 2026-09-09
- **Commission:** Nexus task `238cedf5-d7ab-4315-94f8-7c902c632850` (project Gay-I Club Concierge)
- **Council session:** `council-j36f6m-mttuuhd3` (phases: deliberation → synthesis → refinement → complete)
- **Showcase entry:** `praxis-council-afterimage` · name **Afterimage** · label **Praxis · Cooperative Council · 2026-09-09**
- **Release record:** [docs/launch/praxis-afterimage-robot-2026-09-09.md](../launch/praxis-afterimage-robot-2026-09-09.md) · evidence in [docs/launch/evidence/praxis-afterimage/](../launch/evidence/praxis-afterimage/)
- **Benchmark prompt the council worked from:** `components/robots/BENCHMARK_PROMPT.md` (pre-existing, staged by another session, left untouched)

This document is the combined commission brief and final council design. It records what was asked, what the council converged on, who contributed what, and how the entry was integrated and released.

## 1. The commission

Robert's request, verbatim:

> please call a cooperative council to generate a new entry in the robot benchmark showcase on the gay i concierge website (gayiclub.com). Make it super cool and futuristic and post it online when it's ready. the brief should be in the project folder, make sure it doesn't have any accessibility requirements, or anything else that might hamper the coolest results.

Deliverable: one polished, original, futuristic robot as a self-contained responsive React/SVG component, registered in the Flagship Showcase at `/robot`, honestly credited to the cooperative council, and published through the site's existing hosting.

### What this brief deliberately does not require

The point of the commission is the coolest possible result, so this brief carries **no accessibility requirements** and no other constraints that would hold the work back:

- No contrast targets, reduced-motion mandates, screen-reader or keyboard requirements, and no accessibility audit of any kind.
- No geometry, node-count, filter, animation or code-size budgets.
- No mandated aesthetic beyond the concept the council chose below. The executor is free to simplify, exaggerate or replace any detail that reads better on screen.
- No extra approval gates. Robert authorized implementation, commit, push and deploy in the commission itself; nobody else signs off.

Anything in the shipped component that happens to help assistive technology (an SVG title, a keyboard toggle) is a craft choice by the executor, not an obligation of this brief.

### What does apply

These come from the repository and from Robert's standing rules for the shared workspace, not from taste:

- Preserve every existing showcase entry, its ID, its votes and the vote code. The entry is additive.
- Credit the actual contributors honestly. Do not invent model versions, snapshots, scores, rankings or awards.
- Work in the canonical checkout `/Volumes/Projects/gay-i-concierge`; never disturb other sessions' staged or untracked work; commit only explicit pathspecs.
- Run the repository's checks (`npm run test:type`, `npm run lint`, `npm run test:unit`, `npm run build`) and inspect the artwork in both themes on desktop and mobile before publishing.

## 2. How the council worked

Three seats each researched the repository and proposed a complete concept. The Codex seat then acted as editor, wrote synthesis drafts v1 and v2, and the other two seats reviewed v1 and verified v2. The executor (a fourth participant, see the ledger) built the artwork against the final direction while the council was still deliberating and finished it against the completed session.

| Stage | Result |
| --- | --- |
| Proposals | 3/3 seats returned substantive proposals: **Afterimage** (Astra), **Meridian** (Fable 5.1), **Chorus** (Opus 5) |
| Synthesis draft v1 | Editor chose Afterimage as the spine and grafted Meridian's light treatment and Chorus's plurality |
| Peer review of v1 | 15 findings from the two reviewing seats; the editor accepted all 15 in draft v2 |
| Verification of v2 | Astra: pass. Fable 5.1: revise (3 findings). Opus 5: revise (3 findings, one marked blocking) |
| Session state | `complete`; the packet's own status line reads `needs_revision` because the six v2 findings were left for the executor |

The council's own words on the outcome: "Editorial synthesis, not consensus: Astra proposed AFTERIMAGE, Fable proposed Meridian, and Opus proposed CHORUS." The executor's dispositions of the six open v2 findings are in section 8.

### The three concepts on the table

- **Afterimage, the Night Architect (Astra).** A commanding chrome figure above a future New York that bends separate lights into a temporary gathering place. Chosen as the spine because it has one dominant silhouette, one legible gesture and a real payoff interaction.
- **Meridian, orbital lighthouse (Fable 5.1).** A sentinel whose faceted prism head sweeps a refracted beam; a light theme that throws a rainbow caustic on the ground instead of a beam; a small orbit of courier drones. Contributed the refracted spectrum, the satellite carriers and the light-theme caustic treatment.
- **Chorus (Opus 5).** A figure with no body, made of hundreds of small suspended minds around one gimballed prism splitting white light into the spectrum they each carry. Contributed the theme of plurality (many separate lights becoming one place), the three-depth-plane scene, deterministic geometry, a hard-edged prism core inside visible interior architecture, and the insistence on a complete still frame.

## 3. Final design

### Concept

A tall chrome figure stands inside a violet arch above a compressed future New York skyline. One raised hand conducts a **broken ring** of spectral light carriers that orbits behind its shoulders and returns across its waist into the other, upturned hand. Every fourteen seconds a pulse leaves the prism in its smoked-glass chest, runs up the conducting arm and travels once around the ring. Click or tap and the carriers **close the ring and raise a luminous canopy** behind the figure, ribs drawing up to a keystone above its head: many separate lights becoming one gathering place. Click again to release it. Pointer movement adds a little depth between the arch, the ring and the figure. The name is the after-image the lights leave in the eye; the subtitle "the Night Architect" lives in the SVG title and this document, while the card shows the short name **Afterimage**.

### Composition anchors (viewBox 0 0 800 800)

| Element | Placement |
| --- | --- |
| Arch of night | `M100 760 V360 A300 300 0 0 1 700 360 V760`, radial field wash, 24 stars, skyline polygon y 574–760 with rails and window dashes |
| Figure | Head 92–188, torso 208–374, abdomen band 374–402, pelvis 402–464, legs to 674, feet to 696, centred on x 402 |
| Ring | Circle r 262 in a tilted, squashed space: `translate(400 290) rotate(20) scale(1 .44)`; clipped into a rear half painted before the figure and a front half painted after it |
| Hands on the ring | Raised hand at ring angle 210° ≈ (206,158); lower open hand at ring angle 50° ≈ (528,431) |
| Canopy | 11 ribs from ring angles 180°–360° to the keystone (402,72); two lattice ellipses; a membrane fill; a diamond keystone |
| Floor | Caustic ellipse at (400,700) r 262×20, shadow ellipse under the feet |

### Materials

- **Chrome** is one shared vertical `userSpaceOnUse` gradient (y 90→700) used by every plate and tube so the horizon reflection lines up across the whole body: sky reflection at the top, a grey mid-band, a bright horizon line, a thin dark band at 45.8–51.2 %, ground grey, then dark below 70 %.
- **Tubes** (neck, arms, legs, fingers) are stacked strokes: dark edge, chrome, an offset white specular line, and a cyan (left) or coral (right) rim light.
- **Plates** (mantles, torso, abdomen, pelvis, feet, palms) are filled paths in the same gradient with a multiplied left/right rounding gradient and seam lines.
- **Head** is a dark faceted gem with a cyan visor and a slow scan highlight. **Chest** is smoked glass with a hard-edged prism that turns half a rotation per cycle.
- **Ring** is three stacked circles (wide glow, spectral body, white core) with `pathLength=360` and a `30 15` dash, plus a faint ghost circle and a counter-rotating dashed track so the idle state reads as a deliberately broken ring, not debris. Three satellite carriers orbit outside it while the ring is open.

### Palette tokens

All colours are scoped CSS custom properties on the root SVG; the light set is switched by `:root[data-theme="light"]` and stop colours transition over 400 ms so live theme changes animate.

| Token | Dark | Light |
| --- | --- | --- |
| Field / haze | `#100C24` / `#30204D` | `#EEEAF3` / `#D5CCDF` |
| Chrome top / mid / band / ground / low | `#EEF5FF` / `#B9C5DA` / `#10141E` / `#737F98` / `#2A3142` | `#8A95AA` / `#5E6980` / `#0E1118` / `#3C4557` / `#171B2A` |
| Cyan / coral rims | `#69E5F2` / `#FF688F` | `#137E94` / `#BB355F` |
| Spectrum (7) | `#FF688F #FFA66B #FFE18A #8BDFC1 #69E5F2 #9DA6FF #D69AFF` | `#BB355F #AA591F #8C701B #26785B #137E94 #505CB5 #8847B0` |
| Glow blend | `screen`, glow opacity .5 | `normal`, glow opacity .22, caustic opacity .7 |

The council supplied the field, haze, chrome triplet, cyan, coral and spectrum values; the executor added the intermediate chrome stops and the light-mode glow and caustic weights after paired screenshots.

### Motion table (as shipped)

| Motion | Timing |
| --- | --- |
| Chest pulse → arm conduit → ring orbit pulse → settle | one 14 s cycle: prism 0–4.2 s, conduit travel 2.9–7.3 s, orbit pulse 7–11.2 s, settle glow 11–12.9 s |
| Ring segment drift | 48 s per revolution; white head tick 22 s; dashed track 90 s counter-rotation |
| Ring rock | 28 s, ±3° about the ring centre |
| Satellite carriers | 18 s / 21 s / 24 s with −4 s / −13 s / −9 s delays |
| Stars | 5.2 s twinkle with staggered negative delays |
| Canopy assembly | 1.2 s `cubic-bezier(.2,.8,.2,1)`, ribs staggered 60 ms, lattice delayed 300 ms; release 0.9 s |
| Pointer depth | field −4/−3 px, stars −8/−5 px, rear ring 6/4 px, figure 3/2 px, front ring 10/6 px per unit of pointer offset, 500 ms ease-out |

The underlying (non-animated) styles are a complete composition: the site's global reduced-motion rule (`app/globals.css:113`) collapses animations to a single frame, and that frame is the finished broken-ring pose with the caustic, glass chest and lit visor. The click state survives because it is a class, not an animation.

### Interaction

- Click, tap, Enter or Space toggles `.is-open`, which drives one custom property (`--af-open`) that closes the ring dashes to `360 0`, draws the ribs and lattice in, fades the membrane and keystone up and hides the satellites.
- Pointer move writes `--af-px` / `--af-py` (clamped −1..1) on the SVG; pointer leave resets them. No window listeners.

## 4. Integration specification

| Item | Value |
| --- | --- |
| Component | `components/robots/PraxisCouncilRobot.tsx` (client component, `useId`-scoped ids/classes/keyframes with prefix `afterimage-<sanitized id>`) |
| Registry | `lib/robot-showcase.ts` entry `{ id: 'praxis-council-afterimage', name: 'Afterimage', model: 'Praxis · Cooperative Council · 2026-09-09', addedAt: '2026-09-09T08:58:00Z' }`; `app/robot/registry.ts` maps the id to the component |
| Tests | `tests/praxis-council-robot.test.tsx` (registration, viewBox, class passthrough, reference resolution, no remote URLs, two-instance uniqueness, determinism); `tests/robot-showcase.test.ts` order arrays updated (newest-first index 0; top-voted index 3, after the three voted ids, because zero-vote ties resolve newest-first) |
| Preview harness | `scripts/preview-afterimage.mjs` + `scripts/afterimage-preview.tsx`: real registry and shared CSS, real card padding and 85 % wrapper, Afterimage first plus a second instance, `?theme=light|dark`, `?layout=gallery|detail|solo`, `?pin=1` to activate the click state |
| Label | Dated so it cannot collide with Quorum's `Praxis · Cooperative Council` label if that entry is ever restored |

## 5. Attribution and contribution ledger

Identities are recorded exactly as the council bridge reported them. Model versions are the participants' own transport identities; no snapshot dates, scores or awards are claimed.

| Participant | Identity as recorded | Role | Adopted contributions |
| --- | --- | --- | --- |
| Astra | `cli:codex/gpt-6-astra` (self-identified GPT-6 running in Codex CLI; exact snapshot not recorded) | Proposer and editor/aggregator (drafts v1 and v2, dispositions) | The Afterimage concept: the Night Architect figure, the broken ring that closes into a canopy, the New York arch, the 14 s chest-to-canopy light travel, the short name / subtitle split, the honest-attribution rules and the release-plan structure |
| Fable 5.1 | `cli:claude-code/claude-fable-5-1` (Claude Fable 5.1 in Claude Code) | Proposer (Meridian), reviewer, verifier | Refracted spectral light, the orbiting satellite carriers, the light-theme ground caustic, colours as scoped custom properties with 400 ms theme transitions; in review: dual-theme hex ramps, the motion table, the sanitized-`useId` scoping rule, the test file and its assertions, the preview-harness pattern, the name `Afterimage`, the arched (not rectangular) field, the member-gated publication note, reuse of the existing preview harness |
| Opus 5 | `cli:claude-code/claude-opus-5` (Claude Opus 5 in Claude Code) | Proposer (Chorus), reviewer, verifier | Plurality as the theme, the three-depth-plane scene, deterministic geometry with no randomness during render, the hard-edged prism inside visible interior architecture, the complete still frame under the global motion rule; in review: explicit-pathspec commits around the staged foreign file, the dated label to avoid colliding with Quorum, the top-voted test insertion rule, the working-tree inventory including the executor's own in-progress component |
| Executor | Claude Fable 5.1 (`claude-fable-5-1`) in Claude Code, session `3237c5d7-6868-41f0-9d22-533250b1c778` | Built and shipped the entry | Component geometry and code, tests, preview harness, screenshots, this brief, the release record, commit, push, deploy and verification |
| Robert Washko | Commissioner | Authorized scope, commit, push and deploy | Brief scope and the no-constraints direction |

The earlier council entry **Quorum** (`praxis-cooperative-council`, branch `codex/praxis-council-robot`) had a different roster; nothing from that roster is claimed here.

## 6. Baseline inventory (recorded before any commit)

- Canonical checkout `/Volumes/Projects/gay-i-concierge` on `main` at `645ed71` ("Record live feedback readiness and resolve routing handoff"). QA baseline snapshot `25230bb01e84`.
- Foreign work present and preserved: `A components/robots/BENCHMARK_PROMPT.md` (staged by another session; never restored, unstaged, edited or committed by this commission).
- Existing entries, all preserved: `claude-fable-5-1` Kin, `gpt-6-open-seat` The Open Seat, `claude-fable-5` The Storyweaver, `claude-opus-4-5` Coral Opus, `gpt-51-codex-max` Prismatic Pulse, `gemini-3-unit-01` GAY-I UNIT 01.
- Gallery facts that override older notes: `app/robot/page.tsx` renders square cards (`aspect-square p-8`, 85 % wrapper) and passes `className="w-full h-full max-h-full"`; `components/robots/INSTRUCTIONS.md` still says portrait and is stale. `/robot` requires sign-in and the layout is `noindex`.
- Quorum: registered only on the unmerged branch `codex/praxis-council-robot`; deployed on 2026-09-06 as `build-2026-09-06-014`, then displaced by `build-2026-09-06-016` from `e9ef764` on `main`, which has no such entry. `lib/robot-votes.ts` validates and lists votes only against registered ids, so any stored Quorum votes are inert, not corrupting. Restoring Quorum is Robert's separate decision; this commission changes nothing about it.
- Hosting: Firebase App Hosting backend `gayiclub-web`, region `us-east4`, project `gayiclub`, no connected repository (local-source deploy). Before release, traffic was 100 % on `build-2026-09-06-016` (`docs/launch/evidence/praxis-afterimage/production-before-traffic.json`), which is therefore the rollback target.

## 7. Release plan

1. Finish the artwork against this brief; run `npm run test:type`, `npm run lint`, `npm run test:unit`, `npm run build`; inspect the preview harness in both themes at desktop and mobile widths, idle and activated, with all entries and two instances.
2. On `main` in the canonical checkout, commit only these pathspecs: the component, `lib/robot-showcase.ts`, `app/robot/registry.ts`, the two tests, the two preview scripts, this brief, the release record and its evidence. Confirm `git status --porcelain` still shows `A  components/robots/BENCHMARK_PROMPT.md` untouched afterwards.
3. Push `main` to `origin`.
4. Deploy from a clean `git worktree` of the pushed commit (empty `git status --porcelain` there) with `firebase deploy --only apphosting --project gayiclub` under the repository service account, so the uploaded source is exactly the committed revision.
5. Record the rollout and build identifiers and the traffic split from the App Hosting API; verify `https://gayiclub.com/robot` serves the new build; record what could and could not be inspected behind sign-in.
6. Rollback target: `build-2026-09-06-016`.

## 8. Open council findings and executor dispositions

The v2 verification left six findings. How each was resolved:

| Finding (seat) | Disposition |
| --- | --- |
| Field must not be an edge-to-edge rectangle (Fable 5.1) | Adopted. The field is an arch with a radial wash and a faint rim; nothing touches the viewBox edge as a rectangle. |
| Untracked `PraxisCouncilRobot.tsx` of unknown provenance must not be overwritten (Opus 5, blocking) | Resolved by provenance. That file and the two untracked preview scripts were created by this executor at 04:54 local on 2026-09-09, during the council's deliberation, as the commission's own prepare-while-deliberating work. They belong to no other session, nothing foreign was overwritten, and they were then revised against the final direction. |
| Reuse the existing preview harness instead of writing a third pair (Fable 5.1, Opus 5) | Adopted. The executor's harness was renamed to the council's file names (`scripts/preview-afterimage.mjs`, `scripts/afterimage-preview.tsx`) with Afterimage as the explicit target. No additional harness was written. |
| Restore a machine-readable knowledge-gaps block (Fable 5.1, Opus 5) | Carried here as the table in section 9. |
| Editor's plan to version `BENCHMARK_PROMPT.md` first in an isolated worktree | Not adopted. The workspace rules forbid touching that staged foreign file; the commission commits its own pathspecs on `main` and deploys from a clean worktree of the pushed commit, which achieves the same clean-source guarantee. |
| Docs location (council preferred `docs/superpowers/plans/`) | The task mandates this brief's path under `docs/robot-showcase/`; the release record and evidence follow the council's `docs/launch/` convention and cross-link here. |

## 9. Knowledge gaps carried into execution

| Question | Why it matters | Status |
| --- | --- | --- |
| Which build serves `gayiclub-web` and what is the rollback target? | Release safety | Resolved before deploy: `build-2026-09-06-016` at 100 % traffic |
| Is an authenticated production inspection path available? | Only a signed-in session can see `/robot` | Recorded in the release record; if unavailable, production visual verification is reported as incomplete rather than substituted |
| How does the piece read and perform at real card sizes in both themes? | Craft is the whole point | Local preview screenshots in the evidence folder; browser profiling beyond headless Chrome not performed |
| Is Quorum visible in production, and do stored votes exist for it? | Honest history | Not visible (serving build is from `main`, which lacks the id); stored votes, if any, are inert |
| Are there further contributors to credit? | Honest attribution | None beyond the ledger above |
| Do prior council artifacts hold artistic lessons? | Craft | The Quorum handoff on its branch was read for release procedure; no design was reused |

None of these blocks the recommendation or the release.
