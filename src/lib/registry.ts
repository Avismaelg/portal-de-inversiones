/**
 * Reglas puras de la carga manual de proyectos y permisos (P1-05, migración 25).
 * «Permiso solicitado» no es «aprobado»: los estados que afirman una aprobación exigen documento oficial.
 */
import { createHash } from "node:crypto";
import { PROJECT_STATUS } from "./registry-labels";

export { PERMIT_STATUS, PERMIT_TYPE, PROJECT_STATUS } from "./registry-labels";

/** Estados de proyecto que afirman una aprobación: requieren documento oficial (CHECK de la base). */
export const PROJECT_STATUS_NEEDS_OFFICIAL = new Set(["permit_approved", "under_construction", "operating"]);

/** Clave de deduplicación: SHA-256 del nombre normalizado (sin tildes, minúsculas, espacios simples). */
export function projectDedupKey(name: string): string {
  const norm = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`project:${norm}`).digest("hex");
}

export function permitDedupKey(projectId: string, type: string, fileNumber: string | null, docUrl: string): string {
  return createHash("sha256").update(`permit:${projectId}:${type}:${fileNumber ?? ""}:${docUrl}`).digest("hex");
}

const OFFICIAL_HOST = /(^|\.)(gob|gov)\.do$/i;

export interface DocInput {
  url: string;
  title: string | null;
  published_on: string | null;
}

/** Valida el documento antes de llamar a la base (la base vuelve a validar). */
export function parseDoc(raw: { url: unknown; title: unknown; date: unknown }, today: string): DocInput | string {
  const url = String(raw.url ?? "").trim();
  if (!url) return "Falta el enlace al documento oficial.";
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "El enlace del documento no es válido.";
  }
  if (u.protocol !== "https:") return "El documento debe abrirse con https.";
  if (!OFFICIAL_HOST.test(u.hostname)) return "El documento debe estar en un sitio oficial del Estado (.gob.do o .gov.do).";
  const title = String(raw.title ?? "").trim().slice(0, 300) || null;
  const date = String(raw.date ?? "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "La fecha del documento no es válida.";
  if (date && date > today) return "La fecha del documento no puede ser futura.";
  return { url, title, published_on: date || null };
}

export interface ProjectInput {
  name: string;
  description: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
}

export function parseProject(raw: Record<string, unknown>): ProjectInput | string {
  const name = String(raw.name ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (name.length < 3) return "Indica el nombre del proyecto (3 caracteres o más).";
  const status = String(raw.status ?? "");
  if (!(status in PROJECT_STATUS)) return "Estado no válido.";
  const description = String(raw.description ?? "").trim().slice(0, 2000) || null;
  const amountRaw = String(raw.amount ?? "").trim().replace(/,/g, "");
  const currency = String(raw.currency ?? "").trim().toUpperCase() || null;
  let amount: number | null = null;
  if (amountRaw) {
    amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount < 0) return "El monto debe ser un número positivo.";
    if (!currency || !/^[A-Z]{3}$/.test(currency)) return "Indica la moneda del monto (código de 3 letras, p. ej. DOP o USD).";
  }
  return { name, description, status, amount, currency: amount === null ? null : currency };
}

/** Traduce los errores de la base a mensajes comprensibles; nunca muestra el SQL. */
export function registryErrorMessage(message: string | undefined): string {
  const m = message ?? "";
  if (/official domain/.test(m)) return "El documento debe estar en un sitio oficial del Estado (.gob.do o .gov.do).";
  if (/must be https/.test(m)) return "El documento debe abrirse con https.";
  if (/cannot be in the future/.test(m)) return "La fecha del documento no puede ser futura.";
  if (/approval_needs_document|approved_needs_document/.test(m)) return "Ese estado afirma una aprobación: adjunta el documento oficial que la respalda.";
  if (/requires an authenticated manager/.test(m)) return "Solo un gestor puede publicar.";
  if (/requires review_notes/.test(m)) return "Escribe una nota de revisión para publicar.";
  if (/only staff/.test(m)) return "Tu rol no puede registrar documentos.";
  if (/duplicate key|unique/i.test(m)) return "Ya existe un registro con esos datos.";
  return "No se pudo guardar. Revisa los datos e inténtalo de nuevo.";
}
