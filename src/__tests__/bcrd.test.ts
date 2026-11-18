import { describe, expect, it, vi } from "vitest";
import {
  BcrdApiError,
  BcrdIpNotAllowedError,
  createBcrdClient,
  fetchHistoricoIpc,
  fetchHistoricoTasas,
  fetchMacro,
  parseBcrdResponse,
} from "@/lib/ingest/bcrd";
import { PoliteClient } from "@/lib/ingest/polite-client";

const TOKEN = "test-token-123";
const opts = { clientName: "T/1", contact: "c@example.org" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Respuesta real observada el 2026-11-18 (IP de documentación en lugar de la real).
const ipError = {
  result: null,
  targetUrl: null,
  success: false,
  error: { code: 0, message: "Intento de acceso desde una dirección desconocida FROM IP 203.0.113.7", details: null, validationErrors: null },
  unAuthorizedRequest: false,
  __abp: true,
};

describe("parseBcrdResponse", () => {
  it("detecta la restricción por IP y extrae la IP", () => {
    try {
      parseBcrdResponse(500, ipError);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BcrdIpNotAllowedError);
      expect((e as BcrdIpNotAllowedError).sourceIp).toBe("203.0.113.7");
      expect((e as BcrdIpNotAllowedError).status).toBe(500);
    }
  });

  it("distingue no autorizado y error genérico", () => {
    expect(() => parseBcrdResponse(401, { success: false, error: { message: "Token inválido" }, unAuthorizedRequest: true }))
      .toThrow(/no autorizado/);
    expect(() => parseBcrdResponse(500, { success: false, error: null })).toThrow(BcrdApiError);
  });

  it("rechaza sobres con forma inesperada", () => {
    expect(() => parseBcrdResponse(200, { foo: 1 })).toThrow(/forma inesperada/);
    expect(() => parseBcrdResponse(200, { success: true, result: [{ name: 5 }] })).toThrow(/variable 0/);
  });

  it("acepta un objeto o una lista de variables", () => {
    expect(parseBcrdResponse(200, { success: true, result: { name: "TPM", values: [{ v: 1 }] } }))
      .toEqual([{ name: "TPM", values: [{ v: 1 }] }]);
    expect(parseBcrdResponse(200, { success: true, result: [{ name: "A", values: [] }, { name: "B", values: null }] }))
      .toHaveLength(2);
  });
});

describe("llamadas a la API", () => {
  it("envía POST con el token en el cuerpo y sin reintentar un 500", async () => {
    const f = vi.fn(async () => json(ipError, 500));
    const client = createBcrdClient({ ...opts, fetchImpl: f });
    await expect(fetchMacro(client, TOKEN, "monetarias")).rejects.toBeInstanceOf(BcrdIpNotAllowedError);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.bancentral.gov.do/api/services/app/MacroVariables/Monetarias");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ token: TOKEN });
  });

  it("el mensaje de error nunca contiene el token", async () => {
    const f = vi.fn(async () => json({ success: false, error: { message: "fallo" } }, 500));
    const err = await fetchMacro(createBcrdClient({ ...opts, fetchImpl: f }), TOKEN, "inflacion").catch((e) => e);
    expect(String(err.message)).not.toContain(TOKEN);
  });

  it("exige token y valida fechas y meses", async () => {
    const client = createBcrdClient({ ...opts, fetchImpl: vi.fn() });
    expect(() => fetchMacro(client, " ", "sectorReal")).toThrow(/BCRD_API_TOKEN/);
    expect(() => fetchHistoricoTasas(client, TOKEN, { fromDate: "18/11/2026", toDate: "2026-11-18" })).toThrow(/YYYY-MM-DD/);
    expect(() => fetchHistoricoIpc(client, TOKEN, { yearFrom: 2026, monthFrom: 0, yearTo: 2026, monthTo: 10 })).toThrow(/1-12/);
  });

  it("arma los cuerpos de los históricos con paginación por defecto", async () => {
    const f = vi.fn(async () => json({ success: true, result: { name: "x", values: [] } }));
    const client = createBcrdClient({ ...opts, fetchImpl: f });
    await fetchHistoricoTasas(client, TOKEN, { fromDate: "2026-01-01", toDate: "2026-01-31" });
    await fetchHistoricoIpc(client, TOKEN, { yearFrom: 2025, monthFrom: 1, yearTo: 2026, monthTo: 10, maxResultCount: 12 });
    const bodies = f.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string));
    expect(bodies[0]).toEqual({ fromDate: "2026-01-01", toDate: "2026-01-31", skipCount: 0, maxResultCount: 100, token: TOKEN });
    expect(bodies[1]).toMatchObject({ yearFrom: 2025, monthFrom: 1, yearTo: 2026, monthTo: 10, skipCount: 0, maxResultCount: 12 });
    expect((f.mock.calls[1] as unknown as [string])[0]).toBe("https://api.bancentral.gov.do/api/v2/HistoricoIPC");
  });

  it("falla con error tipado si la respuesta no es JSON", async () => {
    const f = vi.fn(async () => new Response("<html>", { status: 502 }));
    await expect(fetchMacro(createBcrdClient({ ...opts, fetchImpl: f }), TOKEN, "sectorExterno")).rejects.toThrow(/HTTP 502 sin JSON/);
  });
});

describe("PoliteClient.post", () => {
  it("no sigue redirecciones en POST", async () => {
    const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: "https://api.bancentral.gov.do/otra" } }));
    const res = await new PoliteClient({ allowedHosts: ["api.bancentral.gov.do"], ...opts, fetchImpl: f })
      .post("https://api.bancentral.gov.do/x", { body: "{}" });
    expect(res.status).toBe(302);
    expect(f).toHaveBeenCalledTimes(1);
  });
});
