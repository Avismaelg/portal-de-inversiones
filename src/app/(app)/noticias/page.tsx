import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NewsCard } from "@/components/news-card";
import { TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { NEWS_FEEDS, leadMinutes } from "@/lib/ingest/news";
import { DIRECTION } from "@/lib/news-format";
import { scoreNews } from "@/lib/priority";
import { canPublishRole } from "@/lib/review-rules";
import { ilikePattern } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import { LoadNewsButton } from "./load-button";

export const metadata: Metadata = { title: "Noticias" };

const PAGE_SIZE = 25;
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function fmtLead(min: number) {
  const a = Math.abs(min);
  const t = a >= 1440 ? `${Math.round(a / 1440)} día(s)` : a >= 60 ? `${Math.floor(a / 60)} h ${a % 60} min` : `${a} min`;
  return t;
}


async function Feed({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const source = one(sp.fuente);
  const q = one(sp.q).trim().slice(0, 80);
  const page = Math.max(1, Number(one(sp.pagina)) || 1);
  const order = one(sp.orden) === "recientes" ? "recientes" : "prioridad";
  const role = await getCurrentRole();
  const mayLoad = canPublishRole(role);

  const supabase = await createClient();
  let query = supabase
    .from("news_items")
    .select("id,source_key,source_name,url,title,excerpt,published_at,detected_at,matched_keywords,trust_layer,media_source,media_url,media_published_at", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(300);
  if (NEWS_FEEDS.some((f) => f.key === source)) query = query.eq("source_key", source);
  const pattern = ilikePattern(q);
  if (pattern) query = query.ilike("search_plain", pattern);
  const [{ data: all, error }, cmp, prefs] = await Promise.all([
    query,
    supabase.from("news_items").select("published_at,media_published_at").not("media_url", "is", null).not("published_at", "is", null),
    supabase.from("user_alert_preferences").select("name,keywords").eq("is_paused", false),
  ]);
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar las noticias.</p>;
  const now = new Date();
  const alerts = (prefs.data ?? []).map((a) => ({ name: a.name, keywords: (a.keywords ?? []) as string[] }));
  const ranked = (all ?? []).map((n) => ({
    ...n,
    pr: scoreNews({ ...n, matched_keywords: (n.matched_keywords ?? []) as string[] }, alerts, now),
  }));
  if (order === "prioridad") ranked.sort((a, b) => b.pr.score - a.pr.score);
  const count = ranked.length;
  const data = ranked.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const leads = (cmp.data ?? []).map((r) => leadMinutes(r.published_at as string, r.media_published_at as string));
  const first = leads.filter((l) => l > 0).length;
  const sorted = [...leads].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const { data: analyses } = data?.length
    ? await supabase
        .from("news_analyses")
        .select("news_id,summary,impact_direction,confidence")
        .in("news_id", data.map((n) => n.id))
    : { data: [] };
  const byNews = new Map((analyses ?? []).map((a) => [a.news_id, a]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (source) u.set("fuente", source);
    u.set("orden", order);
    u.set("pagina", String(p));
    return `/noticias?${u}`;
  };

  return (
    <>
      {mayLoad && <LoadNewsButton />}
      <section aria-labelledby="ventaja" className="card mb-6">
        <h2 id="ventaja" className="text-sm font-semibold">Ventaja sobre la prensa</h2>
        {leads.length ? (
          <p className="mt-1 text-sm">
            En {leads.length} noticia(s) con cobertura de prensa localizada, la fuente primaria salió antes en{" "}
            <strong>{first}</strong> ({Math.round((first / leads.length) * 100)} %). Mediana:{" "}
            <strong>{median! >= 0 ? `${fmtLead(median!)} antes` : `${fmtLead(median!)} después`}</strong>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Aún no hay coincidencias con prensa para calcular la ventaja.</p>
        )}
        <p className="mt-1 text-xs text-muted">
          Compara con Diario Libre (economía), El Dinero y Dominican Today por similitud de titular. Solo se ve lo que
          esos feeds publican (≈20–30 últimas notas): «sin cobertura localizada» no prueba que la prensa no la haya publicado.
        </p>
      </section>
      <form method="get" role="search" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Buscar en titular o extracto</label>
          <input id="q" name="q" defaultValue={q} className="w-64 field" />
        </div>
        <div>
          <label htmlFor="fuente" className="mb-1 block text-sm font-medium">Fuente</label>
          <select id="fuente" name="fuente" defaultValue={source} className="field">
            <option value="">Todas</option>
            {NEWS_FEEDS.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="orden" className="mb-1 block text-sm font-medium">Ordenar por</label>
          <select id="orden" name="orden" defaultValue={order} className="field">
            <option value="prioridad">Prioridad para ti</option>
            <option value="recientes">Más recientes</option>
          </select>
        </div>
        <button className="btn">Filtrar</button>
        {(q || source) && <Link href="/noticias" className="py-2 text-sm text-primary underline">Quitar filtros</Link>}
      </form>
      {!data?.length ? (
        <p className="empty-state">
          {q || source
            ? "No hay resultados con estos filtros."
            : "Aún no hay noticias. Un usuario con rol de gestión puede pulsar «Buscar noticias nuevas»."}
        </p>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">{count} noticia(s) · página {page} de {pages}</p>
          <ul className="space-y-3">
            {data.map((n) => (
              <li key={n.id}>
                <NewsCard n={n} pr={n.pr} now={now} analyzed={byNews.has(n.id)}>
                  {byNews.get(n.id) && (
                    <div className="mt-3 rounded-lg border-l-4 border-primary bg-primary/5 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <TrustBadge layer="ai_analysis" />
                        <span className="text-muted">
                          Impacto {DIRECTION[byNews.get(n.id)!.impact_direction]} · confianza {byNews.get(n.id)!.confidence} %
                        </span>
                      </div>
                      <p className="mt-1">{byNews.get(n.id)!.summary}</p>
                    </div>
                  )}
                </NewsCard>
              </li>
            ))}
          </ul>
          <nav aria-label="Paginación" className="mt-6 flex gap-4 text-sm">
            {page > 1 && <Link href={link(page - 1)} className="text-primary underline">← Anterior</Link>}
            {page < pages && <Link href={link(page + 1)} className="text-primary underline">Siguiente →</Link>}
          </nav>
        </>
      )}
    </>
  );
}

export default function NoticiasPage(props: PageProps<"/noticias">) {
  return (
    <>
      <p className="eyebrow">Fuentes primarias</p>
      <h1 className="page-title">Noticias antes de que sean noticia</h1>
      <p className="page-lead">
        Comunicados de instituciones y reguladores. Son <strong>señales</strong>, no hechos verificados: léelas en su
        fuente. Se muestra solo titular, extracto breve y enlace. Estado legal de las fuentes pendiente de revisión;
        sin carácter de asesoría de inversión.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Feed searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
