# Porting gayiclub.com from Netlify + Supabase to Firebase

Status: **CUT OVER 2026-09-04.** gayiclub.com serves App Hosting (us-east4) via Cloudflare DNS; users and data migrated; reminders scheduler live.

Original plan status: The app now builds against Firebase only;
`@supabase/*`, `netlify/` and `netlify.toml` are gone. Remaining work is console setup (§2), data/user
migration (§4), and the App Hosting deploy + DNS move (§3). gayiclub.com keeps serving the old Netlify build until then.

## 1. Target architecture

| Today (Netlify + Supabase) | Firebase equivalent | Scaffolded |
|---|---|---|
| Netlify build + Next.js plugin | **App Hosting** backend `gayiclub-web` (native Next.js 16 SSR) | `apphosting.yaml`, `firebase.json` |
| Supabase Auth (email+password, magic link, Google, reset) | **Firebase Auth** — same four flows | `lib/firebase/client.ts` |
| `@supabase/ssr` cookie session + middleware refresh | **Session cookie** (`__session`) minted from the ID token | `lib/firebase/session.ts`, `app/api/auth/session/route.ts` |
| Postgres tables + RLS | **Firestore** collections, same names/columns, rules mirror RLS | `firestore.rules`, `firestore.indexes.json` |
| Service-role client in API routes | **Admin SDK** | `lib/firebase/admin.ts` |
| Netlify scheduled function every 10 min | **Cloud Functions v2 `onSchedule`** hitting the same `/api/cron/reminders` | `functions/src/index.ts` |
| Resend for email | unchanged (`lib/email.ts` is provider-agnostic) | — |
| `is_admin()` SQL + `app_admins` table | `app_admins/{uid}` doc existence, checked in rules and Admin SDK | rules + `isAdminUid()` |

Decisions worth knowing:
- **Collections keep Postgres names and snake_case fields** so `types/supabase.ts`, the email templates, and the
  migration script stay 1:1. Rename later if you want; not during the port.
- **Composite-key tables get deterministic doc ids** (`rsvps/{event}_{user}`, `meeting_poll_votes/{poll}_{user}_{option}`,
  `post_reactions/{post}_{user}_{emoji}`, `news_saves/{news}_{user}`, `agenda_suggestion_votes/{sugg}_{user}`).
  That gives you Postgres-style uniqueness for free and makes toggles a single `set`/`delete`.
- **Timestamps become Firestore `Timestamp`**; a tiny `toIso()` helper in the data layer keeps the UI code unchanged.
- **Vote tallies, suggestion counts** are computed client-side today and stay that way (`tallyPoll` is pure).
- **`get_provider_stats` RPC** (robot benchmark) becomes an aggregate query or a counter doc updated by the API route.
- **Magic link**: Firebase's `sendSignInLinkToEmail` + `isSignInWithEmailLink` replaces `signInWithOtp`.
- **Password reset**: Firebase handles the email + landing page itself; `/auth/forgot` calls `sendPasswordResetEmail`
  and `/auth/reset` becomes `confirmPasswordReset(oobCode, newPassword)`. Configure the action URL to
  `https://gayiclub.com/auth/reset` in Auth → Templates so the branded page is used.

## 2. What only you can do (in order)

1. `firebase projects:create gayiclub` (or pick the id and update `.firebaserc` + `apphosting.yaml`), then upgrade
   it to **Blaze** — App Hosting and scheduled functions require it.
2. Console → Build → Authentication → Sign-in methods: enable **Email/Password** (with *Email link* on) and **Google**.
   Add `gayiclub.com` under Authorized domains. Templates → set action URL to `https://gayiclub.com/auth/reset`.
3. Console → Firestore → create database (production mode, `nam5` or `us-east1`).
4. Project settings → add a Web app → paste `apiKey`, `authDomain`, `appId` into `apphosting.yaml` and `.env`.
5. `firebase apphosting:backends:create` → connect GitHub `Guatapickl/gay-i-concierge`, branch `main`, region
   `us-east1`. Then `firebase apphosting:secrets:set` for RESEND_API_KEY, CRON_SECRET, NEWS_INGEST_SECRET,
   OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY.
6. `firebase functions:secrets:set CRON_SECRET` (same value).
7. Service account for local migration: Project settings → Service accounts → generate key → save as
   `service-account.json` in the repo root (gitignored).
8. **Restore the Supabase project first** — the migration script reads from it, and `firebase auth:import` needs
   its `auth.users` export. If Supabase is truly gone, users re-register (their profile data is gone too).

