"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLlmClient, resolveModel } from "@/lib/ai/anthropic-client";
import {
  BRIEF_PROMPT_VERSION,
  BRIEF_SCHEMA_VERSION,
  MAX_BRIEF_SOURCES,
  StoredBriefSchema,
  generateBrief,
  type BriefSource,
  type StoredBrief,
} from "@/lib/ai/pattern-brief";
import { estimateCostUsd, monthlyBudgetUsd } from "@/lib/ai/pricing";
import { getCurrentRole } from "@/lib/auth";
import { fold } from "@/lib/ingest/news";
import { fetchArticleText } from "@/lib/ingest/article";
import { NEWS_HOSTS } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { todayInRD } from "@/lib/format";
import { canPublishRole, isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type BriefActionResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FAILURE: Record<string, string> = {
  refusal: "El modelo rechazó generar la nota con estas noticias.",
  invalid: "El modelo no devolvió el formato esperado. Inténtalo de nuevo o cambia el tema.",
  error: "No se pudo contactar a la IA. Revisa la clave y vuelve a intentar.",
  unverifiable: "No quedaron hechos con cita literal suficiente. No se publica una nota sin respaldo.",
  no_patterns: "Las noticias no muestran un patrón apoyado en dos fuentes distintas. Prueba otro tema o un periodo más amplio.",
  unsafe: "La salida contenía consejo de inversión o una promesa de rendimiento; se descartó completa.",
};

/** El modelo se elige con AI_MODEL_BRIEF, luego AI_MODEL_ANALYSIS y, si no, el de por defecto (o AI_MODEL_OPENCODE en pruebas). */
function briefModel(): string {
  return resolveModel("AI_MODEL_BRIEF");
}

/**
 * Genera una nota de inteligencia multi-fuente. El texto de los artículos se lee solo en memoria;
 * la base guarda la nota filtrada y metadatos de las fuentes, nunca el texto completo.
 */
export async function generateBriefAction(
  _prev: BriefActionResult | null,
  formData: FormData,
): Promise<BriefActionResult> {
  const role = await getCurrentRole();
  if (!isStaffRole(role)) return { ok: false, message: "Tu rol no puede generar notas de inteligencia." };

  const topic = String(formData.get("topic") ?? "").trim().slice(0, 80);
  const daysRaw = Number(formData.get("days") ?? 30);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
  const scopeLabel = topic ? `Noticias sobre “${topic}”` : `Últimos ${days} días`;
  const start = todayInRD(-(days - 1));
  const end = todayInRD(0);
  const endExclusive = `${todayInRD(1)}T00:00:00-04:00`;

  const llm = createLlmClient();
  if (!llm) return { ok: false, message: "Falta la clave de IA (AI_API_KEY) en .env.local." };

  const supabase = await createClient();
  const budget = monthlyBudgetUsd(process.env.AI_MONTHLY_BUDGET_USD);
  const { data: spent, error: spendErr } = await supabase.rpc("ai_spend_month");
  if (spendErr || spent === null) return { ok: false, message: "No se pudo comprobar el gasto de IA del mes." };

  const model = briefModel();
  const record = (
    status: "failed" | "schema_invalid" | "blocked" | "budget_exceeded",
    reason: string,
    ids: string[],
    tokens: { input: number; output: number },
    latency: number,
    payload: unknown | null,
    usedModel: string = model,
  ) =>
    supabase.rpc("record_intelligence_brief", {
      p_scope_label: scopeLabel,
      p_period_start: start,
      p_period_end: end,
      p_headline: null,
      p_lead: null,
      p_input_news_ids: ids.length >= 2 ? ids : null,
      p_payload: payload,
      p_model: usedModel,
      p_prompt_version: BRIEF_PROMPT_VERSION,
      p_schema_version: BRIEF_SCHEMA_VERSION,
      p_input_tokens: tokens.input,
      p_output_tokens: tokens.output,
      p_cost_usd: estimateCostUsd(usedModel, tokens.input, tokens.output),
      p_latency_ms: latency,
      p_status: status,
      p_error: reason,
    });

  if (Number(spent) >= budget) {
    await record("budget_exceeded", "monthly budget reached", [], { input: 0, output: 0 }, 0, null);
    return {
      ok: false,
      message: `Se alcanzó el tope mensual de IA (US$${budget}). Ajusta AI_MONTHLY_BUDGET_USD si corresponde.`,
    };
  }

  // Se leen más noticias de las que se usan para poder filtrar por tema sin otra consulta.
  const { data: news, error: newsErr } = await supabase
    .from("news_items")
    .select("id,title,url,source_name,published_at,excerpt,matched_keywords")
    .gte("published_at", `${start}T00:00:00-04:00`)
    .lt("published_at", endExclusive)
    .order("published_at", { ascending: false })
    .limit(80);
  if (newsErr) return { ok: false, message: "No se pudieron leer las noticias del periodo." };

  const term = topic ? fold(topic) : "";
  const pool = (news ?? []).filter((n) => {
    if (!term) return true;
    return fold(`${n.title} ${n.excerpt ?? ""} ${(n.matched_keywords ?? []).join(" ")}`).includes(term);
  });
  if (pool.length < 2) {
    return {
      ok: false,
      message: topic
        ? `No hay al menos dos noticias sobre “${topic}” en los últimos ${days} días.`
        : `No hay al menos dos noticias en los últimos ${days} días.`,
    };
  }

  const selected = pool.slice(0, MAX_BRIEF_SOURCES);
  const http = new PoliteClient({
    allowedHosts: NEWS_HOSTS,
    clientName: "AviTech-Brief/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 10,
    maxRetries: 1,
  });

  const sources: BriefSource[] = [];
  for (const n of selected) {
    const body = await fetchArticleText(http, n.url);
    sources.push({
      id: n.id,
      title: n.title,
      url: n.url,
      source_name: n.source_name,
      published_at: n.published_at,
      excerpt: n.excerpt,
      body,
    });
  }
  const ids = sources.map((s) => s.id);

  const started = Date.now();
  const out = await generateBrief(llm, sources, { model, scope: { label: scopeLabel, start, end } });
  const latency = Date.now() - started;

  if (!out.ok) {
    const status = out.reason === "refusal" || out.reason === "unsafe" ? "blocked" : out.reason === "invalid" ? "schema_invalid" : "failed";
    await record(
      status,
      out.reason,
      ids,
      { input: out.usage?.input_tokens ?? 0, output: out.usage?.output_tokens ?? 0 },
      latency,
      null,
      out.model ?? model,
    );
    return { ok: false, message: FAILURE[out.reason] ?? "No se pudo generar la nota." };
  }

  const { model: usedModel, prompt_version, schema_version, input_tokens, output_tokens, ...brief } = out.result;
  let payload: StoredBrief;
  try {
    payload = StoredBriefSchema.parse({
      brief,
      sources: sources.map(({ id, title, url, source_name, published_at }) => ({ id, title, url, source_name, published_at })),
    });
  } catch {
    await record("schema_invalid", "stored_schema_invalid", ids, { input: input_tokens, output: output_tokens }, latency, null, usedModel);
    return { ok: false, message: "La nota se generó, pero no pasó la validación final y se descartó." };
  }

  const { data: briefId, error: saveErr } = await supabase.rpc("record_intelligence_brief", {
    p_scope_label: scopeLabel,
    p_period_start: start,
    p_period_end: end,
    p_headline: brief.headline,
    p_lead: brief.lead,
    p_input_news_ids: ids,
    p_payload: payload,
    p_model: usedModel,
    p_prompt_version: prompt_version,
    p_schema_version: schema_version,
    p_input_tokens: input_tokens,
    p_output_tokens: output_tokens,
    p_cost_usd: estimateCostUsd(usedModel, input_tokens, output_tokens),
    p_latency_ms: latency,
    p_status: "succeeded",
    p_error: null,
  });
  if (saveErr || !briefId) {
    return { ok: false, message: "La nota se generó, pero no se pudo guardar. Revisa que la migración 27 esté aplicada." };
  }

  revalidatePath("/reportes");
  redirect(`/reportes/${briefId}`);
}

/** Publica o rechaza una nota. La base exige gestor, nota y que siga en borrador. */
export async function reviewBriefAction(
  _prev: BriefActionResult | null,
  formData: FormData,
): Promise<BriefActionResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede publicar ni rechazar." };
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!UUID.test(id)) return { ok: false, message: "Identificador inválido." };
  if (decision !== "publish" && decision !== "reject") return { ok: false, message: "Decisión inválida." };
  if (note.length < 10) return { ok: false, message: "Escribe una nota de revisión de al menos 10 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_intelligence_brief", {
    p_id: id,
    p_decision: decision,
    p_note: note.slice(0, 500),
  });
  if (error) return { ok: false, message: "La base rechazó la decisión (requiere gestor, nota y borrador)." };

  revalidatePath("/reportes");
  revalidatePath(`/reportes/${id}`);
  return { ok: true, message: decision === "publish" ? "Nota publicada con tu revisión." : "Nota rechazada con tu revisión." };
}
