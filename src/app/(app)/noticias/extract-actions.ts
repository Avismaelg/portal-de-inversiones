"use server";

import { revalidatePath } from "next/cache";
import { createLlmClient, resolveModel } from "@/lib/ai/anthropic-client";
import { extractNews, EXTRACTION_PROMPT_VERSION, EXTRACTION_SCHEMA_VERSION } from "@/lib/ai/extraction";
import { estimateCostUsd, monthlyBudgetUsd } from "@/lib/ai/pricing";
import { getCurrentRole } from "@/lib/auth";
import { fetchArticleText } from "@/lib/ingest/article";
import { NEWS_HOSTS } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type ExtractActionResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ejecuta el agente de extracción sobre UNA noticia (lo dispara una persona con rol de análisis).
 * El texto de la fuente se usa solo en memoria; no se guarda. El resultado filtrado se registra en
 * `ai_analysis_runs` (staff-only) para que la ficha lo muestre y quede trazado el costo.
 */
export async function extractNewsData(_prev: ExtractActionResult | null, formData: FormData): Promise<ExtractActionResult> {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, message: "Noticia no válida." };
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede ejecutar la extracción." };

  const llm = createLlmClient();
  if (!llm) return { ok: false, message: "Falta la clave de IA (AI_API_KEY) en .env.local." };

  const supabase = await createClient();
  const { data: news, error } = await supabase
    .from("news_items")
    .select("id,url,title,excerpt,source_name,published_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !news) return { ok: false, message: "No se encontró la noticia." };

  const budget = monthlyBudgetUsd(process.env.AI_MONTHLY_BUDGET_USD);
  const { data: spent, error: spendErr } = await supabase.rpc("ai_spend_month");
  if (spendErr || spent === null) return { ok: false, message: "No se pudo comprobar el gasto de IA del mes." };

  const model = resolveModel("AI_MODEL_EXTRACTION");
  let latency = 0;

  const record = (
    status: "succeeded" | "failed" | "schema_invalid" | "blocked" | "budget_exceeded",
    inputTokens: number,
    outputTokens: number,
    reason: string | null,
    output: unknown | null,
  ) =>
    supabase.rpc("record_extraction_run", {
      p_subject_id: id,
      p_model: model,
      p_prompt_version: EXTRACTION_PROMPT_VERSION,
      p_schema_version: EXTRACTION_SCHEMA_VERSION,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_cost_usd: estimateCostUsd(model, inputTokens, outputTokens),
      p_latency_ms: latency,
      p_status: status,
      p_error: reason,
      p_output: output,
    });

  if (Number(spent) >= budget) {
    await record("budget_exceeded", 0, 0, "monthly budget reached", null);
    return {
      ok: false,
      message: `Se alcanzó el tope mensual de IA (US$${budget}). Ajusta AI_MONTHLY_BUDGET_USD si corresponde.`,
    };
  }

  const http = new PoliteClient({
    allowedHosts: NEWS_HOSTS,
    clientName: "AviTech-Ingest/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 10,
    maxRetries: 1,
  });
  const body = await fetchArticleText(http, news.url);

  const started = Date.now();
  const out = await extractNews(llm, { ...news, body }, { model, documentId: crypto.randomUUID() });
  latency = Date.now() - started;

  if (!out.ok) {
    await record(out.reason === "refusal" ? "blocked" : out.reason === "invalid" ? "schema_invalid" : "failed", 0, 0, out.reason, null);
    const message = {
      refusal: "El modelo rechazó extraer datos de este texto.",
      invalid: "El modelo no devolvió un formato válido.",
      error: "No se pudo contactar a la IA. Revisa la clave y vuelve a intentar.",
    }[out.reason];
    return { ok: false, message };
  }

  const { result } = out;
  const { error: saveErr } = await record(
    "succeeded",
    result.input_tokens,
    result.output_tokens,
    null,
    {
      extraction: result.extraction,
      injection_suspected: result.injection_suspected,
      used_full_text: result.used_full_text,
      truncated: result.truncated,
    },
  );
  if (saveErr) return { ok: false, message: "La extracción se generó, pero no se pudo guardar el resultado." };

  revalidatePath(`/noticias/${id}`);
  const { evidence_proposed, evidence_verified, items_dropped } = result.extraction.stats;
  return {
    ok: true,
    message:
      `Extracción completada: ${evidence_verified} de ${evidence_proposed} citas verificadas literalmente` +
      (items_dropped ? `; ${items_dropped} dato(s) descartado(s) por falta de respaldo` : "") +
      ` (costo estimado US$${estimateCostUsd(model, result.input_tokens, result.output_tokens).toFixed(4)}).`,
  };
}
