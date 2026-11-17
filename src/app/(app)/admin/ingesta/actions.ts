"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { fetchProcesos, mapProceso, DGCP_HOST, DGCP_MAX_PER_MINUTE } from "@/lib/ingest/dgcp";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { todayInRD } from "@/lib/format";
import { AUTO_PUBLISH_RULE, decidePublication, type PublicationStatus } from "@/lib/ingest/tender-publication";

export type LoadResult = { ok: boolean; message: string };

const MAX_ROWS = 300;

/**
 * Carga manual asistida (T-ING-06): una persona con rol de gestión dispara una muestra pequeña de
 * procesos recientes de DGCP. No activa la fuente ni la automatiza: sigue `pending_review`.
 */
export async function loadDgcpSample(_p: LoadResult | null, formData: FormData): Promise<LoadResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede cargar datos." };
  const days = Math.min(Math.max(Number(formData.get("days") ?? 3) || 3, 1), 14);
  const supabase = await createClient();

  const { data: source } = await supabase.from("sources").select("id").eq("code", "dgcp_ocds").maybeSingle();
  if (!source) return { ok: false, message: "No existe la fuente DGCP en la base." };

  const client = new PoliteClient({
    allowedHosts: [DGCP_HOST],
    clientName: "AviTech-Ingest/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: DGCP_MAX_PER_MINUTE,
  });

  const rows: ReturnType<typeof mapProceso>[] = [];
  let rejected = 0;
  let total = 0;
  try {
    for await (const page of fetchProcesos(client, {
      startdate: todayInRD(-days),
      enddate: todayInRD(),
      limit: MAX_ROWS,
      maxPages: 1,
    })) {
      total = page.totalResults;
      rejected += page.rejected.length;
      rows.push(...page.items.map(mapProceso));
    }
  } catch (e) {
    await supabase.rpc("record_ingestion_run", {
      p_source_code: "dgcp_ocds", p_ok: false, p_payload: { days }, p_result: {}, p_error: e instanceof Error ? e.message : "error",
    });
    return { ok: false, message: "DGCP no respondió correctamente. Reintenta más tarde." };
  }
  if (!rows.length) {
    await supabase.rpc("record_ingestion_run", {
      p_source_code: "dgcp_ocds", p_ok: true, p_payload: { days }, p_result: { total, rejected, loaded: 0 }, p_error: null,
    });
    return { ok: false, message: "DGCP no devolvió procesos en esa ventana." };
  }

  const batch = rows.slice(0, MAX_ROWS);
  // Estado actual de los que ya existen: la carga no deshace decisiones humanas (regla dgcp_auto_publish_v1).
  const { data: existingRows, error: exErr } = await supabase
    .from("public_tenders")
    .select("external_id,publication_status,data_quality_flags")
    .eq("source_id", source.id)
    .in("external_id", batch.map((r) => r.external_id));
  if (exErr) return { ok: false, message: "No se pudo leer el estado actual de las licitaciones." };
  const existing = new Map(
    (existingRows ?? []).map((e) => [e.external_id, { publication_status: e.publication_status as PublicationStatus, data_quality_flags: e.data_quality_flags ?? [] }]),
  );
  const extractedAt = new Date().toISOString();

  const payload = batch.map((r) => ({
    source_id: source.id,
    external_id: r.external_id,
    process_code: r.process_code,
    title: r.title,
    description: [r.buyer_name ? `Unidad de compra: ${r.buyer_name}` : null, r.description].filter(Boolean).join(" · ") || null,
    procurement_method: r.procurement_method,
    status: r.status,
    published_at: r.published_at,
    deadline_at: r.deadline_at,
    timezone_assumed: r.timezone_assumed,
    budget_amount: r.budget_amount,
    budget_currency: r.budget_currency,
    data_quality_flags: r.data_quality_flags,
    source_url: r.source_url,
    extracted_at: extractedAt,
    validation: { rule: AUTO_PUBLISH_RULE, schema: "ok", flags: r.data_quality_flags },
    // Dato tal como lo publica la fuente oficial; la publicación en AviTech la controla la base (migración 16).
    trust_layer: "confirmed" as const,
    publication_status: decidePublication(existing.get(r.external_id), r.data_quality_flags),
  }));
  const { error } = await supabase
    .from("public_tenders")
    .upsert(payload, { onConflict: "source_id,external_id" });
  if (error) {
    await supabase.rpc("record_ingestion_run", {
      p_source_code: "dgcp_ocds", p_ok: false, p_payload: { days }, p_result: { total, rejected }, p_error: `upsert: ${error.message}`,
    });
    return { ok: false, message: "No se pudieron guardar las licitaciones." };
  }

  // Publicados que vuelven a revisión: la nota de revisión anterior ya no aplica.
  const demoted = payload
    .filter((p) => p.publication_status === "in_review" && existing.get(p.external_id)?.publication_status === "published")
    .map((p) => p.external_id);
  if (demoted.length) {
    await supabase.from("public_tenders").update({ review_notes: null }).eq("source_id", source.id).in("external_id", demoted);
  }
  const published = payload.filter((p) => p.publication_status === "published").length;
  const inReview = payload.filter((p) => p.publication_status === "in_review").length;
  await supabase.rpc("record_ingestion_run", {
    p_source_code: "dgcp_ocds",
    p_ok: true,
    p_payload: { days, limit: MAX_ROWS },
    p_result: { total, rejected, loaded: payload.length, published, in_review: inReview, demoted: demoted.length },
    p_error: null,
  });
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `Cargadas ${payload.length} licitaciones (de ${total} en la ventana; ${rejected} elementos inválidos): ${published} publicadas, ${inReview} en revisión por estado no reconocido.`,
  };
}
