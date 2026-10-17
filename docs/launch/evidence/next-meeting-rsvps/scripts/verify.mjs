// Signed-in browser check of the organizer "Next meeting RSVPs" view.
// Usage: node verify.mjs --base <url> --email <e> --password <p> --out <dir> --expect admin|member [--event <id>] [--toggle-uid <uid>] [--port 9340] [--tag live|local]
// Drives headless Chrome over the DevTools protocol: signs in through the real
// /auth/sign-in form, records every /api/events/attendees response status,
// captures the RSVP page (desktop + mobile, both themes), checks the three entry
// links, and optionally adds/removes a synthetic RSVP row for --toggle-uid to
// prove the Refresh button reflects changes. Never RSVPs through the app UI.
// Every expectation is asserted: a wait that times out or an observation that
// does not match the role's expected authorization state exits non-zero.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (name, fallback = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const base = opt('base'), email = opt('email'), password = opt('password'), outDir = opt('out'), expect = opt('expect');
const eventId = opt('event'), toggleUid = opt('toggle-uid'), port = Number(opt('port', '9340')), tag = opt('tag', 'local');
if (!base || !email || !password || !outDir || !['admin', 'member'].includes(expect)) throw new Error('missing args');
mkdirSync(outDir, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=/tmp/rsvp-view/profile-${tag}-${expect}-${port}`, '--window-size=1280,1400', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const summary = { base, expect, email, startedAt: new Date().toISOString(), apiResponses: [], steps: [] };
const secrets = [];
if (eventId) { const { getEventLocation } = await import('./qa.mjs'); const loc = await getEventLocation(eventId); if (loc) secrets.push(loc); }
const redactText = value => { if (typeof value === 'string') { let t = value; for (const s of secrets) t = t.split(s).join('[private location]'); return t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[member email]'); } if (Array.isArray(value)) return value.map(redactText); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactText(v)])); return value; };
class CheckFailure extends Error { constructor(step, message) { super(`${step}: ${message}`); this.name = 'CheckFailure'; } }
const assert = (step, condition, message) => { if (!condition) throw new CheckFailure(step, message); };
const note = (step, data) => { const clean = redactText({ step, ...data }); summary.steps.push(clean); console.log(step, JSON.stringify(clean).slice(0, 600)); };

try {
  let targets = [];
  for (let i = 0; i < 50 && !targets.length; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* not ready */ } if (!targets.length) await sleep(200); }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let counter = 0; const pending = new Map();
  ws.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }
    if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/api/events/attendees')) {
      summary.apiResponses.push({ url: m.params.response.url.replace(base, ''), status: m.params.response.status, cacheControl: m.params.response.headers['cache-control'] ?? m.params.response.headers['Cache-Control'] ?? null, at: new Date().toISOString() });
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++counter; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const redactDom = async () => { if (!secrets.length) return; await evaluate(`(() => { const secrets = ${JSON.stringify(secrets)}; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) { let t = n.nodeValue; for (const s of secrets) t = t.split(s).join('[private location]'); t = t.replace(/[\\w.+-]+@[\\w-]+\\.[\\w.]+/g, '[member email]'); if (t !== n.nodeValue) n.nodeValue = t; } return true; })()`); };
  const shot = async name => { await redactDom(); const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64')); note('screenshot', { name }); };
  const viewport = (width, height, mobile) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  const waitFor = async (expression, timeoutMs, what = expression) => { const t0 = Date.now(); while (Date.now() - t0 < timeoutMs) { if (await evaluate(expression)) return true; await sleep(400); } throw new CheckFailure('wait', `timed out after ${timeoutMs} ms waiting for ${what}`); };
  const setTheme = async theme => { await evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}; true`); await sleep(600); };
  const readView = () => evaluate(`(() => {
    const state = document.querySelector('[data-state]')?.getAttribute('data-state') ?? (document.body.innerText.includes('Loading RSVPs') ? 'loading' : null);
    const rows = [...document.querySelectorAll('ol[aria-label="Attendees"] li')].map(li => li.innerText.replace(/\\s+/g, ' ').trim());
    const badge = [...document.querySelectorAll('.badge')].map(b => b.innerText.trim());
    return { path: location.pathname + location.search, state, heading: document.querySelector('h1')?.innerText ?? null, meeting: document.querySelector('section.card h2')?.innerText ?? null,
      badges: badge, rows, hasSelect: !!document.querySelector('select[aria-label="Meeting"]'), text: document.body.innerText.slice(0, 1500) };
  })()`);
  const waitView = async () => { await waitFor(`!!document.querySelector('[data-state]') || /Sign in to see RSVPs/.test(document.body.innerText)`, 30000, 'the RSVP view to settle'); await sleep(800); return readView(); };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await viewport(1280, 1400, false);

  // 1. Unauthenticated: the page must redirect to sign-in and the API must answer 401.
  await send('Page.navigate', { url: `${base}/events/rsvps` });
  await waitFor(`location.pathname === '/auth/sign-in'`, 20000, 'anonymous redirect to /auth/sign-in');
  const anonymousPath = await evaluate('location.pathname');
  note('anonymous-page', { path: anonymousPath });
  assert('anonymous-page', anonymousPath === '/auth/sign-in', `expected redirect to /auth/sign-in, got ${anonymousPath}`);
  const anonApi = await evaluate(`fetch('/api/events/attendees').then(r => r.status)`);
  const bogusApi = await evaluate(`fetch('/api/events/attendees', { headers: { Authorization: 'Bearer not-a-token' } }).then(r => r.status)`);
  note('anonymous-api', { noAuth: anonApi, bogusBearer: bogusApi });
  assert('anonymous-api', anonApi === 401 && bogusApi === 401, `expected 401/401, got ${anonApi}/${bogusApi}`);

  // 2. Sign in through the real form.
  await waitFor(`!!document.querySelector('input[type=email]') && !!document.querySelector('input[type=password]')`, 20000, 'the sign-in form');
  await evaluate(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('input[type=email]'), ${JSON.stringify(email)}); set(document.querySelector('input[type=password]'), ${JSON.stringify(password)});
    document.querySelector('form button[type=submit]').click(); return true; })()`);
  const away = await waitFor(`location.pathname !== '/auth/sign-in'`, 25000, 'sign-in to leave /auth/sign-in');
  await sleep(1500);
  const signedInPath = await evaluate('location.pathname');
  const hasSession = (await send('Network.getCookies', { urls: [base] })).cookies.some(c => c.name === '__session');
  note('sign-in', { redirectedAway: away, path: signedInPath, sessionCookie: hasSession });
  assert('sign-in', away && hasSession, `expected to leave the sign-in page with a __session cookie (path ${signedInPath}, cookie ${hasSession})`);
  // Session cookie alone must not unlock the API (it needs a bearer token).
  const cookieOnly = await evaluate(`fetch('/api/events/attendees').then(r => r.status)`);
  note('cookie-only-api', { status: cookieOnly });
  assert('cookie-only-api', cookieOnly === 401, `session cookie alone must not unlock the API, got ${cookieOnly}`);
  const isAdmin = expect === 'admin';

  // 3. Dashboard entry link.
  await send('Page.navigate', { url: `${base}/` });
  await waitFor(`!!document.querySelector('h1') && !/Loading your dashboard/.test(document.body.innerText)`, 30000, 'the dashboard'); await sleep(1500);
  const dashboard = { heading: await evaluate(`document.querySelector('h1')?.innerText`), rsvpLink: await evaluate(`!![...document.querySelectorAll('a[href="/events/rsvps"]')].length`), nextMeetup: await evaluate(`document.querySelector('section.card h3')?.innerText ?? null`) };
  note('dashboard', dashboard);
  assert('dashboard', dashboard.rsvpLink === (isAdmin && dashboard.nextMeetup !== null), `RSVP link ${dashboard.rsvpLink} but role ${expect} with next meetup ${JSON.stringify(dashboard.nextMeetup)}`);
  await shot(`${tag}-${expect}-dashboard`);

  // 4. Events list entry link.
  await send('Page.navigate', { url: `${base}/events` });
  await waitFor(`!/Loading events/.test(document.body.innerText) && !!document.querySelector('h1')`, 30000, 'the events list'); await sleep(1000);
  const eventsList = { rsvpLink: await evaluate(`!!document.querySelector('a[href="/events/rsvps"]')`), newEvent: await evaluate(`!!document.querySelector('a[href="/events/new"]')`) };
  note('events-list', eventsList);
  assert('events-list', eventsList.rsvpLink === isAdmin && eventsList.newEvent === isAdmin, `expected admin-only links to be ${isAdmin}, got ${JSON.stringify(eventsList)}`);

  // 5. Event detail entry link (when an event id is known).
  if (eventId) {
    await send('Page.navigate', { url: `${base}/events/${eventId}` });
    await waitFor(`!/Loading event/.test(document.body.innerText) && !!document.querySelector('h1')`, 30000, 'the event page'); await sleep(1000);
    const detail = { title: await evaluate(`document.querySelector('h1')?.innerText`), rsvpLink: await evaluate(`document.querySelector('a[href^="/events/rsvps?event="]')?.getAttribute('href') ?? null`), attendeeBadge: await evaluate(`[...document.querySelectorAll('.badge')].map(b => b.innerText.trim()).find(t => /attendee/.test(t)) ?? null`) };
    note('event-detail', detail);
    assert('event-detail', isAdmin ? detail.rsvpLink === `/events/rsvps?event=${encodeURIComponent(eventId)}` : detail.rsvpLink === null, `expected ${isAdmin ? 'an organizer link to this event' : 'no organizer link'}, got ${JSON.stringify(detail.rsvpLink)}`);
  }

  // 6. The RSVP view itself.
  await send('Page.navigate', { url: `${base}/events/rsvps` });
  const view = await waitView();
  note('rsvp-view', view);
  const ADMIN_STATES = ['attendees', 'zero-rsvps', 'no-upcoming-meeting'];
  const expectView = (step, v) => assert(step, isAdmin ? ADMIN_STATES.includes(v.state) : v.state === 'forbidden', `expected ${isAdmin ? ADMIN_STATES.join('|') : 'forbidden'} for role ${expect}, got ${JSON.stringify(v.state)}`);
  expectView('rsvp-view', view);
  if (isAdmin && view.state !== 'no-upcoming-meeting') assert('rsvp-view', view.meeting !== null && view.badges.some(b => /^\d+ RSVPs?$/.test(b)), `expected a meeting title and an RSVP count badge, got ${JSON.stringify({ meeting: view.meeting, badges: view.badges })}`);
  if (isAdmin && view.state === 'attendees') assert('rsvp-view', view.rows.length > 0 && view.badges.includes(`${view.rows.length} ${view.rows.length === 1 ? 'RSVP' : 'RSVPs'}`), `attendee rows (${view.rows.length}) must match the count badge ${JSON.stringify(view.badges)}`);
  if (!isAdmin) assert('rsvp-view', view.rows.length === 0 && view.badges.length === 0, 'a non-organizer must see no attendee rows or counts');
  await shot(`${tag}-${expect}-rsvps-desktop-dark`);
  await setTheme('light'); await shot(`${tag}-${expect}-rsvps-desktop-light`); await setTheme('dark');

  const countOf = v => Number((v.badges.find(b => /^\d+ RSVPs?$/.test(b)) ?? '').split(' ')[0]);
  if (expect === 'admin' && toggleUid && view.meeting) {
    const before = countOf(view);
    const { addRsvp, removeRsvp } = await import('./qa.mjs');
    const currentEventId = await evaluate(`document.querySelector('section.card a[href^="/events/"]')?.getAttribute('href')?.replace('/events/', '') ?? null`);
    const added = await addRsvp(decodeURIComponent(currentEventId), toggleUid);
    await evaluate(`[...document.querySelectorAll('button')].find(b => /Refresh/.test(b.textContent)).click(); true`);
    await sleep(2500);
    const afterAdd = await readView();
    note('refresh-after-add', { added, badges: afterAdd.badges, rows: afterAdd.rows, state: afterAdd.state });
    assert('refresh-after-add', afterAdd.state === 'attendees' && countOf(afterAdd) === before + 1 && afterAdd.rows.length === before + 1, `expected ${before + 1} RSVPs after adding, got ${JSON.stringify({ state: afterAdd.state, badges: afterAdd.badges, rows: afterAdd.rows.length })}`);
    await shot(`${tag}-${expect}-rsvps-after-add`);
    const removed = await removeRsvp(decodeURIComponent(currentEventId), toggleUid);
    await evaluate(`[...document.querySelectorAll('button')].find(b => /Refresh/.test(b.textContent)).click(); true`);
    await sleep(2500);
    const afterRemove = await readView();
    note('refresh-after-remove', { removed, badges: afterRemove.badges, rows: afterRemove.rows, state: afterRemove.state });
    assert('refresh-after-remove', afterRemove.rows.length === before && (before === 0 ? afterRemove.state === 'zero-rsvps' : countOf(afterRemove) === before), `expected ${before} RSVPs after removing, got ${JSON.stringify({ state: afterRemove.state, badges: afterRemove.badges, rows: afterRemove.rows.length })}`);
  }

  if (eventId) {
    await send('Page.navigate', { url: `${base}/events/rsvps?event=${encodeURIComponent(eventId)}` });
    const preselected = await waitView();
    note('rsvp-view-preselected', preselected);
    expectView('rsvp-view-preselected', preselected);
    assert('rsvp-view-preselected', preselected.path === `/events/rsvps?event=${encodeURIComponent(eventId)}`, `expected the preselect URL to survive, got ${preselected.path}`);
  }

  // 7. Mobile.
  await viewport(390, 844, true); await sleep(800);
  await send('Page.navigate', { url: `${base}/events/rsvps` });
  await waitView(); await sleep(500);
  await shot(`${tag}-${expect}-rsvps-mobile-dark`);
  await setTheme('light'); await shot(`${tag}-${expect}-rsvps-mobile-light`); await setTheme('dark');
  const mobile = await evaluate(`({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth: innerWidth })`);
  note('mobile', mobile);
  assert('mobile', mobile.scrollWidth <= mobile.clientWidth, `horizontal overflow: scrollWidth ${mobile.scrollWidth} > clientWidth ${mobile.clientWidth}`);

  // 8. Sign out.
  await send('Page.navigate', { url: `${base}/` }); await sleep(1000);
  const signOut = await evaluate(`fetch('/api/auth/session', { method: 'DELETE' }).then(r => r.status)`);
  note('sign-out', { sessionDeleteStatus: signOut });
  assert('sign-out', signOut === 200, `expected sign-out 200, got ${signOut}`);
  // Every API response Chrome saw must match the role: organizers get 200s once signed in, everyone else only 401/403.
  const statuses = summary.apiResponses.map(r => r.status);
  assert('api-responses', statuses.length > 0 && statuses.every(s => isAdmin ? [200, 401].includes(s) : [401, 403].includes(s)) && statuses.includes(isAdmin ? 200 : 403), `unexpected /api/events/attendees statuses for role ${expect}: ${JSON.stringify(statuses)}`);
  summary.result = 'passed';
  summary.finishedAt = new Date().toISOString();
  summary.email = redactText(summary.email); summary.redaction = 'private meeting location and member emails replaced with placeholders';
  writeFileSync(`${outDir}/${tag}-${expect}-check.json`, JSON.stringify(summary, null, 2));
  ws.close();
} catch (error) {
  summary.result = 'failed';
  summary.failure = String(error?.message ?? error);
  summary.finishedAt = new Date().toISOString();
  writeFileSync(`${outDir}/${tag}-${expect}-check.json`, JSON.stringify(summary, null, 2));
  console.error(`CHECK FAILED — ${summary.failure}`);
  process.exitCode = 1;
} finally {
  chrome.kill('SIGTERM');
}
