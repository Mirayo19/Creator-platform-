import type { Post, Profile } from "@/lib/types";

export const USER = "11111111-1111-1111-1111-111111111111";

export const profile: Profile = {
  id: USER, creator_name: "Test", primary_platform: "x", niche: "AI products", goals: "grow",
  preferred_formats: ["Threads"], onboarding_completed: true,
};

export function mkPost(o: Partial<Post> = {}): Post {
  return {
    id: crypto.randomUUID(), user_id: USER, platform: "x", source: "manual", external_id: null, url: null,
    content: "A post", published_at: "2026-01-01T00:00:00Z", likes: null, comments: null, reposts: null,
    impressions: null, is_sample: false, created_at: "2026-01-01T00:00:00Z", ...o,
  };
}

export const posts = (n: number, withMetrics = true) =>
  Array.from({ length: n }, (_, i) =>
    mkPost({ content: `Post number ${i}`, likes: withMetrics ? 10 + i : null, comments: withMetrics ? 2 : null, reposts: withMetrics ? 1 : null, impressions: withMetrics ? 1000 : null }));

/**
 * Minimal in-memory stand-in for the Supabase query builder: enough for the chains used in
 * analyses.ts (select/eq/neq/order/limit/single/maybeSingle/insert). Rows are stored per table.
 */
export function fakeSupabase(tables: Record<string, Record<string, unknown>[]>) {
  const db = tables;
  function from(table: string) {
    db[table] ??= [];
    let rows = db[table];
    let op: "select" | "insert" = "select";
    let inserted: Record<string, unknown>[] = [];
    let limitN = Infinity;
    let wantSingle = false;
    const q: Record<string, unknown> = {
      select() { return q; },
      eq(k: string, v: unknown) { rows = rows.filter((r) => r[k] === v); return q; },
      neq(k: string, v: unknown) { rows = rows.filter((r) => r[k] !== v); return q; },
      order(k: string, o?: { ascending?: boolean }) {
        rows = [...rows].sort((a, b) => String(a[k] ?? "").localeCompare(String(b[k] ?? "")) * (o?.ascending === false ? -1 : 1));
        return q;
      },
      limit(n: number) { limitN = n; return q; },
      single() { wantSingle = true; return q; },
      maybeSingle() { wantSingle = true; return q; },
      insert(v: Record<string, unknown> | Record<string, unknown>[]) {
        op = "insert";
        inserted = (Array.isArray(v) ? v : [v]).map((r) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...r }));
        db[table].push(...inserted);
        return q;
      },
      then(resolve: (v: unknown) => void) {
        const out = op === "insert" ? inserted : rows.slice(0, limitN);
        resolve({ data: wantSingle ? (out[0] ?? null) : out, error: null, count: out.length });
      },
    };
    return q;
  }
  return { client: { from } as never, db };
}
