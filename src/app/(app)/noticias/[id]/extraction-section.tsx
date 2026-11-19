import { TrustBadge } from "@/components/trust-badge";
import {
  AMOUNT_MEANING_LABEL,
  EVENT_KIND_LABEL,
  ROLE_LABEL,
  SECTOR_LABEL,
  STATUS_LABEL,
  StoredExtractionSchema,
  WARNING_LABEL,
  type GuardedEvent,
  type StoredExtraction,
} from "@/lib/ai/extraction";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ExtractButton } from "../extract-button";

const num = (v: number, max = 2) => new Intl.NumberFormat("es-DO", { maximumFractionDigits: max }).format(v);
const stamp = (iso: string) =>
  new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(
    new Date(iso),
  );

function Quote({ text }: { text: string }) {
  return (
    <blockquote className="mt-1 border-l-2 border-primary/40 pl-2 text-xs text-muted">«{text}»</blockquote>
  );
}

function EventBody({ event }: { event: GuardedEvent }) {
  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded bg-surface-2 px-2 py-0.5 font-medium">{EVENT_KIND_LABEL[event.event_kind] ?? event.event_kind}</span>
        <span className="rounded border border-divider px-2 py-0.5">{STATUS_LABEL[event.administrative_status] ?? event.administrative_status}</span>
        {event.sector_codes.map((s) => (
          <span key={s} className="rounded border border-divider px-2 py-0.5 text-muted">{SECTOR_LABEL[s] ?? s}</span>
        ))}
      </div>

      <h3 className="mt-3 text-base font-semibold">{event.title}</h3>
      {event.summary && <p className="mt-1 text-sm">{event.summary}</p>}

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="kicker">Fecha del acontecimiento</dt>
          <dd>{event.occurred_at ? formatDate(event.occurred_at) : <span className="text-muted">No indicada en el texto</span>}</dd>
        </div>
        <div>
          <dt className="kicker">Ubicación</dt>
          <dd>
            {event.location ? (
              <>
                {event.location.text}
                {(event.location.municipality || event.location.province) && (
                  <span className="text-muted">
                    {" "}({[event.location.municipality, event.location.province].filter(Boolean).join(", ")})
                  </span>
                )}
                <Quote text={event.location.evidence.quote} />
              </>
            ) : (
              <span className="text-muted">No indicada con cita</span>
            )}
          </dd>
        </div>
      </dl>

      {event.organizations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Organizaciones mencionadas</h4>
          <ul className="mt-1 divide-y divide-divider">
            {event.organizations.map((o) => (
              <li key={`${o.name}-${o.role}`} className="py-2 text-sm">
                <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{ROLE_LABEL[o.role] ?? o.role}</span>
                <span className="font-medium">{o.name}</span>
                {o.tax_id && <span className="ml-2 text-xs text-muted">RNC/ID {o.tax_id}</span>}
                <Quote text={o.evidence.quote} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {event.amounts.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h4 className="text-sm font-semibold">Importes con cita</h4>
          <table className="mt-1 w-full text-left text-sm">
            <caption className="sr-only">Importes extraídos y su cita literal</caption>
            <thead className="bg-bg-subtle text-xs text-muted">
              <tr>
                {["Importe tal como aparece", "Valor calculado", "Tipo", "Cita"].map((h) => (
                  <th key={h} scope="col" className="p-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {event.amounts.map((a) => (
                <tr key={`${a.amount_text}-${a.meaning}`}>
                  <th scope="row" className="p-2 font-medium">{a.amount_text}</th>
                  <td className="p-2 num">
                    {a.value === null ? (
                      <span className="text-muted">No se pudo convertir con certeza</span>
                    ) : (
                      <>{num(a.value)}{a.currency ? ` ${a.currency}` : ""}</>
                    )}
                  </td>
                  <td className="p-2 text-muted">{AMOUNT_MEANING_LABEL[a.meaning] ?? a.meaning}</td>
                  <td className="p-2 text-xs text-muted">«{a.evidence.quote}»</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-muted">El valor se calcula en código a partir del texto; el modelo no convierte monedas.</p>
        </div>
      )}

      {event.conditions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Condiciones o requisitos mencionados</h4>
          <ul className="mt-1 list-disc pl-5 text-sm">{event.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      <div className="mt-4">
        <h4 className="text-sm font-semibold">Evidencia del acontecimiento</h4>
        <ul className="mt-1 space-y-1">
          {event.evidence.map((e) => (
            <li key={`${e.claim_field}-${e.quote}`} className="text-sm">
              <span className="text-xs font-semibold text-muted">{e.claim_field}</span>
              <Quote text={e.quote} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Stored({ stored, meta }: { stored: StoredExtraction; meta: { model: string | null; created_at: string; cost_usd: number | null } }) {
  const { extraction } = stored;
  const warnings = extraction.warnings.map((w) => WARNING_LABEL[w] ?? w);
  return (
    <section aria-labelledby="extraccion" className="card">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <TrustBadge layer="ai_analysis" />
        <span className="text-muted">
          Agente de extracción · {meta.model ?? "modelo no registrado"} · {stamp(meta.created_at)}
          {meta.cost_usd !== null ? ` · costo estimado US$${Number(meta.cost_usd).toFixed(4)}` : ""}
        </span>
      </div>
      <h2 id="extraccion" className="mt-2 text-base font-semibold">Datos estructurados del acontecimiento</h2>
      <p className="mt-1 text-sm text-muted">
        Datos propuestos por IA y filtrados por el código: solo se conserva lo que tiene una cita que aparece literalmente en el
        texto. No es un hecho verificado ni asesoría de inversión.
      </p>

      {stored.injection_suspected && (
        <p role="alert" className="mt-3 rounded border-l-4 border-warning bg-warning/10 p-2 text-sm text-warning">
          El texto contiene frases dirigidas al modelo (posible intento de manipulación). No se siguió ninguna instrucción del
          documento, pero conviene revisarlo a mano antes de usarlo.
        </p>
      )}

      {extraction.event ? <EventBody event={extraction.event} /> : (
        <p className="mt-3 text-sm">
          {extraction.not_event_reason ?? "El texto no contiene un acontecimiento económico extraíble."}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded border border-divider bg-bg-subtle p-3">
          <h4 className="text-sm font-semibold">Controles aplicados</h4>
          <ul className="mt-1 list-disc pl-5 text-xs text-muted">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        {extraction.stats.evidence_verified} de {extraction.stats.evidence_proposed} citas verificadas literalmente
        {extraction.stats.evidence_discarded > 0 ? `; ${extraction.stats.evidence_discarded} cita(s) descartada(s)` : ""}
        {extraction.stats.items_dropped > 0 ? `; ${extraction.stats.items_dropped} dato(s) sin respaldo descartado(s)` : ""}.
        {stored.used_full_text ? " Se leyó el texto de la fuente solo para este análisis." : " Solo se usaron titular y extracto."}
      </p>
    </section>
  );
}

/** Solo para staff: `ai_analysis_runs` es staff-only por RLS. */
export async function ExtractionSection({ newsId }: { newsId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_analysis_runs")
    .select("output,model,cost_usd,created_at,status")
    .eq("task", "news_extraction")
    .eq("subject_type", "news")
    .eq("subject_id", newsId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const parsed = data?.output ? StoredExtractionSchema.safeParse(data.output) : null;
  if (data && parsed?.success) {
    return (
      <>
        <Stored stored={parsed.data} meta={{ model: data.model, created_at: data.created_at, cost_usd: data.cost_usd }} />
        <section className="card text-xs text-muted" aria-label="Volver a extraer">
          <ExtractButton id={newsId} again />
        </section>
      </>
    );
  }

  return (
    <section className="card" aria-labelledby="sin-extraccion">
      <h2 id="sin-extraccion" className="text-base font-semibold">Datos estructurados (agente de extracción)</h2>
      <p className="mt-1 text-sm text-muted">
        La IA leerá el texto de la fuente (sin guardarlo) y propondrá el acontecimiento: organizaciones, ubicación, importes,
        fechas y condiciones. El código descarta todo dato sin cita literal comprobable y rebaja cualquier estado que afirme una
        aprobación que la noticia no demuestra.
      </p>
      {data?.status === "budget_exceeded" && (
        <p className="mt-2 text-xs text-warning">El último intento se bloqueó por el tope mensual de IA.</p>
      )}
      <ExtractButton id={newsId} again={false} />
    </section>
  );
}
