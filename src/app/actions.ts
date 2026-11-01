"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isClaudeConfigured } from "@/lib/supabase/env";
import { AIError } from "@/lib/ai/claude";
import {
  UserFacingError, generateIdeas, reviewDraft, runAudience, runGaps, runPerformance, runWritingDna,
} from "@/lib/ai/analyses";
import { fetchXOembed, manualPostSchema, parseCsv, parseXUrl, detectPlatform } from "@/lib/import";
import { SAMPLE_COMMENTS, SAMPLE_POSTS } from "@/lib/sample-data";
import type { AnalysisKind } from "@/lib/types";

export type ActionResult<T = undefined> = { ok: true; message?: string; data?: T } | { ok: false; error: string };

const fail = (error: string): ActionResult<never> => ({ ok: false, error });

async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

function errMsg(e: unknown): string {
  if (e instanceof UserFacingError) return e.message;
  if (e instanceof AIError) {
    return e.code === "not_configured"
      ? "AI features need ANTHROPIC_API_KEY to be set on the server. See Settings → Setup."
      : e.message;
  }
  console.error(e);
  return "Something went wrong. Please try again.";
}

// ------------------------------------------------------------------ auth
const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function signUp(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = credsSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) return fail(error.message);
  if (!data.session) return { ok: true, message: "Check your email to confirm your account, then sign in." };
  redirect("/onboarding");
}

export async function signIn(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = credsSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(error.message);
  redirect("/overview");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ------------------------------------------------------------ onboarding
const profileSchema = z.object({
  creator_name: z.string().trim().max(80).optional(),
  primary_platform: z.enum(["x", "linkedin", "instagram", "youtube", "newsletter", "other"]).optional(),
  niche: z.string().trim().max(200).optional(),
  goals: z.string().trim().max(1000).optional(),
  preferred_formats: z.array(z.string().max(40)).max(10).default([]),
});

export async function saveProfile(input: z.input<typeof profileSchema>, complete = false): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const v = parsed.data;
  if (complete && !v.creator_name) return fail("Please tell us your creator name.");
  const { error } = await supabase.from("profiles").update({
    creator_name: v.creator_name || null,
    primary_platform: v.primary_platform ?? null,
    niche: v.niche || null,
    goals: v.goals || null,
    preferred_formats: v.preferred_formats,
    ...(complete ? { onboarding_completed: true } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved" };
}

export async function skipOnboarding(): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
  if (error) return fail(error.message);
  return { ok: true };
}

// ---------------------------------------------------------------- import
async function insertPosts(
  rows: Record<string, unknown>[],
): Promise<ActionResult<{ added: number; duplicates: number }>> {
  const { supabase, user } = await authed();
  const { data: existing } = await supabase.from("posts").select("content, url, external_id").eq("user_id", user.id);
  const seen = new Set((existing ?? []).map((e) => e.content.trim()));
  const seenUrl = new Set((existing ?? []).map((e) => e.url).filter(Boolean));
  const seenId = new Set((existing ?? []).map((e) => e.external_id).filter(Boolean));
  const fresh = rows.filter((r) => {
    const c = String(r.content).trim();
    if (seen.has(c) || (r.url && seenUrl.has(r.url as string)) || (r.external_id && seenId.has(r.external_id as string))) return false;
    seen.add(c);
    return true;
  });
  if (fresh.length) {
    const { error } = await supabase.from("posts").insert(fresh.map((r) => ({ ...r, user_id: user.id })));
    if (error) return fail(error.message);
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { added: fresh.length, duplicates: rows.length - fresh.length } };
}

export async function importManual(input: Record<string, string>): Promise<ActionResult> {
  const parsed = manualPostSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await insertPosts([{ ...parsed.data, source: "manual" }]);
  if (!res.ok) return res;
  return res.data!.added ? { ok: true, message: "Post added to your library." } : fail("That post is already in your library.");
}

export async function importUrl(rawUrl: string): Promise<ActionResult> {
  const x = parseXUrl(rawUrl);
  if (!x) {
    return fail(
      detectPlatform(rawUrl) === "linkedin"
        ? "LinkedIn doesn't offer public access to post text. Paste the post text instead (use the Paste tab)."
        : "Only public X/Twitter post URLs (x.com/user/status/…) can be imported by link. For anything else, paste the text.",
    );
  }
  let post;
  try {
    post = await fetchXOembed(x.url);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Couldn't import that URL.");
  }
  const res = await insertPosts([{
    platform: "x", source: "url", url: x.url, external_id: x.id, content: post.content,
    published_at: post.published_at, likes: null, comments: null, reposts: null, impressions: null,
  }]);
  if (!res.ok) return res;
  return res.data!.added
    ? { ok: true, message: "Imported. Public links don't include engagement numbers — add them by editing the post or upload an analytics CSV." }
    : fail("That post is already in your library.");
}

export async function importCsv(text: string, platform: string): Promise<ActionResult<{ added: number; duplicates: number; skipped: number }>> {
  const p = z.enum(["x", "linkedin", "instagram", "youtube", "newsletter", "other"]).safeParse(platform);
  if (!p.success) return fail("Choose a platform for this file.");
  if (text.length > 5_000_000) return fail("File is too large (max ~5 MB).");
  const parsed = parseCsv(text);
  if (parsed.error) return fail(parsed.error);
  const res = await insertPosts(parsed.posts.map((r) => ({ ...r, platform: p.data, source: "csv" })));
  if (!res.ok) return res;
  return { ok: true, data: { ...res.data!, skipped: parsed.skipped } };
}

export async function updatePostMetrics(id: string, input: Record<string, string>): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const m = manualPostSchema.pick({ likes: true, comments: true, reposts: true, impressions: true }).safeParse(input);
  if (!m.success) return fail(m.error.issues[0].message);
  const { error } = await supabase.from("posts").update(m.data).eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message);
  revalidatePath("/library");
  return { ok: true, message: "Metrics updated" };
}

