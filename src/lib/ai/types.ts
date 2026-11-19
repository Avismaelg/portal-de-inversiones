/**
 * Contrato independiente del proveedor (ADR-0006, SISTEMA-IA §1.5).
 * Los agentes piden «mensajes + esquema» y reciben JSON validado + uso de tokens;
 * nunca conocen el SDK ni el nombre del proveedor.
 */
import type { z } from "zod";

export interface LlmUsage {
  input_tokens: number;
  output_tokens: number;
}

/** Motivos de fallo que el código distingue (SISTEMA-IA §6). */
export type LlmFailureReason = "refusal" | "invalid" | "error";

export interface LlmRequest<T> {
  model: string;
  system: string;
  user: string;
  /** Esquema estricto de salida; el cliente valida con él antes de devolver datos. */
  schema: z.ZodType<T>;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}

export type LlmResult<T> =
  | { ok: true; data: T; model: string; usage: LlmUsage }
  | { ok: false; reason: LlmFailureReason };

export interface LlmClient {
  complete<T>(req: LlmRequest<T>): Promise<LlmResult<T>>;
}
