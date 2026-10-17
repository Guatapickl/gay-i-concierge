// Node-side checks that the browser cannot show: concurrent duplicate votes do
// not inflate the total, and the vote collection is closed to the client SDK
// even for the voter. Usage:
//   node probe.mjs --base <url> --email <e> --password <p> --story <newsId> --out <dir> --tag emulator|live
// Emulator mode is selected by FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST being set.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const require = createRequire('/Volumes/Projects/gay-i-concierge/package.json');
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, setDoc, terminate } = require('firebase/firestore');

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const base = opt('base'), email = opt('email'), password = opt('password'), story = opt('story'), outDir = opt('out'), tag = opt('tag', 'local');
if (!base || !email || !password || !story || !outDir) throw new Error('missing args');
mkdirSync(outDir, { recursive: true });
const emulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
const env = Object.fromEntries(require('node:fs').readFileSync('/Volumes/Projects/gay-i-concierge/.env', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const config = emulator
  ? { projectId: 'demo-gayiclub', apiKey: 'demo-key' }
  : { apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, appId: env.NEXT_PUBLIC_FIREBASE_APP_ID };
const app = initializeApp(config, `probe-${Date.now()}`);
const auth = getAuth(app); const db = getFirestore(app);
if (emulator) { connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080); }
const summary = { base, tag, story, startedAt: new Date().toISOString(), checks: {} };
const fail = (name, message) => { throw new Error(`${name}: ${message}`); };
try {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const token = await user.getIdToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const put = voted => fetch(`${base}/api/news/discussion`, { method: 'PUT', headers, body: JSON.stringify({ newsId: story, voted }) }).then(async r => ({ status: r.status, body: await r.json() }));
  const get = () => fetch(`${base}/api/news/discussion?ids=${encodeURIComponent(story)}`, { headers }).then(async r => ({ status: r.status, body: await r.json() }));

  // 1. Baseline: withdraw, read the total without this member.
  const reset = await put(false);
  if (reset.status !== 200) fail('reset', JSON.stringify(reset));
  const baseline = reset.body.count;
  // 2. Eight identical concurrent votes: every request succeeds, the total grows by exactly one.
  const burst = await Promise.all(Array.from({ length: 8 }, () => put(true)));
  const after = await get();
  summary.checks.concurrentVotes = { baseline, statuses: burst.map(b => b.status), counts: burst.map(b => b.body.count), listed: after.body.articles?.find(a => a.news_id === story) ?? null };
  if (!burst.every(b => b.status === 200 && b.body.count === baseline + 1 && b.body.voted_by_me === true)) fail('concurrentVotes', JSON.stringify(summary.checks.concurrentVotes));
  if (after.status !== 200 || summary.checks.concurrentVotes.listed?.count !== baseline + 1) fail('concurrentVotes', `listed total ${JSON.stringify(after.body)} should be ${baseline + 1}`);
  // 3. Concurrent withdrawals: back to the baseline, never below.
  const withdrawals = await Promise.all(Array.from({ length: 4 }, () => put(false)));
  summary.checks.concurrentWithdrawals = { statuses: withdrawals.map(w => w.status), counts: withdrawals.map(w => w.body.count) };
  if (!withdrawals.every(w => w.status === 200 && w.body.count === baseline && w.body.voted_by_me === false)) fail('concurrentWithdrawals', JSON.stringify(summary.checks.concurrentWithdrawals));
  // 4. Bad input never writes: unknown story 404, malformed 400, oversized 413.
  const bad = { unknown: (await fetch(`${base}/api/news/discussion`, { method: 'PUT', headers, body: JSON.stringify({ newsId: 'no-such-story', voted: true }) })).status, malformed: (await fetch(`${base}/api/news/discussion`, { method: 'PUT', headers, body: '{"newsId":' })).status, oversized: (await fetch(`${base}/api/news/discussion`, { method: 'PUT', headers, body: 'x'.repeat(2001) })).status, badIds: (await fetch(`${base}/api/news/discussion?ids=bad%20id`, { headers })).status };
  summary.checks.badInput = bad;
  if (bad.unknown !== 404 || bad.malformed !== 400 || bad.oversized !== 413 || bad.badIds !== 400) fail('badInput', JSON.stringify(bad));
  // 5. The response never names voters.
  await put(true);
  const listed = await get();
  const text = JSON.stringify(listed.body);
  summary.checks.noIdentity = { containsUid: text.includes(user.uid), containsEmail: text.includes(email), keys: Object.keys(listed.body.articles?.[0] ?? {}) };
  if (summary.checks.noIdentity.containsUid || summary.checks.noIdentity.containsEmail) fail('noIdentity', text.slice(0, 200));
  // 6. Firestore rules: the voter cannot read, list or write vote documents directly.
  const id = createHash('sha256').update(JSON.stringify([story, user.uid])).digest('hex');
  const code = async fn => { try { await fn(); return 'allowed'; } catch (e) { return e.code ?? String(e); } };
  summary.checks.rules = { read: await code(() => getDoc(doc(db, 'news_discussion_votes', id))), list: await code(() => getDocs(collection(db, 'news_discussion_votes'))), write: await code(() => setDoc(doc(db, 'news_discussion_votes', `forged-${user.uid}`), { news_id: story, user_id: user.uid })) };
  if (Object.values(summary.checks.rules).some(v => v !== 'permission-denied')) fail('rules', JSON.stringify(summary.checks.rules));
  summary.result = 'passed';
} catch (error) {
  summary.result = 'failed'; summary.failure = String(error?.message ?? error);
  console.error(`PROBE FAILED: ${summary.failure}`);
  process.exitCode = 1;
} finally {
  summary.finishedAt = new Date().toISOString();
  writeFileSync(`${outDir}/${tag}-probe.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.checks));
  await terminate(db).catch(() => {});
  process.exit(process.exitCode ?? 0);
}
