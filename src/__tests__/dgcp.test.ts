import { describe, expect, it, vi } from "vitest";
import { fetchProcesos, mapProceso, parseProcesosPage, procesosUrl } from "@/lib/ingest/dgcp";
import { PoliteClient } from "@/lib/ingest/polite-client";

const item = {
  codigo_proceso: "HOSGEDOPOL-DAF-CM-2026-0091",
  codigo_unidad_compra: 147,
  unidad_compra: "Hospital General Docente de la Policía Nacional",
  modalidad: "Contratación Menor",
  titulo: "ADQUISICION DE SOLUCIONES SALINAS Y AMINOACIDOS",
  estado_proceso: "Proceso publicado",
  divisa: "DOP",
  monto_estimado: 2000664,
  fecha_publicacion: "2026-11-16T08:00:29.6366667Z",
  fecha_fin_recepcion_ofertas: "2026-11-20T08:00:00Z",
};

const envelope = (content: unknown[], page = 1, pages = 1) => ({
  code: 200,
  hasError: false,
  payload: { content },
  page,
  limit: 5,
  totalResults: content.length,
  pages,
});

describe("DGCP procesos", () => {
  it("parsea la forma real y separa los elementos inválidos sin descartarlos en silencio", () => {
    const page = parseProcesosPage(envelope([item, { titulo: "sin código" }]));
    expect(page.items).toHaveLength(1);
    expect(page.rejected).toEqual([{ index: 1, reason: expect.any(String) }]);
  });

  it("falla si la API informa error", () => {
    expect(() => parseProcesosPage({ ...envelope([]), hasError: true })).toThrow();
  });

  it("mapea un proceso publicado a licitación abierta con zona UTC", () => {
    const t = mapProceso(parseProcesosPage(envelope([item])).items[0]);
    expect(t).toMatchObject({
      external_id: "HOSGEDOPOL-DAF-CM-2026-0091",
      status: "open",
      budget_amount: 2000664,
      budget_currency: "DOP",
      timezone_assumed: false,
      deadline_at: "2026-11-20T08:00:00.000Z",
      data_quality_flags: [],
    });
  });

  it("no inventa estados: lo desconocido queda unknown con bandera", () => {
    const t = mapProceso({ ...item, estado_proceso: "Algo nuevo" });
    expect(t.status).toBe("unknown");
    expect(t.data_quality_flags).toContain("unmapped_status:Algo nuevo");
  });

  it("fechas sin zona se asumen UTC-4 y se marcan", () => {
    const t = mapProceso({ ...item, fecha_publicacion: "2026-11-16T08:00:00" });
    expect(t.published_at).toBe("2026-11-16T12:00:00.000Z");
    expect(t.timezone_assumed).toBe(true);
  });

  it("monto sin moneda válida no se guarda como cifra", () => {
    const t = mapProceso({ ...item, divisa: "" });
    expect(t.budget_amount).toBeNull();
    expect(t.data_quality_flags).toContain("amount_without_currency");
  });

  it("construye la URL con ventana y tope de 1000", () => {
    const u = new URL(procesosUrl({ startdate: "2026-11-16", enddate: "2026-11-16", limit: 5000 }, 2));
    expect(u.searchParams.get("limit")).toBe("1000");
    expect(u.searchParams.get("page")).toBe("2");
    expect(() => procesosUrl({ startdate: "16/11/2026", enddate: "2026-11-16" }, 1)).toThrow();
  });

  it("recorre todas las páginas con el cliente educado", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope([item], 1, 2)), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope([item], 2, 2)), { status: 200 }));
    const client = new PoliteClient({
      allowedHosts: ["datosabiertos.dgcp.gob.do"],
      clientName: "T/1",
      contact: "c@example.org",
      fetchImpl: f,
    });
    const pages = [];
    for await (const p of fetchProcesos(client, { startdate: "2026-11-16", enddate: "2026-11-16" })) pages.push(p);
    expect(pages).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
