"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import {
  BCRD_MACRO_GROUPS,
  BcrdIpNotAllowedError,
  type BcrdMacroGroup,
  createBcrdClient,
  fetchHistoricoTasas,
  fetchMacro,
  type MacroIndicator,
} from "@/lib/ingest/bcrd";
import { createIpv4Fetch } from "@/lib/ingest/ipv4-fetch";
import { observationKeyOf, seriesKeyOf } from "@/lib/macro";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { todayInRD } from "@/lib/format";
import type { LoadResult } from "./actions";

const SOURCE = "bcrd_api";
const FX_WINDOW_DAYS = 45;

/**
 * Carga manual asistida del BCRD (G0 #5): 5 llamadas a la API (4 grupos macro + histórico de tasa
 * de cambio). La fuente sigue `pending_review` y no se activa como conector automático.
 */
export async function loadBcrdData(): Promise<LoadResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede cargar datos." };
  const token = process.env.BCRD_API_TOKEN?.trim();
  if (!token) return { ok: false, message: "Falta BCRD_API_TOKEN en la configuración del servidor." };
  const supabase = await createClient();
  const { data: source } = await supabase.from("sources").select("id").eq("code", SOURCE).maybeSingle();
  if (!source) return { ok: false, message: "No existe la fuente BCRD en la base (migración 23)." };

  const client = createBcrdClient({
    clientName: "AviTech-Ingest/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    fetchImpl: createIpv4Fetch(),
  });
  const fail = async (msg: string, payload: Record<string, unknown> = {}) => {
    await supabase.rpc("record_ingestion_run", { p_source_code: SOURCE, p_ok: false, p_payload: payload, p_result: {}, p_error: msg });
  };

  let indicators: MacroIndicator[] = [];
  let rates;
  const fromDate = todayInRD(-FX_WINDOW_DAYS);
  const toDate = todayInRD(1);
  try {
    for (const g of Object.keys(BCRD_MACRO_GROUPS) as BcrdMacroGroup[]) {
      indicators = indicators.concat(await fetchMacro(client, token, g));
    }
    rates = await fetchHistoricoTasas(client, token, { fromDate, toDate, maxResultCount: 100 });
  } catch (e) {
    if (e instanceof BcrdIpNotAllowedError) {
      await fail(`ip_not_allowed:${e.sourceIp ?? "?"}`);
      return {
        ok: false,
        message: `El BCRD rechazó la IP ${e.sourceIp ?? "de este servidor"}. Regístrala en «Restricciones de IP» de la consola del BCRD y vuelve a intentar.`,
      };
    }
    await fail(e instanceof Error ? e.message : "error");
    return { ok: false, message: "El BCRD no respondió correctamente. Reintenta más tarde." };
  }

  const now = new Date().toISOString();
  // Variables macro: una fila por valor nuevo; las ya vistas solo actualizan last_seen_at.
  const macroRows = indicators.map((i) => ({
    source_id: source.id,
    series_key: seriesKeyOf(i),
    group_name: i.group,
    category_path: i.path,
    indicator: i.indicator,
    value: i.value,
    as_of: i.as_of,
    observation_key: observationKeyOf(i),
    data_quality_flags: i.data_quality_flags,
    trust_layer: "confirmed" as const,
    last_seen_at: now,
  }));
  const keys = macroRows.map((r) => r.observation_key);
  const { data: seen, error: seenErr } = await supabase
    .from("macro_observations")
    .select("observation_key")
    .eq("source_id", source.id)
    .in("observation_key", keys);
  if (seenErr) return { ok: false, message: "No se pudo leer el estado actual de los datos macro." };
  const seenKeys = new Set((seen ?? []).map((s) => s.observation_key));
  const fresh = macroRows.filter((r) => !seenKeys.has(r.observation_key));
  if (fresh.length) {
    const { error } = await supabase.from("macro_observations").insert(fresh);
    if (error) {
      await fail(`insert macro: ${error.message}`);
      return { ok: false, message: "No se pudieron guardar los datos macro." };
    }
  }
  if (seenKeys.size) {
    await supabase
      .from("macro_observations")
      .update({ last_seen_at: now })
      .eq("source_id", source.id)
      .in("observation_key", [...seenKeys]);
  }

  // Tasa de cambio: una fila por día; si el BCRD corrige un día ya guardado, se cuenta como revisión.
  const { data: prevRates, error: prErr } = await supabase
    .from("exchange_rates")
    .select("rate_date,buying,selling")
    .eq("source_id", source.id)
    .gte("rate_date", fromDate);
  if (prErr) return { ok: false, message: "No se pudo leer la tasa de cambio guardada." };
  const prevByDate = new Map((prevRates ?? []).map((r) => [r.rate_date, r]));
  let newDays = 0;
  let revised = 0;
  for (const r of rates.items) {
    const p = prevByDate.get(r.rate_date);
    if (!p) newDays++;
    else if (Number(p.buying) !== r.buying || Number(p.selling) !== r.selling) revised++;
  }
  if (rates.items.length) {
    const { error } = await supabase.from("exchange_rates").upsert(
      rates.items.map((r) => ({
        source_id: source.id,
        currency_id: r.currency_id ?? 1,
        rate_date: r.rate_date,
        buying: r.buying,
        selling: r.selling,
        external_id: r.external_id,
        last_seen_at: now,
      })),
      { onConflict: "source_id,currency_id,rate_date" },
    );
    if (error) {
      await fail(`upsert fx: ${error.message}`);
      return { ok: false, message: "No se pudo guardar la tasa de cambio." };
    }
  }

  const result = {
    indicators: indicators.length,
    new_values: fresh.length,
    fx_days: rates.items.length,
    fx_new_days: newDays,
    fx_revised: revised,
    fx_rejected: rates.rejected.length,
    fx_total_api: rates.totalCount,
    api_calls: 5,
  };
  await supabase.rpc("record_ingestion_run", {
    p_source_code: SOURCE, p_ok: true, p_payload: { fromDate, toDate }, p_result: result, p_error: null,
  });
  revalidatePath("/macro");
  revalidatePath("/dashboard");
  const partial = rates.totalCount > rates.items.length + rates.rejected.length ? " (el histórico tenía más días que una página)" : "";
  return {
    ok: true,
    message: `BCRD: ${indicators.length} indicadores (${fresh.length} valores nuevos) y ${rates.items.length} días de tasa de cambio (${newDays} nuevos, ${revised} corregidos)${partial}. 5 llamadas de la cuota diaria.`,
  };
}
