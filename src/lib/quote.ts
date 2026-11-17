/**
 * Verificación literal de citas (evidencia para publicar). Determinista: la cita debe aparecer TAL CUAL
 * en el texto de la fuente; solo se toleran diferencias de espacios en blanco (saltos de línea, dobles
 * espacios). No se ignoran tildes ni mayúsculas: una cita con otra ortografía no es literal.
 */
export const QUOTE_MIN = 20;
export const QUOTE_MAX = 1000;

export function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export type QuoteMatch = { quote: string; start: number; end: number };

/** Devuelve la cita normalizada y su posición en el texto normalizado, o null si no aparece literalmente. */
export function locateQuote(quote: string, text: string | null | undefined): QuoteMatch | null {
  if (!text) return null;
  const q = normalizeSpaces(normalizeSpaces(quote).replace(/^["“«]+|["”»]+$/g, ""));
  if (q.length < QUOTE_MIN || q.length > QUOTE_MAX) return null;
  const start = normalizeSpaces(text).indexOf(q);
  return start < 0 ? null : { quote: q, start, end: start + q.length };
}