export async function deletePost(id: string): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("posts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addSampleData(): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_sample", true);
  if (count) return fail("Sample data is already loaded.");
  const now = Date.now();
  const rows = SAMPLE_POSTS.map(([days, content, likes, comments, reposts, impressions]) => ({
    user_id: user.id, platform: "x", source: "manual", is_sample: true, content,
    published_at: new Date(now - days * 86400000).toISOString(), likes, comments, reposts, impressions,
  }));
  const { data, error } = await supabase.from("posts").insert(rows).select("id, content");
  if (error) return fail(error.message);
  const byIdx = (data ?? []);
  const commentRows = SAMPLE_COMMENTS.map(([n, body]) => {
    const target = SAMPLE_POSTS[n - 1];
    const post = byIdx.find((p) => p.content === target[1]);
    return { user_id: user.id, post_id: post?.id ?? null, body };
  });
  await supabase.from("audience_comments").insert(commentRows);
  revalidatePath("/", "layout");
  return { ok: true, message: "Sample data loaded (clearly labelled 'Sample')." };
}

export async function removeSampleData(): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("posts").delete().eq("user_id", user.id).eq("is_sample", true);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true, message: "Sample data removed." };
}

// -------------------------------------------------------------------- AI
function needAi(): ActionResult | null {
  return isClaudeConfigured ? null : fail("AI features need ANTHROPIC_API_KEY to be set on the server. See Settings → Setup.");
}

export async function runAnalysis(kind: AnalysisKind): Promise<ActionResult> {
  const missing = needAi();
  if (missing) return missing;
  const { supabase, user } = await authed();
  try {
    if (kind === "writing_dna") await runWritingDna(supabase, user.id);
    else if (kind === "performance_patterns") await runPerformance(supabase, user.id);
    else if (kind === "content_gaps") await runGaps(supabase, user.id);
    else if (kind === "audience") await runAudience(supabase, user.id);
    else return fail("Unknown analysis");
  } catch (e) {
    return fail(errMsg(e));
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Analysis updated" };
}

const draftSchema = z.object({
  draft: z.string().trim().min(20, "Paste a draft of at least 20 characters").max(10000),
  platform: z.enum(["x", "linkedin", "instagram", "youtube", "newsletter", "other"]),
});

export async function reviewDraftAction(input: { draft: string; platform: string }): Promise<ActionResult<{ id: string }>> {
  const missing = needAi();
  if (missing) return missing as ActionResult<{ id: string }>;
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { supabase, user } = await authed();
  try {
    const id = await reviewDraft(supabase, user.id, parsed.data.draft, parsed.data.platform);
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(errMsg(e));
  }
}

export async function saveAcceptedSuggestions(reviewId: string, accepted: string[]): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("draft_reviews").update({ accepted_suggestions: accepted.slice(0, 50) })
    .eq("id", reviewId).eq("user_id", user.id);
  return error ? fail(error.message) : { ok: true };
}

export async function generateIdeasAction(focus: string): Promise<ActionResult> {
  const missing = needAi();
  if (missing) return missing;
  const { supabase, user } = await authed();
  try {
    await generateIdeas(supabase, user.id, focus.trim().slice(0, 300) || undefined);
  } catch (e) {
    return fail(errMsg(e));
  }
  revalidatePath("/ideas");
  return { ok: true, message: "New ideas generated" };
}

export async function setIdeaStatus(id: string, status: "new" | "saved" | "dismissed" | "used"): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("ideas").update({ status }).eq("id", id).eq("user_id", user.id);
  if (error) return fail(error.message);
  revalidatePath("/ideas");
  return { ok: true };
}

export async function importComments(text: string): Promise<ActionResult> {
  const { supabase, user } = await authed();
  const lines = text.split(/\n{1,}/).map((l) => l.trim()).filter(Boolean).slice(0, 300);
  if (lines.length === 0) return fail("Paste at least one comment (one per line).");
  const { error } = await supabase.from("audience_comments").insert(
    lines.map((body) => ({ user_id: user.id, body: body.slice(0, 5000) })),
  );
  if (error) return fail(error.message);
  revalidatePath("/audience");
  return { ok: true, message: `Added ${lines.length} comments.` };
}
