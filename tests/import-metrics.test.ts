import { describe, expect, it } from "vitest";
import { manualPostSchema, parseCsv, parseXUrl, toCount, detectPlatform } from "@/lib/import";
import { averageEngagementRate, bestPost, engagementRate, features, interactions } from "@/lib/metrics";
import { computeStats } from "@/lib/stats";
import { SAMPLE_POSTS } from "@/lib/sample-data";
import { mkPost } from "./helpers";

describe("toCount: unavailable is never zero", () => {
  it.each([["", null], [undefined, null], ["-", null], ["N/A", null], ["abc", null], ["-5", null], ["0", 0], ["1,234", 1234]])(
    "%j -> %j", (input, expected) => expect(toCount(input)).toBe(expected));
});

describe("parseCsv", () => {
  it("maps X analytics headers and keeps blanks as null", () => {
    const r = parseCsv(`Post text,Date,Impressions,Likes,Replies,Reposts\n"Hello",2026-01-02,1000,50,5,10\n"Bare",2026-01-03,,,,`);
    expect(r.posts).toHaveLength(2);
    expect(r.posts[0]).toMatchObject({ likes: 50, comments: 5, reposts: 10, impressions: 1000 });
    expect(r.posts[1]).toMatchObject({ likes: null, comments: null, reposts: null, impressions: null });
  });
  it("skips rows without text and counts them", () => {
    const r = parseCsv(`text,likes\nhi,1\n,5`);
    expect(r.posts).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });
  it("errors clearly when there is no text column", () => {
    expect(parseCsv("foo,bar\n1,2").error).toMatch(/No post text column/);
  });
  it("errors on an empty file", () => expect(parseCsv("").error).toBeTruthy());
  it("caps rows at 2000", () => {
    const csv = "text\n" + Array.from({ length: 2500 }, (_, i) => `p${i}`).join("\n");
    expect(parseCsv(csv).posts).toHaveLength(2000);
  });
});

describe("parseXUrl (SSRF guard)", () => {
  it("accepts real X/Twitter status URLs and normalises them", () => {
    expect(parseXUrl("https://twitter.com/foo/status/1234567890123?s=20")).toEqual({ url: "https://x.com/foo/status/1234567890123", id: "1234567890123" });
  });
  it.each(["https://evil.com/foo/status/1234567890123", "https://x.com.evil.com/foo/status/1234567890123",
    "http://169.254.169.254/latest", "https://x.com/foo", "not a url", "javascript:alert(1)"])("rejects %s", (u) => expect(parseXUrl(u)).toBeNull());
  it("detects platforms", () => {
    expect(detectPlatform("https://www.linkedin.com/posts/x")).toBe("linkedin");
    expect(detectPlatform("https://x.com/a")).toBe("x");
    expect(detectPlatform("https://example.com")).toBeNull();
  });
});

describe("manualPostSchema", () => {
  it("turns blank metrics into null and parses numbers", () => {
    const r = manualPostSchema.parse({ content: " hi ", platform: "x", likes: "", impressions: "5" });
    expect(r).toMatchObject({ content: "hi", likes: null, impressions: 5 });
  });
  it("rejects empty content and unknown platforms", () => {
    expect(manualPostSchema.safeParse({ content: "  ", platform: "x" }).success).toBe(false);
    expect(manualPostSchema.safeParse({ content: "a", platform: "myspace" }).success).toBe(false);
  });
});

describe("metrics never invent data", () => {
  it("no metrics => no interactions, no rate, no best post", () => {
    const p = mkPost();
    expect(interactions(p)).toBeNull();
    expect(engagementRate(p)).toBeNull();
    expect(bestPost([p])).toBeNull();
    expect(averageEngagementRate([p])).toEqual({ value: null, basedOn: 0 });
  });
  it("rate requires impressions > 0", () => {
    expect(engagementRate(mkPost({ likes: 10, impressions: null }))).toBeNull();
    expect(engagementRate(mkPost({ likes: 10, impressions: 0 }))).toBeNull();
    expect(engagementRate(mkPost({ likes: 10, comments: 5, impressions: 100 }))).toBe(0.15);
  });
  it("partial metrics sum only what exists", () => {
    expect(interactions(mkPost({ likes: 3, comments: null, reposts: 2 }))).toBe(5);
  });
  it("best post prefers rate, falls back to interactions", () => {
    const hiRate = mkPost({ likes: 50, impressions: 100 });
    const hiVolume = mkPost({ likes: 500, impressions: 100000 });
    expect(bestPost([hiRate, hiVolume])?.post).toBe(hiRate);
    const noImp = [mkPost({ likes: 1 }), mkPost({ likes: 9 })];
    expect(bestPost(noImp)).toMatchObject({ basis: "interactions" });
  });
  it("features detects question openings and numbers", () => {
    expect(features("Why do founders fail?\nBecause.").startsWithQuestion).toBe(true);
    expect(features("5 tools I use").hasNumbers).toBe(true);
    expect(features("x".repeat(600)).lengthBucket).toBe("long");
  });
});

describe("computeStats", () => {
  it("excludes posts without metrics from comparisons and averages", () => {
    const s = computeStats([mkPost({ likes: 10 }), mkPost(), mkPost({ likes: 30 })]);
    expect(s.totalPosts).toBe(3);
    expect(s.postsWithMetrics).toBe(2);
    expect(s.byLength[0].avgInteractions).toBe(20);
  });
  it("sample data is well-formed", () => {
    expect(SAMPLE_POSTS.length).toBeGreaterThan(15);
    SAMPLE_POSTS.forEach(([days, content]) => { expect(days).toBeGreaterThan(0); expect(content.length).toBeGreaterThan(0); });
  });
});
