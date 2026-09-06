# Gay I Club: site standards evidence audit

Date: 2026-09-06. Read-only source inspection of `/Volumes/Projects/gay-i-concierge`, against `/Volumes/Projects/shared-mind/skills/operations/vibeshiftai-site-standards.md`. Paths and line numbers below are relative to the app repository unless otherwise stated. This is evidence gathering, not an independent release QA verdict. No code changes, production writes, email sends, credential inspection, or deployment were performed. Production configuration may differ from this checkout and was not verified here.

## Findings that need attention before member relaunch

1. **Member contact data is readable by every signed-in account under the checked-in rules.** `firestore.rules:27–30` permits all authenticated reads of `user_profiles`; `app/profile/page.tsx:113–120` writes name, phone, email, experience and interests there. The directory fetches whole documents in the browser before mapping away contact fields (`lib/directory.ts:14–31`); hiding fields in the rendered view does not limit database access. `alerts_subscribers` is also fully readable by every signed-in account (`firestore.rules:53–55`), including contact information and consent IP/source written by `app/api/alerts/subscribe/route.ts:37–63`. Separate private account/consent records from member-visible directory records and test cross-account denial. Verify deployed rules before describing production exposure as confirmed.
2. **Legacy profiles can be changed by any signed-in account.** `firestore.rules:34` allows authenticated creates/updates without ownership checks; the collection contains name/email/interests/experience (`lib/profile.ts:16–31`). Determine whether legacy records remain, then remove unused client access or restrict ownership. This matters even if the current UI mostly uses `user_profiles`.
3. **Alert signup and unsubscribe promise success without delivering confirmation links.** Subscribe creates confirmation tokens, then has only a TODO comment for sending email/SMS and returns success (`app/api/alerts/subscribe/route.ts:70–95`). Unsubscribe creates tokens, records intent, and returns success without sending (`app/api/alerts/unsubscribe/route.ts:52–86`). Production hides the debug tokens. The profile's save action calls these endpoints without checking response status and then says “Profile saved” (`app/profile/page.tsx:123–142`). Finish and verify the email flow, and either implement SMS or remove its offer and collection. Unsubscribe needs particular attention because the actual opt-out depends on an undelivered token.
4. **The required public legal/support layer is missing from source.** No privacy, terms, or accessibility route is present in the app/public route inventory. Footer is `© 2026 Gay I Club NYC` with no legal links (`components/AppLayout.tsx:154–159`). The default mail sender is branded `Gay I Club <noreply@gayiclub.com>` (`lib/email.ts:25–29`), conflicting with the standard's neutral sender and registered plus-address requirements. Environment overrides are possible but unverified.

## Standards matrix

