/** Búsqueda unificada (P2): normalización de la consulta. Puro y probado. */

export const SEARCH_MAX = 100;
export const SEARCH_MIN = 2;

/** Espacios colapsados, sin caracteres de control y recortada a SEARCH_MAX. Vacía si es demasiado corta. */
export function normalizeQuery(raw: string | null | undefined): string {
  const q = (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX).trim();
  return q.length >= SEARCH_MIN ? q : "";
}

/** Configuración FTS de la migración 22: español + unaccent. */
export const FTS = { type: "websearch", config: "es_unaccent" } as const;

/** Minúsculas y sin tildes; equivale a lower(unaccent()) de la columna `search_plain` (migración 22). */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Patrón seguro para `ilike` dentro de un filtro `or()` de PostgREST: quita comodines (% _ \) y
 * los caracteres que separan condiciones (, ( ) ") para que la consulta no altere el filtro.
 */
export function ilikePattern(q: string): string {
  const clean = stripAccents(q).replace(/[%_\\,()"]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? `%${clean}%` : "";
}

