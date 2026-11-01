import type { Post } from "./types";

/** Total interactions across the metrics that are actually available. null if none are. */
export function interactions(p: Post): number | null {
  const parts = [p.likes, p.comments, p.reposts].filter((v): v is number => v !== null);
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0);
}

/** Engagement rate = interactions / impressions. Only defined when impressions are known (> 0). Never estimated. */
export function engagementRate(p: Post): number | null {
  const i = interactions(p);
  if (i === null || p.impressions === null || p.impressions <= 0) return null;
  return i / p.impressions;
}

export function hasMetrics(p: Post): boolean {
  return interactions(p) !== null;
}

/** Ranking score: engagement rate if known, else raw interactions (compared only within same-basis groups). */
export function averageEngagementRate(posts: Post[]): { value: number | null; basedOn: number } {
  const rates = posts.map(engagementRate).filter((r): r is number => r !== null);
  if (rates.length === 0) return { value: null, basedOn: 0 };
  return { value: rates.reduce((a, b) => a + b, 0) / rates.length, basedOn: rates.length };
}

export function bestPost(posts: Post[]): { post: Post; basis: "rate" | "interactions" } | null {
  const withRate = posts.filter((p) => engagementRate(p) !== null);
  if (withRate.length > 0) {
    return { post: withRate.sort((a, b) => engagementRate(b)! - engagementRate(a)!)[0], basis: "rate" };
  }
  const withInt = posts.filter(hasMetrics);
  if (withInt.length > 0) {
    return { post: withInt.sort((a, b) => interactions(b)! - interactions(a)!)[0], basis: "interactions" };
  }
  return null;
}

/** Cheap, deterministic structural features used for format comparisons (computed, not AI-guessed). */
export function features(content: string) {
  const text = content.trim();
  const firstLine = text.split("\n")[0] ?? "";
  return {
    length: text.length,
    lengthBucket: text.length < 140 ? "short" : text.length < 500 ? "medium" : "long",
    startsWithQuestion: /\?\s*$/.test(firstLine) || /^(why|how|what|who|when|do|does|is|are|can|should)\b/i.test(firstLine),
    hasNumbers: /\d/.test(firstLine),
    lineCount: text.split("\n").filter(Boolean).length,
    endsWithQuestion: /\?\s*$/.test(text),
  };
}
