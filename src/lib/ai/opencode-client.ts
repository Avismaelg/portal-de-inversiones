/**
 * Implementación de `LlmClient` sobre el CLI de opencode, SOLO para pruebas en local con modelos
 * gratuitos (AI_PROVIDER=opencode). No es un proveedor de producción: no informa de tokens, depende
 * de la sesión de opencode del equipo y lanza un proceso por llamada.
 *
 * Aislamiento (las fuentes pueden traer instrucciones ocultas):
 * - agente propio sin herramientas y con edición, shell y web denegados;
 * - el proceso corre en una carpeta temporal vacía;
 * - entorno mínimo: no hereda claves de Supabase ni de IA del servidor.
 * El código sigue validando la respuesta con el esquema y las guardas de cada agente.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import type { LlmClient, LlmRequest, LlmResult, LlmUsage } from "./types";

/** Modelo gratuito por defecto cuando AI_PROVIDER=opencode y no se indica otro. */
export const DEFAULT_OPENCODE_MODEL = "opencode-go/hy4-flash-free";

const AGENT = "avitech-json";
const TIMEOUT_MS = 240_000;

/** Configuración en línea: un agente sin ninguna herramienta. No toca la configuración global del usuario. */
export const OPENCODE_CONFIG = JSON.stringify({
  agent: {
    [AGENT]: {
      mode: "primary",
      description: "AviTech: devuelve solo JSON, sin herramientas",
      prompt: "Eres un generador de JSON. No tienes herramientas. Responde solo con el objeto JSON pedido.",
      tools: { "*": false },
      permission: { edit: "deny", bash: "deny", webfetch: "deny" },
    },
  },
});

/** Variables que opencode necesita para encontrar su sesión; nada más. */
const ENV_ALLOW = ["PATH", "Path", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "SystemRoot", "SYSTEMROOT", "XDG_DATA_HOME", "XDG_CONFIG_HOME"];

export interface RunOutput {
  code: number | null;
  stdout: string;
  timedOut: boolean;
}

export type OpencodeRunner = (args: string[], input: string, env: NodeJS.ProcessEnv, cwd: string) => Promise<RunOutput>;

const runProcess: OpencodeRunner = (args, input, env, cwd) =>
  new Promise((resolve) => {
    const bin = process.env.OPENCODE_BIN?.trim() || "opencode";
    const child = spawn(bin, args, { cwd, env, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    let stdout = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, TIMEOUT_MS);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d: string) => {
      stdout += d;
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, timedOut });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input, "utf8");
  });

function minimalEnv(): NodeJS.ProcessEnv {
  const env: Record<string, string> = {};
  for (const k of ENV_ALLOW) {
    const v = process.env[k];
    if (v) env[k] = v;
  }
  env.OPENCODE_CONFIG_CONTENT = OPENCODE_CONFIG;
  return env as NodeJS.ProcessEnv;
}

function emptyDir(): string {
  const dir = path.join(tmpdir(), "avitech-opencode-empty");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Texto del modelo y errores a partir de los eventos JSON (una línea por evento) del CLI. */
export function parseEvents(stdout: string): { text: string; error: string | null; usage: LlmUsage } {
  let text = "";
  let error: string | null = null;
  const usage: LlmUsage = { input_tokens: 0, output_tokens: 0 };
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let ev: { type?: string; part?: { type?: string; text?: string; tokens?: { input?: number; output?: number } }; error?: { message?: string } };
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === "error") error = ev.error?.message ?? "error";
    if (ev.type === "text" && typeof ev.part?.text === "string") text += ev.part.text;
    const t = ev.part?.tokens;
    if (t) {
      usage.input_tokens += Number(t.input) || 0;
      usage.output_tokens += Number(t.output) || 0;
    }
  }
  return { text, error, usage };
}

/** Objeto JSON de una respuesta que puede venir con texto o con un bloque ```json alrededor. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

export function buildPrompt<T>(req: LlmRequest<T>): string {
  const schema = JSON.stringify(z.toJSONSchema(req.schema));
  return `${req.system}

Formato de salida obligatorio: devuelve SOLO un objeto JSON válido que cumpla este JSON Schema, sin texto antes ni después y sin bloques de código.
<json_schema>
${schema}
</json_schema>

${req.user}`;
}

export class OpencodeCliLlmClient implements LlmClient {
  constructor(private readonly run: OpencodeRunner = runProcess) {}

  async complete<T>(req: LlmRequest<T>): Promise<LlmResult<T>> {
    try {
      const args = ["run", "--standalone", "-m", req.model, "--agent", AGENT, "--format", "json"];
      const out = await this.run(args, buildPrompt(req), minimalEnv(), emptyDir());
      if (out.timedOut) return { ok: false, reason: "error" };
      const { text, error, usage } = parseEvents(out.stdout);
      if (error || !text) return { ok: false, reason: "error" };
      const parsed = req.schema.safeParse(extractJson(text));
      if (!parsed.success) return { ok: false, reason: "invalid" };
      return { ok: true, data: parsed.data, model: req.model, usage };
    } catch {
      return { ok: false, reason: "error" };
    }
  }
}

/** ¿Está pedido el proveedor de pruebas? Nunca en producción. */
export function opencodeRequested(): boolean {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "opencode" && process.env.NODE_ENV !== "production";
}
