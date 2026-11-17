/**
 * Noticias de fuentes primarias (instituciones). Solo se conserva titular, enlace, fecha y un
 * extracto breve; nunca el texto completo. Una noticia es una SEÑAL (capa «Inferencia»), no un hecho
 * verificado. Los términos de cada institución están pendientes de revisión (FUENTES-RD.md).
 */
import type { PoliteClient } from "./polite-client";

export interface NewsFeed {
  key: string;
  name: string;
  url: string;
}

export const NEWS_FEEDS: readonly NewsFeed[] = [
  { key: "indotel", name: "Indotel", url: "https://indotel.gob.do/feed/" },
  { key: "simv", name: "SIMV", url: "https://simv.gob.do/feed/" },
  { key: "hacienda", name: "Hacienda y Economía", url: "https://www.hacienda.gob.do/feed/" },
  { key: "diputados", name: "Cámara de Diputados", url: "https://camaradediputados.gob.do/feed/" },
  { key: "senado", name: "Senado", url: "https://www.senadord.gob.do/feed/" },
  { key: "proindustria", name: "Proindustria", url: "https://proindustria.gob.do/feed/" },
  { key: "procompetencia", name: "Procompetencia", url: "https://procompetencia.gob.do/feed/" },
];

/** Hosts permitidos: el de cada feed y su variante con/sin `www` (los sitios redirigen entre ambas). */
export const NEWS_HOSTS: readonly string[] = [
  ...new Set(
    NEWS_FEEDS.flatMap((f) => {
      const h = new URL(f.url).hostname;
      return [h, h.startsWith("www.") ? h.slice(4) : `www.${h}`];
    }),
  ),
];

export interface NewsItem {
  url: string;
  title: string;
  excerpt: string | null;
  published_at: string | null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

function field(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

/** Texto plano: quita etiquetas y entidades, compacta espacios. */
export function toPlainText(html: string): string {
  return decode(decode(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function makeExcerpt(html: string | null, max = 280): string | null {
  if (!html) return null;
  const text = toPlainText(html);
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).trimEnd() + "…";
}

export function parseRss(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const block = m[0];
    const title = toPlainText(field(block, "title") ?? "");
    const link = toPlainText(field(block, "link") ?? "");
    if (!title || !/^https:\/\//.test(link)) continue;
    const d = field(block, "pubDate");
    const t = d ? new Date(d.trim()) : null;
    out.push({
      url: link,
      title,
      excerpt: makeExcerpt(field(block, "description") ?? field(block, "content:encoded")),
      published_at: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
    });
  }
  return out;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palabras clave fuertes: una sola basta para considerar la noticia relevante para inversión. */
export const STRONG_KEYWORDS: readonly string[] = [
  "inversion", "inversiones", "inversionista", "concesion", "licitacion", "presupuesto", "bonos", "subasta",
  "emision de", "mercado de valores", "bolsa de valores", "banco central", "fideicomiso", "zona franca",
  "zonas francas", "proyecto de ley", "reglamento", "impuesto", "tributari", "arancel", "exportacion",
  "financiamiento", "us$", "rd$", "pib", "inflacion", "espectro", "fusion", "adquisicion", "infraestructura",
  "puerto", "aeropuerto", "ley de", "deuda",
];

/** Palabras débiles: hacen falta al menos dos para considerar la noticia relevante. */
export const WEAK_KEYWORDS: readonly string[] = [
  "ley", "sector", "empresa", "industria", "obra", "millones", "fiscal", "hacienda", "competencia",
  "telecomunicaciones", "tasa", "tasas", "crecimiento", "turismo", "construccion", "energia", "credito",
  "contrato", "mipyme", "mercado",
];

/**
 * Devuelve las coincidencias solo si la noticia es relevante (≥1 fuerte o ≥2 débiles); si no, [].
 * Filtro provisional por palabras clave (sin IA, B-011); se afina con uso real.
 */
export function matchKeywords(title: string, excerpt: string | null): string[] {
  const hay = fold(`${title} ${excerpt ?? ""}`);
  const strong = STRONG_KEYWORDS.filter((k) => hay.includes(fold(k)));
  const weak = WEAK_KEYWORDS.filter((k) => new RegExp(`\\b${fold(k)}`).test(hay));
  return strong.length > 0 || weak.length >= 2 ? [...strong, ...weak] : [];
}

export interface FetchedNews extends NewsItem {
  source_key: string;
  source_name: string;
  matched_keywords: string[];
}

export interface FeedReport {
  key: string;
  ok: boolean;
  items: number;
  relevant: number;
}

/** Lee los feeds uno a uno (el cliente serializa y limita). Devuelve solo lo relevante + un informe. */
export async function collectNews(
  client: PoliteClient,
  feeds: readonly NewsFeed[] = NEWS_FEEDS,
  maxPerFeed = 30,
): Promise<{ news: FetchedNews[]; report: FeedReport[] }> {
  const news: FetchedNews[] = [];
  const report: FeedReport[] = [];
  for (const f of feeds) {
    try {
      const res = await client.get(f.url, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
      if (!res.ok) throw new Error(String(res.status));
      const items = parseRss(await res.text()).slice(0, maxPerFeed);
      const relevant = items
        .map((i) => ({ ...i, source_key: f.key, source_name: f.name, matched_keywords: matchKeywords(i.title, i.excerpt) }))
        .filter((i) => i.matched_keywords.length > 0);
      news.push(...relevant);
      report.push({ key: f.key, ok: true, items: items.length, relevant: relevant.length });
    } catch {
      report.push({ key: f.key, ok: false, items: 0, relevant: 0 });
    }
  }
  return { news, report };
}
