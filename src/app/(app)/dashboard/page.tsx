import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, todayInRD } from "@/lib/format";
import { NewsCard } from "@/components/news-card";
import { scoreNews } from "@/lib/priority";

export const metadata: Metadata = { title: "Dashboard" };

const closeFmt = (v: string | null) =>
  v ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v)) : "No disponible";

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 num text-3xl font-semibold tracking-tight text-text">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

async function Summary() {
  await connection();
  const supabase = await createClient();
  const today = todayInRD();
  const in30 = todayInRD(30);
  const [inst, auctions, due, sources, last, tenders, closing, signals, prefs, soon] = await Promise.all([
    supabase.from("financial_instruments").select("id", { count: "exact", head: true }),
    supabase.from("instrument_auctions").select("id", { count: "exact", head: true }),
    supabase
      .from("financial_instruments")
      .select("id", { count: "exact", head: true })
      .gte("maturity_date", today)
      .lte("maturity_date", in30),
    supabase.from("sources").select("code,name,is_active,legal_status,automation_allowed").order("name"),
    supabase
      .from("instrument_auctions")
      .select("auction_date")
      .order("auction_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("public_tenders").select("id", { count: "exact", head: true }),
    supabase
      .from("public_tenders")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .gte("deadline_at", new Date(todayInRD() + "T00:00:00-04:00").toISOString())
      .lte("deadline_at", new Date(todayInRD(7) + "T23:59:59-04:00").toISOString()),
    supabase
      .from("news_items")
      .select("id,source_name,title,url,excerpt,matched_keywords,published_at,media_url,media_source,media_published_at", { count: "exact" })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(120),
    supabase.from("user_alert_preferences").select("name,keywords").eq("is_paused", false),
    supabase
      .from("public_tenders")
      .select("id,title,deadline_at,budget_amount,budget_currency,procurement_method")
      .eq("status", "open")
      .gte("deadline_at", new Date().toISOString())
      .lte("deadline_at", new Date(todayInRD(7) + "T23:59:59-04:00").toISOString())
      .order("budget_amount", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);
  if ([inst, auctions, due, sources, last, tenders, closing, signals, prefs, soon].some((r) => r.error)) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los datos. Reintenta en unos minutos.
      </p>
    );
  }
  const nowDate = new Date();
  const alerts = (prefs.data ?? []).map((a) => ({ name: a.name, keywords: (a.keywords ?? []) as string[] }));
  const top = (signals.data ?? [])
    .filter((n) => n.published_at && nowDate.getTime() - new Date(n.published_at).getTime() < 7 * 86400000)
    .map((n) => ({ ...n, pr: scoreNews({ ...n, matched_keywords: (n.matched_keywords ?? []) as string[] }, alerts, nowDate) }))
    .sort((a, b) => b.pr.score - a.pr.score)
    .slice(0, 5);
  const { data: done } = top.length
    ? await supabase.from("news_analyses").select("news_id").in("news_id", top.map((n) => n.id))
    : { data: [] };
  const analyzedIds = new Set((done ?? []).map((d) => d.news_id));
  return (
    <>
      <section aria-labelledby="senales" className="mb-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 id="senales" className="text-lg font-semibold">Noticias relevantes para ti</h2>
          <Link href="/noticias" className="text-sm font-semibold text-primary hover:underline">
            Ver las {signals.count ?? 0} noticias →
          </Link>
        </div>
        <p className="mb-3 text-sm text-muted">Lo más importante de los últimos 7 días, ordenado por prioridad para un inversionista.</p>
        {top.length ? (
          <ul className="space-y-3">
            {top.map((n) => (
              <li key={n.id}>
                <NewsCard n={n} pr={n.pr} now={nowDate} analyzed={analyzedIds.has(n.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No hay señales de los últimos 7 días. Carga noticias desde la sección Noticias.</p>
        )}
      </section>
      <section aria-labelledby="pronto" className="card mb-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 id="pronto" className="text-base font-semibold">Licitaciones que cierran en 7 días (mayor monto)</h2>
          <Link href="/licitaciones" className="text-sm font-semibold text-primary hover:underline">Ver todas →</Link>
        </div>
        {soon.data?.length ? (
          <ul className="divide-y divide-divider">
            {soon.data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <Link href={`/licitaciones?q=${encodeURIComponent(t.title.slice(0, 60))}`} className="font-semibold hover:text-primary hover:underline">{t.title}</Link>
                  <p className="text-xs text-muted">{t.procurement_method ?? "Modalidad no disponible"} · cierra {closeFmt(t.deadline_at)}</p>
                </div>
                <span className="num font-semibold">{t.budget_currency ? formatMoney(t.budget_amount, t.budget_currency) : "No disponible"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No hay licitaciones abiertas que cierren en los próximos 7 días.</p>
        )}
        <p className="mt-2 text-xs text-muted">Los montos se muestran tal como los publica la DGCP, sin convertir monedas.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi
          label="Instrumentos"
          value={String(inst.count ?? 0)}
          hint="Visibles para tu rol (incluye borradores si eres revisor)"
        />
        <Kpi
          label="Subastas registradas"
          value={String(auctions.count ?? 0)}
          hint={`Última: ${formatDate(last.data?.auction_date)}`}
        />
        <Kpi label="Licitaciones cargadas" value={String(tenders.count ?? 0)} hint="Fuente DGCP (carga manual)" />
        <Kpi label="Licitaciones que cierran en 7 días" value={String(closing.count ?? 0)} hint={`Corte: ${formatDate(today)}`} />
        <Kpi label="Vencen en 30 días" value={String(due.count ?? 0)} hint={`Corte: ${formatDate(today)}`} />
      </div>
      <section className="card mt-4" aria-labelledby="fuentes">
        <h2 id="fuentes" className="mb-3 text-base font-semibold">
          Estado de fuentes
        </h2>
        <ul className="divide-y divide-divider">
          {(sources.data ?? []).map((s) => (
            <li key={s.code} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>{s.name}</span>
              <span className="text-muted">
                {s.automation_allowed && s.is_active ? "Automática" : "Carga manual"} · estado legal:{" "}
                {s.legal_status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Radar, proyectos, licitaciones y oportunidades aún no tienen fuentes automatizadas: cobertura pendiente.
        </p>
      </section>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <p className="eyebrow">Inteligencia de inversión</p>
      <h1 className="page-title">Lo que casi nadie está siguiendo</h1>
      <p className="page-lead">
        Señales de fuentes primarias antes de que lleguen a la prensa, con su impacto y trazabilidad. No es asesoría de inversión.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Summary />
      </Suspense>
      <p className="mt-8 text-sm">
        <Link href="/instrumentos" className="text-primary underline">
          Ver instrumentos financieros
        </Link>
      </p>
    </>
  );
}
