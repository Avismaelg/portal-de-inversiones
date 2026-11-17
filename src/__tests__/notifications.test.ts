import { describe, expect, it } from "vitest";
import { buildNotifications } from "@/lib/notifications";

const prefs = [
  { id: "p1", name: "Telecom", keywords: ["concesión", "espectro"] },
  { id: "p2", name: "Obras", keywords: ["construcción", "concesion"] },
];

describe("buildNotifications", () => {
  it("una sola notificación por entidad aunque coincidan varias alertas, con motivo y prioridad", () => {
    const r = buildNotifications(prefs, [{ id: "n1", title: "Firma de concesión", excerpt: null }], []);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ entity_type: "news", entity_id: "n1", preference_id: "p1", priority: 2 });
    expect(r[0].reason).toContain("Telecom");
    expect(r[0].reason).toContain("Obras");
  });
  it("incluye licitaciones y omite lo que no coincide", () => {
    const r = buildNotifications(prefs, [{ id: "n2", title: "Acto cultural", excerpt: null }], [
      { id: "t1", title: "Construcción de escuela", description: null },
    ]);
    expect(r.map((x) => `${x.entity_type}:${x.entity_id}`)).toEqual(["tender:t1"]);
    expect(r[0].priority).toBe(3);
  });
  it("sin alertas no hay notificaciones", () => {
    expect(buildNotifications([], [{ id: "n1", title: "concesión", excerpt: null }], [])).toEqual([]);
  });
});
