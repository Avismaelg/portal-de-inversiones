import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { getCurrentRole } from "@/lib/auth";
import {
  ACTION_LABEL,
  ACTOR_KIND_LABEL,
  CONFIDENCE_LABEL,
  DECISION_STATUS_LABEL,
  DIRECTION_LABEL,
  HORIZON_LABEL,
  StoredBriefSchema,
  WARNING_LABEL,
  type BriefScenario,
  type BriefSourceMeta,
} from "@/lib/ai/pattern-brief";
import { PUBLICATION } from "@/lib/format";
import { canPublishRole, isStaffRole } from "@/lib/review-rules";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Nota de inteligencia" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
    : "sin fecha";
const stamp = (value: string) =>
  new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(value));

function SourceRef({ id, sources }: { id: string; sources: BriefSourceMeta[] }) {
  const source = sources.find((s) => s.id === id);
  if (!source) return <span className="text-xs text-muted">Fuente no disponible</span>;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-semibold text-primary hover:underline"
    >
      {source.source_name} · {source.title}
    </a>
  );
}

function Quote({ text }: { text: string }) {
  return <blockquote className="mt-1 border-l-2 border-primary/40 pl-2 text-xs text-muted">«{text}»</blockquote>;
}

function ScenarioCard({ scenario }: { scenario: BriefScenario }) {
  return (
    <li className="rounded border border-divider p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="rounded bg-surface-2 px-2 py-0.5 font-medium text-text">{HORIZON_LABEL[scenario.horizon]}</span>
        <span className="font-semibold text-text">{scenario.name}</span>
      </div>
      <p className="mt-2 text-sm">{scenario.hypothesis}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Señales a vigilar</p>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {scenario.signals.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </li>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: row }, role] = await Promise.all([
    supabase
      .from("intelligence_briefs")
      .select(
        "id,scope_label,period_start,period_end,headline,lead,payload,input_news_ids,model,prompt_version,schema_version,publication_status,published_at,created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    getCurrentRole(),
  ]);
  if (!row) notFound();

  const parsed = StoredBriefSchema.safeParse(row.payload);
  if (!parsed.success) {
    return (
      <div className="space-y-3">
        <Link href="/reportes" className="text-sm font-semibold text-muted hover:text-primary">← Notas de inteligencia</Link>
        <p role="alert" className="text-danger">El contenido guardado de esta nota no tiene el formato esperado.</p>
      </div>
    );
  }

  const staff = isStaffRole(role);
  const canReview = canPublishRole(role) && row.publication_status === "draft";
  const { data: review } = staff
    ? await supabase.from("staff_intelligence_briefs").select("review_notes,reviewed_at").eq("id", id).maybeSingle()
    : { data: null };
  const { brief, sources } = parsed.data;

  return (
    <div className="space-y-3">
      <Link href="/reportes" className="text-sm font-semibold text-muted hover:text-primary">← Notas de inteligencia</Link>

      {row.publication_status !== "published" && (
        <p role="status" className="rounded border-l-4 border-warning bg-warning/10 p-2 text-sm text-warning">
          {row.publication_status === "rejected"
            ? "Nota rechazada por un gestor. Solo es visible para staff."
            : "Borrador: solo es visible para staff hasta que un gestor lo publique."}
        </p>
      )}

      <article className="card">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <TrustBadge layer="ai_analysis" />
          <StatusBadge
            label={PUBLICATION[row.publication_status] ?? row.publication_status}
            tone={row.publication_status === "published" ? "success" : "warning"}
          />
          <span>{row.scope_label}</span>
          <span>
            {day(row.period_start)} — {day(row.period_end)}
          </span>
        </div>
        <h1 className="page-title mt-3">{brief.headline}</h1>
        <p className="mt-2 text-base">{brief.lead}</p>
        <p className="mt-3 text-xs text-muted">
          Generada con {row.model} el {stamp(row.created_at)} · {brief.stats.facts_verified} hecho(s) con cita verificada ·{" "}
          {brief.stats.patterns_verified} patrón(es) · confianza {CONFIDENCE_LABEL[brief.confidence].toLowerCase()}
        </p>
      </article>

      <section aria-labelledby="como-leer" className="card text-sm">
        <h2 id="como-leer" className="text-base font-semibold">Cómo leer esta nota</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
          <li>Es análisis generado por IA, no una noticia de un medio ni un hecho confirmado.</li>
          <li>Los hechos y las decisiones que aparecen aquí tienen una cita que se comprobó literalmente contra la noticia.</li>
          <li>Un patrón solo se acepta si se apoya en al menos dos noticias distintas.</li>
          <li>Los escenarios son hipótesis sin probabilidad calculada; las «señales a vigilar» indican qué los confirmaría o descartaría.</li>
          <li>Las acciones son de verificación o seguimiento. No son consejo de inversión ni una recomendación personalizada.</li>
        </ul>
        <p className="mt-2 text-xs text-muted">
          Cobertura de evidencia: {Math.round(brief.stats.evidence_coverage * 100)} % ·{" "}
          {brief.stats.items_dropped > 0 ? `${brief.stats.items_dropped} elemento(s) descartado(s) por falta de respaldo · ` : ""}
          {row.input_news_ids.length} noticias en el conjunto.
        </p>
        {brief.warnings.length > 0 && (
          <div className="mt-3 rounded border border-divider bg-bg-subtle p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Controles aplicados</h3>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted">
              {brief.warnings.map((w) => (
                <li key={w}>{WARNING_LABEL[w] ?? w}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section aria-labelledby="hechos" className="card">
        <h2 id="hechos" className="text-base font-semibold">Hechos con cita</h2>
        <ol className="mt-2 space-y-3">
          {brief.facts.map((f, i) => (
            <li key={`${f.source_id}-${i}`}>
              <p className="text-sm">{f.statement}</p>
              <SourceRef id={f.source_id} sources={sources} />
              <Quote text={f.quote} />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="patrones" className="card">
        <h2 id="patrones" className="text-base font-semibold">Patrones detectados</h2>
        <ul className="mt-2 space-y-4">
          {brief.patterns.map((p) => (
            <li key={p.title}>
              <h3 className="text-sm font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm">{p.description}</p>
              <p className="mt-1 text-sm"><span className="font-semibold">Qué cambió: </span>{p.change}</p>
              <p className="mt-1 flex flex-wrap gap-2">
                {p.evidence_ids.map((eid) => (
                  <SourceRef key={eid} id={eid} sources={sources} />
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {brief.decisions.length > 0 && (
        <section aria-labelledby="decisiones" className="card">
          <h2 id="decisiones" className="text-base font-semibold">Decisiones de empresas y gobierno</h2>
          <ul className="mt-2 divide-y divide-divider">
            {brief.decisions.map((d, i) => (
              <li key={`${d.source_id}-${i}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-medium text-text">{ACTOR_KIND_LABEL[d.actor_kind]}</span>
                  <span className="font-semibold text-text">{d.actor}</span>
                  <span>{DECISION_STATUS_LABEL[d.status]}</span>
                  {d.date && <span>· {day(d.date)}</span>}
                </div>
                <p className="mt-1 text-sm">{d.decision}</p>
                <SourceRef id={d.source_id} sources={sources} />
                <Quote text={d.quote} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief.implications.length > 0 && (
        <section aria-labelledby="implicaciones" className="card">
          <h2 id="implicaciones" className="text-base font-semibold">Implicaciones por tipo de actor</h2>
          <ul className="mt-2 space-y-3">
            {brief.implications.map((im, i) => (
              <li key={`${im.affected}-${i}`}>
                <p className="text-sm">
                  <span className="font-semibold">{im.affected}</span>{" "}
                  <span className="text-xs text-muted">({DIRECTION_LABEL[im.direction]})</span>
                </p>
                <p className="text-sm">{im.effect}</p>
                <p className="mt-1 flex flex-wrap gap-2">
                  {im.basis_ids.map((eid) => (
                    <SourceRef key={eid} id={eid} sources={sources} />
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="escenarios" className="card">
        <h2 id="escenarios" className="text-base font-semibold">Escenarios: qué podría pasar</h2>
        <p className="mt-1 text-xs text-muted">Hipótesis de trabajo, no predicciones con probabilidad. Cada una indica qué la confirmaría o descartaría.</p>
        <ul className="mt-2 space-y-3">
          {brief.scenarios.map((s) => (
            <ScenarioCard key={s.name} scenario={s} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="acciones" className="card">
        <h2 id="acciones" className="text-base font-semibold">Qué verificar o vigilar</h2>
        <p className="mt-1 text-xs text-muted">Acciones de seguimiento, no asesoría financiera ni recomendación personalizada.</p>
        {brief.actions.length ? (
          <ul className="mt-2 space-y-3">
            {brief.actions.map((a, i) => (
              <li key={`${a.kind}-${i}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{ACTION_LABEL[a.kind]}</span>
                  <p className="text-sm font-medium">{a.action}</p>
                </div>
                <p className="mt-1 text-sm text-muted">{a.why}</p>
                <p className="mt-1 flex flex-wrap gap-2">
                  {a.evidence_ids.map((eid) => (
                    <SourceRef key={eid} id={eid} sources={sources} />
                  ))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">La IA no propuso acciones que superaran la verificación. Revisa las fuentes directamente.</p>
        )}
      </section>

      <section aria-labelledby="confianza" className="card">
        <h2 id="confianza" className="text-base font-semibold">Confianza y límites</h2>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Confianza {CONFIDENCE_LABEL[brief.confidence].toLowerCase()}: </span>
          {brief.confidence_reason}
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted">
          {brief.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="fuentes" className="card">
        <h2 id="fuentes" className="text-base font-semibold">Fuentes usadas</h2>
        <ul className="mt-2 space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="text-sm">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary hover:underline">
                {s.title}
              </a>
              <p className="text-xs text-muted">
                {s.source_name}
                {s.published_at ? ` · ${stamp(s.published_at)}` : " · sin fecha"}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Solo se guardaron titulares, enlaces y citas cortas; el texto completo de las fuentes no se almacena.
        </p>
      </section>

      {(review?.review_notes || row.publication_status === "published") && staff && (
        <section aria-labelledby="revision" className="card">
          <h2 id="revision" className="text-base font-semibold">Revisión humana</h2>
          {review?.review_notes ? (
            <p className="mt-1 text-sm">
              «{review.review_notes}»
              {review.reviewed_at && <span className="text-xs text-muted"> · {stamp(review.reviewed_at)}</span>}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Publicada sin nota de revisión (dato anterior a la guardia).</p>
          )}
        </section>
      )}

      {canReview && (
        <section aria-labelledby="decidir" className="card">
          <h2 id="decidir" className="text-base font-semibold">Decisión del gestor</h2>
          <p className="mt-1 text-xs text-muted">
            Comprueba las citas y que los escenarios no se lean como certezas. Al publicar, la nota queda visible para todos los
            usuarios y su contenido ya no se puede editar.
          </p>
          <div className="mt-3">
            <ReviewForm id={id} />
          </div>
        </section>
      )}
    </div>
  );
}

export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando nota…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}
