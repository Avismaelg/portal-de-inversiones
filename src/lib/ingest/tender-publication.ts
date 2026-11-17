/**
 * Regla de publicación de licitaciones cargadas desde DGCP (regla `dgcp_auto_publish_v1`).
 * La base (migración 16) exige gestor autenticado para publicar y nota de revisión si hay banderas;
 * esta función decide el estado que la carga propone, sin deshacer decisiones humanas.
 *
 * - Registro nuevo limpio (valida el esquema y sin banderas de calidad) -> publicado por quien carga.
 * - Registro nuevo con banderas -> en revisión.
 * - Ya publicado y sus banderas no cambiaron -> se mantiene (no se repite la revisión).
 * - Ya publicado pero ahora tiene banderas distintas -> vuelve a revisión (cambió en la fuente).
 * - En revisión/borrador que ahora está limpio -> publicado.
 * - Rechazado -> se mantiene rechazado (decisión humana).
 */
export type PublicationStatus = "draft" | "in_review" | "published" | "rejected";

export interface ExistingTender {
  publication_status: PublicationStatus;
  data_quality_flags: string[];
}

export const AUTO_PUBLISH_RULE = "dgcp_auto_publish_v1";

const sameFlags = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

export function decidePublication(existing: ExistingTender | undefined, flags: string[]): PublicationStatus {
  const clean = flags.length === 0;
  if (!existing) return clean ? "published" : "in_review";
  switch (existing.publication_status) {
    case "rejected":
      return "rejected";
    case "published":
      return clean || sameFlags(existing.data_quality_flags, flags) ? "published" : "in_review";
    default:
      return clean ? "published" : existing.publication_status === "draft" ? "in_review" : existing.publication_status;
  }
}
