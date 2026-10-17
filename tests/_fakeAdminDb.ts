/**
 * Minimal in-memory stand-in for the Firestore Admin SDK surface used by the
 * server-side reminder code: collection().where().orderBy().limit().get(),
 * collection().doc(id).get(), collection().doc() + batch().set()/commit().
 *
 * Supports `==`, `>=`, `in` filters. Values that look like ISO timestamps are
 * compared as strings, which keeps ordering correct for the dates used in
 * tests. `Timestamp` instances (from firebase-admin) are converted to ISO.
 */
import { Timestamp } from 'firebase-admin/firestore';

export type FakeDoc = { id: string; data: Record<string, unknown> };

const toComparable = (v: unknown): unknown => (v instanceof Timestamp ? v.toDate().toISOString() : v);

type Filter = { field: string; op: string; value: unknown };

export class FakeAdminDb {
  readonly collections = new Map<string, Map<string, Record<string, unknown>>>();
  private counter = 0;

  seed(name: string, docs: FakeDoc[]) {
    const col = this.col(name);
    for (const d of docs) col.set(d.id, { ...d.data });
    return this;
  }

  rows(name: string): FakeDoc[] {
    return Array.from(this.col(name).entries()).map(([id, data]) => ({ id, data }));
  }

  private col(name: string) {
    let c = this.collections.get(name);
    if (!c) {
      c = new Map();
      this.collections.set(name, c);
    }
    return c;
  }

  private snapOf(id: string, data: Record<string, unknown>) {
    return { id, exists: true, data: () => data };
  }

  collection(name: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the returned query objects are plain closures
    const self = this;
    const makeQuery = (filters: Filter[], order: { field: string; dir: string } | null, max: number | null) => ({
      where: (field: string, op: string, value: unknown) => makeQuery([...filters, { field, op, value }], order, max),
      orderBy: (field: string, dir = 'asc') => makeQuery(filters, { field, dir }, max),
      limit: (n: number) => makeQuery(filters, order, n),
      get: async () => {
        let rows = self.rows(name).filter(row =>
          filters.every(f => {
            const actual = toComparable(row.data[f.field]);
            const expected = toComparable(f.value);
            if (f.op === '==') return actual === expected;
            if (f.op === '>=') return typeof actual === 'string' && typeof expected === 'string' && actual >= expected;
            if (f.op === 'in') return Array.isArray(expected) && expected.map(toComparable).includes(actual);
            throw new Error(`fake db: unsupported operator ${f.op}`);
          }),
        );
        if (order) {
          rows = [...rows].sort((a, b) => String(toComparable(a.data[order.field])).localeCompare(String(toComparable(b.data[order.field]))));
          if (order.dir === 'desc') rows.reverse();
        }
        if (max != null) rows = rows.slice(0, max);
        return { empty: rows.length === 0, docs: rows.map(r => self.snapOf(r.id, r.data)) };
      },
    });
    return {
      ...makeQuery([], null, null),
      doc: (id?: string) => {
        const docId = id ?? `auto-${++self.counter}`;
        return {
          collection: name,
          id: docId,
          get: async () => {
            const data = self.col(name).get(docId);
            return data ? self.snapOf(docId, data) : { id: docId, exists: false, data: () => undefined };
          },
          set: async (data: Record<string, unknown>) => {
            self.col(name).set(docId, { ...data });
          },
          update: async (patch: Record<string, unknown>) => {
            const current = self.col(name).get(docId);
            if (!current) throw new Error(`fake db: update of missing doc ${name}/${docId}`);
            self.col(name).set(docId, { ...current, ...patch });
          },
        };
      },
    };
  }

  batch() {
    const ops: (() => void)[] = [];
    return {
      set: (ref: { collection: string; id: string }, data: Record<string, unknown>) => {
        ops.push(() => this.col(ref.collection).set(ref.id, { ...data }));
      },
      commit: async () => {
        for (const op of ops) op();
      },
    };
  }
}

export type FakeAuthUser = { uid: string; email?: string; disabled?: boolean; displayName?: string };

/** Admin Auth stand-in for `listUsers` pagination. */
export class FakeAdminAuth {
  constructor(public users: FakeAuthUser[], private pageSize = 2) {}
  async listUsers(_max: number, pageToken?: string) {
    const start = pageToken ? Number(pageToken) : 0;
    const users = this.users.slice(start, start + this.pageSize);
    const next = start + this.pageSize;
    return { users, pageToken: next < this.users.length ? String(next) : undefined };
  }
}
