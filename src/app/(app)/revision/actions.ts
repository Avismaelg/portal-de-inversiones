"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { canPublishRole, evidenceBlockers } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult = { ok: boolean; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(formData: FormData): Promise<{ id: string } | ReviewResult> {
  if (!canPublishRole(await getCurrentRole())) {
    return { ok: false, message: "Tu rol no puede publicar ni rechazar." };
  }
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, message: "Identificador inválido." };
  return { id };
}

/** Publica un instrumento y sus subastas, solo si TODA la evidencia está verificada literalmente. */
export async function publishInstrument(_p: ReviewResult | null, formData: FormData): Promise<ReviewResult> {
  const auth = await authorize(formData);
  if (!("id" in auth)) return auth;
  const supabase = await createClient();

  const { data: inst } = await supabase
    .from("financial_instruments")
    .select("id,name,publication_status")
    .eq("id", auth.id)
    .maybeSingle();
  if (!inst) return { ok: false, message: "Instrumento no encontrado." };
  if (inst.publication_status === "published") return { ok: false, message: "Ya está publicado." };

  const { data: auctions } = await supabase
    .from("instrument_auctions")
    .select("id,auction_date")
    .eq("instrument_id", auth.id);
  const { data: instEv } = await supabase.from("evidence").select("literal_verified").eq("instrument_id", auth.id);
  const ids = (auctions ?? []).map((a) => a.id);
  const { data: aucEv } = ids.length
    ? await supabase.from("evidence").select("literal_verified,auction_id").in("auction_id", ids)
    : { data: [] as { literal_verified: boolean; auction_id: string }[] };

  const blockers = [
    ...evidenceBlockers(`Instrumento ${inst.name}`, instEv ?? []),
    ...(auctions ?? []).flatMap((a) =>
      evidenceBlockers(`Subasta ${a.auction_date}`, (aucEv ?? []).filter((e) => e.auction_id === a.id)),
    ),
  ];
  if (blockers.length) return { ok: false, message: `No se puede publicar. ${blockers.join("; ")}.` };

  // Primero el instrumento: sin él, las subastas publicadas quedarían huérfanas para el lector.
  const u1 = await supabase.from("financial_instruments").update({ publication_status: "published" }).eq("id", auth.id);
  if (u1.error) return { ok: false, message: "No se pudo publicar el instrumento." };
  if (ids.length) {
    const u2 = await supabase.from("instrument_auctions").update({ publication_status: "published" }).in("id", ids);
    if (u2.error) return { ok: false, message: "Instrumento publicado, pero fallaron las subastas. Reintenta." };
  }
  revalidatePath("/revision");
  revalidatePath("/instrumentos");
  return { ok: true, message: `${inst.name} publicado con ${ids.length} subasta(s).` };
}

export async function rejectInstrument(_p: ReviewResult | null, formData: FormData): Promise<ReviewResult> {
  const auth = await authorize(formData);
  if (!("id" in auth)) return auth;
  const supabase = await createClient();
  const { data: inst } = await supabase
    .from("financial_instruments")
    .select("publication_status")
    .eq("id", auth.id)
    .maybeSingle();
  if (!inst) return { ok: false, message: "Instrumento no encontrado." };
  if (inst.publication_status === "published") {
    return { ok: false, message: "Un registro publicado no se rechaza aquí; hay que despublicarlo con su motivo." };
  }
  const r = await supabase.from("financial_instruments").update({ publication_status: "rejected" }).eq("id", auth.id);
  if (r.error) return { ok: false, message: "No se pudo rechazar." };
  await supabase.from("instrument_auctions").update({ publication_status: "rejected" }).eq("instrument_id", auth.id);
  revalidatePath("/revision");
  return { ok: true, message: "Rechazado." };
}
