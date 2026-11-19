import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TrustBadge } from "@/components/trust-badge";
import { formatDate, todayInRD } from "@/lib/format";
import { buildPulse, summarizeFx, type PulseItem } from "@/lib/macro";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Macro BCRD" };

const num = (v: number, max = 4) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: max }).format(v);
const signed = (v: number, max = 4) => `${v > 0 ? "+" : ""}${num(v, max)}`;
const seenFmt = (v: string) =>
  new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v));

function Change({ value, pct = false }: { value: number | null; pct?: boolean }) {
  if (value === null) return <span className="text-muted">—</span>;
  const tone = value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted";
  return <span className={`num ${tone}`}>{signed(value)}{pct ? " %" : ""}</span>;
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
              {["Indicador", "Valor", "Anterior", "Cambio", "Fecha del dato", "Detectado por AviTech"].map((h) => (
                <th key={h} scope="col" className="p-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {items.map((i) => (
              <tr key={i.series_key}>
                <th scope="row" className="p-3 font-medium">
                  {[...i.path, i.indicator].join(" · ")}
                  {i.is_new && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">Nuevo</span>}
                </th>
                <td className="p-3 num font-semibold">{num(i.value)}</td>
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

async function Content() {
  await connection();
  const supabase = await createClient();
  const [obs, fx] = await Promise.all([
    supabase
      .from("macro_observations")
      .select("series_key,group_name,category_path,indicator,value,as_of,first_seen_at,last_seen_at,data_quality_flags")
      .order("first_seen_at", { ascending: false })
      .limit(2000),
    supabase.from("exchange_rates").select("rate_date,buying,selling").gte("rate_date", todayInRD(-30)).order("rate_date", { ascending: false }),
  ]);
  if (obs.error || fx.error) return <p role="alert" className="text-danger">No se pudieron cargar los datos del BCRD.</p>;
  const pulse = buildPulse(obs.data ?? [], new Date());
  const fxs = summarizeFx(fx.data ?? []);
  if (!pulse.length && !fxs) {
    return (
      <p className="empty-state">
        Aún no hay datos del BCRD. Un gestor puede cargarlos en <Link href="/admin/ingesta" className="text-primary underline">Carga de datos</Link>.
      </p>
    );
  }
  const groups = [...new Set(pulse.map((p) => p.group))];
  const newCount = pulse.filter((p) => p.is_new).length;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <TrustBadge layer="confirmed" />
        <span className="text-muted">
          Datos publicados por el BCRD, sin interpretar. {newCount ? `${newCount} valor(es) nuevo(s) en los últimos 7 días.` : "Sin valores nuevos en los últimos 7 días."}
        </span>
      </div>
      {fxs && (
        <section aria-labelledby="fx" className="card mb-6">
          <h2 id="fx" className="mb-3 text-lg font-semibold">Tasa de cambio oficial (US$ → RD$)</h2>
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
              <thead><tr><th className="py-1 font-medium">Fecha</th><th className="py-1 font-medium">Compra</th><th className="py-1 font-medium">Venta</th></tr></thead>
              <tbody>
                {(fx.data ?? []).slice(0, 15).map((r) => (
                  <tr key={r.rate_date}><td className="py-1">{formatDate(r.rate_date)}</td><td className="py-1 num">{num(Number(r.buying))}</td><td className="py-1 num">{num(Number(r.selling))}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      )}
      {groups.map((g) => (
        <GroupTable key={g} title={g} items={pulse.filter((p) => p.group === g)} />
      ))}
      <p className="text-xs text-muted">
        El BCRD no indica las unidades de cada indicador en su API (por ejemplo, si un valor es porcentaje o millones de
        US$): se muestran tal cual. «Cambio» es la diferencia con el valor anterior que AviTech había guardado.
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
        Lo último que publica el Banco Central sobre inflación, tasas, actividad y sector externo, y cuándo lo detectó
        AviTech. Información con fines informativos; no constituye asesoría de inversión.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
