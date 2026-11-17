import { describe, expect, it } from "vitest";
import { ilikeAny, ilikePattern, normalizeQuery, SEARCH_MAX } from "@/lib/search";

describe("normalizeQuery", () => {
  it("colapsa espacios, quita controles y recorta", () => {
    expect(normalizeQuery("  puerto \n\t de   Manzanillo ")).toBe("puerto de Manzanillo");
    expect(normalizeQuery("a\u0000b")).toBe("a b");
    expect(normalizeQuery("x".repeat(300)).length).toBe(SEARCH_MAX);
  });
  it("devuelve vacío si es nula o demasiado corta", () => {
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery(" a ")).toBe("");
  });
});

describe("ilikePattern", () => {
  it("envuelve en comodines y neutraliza caracteres especiales", () => {
    expect(ilikePattern("energía solar")).toBe("%energía solar%");
    expect(ilikePattern("50%_off")).toBe("%50 off%");
    expect(ilikePattern('a,title.eq.x),(b"')).toBe("%a title.eq.x b%");
  });
  it("vacío si no queda texto", () => {
    expect(ilikePattern("%%,,")).toBe("");
  });
  it("ilikeAny arma el filtro or() con valores entre comillas", () => {
    expect(ilikeAny(["title", "excerpt"], "%puerto%")).toBe('title.ilike."%puerto%",excerpt.ilike."%puerto%"');
  });
});
