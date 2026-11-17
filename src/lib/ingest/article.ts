/**
 * Lectura puntual del texto de una noticia institucional para dar contexto al análisis de IA.
 * El texto se usa SOLO en memoria al generar el análisis: no se guarda (términos de las fuentes pendientes).
 */
import { toPlainText } from "./news";
import type { PoliteClient } from "./polite-client";

const MAX_CHARS = 8000;

/** Extrae el texto principal de un HTML: <article>, luego <main>, luego <body>; sin scripts, menús ni pies. */
export function extractArticleText(html: string): string {
  const pick = (tag: string) => html.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "i"))?.[0];
  const region = pick("article") ?? pick("main") ?? pick("body") ?? html;
  const clean = region.replace(/<(script|style|nav|header|footer|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi, " ");
  const text = toPlainText(clean);
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}…` : text;
}

export async function fetchArticleText(client: PoliteClient, url: string): Promise<string | null> {
  try {
    const res = await client.get(url, { headers: { Accept: "text/html" } });
    if (!res.ok) return null;
    const text = extractArticleText(await res.text());
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  }
}
