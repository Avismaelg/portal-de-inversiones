/**
 * Conector DGCP (procesos de compra). Solo lectura y transformación: NO escribe en la base
 * ni activa la fuente (`sources.is_active` sigue en false hasta decisión del propietario y
 * del abogado, G0 #5). Forma de la respuesta verificada el 2026-11-16 con una llamada real.
 */
import { z } from "zod";
import type { PoliteClient } from "./polite-client";

export const DGCP_HOST = "datosabiertos.dgcp.gob.do";
export const DGCP_BASE = `https://${DGCP_HOST}/api-dgcp/v1`;
/** Términos de la API: 60 peticiones/min y 1 solicitud activa. */
export const DGCP_MAX_PER_MINUTE = 50;
export const DGCP_MAX_PAGE_SIZE = 1000;

const text = z.string().nullish();

export const procesoSchema = z.object({
  codigo_proceso: z.string().min(1),
  codigo_unidad_compra: z.number().nullish(),
  unidad_compra: text,
  modalidad: text,
  titulo: text,
  descripcion: text,
  estado_proceso: text,
  divisa: text,
  monto_estimado: z.number().nullish(),
  fecha_publicacion: text,
  fecha_fin_recepcion_ofertas: text,
  url: text,
});
export type Proceso = z.infer<typeof procesoSchema>;

const envelopeSchema = z.object({
  code: z.number(),
  hasError: z.boolean(),
  payload: z.object({ content: z.array(z.unknown()) }),
  page: z.number(),
  limit: z.number(),
  totalResults: z.number(),
  pages: z.number(),
});

export interface ProcesosPage {
  items: Proceso[];
  /** Elementos que no cumplen el esquema: se cuentan, nunca se descartan en silencio. */
  rejected: { index: number; reason: string }[];
  page: number;
  pages: number;
  totalResults: number;
}

export function parseProcesosPage(json: unknown): ProcesosPage {
  const env = envelopeSchema.parse(json);
  if (env.hasError || env.code !== 200) throw new Error(`DGCP respondió con error (code=${env.code})`);
  const items: Proceso[] = [];
  const rejected: ProcesosPage["rejected"] = [];
  env.payload.content.forEach((raw, index) => {
    const r = procesoSchema.safeParse(raw);
    if (r.success) items.push(r.data);
    else rejected.push({ index, reason: r.error.issues[0]?.message ?? "invalid" });
  });
  return { items, rejected, page: env.page, pages: env.pages, totalResults: env.totalResults };
}

export type TenderStatus = "planned" | "open" | "closed" | "awarded" | "cancelled" | "unknown";

export interface TenderRow {
  external_id: string;
  process_code: string;
  title: string;
  description: string | null;
  procurement_method: string | null;
  status: TenderStatus;
  published_at: string | null;
  deadline_at: string | null;
  timezone_assumed: boolean;
  budget_amount: number | null;
  budget_currency: string | null;
  buyer_code: number | null;
  buyer_name: string | null;
  data_quality_flags: string[];
}

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

function toUtc(value: string | null | undefined): { iso: string | null; assumed: boolean } {
  if (!value) return { iso: null, assumed: false };
  const assumed = !HAS_ZONE.test(value);
  // Sin zona se asume hora de República Dominicana (UTC-4, sin horario de verano) y se marca.
  const d = new Date(assumed ? `${value}-04:00` : value);
  return Number.isNaN(d.getTime()) ? { iso: null, assumed: false } : { iso: d.toISOString(), assumed };
}

/**
 * Solo se mapea el estado observado ("Proceso publicado"). Cualquier otro queda `unknown` con
 * bandera: no se inventa el significado de estados que no se han visto.
 */
export function mapProceso(p: Proceso): TenderRow {
  const flags: string[] = [];
  const pub = toUtc(p.fecha_publicacion);
  const dl = toUtc(p.fecha_fin_recepcion_ofertas);
  let status: TenderStatus = "unknown";
  if (p.estado_proceso === "Proceso publicado") status = "open";
  else flags.push(`unmapped_status:${p.estado_proceso ?? "null"}`);
  if (!p.titulo?.trim()) flags.push("missing_title");
  if (p.monto_estimado != null && p.monto_estimado < 0) flags.push("negative_amount");
  const amountOk = p.monto_estimado != null && p.monto_estimado >= 0;
  const currency = p.divisa && /^[A-Z]{3}$/.test(p.divisa) ? p.divisa : null;
  if (amountOk && !currency) flags.push("amount_without_currency");
  return {
    external_id: p.codigo_proceso,
    process_code: p.codigo_proceso,
    title: p.titulo?.trim() || p.codigo_proceso,
    description: p.descripcion?.trim() || null,
    procurement_method: p.modalidad ?? null,
    status,
    published_at: pub.iso,
    deadline_at: dl.iso,
    timezone_assumed: pub.assumed || dl.assumed,
    budget_amount: amountOk && currency ? p.monto_estimado! : null,
    budget_currency: amountOk && currency ? currency : null,
    buyer_code: p.codigo_unidad_compra ?? null,
    buyer_name: p.unidad_compra ?? null,
    data_quality_flags: flags,
  };
}

export interface ProcesosWindow {
  /** YYYY-MM-DD, fecha de publicación (inclusive según la API). */
  startdate: string;
  enddate: string;
  limit?: number;
  /** Tope de seguridad de páginas por ejecución. */
  maxPages?: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function procesosUrl(w: ProcesosWindow, page: number): string {
  if (!DATE.test(w.startdate) || !DATE.test(w.enddate)) throw new Error("startdate/enddate deben ser YYYY-MM-DD");
  const limit = Math.min(w.limit ?? 500, DGCP_MAX_PAGE_SIZE);
  const q = new URLSearchParams({
    startdate: w.startdate,
    enddate: w.enddate,
    limit: String(limit),
    page: String(page),
  });
  return `${DGCP_BASE}/procesos?${q}`;
}

/** Recorre las páginas de una ventana de fechas, una a la vez, a través del cliente educado. */
export async function* fetchProcesos(client: PoliteClient, w: ProcesosWindow): AsyncGenerator<ProcesosPage> {
  const maxPages = w.maxPages ?? 50;
  for (let page = 1; page <= maxPages; page++) {
    const res = await client.get(procesosUrl(w, page), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`DGCP HTTP ${res.status}`);
    const parsed = parseProcesosPage(await res.json());
    yield parsed;
    if (page >= parsed.pages) return;
  }
}
