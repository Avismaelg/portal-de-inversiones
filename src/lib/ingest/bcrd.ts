/**
 * Conector API BCRD (F-02). Solo lectura: NO escribe en la base ni activa la fuente
 * (`sources.is_active` sigue en false hasta decisión del propietario y del abogado, G0 #5).
 *
 * Verificado el 2026-11-18 con llamadas reales (HTTP 200):
 * - Especificación pública: https://api.bancentral.gov.do/swagger/v1/swagger.json (Swagger 2.0).
 * - Todos los endpoints son POST con el token en el cuerpo JSON (`{"token": "..."}`).
 * - Respuesta con sobre ABP (`success`, `result`, `error`). El BCRD restringe cada token por IP de
 *   origen y responde HTTP 500 con "Intento de acceso desde una dirección desconocida" si no coincide.
 * - Solo se registran IPs v4: el proceso que use este conector debe salir por IPv4
 *   (en Node: `dns.setDefaultResultOrder("ipv4first")` y `net.setDefaultAutoSelectFamily(false)`).
 * - `MacroVariables/*`: árbol `{ name, values: [{ name, values: [{ name, value }], date? }] }` con
 *   `date` en `dd/MM/yyyy` y anidación variable. Solo trae el último dato de cada indicador.
 * - `HistoricoTasas`: `values: [{ totalCount, items: [{ buyingValue, sellingValue, exchangeRateDate, ... }] }]`.
 *
 * - `HistoricoIPC`: `values: [{ month, year, indexValue }]` con rangos de años completos.
 *
 * Las unidades no vienen en la API; están en `src/lib/macro.ts` (`unitFor`), tomadas de la web del BCRD.
 */
import { z } from "zod";
import { PoliteClient } from "./polite-client";

export const BCRD_HOST = "api.bancentral.gov.do";
export const BCRD_BASE = `https://${BCRD_HOST}`;
/** Cuota del portal: 500 peticiones/día por token. Límite por minuto no publicado: margen conservador. */
export const BCRD_MAX_PER_MINUTE = 10;
export const BCRD_DAILY_QUOTA = 500;

export const BCRD_MACRO_GROUPS = {
  monetarias: "/api/services/app/MacroVariables/Monetarias",
  inflacion: "/api/services/app/MacroVariables/Inflacion",
  sectorReal: "/api/services/app/MacroVariables/SectorReal",
  sectorExterno: "/api/services/app/MacroVariables/SectorExterno",
} as const;
export type BcrdMacroGroup = keyof typeof BCRD_MACRO_GROUPS;

export const BCRD_HISTORICO_TASAS = "/api/services/app/MacroVariables/HistoricoTasas";
export const BCRD_HISTORICO_IPC = "/api/v2/HistoricoIPC";

/** Error devuelto por el BCRD dentro del sobre ABP. Nunca incluye el token. */
export class BcrdApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BcrdApiError";
    this.status = status;
  }
}

/** El token existe pero la IP de origen no está autorizada para él. */
export class BcrdIpNotAllowedError extends BcrdApiError {
  readonly sourceIp: string | null;
  constructor(message: string, status: number, sourceIp: string | null) {
    super(message, status);
    this.name = "BcrdIpNotAllowedError";
    this.sourceIp = sourceIp;
  }
}

const envelopeSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z
    .object({ code: z.number().nullish(), message: z.string().nullish(), details: z.string().nullish() })
    .nullish(),
  unAuthorizedRequest: z.boolean().nullish(),
});

const UNKNOWN_IP = /direcci[oó]n desconocida/i;
const FROM_IP = /FROM IP\s+([0-9a-f.:]+)/i;

/** Valida el sobre ABP y devuelve `result`. Lanza errores tipados ante fallo del BCRD. */
export function parseBcrdEnvelope(status: number, json: unknown): unknown {
  const env = envelopeSchema.safeParse(json);
  if (!env.success) throw new BcrdApiError(`BCRD: respuesta con forma inesperada (HTTP ${status})`, status);
  const { success, result, error, unAuthorizedRequest } = env.data;
  if (!success) {
    const msg = error?.message?.trim() || `BCRD: error sin mensaje (HTTP ${status})`;
    if (UNKNOWN_IP.test(msg)) throw new BcrdIpNotAllowedError(msg, status, msg.match(FROM_IP)?.[1] ?? null);
    if (unAuthorizedRequest) throw new BcrdApiError(`BCRD: no autorizado — ${msg}`, status);
    throw new BcrdApiError(msg, status);
  }
  return result;
}

// ---------- Variables macro (último dato) ----------

export interface MacroNode {
  name: string;
  value?: number | null;
  date?: string | null;
  values?: MacroNode[] | null;
}

