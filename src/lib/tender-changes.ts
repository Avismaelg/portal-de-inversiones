/** Texto legible de cada cambio registrado en `tender_changes` (migración 21). Puro y probado. */
import { PUBLICATION } from "./format";

export const FIELD_LABELS: Record<string, string> = {
  title: "Título",
  description: "Descripción",
  status: "Estado del proceso",
  procurement_method: "Modalidad",
  published_at: "Fecha de publicación",
  deadline_at: "Cierre de ofertas",
  budget_amount: "Monto estimado",
  budget_currency: "Moneda",
  source_url: "Enlace a la fuente",
  data_quality_flags: "Observaciones de calidad",
  publication_status: "Estado en la plataforma",
};

export const ORIGIN_LABELS: Record<string, string> = {
  ingest: "Carga desde la fuente",
  review: "Revisión humana",
  edit: "Edición",
};

const STATUS: Record<string, string> = {
  open: "Abierta", closed: "Cerrada", awarded: "Adjudicada", cancelled: "Cancelada", planned: "Planificada", unknown: "No mapeado",
};

function fmt(field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (field === "deadline_at" || field === "published_at") {
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) return String(v);
    return new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(d);
  }
  if (field === "budget_amount") {
    const n = Number(v);
    return Number.isFinite(n) ? new Intl.NumberFormat("es-DO", { maximumFractionDigits: 2 }).format(n) : String(v);
  }
  if (field === "status") return STATUS[String(v)] ?? String(v);
  if (field === "publication_status") return PUBLICATION[String(v)] ?? String(v);
  if (Array.isArray(v)) return v.length ? v.join("; ") : "ninguna";
  const s = String(v);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

export type ChangeLine = { field: string; label: string; from: string; to: string };

/** Convierte el JSON {campo: {from, to}} en líneas ordenadas según FIELD_LABELS; ignora campos desconocidos. */
export function describeChanges(changes: unknown): ChangeLine[] {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];
  const c = changes as Record<string, { from?: unknown; to?: unknown } | undefined>;
  return Object.keys(FIELD_LABELS)
    .filter((f) => c[f] && typeof c[f] === "object")
    .map((f) => ({ field: f, label: FIELD_LABELS[f], from: fmt(f, c[f]!.from), to: fmt(f, c[f]!.to) }));
}
