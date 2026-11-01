import type { Post } from "./types";
import { engagementRate, features, hasMetrics, interactions } from "./metrics";

export interface GroupStat { label: string; posts: number; avgInteractions: number | null; avgRate: number | null }

function group(posts: Post[], keyFn: (p: Post) => string): GroupStat[] {
  const map = new Map<string, Post[]>();
  posts.forEach((p) => {
    const k = keyFn(p);
    map.set(k, [...(map.get(k) ?? []), p]);
  });
  return [...map.entries()].map(([label, ps]) => {
    const ints = ps.map(interactions).filter((v): v is number => v !== null);
    const rates = ps.map(engagementRate).filter((v): v is number => v !== null);
    return {
      label,
      posts: ps.length,
      avgInteractions: ints.length ? ints.reduce((a, b) => a + b, 0) / ints.length : null,
      avgRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
    };
  });
}

/** Deterministic statistics computed in code. The AI explains them; it does not produce them. */
export function computeStats(posts: Post[]) {
  const withMetrics = posts.filter(hasMetrics);
  const byLength = group(withMetrics, (p) => features(p.content).lengthBucket);
  const byOpening = group(withMetrics, (p) => (features(p.content).startsWithQuestion ? "question opening" : "statement opening"));
  const byNumber = group(withMetrics, (p) => (features(p.content).hasNumbers ? "number in first line" : "no number in first line"));
  const byEnding = group(withMetrics, (p) => (features(p.content).endsWithQuestion ? "ends with question" : "does not end with question"));

  const monthly = new Map<string, Post[]>();
  withMetrics.forEach((p) => {
    if (!p.published_at) return;
    const k = p.published_at.slice(0, 7);
    monthly.set(k, [...(monthly.get(k) ?? []), p]);
  });
  const trend = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ps]) => {
      const ints = ps.map(interactions).filter((v): v is number => v !== null);
      const rates = ps.map(engagementRate).filter((v): v is number => v !== null);
      return {
        month,
        posts: ps.length,
        avgInteractions: ints.length ? Math.round(ints.reduce((a, b) => a + b, 0) / ints.length) : null,
        avgRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
      };
    });

  return {
    totalPosts: posts.length,
    postsWithMetrics: withMetrics.length,
    postsWithImpressions: posts.filter((p) => p.impressions !== null && p.impressions > 0).length,
    byLength, byOpening, byNumber, byEnding, trend,
  };
}
export type Stats = ReturnType<typeof computeStats>;
