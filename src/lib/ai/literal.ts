/**
 * Verificador literal de citas (T-AI-02, SISTEMA-IA §2 y §8).
 *
 * Una cita solo cuenta si aparece en el texto recibido tras normalizar mayúsculas, tildes y
 * espacios. No se corrige ni se interpreta: si el modelo cambió una palabra, la cita no vale.
 * Es el control anti-alucinación que el código aplica siempre, sin depender del proveedor.
 */
import { fold } from "@/lib/ingest/news";

/** Mínimo de caracteres para que una cita sea comprobable (evita «el», «2026»). */
export const MIN_QUOTE_LENGTH = 8;

/** Minúsculas, sin tildes, con los espacios colapsados. */
export function normalizeLiteral(value: string): string {
  return fold(value).replace(/\s+/g, " ").trim();
}

/** ¿La cita aparece literalmente en el texto? */
export function verifyLiteral(quote: string | null | undefined, source: string): boolean {
  if (!quote) return false;
  const q = normalizeLiteral(quote);
  if (q.length < MIN_QUOTE_LENGTH) return false;
  return normalizeLiteral(source).includes(q);
}

/**
 * ¿La cita contiene el dato afirmado? Se usa para no aceptar una cita real que no respalde
 * el nombre de la organización, la ubicación o el importe extraído.
 */
export function quoteSupports(quote: string, claim: string | null | undefined): boolean {
  if (!claim) return false;
  const c = normalizeLiteral(claim);
  if (c.length < 2) return false;
  return normalizeLiteral(quote).includes(c);
}

/** Solo los dígitos de un texto (para comparar cifras sin separadores). */
export function digitsOf(value: string): string {
  return fold(value).replace(/\D+/g, "");
}

/**
 * Cifras que aparecen en un texto generado y no existen en la fuente.
 * Devuelve la representación original de cada una para poder avisar.
 */
export function unsupportedNumbers(generated: string, source: string): string[] {
  const src = digitsOf(source);
  const out = new Set<string>();
  for (const match of generated.matchAll(/\d[\d.,]*/g)) {
    const digits = digitsOf(match[0]);
    if (digits.length > 0 && !src.includes(digits)) out.add(match[0].replace(/[.,]$/, ""));
  }
  return [...out];
}
