import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

describe("format", () => {
  it("fechas sin desfase de zona horaria", () => {
    const s = formatDate("2041-05-29");
    expect(s).toContain("29");
    expect(s).toContain("2041");
  });
  it("valores ausentes son No disponible, nunca 0", () => {
    expect(formatDate(null)).toBe("No disponible");
    expect(formatPercent(undefined)).toBe("No disponible");
    expect(formatMoney(null, "DOP")).toBe("No disponible");
  });
  it("porcentaje", () => {
    expect(formatPercent(12)).toMatch(/12.*%/);
  });
});

import { todayInRD } from "@/lib/format";

describe("todayInRD", () => {
  it("suma días y devuelve YYYY-MM-DD", () => {
    expect(todayInRD()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayInRD(30) > todayInRD()).toBe(true);
  });
});
