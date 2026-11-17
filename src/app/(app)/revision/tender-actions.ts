"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type TenderReviewResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decisión humana sobre una licitación en revisión. La base (migración 16) vuelve a exigir gestor y
 * nota, y registra responsable y fecha; esta acción valida antes para dar un mensaje claro.
 */
export async function reviewTender(_p: TenderReviewResult | null, formData: FormData): Promise<TenderReviewResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede publicar ni rechazar." };
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!UUID.test(id)) return { ok: false, message: "Identificador inválido." };
  if (decision !== "publish" && decision !== "reject") return { ok: false, message: "Decisión inválida." };
  if (note.length < 10) return { ok: false, message: "Escribe una nota de revisión de al menos 10 caracteres." };

  const supabase = await createClient();
  const { data: t } = await supabase.from("public_tenders").select("publication_status").eq("id", id).maybeSingle();
  if (!t) return { ok: false, message: "Licitación no encontrada." };
  if (t.publication_status !== "in_review" && t.publication_status !== "draft") {
    return { ok: false, message: "Solo se revisan licitaciones en borrador o en revisión." };
  }
  const { error } = await supabase
    .from("public_tenders")
    .update({ publication_status: decision === "publish" ? "published" : "rejected", review_notes: note })
    .eq("id", id);
  if (error) return { ok: false, message: "La base rechazó la decisión (requiere gestor y nota)." };
  revalidatePath("/revision/licitaciones");
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
  return { ok: true, message: decision === "publish" ? "Publicada con nota de revisión." : "Rechazada con nota." };
}
