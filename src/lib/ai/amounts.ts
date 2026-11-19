/**
 * Parseo determinista de importes (SISTEMA-IA §4.2: «el importe se parsea con reglas de locale
 * es-DO y nunca por el LLM»). El modelo solo devuelve la expresión literal (`amount_text`);
 * aquí se convierte a número cuando la forma es inequívoca. Si hay duda, se devuelve null:
 * es preferible no mostrar una cifra que inventarla.
 */
import { fold } from "@/lib/ingest/news";

const MULTIPLIERS: Array<{ re: RegExp; factor: number }> = [
  { re: /\bmil\s+millones\b/, factor: 1e9 },
  { re: /\bbillones?\b/, factor: 1e12 },
  { re: /\bmillones?\b/, factor: 1e6 },
  { re: /\bmil\b/, factor: 1e3 },
];

/** Separa el número de su multiplicador y devuelve el factor (1 si no hay). */
function splitMultiplier(text: string): { numeric: string; factor: number } {
  for (const { re, factor } of MULTIPLIERS) {
    if (re.test(text)) return { numeric: text.replace(re, " "), factor };
  }
  return { numeric: text, factor: 1 };
}

/** Convierte «1,200,000.50» o «1.200.000,50» a número; null si es ambiguo. */
export function parseDecimal(raw: string): number | null {
  const token = raw.match(/\d[\d.,\s']*/)?.[0];
  if (!token) return null;
  const clean = token.replace(/[\s']/g, "").replace(/[.,]+$/, "");
  if (!clean) return null;

  const dots = (clean.match(/\./g) ?? []).length;
  const commas = (clean.match(/,/g) ?? []).length;
  let normalized: string;

  if (dots > 0 && commas > 0) {
    // El separador que aparece más a la derecha es el decimal; el otro agrupa miles.
    const decimal = clean.lastIndexOf(".") > clean.lastIndexOf(",") ? "." : ",";
    const group = decimal === "." ? "," : ".";
    normalized = clean.split(group).join("").replace(decimal, ".");
  } else if (dots + commas > 1) {
    // Varios separadores iguales: agrupan miles (1.200.000 o 1,200,000).
    normalized = clean.replace(/[.,]/g, "");
  } else if (commas === 1) {
    // En es-DO la coma agrupa miles cuando deja exactamente 3 dígitos.
    const [int, dec] = clean.split(",");
    normalized = dec.length === 3 && int.length >= 1 ? `${int}${dec}` : `${int}.${dec}`;
  } else if (dots === 1) {
    const [int, dec] = clean.split(".");
    // «1.200» sin multiplicador se lee como miles; «5.5» como decimal.
    normalized = dec.length === 3 && int.length <= 3 && int.length >= 1 ? `${int}${dec}` : `${int}.${dec}`;
  } else {
    normalized = clean;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Importe literal + multiplicador → número. Null si no hay dígitos o el resultado es absurdo. */
export function parseAmountText(raw: string): number | null {
  const text = fold(raw).replace(/\s+/g, " ").trim();
  if (!/\d/.test(text) && !/\bmil\b|\bmillones?\b|\bbillones?\b/.test(text)) return null;
  const { numeric, factor } = splitMultiplier(text);
  const base = parseDecimal(numeric) ?? (factor > 1 && !/\d/.test(numeric) ? 1 : null);
  if (base === null) return null;
  const value = Math.round(base * factor * 1e6) / 1e6;
  return value > 0 && value < 1e15 ? value : null;
}

/** Símbolos y nombres de moneda que el texto puede declarar; null si no declara ninguna. */
export function detectCurrency(raw: string): "DOP" | "USD" | "EUR" | null {
  const text = fold(raw);
  if (/rd\$|pesos?\s+dominicanos?|\bdop\b/.test(text)) return "DOP";
  if (/us\$|u\$s|\bd[oó]lares?\b|\busd\b/.test(text)) return "USD";
  if (/€|\beuros?\b|\beur\b/.test(text)) return "EUR";
  return null;
}
