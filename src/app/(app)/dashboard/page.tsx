import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, todayInRD } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

async function Summary() {
  const supabase = await createClient();
  const today = todayInRD();
  const in30 = todayInRD(30);
  const [inst, auctions, due, sources, last, tenders, closing] = await Promise.all([
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
  ]);
  if ([inst, auctions, due, sources, last, tenders, closing].some((r) => r.error)) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los datos. Reintenta en unos minutos.
      </p>
    );
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="mt-8" aria-labelledby="fuentes">
        <h2 id="fuentes" className="mb-3 text-lg font-semibold">
          Estado de fuentes
        </h2>
        <ul className="divide-y divide-divider rounded border border-line">
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
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
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
