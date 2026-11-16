const NA = "No disponible";

export function formatDate(value: string | null | undefined): string {
  if (!value) return NA;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return NA;
  return new Intl.DateTimeFormat("es-DO", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return NA;
  return `${new Intl.NumberFormat("es-DO", { maximumFractionDigits: 4 }).format(value)} %`;
}

export function formatMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined) return NA;
  return new Intl.NumberFormat("es-DO", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export const INSTRUMENT_TYPES: Record<string, string> = {
  central_bank_note: "Nota del Banco Central",
  central_bank_bill: "Letra del Banco Central",
  treasury_bond: "Bono del Tesoro",
  treasury_bill: "Letra del Tesoro",
  corporate_bond: "Bono corporativo",
  other_fixed_income: "Otra renta fija",
};

export const PUBLICATION: Record<string, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  published: "Publicado",
  rejected: "Rechazado",
};

export const TRUST: Record<string, string> = {
  confirmed: "Confirmado",
  ai_analysis: "Análisis IA",
  inference: "Inferencia",
};

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de República Dominicana, más `days` días. */
export function todayInRD(days = 0): string {
  const base = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(new Date());
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
