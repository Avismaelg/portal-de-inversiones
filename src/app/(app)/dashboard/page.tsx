import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayInRD } from "@/lib/format";
import { leadMinutes } from "@/lib/ingest/news";

export const metadata: Metadata = { title: "Dashboard" };

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
  const [inst, auctions, due, sources, last, tenders, closing, signals] = await Promise.all([
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
      .select("id,source_name,title,url,published_at,media_source,media_published_at", { count: "exact" })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);
  if ([inst, auctions, due, sources, last, tenders, closing, signals].some((r) => r.error)) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los datos. Reintenta en unos minutos.
      </p>
    );
  }
  return (
    <>
      <section aria-labelledby="senales" className="card mb-4">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 id="senales" className="text-base font-semibold">Señales recientes</h2>
          <Link href="/noticias" className="text-sm font-medium text-primary hover:underline">
            Ver las {signals.count ?? 0} noticias →
          </Link>
        </div>
        {signals.data?.length ? (
          <ul className="divide-y divide-divider">
            {signals.data.map((n) => {
              const lead =
                n.published_at && n.media_published_at ? leadMinutes(n.published_at, n.media_published_at) : null;
              return (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="headline hover:text-primary hover:underline">
                      {n.title}
                    </a>
                    <p className="kicker mt-1">{n.source_name}</p>
                  </div>
                  {lead !== null && lead > 0 ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {lead >= 60 ? `${Math.floor(lead / 60)} h ${lead % 60} min` : `${lead} min`} antes que {n.media_source}
                    </span>
                  ) : (
                    <span className="rounded-full border border-divider px-2.5 py-0.5 text-xs text-muted">
                      Sin cobertura de prensa localizada
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aún no hay señales. Carga noticias desde la sección Noticias.</p>
        )}
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
