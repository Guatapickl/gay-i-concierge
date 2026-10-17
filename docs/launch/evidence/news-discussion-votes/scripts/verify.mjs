// Signed-in browser check of "I want to talk about this" votes and the agenda
// maker's voted-articles picker. Drives headless Chrome over the DevTools
// protocol through the real sign-in form. Every expectation is asserted; a
// timeout or mismatch exits non-zero and the JSON records the failing step.
// Usage: node verify.mjs --base <url> --email <e> --password <p> --out <dir> --tag emulator|live --role member|admin
//        [--story <newsId>] [--story-b <newsId>] [--event <eventId>] [--port 9350]
//        [--inject-line <text>] (emulator only: another organizer stores <text> on the event between load and save)
//        [--empty-event <eventId>] (emulator only: an upcoming event with no agenda, to check switching events)
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const base = opt('base'), email = opt('email'), password = opt('password'), outDir = opt('out'), tag = opt('tag', 'local'), role = opt('role');
const storyArg = opt('story'), storyB = opt('story-b'), eventId = opt('event'), port = Number(opt('port', '9350'));
const injectLine = opt('inject-line'), emptyEventId = opt('empty-event');
if ((injectLine || emptyEventId) && process.env.QA_MODE !== 'emulator') throw new Error('--inject-line and --empty-event are emulator-only');
const qaCli = (...args) => JSON.parse(execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'qa.mjs'), ...args], { env: process.env, encoding: 'utf8' }).trim().split('\n').pop());
if (!base || !email || !password || !outDir || !['member', 'admin'].includes(role)) throw new Error('missing args');
mkdirSync(outDir, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/news-discussion/profile-${tag}-${role}-${port}`, '--window-size=1280,1600', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const summary = { base, tag, role, email, startedAt: new Date().toISOString(), apiResponses: [], console: [], steps: [] };
const redact = value => { if (typeof value === 'string') return value.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[qa email]'); if (Array.isArray(value)) return value.map(redact); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)])); return value; };
class CheckFailure extends Error { constructor(step, message) { super(`${step}: ${message}`); this.name = 'CheckFailure'; } }
const assert = (step, condition, message) => { if (!condition) throw new CheckFailure(step, message); };
const note = (step, data) => { const clean = redact({ step, ...data }); summary.steps.push(clean); console.log(step, JSON.stringify(clean).slice(0, 500)); };
let diagnose = null; // set once the DevTools helpers exist; used to describe the page when a step fails

try {
  let targets = [];
  for (let i = 0; i < 50 && !targets.length; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* not ready */ } if (!targets.length) await sleep(200); }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let counter = 0; const pending = new Map();
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) summary.console.push({ type: m.params.type, text: m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
    if (m.method === 'Runtime.exceptionThrown') summary.console.push({ type: 'exception', text: String(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? '').slice(0, 300) });
    if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/api/news/discussion')) {
      summary.apiResponses.push({ url: m.params.response.url.replace(base, '').slice(0, 160), status: m.params.response.status, cacheControl: m.params.response.headers['cache-control'] ?? m.params.response.headers['Cache-Control'] ?? null, at: new Date().toISOString() });
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++counter; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const redactDom = () => evaluate(`(() => { const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) { const t = n.nodeValue.replace(/[\\w.+-]+@[\\w-]+\\.[\\w.]+/g, '[qa email]'); if (t !== n.nodeValue) n.nodeValue = t; } return true; })()`);
  const shot = async name => { await redactDom(); const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); note('screenshot', { name }); };
  const viewport = (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  // A navigation in flight has no document.body yet; treat evaluation errors as "not yet" while waiting.
  const waitFor = async (expression, timeoutMs, what = expression) => { const t0 = Date.now(); let lastError = null; while (Date.now() - t0 < timeoutMs) { try { if (await evaluate(expression)) return true; } catch (error) { lastError = error; } await sleep(400); } throw new CheckFailure('wait', `timed out after ${timeoutMs} ms waiting for ${what}${lastError ? ` (last error ${String(lastError.message).slice(0, 120)})` : ''}`); };
  const setTheme = async theme => { await evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}; true`); await sleep(600); };
  const noOverflow = async step => { const m = await evaluate(`({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })`); note(step, m); assert(step, m.scrollWidth <= m.clientWidth, `horizontal overflow ${m.scrollWidth} > ${m.clientWidth}`); };
  const navigate = url => send('Page.navigate', { url });
  // The Firestore client SDK in headless Chrome occasionally stalls its stream against the emulator; one reload gives it a fresh connection.
  const open = async (url, expression, timeoutMs, what) => { await navigate(url); try { await waitFor(expression, timeoutMs, what); } catch (error) { note('retry', { url: url.replace(base, ''), reason: String(error.message).slice(0, 120) }); await navigate(url); await waitFor(expression, timeoutMs * 2, `${what} (after one reload)`); } };
  diagnose = async () => { const page = { url: await evaluate('location.href'), text: await evaluate(`(document.body?.innerText ?? '').replace(/\\s+/g, ' ').slice(0, 500)`) }; await shot(`${tag}-${role}-failure`); return page; };

  // Feed card helpers -------------------------------------------------------
  const cardSel = id => `article[data-news-id=${JSON.stringify(id)}]`;
  const readCard = id => evaluate(`(() => { const card = document.querySelector(${JSON.stringify(cardSel(id))}); if (!card) return null;
    const button = [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'I want to talk about this');
    const box = card.querySelector('[data-discussion]');
    return { title: card.querySelector('h2')?.innerText ?? null, hasButton: !!button, label: button?.textContent.trim() ?? null, pressed: button?.getAttribute('aria-pressed') ?? null, disabled: button?.disabled ?? null,
      state: box?.getAttribute('data-discussion') ?? null, badge: box?.querySelector('.badge')?.innerText.trim() ?? null, status: card.querySelector('[role=status]')?.innerText ?? null, link: card.querySelector('h2 a')?.getAttribute('href') ?? null }; })()`);
  const clickVote = id => evaluate(`(() => { const card = document.querySelector(${JSON.stringify(cardSel(id))}); const b = [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'I want to talk about this'); b.click(); return true; })()`);
  const countOf = card => Number((card.badge ?? '').split(' ')[0]);
  const waitFeed = async () => { await waitFor(`!!document.querySelector('article[data-news-id]') || /No news yet|Unable to load news/.test((document.body?.innerText ?? ''))`, 30000, 'the news feed'); await sleep(800); };
  const waitCard = async (id, predicate, what) => { await waitFor(`(() => { const card = document.querySelector(${JSON.stringify(cardSel(id))}); if (!card) return false; const box = card.querySelector('[data-discussion]'); const b = [...card.querySelectorAll('button')].find(b => b.textContent.trim() === 'I want to talk about this'); const state = box?.getAttribute('data-discussion'); const badge = box?.querySelector('.badge')?.innerText.trim() ?? ''; const pressed = b?.getAttribute('aria-pressed'); return (${predicate})(state, badge, pressed); })()`, 30000, what); return readCard(id); };
  const settled = `(state, badge, pressed) => (state === 'open' || state === 'voted') && /^\\d+ votes?$/.test(badge)`;
  const scrollTo = id => evaluate(`document.querySelector(${JSON.stringify(cardSel(id))})?.scrollIntoView({ block: 'center' }); true`);

  // Agenda maker helpers ----------------------------------------------------
  const readPanel = () => evaluate(`(() => { const panel = document.querySelector('section[data-state]'); if (!panel) return null;
    const rows = [...panel.querySelectorAll('li[data-news-id]')].map(li => ({ id: li.getAttribute('data-news-id'), onDraft: li.getAttribute('data-on-draft'), title: li.querySelector('a')?.innerText.trim() ?? null, link: li.querySelector('a')?.getAttribute('href') ?? null,
      badges: [...li.querySelectorAll('.badge')].map(b => b.innerText.trim()), addLabel: li.querySelector('button')?.innerText.trim() ?? null, addDisabled: li.querySelector('button')?.disabled ?? null }));
    const items = [...document.querySelectorAll('input[placeholder="Agenda item"]')].map(i => i.value);
    const links = [...document.querySelectorAll('p')].filter(p => /Source link kept with this item/.test(p.innerText)).map(p => p.querySelector('a')?.getAttribute('href') ?? null);
    return { state: panel.getAttribute('data-state'), text: panel.innerText.slice(0, 600), rows, items, links, hasSave: /SAVE TO EVENT/.test((document.body?.innerText ?? '')), hasSelect: !!document.querySelector('select[aria-label="Event to save this agenda to"]'), status: [...document.querySelectorAll('[role=status]')].map(p => p.innerText).join(' | '), hidden: ((document.body?.innerText ?? '').match(/\\((\\d+) hidden\\)/) || [])[1] ?? null }; })()`);
  const panelReady = `(() => { const s = document.querySelector('section[data-state]')?.getAttribute('data-state'); return !!s && s !== 'loading'; })()`;
  const waitPanel = async () => { await waitFor(panelReady, 30000, 'the voted articles panel'); await sleep(600); return readPanel(); };
  const openAgenda = async () => { await open(`${base}/agenda`, panelReady, 30000, 'the voted articles panel'); await sleep(600); return readPanel(); };
  const clickAdd = id => evaluate(`(() => { const li = document.querySelector('li[data-news-id=' + ${JSON.stringify(JSON.stringify(id))} + ']'); const b = li.querySelector('button'); if (b.disabled) return 'disabled'; b.click(); return 'clicked'; })()`);
  const chooseEvent = id => evaluate(`(() => { const sel = document.querySelector('select[aria-label="Event to save this agenda to"]'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, ${JSON.stringify(id)}); sel.dispatchEvent(new Event('change', { bubbles: true })); return sel.value; })()`);
  const clickText = (selector, text) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim().startsWith(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`);
  const readEventAgenda = () => evaluate(`(() => ({ heading: document.querySelector('h1')?.innerText ?? null, items: [...document.querySelectorAll('li')].map(li => li.innerText.replace(/\\s+/g, ' ').trim()).filter(t => t.length > 0 && t.length < 400),
    articleLinks: [...document.querySelectorAll('a')].filter(a => /Read the article/.test(a.innerText)).map(a => a.getAttribute('href')) }))()`);

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await viewport(1280, 1600, false);

  // 1. Anonymous: the feed shows no vote action, the agenda panel asks to sign in, the API answers 401.
  await navigate(`${base}/news`); await waitFeed();
  const anonFeed = { path: await evaluate('location.pathname'), voteButtons: await evaluate(`[...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'I want to talk about this').length`), cards: await evaluate(`document.querySelectorAll('article[data-news-id]').length`) };
  note('anonymous-feed', anonFeed);
  assert('anonymous-feed', anonFeed.voteButtons === 0, `signed-out visitors must not see the vote action, saw ${anonFeed.voteButtons}`);
  const anonApi = { get: await evaluate(`fetch('/api/news/discussion').then(r => r.status)`), put: await evaluate(`fetch('/api/news/discussion', { method: 'PUT', body: '{}' }).then(r => r.status)`), bogus: await evaluate(`fetch('/api/news/discussion', { headers: { Authorization: 'Bearer nope' } }).then(r => r.status)`) };
  note('anonymous-api', anonApi);
  assert('anonymous-api', anonApi.get === 401 && anonApi.put === 401 && anonApi.bogus === 401, `expected 401s, got ${JSON.stringify(anonApi)}`);
  await navigate(`${base}/agenda`); const anonPanel = await waitPanel();
  note('anonymous-agenda', { state: anonPanel?.state, rows: anonPanel?.rows.length });
  assert('anonymous-agenda', anonPanel?.state === 'signed-out', `expected the signed-out panel, got ${anonPanel?.state}`);

  // 2. Sign in through the real form.
  await navigate(`${base}/auth/sign-in`);
  await waitFor(`!!document.querySelector('input[type=email]') && !!document.querySelector('input[type=password]')`, 20000, 'the sign-in form');
  // Submit only once React has hydrated the form; a native submit would reload the page instead of signing in.
  await waitFor(`(() => { const form = document.querySelector('input[type=password]')?.closest('form'); return !!form && Object.keys(form).some(k => k.startsWith('__reactProps')); })()`, 20000, 'the sign-in form to hydrate');
  await sleep(500);
  await evaluate(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('input[type=email]'), ${JSON.stringify(email)}); set(document.querySelector('input[type=password]'), ${JSON.stringify(password)}); document.querySelector('form button[type=submit]').click(); return true; })()`);
  await waitFor(`location.pathname !== '/auth/sign-in'`, 25000, 'sign-in to leave /auth/sign-in'); await sleep(1500);
  const hasSession = (await send('Network.getCookies', { urls: [base] })).cookies.some(c => c.name === '__session');
  note('sign-in', { path: await evaluate('location.pathname'), sessionCookie: hasSession });
  assert('sign-in', hasSession, 'expected a __session cookie after sign-in');

  // 3. The feed: vote, persist across reload, withdraw, persist, vote again.
  await navigate(`${base}/news`); await waitFeed();
  const storyId = storyArg ?? await evaluate(`document.querySelector('article[data-news-id]')?.getAttribute('data-news-id') ?? null`);
  assert('feed', !!storyId, 'no story card on the feed');
  let card = await waitCard(storyId, settled, 'the vote badge to settle');
  note('feed-card', { storyId, ...card });
  assert('feed-card', card.hasButton && card.label === 'I want to talk about this' && /^\d+ votes?$/.test(card.badge), `expected the exact action and a numeric total, got ${JSON.stringify(card)}`);
  if (card.pressed === 'true') { await clickVote(storyId); card = await waitCard(storyId, `(s, b, p) => p === 'false' && /^\\d+ votes?$/.test(b)`, 'a leftover vote to be withdrawn'); note('feed-reset', card); }
  const before = countOf(card);
  await clickVote(storyId);
  card = await waitCard(storyId, `(s, b, p) => p === 'true' && b === ${JSON.stringify(`${before + 1} ${before + 1 === 1 ? 'vote' : 'votes'}`)}`, `the vote to register (${before + 1})`);
  note('feed-vote', card);
  assert('feed-vote', card.pressed === 'true' && countOf(card) === before + 1 && /Counted/.test(card.status ?? ''), `expected pressed with ${before + 1}, got ${JSON.stringify(card)}`);
  await scrollTo(storyId); await sleep(400); await shot(`${tag}-${role}-news-desktop-dark`); await setTheme('light'); await shot(`${tag}-${role}-news-desktop-light`); await setTheme('dark');
  await navigate(`${base}/news`); await waitFeed(); card = await waitCard(storyId, settled, 'the badge after reload');
  note('feed-reload', card);
  assert('feed-reload', card.pressed === 'true' && countOf(card) === before + 1, `vote did not persist across reload: ${JSON.stringify(card)}`);
  await clickVote(storyId);
  card = await waitCard(storyId, `(s, b, p) => p === 'false' && b === ${JSON.stringify(`${before} ${before === 1 ? 'vote' : 'votes'}`)}`, `the vote to be withdrawn (${before})`);
  note('feed-withdraw', card);
  assert('feed-withdraw', card.pressed === 'false' && countOf(card) === before && /withdrawn/i.test(card.status ?? ''), `expected withdrawn with ${before}, got ${JSON.stringify(card)}`);
  await navigate(`${base}/news`); await waitFeed(); card = await waitCard(storyId, settled, 'the badge after the second reload');
  note('feed-reload-2', card);
  assert('feed-reload-2', card.pressed === 'false' && countOf(card) === before, `withdrawal did not persist: ${JSON.stringify(card)}`);
  await clickVote(storyId);
  card = await waitCard(storyId, `(s, b, p) => p === 'true'`, 'the vote to register again');
  assert('feed-vote-2', countOf(card) === before + 1, `expected ${before + 1} after voting again, got ${JSON.stringify(card)}`);
  const storyLink = card.link;
  if (storyB) { await clickVote(storyB); const b = await waitCard(storyB, `(s, b, p) => p === 'true'`, 'story B vote'); note('feed-vote-b', b); }
  await viewport(390, 844, true); await navigate(`${base}/news`); await waitFeed(); await waitCard(storyId, settled, 'mobile badge'); await scrollTo(storyId); await sleep(500);
  await shot(`${tag}-${role}-news-mobile-dark`); await setTheme('light'); await shot(`${tag}-${role}-news-mobile-light`); await setTheme('dark');
  await noOverflow('news-mobile');

  // 4. Agenda maker: the voted story is listed with its count; adding is explicit and idempotent.
  await viewport(1280, 1600, false); await navigate(`${base}/agenda`);
  let panel = await waitPanel();
  note('agenda-panel', { state: panel.state, rows: panel.rows, hasSave: panel.hasSave, hasSelect: panel.hasSelect, hidden: panel.hidden });
  assert('agenda-panel', panel.state === 'ready', `expected the ready panel, got ${panel.state}: ${panel.text.slice(0, 200)}`);
  let row = panel.rows.find(r => r.id === storyId);
  assert('agenda-panel', !!row && row.onDraft === 'false' && row.addDisabled === false && row.badges.some(b => b === `${before + 1} ${before + 1 === 1 ? 'vote' : 'votes'}`) && row.link === storyLink, `expected story ${storyId} with ${before + 1} vote(s), got ${JSON.stringify(row)}`);
  assert('agenda-panel', panel.hasSave === (role === 'admin' && panel.hasSelect), `save card visibility ${panel.hasSave} does not match role ${role}`);
  const ranked = panel.rows.map(r => Number(r.badges.find(b => /votes?$/.test(b))?.split(' ')[0] ?? 0));
  assert('agenda-order', ranked.every((n, i) => i === 0 || ranked[i - 1] >= n), `rows are not ordered by votes: ${JSON.stringify(ranked)}`);
  if (eventId) {
    assert('agenda-select', panel.hasSelect, 'organizer run expected the event selector');
    await chooseEvent(eventId); await sleep(600);
    panel = await readPanel();
    note('agenda-select', { status: panel.status, items: panel.items });
    assert('agenda-select', /Loaded 2 saved items/.test(panel.status) && panel.items.join('|') === 'Welcome & introductions|Existing feature talk', `expected the saved agenda to replace the untouched template, got ${JSON.stringify({ status: panel.status, items: panel.items })}`);
  }
  assert('agenda-add', (await clickAdd(storyId)) === 'clicked', 'Add button was not clickable');
  await waitFor(`document.querySelector('li[data-news-id=' + ${JSON.stringify(JSON.stringify(storyId))} + ']')?.getAttribute('data-on-draft') === 'true'`, 10000, 'the row to become "on this agenda"');
  panel = await readPanel(); row = panel.rows.find(r => r.id === storyId);
  note('agenda-add', { row, items: panel.items, links: panel.links, status: panel.status });
  assert('agenda-add', row.onDraft === 'true' && row.addDisabled === true && row.addLabel === 'Added' && row.badges.includes('On this agenda') && panel.items.filter(t => t === row.title).length === 1 && panel.links.includes(storyLink), `expected one draft item with the link, got ${JSON.stringify({ row, items: panel.items, links: panel.links })}`);
  assert('agenda-add-again', (await clickAdd(storyId)) === 'disabled', 'a second Add must be disabled');
  panel = await readPanel();
  assert('agenda-add-again', panel.items.filter(t => t === row.title).length === 1, 'a second Add must not duplicate the item');
  await shot(`${tag}-${role}-agenda-desktop-dark`); await setTheme('light'); await shot(`${tag}-${role}-agenda-desktop-light`); await setTheme('dark');
  if (storyB) {
    assert('agenda-hidden', panel.hidden === '1' && !panel.rows.some(r => r.id === storyB), `expected story B hidden as already discussed, got hidden=${panel.hidden} rows=${panel.rows.map(r => r.id)}`);
    await evaluate(`(() => { const box = [...document.querySelectorAll('input[type=checkbox]')].find(i => /Hide stories already discussed/.test(i.parentElement.innerText)); box.click(); return true; })()`); await sleep(400);
    panel = await readPanel(); const rowB = panel.rows.find(r => r.id === storyB);
    note('agenda-show-discussed', { rowB });
    assert('agenda-show-discussed', !!rowB && rowB.badges.some(b => /^Discussed /.test(b)), `expected story B with a Discussed badge, got ${JSON.stringify(rowB)}`);
  }
  const waitSaved = async step => {
    try { await waitFor(`[...document.querySelectorAll('[role=status]')].some(p => /Saved to event/.test(p.innerText))`, 60000, `${step}: the save confirmation`); }
    catch (error) { note(step, { diagnostics: await readPanel(), buttons: await evaluate(`[...document.querySelectorAll('button')].map(b => b.innerText.trim() + (b.disabled ? ' [disabled]' : '')).filter(t => /Sav/.test(t))`), console: summary.console.slice(-5) }); throw error; }
  };
  // Lines expected on the first meeting after the save: the two seeded ones, the story, and (when injected) the other organizer's line.
  const saved = ['Welcome & introductions', 'Existing feature talk', row.title];
  if (eventId) {
    // Another organizer stores a line while this draft is open; the save must keep it.
    if (injectLine) {
      const injected = qaCli('appendAgendaLine', eventId, injectLine);
      note('agenda-inject', injected);
      assert('agenda-inject', injected.appended === injectLine && injected.count === 3, `expected the stored agenda to grow to 3 lines, got ${JSON.stringify(injected)}`);
      saved.push(injectLine);
    }
    // Save, reopen the event (detail + full agenda), then save again and prove no duplicate.
    assert('agenda-save', await clickText('button', 'Save agenda'), 'no Save agenda button');
    await waitSaved('agenda-save');
    panel = await readPanel();
    note('agenda-save', { status: panel.status, items: panel.items });
    if (injectLine) assert('agenda-save', /Kept 1 item another editor added/.test(panel.status) && panel.items.join('|') === saved.join('|'), `expected the other editor's line to be kept and shown, got ${JSON.stringify({ status: panel.status, items: panel.items })}`);
    else assert('agenda-save', /Saved to event/.test(panel.status) && !/Kept/.test(panel.status), `unexpected save status ${panel.status}`);
    for (const path of [`/events/${eventId}`, `/events/${eventId}/agenda`]) {
      await open(`${base}${path}`, `!/Loading (event|agenda)/.test((document.body?.innerText ?? '')) && !!document.querySelector('h1')`, 30000, `${path} to load`); await sleep(800);
      const view = await readEventAgenda();
      note(`event-view:${path}`, view);
      assert(`event-view:${path}`, saved.every(title => view.items.some(t => t.includes(title))) && view.articleLinks.filter(h => h === storyLink).length === 1, `expected ${JSON.stringify(saved)} with exactly one article link, got ${JSON.stringify(view)}`);
      if (path.endsWith('/agenda')) { await shot(`${tag}-${role}-event-agenda-desktop-dark`); await setTheme('light'); await shot(`${tag}-${role}-event-agenda-desktop-light`); await setTheme('dark'); }
      else { await shot(`${tag}-${role}-event-detail-desktop-dark`); }
    }
    panel = await openAgenda();
    await chooseEvent(eventId); await sleep(600); panel = await readPanel(); row = panel.rows.find(r => r.id === storyId);
    note('agenda-reopen', { status: panel.status, row, items: panel.items });
    assert('agenda-reopen', row.onDraft === 'true' && row.addDisabled === true && row.badges.some(b => /Planned for|On this agenda/.test(b)) && new RegExp(`Loaded ${saved.length} saved items`).test(panel.status) && panel.items.join('|') === saved.join('|'), `expected the saved agenda (with the story) to load as the draft, got ${JSON.stringify({ row, items: panel.items, status: panel.status })}`);
    assert('agenda-save-2', await clickText('button', 'Save agenda'), 'no Save agenda button');
    await waitSaved('agenda-save-2');
    await open(`${base}/events/${eventId}/agenda`, `!/Loading agenda/.test((document.body?.innerText ?? '')) && !!document.querySelector('h1')`, 30000, 'the agenda page after the second save'); await sleep(800);
    const again = await readEventAgenda(); note('event-view-after-resave', again);
    assert('event-view-after-resave', again.articleLinks.filter(h => h === storyLink).length === 1 && saved.every(title => again.items.some(t => t.includes(title))), `expected exactly one article link and every line after saving twice, got ${JSON.stringify(again)}`);
  }
  if (eventId && emptyEventId && storyB) {
    // Switching from a meeting with a saved agenda to one without: the lines loaded from the first
    // meeting stay with it, the story the organizer picked stays in the draft, and saving writes
    // only that story to the empty meeting.
    panel = await openAgenda();
    await chooseEvent(eventId); await sleep(600); panel = await readPanel();
    assert('agenda-switch', new RegExp(`Loaded ${saved.length} saved items`).test(panel.status), `expected the first meeting's ${saved.length} lines to load, got ${panel.status}`);
    const loadedCount = panel.items.length;
    await evaluate(`(() => { const box = [...document.querySelectorAll('input[type=checkbox]')].find(i => /Hide stories already discussed/.test(i.parentElement.innerText)); if (box.checked) box.click(); return true; })()`); await sleep(400);
    assert('agenda-switch', (await clickAdd(storyB)) === 'clicked', 'story B Add button was not clickable');
    await waitFor(`document.querySelector('li[data-news-id=' + ${JSON.stringify(JSON.stringify(storyB))} + ']')?.getAttribute('data-on-draft') === 'true'`, 10000, 'story B to join the draft');
    panel = await readPanel(); const rowB = panel.rows.find(r => r.id === storyB);
    note('agenda-switch-before', { items: panel.items, rowB });
    assert('agenda-switch-before', panel.items.length === loadedCount + 1 && panel.items[loadedCount] === rowB.title, `expected story B appended to the loaded agenda, got ${JSON.stringify(panel.items)}`);
    await chooseEvent(emptyEventId); await sleep(600); panel = await readPanel();
    note('agenda-switch-empty', { status: panel.status, items: panel.items, links: panel.links });
    assert('agenda-switch-empty', panel.items.join('|') === rowB.title && panel.links.length === 1 && panel.links[0] === rowB.link && /has no saved agenda yet/.test(panel.status) && new RegExp(`${loadedCount} items loaded from the previous event stay with that event`).test(panel.status), `expected only story B in the draft with its link, got ${JSON.stringify({ status: panel.status, items: panel.items, links: panel.links })}`);
    await shot(`${tag}-${role}-agenda-switch-empty`);
    assert('agenda-save-empty', await clickText('button', 'Save agenda'), 'no Save agenda button');
    await waitSaved('agenda-save-empty');
    panel = await readPanel(); note('agenda-save-empty', { status: panel.status, items: panel.items });
    assert('agenda-save-empty', /^Saved to event$/.test(panel.status.trim()) && panel.items.join('|') === rowB.title, `expected a plain save of story B only, got ${JSON.stringify({ status: panel.status, items: panel.items })}`);
    await open(`${base}/events/${emptyEventId}/agenda`, `!/Loading agenda/.test((document.body?.innerText ?? '')) && !!document.querySelector('h1')`, 30000, 'the empty meeting agenda page'); await sleep(800);
    const emptyView = await readEventAgenda(); note('event-view-empty-meeting', emptyView);
    assert('event-view-empty-meeting', emptyView.articleLinks.length === 1 && emptyView.articleLinks[0] === rowB.link && emptyView.items.some(t => t.includes(rowB.title)) && !emptyView.items.some(t => /Existing feature talk|Welcome & introductions/.test(t)), `expected only story B on the second meeting, got ${JSON.stringify(emptyView)}`);
    // Back on the first meeting nothing moved: its agenda still loads in full.
    panel = await openAgenda(); await chooseEvent(eventId); await sleep(600); panel = await readPanel();
    note('agenda-switch-back', { status: panel.status, items: panel.items });
    assert('agenda-switch-back', panel.items.length === loadedCount && !panel.items.includes(rowB.title), `expected the first meeting's ${loadedCount} lines without story B, got ${JSON.stringify(panel.items)}`);
  }
  await viewport(390, 844, true); await navigate(`${base}/agenda`); await waitPanel(); await sleep(400);
  await evaluate(`document.querySelector('section[data-state]')?.scrollIntoView({ block: 'start' }); true`); await sleep(300);
  await shot(`${tag}-${role}-agenda-mobile-dark`); await setTheme('light'); await shot(`${tag}-${role}-agenda-mobile-light`); await setTheme('dark');
  await noOverflow('agenda-mobile');

  // 5. Sign out. Every API response Chrome saw must be a 200 after sign-in or a 401 before it.
  await viewport(1280, 1600, false); await navigate(`${base}/`); await sleep(800);
  const signOut = await evaluate(`fetch('/api/auth/session', { method: 'DELETE' }).then(r => r.status)`);
  note('sign-out', { status: signOut });
  assert('sign-out', signOut === 200, `expected sign-out 200, got ${signOut}`);
  const statuses = summary.apiResponses.map(r => r.status);
  assert('api-responses', statuses.includes(200) && statuses.every(s => [200, 401].includes(s)) && summary.apiResponses.every(r => /no-store/.test(r.cacheControl ?? '')), `unexpected /api/news/discussion responses: ${JSON.stringify(summary.apiResponses)}`);
  summary.storyId = storyId; summary.storyLink = storyLink; summary.result = 'passed'; summary.finishedAt = new Date().toISOString(); summary.email = redact(summary.email);
  writeFileSync(`${outDir}/${tag}-${role}-check.json`, JSON.stringify(summary, null, 2));
  ws.close();
} catch (error) {
  summary.result = 'failed'; summary.failure = String(error?.message ?? error); summary.finishedAt = new Date().toISOString(); summary.email = redact(summary.email);
  if (diagnose) summary.failurePage = redact(await diagnose().catch(e => ({ diagnosticsFailed: String(e?.message ?? e) })));
  writeFileSync(`${outDir}/${tag}-${role}-check.json`, JSON.stringify(summary, null, 2));
  console.error(`CHECK FAILED: ${summary.failure}`);
  process.exitCode = 1;
} finally {
  chrome.kill('SIGTERM');
}
