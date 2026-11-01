import Papa from "papaparse";
import { z } from "zod";
import type { Platform } from "./types";

export interface ParsedPost {
  content: string;
  published_at: string | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  impressions: number | null;
  url: string | null;
  external_id: string | null;
}

/** Blank / non-numeric => null ("unavailable"), never 0. */
export function toCount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[, ]/g, "").trim();
  if (s === "" || s === "-" || s.toLowerCase() === "n/a") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function toDate(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Header synonyms covering generic CSVs and X (Twitter) analytics exports.
const COLS = {
  content: ["content", "text", "post", "post text", "tweet", "tweet text", "body", "full_text"],
  date: ["date", "time", "created_at", "published_at", "published", "created", "posted"],
  likes: ["likes", "like count", "like_count", "favorites", "reactions"],
  comments: ["comments", "replies", "reply count", "reply_count", "comment_count"],
  reposts: ["reposts", "retweets", "retweet count", "retweet_count", "shares", "share_count"],
  impressions: ["impressions", "views", "impression_count", "view_count"],
  url: ["url", "link", "post link", "tweet permalink", "permalink", "post url"],
  id: ["id", "post id", "tweet id", "post_id"],
};

function pick(row: Record<string, string>, names: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const n of names) {
    const k = keys.find((x) => x.trim().toLowerCase() === n);
    if (k !== undefined) return row[k];
  }
  return undefined;
}

export function parseCsv(text: string): { posts: ParsedPost[]; skipped: number; error?: string } {
  const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (res.data.length === 0) return { posts: [], skipped: 0, error: "The CSV has no rows." };
  const headers = (res.meta.fields ?? []).map((h) => h.trim().toLowerCase());
  if (!COLS.content.some((c) => headers.includes(c))) {
    return { posts: [], skipped: 0, error: `No post text column found. Expected one of: ${COLS.content.join(", ")}.` };
  }
  let skipped = 0;
  const posts: ParsedPost[] = [];
  for (const row of res.data.slice(0, 2000)) {
    const content = pick(row, COLS.content)?.trim();
    if (!content) { skipped++; continue; }
    posts.push({
      content: content.slice(0, 25000),
      published_at: toDate(pick(row, COLS.date)),
      likes: toCount(pick(row, COLS.likes)),
      comments: toCount(pick(row, COLS.comments)),
      reposts: toCount(pick(row, COLS.reposts)),
      impressions: toCount(pick(row, COLS.impressions)),
      url: pick(row, COLS.url)?.trim() || null,
      external_id: pick(row, COLS.id)?.trim() || null,
    });
  }
  return { posts, skipped };
}

export const manualPostSchema = z.object({
  content: z.string().trim().min(1, "Post content is required").max(25000),
  platform: z.enum(["x", "linkedin", "instagram", "youtube", "newsletter", "other"]),
  published_at: z.string().optional().transform((v) => (v ? toDate(v) : null)),
  likes: z.string().optional().transform(toCount),
  comments: z.string().optional().transform(toCount),
  reposts: z.string().optional().transform(toCount),
  impressions: z.string().optional().transform(toCount),
});

/** Parses https://x.com/<user>/status/<id> style URLs. Only these hosts are ever fetched (SSRF guard). */
export function parseXUrl(raw: string): { url: string; id: string } | null {
  try {
    const u = new URL(raw.trim());
    if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(u.hostname)) return null;
    const m = u.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})/);
    if (!m) return null;
    return { url: `https://x.com/${m[1]}/status/${m[2]}`, id: m[2] };
  } catch {
    return null;
  }
}

export function detectPlatform(raw: string): Platform | null {
  try {
    const h = new URL(raw.trim()).hostname.replace(/^www\./, "");
    if (["x.com", "twitter.com", "mobile.twitter.com"].includes(h)) return "x";
    if (h === "linkedin.com") return "linkedin";
  } catch { /* ignore */ }
  return null;
}

function decodeEntities(s: string) {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&mdash;/g, "—")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

/**
 * Fetches a public post through X's official oEmbed endpoint (no auth bypass, no scraping).
 * oEmbed exposes text + author + sometimes date, but NEVER metrics — those stay null.
 */
export async function fetchXOembed(url: string): Promise<{ content: string; published_at: string | null }> {
  const res = await fetch(`https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(url)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(res.status === 404 ? "That post wasn't found or isn't public." : `X returned HTTP ${res.status}.`);
  const json = (await res.json()) as { html?: string };
  const html = json.html ?? "";
  const p = html.match(/<blockquote[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!p) throw new Error("Couldn't read the post text from X's response.");
  const dateMatch = html.match(/&mdash;[\s\S]*?<a[^>]*>([^<]+)<\/a>\s*<\/blockquote>/i);
  const d = dateMatch ? new Date(decodeEntities(dateMatch[1])) : null;
  return { content: decodeEntities(p[1]), published_at: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null };
}
