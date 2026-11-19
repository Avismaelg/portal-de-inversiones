import { describe, expect, it } from "vitest";
import { parseTenderFilters, tenderFilterQuery } from "@/lib/tender-filters";

describe("filtros de licitaciones", () => {
  it("sin parámetros muestra solo vigentes, orden por cierre, página 1", () => {
    expect(parseTenderFilters({})).toEqual({ q: "", method: "", status: "", order: "cierre", onlyOpen: true, page: 1 });
  });

  it("normaliza y valida cada filtro", () => {
    const f = parseTenderFilters({ q: ["  obras  ", "x"], metodo: "Compras Menores", estado: "inventado", orden: "monto", pagina: "3" });
    expect(f).toEqual({ q: "obras", method: "Compras Menores", status: "", order: "monto", onlyOpen: false, page: 3 });
    expect(parseTenderFilters({ orden: "raro", pagina: "-2", estado: "awarded" })).toMatchObject({ order: "cierre", page: 1, status: "awarded" });
    expect(parseTenderFilters({ q: "a".repeat(300) }).q).toHaveLength(100);
  });

  it("reconstruye la consulta con y sin página", () => {
    const f = parseTenderFilters({ q: "obras viales", metodo: "Licitación Pública", vigentes: "1" });
    expect(tenderFilterQuery(f)).toBe("q=obras+viales&metodo=Licitaci%C3%B3n+P%C3%BAblica&orden=cierre&vigentes=1");
    expect(tenderFilterQuery(f, 2)).toContain("pagina=2");
  });
});
