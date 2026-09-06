# Independent launch review — Gay I Club relaunch

Date: 2026-09-06
Reviewer: independent different-model QA lane
Worktree: `/Users/robertwashko/Documents/ChatGPT/GayIClub/relaunch`
Production-like preview: `http://localhost:3107`
Firebase emulator preview: `http://localhost:3108`

## Verdict

**Fail — not ready for cutover.**

The redesign defects found in this review's bounded shared-shell, profile, privacy, metadata, and security scope were corrected and independently rechecked in the final local builds. The release still fails the launch standard because required support and delivery systems are incomplete, the feedback-to-Praxis mapping has not been activated and route-tested, the exact plus-address sender is unavailable in the checked Resend account, real-inbox flows are unproved, a platform preview of the reviewed build is absent, and Robert has not approved the final release window. These are explicit failed rows in `docs/launch/readiness-2026-09-06.md`; they must not be represented as a launch pass.

No product code, production data, DNS, external feedback, or email was changed by this independent lane. Browser interaction used separate local preview tabs and the authorized Firebase emulator account only.

## Blocking findings

| Severity | Finding | Evidence and required action |
|---|---|---|
| Blocker | The support workflow required by the fleet standard is incomplete. | `docs/launch/robert-checklist-2026-09-06.md:11,15` and the readiness report record that automatic account-request receipts, the shared support registry workflow, and cross-project beta synchronization are not implemented. The profile checkbox truthfully stores a local `beta_opt_in` value only. Implement and verify these systems, or record an explicit owner exception before changing the release decision. |
| Blocker | Feedback opens in the site but internal project routing is not ready. | The 3107 widget loaded project `gayiclub` and exposed screenshot, voice, text, and optional-email controls. `docs/launch/support-mapping-handoff.md:5-31` proves the Praxis mapping is cached and still needs a coordinated configuration/restart. Activate the mapping, then perform an authorized labeled route test and verify the intended Nexus project/workspace before launch. |
| Blocker | The checked mail account cannot satisfy the exact plus-address From requirement, and actual delivery is unproved. | `lib/email.ts:25-29,57` uses a neutral `VibeShift AI Support <noreply@gayiclub.com>` From and `praxis+gayiclub@vibeshiftai.com` Reply-To. `docs/launch/support-mapping-handoff.md:33-41` records that only `gayiclub.com` is verified in the Resend account. Robert must complete the real-inbox verification, including sender, reply routing, action-link host, inbox/spam arrival, and opt-in/out behavior. |
| Blocker | The reviewed release has not passed its platform and owner gates. | `docs/launch/readiness-2026-09-06.md` marks domain/platform and owner approval failed: the final code has not been deployed to a platform preview, production environment names and auth behavior remain unverified there, and Robert has not approved the final report/build/release window. Follow `docs/launch/cutover-2026-09-06.md`; do not infer live readiness from local production builds. |

## Defects found and closed during independent QA

| Area | Initial defect | Final independent evidence |
|---|---|---|
| Mobile fixed controls | The feedback and AIlex launchers covered the mobile tab bar and profile controls; feedback also rendered above the open drawer. | Final 3108 at inner `372×805`: AIlex is omitted and `#praxis-feedback-host` is hidden/inert on `/profile`; no launcher remains over the form. Feedback is also hidden while the drawer is open. Source: `components/AppLayout.tsx:77-88`, `components/FeedbackWidget.tsx:5-20`. |
| Mobile modal behavior | The drawer background was initially exposed and its fixed launchers remained interactive. | Final markup applies `inert` to the skip link, header, sidebar, and page body while the modal is open. Focus moved to Close; Shift+Tab from Close wrapped to the final profile link; Tab from that link wrapped to Close; Escape restored the menu button; body scrolling was locked. Source: `components/AppLayout.tsx:44-84`. |
| Navigation and mockup alignment | Mobile quick navigation used Calendar instead of approved Events; landing CTAs stayed side by side; desktop member navigation was flat. | Final 3108 rendered Home/Hub/Events/News. Final 3107 stacked both landing CTAs at 372px. Desktop 3108 rendered Home, Connect, Happenings, and Tools groups. Source: `components/AppLayout.tsx:71-88`, responsive rules in `app/globals.css`. |
| Profile accessibility | Peer profile sections used inconsistent `h3` headings. | Final 3108 rendered one `h1` followed by seven peer `h2` sections: Contact, Experience Level, Interests, Communications, Beta program, Sign-in & password, and Account help. |
| Privacy inventory and access | Saved-news activity was omitted; join-date and robot-history wording did not match the implementation; saved-news records were readable by all members. | `app/privacy-policy/page.tsx:13-19` now discloses member-visible join month/year, private saved news, generated SVG history, and the default/custom prompt marker. `firestore.rules:101-105` restricts saved-news reads to owner/admin. An opt-in emulator test independently proved stranger denial for `user_profiles`, `profiles`, `news_saves`, and `alerts_subscribers`. |
| Directory rendering and responsive layout | Missing/unparseable join timestamps rendered `Joined Invalid Date`, and a decorative blob created a 30px horizontal scroll area at 372px. | Final 3108 `/community` contained no `Invalid Date` and had no horizontal document overflow. Source validates timestamps before rendering at `app/community/page.tsx:248-253`; the overflowing decoration is absent. |
| Long-page responsive layout | Agenda and Robot exceeded the 375px viewport. | Final 3108 at inner `372×805`: `/agenda` and `/robot` each had no horizontal document overflow and rendered their expected `h1`. |
| Auth link accessibility | Automated evidence found serious `link-in-text-block` violations on the inline Sign up/Sign in links because color alone distinguished them. | Final source and 3107 computed styles underline the two inline links: `app/auth/sign-in/page.tsx:150-155`, `app/auth/sign-up/page.tsx:81-86`. The public axe evidence must correspond to this rebuilt source. |
| SEO and project records | The social image had the wrong dimensions, canonical-host preview middleware emitted noindex behind the local proxy, and the project record lacked a Nexus ID. | Final `/opengraph-image` is a 1200×630 PNG. `Host: gayiclub.com` receives no `X-Robots-Tag`; localhost receives `noindex, nofollow`; `www` redirects 308 to apex. `project.json` now includes `nexus_project_id`. |

