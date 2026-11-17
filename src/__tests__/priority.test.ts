import { describe, expect, it } from "vitest";
import { extractAmounts, priorityLabel, scoreNews } from "@/lib/priority";

const now = new Date("2026-11-17T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

describe("prioridad para el inversionista", () => {
  it("extrae montos tal como aparecen, sin convertirlos", () => {
    expect(extractAmounts("Concesión por US$119.5 millones y RD$ 2,500 millones")).toEqual(["US$119.5 millones", "RD$ 2,500 millones"]);
    expect(extractAmounts("Sin cifras")).toEqual([]);
  });

  it("una concesión reciente, con monto, sin prensa y con alerta puntúa alta y explica por qué", () => {
    const p = scoreNews(
      { title: "Indotel firma concesión por US$119.5 millones", excerpt: null, published_at: ago(3), matched_keywords: ["concesion", "us$"], media_url: null },
      [{ name: "Telecom", keywords: ["concesión"] }],
      now,
    );
    expect(priorityLabel(p.score)).toBe("Alta");
    expect(p.reasons.join(" | ")).toMatch(/monto: US\$119\.5 millones/);
    expect(p.reasons.join(" | ")).toMatch(/sin cobertura de prensa/i);
    expect(p.reasons.join(" | ")).toMatch(/alerta: Telecom/);
  });

  it("una noticia vieja, ya en prensa y de tema débil puntúa baja", () => {
    const p = scoreNews(
      { title: "Acto institucional", excerpt: null, published_at: ago(24 * 20), matched_keywords: ["sector", "empresa"], media_url: "https://x.example/n" },
      [],
      now,
    );
    expect(priorityLabel(p.score)).toBe("Baja");
    expect(p.reasons).toEqual([]);
  });

  it("sin fecha no suma recencia ni «poco difundida»", () => {
    const p = scoreNews({ title: "T", excerpt: null, published_at: null, matched_keywords: ["concesion"], media_url: null }, [], now);
    expect(p.reasons.some((r) => /prensa/.test(r))).toBe(false);
  });
});
