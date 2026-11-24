/**
 * Costo estimado por ejecución (USD) con precios públicos de Anthropic por millón de tokens
 * (tabla de la skill claude-api, cacheada 2026-11-03). Es una estimación para el tope interno, no una factura.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

/** Precio desconocido -> se usa el más caro conocido para no subestimar el gasto. */
const FALLBACK = PRICES["claude-opus-5-5"];

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  // Modelos gratuitos de opencode (solo pruebas locales): sin costo. Cualquier otro modelo desconocido
  // sigue usando el precio más caro.
  if (/^opencode(-go)?\/[\w.-]+-free$/.test(model)) return 0;
  const p = PRICES[model] ?? FALLBACK;
  return Math.round(((inputTokens * p.input + outputTokens * p.output) / 1_000_000) * 1e6) / 1e6;
}

/** Tope mensual: `AI_MONTHLY_BUDGET_USD`; si no está definido, 5 USD (G0 #4: tope bajo). */
export const DEFAULT_MONTHLY_BUDGET_USD = 5;

export function monthlyBudgetUsd(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTHLY_BUDGET_USD;
}

export const PROMPT_VERSION = "news-impact-v2";
export const SCHEMA_VERSION = "analysis-schema-v2";
