import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { leadMinutes } from "@/lib/ingest/news";
import { CHAIN_KIND, DIRECTION, HORIZON, initials, timeAgo } from "@/lib/news-format";
import { priorityLabel, scoreNews } from "@/lib/priority";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeButton } from "../analyze-button";

export const metadata: Metadata = { title: "Noticia" };

type Scenario = { horizon: string; description: string; signals_to_watch: string };
type Link_ = { segment: string; kind: string; why: string };
type Opp = { idea: string; rationale: string; risks: string; what_to_verify: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: n }, { data: a }, prefs, role] = await Promise.all([
    supabase
      .from("news_items")
      .select("id,source_name,url,title,excerpt,published_at,detected_at,matched_keywords,media_source,media_url,media_published_at")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("news_analyses").select("*").eq("news_id", id).maybeSingle(),
    supabase.from("user_alert_preferences").select("name,keywords").eq("is_paused", false),
    getCurrentRole(),
  ]);
  if (!n) notFound();
  const now = new Date();
  const pr = scoreNews(
    { ...n, matched_keywords: (n.matched_keywords ?? []) as string[] },
    (prefs.data ?? []).map((p) => ({ name: p.name, keywords: (p.keywords ?? []) as string[] })),
    now,
  );
  const lead = n.published_at && n.media_published_at ? leadMinutes(n.published_at, n.media_published_at) : null;
  const scenarios = (a?.scenarios ?? []) as Scenario[];
  const chain = (a?.value_chain ?? []) as Link_[];
  const opps = (a?.opportunities ?? []) as Opp[];

  return (
    <div className="space-y-3">
      <Link href="/noticias" className="text-sm font-semibold text-muted hover:text-primary">← Volver a noticias</Link>

      <article className="card">
        <header className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded bg-surface-2 text-sm font-bold text-primary">
            {initials(n.source_name)}
          </span>
          <div>
            <p className="text-sm font-semibold">{n.source_name}</p>
            <p className="text-xs text-muted">{timeAgo(n.published_at, now)} · Prioridad {priorityLabel(pr.score)}</p>
          </div>
        </header>
        <h1 className="page-title mt-3">{n.title}</h1>
        {n.excerpt && <p className="mt-2 text-sm">{n.excerpt}</p>}
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {lead !== null && n.media_url && (
            <li className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {lead > 0 ? "Salió antes que " : "Ya publicada por "}
              {n.media_source}
            </li>
          )}
          {!n.media_url && !pr.reasons.some((r) => /prensa/.test(r)) && <li className="rounded-full border border-divider px-2 py-0.5 text-muted">Sin cobertura de prensa localizada</li>}
          {pr.reasons.map((r) => (
            <li key={r} className="rounded-full border border-divider bg-bg px-2 py-0.5 text-muted">{r}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-divider pt-3">
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="btn-ghost">Leer en la fuente ↗</a>
          {n.media_url && <a href={n.media_url} target="_blank" rel="noopener noreferrer" className="btn-ghost">Ver en {n.media_source} ↗</a>}
        </div>
      </article>

      {!a ? (
        <section className="card" aria-labelledby="sin-analisis">
          <h2 id="sin-analisis" className="text-base font-semibold">Análisis económico y de impacto</h2>
          <p className="mt-1 text-sm text-muted">
            Aún no hay análisis. La IA leerá el texto de la fuente (sin guardarlo) y propondrá impacto, escenarios futuros,
            cadena de valor (materias primas, contratistas, proveedores) y ideas a investigar.
          </p>
          {isStaffRole(role) ? <AnalyzeButton id={n.id} again={false} /> : <p className="mt-2 text-xs text-muted">Tu rol no puede generar análisis.</p>}
        </section>
      ) : (
        <>
          <section className="card" aria-labelledby="impacto">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <TrustBadge layer="ai_analysis" />
              <span className="text-muted">
                Impacto {DIRECTION[a.impact_direction]} · {HORIZON[a.horizon]} · confianza {a.confidence} %
              </span>
            </div>
            <h2 id="impacto" className="mt-2 text-base font-semibold">Impacto económico</h2>
            <p className="mt-1 text-sm">{a.summary}</p>
            {a.sectors.length > 0 && <p className="mt-2 text-sm"><span className="font-semibold">Sectores: </span>{a.sectors.join(", ")}</p>}
            {a.risks.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm text-muted">
                {a.risks.map((r: string) => <li key={r}>{r}</li>)}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted">{a.confidence_explanation}</p>
          </section>

          {scenarios.length > 0 && (
            <section className="card" aria-labelledby="escenarios">
              <h2 id="escenarios" className="text-base font-semibold">Futuros desarrollos en el área</h2>
              <ol className="mt-2 space-y-3">
                {scenarios.map((s) => (
                  <li key={s.description} className="text-sm">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">{HORIZON[s.horizon]}</span>
                    <p className="mt-1">{s.description}</p>
                    <p className="text-xs text-muted">Qué lo confirmaría: {s.signals_to_watch}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {chain.length > 0 && (
            <section className="card" aria-labelledby="cadena">
              <h2 id="cadena" className="text-base font-semibold">Cadena de valor: materias primas, contratistas y proveedores</h2>
              <ul className="mt-2 divide-y divide-divider">
                {chain.map((c) => (
                  <li key={c.segment} className="py-2 text-sm">
                    <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{CHAIN_KIND[c.kind] ?? c.kind}</span>
                    <span className="font-semibold">{c.segment}</span>
                    <p className="text-muted">{c.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {opps.length > 0 && (
            <section className="card" aria-labelledby="ideas">
              <h2 id="ideas" className="text-base font-semibold">Ideas a investigar (hipótesis)</h2>
              <ul className="mt-2 space-y-3">
                {opps.map((o) => (
                  <li key={o.idea} className="rounded-lg border border-divider p-3 text-sm">
                    <p className="font-semibold">{o.idea}</p>
                    <p className="mt-1">{o.rationale}</p>
                    <p className="mt-1 text-xs text-muted"><span className="font-semibold">Riesgos: </span>{o.risks}</p>
                    <p className="text-xs text-muted"><span className="font-semibold">Verificar antes de actuar: </span>{o.what_to_verify}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {a.watch_next.length > 0 && (
            <section className="card" aria-labelledby="vigilar">
              <h2 id="vigilar" className="text-base font-semibold">Qué vigilar</h2>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {a.watch_next.map((w: string) => <li key={w}>{w}</li>)}
              </ul>
            </section>
          )}

          <section className="card text-xs text-muted" aria-label="Aviso">
            <p>
              Análisis generado por IA ({a.model}) {a.used_full_text ? "a partir del texto de la fuente" : "solo con titular y extracto"};
              es inferencia, no un hecho verificado ni asesoría de inversión. {a.evidence_quote && a.quote_verified
                ? `Cita verificada en el texto: «${a.evidence_quote}».`
                : "Sin cita verificable en el texto: tómalo como orientación."}
            </p>
            {isStaffRole(role) && <AnalyzeButton id={n.id} again />}
          </section>
        </>
      )}
    </div>
  );
}

export default function NoticiaPage(props: PageProps<"/noticias/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Detail params={props.params} />
    </Suspense>
  );
}
