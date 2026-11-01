import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisKind, Post, Profile } from "../types";
import { MODEL, callJson } from "./claude";
import { HONESTY_RULES, mapEvidence, profileBlock, serialisePosts } from "./context";
import {
  audienceSchema, draftReviewSchema, gapsSchema, ideasSchema, performanceSchema, writingDnaSchema,
  type DraftReview, type WritingDna,
} from "./schemas";
import { computeStats } from "../stats";
import { hasMetrics } from "../metrics";

/** Thrown for expected, user-facing problems (not enough data etc.). */
export class UserFacingError extends Error {}

export async function loadCreator(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("posts").select("*").eq("user_id", userId)
      .order("published_at", { ascending: false, nullsFirst: false }).limit(80),
  ]);
  if (!profile) throw new UserFacingError("Profile not found.");
  return { profile: profile as Profile, posts: (posts ?? []) as Post[] };
}

async function latest<T>(supabase: SupabaseClient, userId: string, kind: AnalysisKind): Promise<{ result: T; version: number } | null> {
  const { data } = await supabase.from("analyses").select("result, version")
    .eq("user_id", userId).eq("kind", kind).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? { result: data.result as T, version: data.version } : null;
}

async function persist(supabase: SupabaseClient, userId: string, kind: AnalysisKind, result: unknown, postsAnalysed: number) {
  const prev = await latest(supabase, userId, kind);
  const { error } = await supabase.from("analyses").insert({
    user_id: userId, kind, version: (prev?.version ?? 0) + 1, posts_analysed: postsAnalysed, result, model: MODEL,
  });
  if (error) throw new UserFacingError(`Could not save analysis: ${error.message}`);
}

function require(cond: boolean, msg: string) {
  if (!cond) throw new UserFacingError(msg);
}

export async function runWritingDna(supabase: SupabaseClient, userId: string) {
  const { profile, posts } = await loadCreator(supabase, userId);
  require(posts.length >= 5, "Import at least 5 posts so your Writing DNA is based on more than a couple of examples.");
  const { text, refs } = serialisePosts(posts, 900);
  const out = await callJson({
    schema: writingDnaSchema,
    maxTokens: 4000,
    system: `You are a writing-style analyst. Extract this creator's authentic voice from their own posts. This profile will later constrain AI suggestions so they sound like the creator, not like generic AI.\n${HONESTY_RULES}\nCover every dimension: tone, sentence_structure, vocabulary, rhythm, hooks, storytelling, humour, communication_style, paragraph_structure, opinions, endings. If a dimension has no clear evidence (e.g. no humour), say that explicitly. Quote short exact phrases only if they appear in the posts. voice_rules.do / dont must be concrete and specific to this creator.`,
    user: `${profileBlock(profile)}\n\nPOSTS (${posts.length}):\n\n${text}`,
  });
  const result: WritingDna = { ...out, dimensions: out.dimensions.map((d) => ({ ...d, evidence: mapEvidence(d.evidence, refs) })) };
  await persist(supabase, userId, "writing_dna", result, posts.length);
}

export async function runPerformance(supabase: SupabaseClient, userId: string) {
  const { profile, posts } = await loadCreator(supabase, userId);
  const stats = computeStats(posts);
  require(posts.length >= 8, "Import at least 8 posts to detect performance patterns.");
  require(stats.postsWithMetrics >= 5, "At least 5 posts need engagement numbers (likes, comments or reposts) for performance analysis. Posts without metrics are still used for writing analysis.");
  const { text, refs } = serialisePosts(posts);
  const out = await callJson({
    schema: performanceSchema,
    maxTokens: 5000,
    system: `You are a content performance analyst. Identify the creator's strengths, weaknesses and engagement patterns (best/worst posts, topics, formats, hook styles, CTAs, change over time).\n${HONESTY_RULES}\nYou are given COMPUTED_STATS calculated by code from real data — cite them rather than recomputing. Only mark "data_supported" for patterns backed by multiple posts (group sizes in stats). Use type "pattern" for neutral engagement patterns. Fill data_limits with an honest note about what the data can't tell us (e.g. no impressions, small sample). Give 3–6 recommendations, each with reasoning.`,
    user: `${profileBlock(profile)}\n\nCOMPUTED_STATS:\n${JSON.stringify(stats)}\n\nPOSTS (${posts.length}):\n\n${text}`,
  });
  const result = {
    ...out,
    findings: out.findings.map((f) => ({ ...f, evidence: mapEvidence(f.evidence, refs) })),
    stats,
  };
  await persist(supabase, userId, "performance_patterns", result, posts.length);
}

