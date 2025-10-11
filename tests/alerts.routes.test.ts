import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client used in routes
const upsert = vi.fn().mockResolvedValue({ error: null });
const insert = vi.fn().mockResolvedValue({ error: null });
const updateChain = () => ({ eq: vi.fn().mockResolvedValue({ error: null }) });
const update = vi.fn().mockImplementation(updateChain);

const selectBuilder = (rows: any[]) => ({
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
});

let confirmRows: any[] = [];

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from(table: string) {
      if (table === 'alerts_subscribers') {
        return { upsert, update } as any;
      }
      if (table === 'alerts_confirmations') {
        return {
          insert,
          select: () => selectBuilder(confirmRows),
          update,
        } as any;
      }
      throw new Error(`Unexpected table ${table}`);
    },
  },
}));

import { POST as SUBSCRIBE_POST } from '@/app/api/alerts/subscribe/route';
import { POST as UNSUB_POST } from '@/app/api/alerts/unsubscribe/route';
import { GET as CONFIRM_GET } from '@/app/api/alerts/confirm/route';
import { GET as UNSUB_CONFIRM_GET } from '@/app/api/alerts/unsubscribe/confirm/route';

describe('alerts subscribe/unsubscribe routes', () => {
  beforeEach(() => {
    upsert.mockClear(); insert.mockClear(); update.mockClear();
    confirmRows = [];
  });

  it('subscribe returns ok and dev tokens', async () => {
    const req = new Request('http://localhost/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', channels: ['email'] }),
    });
    const res = await SUBSCRIBE_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.tokens)).toBe(true);
    expect(insert).toHaveBeenCalled();
    expect(upsert).toHaveBeenCalled();
  });

  it('confirm subscribe enables opt-in', async () => {
    confirmRows = [{ token: 't1', action: 'subscribe', channel: 'email', email: 'a@b.com', expires_at: new Date(Date.now()+3600000).toISOString() }];
    const res = await CONFIRM_GET(new Request('http://localhost/api/alerts/confirm?token=t1'));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled(); // consumed_at
    expect(upsert).toHaveBeenCalled(); // subscriber opt-in
  });

  it('unsubscribe returns tokens', async () => {
    const req = new Request('http://localhost/api/alerts/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', channels: ['email'] }),
    });
    const res = await UNSUB_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.tokens)).toBe(true);
  });

  it('confirm unsubscribe disables opt-in', async () => {
    confirmRows = [{ token: 't2', action: 'unsubscribe', channel: 'email', email: 'a@b.com', expires_at: new Date(Date.now()+3600000).toISOString() }];
    const res = await UNSUB_CONFIRM_GET(new Request('http://localhost/api/alerts/unsubscribe/confirm?token=t2'));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled(); // consumed_at
  });
});
