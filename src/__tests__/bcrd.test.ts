import { describe, expect, it, vi } from "vitest";
import {
  BcrdApiError,
  BcrdIpNotAllowedError,
  createBcrdClient,
  fetchHistoricoIpc,
  fetchHistoricoTasas,
  fetchMacro,
  flattenMacro,
  parseBcrdDate,
  parseBcrdEnvelope,
  parseExchangeRates,
  parseMacroResult,
} from "@/lib/ingest/bcrd";
import { PoliteClient } from "@/lib/ingest/polite-client";

const TOKEN = "test-token-123";
const opts = { clientName: "T/1", contact: "c@example.org" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const ok = (result: unknown) => ({ result, success: true, error: null, unAuthorizedRequest: false, __abp: true });

// Respuestas reales observadas el 2026-11-18 (la IP del error se sustituyó por una de documentación).
const ipError = {
  result: null,
  targetUrl: null,
  success: false,
  error: { code: 0, message: "Intento de acceso desde una dirección desconocida FROM IP 203.0.113.7", details: null, validationErrors: null },
  unAuthorizedRequest: false,
  __abp: true,
};
const inflacion = {
  name: "Inflación",
  values: [
    { name: "Inflación", values: [{ name: "Interanual", value: 5.14 }, { name: "Acumulada", value: 3.53 }, { name: "Mensual", value: 0.58 }], date: "16/10/2026" },
    { name: "Inflación Subyacente", values: [{ name: "Interanual", value: 4.54 }, { name: "Acumulada", value: 3.59 }, { name: "Mensual", value: 0.45 }], date: "16/10/2026" },
  ],
};
const sectorReal = {
  name: "Sector Real",
  values: [
    { name: "Imaes", values: [{ name: "Septiembre 2026", value: 5.6 }, { name: "Ene-Sep 2026", value: 4.6 }] },
    {
      name: "Pibs",
      values: [
        { name: "Producto Interno Bruto", values: [{ name: "Ene-Dic 2025", value: 2.1 }, { name: "Ene-Dic 2024", value: 5 }] },
      ],
    },
  ],
};
const tasas = {
  name: "Historico tasa de cambio",
  values: [
    {
      totalCount: 12,
      items: [
        { buyingValue: 60.4617, sellingValue: 60.7601, currencyId: 1, currency: null, exchangeRateDate: "2026-11-06T00:00:00", isDeleted: false, isActive: true, id: 9386 },
        { buyingValue: 60.5876, sellingValue: 60.9038, currencyId: 1, currency: null, exchangeRateDate: "2026-11-05T00:00:00", isDeleted: false, isActive: true, id: 9385 },
      ],
    },
  ],
};

describe("parseBcrdEnvelope", () => {
  it("detecta la restricción por IP y extrae la IP", () => {
    try {
      parseBcrdEnvelope(500, ipError);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BcrdIpNotAllowedError);
      expect((e as BcrdIpNotAllowedError).sourceIp).toBe("203.0.113.7");
      expect((e as BcrdIpNotAllowedError).status).toBe(500);
    }
  });

  it("distingue no autorizado, error genérico y forma inesperada", () => {
    expect(() => parseBcrdEnvelope(401, { success: false, error: { message: "Token inválido" }, unAuthorizedRequest: true }))
      .toThrow(/no autorizado/);
    expect(() => parseBcrdEnvelope(500, { success: false, error: null })).toThrow(BcrdApiError);
    expect(() => parseBcrdEnvelope(200, { foo: 1 })).toThrow(/forma inesperada/);
  });
});

describe("parseBcrdDate", () => {
  it("convierte dd/MM/yyyy y rechaza fechas imposibles", () => {
    expect(parseBcrdDate("16/10/2026")).toBe("2026-10-16");
    expect(parseBcrdDate("31/02/2026")).toBeNull();
    expect(parseBcrdDate("2026-10-16")).toBeNull();
    expect(parseBcrdDate(null)).toBeNull();
  });
});

