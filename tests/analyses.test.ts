import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER, fakeSupabase, mkPost, posts, profile } from "./helpers";

// Mock only the network call; everything else (prompts' inputs, validation, persistence) is real.
const callJson = vi.fn();
vi.mock("@/lib/ai/claude", () => ({ MODEL: "test-model", callJson: (...a: unknown[]) => callJson(...a), AIError: class extends Error {} }));

import { UserFacingError, generateIdeas, reviewDraft, runAudience, runGaps, runPerformance, runWritingDna } from "@/lib/ai/analyses";

const setup = (ps = posts(10), extra: Record<string, Record<string, unknown>[]> = {}) =>
  fakeSupabase({ profiles: [{ ...profile }], posts: ps as never, ...extra });

beforeEach(() => callJson.mockReset());

describe("minimum-data thresholds (no AI call on thin data)", () => {
  it("DNA needs 5 posts", async () => {
    const { client } = setup(posts(4));
    await expect(runWritingDna(client, USER)).rejects.toThrow(UserFacingError);
    expect(callJson).not.toHaveBeenCalled();
  });
  it("performance needs 8 posts AND 5 with metrics", async () => {
    await expect(runPerformance(setup(posts(7)).client, USER)).rejects.toThrow(/at least 8/);
    await expect(runPerformance(setup(posts(10, false)).client, USER)).rejects.toThrow(/engagement numbers/);
    expect(callJson).not.toHaveBeenCalled();
  });
  it("gaps need 8, audience needs 5 comments, ideas need 3 posts, draft review needs 5", async () => {
    await expect(runGaps(setup(posts(7)).client, USER)).rejects.toThrow();
    await expect(runAudience(setup(posts(10)).client, USER)).rejects.toThrow(/comments/);
    await expect(generateIdeas(setup(posts(2)).client, USER)).rejects.toThrow();
    await expect(reviewDraft(setup(posts(4)).client, USER, "draft", "x")).rejects.toThrow();
    expect(callJson).not.toHaveBeenCalled();
  });
});

describe("evidence integrity", () => {
  it("maps cited refs to real post ids and drops invented ones", async () => {
    const ps = posts(6);
    const { client, db } = setup(ps);
    callJson.mockResolvedValue({
      summary: "s", confidence: "medium", caveats: "", signature_phrases: [], voice_rules: { do: [], dont: [] },
      dimensions: [{ key: "tone", finding: "f", evidence: ["P1", "[p2]", "P99", "nonsense"] }],
    });
    await runWritingDna(client, USER);
    const saved = db.analyses[0].result as { dimensions: { evidence: string[] }[] };
    expect(saved.dimensions[0].evidence).toEqual([ps[0].id, ps[1].id]);
  });

  it("performance results persist computed stats alongside AI output", async () => {
    const { client, db } = setup(posts(10));
    callJson.mockResolvedValue({ headline: "h", data_limits: "", findings: [], recommendations: [] });
    await runPerformance(client, USER);
    const r = db.analyses[0].result as { stats: { totalPosts: number } };
    expect(r.stats.totalPosts).toBe(10);
  });

  it("sends missing metrics to the model as n/a, never 0", async () => {
    const { client } = setup([...posts(5), mkPost({ content: "NOMETRICS" })]);
    callJson.mockResolvedValue({ summary: "s", confidence: "low", caveats: "", signature_phrases: [], voice_rules: { do: [], dont: [] }, dimensions: [] });
    await runWritingDna(client, USER);
    const prompt = callJson.mock.calls[0][0].user as string;
    const block = prompt.split("---").find((b) => b.includes("NOMETRICS"))!;
    expect(block).toContain("likes=n/a");
    expect(block).toContain("engagement_rate=n/a");
    expect(block).not.toContain("likes=0");
  });
});

describe("persistence & versioning", () => {
  it("increments version on each run and scopes rows to the user", async () => {
    const { client, db } = setup(posts(6));
    callJson.mockResolvedValue({ summary: "s", confidence: "low", caveats: "", signature_phrases: [], voice_rules: { do: [], dont: [] }, dimensions: [] });
    await runWritingDna(client, USER);
    await runWritingDna(client, USER);
    expect(db.analyses.map((a) => a.version)).toEqual([1, 2]);
    expect(db.analyses.every((a) => a.user_id === USER && a.model === "test-model" && a.posts_analysed === 6)).toBe(true);
  });
});

describe("draft review: creator stays in control", () => {
  const draft = "Big news. AI is changing everything. Follow me for more.";
  const review = {
    assessment: "a", voice_match: { rating: "partial", notes: "n" }, strengths: [], weaknesses: [],
    hook: { verdict: "weak", notes: "n" }, structure_notes: "", needs_clarification: [],
    suggestions: [
      { id: "s1", type: "hook", original_excerpt: "Big news.", suggested_replacement: "I broke prod on Friday.", reasoning: "r", impact: "high", evidence: ["P1"] },
      { id: "s2", type: "clarity", original_excerpt: "NOT IN THE DRAFT", suggested_replacement: "x", reasoning: "r", impact: "low", evidence: [] },
      { id: "s3", type: "cta", original_excerpt: "", suggested_replacement: "", reasoning: "advice only", impact: "low", evidence: [] },
    ],
  };

  it("only marks suggestions applicable when the excerpt exists verbatim in the draft", async () => {
    const { client, db } = setup(posts(6));
    callJson.mockResolvedValue(review);
    const id = await reviewDraft(client, USER, draft, "x");
    const saved = db.draft_reviews[0];
    expect(saved.id).toBe(id);
    expect(saved.draft).toBe(draft);
    expect((saved.result as { applicable: Record<string, boolean> }).applicable).toEqual({ s1: true, s2: false, s3: false });
    expect(saved.accepted_suggestions ?? []).toEqual([]);
  });

  it("includes Writing DNA in the prompt when it exists, and says so when it doesn't", async () => {
    callJson.mockResolvedValue(review);
    await reviewDraft(setup(posts(6)).client, USER, draft, "x");
    expect(callJson.mock.calls[0][0].user).toContain("WRITING_DNA: not yet generated");
    callJson.mockClear();
    const withDna = setup(posts(6), { analyses: [{ user_id: USER, kind: "writing_dna", version: 1, created_at: "2026-01-01", result: { summary: "BLUNT_VOICE" } }] });
    await reviewDraft(withDna.client, USER, draft, "x");
    expect(callJson.mock.calls[0][0].user).toContain("BLUNT_VOICE");
  });
});

describe("idea generation", () => {
  it("saves ideas and tells the model not to repeat previous ones", async () => {
    const { client, db } = setup(posts(6), { ideas: [{ user_id: USER, topic: "OLD_TOPIC", created_at: "2026-01-01" }] });
    callJson.mockResolvedValue({ ideas: [{ topic: "T", hook: "H", angle: "A", rationale: "R", format: "Thread" }] });
    await generateIdeas(client, USER, "founders");
    expect(callJson.mock.calls[0][0].user).toContain("OLD_TOPIC");
    expect(callJson.mock.calls[0][0].user).toContain("founders");
    const newIdeas = db.ideas.filter((i) => i.topic === "T");
    expect(newIdeas).toHaveLength(1);
    expect(newIdeas[0]).toMatchObject({ user_id: USER, hook: "H" });
  });
});
