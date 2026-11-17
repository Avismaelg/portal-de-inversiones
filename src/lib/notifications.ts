/** Construye las notificaciones in-app a partir de las alertas del usuario (sin escribir nada). */
import { matchesAlert } from "@/lib/radar";

export interface AlertPref {
  id: string;
  name: string;
  keywords: string[];
}

export interface NewsLite {
  id: string;
  title: string;
  excerpt: string | null;
}

export interface TenderLite {
  id: string;
  title: string;
  description: string | null;
}

export interface NotificationItem {
  entity_type: "news" | "tender";
  entity_id: string;
  preference_id: string;
  title: string;
  reason: string;
  priority: number;
}

/**
 * Una notificación por entidad (aunque coincidan varias alertas): la base deduplica por entidad.
 * Prioridad 2 si coincide más de una alerta; 3 en otro caso (1 = máxima).
 */
export function buildNotifications(prefs: readonly AlertPref[], news: readonly NewsLite[], tenders: readonly TenderLite[]): NotificationItem[] {
  const out: NotificationItem[] = [];
  const add = (type: "news" | "tender", id: string, title: string, text: string | null) => {
    const hits = prefs
      .map((p) => ({ p, k: matchesAlert(title, text, p.keywords) }))
      .filter((h) => h.k.length > 0);
    if (!hits.length) return;
    out.push({
      entity_type: type,
      entity_id: id,
      preference_id: hits[0].p.id,
      title,
      reason: `Alerta «${hits.map((h) => h.p.name).join("», «")}»: ${[...new Set(hits.flatMap((h) => h.k))].join(", ")}`,
      priority: hits.length > 1 ? 2 : 3,
    });
  };
  for (const n of news) add("news", n.id, n.title, n.excerpt);
  for (const t of tenders) add("tender", t.id, t.title, t.description);
  return out.slice(0, 200);
}
