/**
 * Datos macro del BCRD guardados en `macro_observations` y `exchange_rates` (migraciones 23 y 24):
 * claves estables, unidades verificadas, cálculos para mostrarlos y avisos para las alertas.
 * Solo aritmética sobre datos del BCRD; no interpreta ni predice (eso es la capa de análisis IA).
 */
import type { IpcPoint, MacroIndicator } from "@/lib/ingest/bcrd";

export const SERIES_SEP = " › ";

export function seriesKeyOf(ind: Pick<MacroIndicator, "group" | "path" | "indicator">): string {
  return [ind.group, ...ind.path, ind.indicator].map((s) => s.trim()).join(SERIES_SEP);
}

/** Una observación distinta por serie + fecha del dato + valor. */
export function observationKeyOf(ind: Pick<MacroIndicator, "group" | "path" | "indicator" | "as_of" | "value">): string {
  return `${seriesKeyOf(ind)}@${ind.as_of ?? "-"}=${ind.value}`;
}

/**
 * Unidades tal como las rotula el BCRD en https://www.bancentral.gov.do/ (bloque «Variables
 * Macroeconómicas», verificado el 2026-11-18). La tasa de cambio no lleva unidad en la fuente.
 */
const UNITS: [prefix: string, unit: string][] = [
  ["Inflación › ", "variación %"],
  ["Monetarias › Tasas de interés › ", "% (promedio ponderado)"],
  ["Monetarias › Prestamos privados › ", "variación % interanual"],
  ["Sector Real › ", "variación % interanual"],
  ["Sector Externo › Reservas Internacionales › ", "US$ millones"],
  ["Sector Externo › Cuentas Corrientes › ", "% del PIB"],
  ["IPC › ", "índice"],
];

export function unitFor(seriesKey: string): string | null {
  return UNITS.find(([p]) => seriesKey.startsWith(p))?.[1] ?? null;
}

/** Convierte el histórico del IPC en indicadores mensuales de una misma serie. */
export const IPC_GROUP = "IPC";
export const IPC_INDICATOR = "Índice de precios al consumidor";

export function ipcToIndicators(points: IpcPoint[]): MacroIndicator[] {
  return points.map((p) => ({
    group: IPC_GROUP,
    path: [],
    indicator: IPC_INDICATOR,
    value: p.value,
    as_of: p.month_start,
    data_quality_flags: [],
  }));
}

export interface ObservationRow {
  id?: string;
  series_key: string;
  group_name: string;
  category_path: string[];
  indicator: string;
  value: number;
  as_of: string | null;
  unit?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  data_quality_flags: string[];
}

export interface PulseItem {
  id: string | null;
  series_key: string;
  group: string;
  path: string[];
  indicator: string;
  value: number;
  unit: string | null;
  as_of: string | null;
  first_seen_at: string;
  previous: { value: number; as_of: string | null } | null;
  /** Diferencia aritmética con el valor anterior (mismas unidades que el dato). */
  change: number | null;
  /** El valor actual llegó en una carga posterior a la del anterior y dentro de `newWithinMs`. */
  is_new: boolean;
  /** El último movimiento va en dirección contraria al movimiento previo (necesita 3 valores). */
  trend_reversal: boolean;
  /** Número de valores guardados de la serie. */
  points: number;
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
    const [cur, prev, prev2] = list;
    // Margen de 10 min: todas las filas de una carga comparten last_seen_at aproximado.
    if (lastLoad - t(cur.last_seen_at) > 10 * 60_000) continue;
    const v = Number(cur.value);
    const d1 = prev ? v - Number(prev.value) : null;
    const d2 = prev && prev2 ? Number(prev.value) - Number(prev2.value) : null;
    out.push({
      id: cur.id ?? null,
      series_key: key,
      group: cur.group_name,
      path: cur.category_path,
      indicator: cur.indicator,
      value: v,
      unit: cur.unit ?? unitFor(key),
      as_of: cur.as_of,
      first_seen_at: cur.first_seen_at,
      previous: prev ? { value: Number(prev.value), as_of: prev.as_of } : null,
      change: d1 === null ? null : round(d1, 6),
      is_new: !!prev && t(prev.first_seen_at) < t(cur.first_seen_at) && now.getTime() - t(cur.first_seen_at) <= newWithinMs,
      trend_reversal: d1 !== null && d2 !== null && d1 * d2 < 0,
      points: list.length,
    });
  }
  return out.sort((a, b) => a.series_key.localeCompare(b.series_key, "es"));
}

/** Etiqueta legible de un indicador: «Inflación Subyacente · Interanual». */
export function labelOf(p: Pick<PulseItem, "path" | "indicator">): string {
  return [...p.path, p.indicator].join(" · ");
}

