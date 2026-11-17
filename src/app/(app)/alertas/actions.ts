"use server";

import { revalidatePath } from "next/cache";
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
  revalidatePath("/alertas");
  return { ok: true, message: "Alerta creada." };
}

export async function deleteAlert(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  await supabase.from("user_alert_preferences").delete().eq("id", id);
  revalidatePath("/alertas");
}
