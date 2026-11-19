import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import { formatDate, todayInRD } from "@/lib/format";
import { buildPulse, IPC_GROUP, labelOf, summarizeFx, type ObservationRow, type PulseItem, type RateRow } from "@/lib/macro";
import { CHAIN_KIND, DIRECTION, HORIZON } from "@/lib/news-format";
import { isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { MacroAnalyzeButton } from "./analyze-button";

export const metadata: Metadata = { title: "Macro BCRD" };

const num = (v: number, max = 4) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: max }).format(v);
const signed = (v: number, max = 4) => `${v > 0 ? "+" : ""}${num(v, max)}`;
const seenFmt = (v: string) =>
  new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v));
const monthFmt = (iso: string) =>
  new Intl.DateTimeFormat("es-DO", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** Meses entre el último mes del IPC (YYYY-MM-01) y hoy (YYYY-MM-DD). */
function ipcLagMonths(monthStart: string, today: string): number {
  const [y1, m1] = monthStart.split("-").map(Number);
  const [y2, m2] = today.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

function Change({ value, pct = false }: { value: number | null; pct?: boolean }) {
  if (value === null) return <span className="text-muted">—</span>;
  const tone = value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "■";
  return (
    <span className={`num ${tone}`}>
      <span aria-hidden="true">{arrow} </span>
      {signed(value)}
      {pct ? " %" : ""}
    </span>
  );
}

function Tags({ p }: { p: PulseItem }) {
  return (
    <>
      {p.is_new && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">Nuevo</span>}
      {p.trend_reversal && <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-warning">Cambio de dirección</span>}
    </>
  );
}

function GroupTable({ title, items }: { title: string; items: PulseItem[] }) {
  return (
    <section aria-label={title} className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-bg-subtle">
            <tr>
              {["Indicador", "Valor", "Unidad", "Anterior", "Cambio", "Fecha del dato", "Detectado por AviTech"].map((h) => (
                <th key={h} scope="col" className="p-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {items.map((i) => (
              <tr key={i.series_key}>
                <th scope="row" className="p-3 font-medium">
                  {labelOf(i)}
                  <Tags p={i} />
                </th>
                <td className="p-3 num font-semibold">{num(i.value)}</td>
                <td className="p-3 text-xs text-muted">{i.unit ?? "Sin unidad declarada"}</td>
                <td className="p-3 num text-muted">{i.previous ? num(i.previous.value) : "—"}</td>
                <td className="p-3"><Change value={i.change} /></td>
                <td className="p-3">{i.as_of ? formatDate(i.as_of) : <span className="text-muted">No la indica el BCRD</span>}</td>
                <td className="p-3 text-muted">{seenFmt(i.first_seen_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type Scenario = { horizon: string; description: string; signals_to_watch: string };
type Chain = { segment: string; kind: string; why: string };
type Opp = { idea: string; rationale: string; risks: string; what_to_verify: string };

async function Analysis({ canAnalyze }: { canAnalyze: boolean }) {
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("macro_analyses")
    .select("summary,impact_direction,horizon,sectors,risks,scenarios,value_chain,opportunities,watch_next,confidence,confidence_explanation,evidence_quote,quote_verified,model,created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    <section aria-labelledby="impacto" className="card mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <TrustBadge layer="ai_analysis" />
        {a && (
          <span className="text-muted">
            Impacto {DIRECTION[a.impact_direction]} · {HORIZON[a.horizon]} · confianza {a.confidence} % · generado {seenFmt(a.created_at)}
          </span>
        )}
      </div>
      <h2 id="impacto" className="text-lg font-semibold">Qué podría significar (análisis IA)</h2>
      {!a ? (
        <p className="text-sm text-muted">
          Aún no hay análisis. La IA recibe los datos de esta página tal cual, con sus unidades, y propone impacto por sectores,
          escenarios, cadena de valor e ideas a investigar. Es inferencia, no un dato oficial ni asesoría de inversión.
        </p>
      ) : (
        <>
          <p className="text-sm">{a.summary}</p>
          {a.sectors.length > 0 && <p className="text-sm"><span className="font-semibold">Sectores: </span>{a.sectors.join(", ")}</p>}
          {a.risks.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted">{a.risks.map((r: string) => <li key={r}>{r}</li>)}</ul>
          )}
          {(a.scenarios as Scenario[]).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Escenarios</h3>
              <ol className="mt-1 space-y-2">
                {(a.scenarios as Scenario[]).map((s) => (
                  <li key={s.description} className="text-sm">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-semibold">{HORIZON[s.horizon] ?? s.horizon}</span>
                    <p className="mt-1">{s.description}</p>
                    <p className="text-xs text-muted">Qué lo confirmaría: {s.signals_to_watch}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(a.value_chain as Chain[]).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Cadena de valor que podría moverse</h3>
              <ul className="mt-1 divide-y divide-divider">
                {(a.value_chain as Chain[]).map((c) => (
                  <li key={c.segment} className="py-2 text-sm">
                    <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{CHAIN_KIND[c.kind] ?? c.kind}</span>
                    <span className="font-semibold">{c.segment}</span>
                    <p className="text-muted">{c.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(a.opportunities as Opp[]).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Ideas a investigar (hipótesis)</h3>
              <ul className="mt-1 space-y-2">
                {(a.opportunities as Opp[]).map((o) => (
                  <li key={o.idea} className="rounded-lg border border-divider p-3 text-sm">
                    <p className="font-semibold">{o.idea}</p>
                    <p className="mt-1">{o.rationale}</p>
                    <p className="mt-1 text-xs text-muted"><span className="font-semibold">Riesgos: </span>{o.risks}</p>
                    <p className="text-xs text-muted"><span className="font-semibold">Verificar antes de actuar: </span>{o.what_to_verify}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.watch_next.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Qué vigilar</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">{a.watch_next.map((w: string) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-muted">
            {a.confidence_explanation} Generado por IA ({a.model}) con los datos del BCRD guardados en ese momento.{" "}
            {a.evidence_quote && a.quote_verified ? `Dato citado y comprobado: «${a.evidence_quote}».` : "Sin cita comprobable en los datos: tómalo como orientación."}
          </p>
        </>
      )}
      {canAnalyze ? <MacroAnalyzeButton /> : <p className="text-xs text-muted">Tu rol no puede generar análisis.</p>}
    </section>
  );
}

async function Content() {
  await connection();
  const supabase = await createClient();
  const [obs, fx, role] = await Promise.all([
    supabase
      .from("macro_observations")
      .select("id,series_key,group_name,category_path,indicator,value,as_of,unit,first_seen_at,last_seen_at,data_quality_flags")
      .order("first_seen_at", { ascending: false })
      .limit(3000),
    supabase.from("exchange_rates").select("rate_date,buying,selling").gte("rate_date", todayInRD(-30)).order("rate_date", { ascending: false }),
    getCurrentRole(),
  ]);
  if (obs.error || fx.error) return <p role="alert" className="text-danger">No se pudieron cargar los datos del BCRD.</p>;
  const rows = (obs.data ?? []) as ObservationRow[];
  const pulse = buildPulse(rows, new Date());
  const fxs = summarizeFx((fx.data ?? []) as RateRow[]);
  if (!pulse.length && !fxs) {
    return (
      <p className="empty-state">
        Aún no hay datos del BCRD. Un gestor puede cargarlos en <Link href="/admin/ingesta" className="text-primary underline">Carga de datos</Link>.
      </p>
    );
  }
  const ipc = rows
    .filter((r) => r.group_name === IPC_GROUP && r.as_of)
    .sort((a, b) => (b.as_of ?? "").localeCompare(a.as_of ?? ""))
    .filter((r, i, arr) => arr.findIndex((x) => x.as_of === r.as_of) === i)
    .slice(0, 13);
  const groups = [...new Set(pulse.filter((p) => p.group !== IPC_GROUP).map((p) => p.group))];
  const newCount = pulse.filter((p) => p.is_new).length;
  const reversals = pulse.filter((p) => p.trend_reversal).length;
  const lastLoad = rows.length ? rows.reduce((m, r) => (r.last_seen_at > m ? r.last_seen_at : m), rows[0].last_seen_at) : null;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <TrustBadge layer="confirmed" />
        <span className="text-muted">
          Datos publicados por el BCRD, sin interpretar{lastLoad ? ` (última carga: ${seenFmt(lastLoad)})` : ""}.{" "}
          {newCount ? `${newCount} valor(es) nuevo(s) en los últimos 7 días.` : "Sin valores nuevos en los últimos 7 días."}
          {reversals ? ` ${reversals} indicador(es) cambiaron de dirección.` : ""}
        </span>
        <Link href="/alertas" className="ml-auto text-sm font-semibold text-primary hover:underline">Crear alerta →</Link>
      </div>

      {fxs && (
        <section aria-labelledby="fx" className="card mb-6">
          <h2 id="fx" className="mb-3 text-lg font-semibold">Tasa de cambio de referencia del dólar</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted">Venta · {formatDate(fxs.latest.rate_date)}</p>
              <p className="num text-3xl font-semibold">{num(fxs.latest.selling)}</p>
              <p className="text-sm">Compra <span className="num">{num(fxs.latest.buying)}</span></p>
            </div>
            <div>
              <p className="text-sm text-muted">Frente al día hábil anterior</p>
              <p className="text-2xl"><Change value={fxs.daily_pct} pct /></p>
            </div>
            <div>
              <p className="text-sm text-muted">Desde {formatDate(fxs.window_start)} ({fxs.days} días hábiles)</p>
              <p className="text-2xl"><Change value={fxs.window_pct} pct /></p>
              <p className="text-xs text-muted">Rango de venta: {num(fxs.min_selling)} – {num(fxs.max_selling)}</p>
            </div>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-primary">Ver los últimos días</summary>
            <table className="mt-2 w-full max-w-md text-left">
              <caption className="sr-only">Tasa de cambio de los últimos días</caption>
              <thead><tr><th scope="col" className="py-1 font-medium">Fecha</th><th scope="col" className="py-1 font-medium">Compra</th><th scope="col" className="py-1 font-medium">Venta</th></tr></thead>
              <tbody>
                {(fx.data ?? []).slice(0, 15).map((r) => (
                  <tr key={r.rate_date}><td className="py-1">{formatDate(r.rate_date)}</td><td className="py-1 num">{num(Number(r.buying))}</td><td className="py-1 num">{num(Number(r.selling))}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
          <p className="mt-2 text-xs text-muted">El BCRD no indica la unidad en este bloque; los porcentajes son variación calculada por AviTech sobre la venta.</p>
        </section>
      )}

      <Suspense fallback={<p className="card mb-6 text-muted">Cargando análisis…</p>}>
        <Analysis canAnalyze={isStaffRole(role)} />
      </Suspense>

      {groups.map((g) => (
        <GroupTable key={g} title={g} items={pulse.filter((p) => p.group === g)} />
      ))}

      {ipc.length > 0 && (
        <section aria-labelledby="ipc" className="mb-6">
          <h2 id="ipc" className="mb-2 text-lg font-semibold">Índice de precios al consumidor (mensual)</h2>
          <div className="overflow-x-auto rounded border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Índice de precios al consumidor de los últimos meses</caption>
              <thead className="bg-bg-subtle">
                <tr>{["Mes", "Índice", "Cambio vs. mes anterior"].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {ipc.map((r, i) => {
                  const prev = ipc[i + 1];
                  return (
                    <tr key={r.as_of}>
                      <th scope="row" className="p-3 font-medium capitalize">{monthFmt(r.as_of as string)}</th>
                      <td className="p-3 num">{num(Number(r.value))}</td>
                      <td className="p-3"><Change value={prev ? Math.round((Number(r.value) - Number(prev.value)) * 1e4) / 1e4 : null} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Índice publicado por el BCRD (la API no indica el año base). El cambio es la diferencia en puntos calculada por AviTech.
            {ipcLagMonths(ipc[0].as_of as string, todayInRD()) >= 3 &&
              ` El histórico de la API llega hasta ${monthFmt(ipc[0].as_of as string)}; para datos recientes usa la tabla de inflación de arriba.`}
          </p>
        </section>
      )}

      <p className="text-xs text-muted">
        Unidades tal como las rotula el BCRD en su web (verificadas el 18-nov-2026). «Cambio» es la diferencia con el valor anterior
        que AviTech había guardado; «Cambio de dirección» significa que el último movimiento va en sentido contrario al anterior.
      </p>
    </>
  );
}

export default function MacroPage() {
  return (
    <>
      <p className="eyebrow">Fuente primaria · Banco Central</p>
      <h1 className="page-title mb-2">Pulso macro del BCRD</h1>
      <p className="mb-6 text-sm text-muted">
        Lo último que publica el Banco Central sobre inflación, tasas, actividad y sector externo, cuándo lo detectó AviTech y qué
        podría significar. Información con fines informativos; no constituye asesoría de inversión.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
