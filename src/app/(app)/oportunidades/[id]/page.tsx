import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { PUBLICATION } from "@/lib/format";
import { OPPORTUNITY_TYPES } from "@/lib/opportunity-types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Oportunidad" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERIFICATION: Record<string, string> = {
  pending: "Pendiente de verificación",
  verified: "Verificado",
  partially_verified: "Parcialmente verificado",
  disputed: "Disputado",
  unverifiable: "No verificable",
};

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("investment_opportunities")
    .select("id,title,description,opportunity_type,risks,next_steps,confidence,confidence_explanation,trust_layer,publication_status,created_at,originating_event_id,economic_events(id,title,verification_status,source_documents(canonical_url,title))")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();
  const ev = (Array.isArray(o.economic_events) ? o.economic_events[0] : o.economic_events) as {
    title: string;
    verification_status: string;
    source_documents: { canonical_url: string; title: string | null } | { canonical_url: string; title: string | null }[] | null;
  } | null;
  const doc = ev ? (Array.isArray(ev.source_documents) ? ev.source_documents[0] : ev.source_documents) : null;
  const { count: evidence } = await supabase.from("evidence").select("id", { count: "exact", head: true }).eq("opportunity_id", id).eq("literal_verified", true);
  const blockers = [
    ev && !["verified", "partially_verified"].includes(ev.verification_status) ? "El acontecimiento de origen no está verificado." : null,
    !evidence ? "Falta al menos una cita verificada literalmente contra el documento." : null,
    o.confidence == null ? "Falta la confianza con su explicación." : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      <Link href="/oportunidades" className="text-sm font-semibold text-muted hover:text-primary">← Oportunidades</Link>
      <article className="card">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <TrustBadge layer={o.trust_layer} />
          <span className="text-muted">{OPPORTUNITY_TYPES[o.opportunity_type] ?? o.opportunity_type}</span>
          <StatusBadge label={PUBLICATION[o.publication_status] ?? o.publication_status} tone={o.publication_status === "published" ? "success" : "warning"} />
        </div>
        <h1 className="page-title mt-3">{o.title}</h1>
        <p className="mt-2 text-sm">{o.description}</p>
        {(o.risks as string[]).length > 0 && (
          <p className="mt-3 text-sm"><span className="font-semibold">Riesgos: </span>{(o.risks as string[]).join("; ")}</p>
        )}
        {(o.next_steps as string[]).length > 0 && (
          <p className="mt-1 text-sm"><span className="font-semibold">Próximo paso: </span>{(o.next_steps as string[]).join("; ")}</p>
        )}
        <p className="mt-2 text-sm text-muted">Confianza: {o.confidence != null ? `${o.confidence} % — ${o.confidence_explanation}` : "No disponible"}</p>
      </article>

      <section aria-labelledby="origen" className="card">
        <h2 id="origen" className="text-base font-semibold">Acontecimiento de origen y fuente</h2>
        {ev ? (
          <>
            <p className="mt-1 text-sm">{ev.title}</p>
            <p className="text-xs text-muted">{VERIFICATION[ev.verification_status] ?? ev.verification_status}</p>
            {doc && (
              <a href={doc.canonical_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary underline">
                Documento fuente ↗
              </a>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">No disponible.</p>
        )}
      </section>

      {o.publication_status !== "published" && (
        <section aria-labelledby="falta" className="card border-l-4 border-l-warning">
          <h2 id="falta" className="text-base font-semibold">Qué falta para publicarla</h2>
          {blockers.length ? (
            <ul className="mt-2 list-disc pl-5 text-sm">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
          ) : (
            <p className="mt-1 text-sm">Cumple los requisitos; un gestor puede revisarla y publicarla.</p>
          )}
          <p className="mt-2 text-xs text-muted">La base de datos bloquea la publicación mientras falte cualquiera de estos puntos (guardia P0).</p>
        </section>
      )}
      <p className="text-xs text-muted">Inferencia comercial: hipótesis para investigar, no un hecho ni asesoría de inversión.</p>
    </div>
  );
}

export default function OportunidadPage(props: PageProps<"/oportunidades/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Detail params={props.params} />
    </Suspense>
  );
}
