import { describe, expect, it } from "vitest";
import { csvCell, csvFilename, toCsv } from "@/lib/csv";
import { explainSeries, FX_EXPLANATION, TRUST_EXPLANATION } from "@/lib/glossary";

describe("csv", () => {
  it("escapa comillas, comas y saltos de línea", () => {
    expect(csvCell('Dijo "hola", ok')).toBe('"Dijo ""hola"", ok"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell("simple")).toBe("simple");
  });

  it("neutraliza fórmulas en texto pero no en números", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-3")).toBe("'-3");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell(-3.7)).toBe("-3.7");
  });

  it("vacíos, booleanos y no finitos", () => {
    expect([csvCell(null), csvCell(undefined), csvCell(true), csvCell(Number.NaN)]).toEqual(["", "", "true", ""]);
  });

  it("arma el archivo con BOM y CRLF, y un nombre seguro", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a,b\r\n1,x\r\n");
    expect(csvFilename("avitech bcrd/../x", "2026-11-18")).toBe("avitech-bcrd-x-2026-11-18.csv");
  });
});

describe("glosario", () => {
  it("explica cada grupo del BCRD", () => {
    const keys = [
      ["Inflación › Inflación › Interanual", "Inflación"],
      ["Inflación › Inflación Subyacente › Mensual", "Inflación subyacente"],
      ["Monetarias › Tasas de interés › Interb. Total", "Tasa interbancaria"],
      ["Monetarias › Tasas de interés › Activa", "Tasa activa"],
      ["Monetarias › Tasas de interés › Pasiva", "Tasa pasiva"],
      ["Monetarias › Prestamos privados › Total", "Préstamos al sector privado"],
      ["Sector Real › Imaes › Septiembre 2026", "IMAE"],
      ["Sector Real › Pibs › PIB anual › Enero 2024", "Producto interno bruto (PIB)"],
      ["Sector Externo › Reservas Internacionales › Brutas", "Reservas internacionales"],
      ["Sector Externo › Cuentas Corrientes › 2025", "Cuenta corriente"],
      ["Sector Externo › Tasas de cambio › Venta", "Tasa de cambio de referencia"],
      ["IPC › Índice de precios al consumidor", "Índice de precios al consumidor (IPC)"],
    ];
    for (const [k, title] of keys) expect(explainSeries(k)?.title).toBe(title);
    expect(explainSeries("Otra › cosa")).toBeNull();
    expect(FX_EXPLANATION.read).toMatch(/deprecia/);
    expect(Object.keys(TRUST_EXPLANATION).sort()).toEqual(["ai_analysis", "confirmed", "inference"]);
  });
});
