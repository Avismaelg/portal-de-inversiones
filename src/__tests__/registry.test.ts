import { describe, expect, it } from "vitest";
import { parseDoc, parseProject, permitDedupKey, projectDedupKey, registryErrorMessage, PROJECT_STATUS_NEEDS_OFFICIAL } from "@/lib/registry";

const today = "2026-11-18";

describe("parseDoc", () => {
  it("acepta https en dominios oficiales y normaliza título y fecha", () => {
    expect(parseDoc({ url: " https://www.mimarena.gob.do/res.pdf ", title: "  Resolución 12 ", date: "2026-11-01" }, today)).toEqual({
      url: "https://www.mimarena.gob.do/res.pdf",
      title: "Resolución 12",
      published_on: "2026-11-01",
    });
    expect(parseDoc({ url: "https://bancentral.gov.do/a", title: "", date: "" }, today)).toEqual({
      url: "https://bancentral.gov.do/a",
      title: null,
      published_on: null,
    });
  });

  it("rechaza enlaces vacíos, inválidos, http, dominios no oficiales y fechas futuras o mal formadas", () => {
    expect(parseDoc({ url: "", title: null, date: null }, today)).toMatch(/Falta/);
    expect(parseDoc({ url: "no es url", title: null, date: null }, today)).toMatch(/no es válido/);
    expect(parseDoc({ url: "http://mimarena.gob.do/x", title: null, date: null }, today)).toMatch(/https/);
    expect(parseDoc({ url: "https://notgob.do/x", title: null, date: null }, today)).toMatch(/oficial/);
    expect(parseDoc({ url: "https://gob.do.evil.com/x", title: null, date: null }, today)).toMatch(/oficial/);
    expect(parseDoc({ url: "https://mimarena.gob.do/x", title: null, date: "2026-12-01" }, today)).toMatch(/futura/);
    expect(parseDoc({ url: "https://mimarena.gob.do/x", title: null, date: "01/11/2026" }, today)).toMatch(/no es válida/);
  });
});

describe("parseProject", () => {
  it("valida nombre, estado, monto y moneda", () => {
    expect(parseProject({ name: "  Parque   solar  ", status: "announced" })).toEqual({
      name: "Parque solar", description: null, status: "announced", amount: null, currency: null,
    });
    expect(parseProject({ name: "Puerto", status: "permit_applied", amount: "1,500,000.50", currency: "usd", description: " x " })).toEqual({
      name: "Puerto", description: "x", status: "permit_applied", amount: 1500000.5, currency: "USD",
    });
    expect(parseProject({ name: "ab", status: "announced" })).toMatch(/nombre/);
    expect(parseProject({ name: "Puerto", status: "aprobadisimo" })).toMatch(/Estado/);
    expect(parseProject({ name: "Puerto", status: "announced", amount: "-5", currency: "DOP" })).toMatch(/positivo/);
    expect(parseProject({ name: "Puerto", status: "announced", amount: "5" })).toMatch(/moneda/);
    expect(parseProject({ name: "Puerto", status: "announced", amount: "5", currency: "pesos" })).toMatch(/moneda/);
  });
});

describe("claves y reglas", () => {
  it("la clave del proyecto ignora tildes, mayúsculas y espacios", () => {
    expect(projectDedupKey("Parque Solar  Montecristi")).toBe(projectDedupKey("parque solar montecristi"));
    expect(projectDedupKey("Puerto")).not.toBe(projectDedupKey("Puerto 2"));
    expect(projectDedupKey("Energía")).toBe(projectDedupKey("energia"));
    expect(permitDedupKey("p", "environmental", null, "https://a.gob.do")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("solo los estados que afirman aprobación exigen documento oficial", () => {
    expect([...PROJECT_STATUS_NEEDS_OFFICIAL].sort()).toEqual(["operating", "permit_approved", "under_construction"]);
  });

  it("traduce errores de la base sin mostrar SQL", () => {
    expect(registryErrorMessage("document must be hosted on an official domain (*.gob.do or *.gov.do)")).toMatch(/sitio oficial/);
    expect(registryErrorMessage("document url must be https")).toMatch(/https/);
    expect(registryErrorMessage("document date cannot be in the future")).toMatch(/futura/);
    expect(registryErrorMessage('violates check constraint "projects_approval_needs_document"')).toMatch(/aprobación/);
    expect(registryErrorMessage("projects publication requires an authenticated manager")).toMatch(/gestor/);
    expect(registryErrorMessage("projects publication requires review_notes")).toMatch(/nota/);
    expect(registryErrorMessage("only staff can register documents")).toMatch(/rol/);
    expect(registryErrorMessage("duplicate key value")).toMatch(/Ya existe/);
    expect(registryErrorMessage(undefined)).toMatch(/No se pudo guardar/);
  });
});
