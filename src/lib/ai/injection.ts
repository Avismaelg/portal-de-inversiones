/**
 * Detección heurística de prompt injection (SISTEMA-IA §8, control I-6).
 *
 * No descarta el documento: lo marca `injection_suspected` para que la persona que revisa
 * sepa que el texto intentó dar instrucciones al modelo. Las defensas que de verdad acotan
 * el daño son I-1 (sin herramientas con efectos) e I-5 (verificación literal).
 */
import { fold } from "@/lib/ingest/news";

const PATTERNS: RegExp[] = [
  /ignora(?:r)? (?:todas )?las instrucciones/,
  /ignore (?:all )?(?:the )?(?:previous|prior|above) instructions/,
  /(?:system|sistema) prompt/,
  /(?:you are now|ahora eres|a partir de ahora eres|desde ahora eres)/,
  /act[uú]a como (?:un|una|el|la)? ?(?:asistente|modelo|ia|sistema|administrador)/,
  /(?:reveal|muestra|revela) (?:tus|your) (?:instrucciones|instructions|reglas|rules)/,
  /jailbreak|do anything now|\bdan\b/,
  /<\|?im_start\|?>|\[inst\]|<\/?system>|###\s*instructions?/,
  /(?:omite|salta|no sigas) (?:las|tus) (?:reglas|instrucciones|restricciones)/,
  /ejecuta (?:el|este) (?:comando|c[oó]digo)/,
];

/** true si algún texto contiene un patrón dirigido al modelo. */
export function detectInjection(...texts: Array<string | null | undefined>): boolean {
  const text = fold(texts.filter((t): t is string => !!t).join("\n"));
  return PATTERNS.some((re) => re.test(text));
}
