import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StatusBadge, TrustBadge } from "@/components/trust-badge";
import { WatchButton } from "@/components/watch-button";
import { PUBLICATION, deadlineLabel, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Licitación" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS: Record<string, string> = { open: "Abierta", closed: "Cerrada", awarded: "Adjudicada", cancelled: "Cancelada", planned: "Planificada", unknown: "Estado no mapeado" };
const dt = (v: string | null) =>
  v ? new Intl.DateTimeFormat("es-DO", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santo_Domingo" }).format(new Date(v)) : "No disponible";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[200px_1fr]">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: t }, watched] = await Promise.all([
    supabase
      .from("public_tenders")
      .select("id,title,description,process_code,procurement_method,status,published_at,deadline_at,timezone_assumed,budget_amount,budget_currency,data_quality_flags,trust_layer,publication_status,source_url,extracted_at,reviewed_at,review_notes,validation,created_at,sources(name,legal_status)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("watchlists").select("id").eq("entity_type", "tender").eq("entity_id", id).maybeSingle(),
  ]);
  if (!t) notFound();
  const src = (Array.isArray(t.sources) ? t.sources[0] : t.sources) as { name: string; legal_status: string } | null;
  const left = deadlineLabel(t.deadline_at);
  return (
    <div className="space-y-3">
      <Link href="/licitaciones" className="text-sm font-semibold text-muted hover:text-primary">← Licitaciones</Link>
      <article className="card">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <TrustBadge layer={t.trust_layer} />
          <StatusBadge label={STATUS[t.status] ?? t.status} tone={t.status === "open" ? "success" : "neutral"} />
          {t.publication_status !== "published" && <StatusBadge label={PUBLICATION[t.publication_status] ?? t.publication_status} tone="warning" />}
          {left && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{left}</span>}
          <span className="ml-auto"><WatchButton type="tender" id={t.id} watching={!!watched.data} /></span>
        </div>
        <h1 className="page-title mt-3">{t.title}</h1>
        {t.description && <p className="mt-2 text-sm">{t.description}</p>}
        <dl className="mt-4 divide-y divide-divider border-t border-divider">
          <Row label="Código del proceso"><span className="font-mono">{t.process_code}</span></Row>
          <Row label="Modalidad">{t.procurement_method ?? "No disponible"}</Row>
          <Row label="Monto estimado">{t.budget_currency ? formatMoney(t.budget_amount, t.budget_currency) : "No disponible"}</Row>
          <Row label="Publicada en la fuente">{dt(t.published_at)}</Row>
          <Row label="Cierre de ofertas">
            {dt(t.deadline_at)}
            {t.timezone_assumed && <span className="ml-1 text-xs text-muted">(hora de RD asumida: la fuente no indica zona)</span>}
          </Row>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-divider pt-3">
          {t.source_url ? (
            <a href={t.source_url} target="_blank" rel="noopener noreferrer" className="btn">Ver condiciones y documentos en la DGCP ↗</a>
          ) : (
            <p className="text-sm text-muted">Sin URL del procedimiento: búscalo por su código en el portal de la DGCP para ver pliegos y condiciones.</p>
          )}
        </div>
      </article>

      <section aria-labelledby="procedencia" className="card">
        <h2 id="procedencia" className="text-base font-semibold">Procedencia y revisión</h2>
        <dl className="mt-2 divide-y divide-divider">
          <Row label="Fuente">{src?.name ?? "No disponible"} · estado legal: {src?.legal_status ?? "No disponible"}</Row>
          <Row label="Extraída">{dt(t.extracted_at ?? t.created_at)}</Row>
          <Row label="Validación">
            {(t.data_quality_flags ?? []).length
              ? `Con observaciones: ${(t.data_quality_flags as string[]).join("; ")}`
              : "Sin observaciones de calidad"}
            {(t.validation as { rule?: string } | null)?.rule && <span className="ml-1 text-xs text-muted">(regla {(t.validation as { rule: string }).rule})</span>}
          </Row>
          <Row label="Revisión">
            {t.reviewed_at ? `Revisada el ${dt(t.reviewed_at)}${t.review_notes ? ` · nota: «${t.review_notes}»` : ""}` : "Sin revisión humana registrada (publicada por la regla de carga o pendiente)"}
          </Row>
        </dl>
        <p className="mt-2 text-xs text-muted">
          Dato confirmado según la fuente: la veracidad del contenido es de la institución compradora (Ley 340-06). Sin carácter de asesoría.
        </p>
      </section>
    </div>
  );
}

export default function LicitacionPage(props: PageProps<"/licitaciones/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Detail params={props.params} />
    </Suspense>
  );
}