const macroNodeSchema: z.ZodType<MacroNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    value: z.number().nullish(),
    date: z.string().nullish(),
    values: z.array(macroNodeSchema).nullish(),
  }),
);

export interface MacroIndicator {
  /** Grupo de la API, p. ej. "Inflación". */
  group: string;
  /** Ruta de categorías entre el grupo y el indicador, p. ej. ["Inflación Subyacente"]. */
  path: string[];
  /** Nombre del indicador hoja, p. ej. "Interanual". */
  indicator: string;
  value: number;
  /** Fecha del dato (YYYY-MM-DD) heredada del nodo más cercano que la declare; null si no hay. */
  as_of: string | null;
  data_quality_flags: string[];
}

const DMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Convierte `dd/MM/yyyy` a `YYYY-MM-DD` validando el calendario. Fecha sin hora ni zona. */
export function parseBcrdDate(value: string | null | undefined): string | null {
  const m = value?.trim().match(DMY);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (d.getUTCFullYear() !== Number(yyyy) || d.getUTCMonth() !== Number(mm) - 1 || d.getUTCDate() !== Number(dd)) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

/** Aplana el árbol de un grupo en indicadores. No inventa fechas ausentes; las unidades se asignan aparte. */
export function flattenMacro(root: MacroNode): MacroIndicator[] {
  const out: MacroIndicator[] = [];
  const walk = (node: MacroNode, path: string[], inheritedDate: string | null | undefined, rawDate: string | null | undefined) => {
    const ownRaw = node.date ?? rawDate;
    const ownDate = node.date != null ? parseBcrdDate(node.date) : inheritedDate;
    if (node.values && node.values.length > 0) {
      for (const child of node.values) walk(child, [...path, node.name], ownDate, ownRaw);
      return;
    }
    if (node.value == null) return;
    const flags: string[] = [];
    if (ownRaw == null) flags.push("missing_date");
    else if (ownDate == null) flags.push(`invalid_date:${ownRaw}`);
    out.push({
      group: root.name,
      path: path.slice(1),
      indicator: node.name,
      value: node.value,
      as_of: ownDate ?? null,
      data_quality_flags: flags,
    });
  };
  walk(root, [], null, null);
  return out;
}

export function parseMacroResult(status: number, result: unknown): MacroIndicator[] {
  const r = macroNodeSchema.safeParse(result);
  if (!r.success) throw new BcrdApiError("BCRD: árbol de variables con forma inesperada", status);
  return flattenMacro(r.data);
}

// ---------- Histórico de tasa de cambio ----------

const rateItemSchema = z.object({
  id: z.number(),
  buyingValue: z.number(),
  sellingValue: z.number(),
  currencyId: z.number().nullish(),
  exchangeRateDate: z.string(),
  isDeleted: z.boolean().nullish(),
  isActive: z.boolean().nullish(),
});

const ratePageSchema = z.object({
  name: z.string().nullish(),
  values: z.array(z.object({ totalCount: z.number(), items: z.array(z.unknown()) })),
});

export interface ExchangeRateRow {
  external_id: number;
  /** YYYY-MM-DD (fecha del tipo de cambio, sin zona). */
  rate_date: string;
  buying: number;
  selling: number;
  currency_id: number | null;
}

export interface ExchangeRatePage {
  items: ExchangeRateRow[];
  /** Ítems que no cumplen el esquema o están marcados como borrados/inactivos: se cuentan, no se descartan en silencio. */
  rejected: { index: number; reason: string }[];
  totalCount: number;
}

export function parseExchangeRates(status: number, result: unknown): ExchangeRatePage {
  const page = ratePageSchema.safeParse(result);
  if (!page.success) throw new BcrdApiError("BCRD: histórico de tasas con forma inesperada", status);
  const block = page.data.values[0] ?? { totalCount: 0, items: [] };
  const items: ExchangeRateRow[] = [];
  const rejected: ExchangeRatePage["rejected"] = [];
  block.items.forEach((raw, index) => {
    const r = rateItemSchema.safeParse(raw);
    if (!r.success) return void rejected.push({ index, reason: r.error.issues[0]?.message ?? "invalid" });
    const it = r.data;
    if (it.isDeleted) return void rejected.push({ index, reason: "deleted" });
    if (it.isActive === false) return void rejected.push({ index, reason: "inactive" });
    const date = /^\d{4}-\d{2}-\d{2}/.exec(it.exchangeRateDate)?.[0];
    if (!date) return void rejected.push({ index, reason: `invalid_date:${it.exchangeRateDate}` });
    if (it.buyingValue <= 0 || it.sellingValue <= 0) return void rejected.push({ index, reason: "non_positive_rate" });
    items.push({ external_id: it.id, rate_date: date, buying: it.buyingValue, selling: it.sellingValue, currency_id: it.currencyId ?? null });
  });
  return { items, rejected, totalCount: block.totalCount };
}

// ---------- Llamadas ----------

/** Cliente con la lista cerrada del BCRD. Sin reintentos: el BCRD responde 500 a errores de negocio. */
export function createBcrdClient(opts: { clientName: string; contact: string; fetchImpl?: typeof fetch }) {
  return new PoliteClient({
    allowedHosts: [BCRD_HOST],
    clientName: opts.clientName,
    contact: opts.contact,
    maxPerMinute: BCRD_MAX_PER_MINUTE,
    maxRetries: 0,
    fetchImpl: opts.fetchImpl,
  });
}

function requireToken(token: string): string {
  const t = token?.trim();
  if (!t) throw new Error("BCRD_API_TOKEN no configurado");
  return t;
}

async function call(client: PoliteClient, path: string, body: Record<string, unknown>): Promise<{ status: number; result: unknown }> {
  const res = await client.post(`${BCRD_BASE}${path}`, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new BcrdApiError(`BCRD HTTP ${res.status} sin JSON`, res.status);
  }
  return { status: res.status, result: parseBcrdEnvelope(res.status, json) };
}

/** Último dato de cada indicador del grupo, aplanado. */
export async function fetchMacro(client: PoliteClient, token: string, group: BcrdMacroGroup): Promise<MacroIndicator[]> {
  const { status, result } = await call(client, BCRD_MACRO_GROUPS[group], { token: requireToken(token) });
  return parseMacroResult(status, result);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface Page {
  skipCount?: number;
  maxResultCount?: number;
}

/**
 * Histórico de tasa de cambio entre dos fechas (YYYY-MM-DD).
 * [PENDIENTE] Cobertura real: con 2026-11-01..18 el ítem más reciente fue del 06/11.
 */
export async function fetchHistoricoTasas(
  client: PoliteClient,
  token: string,
  w: { fromDate: string; toDate: string } & Page,
): Promise<ExchangeRatePage> {
  if (!DATE.test(w.fromDate) || !DATE.test(w.toDate)) throw new Error("fromDate/toDate deben ser YYYY-MM-DD");
  const { status, result } = await call(client, BCRD_HISTORICO_TASAS, {
    fromDate: w.fromDate,
    toDate: w.toDate,
    skipCount: w.skipCount ?? 0,
    maxResultCount: w.maxResultCount ?? 100,
    token: requireToken(token),
  });
  return parseExchangeRates(status, result);
}

// ---------- Histórico del IPC ----------

const ipcSchema = z.object({
  name: z.string().nullish(),
  values: z.array(z.unknown()),
});
const ipcItemSchema = z.object({ month: z.number().int().min(1).max(12), year: z.number().int(), indexValue: z.number().positive() });

export interface IpcPoint {
  /** Primer día del mes (YYYY-MM-01). */
  month_start: string;
  value: number;
}

/**
 * `{ name: "IPC", values: [{ month, year, indexValue }] }` (verificado el 2026-11-18 con 2024-01..2026-10).
 * Con un rango dentro del mismo año reciente devolvió `values: []`: pedir rangos de años completos.
 */
export function parseIpc(status: number, result: unknown): { items: IpcPoint[]; rejected: number } {
  const r = ipcSchema.safeParse(result);
  if (!r.success) throw new BcrdApiError("BCRD: histórico del IPC con forma inesperada", status);
  const items: IpcPoint[] = [];
  let rejected = 0;
  for (const raw of r.data.values) {
    const it = ipcItemSchema.safeParse(raw);
    if (!it.success) {
      rejected++;
      continue;
    }
    items.push({ month_start: `${it.data.year}-${String(it.data.month).padStart(2, "0")}-01`, value: it.data.indexValue });
  }
  items.sort((a, b) => a.month_start.localeCompare(b.month_start));
  return { items, rejected };
}

/** Histórico mensual del índice de precios al consumidor entre dos meses. */
export async function fetchHistoricoIpc(
  client: PoliteClient,
  token: string,
  w: { yearFrom: number; monthFrom: number; yearTo: number; monthTo: number } & Page,
): Promise<{ items: IpcPoint[]; rejected: number }> {
  for (const m of [w.monthFrom, w.monthTo]) {
    if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("mes fuera de rango 1-12");
  }
  const { status, result } = await call(client, BCRD_HISTORICO_IPC, {
    yearFrom: w.yearFrom,
    monthFrom: w.monthFrom,
    yearTo: w.yearTo,
    monthTo: w.monthTo,
    skipCount: w.skipCount ?? 0,
    maxResultCount: w.maxResultCount ?? 100,
    token: requireToken(token),
  });
  return parseIpc(status, result);
}
