import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AnthropicLlmClient, apiKeyFromEnv, createLlmClient } from "@/lib/ai/anthropic-client";

const { constructed } = vi.hoisted(() => ({ constructed: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    constructor(options: unknown) {
      constructed(options);
    }
  },
}));

const schema = z.object({ ok: z.boolean() });

function fakeAnthropic(result: unknown) {
  const parse = vi.fn().mockResolvedValue(result);
  return { client: { messages: { parse } } as never, parse };
}

describe("adaptador Anthropic del LlmClient", () => {
  it("devuelve datos validados, modelo y uso de tokens", async () => {
    const { client, parse } = fakeAnthropic({
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 5 },
      parsed_output: { ok: true },
    });
    const r = await new AnthropicLlmClient(client).complete({ model: "m", system: "s", user: "u", schema });
    expect(r).toEqual({ ok: true, data: { ok: true }, model: "m", usage: { input_tokens: 10, output_tokens: 5 } });
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("m");
    expect(args.system).toBe("s");
    expect(args.messages).toEqual([{ role: "user", content: "u" }]);
    expect(args.output_config.format).toBeDefined();
  });

  it("distingue rechazo, salida inválida y error", async () => {
    const refusal = fakeAnthropic({ stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 }, parsed_output: null });
    expect(await new AnthropicLlmClient(refusal.client).complete({ model: "m", system: "s", user: "u", schema })).toEqual({
      ok: false,
      reason: "refusal",
    });

    const invalid = fakeAnthropic({
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
      parsed_output: { ok: "sí" },
    });
    expect(await new AnthropicLlmClient(invalid.client).complete({ model: "m", system: "s", user: "u", schema })).toEqual({
      ok: false,
      reason: "invalid",
    });

    const empty = fakeAnthropic({ stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 0 }, parsed_output: null });
    expect(await new AnthropicLlmClient(empty.client).complete({ model: "m", system: "s", user: "u", schema })).toEqual({
      ok: false,
      reason: "invalid",
    });

    const boom = { messages: { parse: vi.fn().mockRejectedValue(new Error("net")) } } as never;
    expect(await new AnthropicLlmClient(boom).complete({ model: "m", system: "s", user: "u", schema })).toEqual({
      ok: false,
      reason: "error",
    });
  });
});

describe("fábrica del cliente", () => {
  const saved = { ai: process.env.AI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY };
  afterEach(() => {
    if (saved.ai === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = saved.ai;
    if (saved.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved.anthropic;
  });

  it("no inventa un cliente si falta la clave", () => {
    delete process.env.AI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    expect(apiKeyFromEnv()).toBeNull();
    expect(createLlmClient()).toBeNull();
  });

  it("usa AI_API_KEY o ANTHROPIC_API_KEY cuando existen", () => {
    process.env.AI_API_KEY = "  test-key  ";
    expect(apiKeyFromEnv()).toBe("test-key");
    expect(createLlmClient()).not.toBeNull();
    expect(constructed).toHaveBeenCalledWith({ apiKey: "test-key" });
    delete process.env.AI_API_KEY;
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    expect(apiKeyFromEnv()).toBe("anthropic-key");
  });
});