describe("variables macro", () => {
  it("aplana el árbol con ruta, fecha heredada y unidad desconocida", () => {
    const rows = parseMacroResult(200, inflacion);
    expect(rows).toHaveLength(6);
    expect(rows[3]).toEqual({
      group: "Inflación",
      path: ["Inflación Subyacente"],
      indicator: "Interanual",
      value: 4.54,
      as_of: "2026-10-16",
      data_quality_flags: ["unit_unknown"],
    });
  });

  it("soporta anidación variable y marca la ausencia de fecha", () => {
    const rows = flattenMacro(sectorReal);
    expect(rows.map((r) => [r.path.join(" > "), r.indicator, r.value])).toEqual([
      ["Imaes", "Septiembre 2026", 5.6],
      ["Imaes", "Ene-Sep 2026", 4.6],
      ["Pibs > Producto Interno Bruto", "Ene-Dic 2025", 2.1],
      ["Pibs > Producto Interno Bruto", "Ene-Dic 2024", 5],
    ]);
    expect(rows.every((r) => r.as_of === null && r.data_quality_flags.includes("missing_date"))).toBe(true);
  });

  it("marca fechas inválidas y omite hojas sin valor", () => {
    const rows = flattenMacro({ name: "G", values: [{ name: "C", date: "99/99/2026", values: [{ name: "x", value: 1 }, { name: "y", value: null }] }] });
    expect(rows).toHaveLength(1);
    expect(rows[0].as_of).toBeNull();
    expect(rows[0].data_quality_flags).toContain("invalid_date:99/99/2026");
  });

  it("rechaza árboles con forma inesperada", () => {
    expect(() => parseMacroResult(200, { name: "G", values: [{ value: 1 }] })).toThrow(/forma inesperada/);
  });
});

describe("histórico de tasas", () => {
  it("convierte los ítems y conserva el total", () => {
    const page = parseExchangeRates(200, tasas);
    expect(page.totalCount).toBe(12);
    expect(page.items[0]).toEqual({ external_id: 9386, rate_date: "2026-11-06", buying: 60.4617, selling: 60.7601, currency_id: 1 });
    expect(page.rejected).toEqual([]);
  });

  it("cuenta como rechazados los borrados, inactivos, inválidos y no positivos", () => {
    const base = tasas.values[0].items[0];
    const page = parseExchangeRates(200, {
      values: [{
        totalCount: 5,
        items: [
          { ...base, isDeleted: true },
          { ...base, isActive: false },
          { ...base, exchangeRateDate: "06/11/2026" },
          { ...base, buyingValue: 0 },
          { foo: 1 },
        ],
      }],
    });
    expect(page.items).toEqual([]);
    expect(page.rejected.map((r) => r.reason).slice(0, 4)).toEqual(["deleted", "inactive", "invalid_date:06/11/2026", "non_positive_rate"]);
    expect(page.rejected).toHaveLength(5);
  });

  it("acepta un bloque vacío y rechaza formas inesperadas", () => {
    expect(parseExchangeRates(200, { values: [] })).toEqual({ items: [], rejected: [], totalCount: 0 });
    expect(() => parseExchangeRates(200, { values: "x" })).toThrow(/forma inesperada/);
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

  it("devuelve indicadores aplanados de una respuesta correcta", async () => {
    const f = vi.fn(async () => json(ok(inflacion)));
    const rows = await fetchMacro(createBcrdClient({ ...opts, fetchImpl: f }), TOKEN, "inflacion");
    expect(rows).toHaveLength(6);
  });

  it("el mensaje de error nunca contiene el token", async () => {
    const f = vi.fn(async () => json({ success: false, error: { message: "fallo" } }, 500));
    const err = await fetchMacro(createBcrdClient({ ...opts, fetchImpl: f }), TOKEN, "inflacion").catch((e) => e);
    expect(String(err.message)).not.toContain(TOKEN);
  });

  it("exige token y valida fechas y meses", async () => {
    const client = createBcrdClient({ ...opts, fetchImpl: vi.fn() });
    await expect(fetchMacro(client, " ", "sectorReal")).rejects.toThrow(/BCRD_API_TOKEN/);
    await expect(fetchHistoricoTasas(client, TOKEN, { fromDate: "18/11/2026", toDate: "2026-11-18" })).rejects.toThrow(/YYYY-MM-DD/);
    await expect(fetchHistoricoIpc(client, TOKEN, { yearFrom: 2026, monthFrom: 0, yearTo: 2026, monthTo: 10 })).rejects.toThrow(/1-12/);
  });

  it("arma los cuerpos de los históricos con paginación por defecto", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(json(ok(tasas)))
      .mockResolvedValueOnce(json(ok({ name: "IPC", values: [] })));
    const client = createBcrdClient({ ...opts, fetchImpl: f });
    const page = await fetchHistoricoTasas(client, TOKEN, { fromDate: "2026-01-01", toDate: "2026-01-31" });
    const ipc = await fetchHistoricoIpc(client, TOKEN, { yearFrom: 2025, monthFrom: 1, yearTo: 2026, monthTo: 10, maxResultCount: 12 });
    expect(page.items).toHaveLength(2);
    expect(ipc).toEqual({ name: "IPC", values: [] });
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
