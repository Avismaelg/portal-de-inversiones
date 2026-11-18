import { describe, expect, it } from "vitest";
import { ilikePattern, normalizeQuery, SEARCH_MAX, stripAccents } from "@/lib/search";

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

describe("stripAccents", () => {
  it("quita tildes, diéresis y la virgulilla de la ñ, y pasa a minúsculas", () => {
    expect(stripAccents("Energía Peña PINGÜINO Ángel")).toBe("energia pena pinguino angel");
  });
});

describe("ilikePattern", () => {
  it("envuelve en comodines, sin tildes, y neutraliza caracteres especiales", () => {
    expect(ilikePattern("Energía Solar")).toBe("%energia solar%");
    expect(ilikePattern("50%_off")).toBe("%50 off%");
    expect(ilikePattern('a,title.eq.x),(b"')).toBe("%a title.eq.x b%");
  });
  it("vacío si no queda texto", () => {
    expect(ilikePattern("%%,,")).toBe("");
  });
});
