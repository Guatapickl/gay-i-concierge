# Gay I Club relaunch readiness — September 6, 2026

**Release authorized for live owner review.** Robert explicitly requested deployment to the live site instead of a local preview. This overrides the earlier prelaunch gating workflow; remaining incomplete checks are still recorded below.

Historical prelaunch assessment: **not all checks passed.** The full supplied redesign is implemented in an isolated branch. The application and privacy rules were released on September6; no DNS changes or member announcements were made. Robert approved release in this task. Final verification is attached below; a failed row means incomplete evidence or a known gap, not necessarily a broken feature.

Owner review: https://gayiclub.com. Earlier local previews were engineering test environments and are no longer the requested review surface. The canonical checkout remains `/Volumes/Projects/gay-i-concierge`; changes are in `/Users/robertwashko/Documents/ChatGPT/GayIClub/relaunch`, branch `codex/relaunch-2026-09-06`, based on `b66ee21`.

## Evidence and gates

| Check | Status | Evidence and remaining work |
|---|---|---|
| Approved scope | pass | Robert explicitly selected all 14 supplied redesign references. Source references retained in `Gayiclub.com redesign review/`. |
| Build and regression tests | pass | `evidence/build.log`, `evidence/emulator-build.log`, `evidence/tests-final.log`: production builds pass; 54 tests pass including actual emulator privacy denials. `evidence/lint.log`: zero errors, 46 warnings in existing code/test patterns. |
| Mobile, tablet, desktop | fail | All 15 main member views checked at 375,768,1280px; zero horizontal overflow after final fixes. Screenshots `evidence/mobile-*.png`, `768-*.png`, `1280-*.png`; `responsive-routes.json`. Public dark/light captures also saved. Drawer, Events tab and profile fixes independently verified. Remaining nested/dynamic/error-form states and keyboard-up phone coverage are incomplete; Robert’s real-phone review remains requested. |
| Links and metadata | fail | Canonical host/preview indexing verified. 34 static URLs returned 200 or deliberate 307 redirects (`evidence/links.json`). Of 4 live resource links, 2 returned 200; ChatGPT bot403 and Streamlit redirect loop require browser confirmation. Auth/new-form metadata made unique. Remaining dynamic/content-generated links and per-record metadata are not fully verified. |
| Forms and follow-up emails | fail | Local emulator sign-in, RSVP/cancel and privacy checks pass. Unit tests cover confirmation/error paths and same-origin session protection. Actual verification, magic link, reset, opt-in/out and RSVP email arrival at Robert’s inbox remain unverified. No membership was emailed. |
| Search/performance | pass | `evidence/lighthouse-final.json`: performance 94, accessibility 100, best practices 100, SEO 100. Local reverse proxy on 3109 passes canonical Host into production build, leaving security headers intact. This is local production-like evidence, not a live-site score. |
| Assets and clutter | pass | New 1200×630 social card, SVG icon/logo; oversized old assets/scaffold files archived outside deployment; private files, tests and review docs excluded. `evidence/dependencies.json` reviewed: removed unused clsx, tailwind-merge and @eslint/eslintrc. Tailwind/PostCSS and Vite remain required build/test tooling; missing Supabase dependency belongs to an old migration script, not deployed runtime. No lorem/TODO/Coming soon scaffold matches in app/components. |
| Accessibility | fail | Final `evidence/axe-public-final.json` independently confirms zero violations across 6 public/account-entry pages. Two auth links now have underlines. Signed-in pages have manual checks; complete authenticated axe coverage remains outstanding. |
| Legal, privacy, security | pass | Fixed-path canonical legal documents plus code-derived site disclosures; neutral owner/contact; security headers verified on local production build. Directory API uses an allowlist; contact data, saved news and alert records are owner/admin only. API session origin and RSVP access tests pass. Policy discloses AI providers, generated SVGs, join-date visibility, feedback data and no automatic purge. |
| Fleet support standards | fail | Public feedback relay token registered and widget available. Praxis project routing still needs coordinated configuration/restart; account-request receipts, support registry workflow and cross-project beta sync are not implemented. Profile checkbox truthfully stores local interest only. `support-mapping-handoff.md` and `source-audit-2026-09-06.md`. Robert’s decision requested on deferring shared service. |
| Sender/inbox | fail | Resend verifies gayiclub.com only. Neutral From uses that domain; Reply-To is praxis+gayiclub@vibeshiftai.com. Exact fleet plus-address From requires verification or approved mailbox sending. Support inbox delivery/reply needs an actual check. |
| Domain/platform | pass | Existing Firebase apex/www ownership, hosting and certificates active; Cloudflare records backed up; no DNS change expected. Robert chose live review. Final reviewed code is deployed on Firebase; live headers, routes, sign-in session and directory privacy checks passed. See release-2026-09-06.md. |
| Backup/rollback | pass | Private Firestore, auth-record, DNS and hosting snapshots stored outside deployment; pre-launch Git tag at base; before screenshots. `cutover-2026-09-06.md` contains forward and rollback procedure. This is not a proven full auth/password restore or disaster-recovery drill. |
| Independent review | fail | `independent-review-2026-09-06.md`: different-model final verdict fail because declared integration, delivery, platform and owner gates remain. All sampled app defects passed final retest. |
| Owner approval | pass | Robert explicitly authorized pushing live for review despite the outstanding checklist rows. |

## Owner actions versus engineering work

Robert: review the finished designs and legal disclosures; confirm current event/poll content; verify inbox/auth emails; choose today’s support scope; approve the final readiness report when remaining gates are resolved. See the separate owner checklist.

Engineering: finish responsive and accessibility evidence, external link/dependency audit, platform preview/environment verification, and configured feedback routing; implement shared support/receipts/beta syncing if required before launch. Failed rows are tracked as launch follow-up tasks in Nexus rather than represented as passed.

The cutover skill requires every applicable row to pass and a recorded owner approval. No release is authorized by silence. Any explicit exception from Robert will be documented here, with its impact, before release.

## Nexus follow-up tracking

Project remains parked; these are recorded ideas, not launched background jobs.

- Authenticated QA/mobile nested states/links/accessibility: `0e61da6c-9aa8-4af4-92fd-6674b03f05d6`.
- Real email delivery and sender: `d353e71e-d5a5-40fb-9abe-030bf0ca7cbf`.
- Feedback mapping/shared support scope: `b7fed864-89af-4970-949d-f8f93e2858c0`.
- Platform preview, final independent gate and owner approval: `394e3894-90e1-44b3-a01d-0422255306e5`.

Emulator-only RSVP was created and cancelled through the UI. Privacy regression tests now delete their own exact document/auth IDs. Other local seed fixtures and earlier emulator-only test IDs persist only in the temporary emulator process for preview; no test records were added to production.

## Authorized mailbox test update

See `mail-findings-2026-09-06.md`. Praxis SMTP and IMAP work; the club plus-address received one labeled test in the Praxis inbox. Google rewrote From to the base Praxis address. No receiving MX for gayiclub.com. Resend delivery retest was blocked by missing local key and unavailable secret access; the earlier domain verification remains distinct from delivery evidence. Forms/Sender rows remain fail until actual application flows and intended sender identity are verified.

## Explicit live-review authorization

Robert: “please just push your changes live and I'll review on the live site.” The application release and matching privacy rules are authorized despite the documented outstanding support/email and broader QA items. Those items remain follow-up work and are not falsely marked passed. See the release note for final runtime evidence.

Final release evidence: [release note](release-2026-09-06.md). The final proxy-host correction passed independent bounded review and 54 tests; remaining broader integration/QA rows stay open.
