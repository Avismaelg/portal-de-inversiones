import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { NEWS_FEEDS } from "@/lib/ingest/news";
import { canPublishRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { LoadNewsButton } from "./load-button";

export const metadata: Metadata = { title: "Noticias" };

const PAGE_SIZE = 25;
type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

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
    .select("id,source_key,source_name,url,title,excerpt,published_at,detected_at,matched_keywords,trust_layer", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (NEWS_FEEDS.some((f) => f.key === source)) query = query.eq("source_key", source);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data, count, error } = await query;
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar las noticias.</p>;
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
      <form method="get" role="search" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Buscar en titulares</label>
          <input id="q" name="q" defaultValue={q} className="w-64 rounded border border-line bg-surface px-3 py-2" />
        </div>
        <div>
          <label htmlFor="fuente" className="mb-1 block text-sm font-medium">Fuente</label>
          <select id="fuente" name="fuente" defaultValue={source} className="rounded border border-line bg-surface px-3 py-2">
            <option value="">Todas</option>
            {NEWS_FEEDS.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </div>
        <button className="rounded bg-primary px-4 py-2 font-medium text-on-primary">Filtrar</button>
        {(q || source) && <Link href="/noticias" className="py-2 text-sm text-primary underline">Quitar filtros</Link>}
      </form>
      {!data?.length ? (
        <p className="rounded border border-line p-6 text-muted">
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
                <h2 className="mt-2 font-semibold">
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
      <h1 className="mb-2 text-2xl font-semibold">Noticias de fuentes primarias</h1>
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