export interface RateRow {
  id?: string;
  rate_date: string;
  buying: number;
  selling: number;
  first_seen_at?: string;
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

const byDateDesc = (rows: RateRow[]) =>
  rows
    .map((r) => ({ ...r, buying: Number(r.buying), selling: Number(r.selling) }))
    .sort((a, b) => b.rate_date.localeCompare(a.rate_date));

const pct = (a: number, b: number) => round(((a - b) / b) * 100, 4);

export function summarizeFx(rows: RateRow[]): FxSummary | null {
  const list = byDateDesc(rows);
  if (!list.length) return null;
  const [latest, previous] = list;
  const oldest = list[list.length - 1];
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

/** Variación diaria de la venta de cada día frente al día hábil anterior guardado. */
export function fxDailyMoves(rows: RateRow[]): (RateRow & { daily_pct: number })[] {
  const list = byDateDesc(rows);
  return list.slice(0, -1).map((r, i) => ({ ...r, daily_pct: pct(r.selling, list[i + 1].selling) }));
}

// ---------- Alertas macro ----------

/** Umbral del dólar escrito por el usuario (coma o punto decimal): null si está vacío; "invalid" fuera de (0, 20]. */
export function parseFxThreshold(raw: unknown): number | null | "invalid" {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : "invalid";
}

export interface MacroAlertPref {
  id: string;
  name: string;
  macro_new_data: boolean;
  macro_trend_change: boolean;
  fx_daily_move_pct: number | null;
}

export interface MacroNotification {
  entity_type: "macro";
  entity_id: string;
  preference_id: string;
  kind: "new_data" | "trend" | "fx_move";
  title: string;
  reason: string;
  priority: number;
}

const nf = (v: number) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: 4 }).format(v);
const withUnit = (v: number, unit: string | null) => (unit ? `${nf(v)} (${unit})` : nf(v));

/**
 * Avisos a partir de los datos del BCRD, según las condiciones que cada usuario activó. Solo hechos
 * aritméticos sobre el dato oficial; el umbral del dólar lo define el usuario (no hay valor por defecto).
 */
export function buildMacroNotifications(
  prefs: readonly MacroAlertPref[],
  pulse: readonly PulseItem[],
  fx: readonly RateRow[],
  now: Date,
  windowMs = 7 * 86_400_000,
): MacroNotification[] {
  const out: MacroNotification[] = [];
  const recent = (iso: string | undefined) => !!iso && now.getTime() - t(iso) <= windowMs;
  const first = (pred: (p: MacroAlertPref) => boolean) => prefs.find(pred);

  const newPref = first((p) => p.macro_new_data);
  const trendPref = first((p) => p.macro_trend_change);
  for (const p of pulse) {
    if (!p.id) continue;
    const label = `${p.group}: ${labelOf(p)}`;
    if (newPref && p.is_new && p.previous) {
      out.push({
        entity_type: "macro", entity_id: p.id, preference_id: newPref.id, kind: "new_data",
        title: `BCRD publicó ${label}: ${withUnit(p.value, p.unit)}`,
        reason: `Alerta «${newPref.name}»: dato nuevo (antes ${nf(p.previous.value)}).`,
        priority: 3,
      });
    }
    if (trendPref && p.trend_reversal && recent(p.first_seen_at) && p.change !== null) {
      out.push({
        entity_type: "macro", entity_id: p.id, preference_id: trendPref.id, kind: "trend",
        title: `Cambio de dirección en ${label}: ${p.change > 0 ? "sube" : "baja"} a ${withUnit(p.value, p.unit)}`,
        reason: `Alerta «${trendPref.name}»: el último movimiento va en sentido contrario al anterior.`,
        priority: 2,
      });
    }
  }

  const fxPrefs = prefs.filter((p) => p.fx_daily_move_pct !== null && p.fx_daily_move_pct > 0);
  if (fxPrefs.length) {
    for (const m of fxDailyMoves([...fx])) {
      if (!m.id || !recent(m.first_seen_at)) continue;
      // La alerta más sensible que se cumpla.
      const hit = fxPrefs
        .filter((p) => Math.abs(m.daily_pct) >= (p.fx_daily_move_pct as number))
        .sort((a, b) => (a.fx_daily_move_pct as number) - (b.fx_daily_move_pct as number))[0];
      if (!hit) continue;
      out.push({
        entity_type: "macro", entity_id: m.id, preference_id: hit.id, kind: "fx_move",
        title: `Dólar ${m.daily_pct > 0 ? "sube" : "baja"} ${nf(Math.abs(m.daily_pct))} % el ${m.rate_date} (venta ${nf(m.selling)})`,
        reason: `Alerta «${hit.name}»: movimiento diario igual o mayor que ${nf(hit.fx_daily_move_pct as number)} %.`,
        priority: 2,
      });
    }
  }
  return out.slice(0, 200);
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
