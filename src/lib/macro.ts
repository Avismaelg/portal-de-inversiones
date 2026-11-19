/**
 * Datos macro del BCRD guardados en `macro_observations` y `exchange_rates` (migración 23):
 * claves estables para guardarlos y cálculos para mostrarlos. Solo aritmética sobre datos del
 * BCRD; no interpreta ni predice (eso sería capa de análisis o inferencia, etiquetada aparte).
 */
import type { MacroIndicator } from "@/lib/ingest/bcrd";

export const SERIES_SEP = " › ";

export function seriesKeyOf(ind: Pick<MacroIndicator, "group" | "path" | "indicator">): string {
  return [ind.group, ...ind.path, ind.indicator].map((s) => s.trim()).join(SERIES_SEP);
}

/** Una observación distinta por serie + fecha del dato + valor. */
export function observationKeyOf(ind: MacroIndicator): string {
  return `${seriesKeyOf(ind)}@${ind.as_of ?? "-"}=${ind.value}`;
}

export interface ObservationRow {
  series_key: string;
  group_name: string;
  category_path: string[];
  indicator: string;
  value: number;
  as_of: string | null;
  first_seen_at: string;
  last_seen_at: string;
  data_quality_flags: string[];
}

export interface PulseItem {
  series_key: string;
  group: string;
  path: string[];
  indicator: string;
  value: number;
  as_of: string | null;
  first_seen_at: string;
  previous: { value: number; as_of: string | null } | null;
  /** Diferencia aritmética con el valor anterior visto (mismas unidades que el dato). */
  change: number | null;
  /** El valor actual apareció por primera vez dentro de la ventana `newWithinMs`. */
  is_new: boolean;
}

const t = (s: string) => new Date(s).getTime();

/**
 * Último valor de cada serie vigente (vista en la carga más reciente) con su valor anterior.
 * Una serie deja de estar vigente cuando el BCRD ya no la devuelve (p. ej. "IMAE Septiembre 2026"
 * cuando sale octubre).
 */
export function buildPulse(rows: ObservationRow[], now: Date, newWithinMs = 7 * 86_400_000): PulseItem[] {
  if (!rows.length) return [];
  const lastLoad = Math.max(...rows.map((r) => t(r.last_seen_at)));
  const bySeries = new Map<string, ObservationRow[]>();
  for (const r of rows) {
    const list = bySeries.get(r.series_key) ?? [];
    list.push(r);
    bySeries.set(r.series_key, list);
  }
  const out: PulseItem[] = [];
  for (const [key, list] of bySeries) {
    list.sort((a, b) => t(b.first_seen_at) - t(a.first_seen_at) || (b.as_of ?? "").localeCompare(a.as_of ?? ""));
    const [cur, prev] = list;
    // Margen de 10 min: todas las filas de una carga comparten last_seen_at aproximado.
    if (lastLoad - t(cur.last_seen_at) > 10 * 60_000) continue;
    out.push({
      series_key: key,
      group: cur.group_name,
      path: cur.category_path,
      indicator: cur.indicator,
      value: Number(cur.value),
      as_of: cur.as_of,
      first_seen_at: cur.first_seen_at,
      previous: prev ? { value: Number(prev.value), as_of: prev.as_of } : null,
      change: prev ? round(Number(cur.value) - Number(prev.value), 6) : null,
      is_new: now.getTime() - t(cur.first_seen_at) <= newWithinMs && list.length > 1,
    });
  }
  return out.sort((a, b) => a.series_key.localeCompare(b.series_key, "es"));
}

export interface RateRow {
  rate_date: string;
  buying: number;
  selling: number;
}

export interface FxSummary {
  latest: RateRow;
  previous: RateRow | null;
  /** Variación porcentual de la venta frente al día hábil anterior. */
  daily_pct: number | null;
  /** Variación porcentual de la venta frente al dato más antiguo de la ventana. */
  window_pct: number | null;
  window_start: string;
  min_selling: number;
  max_selling: number;
  days: number;
}

export function summarizeFx(rows: RateRow[]): FxSummary | null {
  const list = rows
    .map((r) => ({ rate_date: r.rate_date, buying: Number(r.buying), selling: Number(r.selling) }))
    .sort((a, b) => b.rate_date.localeCompare(a.rate_date));
  if (!list.length) return null;
  const [latest, previous] = list;
  const oldest = list[list.length - 1];
  const pct = (a: number, b: number) => round(((a - b) / b) * 100, 4);
  const sells = list.map((r) => r.selling);
  return {
    latest,
    previous: previous ?? null,
    daily_pct: previous ? pct(latest.selling, previous.selling) : null,
    window_pct: list.length > 1 ? pct(latest.selling, oldest.selling) : null,
    window_start: oldest.rate_date,
    min_selling: Math.min(...sells),
    max_selling: Math.max(...sells),
    days: list.length,
  };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