| Standard | Present | Evidence | Work needed |
|---|---|---|---|
| Owner footer, computed year, legal links | No | `components/AppLayout.tsx:154–159` | Use VibeShift AI ownership, choose evidence-backed first year, compute current year, link legal pages. |
| Author/copyright head metadata | No | Metadata object is only title, description, metadataBase at `app/layout.tsx:20–24` | Add required owner metadata. |
| Package/license attribution | Incomplete | `package.json:1–48` has no author; file inventory found no LICENSE/humans.txt | Add author; establish intended code license before adding one. |
| Base privacy + accurate site addendum | No | No legal route in app/public inventory; actual inventory below | Reproduce canonical base verbatim; add site-specific collection, purposes, retention, processors, contacts, account actions and effective date. |
| Terms and community rules | No | No terms route; signup at `app/auth/sign-up/page.tsx:40–85` has no legal links | Add canonical base plus community/UGC addendum and expose from signup/footer. |
| Accessibility statement | No | No accessibility route; `app/layout.tsx:29` sets `maximumScale: 1` | Add statement/contact; remove zoom restriction and perform keyboard/mobile accessibility review. |
| Adults 18+ statement | Not found | Signup view at `app/auth/sign-up/page.tsx:40–85` lacks age information | State audience consistently; do not invent an age-verification claim. |
| Sensitive-audience minimal disclosure | Gaps | Broad contact reads above; chat routes send user text to AI services below | Repair access controls, disclose exactly what is logged/sent, adopt neutral mail sender. |
| Reset/magic links | Implemented, not delivery-tested | `lib/firebase/authClient.ts:80–107` | Verify production callback domains, inbox delivery and reset completion. |
| Email change/export/delete reviewed support + receipts | Not found | Profile page offers profile/password/preferences (`app/profile/page.tsx:108–173,246–260`); no support route in API inventory | Connect actual human review and receipt workflow before promising it. |
| Plus-address and app registry | Unverified/missing in app | Default sender `lib/email.ts:25–29`; `project.json:1–27` lacks registry/support fields | Confirm registered slug and working praxis plus-address with support backbone. |
| Feedback widget | Not found in app/components | Root layout `app/layout.tsx:32–43`; footer/layout `components/AppLayout.tsx:154–161`; code search for feedback returned no embed | Register project via supported API and integrate correct widget; inventory its data after integration. |
| Cross-project beta checkbox | Not found | Profile preferences `app/profile/page.tsx:246–248` are email/SMS only | Connect beta flag to shared support/contact system. |
| Donation destination | No active payment/donation integration found | App/components/lib search found no Patreon/payment links | If offered, use single approved VibeShiftAI Patreon; do not add payment provider. |
| security.txt | Not found | Public file inventory has no `.well-known/security.txt` | Add plus-address and one-year expiry after routing verified. |
| Security response headers | Not configured in Next config | `next.config.ts:3–5` only enables strict mode | Add reference headers with narrowly proved CSP allowances; verify production responses. Hosting-level headers are unverified. |
| HTTPS, canonical redirect, DNS | Unverified | `app/layout.tsx:23` and `project.json:24` name HTTPS apex but do not prove redirects/certificates | Verify apex/www/HTTP and choose canonical host. |
| Title/description/favicon/social/SEO | Partial | `app/layout.tsx:20–24`; files `app/icon.png`, `app/opengraph-image.png` exist | Explicit canonical, OG title/description/url, Twitter card, theme color, robots and sitemap absent in source inventory. Validate final generated head rather than assuming image filenames prove all metadata. |
| Analytics | No tracker implementation found in app source | No analytics/Google tag/Cloudflare beacon matches in app/components/lib | Verify actual production/injected scripts and zone. Cloudflare cookieless only if chosen by standard; otherwise none. |
| Cookies/storage disclosure | Needed | `lib/firebase/session.ts:14–18`; `lib/firebase/authClient.ts:24,85–95`; `components/ChatWindow.tsx:345–357`; `app/chat/page.tsx:50,90` | Explain essential sign-in/session and local preferences accurately; do not claim “no storage.” Inspect runtime SDK storage before exhaustive claim. |
| Project record | Exists, stale/incomplete | `project.json:19` still says Supabase while `lib/firebase/client.ts:8–25` initializes Firebase | Record VibeShift AI, platform, DNS/zone, Firebase ID, registry slug, plus-address, legal effective dates. |
| Launch record and before/after evidence | Not assessed outside repo | No launch evidence location established during bounded audit | Archive screenshots and write vault launch note during actual cutover. |

## Code-derived data inventory for the site addendum

