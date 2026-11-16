"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = ["tender", "instrument"] as const;
type WatchType = (typeof TYPES)[number];

/** Alterna el seguimiento de un elemento en la lista por defecto del usuario (RLS: solo la suya). */
export async function toggleWatch(formData: FormData): Promise<void> {
  const type = String(formData.get("type")) as WatchType;
  const id = String(formData.get("id"));
  if (!TYPES.includes(type) || !UUID.test(id)) return;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return;
  const existing = await supabase
    .from("watchlists")
    .select("id")
    .eq("user_id", userId)
    .eq("list_name", "Mi lista")
    .eq("entity_type", type)
    .eq("entity_id", id)
    .maybeSingle();
  if (existing.data) {
    await supabase.from("watchlists").delete().eq("id", existing.data.id);
  } else {
    await supabase
      .from("watchlists")
      .insert({ user_id: userId, list_name: "Mi lista", entity_type: type, entity_id: id });
  }
  revalidatePath("/watchlist");
  revalidatePath("/licitaciones");
  revalidatePath("/instrumentos");
}
