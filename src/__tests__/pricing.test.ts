import { describe, expect, it } from "vitest";
import { DEFAULT_MONTHLY_BUDGET_USD, estimateCostUsd, monthlyBudgetUsd } from "@/lib/ai/pricing";

describe("costo y tope de IA", () => {
  it("calcula el costo por modelo", () => {
    expect(estimateCostUsd("claude-sonnet-5-5", 1_000_000, 0)).toBe(2);
    expect(estimateCostUsd("claude-sonnet-5-5", 3000, 2000)).toBeCloseTo(0.026, 6);
    expect(estimateCostUsd("claude-haiku-5-5", 1_000_000, 1_000_000)).toBe(0.6);
  });
  it("un modelo desconocido no subestima el gasto (usa el precio más caro)", () => {
    expect(estimateCostUsd("modelo-x", 1_000_000, 0)).toBe(4);
  });
  it("tope: valor válido o 5 USD por defecto", () => {
    expect(monthlyBudgetUsd("20")).toBe(20);
    expect(monthlyBudgetUsd(undefined)).toBe(DEFAULT_MONTHLY_BUDGET_USD);
    expect(monthlyBudgetUsd("-3")).toBe(DEFAULT_MONTHLY_BUDGET_USD);
    expect(monthlyBudgetUsd("abc")).toBe(DEFAULT_MONTHLY_BUDGET_USD);
  });
});
