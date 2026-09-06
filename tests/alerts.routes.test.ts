import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Minimal in-memory stand-in for the Firestore Admin SDK surface the alert
 * routes use: collection/doc/get/set/update, where/limit/get, runTransaction.
 */
type Doc = Record<string, unknown>;
const store = new Map<string, Map<string, Doc>>();
const col = (name: string) => {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
};
let nextId = 1;

const setSpy = vi.fn();
const updateSpy = vi.fn();

function docRef(colName: string, id: string) {
  const ref = {
    id,
    path: `${colName}/${id}`,
    async get() { return snapOf(colName, id); },
    async set(data: Doc, opts?: { merge?: boolean }) {
      setSpy(colName, id, data);
      const prev = opts?.merge ? col(colName).get(id) || {} : {};
      col(colName).set(id, { ...prev, ...data });
    },
    async update(data: Doc) {
      updateSpy(colName, id, data);
      const prev = col(colName).get(id);
      if (!prev) throw new Error('not found');
      col(colName).set(id, { ...prev, ...data });
    },
    async delete() { col(colName).delete(id); },
  };
  return ref;
}
function snapOf(colName: string, id: string) {
  const data = col(colName).get(id);
  return { id, exists: !!data, ref: docRef(colName, id), data: () => (data ? { ...data } : undefined) };
}
function query(colName: string, filters: Array<[string, unknown]> = [], max = Infinity) {
  return {
    where(field: string, _op: string, value: unknown) { return query(colName, [...filters, [field, value]], max); },
    limit(n: number) { return query(colName, filters, n); },
    async get() {
      const docs = Array.from(col(colName).entries())
        .filter(([, d]) => filters.every(([f, v]) => d[f] === v))
        .slice(0, max)
        .map(([id]) => snapOf(colName, id));
      return { empty: docs.length === 0, docs };
    },
  };
}
const fakeDb = {
  collection(name: string) {
    return {
      doc(id?: string) { return docRef(name, id ?? `gen-${nextId++}`); },
      ...query(name),
    };
  },
  async runTransaction<T>(fn: (tx: unknown) => Promise<T>) {
    const tx = {
      get(x: { get: () => Promise<unknown> }) { return x.get(); },
      set(ref: { set: (d: Doc) => Promise<void> }, d: Doc) { void ref.set(d); },
      update(ref: { update: (d: Doc) => Promise<void> }, d: Doc) { void ref.update(d); },
    };
    return fn(tx);
  },
};

// lib/firebase/db.ts initialises the client SDK on import; adminDb.ts only needs TIMESTAMP_FIELDS from it.
vi.mock('@/lib/firebase/db', () => ({
  TIMESTAMP_FIELDS: new Set([
    'created_at', 'updated_at', 'expires_at', 'consumed_at',
    'email_opt_in_at', 'email_opt_out_at', 'sms_opt_in_at', 'sms_opt_out_at',
  ]),
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: () => fakeDb,
  adminAuth: () => ({}),
  userFromRequest: vi.fn().mockResolvedValue(null),
  isAdminUid: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true, provider: 'resend', id: 'mail-1' }) }));
import { userFromRequest } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email';

import { POST as SUBSCRIBE_POST } from '@/app/api/alerts/subscribe/route';
import { POST as UNSUB_POST } from '@/app/api/alerts/unsubscribe/route';
import { GET as CONFIRM_GET } from '@/app/api/alerts/confirm/route';
import { GET as UNSUB_CONFIRM_GET } from '@/app/api/alerts/unsubscribe/confirm/route';

const subscriberByEmail = (email: string) =>
  Array.from(col('alerts_subscribers').values()).find(d => d.email === email);

