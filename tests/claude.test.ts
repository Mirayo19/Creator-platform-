import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));

const schema = z.object({ ok: z.boolean() });
const reply = (text: string) => ({ content: [{ type: "text", text }] });

beforeEach(() => { create.mockReset(); vi.resetModules(); process.env.ANTHROPIC_API_KEY = "test"; });

async function load() { return import("@/lib/ai/claude"); }

describe("callJson", () => {
  it("parses JSON even when wrapped in prose / code fences", async () => {
    create.mockResolvedValue(reply('Sure!\n```json\n{"ok": true}\n```'));
    const { callJson } = await load();
    await expect(callJson({ system: "s", user: "u", schema })).resolves.toEqual({ ok: true });
  });
  it("retries once with the validation error, then succeeds", async () => {
    create.mockResolvedValueOnce(reply('{"ok": "yes"}')).mockResolvedValueOnce(reply('{"ok": true}'));
    const { callJson } = await load();
    await expect(callJson({ system: "s", user: "u", schema })).resolves.toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(create.mock.calls[1][0].messages)).toContain("invalid");
  });
  it("gives up with bad_output after two malformed replies", async () => {
    create.mockResolvedValue(reply("not json at all"));
    const { callJson } = await load();
    await expect(callJson({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "bad_output" });
    expect(create).toHaveBeenCalledTimes(2);
  });
  it("wraps API failures as api_error without retrying", async () => {
    create.mockRejectedValue(new Error("529 overloaded"));
    const { callJson } = await load();
    await expect(callJson({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "api_error" });
    expect(create).toHaveBeenCalledTimes(1);
  });
  it("reports not_configured when the key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { callJson } = await load();
    await expect(callJson({ system: "s", user: "u", schema })).rejects.toMatchObject({ code: "not_configured" });
  });
});
