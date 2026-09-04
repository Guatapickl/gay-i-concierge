/**
 * Firestore replacements for the Postgres alert RPCs
 * (rpc_create_alert_token / rpc_consume_alert_token) plus the
 * `upsert … on conflict (email|phone)` pattern the routes relied on.
 *
 * alerts_confirmations: doc id = token.
 * alerts_subscribers:   doc id = migrated uuid or a generated id; rows are
 *                       looked up by `where('email'|'phone', '==', …)`.
 */
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { adminPayloadOf, adminRowOf } from '@/lib/firebase/adminDb';
import { generateToken, expiresIn } from '@/lib/tokens';

export type Channel = 'email' | 'sms';
export type Action = 'subscribe' | 'unsubscribe';

export type ConfirmationRow = {
  id: string;
  token: string;
  action: Action;
  channel: Channel;
  email: string | null;
  phone: string | null;
  expires_at: string | null;
  consumed_at: string | null;
  created_at: string | null;
};

const nowIso = () => new Date().toISOString();

/** rpc_create_alert_token: write a token doc and return the token. */
export async function createAlertToken(args: {
  action: Action;
  channel: Channel;
  email?: string | null;
  phone?: string | null;
  ttlHours: number;
}): Promise<string> {
  const token = generateToken();
  await adminDb()
    .collection('alerts_confirmations')
    .doc(token)
    .set(
      adminPayloadOf({
        token,
        action: args.action,
        channel: args.channel,
        email: args.email ?? null,
        phone: args.phone ?? null,
        expires_at: expiresIn(args.ttlHours),
        consumed_at: null,
        created_at: nowIso(),
      }),
    );
  return token;
}

type Key = { email: string } | { phone: string };

/**
 * Upsert on the (email | phone) natural key, like Postgres `on conflict`.
 * Works inside or outside a transaction.
 */
export async function upsertSubscriber(
  key: Key,
  fields: Record<string, unknown>,
  tx?: Transaction,
  db: Firestore = adminDb(),
  opts: { createIfMissing?: boolean } = {},
): Promise<void> {
  const createIfMissing = opts.createIfMissing ?? true;
  const [field, value] = 'email' in key ? ['email', key.email] : ['phone', key.phone];
  const col = db.collection('alerts_subscribers');
  const q = col.where(field, '==', value).limit(1);
  const snap = tx ? await tx.get(q) : await q.get();
  const now = nowIso();
  if (!snap.empty) {
    const ref = snap.docs[0].ref;
    const payload = adminPayloadOf({ ...fields, updated_at: now });
    if (tx) tx.update(ref, payload);
    else await ref.update(payload);
    return;
  }
  if (!createIfMissing) return; // plain `update … where email = …`, like the SQL
  const ref = col.doc();
  const payload = adminPayloadOf({
    email: null,
    phone: null,
    email_opt_in: false,
    sms_opt_in: false,
    user_id: null,
    [field]: value,
    ...fields,
    created_at: now,
    updated_at: now,
  });
  if (tx) tx.set(ref, payload);
  else await ref.set(payload);
}

export type ConsumeResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * rpc_consume_alert_token, but with the route-level error messages the
 * clients already expect. Runs in a transaction so a token can only be
 * consumed once even under concurrent clicks.
 */
export async function consumeAlertToken(args: {
  token: string;
  expectedAction: Action;
  consent_ip: string;
  consent_source: string;
}): Promise<ConsumeResult> {
  const db = adminDb();
  const ref = db.collection('alerts_confirmations').doc(args.token);
  return db.runTransaction<ConsumeResult>(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, status: 400, error: 'Invalid or used token' };
    const row = adminRowOf<ConfirmationRow>(snap);
    if (row.consumed_at) return { ok: false, status: 400, error: 'Invalid or used token' };
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { ok: false, status: 400, error: 'Token expired' };
    }
    if (row.action !== args.expectedAction) return { ok: false, status: 400, error: 'Wrong token action' };

    const now = nowIso();
    const consent = { consent_source: args.consent_source, consent_ip: args.consent_ip };
    const subscribing = args.expectedAction === 'subscribe';
    if (row.channel === 'email' && row.email) {
      await upsertSubscriber(
        { email: row.email },
        subscribing
          ? { email_opt_in: true, email_opt_in_at: now, email_opt_out_at: null, ...consent }
          : { email_opt_in: false, email_opt_out_at: now, ...consent },
        tx,
        db,
        { createIfMissing: subscribing },
      );
    } else if (row.channel === 'sms' && row.phone) {
      await upsertSubscriber(
        { phone: row.phone },
        subscribing
          ? { sms_opt_in: true, sms_opt_in_at: now, sms_opt_out_at: null, ...consent }
          : { sms_opt_in: false, sms_opt_out_at: now, ...consent },
        tx,
        db,
        { createIfMissing: subscribing },
      );
    } else {
      return { ok: false, status: 400, error: 'Token incomplete' };
    }

    tx.update(ref, adminPayloadOf({ consumed_at: now }));
    return { ok: true };
  });
}
