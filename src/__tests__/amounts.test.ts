import { describe, expect, it } from "vitest";
import { detectCurrency, parseAmountText, parseDecimal } from "@/lib/ai/amounts";

describe("parseo determinista de importes", () => {
  it("lee millones y mil millones", () => {
    expect(parseAmountText("RD$ 1,200 millones")).toBe(1_200_000_000);
    expect(parseAmountText("US$ 5.5 millones")).toBe(5_500_000);
    expect(parseAmountText("mil millones de dólares")).toBe(1_000_000_000);
    expect(parseAmountText("2 billones")).toBe(2_000_000_000_000);
  });

  it("distingue separador decimal y de miles", () => {
    expect(parseDecimal("1.200.000,50")).toBe(1_200_000.5);
    expect(parseDecimal("1,200,000.50")).toBe(1_200_000.5);
    expect(parseDecimal("1.200")).toBe(1200);
    expect(parseDecimal("1,200")).toBe(1200);
    expect(parseDecimal("5.5")).toBe(5.5);
    expect(parseDecimal("1,5")).toBe(1.5);
    expect(parseDecimal("12 345")).toBe(12_345);
  });

  it("no inventa un número cuando no hay cifras o el resultado es absurdo", () => {
    expect(parseAmountText("sin cifras")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseAmountText("0 millones")).toBeNull();
  });

  it("detecta la moneda solo cuando el texto la declara", () => {
    expect(detectCurrency("RD$ 1,200 millones")).toBe("DOP");
    expect(detectCurrency("pesos dominicanos")).toBe("DOP");
    expect(detectCurrency("US$ 5 millones")).toBe("USD");
    expect(detectCurrency("millones de dólares")).toBe("USD");
    expect(detectCurrency("€ 10 millones")).toBe("EUR");
    expect(detectCurrency("1,200 millones")).toBeNull();
  });
});
