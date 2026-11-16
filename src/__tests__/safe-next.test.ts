import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext", () => {
  it("acepta rutas internas", () => {
    expect(safeNext("/restablecer")).toBe("/restablecer");
  });
  it("rechaza redirecciones abiertas", () => {
    for (const v of ["//evil.com", "https://evil.com", "/\evil.com", "javascript:alert(1)", null, ""]) {
      expect(safeNext(v)).toBe("/dashboard");
    }
  });
});
