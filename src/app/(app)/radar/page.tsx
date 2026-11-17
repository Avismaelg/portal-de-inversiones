import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { trendingKeywords } from "@/lib/radar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Radar" };

async function Trends() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_items")
    .select("id,source_name,title,url,published_at,matched_keywords,media_url")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) return <p role="alert" className="text-danger">No se pudo cargar el radar.</p>;
  const items = (data ?? []).map((n) => ({ ...n, matched_keywords: (n.matched_keywords ?? []) as string[] }));
  if (!items.length) {
    return (
      <p className="empty-state">
        El radar se alimenta de las noticias.{" "}
        <Link href="/noticias" className="text-primary underline">Carga noticias</Link> para ver temas en alza.
      </p>
    );
  }
  const trends = trendingKeywords(items, new Date()).slice(0, 12);
  const quiet = items.filter((n) => !n.media_url).slice(0, 8);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="temas" className="card">
        <h2 id="temas" className="text-lg font-semibold">Temas en alza (7 días vs. 7 previos)</h2>
        {trends.length ? (
          <ul className="mt-3 divide-y divide-divider">
            {trends.map((t) => (
              <li key={t.keyword} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{t.keyword}</span>
                <span className="num text-muted">
                  {t.recent} ahora · {t.previous} antes{" "}
                  <span className={t.delta > 0 ? "font-semibold text-success" : t.delta < 0 ? "text-danger" : ""}>
                    ({t.delta > 0 ? "+" : ""}{t.delta})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No hay noticias en los últimos 7 días.</p>
        )}
        <p className="mt-3 text-xs text-muted">
          Conteo de coincidencias de palabras clave en titulares de fuentes primarias. Es un indicador de atención, no un análisis de impacto.
        </p>
      </section>
      <section aria-labelledby="poco" className="card">
        <h2 id="poco" className="text-lg font-semibold">Poco difundidas</h2>
        <p className="mt-1 text-xs text-muted">Señales recientes sin cobertura de prensa localizada en los feeds revisados.</p>
        <ul className="mt-3 space-y-3">
          {quiet.map((n) => (
            <li key={n.id}>
              <div className="flex items-center gap-2 text-xs text-muted">
                <TrustBadge layer="inference" />
                {n.source_name}
              </div>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary hover:underline">
                {n.title}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function RadarPage() {
  return (
    <>
      <p className="eyebrow">Radar</p>
      <h1 className="page-title">Qué se está moviendo antes que en la prensa</h1>
      <p className="page-lead">
        Temas que ganan frecuencia en fuentes primarias y señales que la prensa aún no recoge. Son señales (inferencia), no hechos verificados.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Trends />
      </Suspense>
    </>
  );
}
