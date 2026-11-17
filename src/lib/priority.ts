/**
 * Prioridad de una señal para un inversionista. Es una regla transparente (no un modelo): cada punto
 * tiene un motivo legible. No predice rendimientos; ordena la atención.
 */
import { STRONG_KEYWORDS, fold } from "@/lib/ingest/news";
import { matchesAlert } from "@/lib/radar";

export interface ScorableNews {
  title: string;
  excerpt: string | null;
  published_at: string | null;
  matched_keywords: string[];
  media_url: string | null;
}

export interface AlertLite {
  name: string;
  keywords: string[];
}

export interface Priority {
  score: number;
  reasons: string[];
  amounts: string[];
}

const STRONG = new Set(STRONG_KEYWORDS.map(fold));
const DAY = 24 * 3600 * 1000;

/** Montos tal como aparecen en el texto («US$119.5 millones», «RD$ 2,500 millones»). No se convierten ni se suman. */
export function extractAmounts(text: string): string[] {
  const re = /(?:US\$|USD|RD\$|DOP)\s?\d[\d.,]*(?:\s?(?:mil millones|millones|millón|billones|mil))?/gi;
  return [...new Set((text.match(re) ?? []).map((m) => m.replace(/\s+/g, " ").trim()))].slice(0, 3);
}

export function scoreNews(n: ScorableNews, alerts: readonly AlertLite[], now: Date): Priority {
  let score = 0;
  const reasons: string[] = [];

  const strong = n.matched_keywords.filter((k) => STRONG.has(fold(k)));
  const weak = n.matched_keywords.length - strong.length;
  if (strong.length) {
    score += Math.min(strong.length * 3, 9);
    reasons.push(`Tema de inversión: ${strong.slice(0, 3).join(", ")}`);
  }
  score += Math.min(weak, 3);

  const amounts = extractAmounts(`${n.title} ${n.excerpt ?? ""}`);
  if (amounts.length) {
    score += 3;
    reasons.push(`Menciona monto: ${amounts[0]}`);
  }

  const age = n.published_at ? now.getTime() - new Date(n.published_at).getTime() : null;
  if (age !== null && age >= 0) {
    if (age < DAY) score += 4;
    else if (age < 3 * DAY) score += 2;
    else if (age < 7 * DAY) score += 1;
  }

  if (!n.media_url && age !== null && age >= 0 && age < 3 * DAY) {
    score += 3;
    reasons.push("Aún sin cobertura de prensa localizada");
  }

  const hits = alerts.filter((a) => matchesAlert(n.title, n.excerpt, a.keywords).length > 0);
  if (hits.length) {
    score += Math.min(hits.length * 4, 8);
    reasons.push(`Coincide con tu alerta: ${hits.map((h) => h.name).join(", ")}`);
  }

  return { score, reasons, amounts };
}

export function priorityLabel(score: number): "Alta" | "Media" | "Baja" {
  return score >= 12 ? "Alta" : score >= 7 ? "Media" : "Baja";
}
