/** Búsqueda unificada (P2): normalización de la consulta. Puro y probado. */

export const SEARCH_MAX = 100;
export const SEARCH_MIN = 2;

/** Espacios colapsados, sin caracteres de control y recortada a SEARCH_MAX. Vacía si es demasiado corta. */
export function normalizeQuery(raw: string | null | undefined): string {
  const q = (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX).trim();
  return q.length >= SEARCH_MIN ? q : "";
}

/**
 * Patrón seguro para `ilike` dentro de un filtro `or()` de PostgREST: quita comodines (% _ \) y
 * los caracteres que separan condiciones (, ( ) ") para que la consulta no altere el filtro.
 */
export function ilikePattern(q: string): string {
  const clean = q.replace(/[%_\\,()"]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? `%${clean}%` : "";
}

/** Filtro `or()` de PostgREST: el patrón va entre comillas dobles (ilikePattern ya las quitó). */
export function ilikeAny(columns: readonly string[], pattern: string): string {
  return columns.map((c) => `${c}.ilike."${pattern}"`).join(",");
}
