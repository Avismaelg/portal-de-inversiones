"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { NEWS_HOSTS, collectNews } from "@/lib/ingest/news";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export type NewsLoadResult = { ok: boolean; message: string };

/**
 * Carga manual asistida de noticias de fuentes primarias. Disparada por una persona con rol de gestión.
 * Conserva la primera hora de detección: si la URL ya existe no se toca (ignoreDuplicates).
 */
export async function loadNews(): Promise<NewsLoadResult> {
  if (!canPublishRole(await getCurrentRole())) return { ok: false, message: "Tu rol no puede cargar noticias." };
  const client = new PoliteClient({
    allowedHosts: NEWS_HOSTS,
    clientName: "AviTech-Ingest/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 30,
  });
  const { news, report } = await collectNews(client);
  const failed = report.filter((r) => !r.ok).map((r) => r.key);
  if (!news.length) {
    return { ok: false, message: `No se obtuvieron noticias relevantes.${failed.length ? ` Fallaron: ${failed.join(", ")}.` : ""}` };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_items")
    .upsert(
      news.map((n) => ({
        source_key: n.source_key,
        source_name: n.source_name,
        url: n.url,
        title: n.title,
        excerpt: n.excerpt,
        published_at: n.published_at,
        matched_keywords: n.matched_keywords,
        trust_layer: "inference" as const,
      })),
      { onConflict: "url", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { ok: false, message: "No se pudieron guardar las noticias." };
  revalidatePath("/noticias");
  const fresh = data?.length ?? 0;
  return {
    ok: true,
    message: `${fresh} noticia(s) nueva(s) de ${news.length} relevantes.${failed.length ? ` Feeds con error: ${failed.join(", ")}.` : ""}`,
  };
}
