import { describe, expect, it } from "vitest";
import { matchesAlert, trendingKeywords } from "@/lib/radar";

const now = new Date("2026-11-16T12:00:00Z");
const d = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();

describe("radar", () => {
  it("detecta temas en alza frente a la semana previa", () => {
    const t = trendingKeywords(
      [
        { published_at: d(1), matched_keywords: ["concesion", "sector"] },
        { published_at: d(2), matched_keywords: ["concesion"] },
        { published_at: d(9), matched_keywords: ["sector"] },
        { published_at: d(30), matched_keywords: ["impuesto"] },
        { published_at: null, matched_keywords: ["deuda"] },
      ],
      now,
    );
    expect(t[0]).toEqual({ keyword: "concesion", recent: 2, previous: 0, delta: 2 });
    expect(t.find((x) => x.keyword === "sector")).toMatchObject({ recent: 1, previous: 1, delta: 0 });
    expect(t.some((x) => x.keyword === "impuesto" || x.keyword === "deuda")).toBe(false);
  });
  it("alertas por palabra clave ignoran tildes y palabras muy cortas", () => {
    expect(matchesAlert("Aprueban Concesión de espectro", null, ["concesion", "xy"])).toEqual(["concesion"]);
    expect(matchesAlert("Turismo", "crece", ["energia"])).toEqual([]);
  });
});