| Data/behavior | Actual implementation and purpose | Evidence |
|---|---|---|
| Account email, password authentication, Google sign-in | Firebase Auth creates/signs in accounts; email verification, reset and magic link delivery use Firebase methods. Passwords should not be described as stored in app Firestore. | `lib/firebase/authClient.ts:61–107`; `lib/firebase/client.ts:23–25` |
| Profile name, email, phone, interests, AI experience, user ID and update timestamp | Saved for membership/profile features; directory exposes name/interests/experience in UI but currently fetches whole private-inclusive records. | `app/profile/page.tsx:113–120`; `components/ChatWindow.tsx:408–418`; `lib/directory.ts:14–31` |
| Legacy profile records | Name, email, interests, experience and creation timestamp, if legacy save path/data remains. | `lib/profile.ts:16–31` |
| RSVP event ID/date, account reference and creation time | Attendance registration and reminder selection. | `types/supabase.ts:61–67`; `lib/reminders.ts:40–60`; `firestore.rules:44–49` |
| Alerts contact, opt-in/out state/timestamps, consent IP/source and account association | Email/SMS subscription state; confirmation tokens carry contact/action/channel/expiry. Tokens expiring is not proof records are automatically deleted. | `app/api/alerts/subscribe/route.ts:37–83`; `app/api/alerts/_lib.ts:18–25,49–51,130–147` |
| Queued transactional email contents and delivery status | Recipient email/user ID, subject, HTML/text, send/sent timestamps, errors and attempts. | `types/supabase.ts:152–166`; `lib/reminders.ts:93–95,195–200` |
| Member posts, comments and emoji reactions | Community content linked to authors, events/channels and timestamps; member-readable under current rules. | `types/supabase.ts:72–83,124–136`; `lib/posts.ts:137,250,271`; `firestore.rules:72–85` |
| Member resources | Owner reference, URL, title, description, category/tags and timestamps. `clicks` is annotated future-use; do not claim click tracking is operating based on that field alone. | `types/supabase.ts:172–183`; `lib/resources.ts:25,47` |
| Poll options/votes, ranks; agenda suggestions/votes | Meeting scheduling and topic prioritization linked to account IDs; suggestion author name/title/notes/status stored. | `types/supabase.ts:209–229`; `lib/agendaSuggestions.ts:69–96`; `firestore.rules:111–129` |
| Saved news selections | Account-linked news save records, currently readable by other members. | `firestore.rules:89–95` |
| Concierge messages | Client-supplied message history is sent to OpenAI, augmented with upcoming public event context. This route does not itself persist chat text to Firestore. | `app/api/chat/route.ts:24–69` |
| Invite style and agenda input | Optional invite style; agenda title, description, duration and start time are sent to OpenAI. | `app/api/invite/route.ts:24–49`; `app/api/agenda/draft/route.ts:21–64` |
| Robot generation and history | Admin custom/default prompt sent to selected OpenAI/Anthropic/Google provider. Stored output SVG, model/provider, latency, scores, default/custom marker, admin ID/time. Full custom prompt is not stored by this history write. | `app/api/robot/generate/route.ts:40–95`; `lib/robotProviders.ts:119–129,153–162,189–197` |
| Essential browser/session data | Fourteen-day server session; email temporarily in localStorage to complete magic link; last prompted event and chat last visit in localStorage. Firebase SDK may maintain additional auth persistence requiring runtime inspection. | `lib/firebase/session.ts:14–18`; `lib/firebase/authClient.ts:85–95`; `components/ChatWindow.tsx:345–357`; `app/chat/page.tsx:50,90` |
| IP-based abuse controls | Forwarded IP used for in-memory per-instance buckets; alerts also persist this identifier as consent IP. No cleanup of rate-limit map is shown. Infrastructure access-log contents/retention unverified. | `lib/rateLimit.ts:10–12,21–40,46–51`; `app/api/alerts/subscribe/route.ts:40–41` |

## Third parties proved by source

- **Firebase / Google Cloud**: account authentication and Firestore (`lib/firebase/client.ts:8–25`), Firebase transactional authentication mail (`lib/firebase/authClient.ts:67–107`). Production hosting configuration should be independently confirmed.
- **Resend**: email recipients/content/from/reply-to submitted to its mail API (`lib/email.ts:45–59`); real operation requires configured production credentials and sender.
- **OpenAI**: concierge conversations, invite style, agenda drafts, and robot prompt generation (evidence above).
- **Anthropic and Google Gemini**: robot prompts when admin invokes configured provider (`lib/robotProviders.ts:119–162`). No basis here to say ordinary member profiles are sent to these two services.
- **Google Calendar**: user-initiated external calendar link includes event title, time, description and location (`lib/calendar.ts:64–78`).
- **Cloudflare, feedback provider, Patreon, Buttondown, YouTube**: the standard mentions them, but this audit did not find active integrations in app source. Do not list them as current data processors without deployed/network/config evidence. Add the feedback inventory after the widget is actually integrated.

## Decisions/verification for Robert and launch operator

- Confirm the registered site slug and support plus-address; verify receipt and reply routing. Approve the actual reviewed export/delete/email-change handling and response owner.
- Decide retention periods for account data, user content, consent records, delivery queue/history and operational logs; no comprehensive purge/retention implementation was found. Avoid promises that existing code cannot fulfill.
- Confirm neutral transactional sender wording and production Firebase/Resend sender settings; test with an inbox the operator controls.
- Decide whether SMS is part of today's launch. The current UI collects phone numbers without an implemented confirmation sender in these endpoints.
- Confirm community rules, 18+ audience, moderation/contact ownership and rights to launch content/assets. Use canonical base legal text rather than inventing replacement boilerplate.
- Verify deployed database rules and member-to-member private-data isolation before inviting members; complete the formal independent QA/cutover lane after fixes.
- Confirm production platform/DNS/canonical host, support registry and rollback target. This audit does not establish that live production matches this checkout.

No legal conclusion is asserted: the observations compare code to the supplied operational standard and identify facts needed for accurate public disclosures.
