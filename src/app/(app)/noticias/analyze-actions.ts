"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { createLlmClient, resolveModel } from "@/lib/ai/anthropic-client";
import { analyzeNews } from "@/lib/ai/analyze-news";
import { PROMPT_VERSION, SCHEMA_VERSION, estimateCostUsd, monthlyBudgetUsd } from "@/lib/ai/pricing";
import { fetchArticleText } from "@/lib/ingest/article";
import { NEWS_HOSTS } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type AnalyzeResult = { ok: boolean; message: string };

/**
 * Genera el análisis de impacto y escenarios de UNA noticia con la IA configurada (lo dispara una persona con rol de
 * análisis; sin lotes ni cron). Lee el texto de la fuente solo para este análisis y no lo guarda.
 */
export async function analyzeNewsItem(_prev: AnalyzeResult | null, formData: FormData): Promise<AnalyzeResult> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { ok: false, message: "Noticia no válida." };
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede generar análisis." };
  const client = createLlmClient();
  if (!client) return { ok: false, message: "Falta la clave de IA (AI_API_KEY) en .env.local." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const { data: n, error } = await supabase
    .from("news_items")
    .select("id,url,title,excerpt,source_name,published_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !n) return { ok: false, message: "No se encontró la noticia." };

  // Tope mensual de gasto (G0 #4). Si no se puede leer el gasto, no se arriesga una llamada.
  const budget = monthlyBudgetUsd(process.env.AI_MONTHLY_BUDGET_USD);
  const { data: spent, error: spendErr } = await supabase.rpc("ai_spend_month");
  if (spendErr || spent === null) return { ok: false, message: "No se pudo comprobar el gasto de IA del mes." };
  if (Number(spent) >= budget) {
    return { ok: false, message: `Se alcanzó el tope mensual de IA (US$${budget}). Ajusta AI_MONTHLY_BUDGET_USD si corresponde.` };
  }

  const http = new PoliteClient({
    allowedHosts: NEWS_HOSTS,
    clientName: "AviTech-Ingest/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 10,
    maxRetries: 1,
  });
  const body = await fetchArticleText(http, n.url);

  const model = resolveModel("AI_MODEL_ANALYSIS");
  const started = Date.now();
  const out = await analyzeNews(client, { ...n, body }, model);
  const latency = Date.now() - started;
  const record = (status: "succeeded" | "failed" | "blocked" | "schema_invalid", inTok: number, outTok: number, err: string | null) =>
    supabase.rpc("record_ai_run", {
      p_task: "news_impact",
      p_subject_type: "news",
      p_subject_id: id,
      p_model: model,
      p_prompt_version: PROMPT_VERSION,
      p_schema_version: SCHEMA_VERSION,
      p_input_tokens: inTok,
      p_output_tokens: outTok,
      p_cost_usd: estimateCostUsd(model, inTok, outTok),
      p_latency_ms: latency,
      p_status: status,
      p_error: err,
    });
  if (!out.ok) {
    await record(out.reason === "refusal" ? "blocked" : out.reason === "invalid" ? "schema_invalid" : "failed", 0, 0, out.reason);
    const m = { refusal: "El modelo rechazó analizar este texto.", invalid: "El modelo no devolvió un formato válido.", error: "No se pudo contactar a la IA. Revisa la clave y vuelve a intentar." }[out.reason];
    return { ok: false, message: m };
  }
  const { analysis: a, quote_verified, used_full_text, input_tokens, output_tokens } = out.result;
  const { data: runId } = await record("succeeded", input_tokens, output_tokens, null);
  const { error: e2 } = await supabase.from("news_analyses").upsert(
    {
      news_id: id,
      model,
      summary: a.summary,
      impact_direction: a.impact_direction,
      horizon: a.horizon,
      sectors: a.sectors,
      risks: a.risks,
      scenarios: a.scenarios,
      value_chain: a.value_chain,
      opportunities: a.opportunities,
      watch_next: a.watch_next,
      confidence: a.confidence,
      confidence_explanation: a.confidence_explanation,
      evidence_quote: a.evidence_quote,
      quote_verified,
      used_full_text,
      input_tokens,
      output_tokens,
      created_by: userId ?? null,
      ai_run_id: (runId as string | null) ?? null,
    },
    { onConflict: "news_id" },
  );
  if (e2) return { ok: false, message: "No se pudo guardar el análisis." };
  revalidatePath("/noticias");
  revalidatePath(`/noticias/${id}`);
  return { ok: true, message: `Análisis generado (costo estimado US$${estimateCostUsd(model, input_tokens, output_tokens).toFixed(4)}).` };
}
