import { createClient } from "@/lib/supabase/server";

/** Rol del usuario actual según la tabla `users` (RLS: solo su propia fila). */
export async function getCurrentRole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return null;
  const { data } = await supabase.from("users").select("role,is_active").eq("id", id).maybeSingle();
  return data?.is_active ? (data.role as string) : null;
}