## 3. Deploy commands (after §2)

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
git push origin main          # App Hosting builds from GitHub
```
Then point the `gayiclub.com` DNS at App Hosting (console → App Hosting → Domains) and remove the Netlify site.

## 4. Data + user migration

```bash
# 1) users — export from Supabase SQL editor:
#    select id, email, encrypted_password, raw_user_meta_data from auth.users;  → users.csv
#    Supabase stores bcrypt hashes; Firebase imports them as-is:
firebase auth:import users.json --hash-algo=BCRYPT
#    (users.json: {"users":[{"localId":"<supabase uuid>","email":"…","passwordHash":"<base64 of $2a$… hash>","emailVerified":true}]})
#    Keeping localId = the Supabase uuid means every user_id/profile_id/author_user_id in the data still matches.
#    Google-only users import with no passwordHash and link automatically on their next Google sign-in.

# 2) data
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gayiclub node scripts/migrate-supabase-to-firestore.mjs --dry-run
# …then without --dry-run. Idempotent; --only=events,rsvps to re-run a subset.
```

## 5. Code port — work breakdown

73 files import Supabase. They fall into five buckets; do them in this order so the app keeps building.

| # | Bucket | Files | Notes |
|---|---|---|---|
| 1 | **Data layer** `lib/*.ts` | events, rsvp, posts, news, resources, announcements, directory, interests, profile, polls, agendaSuggestions, isAdmin, reminders, calendar, recurrence | Replace `supabase.from()` chains with Firestore `collection/query/where/orderBy`. Keep every exported function signature identical so pages don't change. `reminders.ts` moves to Admin SDK. |
| 2 | **Auth pages** `app/auth/*` + `components/AuthNav.tsx`, `AvatarMenu.tsx` | 7 | Map: `signInWithPassword→signInWithEmailAndPassword`, `signUp→createUserWithEmailAndPassword + sendEmailVerification`, `signInWithOAuth→signInWithPopup(googleProvider)`, `signInWithOtp→sendSignInLinkToEmail`, `resetPasswordForEmail→sendPasswordResetEmail`, `updateUser({password})→updatePassword`, `onAuthStateChange→onAuthStateChanged`, `getUser→auth.currentUser` (await `authStateReady()`). After every sign-in POST the ID token to `/api/auth/session`; on sign-out DELETE it. `callback/route.ts` goes away. |
| 3 | **Server** `app/page.tsx`, `middleware.ts`, `utils/supabase/*` | 4 | `getServerUser()` in `page.tsx`; middleware just checks the `__session` cookie exists for protected routes (verification happens in server components/API routes). Delete `utils/supabase`. |
| 4 | **API routes** `app/api/**` | 14 | `getSupabaseAdmin()→adminDb()`; caller auth via `userFromRequest(req)` (client sends `await auth.currentUser.getIdToken()` as Bearer, same header shape as today). |
| 5 | **Pages/components still calling `supabase.auth.getUser()` directly** | ~30 | Mostly `const { data } = await supabase.auth.getUser()` → a shared `useCurrentUser()` hook. Mechanical. |

Estimate: buckets 1–4 are one focused day; bucket 5 is a second half-day of find-and-replace plus a full smoke test
against the emulators (`firebase emulators:start`). Remove `@supabase/*`, `netlify/`, `netlify.toml` at the end.

## 6. Testing the port before cutover

- `firebase emulators:start` gives Auth + Firestore locally; set `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=1` and call
  `connectAuthEmulator` / `connectFirestoreEmulator` in `lib/firebase/client.ts` when it's set.
- `firebase emulators:exec --only firestore "npx vitest run"` to run the unit suite with rules enforced.
- Walk the smoke test in `RELAUNCH.md §3` on the App Hosting preview URL before moving DNS.

## 7. As-built (2026-09-04)

- DNS: Cloudflare zone `gayiclub.com` (account vibeshiftai), records unproxied. Token at `~/.cloudflare/dns-token`.
- Hosting: App Hosting backend `gayiclub-web`, **us-east4**, deployed from local source with
  `firebase deploy --only apphosting` (no GitHub connection). Custom domains gayiclub.com + www.
- Secrets (Secret Manager): OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, CRON_SECRET, RESEND_API_KEY, NEWS_INGEST_SECRET.
  Change one with `printf '%s' VALUE | firebase apphosting:secrets:set NAME --data-file - --force`, then redeploy.
- Reminders: Cloud Function `remindersTick` (us-east4) every 10 min → `https://gayiclub.com/api/cron/reminders`.
  `functions/.env` holds `SITE_URL` (gitignored; recreate as `SITE_URL=https://gayiclub.com` on a fresh clone).
- Email: Resend domain `gayiclub.com` — DKIM/SPF/MX on the `send` subdomain + DMARC are in Cloudflare.
- Auth: 8 users imported with bcrypt hashes (localId = Supabase uuid). Praxis admin key: `service-account.json` (praxis-admin, roles/firebase.admin).
- Cortex news bridge: repoint `GAYICLUB_INGEST_URL` to `https://gayiclub.com/api/news/ingest` with the new NEWS_INGEST_SECRET.
