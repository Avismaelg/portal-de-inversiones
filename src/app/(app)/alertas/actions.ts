"use server";

import { revalidatePath } from "next/cache";
import { buildNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export type AlertResult = { ok: boolean; message: string };

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
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [prefs, news, tenders] = await Promise.all([
    supabase.from("user_alert_preferences").select("id,name,keywords").eq("is_paused", false),
    supabase.from("news_items").select("id,title,excerpt").gte("detected_at", since).limit(300),
    supabase
      .from("public_tenders")
      .select("id,title,description")
      .eq("status", "open")
      .gte("deadline_at", new Date().toISOString())
      .limit(500),
  ]);
  if (prefs.error || !prefs.data?.length) return 0;
  const items = buildNotifications(
    prefs.data.map((p) => ({ id: p.id, name: p.name, keywords: (p.keywords ?? []) as string[] })),
    news.data ?? [],
    tenders.data ?? [],
  );
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
