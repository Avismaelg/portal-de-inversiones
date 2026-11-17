"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { fetchArticleText } from "@/lib/ingest/article";
import { NEWS_HOSTS } from "@/lib/ingest/news";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { locateQuote, QUOTE_MAX, QUOTE_MIN } from "@/lib/quote";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type StepResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESULTS = ["verified", "partially_verified", "disputed", "unverifiable"] as const;

async function guard(formData: FormData): Promise<{ id: string } | StepResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Solo un gestor de oportunidades puede hacer este paso." };
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, message: "Oportunidad no válida." };
  return { id };
}

function refresh(id: string) {
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath("/oportunidades");
}

/** Paso 1: un gestor deja constancia de la verificación del acontecimiento de origen (revisión humana). */
export async function verifyEvent(_p: StepResult | null, formData: FormData): Promise<StepResult> {
  const g = await guard(formData);
  if ("ok" in g) return g;
  const result = String(formData.get("result") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  if (!(RESULTS as readonly string[]).includes(result)) return { ok: false, message: "Elige el resultado de la verificación." };
  if (reason.length < 15) return { ok: false, message: "Explica cómo lo verificaste (al menos 15 caracteres): qué fuente oficial consultaste." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, message: "Sesión no válida." };
  const { data: o } = await supabase.from("investment_opportunities").select("originating_event_id").eq("id", g.id).maybeSingle();
  if (!o) return { ok: false, message: "Oportunidad no encontrada." };
  const { error } = await supabase.from("verification_records").insert({
    subject_type: "event",
    subject_id: o.originating_event_id,
    check_type: "human_review",
    result,
    reasons: [reason],
    reviewer_id: userId,
  });
  if (error) return { ok: false, message: "La base rechazó la verificación." };
  refresh(g.id);
  return { ok: true, message: "Verificación registrada." };
}

/**
 * Paso 2: cita literal. El servidor lee AHORA el texto de la fuente (no se guarda), comprueba que la cita
 * aparece tal cual y solo entonces la registra con la función de la base, que exige gestor.
 */
export async function addEvidence(_p: StepResult | null, formData: FormData): Promise<StepResult> {
  const g = await guard(formData);
  if ("ok" in g) return g;
  const quote = String(formData.get("quote") ?? "");
  if (quote.trim().length < QUOTE_MIN || quote.length > QUOTE_MAX * 2) {
    return { ok: false, message: `La cita debe tener entre ${QUOTE_MIN} y ${QUOTE_MAX} caracteres.` };
  }
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("investment_opportunities")
    .select("economic_events(source_documents(canonical_url))")
    .eq("id", g.id)
    .maybeSingle();
  const ev = o ? (Array.isArray(o.economic_events) ? o.economic_events[0] : o.economic_events) : null;
  const doc = ev ? (Array.isArray(ev.source_documents) ? ev.source_documents[0] : ev.source_documents) : null;
  const url = (doc as { canonical_url: string } | null)?.canonical_url;
  if (!url) return { ok: false, message: "La oportunidad no tiene documento fuente." };

  let text: string | null = null;
  try {
    const http = new PoliteClient({
      allowedHosts: NEWS_HOSTS,
      clientName: "AviTech-Ingest/0.1",
      contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
      maxPerMinute: 10,
      maxRetries: 1,
    });
    text = await fetchArticleText(http, url);
  } catch {
    return { ok: false, message: "El documento fuente no está en una fuente permitida." };
  }
  if (!text) return { ok: false, message: "No se pudo leer el texto de la fuente ahora. Intenta más tarde." };
  const m = locateQuote(quote, text);
  if (!m) {
    return {
      ok: false,
      message: "La cita no aparece literalmente en la fuente. Cópiala exacta (mismas tildes y mayúsculas); se revisan los primeros 8.000 caracteres.",
    };
  }
  const { error } = await supabase.rpc("add_literal_evidence", {
    p_opportunity_id: g.id,
    p_quote: m.quote,
    p_char_start: m.start,
    p_char_end: m.end,
  });
  if (error) {
    return { ok: false, message: error.message.includes("duplicate") ? "Esa cita ya está registrada." : "La base rechazó la evidencia." };
  }
  refresh(g.id);
  return { ok: true, message: "Cita verificada literalmente y registrada." };
}

/** Paso 3: decisión del gestor. La base vuelve a exigir acontecimiento verificado, evidencia literal y confianza. */
export async function decideOpportunity(_p: StepResult | null, formData: FormData): Promise<StepResult> {
  const g = await guard(formData);
  if ("ok" in g) return g;
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);
  if (decision !== "publish" && decision !== "reject") return { ok: false, message: "Decisión inválida." };
  if (notes.length < 10) return { ok: false, message: "Escribe una nota de revisión de al menos 10 caracteres." };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, message: "Sesión no válida." };

  if (decision === "reject") {
    const { error } = await supabase.from("investment_opportunities").update({ publication_status: "rejected", review_notes: notes }).eq("id", g.id);
    if (error) return { ok: false, message: "La base rechazó la decisión." };
    refresh(g.id);
    return { ok: true, message: "Oportunidad rechazada con nota." };
  }

  const confidence = Number(formData.get("confidence"));
  const explanation = String(formData.get("confidence_explanation") ?? "").trim().slice(0, 1000);
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) return { ok: false, message: "La confianza debe ser un entero de 0 a 100." };
  if (explanation.length < 15) return { ok: false, message: "Explica la confianza (al menos 15 caracteres)." };

  const { error } = await supabase
    .from("investment_opportunities")
    .update({
      publication_status: "published",
      reviewed_by: userId,
      review_notes: notes,
      confidence,
      confidence_explanation: explanation,
    })
    .eq("id", g.id);
  if (error) {
    const m = error.message;
    const why = m.includes("originating event")
      ? "el acontecimiento no está verificado"
      : m.includes("evidence")
        ? "falta una cita verificada literalmente"
        : m.includes("confidence")
          ? "falta la confianza"
          : "no cumple los requisitos";
    return { ok: false, message: `La base no permitió publicar: ${why}.` };
  }
  refresh(g.id);
  return { ok: true, message: "Oportunidad publicada." };
}
