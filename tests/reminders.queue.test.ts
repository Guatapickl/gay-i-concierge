import { beforeEach, describe, expect, it, vi } from 'vitest';
type Row = Record<string, unknown>;
const state = vi.hoisted(() => ({ rows: new Map<string, Row>(), optedIn: true, serial: Promise.resolve(), beforeClaim: null as null | (() => void) }));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: () => ({
  collection: (name: string) => {
    const query = {
      where: () => query, orderBy: () => query, limit: () => query,
      get: async () => name === 'alerts_subscribers'
        ? { empty: false, docs: [{ data: () => ({ email_opt_in: state.optedIn }) }] }
        : { docs: [...state.rows].filter(([, row]) => row.status === 'pending').map(([id, row]) => ({ id, exists: true, data: () => ({ ...row }) })) },
      doc: (id: string) => ({ id, update: async (data: Row) => { state.rows.set(id, { ...state.rows.get(id), ...data }); } }),
    };
    return query;
  },
  runTransaction: (fn: (tx: unknown) => Promise<unknown>) => {
    const result = state.serial.then(async () => {
      state.beforeClaim?.(); state.beforeClaim = null;
      return fn({
        get: async ({ id }: { id: string }) => ({ id, exists: state.rows.has(id), data: () => ({ ...state.rows.get(id) }) }),
        update: ({ id }: { id: string }, data: Row) => state.rows.set(id, { ...state.rows.get(id), ...data }),
      });
    });
    state.serial = result.then(() => undefined);
    return result;
  },
}) }));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));
import { sendEmail } from '@/lib/email';
import { processDueReminders } from '@/lib/reminders';

beforeEach(() => {
  vi.clearAllMocks(); state.rows.clear(); state.optedIn = true; state.serial = Promise.resolve(); state.beforeClaim = null;
  state.rows.set('queue-1', { status: 'pending', kind: 'poll_invite', send_at: '2020-01-01T00:00:00Z', attempts: 0, recipient_email: 'member@example.com', subject: 'Vote', body_html: '<p>Vote</p>' });
});
describe('reminder delivery claims', () => {
  it('sends once when overlapping processors select the same pending row', async () => {
    const results = await Promise.all([processDueReminders(), processDueReminders()]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(results.reduce((n, r) => n + r.attempted, 0)).toBe(1);
    expect(state.rows.get('queue-1')?.status).toBe('sent');
  });
  it('rechecks pending and due inside the claim, ignoring stale query results', async () => {
    state.beforeClaim = () => state.rows.set('queue-1', { ...state.rows.get('queue-1'), send_at: '2099-01-01T00:00:00Z' });
    await processDueReminders();
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it('honors a poll invitation opt-out after it was queued', async () => {
    state.optedIn = false;
    await processDueReminders();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(state.rows.get('queue-1')?.status).toBe('cancelled');
  });
  it('retains nonpoll delivery and stable provider keys across retries', async () => {
    state.optedIn = false;
    state.rows.set('queue-1', { ...state.rows.get('queue-1'), kind: 'rsvp_confirmation' });
    vi.mocked(sendEmail).mockResolvedValueOnce({ ok: false, error: 'Timeout' }).mockResolvedValueOnce({ ok: true, id: 'email-1', provider: 'resend' });
    await processDueReminders(); await processDueReminders();
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const [first, second] = vi.mocked(sendEmail).mock.calls;
    expect(first[0].idempotencyKey).toBe('email-reminder/queue-1');
    expect(second[0].idempotencyKey).toBe(first[0].idempotencyKey);
    expect(state.rows.get('queue-1')?.attempts).toBe(2);
  });
});
