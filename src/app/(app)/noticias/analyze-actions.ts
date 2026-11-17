"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { analyzeNews, createAnthropic, DEFAULT_MODEL } from "@/lib/ai/analyze-news";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type AnalyzeResult = { ok: boolean; message: string };

/** Analiza el impacto de UNA noticia con Claude (una persona con rol de análisis lo dispara; sin lotes ni cron). */
export async function analyzeNewsItem(_prev: AnalyzeResult | null, formData: FormData): Promise<AnalyzeResult> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { ok: false, message: "Noticia no válida." };
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede generar análisis." };
  const client = createAnthropic();
  if (!client) return { ok: false, message: "Falta la clave de IA (AI_API_KEY) en .env.local." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: n, error } = await supabase
    .from("news_items")
    .select("id,title,excerpt,source_name,published_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !n) return { ok: false, message: "No se encontró la noticia." };

  const model = process.env.AI_MODEL_ANALYSIS?.trim() || DEFAULT_MODEL;
  const out = await analyzeNews(client, n, model);
  if (!out.ok) {
    const m = { refusal: "El modelo rechazó analizar este texto.", invalid: "El modelo no devolvió un formato válido.", error: "No se pudo contactar a la IA. Revisa la clave y vuelve a intentar." }[out.reason];
    return { ok: false, message: m };
  }
  const { analysis: a, quote_verified, input_tokens, output_tokens } = out.result;
  const { error: e2 } = await supabase.from("news_analyses").upsert(
    {
      news_id: id,
      model,
      summary: a.summary,
      impact_direction: a.impact_direction,
      horizon: a.horizon,
      sectors: a.sectors,
      risks: a.risks,
      confidence: a.confidence,
      confidence_explanation: a.confidence_explanation,
      evidence_quote: a.evidence_quote,
      quote_verified,
      input_tokens,
      output_tokens,
      created_by: userId ?? null,
    },
    { onConflict: "news_id" },
  );
  if (e2) return { ok: false, message: "No se pudo guardar el análisis." };
  revalidatePath("/noticias");
  return { ok: true, message: "Análisis generado." };
}
