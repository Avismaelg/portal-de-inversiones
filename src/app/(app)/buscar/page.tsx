import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { formatMoney, PUBLICATION } from "@/lib/format";
import { timeAgo } from "@/lib/news-format";
import { OPPORTUNITY_TYPES } from "@/lib/opportunity-types";
import { ilikeAny, ilikePattern, normalizeQuery } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Buscar" };

const LIMIT = 8;
const TENDER_STATUS: Record<string, string> = {
  open: "Abierta", closed: "Cerrada", awarded: "Adjudicada", cancelled: "Cancelada", planned: "Planificada", unknown: "Estado no mapeado",
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function Group({
  id, title, count, failed, more, children,
}: { id: string; title: string; count: number; failed: boolean; more?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-8">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-base font-semibold">
          {title} <span className="text-sm font-normal text-muted">({failed ? "error" : count})</span>
        </h2>
        {more && count > LIMIT && <Link href={more} className="text-sm text-primary underline">Ver los {count} →</Link>}
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-danger">No se pudo buscar en esta sección.</p>
      ) : count === 0 ? (
        <p className="text-sm text-muted">Sin resultados.</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const q = normalizeQuery(one((await searchParams).q));
  if (!q) return <p className="empty-state">Escribe al menos 2 caracteres para buscar en noticias, licitaciones, oportunidades, proyectos e instrumentos.</p>;

  const pattern = ilikePattern(q);
  const fts = { type: "websearch" as const, config: "spanish" };
  const supabase = await createClient();
  const [news, tenders, opps, projects, instruments] = await Promise.all([
    pattern
      ? supabase
          .from("news_items")
          .select("id,source_name,title,published_at", { count: "exact" })
          .or(ilikeAny(["title", "excerpt"], pattern))
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(LIMIT)
      : Promise.resolve({ data: [], count: 0, error: null }),
    supabase
      .from("public_tenders")
      .select("id,title,process_code,status,deadline_at,budget_amount,budget_currency", { count: "exact" })
      .textSearch("search_vector", q, fts)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(LIMIT),
    supabase
      .from("investment_opportunities")
      .select("id,title,opportunity_type,confidence,trust_layer,publication_status", { count: "exact" })
      .textSearch("search_vector", q, fts)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("projects")
      .select("id,name,status,trust_layer,publication_status", { count: "exact" })
      .textSearch("search_vector", q, fts)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    pattern
      ? supabase
          .from("financial_instruments")
          .select("id,name,isin,currency,trust_layer,publication_status", { count: "exact" })
          .or(ilikeAny(["name", "isin"], pattern))
          .order("issue_date", { ascending: false, nullsFirst: false })
          .limit(LIMIT)
      : Promise.resolve({ data: [], count: 0, error: null }),
  ]);
  const now = new Date();
  const enc = encodeURIComponent(q);
  const total = [news, tenders, opps, projects, instruments].reduce((s, r) => s + (r.error ? 0 : (r.count ?? 0)), 0);

  return (
    <>
      <p className="mb-6 text-sm text-muted" aria-live="polite">
        {total} resultado(s) para «{q}». Las licitaciones, oportunidades y proyectos se buscan por palabra (con variantes en
        español); las noticias, por coincidencia en titular o extracto; los instrumentos, por nombre o ISIN.
      </p>

      <Group id="g-noticias" title="Noticias" count={news.count ?? 0} failed={!!news.error} more={`/noticias?q=${enc}&orden=recientes`}>
        {(news.data ?? []).map((n) => (
          <li key={n.id} className="card py-3">
            <p className="text-xs text-muted">{n.source_name} · {timeAgo(n.published_at, now)}</p>
            <Link href={`/noticias/${n.id}`} className="headline hover:text-primary hover:underline">{n.title}</Link>
          </li>
        ))}
      </Group>

      <Group id="g-licitaciones" title="Licitaciones" count={tenders.count ?? 0} failed={!!tenders.error} more={`/licitaciones?q=${enc}&orden=recientes`}>
        {(tenders.data ?? []).map((t) => (
          <li key={t.id} className="card py-3">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-mono">{t.process_code}</span>
              <StatusBadge label={TENDER_STATUS[t.status] ?? t.status} tone={t.status === "open" ? "success" : "neutral"} />
              {t.budget_currency && <span className="num">{formatMoney(t.budget_amount, t.budget_currency)}</span>}
            </p>
            <Link href={`/licitaciones/${t.id}`} className="headline hover:text-primary hover:underline">{t.title}</Link>
          </li>
        ))}
      </Group>

      <Group id="g-oportunidades" title="Oportunidades" count={opps.count ?? 0} failed={!!opps.error}>
        {(opps.data ?? []).map((o) => (
          <li key={o.id} className="card py-3">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <TrustBadge layer={o.trust_layer} />
              <span>{OPPORTUNITY_TYPES[o.opportunity_type] ?? o.opportunity_type}</span>
              {o.publication_status !== "published" && <StatusBadge label={PUBLICATION[o.publication_status] ?? o.publication_status} tone="warning" />}
              {o.confidence != null && <span>· confianza {o.confidence} %</span>}
            </p>
            <Link href={`/oportunidades/${o.id}`} className="headline hover:text-primary hover:underline">{o.title}</Link>
          </li>
        ))}
      </Group>

      <Group id="g-proyectos" title="Proyectos" count={projects.count ?? 0} failed={!!projects.error}>
        {(projects.data ?? []).map((p) => (
          <li key={p.id} className="card py-3">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <TrustBadge layer={p.trust_layer} />
              {p.publication_status !== "published" && <StatusBadge label={PUBLICATION[p.publication_status] ?? p.publication_status} tone="warning" />}
            </p>
            <Link href="/proyectos" className="headline hover:text-primary hover:underline">{p.name}</Link>
          </li>
        ))}
      </Group>

      <Group id="g-instrumentos" title="Instrumentos financieros" count={instruments.count ?? 0} failed={!!instruments.error}>
        {(instruments.data ?? []).map((i) => (
          <li key={i.id} className="card py-3">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <TrustBadge layer={i.trust_layer} />
              {i.isin && <span className="font-mono">{i.isin}</span>}
              {i.currency && <span>{i.currency}</span>}
              {i.publication_status !== "published" && <StatusBadge label={PUBLICATION[i.publication_status] ?? i.publication_status} tone="warning" />}
            </p>
            <Link href={`/instrumentos/${i.id}`} className="headline hover:text-primary hover:underline">{i.name}</Link>
          </li>
        ))}
      </Group>
    </>
  );
}

export default function BuscarPage(props: PageProps<"/buscar">) {
  return (
    <>
      <p className="eyebrow">Búsqueda</p>
      <h1 className="page-title">Buscar en toda la plataforma</h1>
      <p className="page-lead">
        Resultados de fuentes públicas y de análisis internos, cada uno con su capa de confianza. Sin carácter de asesoría de inversión.
      </p>
      <Suspense fallback={<p className="text-muted">Buscando…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
