import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export class AIError extends Error {
  constructor(message: string, public code: "not_configured" | "bad_output" | "api_error" = "api_error") {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIError("ANTHROPIC_API_KEY is not configured on the server.", "not_configured");
  }
  return (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

/** Calls Claude and returns schema-validated JSON. Retries once, feeding back the validation error. */
export async function callJson<T extends z.ZodTypeAny>(opts: {
  system: string;
  user: string;
  schema: T;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const anthropic = getClient();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }];
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let text = "";
    try {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 4096,
        system: opts.system + "\n\nRespond with a single valid JSON object and nothing else.",
        messages,
      });
      text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } catch (e) {
      throw new AIError(e instanceof Error ? e.message : "Claude API request failed", "api_error");
    }
    try {
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "invalid JSON";
    }
    messages.push(
      { role: "assistant", content: text || "{}" },
      { role: "user", content: `That output was invalid (${lastError}). Return corrected JSON only.` },
    );
  }
  throw new AIError(`The AI returned malformed output twice (${lastError}). Please try again.`, "bad_output");
}
