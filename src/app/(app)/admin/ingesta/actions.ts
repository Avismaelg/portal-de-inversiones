"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { fetchProcesos, mapProceso, DGCP_HOST, DGCP_MAX_PER_MINUTE } from "@/lib/ingest/dgcp";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { todayInRD } from "@/lib/format";

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
  } catch {
    return { ok: false, message: "DGCP no respondió correctamente. Reintenta más tarde." };
  }
  if (!rows.length) return { ok: false, message: "DGCP no devolvió procesos en esa ventana." };

  const payload = rows.slice(0, MAX_ROWS).map((r) => ({
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
    trust_layer: "confirmed" as const,
    publication_status: "published" as const,
  }));
  const { error } = await supabase
    .from("public_tenders")
    .upsert(payload, { onConflict: "source_id,external_id" });
  if (error) return { ok: false, message: "No se pudieron guardar las licitaciones." };
  revalidatePath("/licitaciones");
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `Cargadas ${payload.length} licitaciones (de ${total} en la ventana; ${rejected} elementos inválidos).`,
  };
}
