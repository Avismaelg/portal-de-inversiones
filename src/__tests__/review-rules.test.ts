import { describe, expect, it } from "vitest";
import { canPublishRole, evidenceBlockers, isStaffRole } from "@/lib/review-rules";

describe("review-rules", () => {
  it("solo roles de gestión publican; analista es staff pero no publica", () => {
    expect(canPublishRole("platform_admin")).toBe(true);
    expect(canPublishRole("opportunity_manager")).toBe(true);
    expect(canPublishRole("analyst")).toBe(false);
    expect(isStaffRole("analyst")).toBe(true);
    expect(isStaffRole("viewer")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
  it("bloquea sin evidencia o con citas sin verificar", () => {
    expect(evidenceBlockers("X", [])).toHaveLength(1);
    expect(evidenceBlockers("X", [{ literal_verified: true }, { literal_verified: false }])[0]).toContain("1 cita");
    expect(evidenceBlockers("X", [{ literal_verified: true }])).toEqual([]);
  });
});
