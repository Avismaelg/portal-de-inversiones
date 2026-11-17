"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRole } from "@/lib/auth";
import { PoliteClient } from "@/lib/ingest/polite-client";
import { MEDIA_HOSTS, NEWS_HOSTS, collectMedia, collectNews, findMediaMatch } from "@/lib/ingest/news";
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
    allowedHosts: [...NEWS_HOSTS, ...MEDIA_HOSTS],
    clientName: "AviTech-Ingest/0.1",
    contact: process.env.INGEST_CONTACT?.trim() || "contacto-pendiente",
    maxPerMinute: 30,
  });
  const { news, report } = await collectNews(client);
  const failed = report.filter((r) => !r.ok).map((r) => r.key);
  const supabase = await createClient();
  const logRun = (ok: boolean, result: Record<string, unknown>, err: string | null) =>
    supabase.rpc("record_ingestion_run", { p_source_code: "news_primary_rss", p_ok: ok, p_payload: { feeds: report.length }, p_result: result, p_error: err });
  if (!news.length) {
    await logRun(failed.length < report.length, { report, relevant: 0 }, failed.length ? `feeds con error: ${failed.join(", ")}` : null);
    return { ok: false, message: `No se obtuvieron noticias relevantes.${failed.length ? ` Fallaron: ${failed.join(", ")}.` : ""}` };
  }
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
  if (error) {
    await logRun(false, { report }, `upsert: ${error.message}`);
    return { ok: false, message: "No se pudieron guardar las noticias." };
  }
  // Ventaja temporal: ¿cuándo salió lo mismo en prensa? (solo se guarda nombre, enlace y hora del medio)
  const media = await collectMedia(client);
  let matched = 0;
  if (media.length) {
    const results = await Promise.all(
      news.map(async (n) => {
        const m = findMediaMatch(n.title, n.published_at, media);
        if (!m) return false;
        const { error: e } = await supabase
          .from("news_items")
          .update({ media_source: m.source_name, media_url: m.url, media_published_at: m.published_at })
          .eq("url", n.url)
          .is("media_url", null);
        return !e;
      }),
    );
    matched = results.filter(Boolean).length;
  }
  const fresh = data?.length ?? 0;
  await logRun(true, { report, relevant: news.length, new: fresh, media_items: media.length, media_matched: matched }, failed.length ? `feeds con error: ${failed.join(", ")}` : null);
  await supabase.rpc("record_ingestion_run", {
    p_source_code: "media_reference_rss", p_ok: media.length > 0, p_payload: {}, p_result: { items: media.length, matched },
    p_error: media.length ? null : "sin elementos de medios",
  });
  revalidatePath("/noticias");
  return {
    ok: true,
    message: `${fresh} noticia(s) nueva(s) de ${news.length} relevantes; ${matched} con cobertura en prensa localizada.${failed.length ? ` Feeds con error: ${failed.join(", ")}.` : ""}`,
  };
}
