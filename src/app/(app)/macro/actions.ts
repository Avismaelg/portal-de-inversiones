"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { createAnthropic, DEFAULT_MODEL } from "@/lib/ai/analyze-news";
import { analyzeMacro, buildMacroSnapshot, MACRO_PROMPT_VERSION, MACRO_SCHEMA_VERSION } from "@/lib/ai/analyze-macro";
import { estimateCostUsd, monthlyBudgetUsd } from "@/lib/ai/pricing";
import { todayInRD } from "@/lib/format";
import { buildPulse, summarizeFx, type ObservationRow, type RateRow } from "@/lib/macro";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type MacroAnalyzeResult = { ok: boolean; message: string };

/** Análisis de impacto del pulso macro actual (lo dispara una persona con rol de análisis; sin lotes ni cron). */
export async function analyzeMacroPulse(): Promise<MacroAnalyzeResult> {
  if (!isStaffRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede generar análisis." };
  const client = createAnthropic();
  if (!client) return { ok: false, message: "Falta la clave de IA (AI_API_KEY) en .env.local." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  const [obs, fx] = await Promise.all([
    supabase
      .from("macro_observations")
      .select("id,series_key,group_name,category_path,indicator,value,as_of,unit,first_seen_at,last_seen_at,data_quality_flags")
      .order("first_seen_at", { ascending: false })
      .limit(3000),
    supabase.from("exchange_rates").select("rate_date,buying,selling").gte("rate_date", todayInRD(-30)),
  ]);
  if (obs.error || fx.error) return { ok: false, message: "No se pudieron leer los datos del BCRD." };
  const pulse = buildPulse((obs.data ?? []) as ObservationRow[], new Date());
  if (!pulse.length) return { ok: false, message: "Aún no hay datos del BCRD. Cárgalos primero en Carga de datos." };
  const snapshot = buildMacroSnapshot(pulse, summarizeFx((fx.data ?? []) as RateRow[]), todayInRD());

  // Tope mensual de gasto (G0 #4). Si no se puede leer el gasto, no se arriesga una llamada.
  const budget = monthlyBudgetUsd(process.env.AI_MONTHLY_BUDGET_USD);
  const { data: spent, error: spendErr } = await supabase.rpc("ai_spend_month");
  if (spendErr || spent === null) return { ok: false, message: "No se pudo comprobar el gasto de IA del mes." };
  if (Number(spent) >= budget) {
    return { ok: false, message: `Se alcanzó el tope mensual de IA (US$${budget}). Ajusta AI_MONTHLY_BUDGET_USD si corresponde.` };
  }

  const model = process.env.AI_MODEL_ANALYSIS?.trim() || DEFAULT_MODEL;
  const analysisId = crypto.randomUUID();
  const started = Date.now();
  const out = await analyzeMacro(client, snapshot, model);
  const latency = Date.now() - started;
  const record = (status: "succeeded" | "failed" | "blocked" | "schema_invalid", inTok: number, outTok: number, err: string | null) =>
    supabase.rpc("record_ai_run", {
      p_task: "macro_impact",
      p_subject_type: "macro",
      p_subject_id: analysisId,
      p_model: model,
      p_prompt_version: MACRO_PROMPT_VERSION,
      p_schema_version: MACRO_SCHEMA_VERSION,
      p_input_tokens: inTok,
      p_output_tokens: outTok,
      p_cost_usd: estimateCostUsd(model, inTok, outTok),
      p_latency_ms: latency,
      p_status: status,
      p_error: err,
    });
  if (!out.ok) {
    await record(out.reason === "refusal" ? "blocked" : out.reason === "invalid" ? "schema_invalid" : "failed", 0, 0, out.reason);
    const m = { refusal: "El modelo rechazó el análisis.", invalid: "El modelo no devolvió un formato válido.", error: "No se pudo contactar a la IA. Revisa la clave y vuelve a intentar." }[out.reason];
    return { ok: false, message: m };
  }
  const a = out.analysis;
  const { data: runId } = await record("succeeded", out.input_tokens, out.output_tokens, null);
  const { error } = await supabase.from("macro_analyses").insert({
    id: analysisId,
    model,
    snapshot,
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
    quote_verified: out.quote_verified,
    input_tokens: out.input_tokens,
    output_tokens: out.output_tokens,
    ai_run_id: (runId as string | null) ?? null,
    created_by: userId ?? null,
  });
  if (error) return { ok: false, message: "No se pudo guardar el análisis." };
  revalidatePath("/macro");
  return { ok: true, message: `Análisis generado (costo estimado US$${estimateCostUsd(model, out.input_tokens, out.output_tokens).toFixed(4)}).` };
}
