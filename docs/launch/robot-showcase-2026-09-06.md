# Flagship robot showcase

Robert requests a showcase-only Robot page, newest additions first, an obvious ranked sort, and member votes that persist and can be changed. The four original artwork components and stable IDs are preserved. Original git addition timestamps place Fable 5 first, then Opus 4.5, GPT-5.1 Codex Max and Gemini 3. These are showcase-added dates, not claimed model-release dates.

Newest and Top voted buttons control ordering. Members can support multiple examples with one saved vote each and remove any vote on the page. Vote records are private server-side documents keyed deterministically by robot/member; the authenticated API returns totals and the caller's choices without voter identities. PUT saves the desired boolean state, making retries idempotent. Errors remain visible and do not masquerade as an empty leaderboard. Refresh reloads saved votes.

The page makes no generation or benchmark stats requests. Historical benchmark records/endpoints and the original artwork files remain unchanged. No paid generation or member email is used in testing. Claude's news edits and untracked BENCHMARK_PROMPT.md remain untouched.

Validation: 14 focused sorting/API/storage tests and TypeScript passed; two Firestore emulator suites passed, including browser access denial for vote documents. Independent different-model review passed. Build and live verification follow below.

Release source: 051c797. Production build and scoped lint passed; full unit suite passed 194 tests. Sorting uses actual repository addition timestamps. Canonical checkout was fast-forwarded without staging or changing Claude's unrelated working files.

Final release source: d8abe5c (adds Flagship Showcase browser metadata). Firebase App Hosting rollout completed successfully; gayiclub-web-build-2026-09-06-011 serves 100% of traffic. Cloud Build 675cda7d-248f-458e-a28e-f20fca2fa4e2 succeeded. Matching Firestore rules were deployed with the feature release.

Live browser verification confirmed newest-first order, saving a Gemini vote across a full reload, moving Gemini to first place with Top voted, removing that saved vote, and returning to Newest. Mobile sorting and light/dark display were checked without horizontal overflow. The authenticated API returned only totals and the current member's choices; unauthenticated reads returned 401 and direct Firestore vote reads returned 403. The temporary QA account was deleted and its vote removed. No emails or paid model calls were made.

Claude subsequently created a separate fix/spin-slow-float-animations branch in the canonical checkout. That branch and its untracked benchmark prompt were left intact; this release does not include its unmerged animation changes.
