import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createLlmClient, resolveModel } from "@/lib/ai/anthropic-client";
import {
  DEFAULT_OPENCODE_MODEL,
  OPENCODE_CONFIG,
  OpencodeCliLlmClient,
  buildPrompt,
  extractJson,
  parseEvents,
  type OpencodeRunner,
} from "@/lib/ai/opencode-client";
import { estimateCostUsd } from "@/lib/ai/pricing";

const Schema = z.strictObject({ ok: z.boolean(), n: z.number() });
const req = { model: "opencode-go/hy4-flash-free", system: "Sistema", user: "<noticia>dato</noticia>", schema: Schema };

const textEvent = (text: string) => JSON.stringify({ type: "text", part: { type: "text", text } });

function runner(stdout: string, extra: Partial<{ code: number; timedOut: boolean }> = {}) {
  const calls: Array<{ args: string[]; input: string; env: NodeJS.ProcessEnv; cwd: string }> = [];
  const run: OpencodeRunner = async (args, input, env, cwd) => {
    calls.push({ args, input, env, cwd });
    return { code: extra.code ?? 0, stdout, timedOut: extra.timedOut ?? false };
  };
  return { run, calls };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseEvents / extractJson", () => {
  it("une los textos, detecta errores y suma tokens si el CLI los da", () => {
    const out = parseEvents(
      [
        '{"type":"step_start"}',
        textEvent('{"ok":'),
        textEvent("true}"),
        "línea que no es JSON",
        JSON.stringify({ type: "step_finish", part: { tokens: { input: 10, output: 5 } } }),
      ].join("\n"),
    );
    expect(out.text).toBe('{"ok":true}');
    expect(out.error).toBeNull();
    expect(out.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
    expect(parseEvents('{"type":"error","error":{"message":"Free usage limit reached"}}').error).toBe("Free usage limit reached");
  });

  it("extrae el objeto aunque venga con texto o en un bloque ```json", () => {
    expect(extractJson('Aquí tienes:\n```json\n{"ok":true,"n":1}\n```')).toEqual({ ok: true, n: 1 });
    expect(extractJson('Respuesta: {"ok":false,"n":2} fin')).toEqual({ ok: false, n: 2 });
    expect(extractJson("sin json")).toBeUndefined();
    expect(extractJson("{roto")).toBeUndefined();
  });
});

describe("OpencodeCliLlmClient", () => {
  it("devuelve datos validados por el esquema", async () => {
    const { run, calls } = runner(textEvent('{"ok":true,"n":3}'));
    const out = await new OpencodeCliLlmClient(run).complete(req);
    expect(out).toEqual({ ok: true, data: { ok: true, n: 3 }, model: req.model, usage: { input_tokens: 0, output_tokens: 0 } });
    const c = calls[0];
    // Agente sin herramientas, modelo pedido y salida en eventos JSON.
    expect(c.args).toEqual(["run", "--standalone", "-m", req.model, "--agent", "avitech-json", "--format", "json"]);
    // El prompt va por la entrada estándar, con el esquema y los datos.
    expect(c.input).toContain("<json_schema>");
    expect(c.input).toContain("<noticia>dato</noticia>");
  });

  it("no hereda secretos del servidor y declara el agente sin herramientas", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "secreto-supabase");
    vi.stubEnv("AI_API_KEY", "secreto-ia");
    const { run, calls } = runner(textEvent('{"ok":true,"n":1}'));
    await new OpencodeCliLlmClient(run).complete(req);
    const env = calls[0].env;
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(env.AI_API_KEY).toBeUndefined();
    expect(JSON.stringify(env)).not.toContain("secreto");
    const cfg = JSON.parse(env.OPENCODE_CONFIG_CONTENT!);
    expect(cfg).toEqual(JSON.parse(OPENCODE_CONFIG));
    expect(cfg.agent["avitech-json"].tools).toEqual({ "*": false });
    expect(cfg.agent["avitech-json"].permission).toEqual({ edit: "deny", bash: "deny", webfetch: "deny" });
    expect(calls[0].cwd).toMatch(/avitech-opencode-empty$/);
  });

  it("marca inválida una respuesta que no cumple el esquema", async () => {
    const { run } = runner(textEvent('{"ok":"sí","n":3,"extra":1}'));
    expect(await new OpencodeCliLlmClient(run).complete(req)).toEqual({ ok: false, reason: "invalid" });
  });

  it("marca error si el CLI informa un error, no responde o se agota el tiempo", async () => {
    expect(await new OpencodeCliLlmClient(runner('{"type":"error","error":{"message":"limit"}}').run).complete(req)).toEqual({ ok: false, reason: "error" });
    expect(await new OpencodeCliLlmClient(runner("").run).complete(req)).toEqual({ ok: false, reason: "error" });
    expect(await new OpencodeCliLlmClient(runner(textEvent('{"ok":true,"n":1}'), { timedOut: true }).run).complete(req)).toEqual({ ok: false, reason: "error" });
    const throwing: OpencodeRunner = async () => {
      throw new Error("spawn failed");
    };
    expect(await new OpencodeCliLlmClient(throwing).complete(req)).toEqual({ ok: false, reason: "error" });
  });

  it("incluye el esquema JSON en el prompt", () => {
    const p = buildPrompt(req);
    expect(p.startsWith("Sistema")).toBe(true);
    expect(p).toContain('"additionalProperties":false');
  });
});

describe("selección de proveedor y modelo", () => {
  it("usa opencode solo si AI_PROVIDER=opencode y no es producción", () => {
    vi.stubEnv("AI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("AI_PROVIDER", "opencode");
    expect(createLlmClient()).toBeInstanceOf(OpencodeCliLlmClient);
    vi.stubEnv("NODE_ENV", "production");
    expect(createLlmClient()).toBeNull();
  });

  it("con opencode ignora los modelos de Claude y usa AI_MODEL_OPENCODE o el gratuito por defecto", () => {
    vi.stubEnv("AI_PROVIDER", "opencode");
    vi.stubEnv("AI_MODEL_ANALYSIS", "claude-sonnet-5-5");
    vi.stubEnv("AI_MODEL_OPENCODE", "");
    expect(resolveModel("AI_MODEL_BRIEF")).toBe(DEFAULT_OPENCODE_MODEL);
    vi.stubEnv("AI_MODEL_OPENCODE", "opencode-go/hungerg-free");
    expect(resolveModel("AI_MODEL_EXTRACTION")).toBe("opencode-go/hungerg-free");
  });

  it("con Anthropic mantiene la cadena variable del agente → AI_MODEL_ANALYSIS → por defecto", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("AI_MODEL_BRIEF", "claude-haiku-5-5");
    vi.stubEnv("AI_MODEL_ANALYSIS", "claude-opus-5-5");
    expect(resolveModel("AI_MODEL_BRIEF")).toBe("claude-haiku-5-5");
    vi.stubEnv("AI_MODEL_BRIEF", "");
    expect(resolveModel("AI_MODEL_BRIEF")).toBe("claude-opus-5-5");
    vi.stubEnv("AI_MODEL_ANALYSIS", "");
    expect(resolveModel("AI_MODEL_EXTRACTION")).toBe("claude-sonnet-5-5");
  });

  it("los modelos gratuitos de opencode cuestan 0; los desconocidos, el precio más caro", () => {
    expect(estimateCostUsd("opencode-go/hy4-flash-free", 100_000, 10_000)).toBe(0);
    expect(estimateCostUsd("opencode/deepseek-v4-pro", 1_000_000, 0)).toBe(4);
  });
});
