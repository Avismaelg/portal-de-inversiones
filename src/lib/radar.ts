import { fold } from "@/lib/ingest/news";

export interface SignalLike {
  published_at: string | null;
  matched_keywords: string[];
}

export interface Trend {
  keyword: string;
  recent: number;
  previous: number;
  /** recent − previous (positivo = tema en alza). */
  delta: number;
}

const DAY = 24 * 3600 * 1000;

/** Temas (palabras clave) más frecuentes en los últimos `days` días frente a los `days` anteriores. */
export function trendingKeywords(items: readonly SignalLike[], now: Date, days = 7): Trend[] {
  const t = now.getTime();
  const recent = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const i of items) {
    if (!i.published_at) continue;
    const age = t - new Date(i.published_at).getTime();
    const bucket = age >= 0 && age < days * DAY ? recent : age >= days * DAY && age < 2 * days * DAY ? previous : null;
    if (!bucket) continue;
    for (const k of new Set(i.matched_keywords)) bucket.set(k, (bucket.get(k) ?? 0) + 1);
  }
  return [...recent.entries()]
    .map(([keyword, r]) => ({ keyword, recent: r, previous: previous.get(keyword) ?? 0, delta: r - (previous.get(keyword) ?? 0) }))
    .sort((a, b) => b.delta - a.delta || b.recent - a.recent || a.keyword.localeCompare(b.keyword));
}

/** ¿La noticia contiene alguna de las palabras de la alerta? (sin tildes ni mayúsculas) */
export function matchesAlert(title: string, excerpt: string | null, keywords: readonly string[]): string[] {
  const hay = fold(`${title} ${excerpt ?? ""}`);
  return keywords.map((k) => fold(k.trim())).filter((k) => k.length >= 3 && hay.includes(k));
}
