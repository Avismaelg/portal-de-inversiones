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

const NUMBER = /\d[\d.,]*/g;

/**
 * Cifras que aparecen en un texto generado y no existen en la fuente.
 * Devuelve la representación original de cada una para poder avisar.
 *
 * Se compara cifra contra cifra (sin separadores), no contra la cadena de todos los dígitos de la
 * fuente: así «20» no pasa porque la fuente diga «120», ni «12080» por pegar «120» y «80».
 * «1,500» y «1.500» siguen siendo la misma cifra. Una cifra redondeada o reescrita no pasa.
 */
export function unsupportedNumbers(generated: string, source: string): string[] {
  const known = new Set<string>();
  for (const match of source.matchAll(NUMBER)) known.add(digitsOf(match[0]));
  const out = new Set<string>();
  for (const match of generated.matchAll(NUMBER)) {
    const digits = digitsOf(match[0]);
    if (digits.length > 0 && !known.has(digits)) out.add(match[0].replace(/[.,]$/, ""));
  }
  return [...out];
}
