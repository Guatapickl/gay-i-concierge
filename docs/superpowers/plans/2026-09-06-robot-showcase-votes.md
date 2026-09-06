# Robot showcase and member votes

User requests showcase-only /robot, newest examples first, obvious rank sorting, persistent changeable member votes. Use one upvote per signed-in member per example; toggle on/off. Keep artwork and IDs intact; chronology uses original git addition timestamps, not model-release guesses. Do not touch Claude's news changes or untracked BENCHMARK_PROMPT.md.

Separate metadata from React registry for safe server validation. Authenticated GET returns vote totals and caller's saved choices, never voter identities. Authenticated PUT saves desired voted boolean transactionally to deterministic per-user/robot record; client cannot write directly. Newest and top-voted sort are explicit buttons; equal totals use newest-first. Failed writes retain prior state and show retryable error. No generation calls or paid API use from this page. Existing generation API/history remain untouched.

Implement gallery plus metadata, vote API/storage, privacy rules and inventory. Verify allowed IDs, boolean payload/auth, idempotent upvote/removal, sorting ties, privacy, production build and live member persistence. Deploy directly per standing user authorization. No real member emails or paid generations in QA.
