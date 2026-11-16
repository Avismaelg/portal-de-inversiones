/** Reglas puras de publicación (RN-06: toda cifra con cita verificada literalmente). */

export interface EvidenceLite {
  literal_verified: boolean;
}

export type Role = "viewer" | "analyst" | "opportunity_manager" | "org_admin" | "platform_admin";

const PUBLISHERS: readonly Role[] = ["opportunity_manager", "org_admin", "platform_admin"];

export function canPublishRole(role: string | null | undefined): boolean {
  return PUBLISHERS.includes(role as Role);
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "analyst" || canPublishRole(role);
}

/** Motivos por los que un conjunto de evidencia NO permite publicar ([] = listo). */
export function evidenceBlockers(label: string, evidence: EvidenceLite[]): string[] {
  if (evidence.length === 0) return [`${label}: sin evidencia vinculada`];
  const bad = evidence.filter((e) => !e.literal_verified).length;
  return bad > 0 ? [`${label}: ${bad} cita(s) sin verificar literalmente`] : [];
}
