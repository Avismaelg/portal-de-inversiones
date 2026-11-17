import { describe, expect, it } from "vitest";
import { decidePublication } from "@/lib/ingest/tender-publication";

const F = ["unmapped_status:Proceso con etapa cerrada"];

describe("decidePublication (dgcp_auto_publish_v1)", () => {
  it("nuevo: limpio se publica; con banderas va a revisión", () => {
    expect(decidePublication(undefined, [])).toBe("published");
    expect(decidePublication(undefined, F)).toBe("in_review");
  });

  it("no deshace una publicación humana si las banderas no cambiaron", () => {
    expect(decidePublication({ publication_status: "published", data_quality_flags: F }, F)).toBe("published");
  });

  it("si un publicado cambia en la fuente y aparecen banderas nuevas, vuelve a revisión", () => {
    expect(decidePublication({ publication_status: "published", data_quality_flags: [] }, F)).toBe("in_review");
  });

  it("en revisión pasa a publicado solo si ahora está limpio", () => {
    expect(decidePublication({ publication_status: "in_review", data_quality_flags: F }, [])).toBe("published");
    expect(decidePublication({ publication_status: "in_review", data_quality_flags: F }, F)).toBe("in_review");
  });

  it("un rechazo humano se respeta", () => {
    expect(decidePublication({ publication_status: "rejected", data_quality_flags: [] }, [])).toBe("rejected");
  });
});
