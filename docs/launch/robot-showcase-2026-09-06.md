# Flagship robot showcase

Robert requests a showcase-only Robot page, newest additions first, an obvious ranked sort, and member votes that persist and can be changed. The four original artwork components and stable IDs are preserved. Original git addition timestamps place Fable 5 first, then Opus 4.5, GPT-5.1 Codex Max and Gemini 3. These are showcase-added dates, not claimed model-release dates.

Newest and Top voted buttons control ordering. Members can support multiple examples with one saved vote each and remove any vote on the page. Vote records are private server-side documents keyed deterministically by robot/member; the authenticated API returns totals and the caller's choices without voter identities. PUT saves the desired boolean state, making retries idempotent. Errors remain visible and do not masquerade as an empty leaderboard. Refresh reloads saved votes.

The page makes no generation or benchmark stats requests. Historical benchmark records/endpoints and the original artwork files remain unchanged. No paid generation or member email is used in testing. Claude's news edits and untracked BENCHMARK_PROMPT.md remain untouched.

Validation: 14 focused sorting/API/storage tests and TypeScript passed; two Firestore emulator suites passed, including browser access denial for vote documents. Independent different-model review passed. Build and live verification follow below.
