import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { PUBLICATION } from "@/lib/format";
import { OPPORTUNITY_TYPES } from "@/lib/opportunity-types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Oportunidades" };

async function List() {
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investment_opportunities")
    .select("id,title,description,opportunity_type,confidence,confidence_explanation,trust_layer,publication_status")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return <p role="alert" className="text-danger">No se pudieron cargar las oportunidades.</p>;
  if (!data?.length) {
    return (
      <p className="empty-state">
        Aún no hay oportunidades. Un analista puede proponerlas desde el análisis de impacto de una noticia; se publican solo con evidencia citada y revisión humana.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {data.map((o) => (
        <li key={o.id} className="card">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <TrustBadge layer={o.trust_layer} />
            <span>{OPPORTUNITY_TYPES[o.opportunity_type] ?? o.opportunity_type}</span>
            {o.publication_status !== "published" && <StatusBadge label={PUBLICATION[o.publication_status] ?? o.publication_status} tone="warning" />}
            <span>· confianza: {o.confidence != null ? `${o.confidence} %` : "No disponible"}</span>
          </div>
          <h2 className="headline mt-1"><Link href={`/oportunidades/${o.id}`} className="hover:text-primary hover:underline">{o.title}</Link></h2>
          <p className="mt-1 text-sm">{o.description}</p>
          {o.confidence_explanation && <p className="mt-1 text-xs text-muted">{o.confidence_explanation}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function OportunidadesPage() {
  return (
    <>
      <p className="eyebrow">Oportunidades</p>
      <h1 className="page-title">Oportunidades de inversión y negocio</h1>
      <p className="page-lead">
        Inferencia comercial con base y confianza explicadas. No constituye asesoría de inversión ni garantiza resultados.
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <List />
      </Suspense>
    </>
  );
}
