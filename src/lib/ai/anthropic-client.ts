/**
 * Implementación de `LlmClient` sobre el SDK de Anthropic. Es el único archivo del sistema de IA
 * que conoce al proveedor (ADR-0006). Si mañana se cambia de proveedor, los agentes no cambian.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { LlmClient, LlmRequest, LlmResult } from "./types";

/** Modelo por defecto del análisis editorial (el que ya usan noticias y macro). */
export const DEFAULT_ANALYSIS_MODEL = "claude-sonnet-5-5";

/** Clave del proveedor; solo en el servidor. Nunca se registra ni se envía al modelo. */
export function apiKeyFromEnv(): string | null {
  const key = process.env.AI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
  return key || null;
}

export class AnthropicLlmClient implements LlmClient {
  constructor(private readonly client: Anthropic) {}

  async complete<T>(req: LlmRequest<T>): Promise<LlmResult<T>> {
    try {
      const res = await this.client.messages.parse({
        model: req.model,
        max_tokens: req.maxTokens ?? 6000,
        system: req.system,
        output_config: { effort: req.effort ?? "medium", format: zodOutputFormat(req.schema) },
        messages: [{ role: "user", content: req.user }],
      });
      if (res.stop_reason === "refusal") return { ok: false, reason: "refusal" };
      // Doble validación: el SDK ya parsea con el esquema, pero el contrato exige que el código
      // vuelva a validar antes de devolver datos a un agente (T-AI-02).
      const parsed = req.schema.safeParse(res.parsed_output);
      if (!parsed.success) return { ok: false, reason: "invalid" };
      return {
        ok: true,
        data: parsed.data,
        model: req.model,
        usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
      };
    } catch {
      return { ok: false, reason: "error" };
    }
  }
}

/** Cliente listo o null si no hay clave (el llamador debe explicarlo, no simular). */
export function createLlmClient(): LlmClient | null {
  const apiKey = apiKeyFromEnv();
  return apiKey ? new AnthropicLlmClient(new Anthropic({ apiKey })) : null;
}