## Final verification evidence

| Check | Result |
|---|---|
| Build and tests | The final evidence log records 48/48 tests, including the opt-in emulator privacy test. Independently, `npm run test:all` passed typecheck, smoke tests, and 47 ordinary tests with the privacy integration test intentionally skipped; `RUN_FIREBASE_RULES_TESTS=1 npx vitest run tests/privacy.rules.test.ts` then passed 1/1. `npm run test:lint` returned 0 errors and 46 warnings. |
| Public route matrix | On 3107 with canonical Host, `/`, all three legal routes, `/robots.txt`, `/sitemap.xml`, `/.well-known/security.txt`, and `/opengraph-image` returned 200 with expected content types. The generated social image measured 1200×630. |
| Indexing and canonical host | `Host: gayiclub.com` returned 200 without `X-Robots-Tag`; `Host: localhost:3107` returned `noindex, nofollow`; `Host: www.gayiclub.com` returned 308 to `https://gayiclub.com/...`. Robots and sitemap list only intended public routes. Source: `middleware.ts:10-24`, `app/robots.ts`, `app/sitemap.ts`. |
| Metadata | Rendered landing metadata included title, description, VibeShift AI author and copyright, canonical URL, Open Graph data, Twitter large-card data, and dark/light theme colors. Route layouts add unique titles, descriptions, canonical values, and noindex for account/member surfaces. Source: `app/layout.tsx:20-35` and route layouts. |
| Legal ownership and disclosure | Landing and legal pages rendered `Gay I Club · a VibeShift AI project`, computed 2026 ownership, legal links, adult-audience wording, the plus-address, processors, browser/session storage, retention limits, AI/feedback collection, and reviewed account requests. Source: `components/AppLayout.tsx:84-85`, `app/privacy-policy/page.tsx`. |
| Security headers | Canonical-host responses included HSTS preload, nosniff, DENY framing, strict-origin referrer policy, camera/geolocation/payment denial, microphone self, and the checked CSP. Source: `next.config.ts:3-34`. |
| Theme and responsive shell | Theme toggle changed its accessible label, applied light/dark state, and persisted across navigation. Public landing/legal pages and sampled signed-in profile/community/agenda/robot routes had no horizontal overflow at 372px after the final rebuild. |
| Performance/accessibility artifacts | `docs/launch/evidence/lighthouse-final.json` reports 94 performance and 100 for accessibility, best practices, and SEO on the local production-host proxy. The corrected `axe-public-final.json` contains six public-route results with zero violations. These are local results, and full authenticated axe coverage remains part of the readiness evidence gate. |

## Review limits

This lane sampled the shared shell, landing, profile, directory, agenda, robot, auth, legal, metadata, rules, headers, and index artifacts. It did not submit forms, change emulator profile data, invoke external AI, send feedback/email, test production authentication, inspect a real inbox, deploy, or change DNS. A local production build cannot prove the Firebase App Hosting environment or real email delivery. The owner checklist and platform/live smoke sequence therefore remain mandatory.

`PRAXIS_QA_VERDICT: fail`

`PRAXIS_QA_NOTES: The sampled redesign and privacy defects were corrected in the final local builds, but the launch is not ready because required support receipts/backbone and cross-project beta sync are incomplete, the Praxis mapping restart and route test are pending, the exact plus-address From is unverified, real-inbox flows are unproved, platform preview evidence is absent, and owner approval has not been recorded.`

`PRAXIS_QA_IMPROVEMENTS: Add automated narrow-viewport overflow checks for long signed-in routes and retain authenticated axe coverage so future layout changes cannot recreate the fixed collisions and off-screen content.`
