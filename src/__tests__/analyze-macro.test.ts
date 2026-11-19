import { describe, expect, it, vi } from "vitest";
import { analyzeMacro, buildMacroSnapshot, buildMacroUserContent, verifyMacroQuote } from "@/lib/ai/analyze-macro";
import type { PulseItem } from "@/lib/macro";

const item: PulseItem = {
  id: "a",
  series_key: "Inflación › Inflación › Interanual",
  group: "Inflación",
  path: ["Inflación"],
  indicator: "Interanual",
  value: 5.14,
  unit: "variación %",
  as_of: "2026-10-16",
  first_seen_at: "2026-11-18T20:00:00Z",
  previous: { value: 4.9, as_of: "2026-09-16" },
  change: 0.24,
  is_new: true,
  trend_reversal: false,
  points: 2,
};
const fx = {
  latest: { rate_date: "2026-11-18", buying: 59.9459, selling: 60.2983 },
  previous: null,
  daily_pct: -0.0731,
  window_pct: null,
  window_start: "2026-10-20",
  min_selling: 60,
  max_selling: 61,
  days: 21,
};
const analysis = {
  summary: "s",
  impact_direction: "mixed",
  horizon: "short",
  sectors: ["a", "b", "c", "d", "e"],
  risks: [],
  scenarios: [],
  value_chain: [],
  opportunities: [],
  watch_next: [],
  confidence: 40,
  confidence_explanation: "e",
  evidence_quote: "Inflación · Inflación · Interanual: 5.14 (variación %)",
};

describe("snapshot macro", () => {
  it("incluye unidades, fechas, anterior y tasa de cambio sin unidad", () => {
    const s = buildMacroSnapshot([item, { ...item, unit: null, previous: null, as_of: null }], fx, "2026-11-18");
    expect(s.lines[0]).toContain("Tasa de cambio (sin unidad declarada por el BCRD) 2026-11-18: compra 59.9459, venta 60.2983");
    expect(s.lines[0]).toContain("-0.0731 %");
    expect(s.lines[0]).toContain("desde 2026-10-20: sin dato");
    expect(s.lines[1]).toBe("Inflación · Inflación · Interanual: 5.14 (variación %); fecha BCRD: 2026-10-16; anterior guardado: 4.9.");
    expect(s.lines[2]).toContain("fecha BCRD: no indicada; anterior guardado: sin dato");
    expect(buildMacroUserContent(s)).toMatch(/^<datos_bcrd>\nFecha de consulta: 2026-11-18\n/);
    expect(buildMacroSnapshot([], null, "x").lines).toEqual([]);
  });

  it("verifica citas literales", () => {
    const s = buildMacroSnapshot([item], null, "2026-11-18");
    expect(verifyMacroQuote("inflacion · inflacion · interanual: 5.14", s)).toBe(true);
    expect(verifyMacroQuote("la inflación subió a 9 %", s)).toBe(false);
    expect(verifyMacroQuote("corta", s)).toBe(false);
    expect(verifyMacroQuote(null, s)).toBe(false);
  });
});

describe("analyzeMacro", () => {
  const snap = buildMacroSnapshot([item], null, "2026-11-18");
  const client = (impl: () => unknown) => ({ messages: { parse: vi.fn(impl) } }) as never;

  it("recorta listas, verifica la cita y devuelve el uso", async () => {
    const out = await analyzeMacro(
      client(async () => ({ stop_reason: "end_turn", parsed_output: analysis, usage: { input_tokens: 10, output_tokens: 20 } })),
      snap,
      "m",
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.analysis.sectors).toHaveLength(4);
      expect(out.quote_verified).toBe(true);
      expect([out.model, out.input_tokens, out.output_tokens]).toEqual(["m", 10, 20]);
    }
  });

  it("distingue rechazo, formato inválido y error", async () => {
    expect(await analyzeMacro(client(async () => ({ stop_reason: "refusal" })), snap)).toEqual({ ok: false, reason: "refusal" });
    expect(await analyzeMacro(client(async () => ({ stop_reason: "end_turn", parsed_output: null })), snap)).toEqual({ ok: false, reason: "invalid" });
    expect(
      await analyzeMacro(
        client(async () => {
          throw new Error("x");
        }),
        snap,
      ),
    ).toEqual({ ok: false, reason: "error" });
  });
});
