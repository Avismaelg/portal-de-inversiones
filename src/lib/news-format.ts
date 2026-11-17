/** Utilidades de presentación para noticias. */

export const DIRECTION: Record<string, string> = {
  positive: "positivo",
  negative: "negativo",
  neutral: "neutral",
  mixed: "mixto",
  unclear: "poco claro",
};

export const HORIZON: Record<string, string> = { short: "corto plazo", medium: "mediano plazo", long: "largo plazo", unclear: "poco claro" };

export const CHAIN_KIND: Record<string, string> = {
  raw_material: "Materia prima",
  contractor: "Contratista",
  supplier: "Proveedor",
  financial: "Financiero",
  regulatory: "Regulatorio",
  other: "Otro",
};

/** «hace 3 h», «hace 2 días». */
export function timeAgo(iso: string | null, now: Date): string {
  if (!iso) return "sin fecha";
  const min = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d < 30 ? `hace ${d} día${d === 1 ? "" : "s"}` : new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "America/Santo_Domingo" }).format(new Date(iso));
}

/** Iniciales para el avatar de la fuente («Hacienda y Economía» → «HE»). */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w));
  return (words[0]?.[0] ?? "?").concat(words[1]?.[0] ?? words[0]?.[1] ?? "").toUpperCase();
}