export async function runGaps(supabase: SupabaseClient, userId: string) {
  const { profile, posts } = await loadCreator(supabase, userId);
  require(posts.length >= 8, "Import at least 8 posts to detect content gaps.");
  const { text } = serialisePosts(posts, 400);
  const out = await callJson({
    schema: gapsSchema,
    maxTokens: 3500,
    system: `You are a content strategist. Map the topics this creator covers (with post counts), then find adjacent topics within their niche that they neglect, plus topics they overuse.\n${HONESTY_RULES}\nA "gap" must be relevant to their niche and goals. Mark basis "data_supported" only if the absence is clear from the provided posts; note that you only see the imported posts, not their full history.`,
    user: `${profileBlock(profile)}\n\nPOSTS (${posts.length}):\n\n${text}`,
  });
  await persist(supabase, userId, "content_gaps", out, posts.length);
}

export async function runAudience(supabase: SupabaseClient, userId: string) {
  const { profile, posts } = await loadCreator(supabase, userId);
  const { data: comments } = await supabase.from("audience_comments").select("body, post_id").eq("user_id", userId).limit(200);
  require((comments?.length ?? 0) >= 5, "Audience Intelligence needs real audience comments. Import at least 5 comments first.");
  const { text, refs } = serialisePosts(posts.slice(0, 20), 300);
  const refByPost = new Map(refs.map((r) => [r.id, r.ref]));
  const cText = (comments ?? []).map((c, i) => `[C${i + 1}] (on ${refByPost.get(c.post_id) ?? "unlinked post"}) ${c.body}`).join("\n");
  const out = await callJson({
    schema: audienceSchema,
    maxTokens: 3500,
    system: `You analyse audience comments for a creator and convert them into content opportunities.\n${HONESTY_RULES}\nCite comment refs like "C4" in evidence. Only report what comments actually show.`,
    user: `${profileBlock(profile)}\n\nPOSTS:\n${text}\n\nCOMMENTS:\n${cText}`,
  });
  await persist(supabase, userId, "audience", out, comments?.length ?? 0);
}

