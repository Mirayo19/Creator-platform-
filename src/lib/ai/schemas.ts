import { z } from "zod";

const ids = z.array(z.string()).default([]);

/** Every claim is tagged so the UI can separate data-backed findings from interpretation/recommendation. */
export const basis = z.enum(["data_supported", "interpretation"]);
export const confidence = z.enum(["low", "medium", "high"]);

export const writingDnaSchema = z.object({
  summary: z.string(),
  confidence,
  caveats: z.string().default(""),
  dimensions: z.array(
    z.object({
      key: z.enum([
        "tone", "sentence_structure", "vocabulary", "rhythm", "hooks", "storytelling",
        "humour", "communication_style", "paragraph_structure", "opinions", "endings",
      ]),
      finding: z.string(),
      evidence: ids,
    }),
  ),
  signature_phrases: z.array(z.string()).default([]),
  voice_rules: z.object({ do: z.array(z.string()), dont: z.array(z.string()) }),
});
export type WritingDna = z.infer<typeof writingDnaSchema>;

export const performanceSchema = z.object({
  headline: z.string(),
  data_limits: z.string().default(""),
  findings: z.array(
    z.object({
      type: z.enum(["strength", "weakness", "pattern"]),
      category: z.string(),
      title: z.string(),
      why: z.string(),
      basis,
      confidence,
      evidence: ids,
    }),
  ),
  recommendations: z.array(z.object({ action: z.string(), reasoning: z.string() })),
});
export type PerformancePatterns = z.infer<typeof performanceSchema>;

export const gapsSchema = z.object({
  covered_topics: z.array(z.object({ topic: z.string(), post_count: z.number(), performance_note: z.string().default("") })),
  gaps: z.array(
    z.object({
      topic: z.string(),
      why_it_is_a_gap: z.string(),
      basis,
      opportunity: z.string(),
    }),
  ),
  overused: z.array(z.object({ topic: z.string(), note: z.string() })).default([]),
});
export type ContentGaps = z.infer<typeof gapsSchema>;

export const draftReviewSchema = z.object({
  assessment: z.string(),
  voice_match: z.object({ rating: z.enum(["weak", "partial", "strong"]), notes: z.string() }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  hook: z.object({ verdict: z.enum(["weak", "ok", "strong"]), notes: z.string() }),
  structure_notes: z.string().default(""),
  needs_clarification: z.array(z.string()).default([]),
  suggestions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["hook", "structure", "clarity", "cta", "tone", "other"]),
      original_excerpt: z.string().default(""),
      suggested_replacement: z.string().default(""),
      reasoning: z.string(),
      impact: z.enum(["low", "medium", "high"]),
      evidence: ids,
    }),
  ),
});
export type DraftReview = z.infer<typeof draftReviewSchema>;

export const ideasSchema = z.object({
  ideas: z.array(
    z.object({
      topic: z.string(),
      hook: z.string(),
      angle: z.string(),
      rationale: z.string(),
      format: z.string(),
    }),
  ),
});
export type IdeasResult = z.infer<typeof ideasSchema>;

export const audienceSchema = z.object({
  questions: z.array(z.object({ question: z.string(), evidence: ids })),
  concerns: z.array(z.object({ concern: z.string(), evidence: ids })),
  disagreements: z.array(z.object({ topic: z.string(), evidence: ids })),
  opportunities: z.array(z.object({ idea: z.string(), why: z.string() })),
  data_limits: z.string().default(""),
});
export type AudienceIntel = z.infer<typeof audienceSchema>;