describe('alerts subscribe/unsubscribe routes', () => {
  beforeEach(() => {
    store.clear();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.mocked(sendEmail).mockClear();
    setSpy.mockClear();
    updateSpy.mockClear();
  });

  it('subscribe sends confirmation only by email without leaking tokens', async () => {
    const req = new Request('http://localhost/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ email: 'a@b.com', channels: ['email'] }),
    });
    const res = await SUBSCRIBE_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.tokens).toBeUndefined();
    const token = Array.from(col('alerts_confirmations').keys())[0];
    expect(token).toBeTruthy();
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com', text: expect.stringContaining(token) }));
    expect(subscriberByEmail('a@b.com')).toBeUndefined();
  });

  it('subscribe re-uses the existing subscriber row (upsert on email)', async () => {
    col('alerts_subscribers').set('existing-uuid', { email: 'a@b.com', email_opt_in: true });
    const req = new Request('http://localhost/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify({ email: 'a@b.com', channels: ['email'] }),
    });
    expect((await SUBSCRIBE_POST(req)).status).toBe(200);
    expect(col('alerts_subscribers').size).toBe(1);
    expect(subscriberByEmail('a@b.com')?.email_opt_in).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('confirm subscribe enables opt-in and consumes the token once', async () => {
    col('alerts_confirmations').set('t1', {
      token: 't1', action: 'subscribe', channel: 'email', email: 'a@b.com', phone: null,
      expires_at: new Date(Date.now() + 3600000), consumed_at: null,
    });
    const res = await CONFIRM_GET(new Request('http://localhost/api/alerts/confirm?token=t1', { headers: { 'x-forwarded-for': '10.0.0.3' } }));
    expect(res.status).toBe(200);
    expect(col('alerts_confirmations').get('t1')?.consumed_at).toBeTruthy();
    expect(subscriberByEmail('a@b.com')?.email_opt_in).toBe(true);

    const again = await CONFIRM_GET(new Request('http://localhost/api/alerts/confirm?token=t1', { headers: { 'x-forwarded-for': '10.0.0.3' } }));
    expect(again.status).toBe(400);
    expect((await again.json()).error).toMatch(/Invalid or used/);
  });

  it('confirm rejects expired and wrong-action tokens', async () => {
    col('alerts_confirmations').set('old', {
      token: 'old', action: 'subscribe', channel: 'email', email: 'a@b.com',
      expires_at: new Date(Date.now() - 1000), consumed_at: null,
    });
    col('alerts_confirmations').set('unsub', {
      token: 'unsub', action: 'unsubscribe', channel: 'email', email: 'a@b.com',
      expires_at: new Date(Date.now() + 1000000), consumed_at: null,
    });
    const h = { headers: { 'x-forwarded-for': '10.0.0.4' } };
    expect((await (await CONFIRM_GET(new Request('http://localhost/api/alerts/confirm?token=old', h))).json()).error).toMatch(/expired/);
    expect((await (await CONFIRM_GET(new Request('http://localhost/api/alerts/confirm?token=unsub', h))).json()).error).toMatch(/Wrong token action/);
    expect((await CONFIRM_GET(new Request('http://localhost/api/alerts/confirm', h))).status).toBe(400);
  });

  it('unsubscribe sends confirmation without returning tokens', async () => {
    const req = new Request('http://localhost/api/alerts/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.0.5' },
      body: JSON.stringify({ email: 'a@b.com', channels: ['email'] }),
    });
    const res = await UNSUB_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.tokens).toBeUndefined();
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('/alerts/unsubscribe/confirm?token=') }));
  });

  it('confirm unsubscribe disables opt-in', async () => {
    col('alerts_subscribers').set('s1', { email: 'a@b.com', email_opt_in: true });
    col('alerts_confirmations').set('t2', {
      token: 't2', action: 'unsubscribe', channel: 'email', email: 'a@b.com',
      expires_at: new Date(Date.now() + 3600000), consumed_at: null,
    });
    const res = await UNSUB_CONFIRM_GET(new Request('http://localhost/api/alerts/unsubscribe/confirm?token=t2', { headers: { 'x-forwarded-for': '10.0.0.6' } }));
    expect(res.status).toBe(200);
    expect(col('alerts_subscribers').get('s1')?.email_opt_in).toBe(false);
    expect(col('alerts_confirmations').get('t2')?.consumed_at).toBeTruthy();
  });
});

for (const action of [SUBSCRIBE_POST, UNSUB_POST]) {
  it('rejects SMS without creating tokens', async () => {
    store.clear();
    const res = await action(new Request('http://localhost/api/alerts', { method: 'POST', body: JSON.stringify({ channels: ['sms'], phone: '+12025550123' }) }));
    expect(res.status).toBe(422);
    expect(col('alerts_confirmations').size).toBe(0);
  });
  it('fails honestly when email is unavailable', async () => {
    store.clear();
    vi.stubEnv('RESEND_API_KEY', '');
    const res = await action(new Request('http://localhost/api/alerts', { method: 'POST', body: JSON.stringify({ channels: ['email'], email: 'a@b.com' }) }));
    expect(res.status).toBe(503);
    expect(col('alerts_confirmations').size).toBe(0);
  });
}

describe('alert identity and delivery safeguards', () => {
  beforeEach(() => {
    store.clear();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.mocked(userFromRequest).mockResolvedValue(null);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, provider: 'resend', id: 'mail' });
  });
  it('ignores forged user_id and leaves existing subscriber ownership intact', async () => {
    col('alerts_subscribers').set('existing', { email: 'a@b.com', email_opt_in: true, user_id: 'owner' });
    const res = await SUBSCRIBE_POST(new Request('http://localhost/api/alerts/subscribe', { method: 'POST', headers: { 'x-forwarded-for': '10.0.1.1' }, body: JSON.stringify({ channels: ['email'], email: 'a@b.com', user_id: 'attacker' }) }));
    expect(res.status).toBe(200);
    const token = Array.from(col('alerts_confirmations').keys())[0];
    expect(col('alerts_confirmations').get(token)?.user_id).toBeNull();
    await CONFIRM_GET(new Request(`http://localhost/api/alerts/confirm?token=${token}`));
    expect(subscriberByEmail('a@b.com')?.user_id).toBe('owner');
  });
  it('associates only authenticated matching email after confirmation', async () => {
    vi.mocked(userFromRequest).mockResolvedValue({ uid: 'verified-user', email: 'a@b.com' });
    await SUBSCRIBE_POST(new Request('http://localhost/api/alerts/subscribe', { method: 'POST', headers: { 'x-forwarded-for': '10.0.1.2' }, body: JSON.stringify({ channels: ['email'], email: 'a@b.com', user_id: 'spoofed' }) }));
    expect(subscriberByEmail('a@b.com')).toBeUndefined();
    const token = Array.from(col('alerts_confirmations').keys())[0];
    await CONFIRM_GET(new Request(`http://localhost/api/alerts/confirm?token=${token}`));
    expect(subscriberByEmail('a@b.com')?.user_id).toBe('verified-user');
  });
  it('revokes the unused token if email delivery fails', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: 'provider unavailable' });
    const res = await SUBSCRIBE_POST(new Request('http://localhost/api/alerts/subscribe', { method: 'POST', headers: { 'x-forwarded-for': '10.0.1.3' }, body: JSON.stringify({ channels: ['email'], email: 'a@b.com' }) }));
    expect(res.status).toBe(503);
    expect(col('alerts_confirmations').size).toBe(0);
    expect(subscriberByEmail('a@b.com')).toBeUndefined();
    expect(await res.json()).not.toHaveProperty('tokens');
  });
});