export async function reviewDraft(supabase: SupabaseClient, userId: string, draft: string, platform: string) {
  const { profile, posts } = await loadCreator(supabase, userId);
  require(posts.length >= 5, "Import at least 5 posts first so the review can be based on your own history.");
  const [dna, perf] = await Promise.all([
    latest<WritingDna>(supabase, userId, "writing_dna"),
    latest<unknown>(supabase, userId, "performance_patterns"),
  ]);
  const top = posts.filter(hasMetrics).slice(0, 40);
  const { text, refs } = serialisePosts(top.length >= 3 ? top : posts, 450);
  const out = await callJson({
    schema: draftReviewSchema,
    maxTokens: 4500,
    system: `You are this creator's personal content strategist reviewing a draft BEFORE they publish. Judge it against their Writing DNA, past performance and goals.\n${HONESTY_RULES}\nImportant behaviour:\n- Do NOT rewrite everything. Give targeted suggestions the creator can accept or reject individually.\n- Each suggestion's original_excerpt MUST be copied verbatim from the draft (so it can be replaced in place); suggested_replacement must keep the creator's voice per the Writing DNA. If a suggestion is advice only (no specific text change), leave both excerpt fields empty.\n- Give each suggestion a unique id like "s1", "s2".\n- Explain WHY each change helps, referencing their own posts (refs) when relevant.\n- Never promise performance outcomes. Cover hook, structure, clarity, CTA and anything needing clarification.\n- If no Writing DNA or pattern analysis exists, say your voice judgement is based on raw posts only.`,
    user: `${profileBlock(profile)}\n\nWRITING_DNA: ${dna ? JSON.stringify(dna.result) : "not yet generated"}\nPERFORMANCE_PATTERNS: ${perf ? JSON.stringify(perf.result) : "not yet generated"}\n\nPAST POSTS:\n${text}\n\nTARGET PLATFORM: ${platform}\n\nDRAFT:\n"""\n${draft}\n"""`,
  });
  const result: DraftReview & { applicable: Record<string, boolean> } = {
    ...out,
    suggestions: out.suggestions.map((s, i) => ({ ...s, id: s.id || `s${i + 1}`, evidence: mapEvidence(s.evidence, refs) })),
    applicable: {},
  };
  // Only suggestions whose excerpt really exists in the draft can be applied automatically.
  result.suggestions.forEach((s) => {
    result.applicable[s.id] = !!s.original_excerpt && !!s.suggested_replacement && draft.includes(s.original_excerpt);
  });
  const { data, error } = await supabase.from("draft_reviews").insert({
    user_id: userId, platform, draft, result, model: MODEL,
  }).select("id").single();
  if (error) throw new UserFacingError(`Could not save review: ${error.message}`);
  return data.id as string;
}

export async function generateIdeas(supabase: SupabaseClient, userId: string, focus?: string) {
  const { profile, posts } = await loadCreator(supabase, userId);
  require(posts.length >= 3, "Import at least 3 posts so ideas are based on your history, not generic prompts.");
  const [dna, perf, gaps, { data: existing }] = await Promise.all([
    latest<WritingDna>(supabase, userId, "writing_dna"),
    latest<unknown>(supabase, userId, "performance_patterns"),
    latest<unknown>(supabase, userId, "content_gaps"),
    supabase.from("ideas").select("topic").eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
  ]);
  const { text } = serialisePosts(posts, 350);
  const out = await callJson({
    schema: ideasSchema,
    maxTokens: 3500,
    system: `You generate personalised content ideas for one specific creator.\n${HONESTY_RULES}\nGenerate 6 ideas. Each needs: topic, a ready-to-use opening hook written in the creator's voice (follow Writing DNA), main angle, rationale (why it fits THIS creator — reference their history/gaps/goals), and a suggested format (prefer their preferred formats). Do NOT suggest topics they have already covered extensively or topics in PREVIOUS_IDEAS. Prefer neglected-but-relevant topics and angles adjacent to their best-performing topics. No generic ideas ("5 tips for…") unless truly grounded.`,
    user: `${profileBlock(profile)}\n\nFOCUS_REQUEST: ${focus || "none"}\nWRITING_DNA: ${dna ? JSON.stringify(dna.result) : "not yet generated"}\nPERFORMANCE_PATTERNS: ${perf ? JSON.stringify(perf.result) : "not yet generated"}\nCONTENT_GAPS: ${gaps ? JSON.stringify(gaps.result) : "not yet generated"}\nPREVIOUS_IDEAS: ${(existing ?? []).map((e) => e.topic).join(" | ") || "none"}\n\nPOSTS (${posts.length}):\n\n${text}`,
  });
  const batch = crypto.randomUUID();
  const { error } = await supabase.from("ideas").insert(
    out.ideas.map((i) => ({ user_id: userId, batch_id: batch, topic: i.topic, hook: i.hook, angle: i.angle, rationale: i.rationale, format: i.format })),
  );
  if (error) throw new UserFacingError(`Could not save ideas: ${error.message}`);
}
