import { describe, expect, it } from "vitest";
import { describeChanges } from "@/lib/tender-changes";

describe("describeChanges", () => {
  it("formatea fechas en hora de RD, montos, estados y listas", () => {
    const lines = describeChanges({
      publication_status: { from: "in_review", to: "published" },
      deadline_at: { from: "2026-12-01T14:00:00+00:00", to: "2026-12-03T14:00:00+00:00" },
      budget_amount: { from: 1000000, to: 1250000.5 },
      status: { from: "open", to: "cancelled" },
      data_quality_flags: { from: ["status_unknown"], to: [] },
    });
    expect(lines.map((l) => l.field)).toEqual(["status", "deadline_at", "budget_amount", "data_quality_flags", "publication_status"]);
    expect(lines.find((l) => l.field === "deadline_at")!.from).toContain("10:00");
    expect(lines.find((l) => l.field === "budget_amount")!.to).toBe("1,250,000.5");
    expect(lines.find((l) => l.field === "status")!.to).toBe("Cancelada");
    expect(lines.find((l) => l.field === "data_quality_flags")!.to).toBe("ninguna");
    expect(lines.find((l) => l.field === "publication_status")!.to).toBe("Publicado");
  });
  it("muestra guion para vacíos, recorta textos largos e ignora campos desconocidos", () => {
    const lines = describeChanges({ description: { from: null, to: "x".repeat(200) }, foo: { from: 1, to: 2 } });
    expect(lines).toHaveLength(1);
    expect(lines[0].from).toBe("—");
    expect(lines[0].to.length).toBe(118);
  });
  it("tolera entradas inválidas", () => {
    expect(describeChanges(null)).toEqual([]);
    expect(describeChanges([1, 2])).toEqual([]);
    expect(describeChanges("x")).toEqual([]);
  });
});
