/** Filtros del listado de licitaciones, compartidos por la página y la exportación CSV. */

export const TENDER_STATUS: Record<string, string> = {
  open: "Abierta",
  closed: "Cerrada",
  awarded: "Adjudicada",
  cancelled: "Cancelada",
  planned: "Planificada",
  unknown: "Estado no mapeado",
};

export type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export interface TenderFilters {
  q: string;
  method: string;
  status: string;
  order: "cierre" | "monto" | "recientes";
  onlyOpen: boolean;
  page: number;
}

export function parseTenderFilters(sp: Params): TenderFilters {
  const orderRaw = one(sp.orden);
  const status = one(sp.estado);
  return {
    q: one(sp.q).trim().slice(0, 100),
    method: one(sp.metodo).trim().slice(0, 80),
    status: TENDER_STATUS[status] ? status : "",
    order: (["cierre", "monto", "recientes"].includes(orderRaw) ? orderRaw : "cierre") as TenderFilters["order"],
    // Sin parámetros (primera visita) se muestran solo las vigentes.
    onlyOpen: one(sp.vigentes) === "1" || Object.keys(sp).length === 0,
    page: Math.max(1, Number(one(sp.pagina)) || 1),
  };
}

/** Parámetros de URL equivalentes (sin página), para enlaces y exportación. */
export function tenderFilterQuery(f: TenderFilters, page?: number): string {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.method) u.set("metodo", f.method);
  if (f.status) u.set("estado", f.status);
  u.set("orden", f.order);
  if (f.onlyOpen) u.set("vigentes", "1");
  if (page) u.set("pagina", String(page));
  return u.toString();
}
