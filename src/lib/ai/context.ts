import "server-only";
import type { Post, Profile } from "../types";
import { engagementRate, interactions } from "../metrics";

export interface PostRef { ref: string; id: string }

/**
 * Serialises posts for the model using short refs (P1, P2…). The model cites refs; we map them back to
 * real post ids and drop anything it invented. Missing metrics are printed as "n/a", never zero.
 */
export function serialisePosts(posts: Post[], maxChars = 700) {
  const refs: PostRef[] = [];
  const lines = posts.map((p, i) => {
    const ref = `P${i + 1}`;
    refs.push({ ref, id: p.id });
    const rate = engagementRate(p);
    const metrics = [
      `likes=${p.likes ?? "n/a"}`,
      `comments=${p.comments ?? "n/a"}`,
      `reposts=${p.reposts ?? "n/a"}`,
      `impressions=${p.impressions ?? "n/a"}`,
      `interactions=${interactions(p) ?? "n/a"}`,
      `engagement_rate=${rate === null ? "n/a" : (rate * 100).toFixed(2) + "%"}`,
    ].join(" ");
    const body = p.content.length > maxChars ? p.content.slice(0, maxChars) + "…[truncated]" : p.content;
    return `[${ref}] platform=${p.platform} date=${p.published_at?.slice(0, 10) ?? "unknown"} ${metrics}\n${body}`;
  });
  return { text: lines.join("\n\n---\n\n"), refs };
}

export function mapEvidence(evidence: string[] | undefined, refs: PostRef[]): string[] {
  const m = new Map(refs.map((r) => [r.ref, r.id]));
  return (evidence ?? []).map((e) => m.get(e.replace(/[\[\]\s]/g, "").toUpperCase())).filter((x): x is string => !!x);
}

export function profileBlock(p: Profile): string {
  return [
    `Creator name: ${p.creator_name ?? "unknown"}`,
    `Primary platform: ${p.primary_platform ?? "unknown"}`,
    `Niche: ${p.niche ?? "not provided"}`,
    `Content goals: ${p.goals ?? "not provided"}`,
    `Preferred formats: ${p.preferred_formats.join(", ") || "not provided"}`,
  ].join("\n");
}

export const HONESTY_RULES = `Rules you must follow:
- Use ONLY the provided posts and metrics. Never invent posts, metrics, quotes or audience facts. "n/a" means the data is unavailable — never treat it as zero.
- Tag every claim honestly: "data_supported" only when the provided numbers/posts directly back it; otherwise "interpretation". Recommendations are never presented as facts.
- Explain WHY for every finding, and cite evidence as post refs like "P3".
- Do not draw conclusions from a single post. If data is thin, say so and lower confidence.
- Observed patterns are correlations, not proof of causation.
- Avoid generic advice that would apply to any creator. Be specific to THIS creator.`;
