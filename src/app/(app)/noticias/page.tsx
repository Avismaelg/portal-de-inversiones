import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { NEWS_FEEDS, leadMinutes } from "@/lib/ingest/news";
import { canPublishRole } from "@/lib/review-rules";
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

const fmt = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v))
    : "Sin fecha";

async function Feed({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const source = one(sp.fuente);
  const q = one(sp.q).trim().slice(0, 80);
  const page = Math.max(1, Number(one(sp.pagina)) || 1);
  const mayLoad = canPublishRole(await getCurrentRole());

  const supabase = await createClient();
  let query = supabase
    .from("news_items")
    .select("id,source_key,source_name,url,title,excerpt,published_at,detected_at,matched_keywords,trust_layer,media_source,media_url,media_published_at", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (NEWS_FEEDS.some((f) => f.key === source)) query = query.eq("source_key", source);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const [{ data, count, error }, cmp] = await Promise.all([
    query,
    supabase.from("news_items").select("published_at,media_published_at").not("media_url", "is", null).not("published_at", "is", null),
  ]);
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar las noticias.</p>;
  const leads = (cmp.data ?? []).map((r) => leadMinutes(r.published_at as string, r.media_published_at as string));
  const first = leads.filter((l) => l > 0).length;
  const sorted = [...leads].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (source) u.set("fuente", source);
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
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Buscar en titulares</label>
          <input id="q" name="q" defaultValue={q} className="w-64 field" />
        </div>
        <div>
          <label htmlFor="fuente" className="mb-1 block text-sm font-medium">Fuente</label>
          <select id="fuente" name="fuente" defaultValue={source} className="field">
            <option value="">Todas</option>
            {NEWS_FEEDS.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
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
              <li key={n.id} className="rounded border border-dashed border-warning p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <TrustBadge layer={n.trust_layer} />
                  <span>{n.source_name}</span>
                  <span>· publicada {fmt(n.published_at)}</span>
                  <span>· detectada {fmt(n.detected_at)}</span>
                </div>
                <p className="mt-2 text-xs">
                  {n.media_url && n.published_at && n.media_published_at ? (
                    <>
                      {(() => {
                        const l = leadMinutes(n.published_at, n.media_published_at);
                        return (
                          <span className={l > 0 ? "font-medium text-success" : "text-muted"}>
                            {l > 0 ? `Llegó ${fmtLead(l)} antes que` : `Salió ${fmtLead(l)} después de`}{" "}
                          </span>
                        );
                      })()}
                      <a href={n.media_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {n.media_source}
                      </a>
                    </>
                  ) : (
                    <span className="text-muted">Sin cobertura de prensa localizada</span>
                  )}
                </p>
                <h2 className="mt-1 font-semibold">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{n.title}</a>
                </h2>
                {n.excerpt && <p className="mt-1 text-sm">{n.excerpt}</p>}
                <p className="mt-2 text-xs text-muted">Coincidencias: {(n.matched_keywords as string[]).slice(0, 6).join(", ")}</p>
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
      <h1 className="page-title mb-2">Noticias de fuentes primarias</h1>
      <p className="mb-6 text-sm text-muted">
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
