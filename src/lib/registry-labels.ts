/** Etiquetas de proyectos y permisos (sin dependencias de servidor: se usan también en formularios cliente). */

export const PROJECT_STATUS: Record<string, string> = {
  announced: "Anunciado",
  permit_applied: "Permiso solicitado",
  permit_approved: "Permiso aprobado",
  under_construction: "En construcción",
  operating: "En operación",
  suspended: "Suspendido",
  cancelled: "Cancelado",
  unknown: "No disponible",
};

export const PERMIT_TYPE: Record<string, string> = {
  environmental: "Ambiental",
  energy_concession: "Concesión de energía",
  tourism: "Turismo",
  construction: "Construcción",
  industrial: "Industrial",
  regulatory_concession: "Concesión regulatoria",
  other: "Otro",
};

export const PERMIT_STATUS: Record<string, string> = {
  requested: "Solicitado",
  under_review: "En evaluación",
  approved: "Aprobado",
  denied: "Denegado",
  expired: "Vencido",
  revoked: "Revocado",
  unknown: "No disponible",
};
