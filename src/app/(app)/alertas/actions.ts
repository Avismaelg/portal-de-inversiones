"use server";

import { revalidatePath } from "next/cache";
import { todayInRD } from "@/lib/format";
import { buildMacroNotifications, buildPulse, parseFxThreshold, type MacroAlertPref, type ObservationRow, type RateRow } from "@/lib/macro";
import { buildNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export type AlertResult = { ok: boolean; message: string };

/** Alerta sobre los datos del BCRD: dato nuevo, cambio de dirección y/o movimiento diario del dólar. */
export async function createMacroAlert(_prev: AlertResult | null, formData: FormData): Promise<AlertResult> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const macro_new_data = formData.get("new_data") === "on";
  const macro_trend_change = formData.get("trend") === "on";
  const fx = parseFxThreshold(formData.get("fx_pct"));
  if (fx === "invalid") return { ok: false, message: "El umbral del dólar debe ser un porcentaje mayor que 0 y hasta 20." };
  if (!name) return { ok: false, message: "Indica un nombre para la alerta." };
  if (!macro_new_data && !macro_trend_change && fx === null) {
    return { ok: false, message: "Marca al menos una condición o escribe un umbral para el dólar." };
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, message: "Sesión no válida." };
  const { error } = await supabase.from("user_alert_preferences").insert({
    user_id: userId, name, keywords: [], channels: ["in_app"], macro_new_data, macro_trend_change, fx_daily_move_pct: fx,
  });
  if (error) {
    return { ok: false, message: error.code === "23505" ? "Ya tienes una alerta con ese nombre." : "No se pudo guardar la alerta." };
  }
  const n = await syncMyNotifications();
  revalidatePath("/alertas");
  return { ok: true, message: `Alerta creada. ${n} notificación(es) nueva(s).` };
}

export async function createAlert(_prev: AlertResult | null, formData: FormData): Promise<AlertResult> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const keywords = [
    ...new Set(
      String(formData.get("keywords") ?? "")
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length >= 3 && k.length <= 40),
    ),
  ].slice(0, 10);
  if (!name || !keywords.length) return { ok: false, message: "Indica un nombre y al menos una palabra de 3 letras o más." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, message: "Sesión no válida." };
  const { error } = await supabase
    .from("user_alert_preferences")
    .insert({ user_id: userId, name, keywords, channels: ["in_app"] });
  if (error) return { ok: false, message: "No se pudo guardar la alerta." };
  const n = await syncMyNotifications();
  revalidatePath("/alertas");
  return { ok: true, message: `Alerta creada. ${n} notificación(es) nueva(s).` };
}

export async function deleteAlert(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  await supabase.from("user_alert_preferences").delete().eq("id", id);
  revalidatePath("/alertas");
}

/**
 * Genera las notificaciones del usuario actual a partir de sus alertas activas: noticias de los últimos
 * 7 días y licitaciones vigentes. La base deduplica por entidad y solo escribe para el propio usuario.
 */
export async function syncMyNotifications(): Promise<number> {
  const supabase = await createClient();
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 86400000).toISOString();
  const { data: prefRows, error: prefErr } = await supabase
    .from("user_alert_preferences")
    .select("id,name,keywords,macro_new_data,macro_trend_change,fx_daily_move_pct")
    .eq("is_paused", false);
  if (prefErr || !prefRows?.length) return 0;
  const keywordPrefs = prefRows
    .map((p) => ({ id: p.id, name: p.name, keywords: (p.keywords ?? []) as string[] }))
    .filter((p) => p.keywords.length);
  const macroPrefs: MacroAlertPref[] = prefRows
    .filter((p) => p.macro_new_data || p.macro_trend_change || p.fx_daily_move_pct !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      macro_new_data: !!p.macro_new_data,
      macro_trend_change: !!p.macro_trend_change,
      fx_daily_move_pct: p.fx_daily_move_pct === null ? null : Number(p.fx_daily_move_pct),
    }));
  const [news, tenders, obs, fx] = await Promise.all([
    keywordPrefs.length
      ? supabase.from("news_items").select("id,title,excerpt").gte("detected_at", since).limit(300)
      : Promise.resolve({ data: [] as { id: string; title: string; excerpt: string | null }[] }),
    keywordPrefs.length
      ? supabase.from("public_tenders").select("id,title,description").eq("status", "open").gte("deadline_at", now.toISOString()).limit(500)
      : Promise.resolve({ data: [] as { id: string; title: string; description: string | null }[] }),
    macroPrefs.length
      ? supabase
          .from("macro_observations")
          .select("id,series_key,group_name,category_path,indicator,value,as_of,unit,first_seen_at,last_seen_at,data_quality_flags")
          .order("first_seen_at", { ascending: false })
          .limit(3000)
      : Promise.resolve({ data: [] as ObservationRow[] }),
    macroPrefs.length
      ? supabase.from("exchange_rates").select("id,rate_date,buying,selling,first_seen_at").gte("rate_date", todayInRD(-14)).order("rate_date", { ascending: false })
      : Promise.resolve({ data: [] as RateRow[] }),
  ]);
  const items = [
    ...buildNotifications(keywordPrefs, news.data ?? [], tenders.data ?? []),
    ...buildMacroNotifications(macroPrefs, buildPulse((obs.data ?? []) as ObservationRow[], now), (fx.data ?? []) as RateRow[], now),
  ].slice(0, 200);
  if (!items.length) return 0;
  const { data, error } = await supabase.rpc("push_my_notifications", { p_items: items });
  if (error) return 0;
  if (Number(data) > 0) revalidatePath("/alertas");
  return Number(data) || 0;
}

export async function markNotificationRead(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/alertas");
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  revalidatePath("/alertas");
}
