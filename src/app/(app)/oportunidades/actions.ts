"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { OPPORTUNITY_TYPES } from "@/lib/opportunity-types";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type ProposeResult = { ok: boolean; message: string; id?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Convierte una idea del análisis IA en oportunidad BORRADOR (la base exige verificación para publicar). */
export async function proposeOpportunity(_p: ProposeResult | null, formData: FormData): Promise<ProposeResult> {
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede proponer oportunidades." };
  const newsId = String(formData.get("news_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!UUID.test(newsId)) return { ok: false, message: "Noticia no válida." };
  if (!(type in OPPORTUNITY_TYPES)) return { ok: false, message: "Elige un tipo de oportunidad." };
  if (title.length < 5 || description.length < 10) return { ok: false, message: "Completa título y descripción." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("propose_opportunity_from_news", {
    p_news_id: newsId,
    p_type: type,
    p_title: title,
    p_description: description,
    p_risks: String(formData.get("risks") ?? ""),
    p_next_step: String(formData.get("next_step") ?? ""),
  });
  if (error) {
    return { ok: false, message: error.message.includes("dedup") ? "Ya existe una oportunidad con ese título para esta noticia." : "No se pudo crear la oportunidad." };
  }
  revalidatePath("/oportunidades");
  return { ok: true, message: "Oportunidad creada en borrador.", id: String(data) };
}
