import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { monthlyBudgetUsd } from "@/lib/ai/pricing";
import { timeAgo } from "@/lib/news-format";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Operaciones" };

const LEGAL: Record<string, string> = {
  pending_review: "Pendiente de revisión legal",
  verified_ok: "Verificada",
  restricted: "Restringida",
  prohibited: "Prohibida",
};

function opState(s: { is_active: boolean; last_success_at: string | null; last_error_at: string | null }) {
  if (s.last_error_at && (!s.last_success_at || s.last_error_at > s.last_success_at)) return { label: "Error en la última carga", tone: "warning" as const };
  if (!s.last_success_at) return { label: "Sin cargas registradas", tone: "neutral" as const };
  return { label: s.is_active ? "Activa (automática)" : "Carga manual asistida", tone: "success" as const };
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

async function Panel() {
  await connection();
  const role = await getCurrentRole();
  if (!isStaffRole(role)) return <p className="empty-state">No tienes permisos para ver esta sección.</p>;
  const supabase = await createClient();
  const [sources, jobs, spend, runs, tenders, news] = await Promise.all([
    supabase.from("sources").select("id,code,name,access_method,legal_status,is_active,automation_allowed,last_success_at,last_error_at,last_error").order("name"),
    supabase.from("ingestion_jobs").select("id,status,started_at,error_message,result,sources(name)").order("started_at", { ascending: false }).limit(15),
    supabase.rpc("ai_spend_month"),
    supabase.from("ai_analysis_runs").select("status,latency_ms,cost_usd").order("created_at", { ascending: false }).limit(200),
    supabase.from("public_tenders").select("publication_status"),
    supabase.from("news_items").select("id", { count: "exact", head: true }),
  ]);
  const now = new Date();
  const budget = monthlyBudgetUsd(process.env.AI_MONTHLY_BUDGET_USD);
  const spent = Number(spend.data ?? 0);
  const runList = runs.data ?? [];
  const okRuns = runList.filter((r) => r.status === "succeeded");
  const avgLatency = okRuns.length ? Math.round(okRuns.reduce((a, r) => a + (r.latency_ms ?? 0), 0) / okRuns.length) : null;
  const byPub = (tenders.data ?? []).reduce<Record<string, number>>((m, t) => ({ ...m, [t.publication_status]: (m[t.publication_status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Gasto IA del mes" value={`US$${spent.toFixed(2)}`} hint={`Tope: US$${budget} (${Math.min(100, Math.round((spent / budget) * 100))} %)`} />
        <Kpi label="Ejecuciones IA (últimas 200)" value={String(runList.length)} hint={`${runList.length - okRuns.length} fallidas o bloqueadas${avgLatency ? ` · latencia media ${avgLatency} ms` : ""}`} />
        <Kpi label="Licitaciones" value={String((tenders.data ?? []).length)} hint={`${byPub.published ?? 0} publicadas · ${byPub.in_review ?? 0} en revisión · ${byPub.rejected ?? 0} rechazadas`} />
        <Kpi label="Noticias" value={String(news.count ?? 0)} hint="Fuentes primarias (carga manual asistida)" />
      </div>

      <section aria-labelledby="fuentes" className="card">
        <h2 id="fuentes" className="text-base font-semibold">Estado de fuentes</h2>
        {sources.error ? (
          <p role="alert" className="mt-2 text-sm text-danger">No se pudo cargar el registro de fuentes.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-divider">
                  <th scope="col" className="py-2 pr-3 font-medium">Fuente</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Estado operativo</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Estado legal</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Último éxito</th>
                  <th scope="col" className="py-2 font-medium">Último error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {(sources.data ?? []).map((s) => {
                  const st = opState(s);
                  return (
                    <tr key={s.id}>
                      <td className="py-2 pr-3"><span className="font-medium">{s.name}</span><span className="block text-xs text-muted">{s.code} · {s.access_method}</span></td>
                      <td className="py-2 pr-3"><StatusBadge label={st.label} tone={st.tone} /></td>
                      <td className="py-2 pr-3 text-xs">{LEGAL[s.legal_status] ?? s.legal_status}{s.automation_allowed ? "" : " · sin automatizar"}</td>
                      <td className="py-2 pr-3 text-xs">{s.last_success_at ? timeAgo(s.last_success_at, now) : "—"}</td>
                      <td className="py-2 text-xs">{s.last_error_at ? `${timeAgo(s.last_error_at, now)}: ${s.last_error ?? ""}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">Ninguna fuente se activa como automática sin estado legal «verificada» (restricción en base de datos, G0 #5).</p>
      </section>

      <section aria-labelledby="cargas" className="card">
        <h2 id="cargas" className="text-base font-semibold">Últimas cargas</h2>
        {jobs.error ? (
          <p className="mt-2 text-sm text-muted">El registro de cargas solo es visible para administradores de organización.</p>
        ) : jobs.data?.length ? (
          <ul className="mt-2 divide-y divide-divider text-sm">
            {jobs.data.map((j) => {
              const src = (Array.isArray(j.sources) ? j.sources[0] : j.sources) as { name: string } | null;
              return (
                <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">{src?.name ?? "Fuente"}</span>
                    <span className="block text-xs text-muted">{j.started_at ? timeAgo(j.started_at, now) : "—"} · {JSON.stringify(j.result).slice(0, 120)}</span>
                  </span>
                  <StatusBadge label={j.status === "succeeded" ? "Correcta" : "Fallida"} tone={j.status === "succeeded" ? "success" : "warning"} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Aún no hay cargas registradas. Se registran desde la próxima carga de DGCP o de noticias.</p>
        )}
      </section>
    </div>
  );
}

export default function OperacionesPage() {
  return (
    <>
      <p className="eyebrow">Administración</p>
      <h1 className="page-title">Operaciones</h1>
      <p className="page-lead">Estado de fuentes, cargas, gasto de IA y estado editorial. Los datos provienen del registro real; nada se estima en esta pantalla salvo el costo de IA (precio público por token).</p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Panel />
      </Suspense>
    </>
  );
}
