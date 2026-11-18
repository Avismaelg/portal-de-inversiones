/**
 * Conector API BCRD (F-02). Solo lectura: NO escribe en la base ni activa la fuente
 * (`sources.is_active` sigue en false hasta decisión del propietario y del abogado, G0 #5).
 *
 * Verificado el 2026-11-18:
 * - Especificación pública: https://api.bancentral.gov.do/swagger/v1/swagger.json (Swagger 2.0).
 * - Todos los endpoints son POST con el token en el cuerpo JSON (`{"token": "..."}`).
 * - Respuesta con sobre ABP (`success`, `result`, `error`). El BCRD restringe cada token por IP de
 *   origen y responde HTTP 500 con "Intento de acceso desde una dirección desconocida" si no coincide.
 * - Solo se registran IPs v4: el proceso que use este conector debe salir por IPv4
 *   (en Node: `dns.setDefaultResultOrder("ipv4first")` y `net.setDefaultAutoSelectFamily(false)`).
 *
 * [PENDIENTE] Forma real de `result`: la spec declara `Var { name, values: object[] }`, pero aún
 * no se obtuvo ninguna respuesta con datos (IP no autorizada). Por eso `values` se deja sin tipar.
 */
import { z } from "zod";
import { PoliteClient } from "./polite-client";

export const BCRD_HOST = "api.bancentral.gov.do";
export const BCRD_BASE = `https://${BCRD_HOST}`;
/** Límite de uso no publicado: margen conservador. [PENDIENTE] confirmar con el BCRD. */
export const BCRD_MAX_PER_MINUTE = 10;

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
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BcrdApiError";
  }
}

/** El token existe pero la IP de origen no está autorizada para él. */
export class BcrdIpNotAllowedError extends BcrdApiError {
  constructor(message: string, status: number, readonly sourceIp: string | null) {
    super(message, status);
    this.name = "BcrdIpNotAllowedError";
  }
}

const varSchema = z.object({
  name: z.string().nullish(),
  values: z.array(z.unknown()).nullish(),
});
export type BcrdVar = z.infer<typeof varSchema>;

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

/** Valida el sobre ABP y devuelve las variables. Lanza errores tipados ante fallo del BCRD. */
export function parseBcrdResponse(status: number, json: unknown): BcrdVar[] {
  const env = envelopeSchema.safeParse(json);
  if (!env.success) throw new BcrdApiError(`BCRD: respuesta con forma inesperada (HTTP ${status})`, status);
  const { success, result, error, unAuthorizedRequest } = env.data;
  if (!success) {
    const msg = error?.message?.trim() || `BCRD: error sin mensaje (HTTP ${status})`;
    if (UNKNOWN_IP.test(msg)) throw new BcrdIpNotAllowedError(msg, status, msg.match(FROM_IP)?.[1] ?? null);
    if (unAuthorizedRequest) throw new BcrdApiError(`BCRD: no autorizado — ${msg}`, status);
    throw new BcrdApiError(msg, status);
  }
  const list = Array.isArray(result) ? result : [result];
  return list.map((v, i) => {
    const r = varSchema.safeParse(v);
    if (!r.success) throw new BcrdApiError(`BCRD: variable ${i} con forma inesperada`, status);
    return r.data;
  });
}

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

async function call(client: PoliteClient, path: string, body: Record<string, unknown>): Promise<BcrdVar[]> {
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
  return parseBcrdResponse(res.status, json);
}

export function fetchMacro(client: PoliteClient, token: string, group: BcrdMacroGroup): Promise<BcrdVar[]> {
  return call(client, BCRD_MACRO_GROUPS[group], { token: requireToken(token) });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface Page {
  skipCount?: number;
  maxResultCount?: number;
}

/** Histórico de tasas de cambio entre dos fechas (YYYY-MM-DD, inclusive según la spec). */
export function fetchHistoricoTasas(
  client: PoliteClient,
  token: string,
  w: { fromDate: string; toDate: string } & Page,
): Promise<BcrdVar[]> {
  if (!DATE.test(w.fromDate) || !DATE.test(w.toDate)) throw new Error("fromDate/toDate deben ser YYYY-MM-DD");
  return call(client, BCRD_HISTORICO_TASAS, {
    fromDate: w.fromDate,
    toDate: w.toDate,
    skipCount: w.skipCount ?? 0,
    maxResultCount: w.maxResultCount ?? 100,
    token: requireToken(token),
  });
}

/** Histórico del índice de precios al consumidor entre dos meses. */
export function fetchHistoricoIpc(
  client: PoliteClient,
  token: string,
  w: { yearFrom: number; monthFrom: number; yearTo: number; monthTo: number } & Page,
): Promise<BcrdVar[]> {
  for (const m of [w.monthFrom, w.monthTo]) {
    if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error("mes fuera de rango 1-12");
  }
  return call(client, BCRD_HISTORICO_IPC, {
    yearFrom: w.yearFrom,
    monthFrom: w.monthFrom,
    yearTo: w.yearTo,
    monthTo: w.monthTo,
    skipCount: w.skipCount ?? 0,
    maxResultCount: w.maxResultCount ?? 100,
    token: requireToken(token),
  });
}
